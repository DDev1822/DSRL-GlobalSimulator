import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const failures = [];
const invalidCaseToken = 'invalid';
void invalidCaseToken;
let passedChecks = 0;
function check(condition, message) {
  if (condition) {
    passedChecks += 1;
    console.log(`PASS: ${message}`);
  } else {
    failures.push(message);
    console.error(`FAIL: ${message}`);
  }
}
function locate(candidates) {
  return candidates.find((path) => existsSync(path)) ?? null;
}
function transpile(sourcePath, destinationPath, replacements = []) {
  let output = ts.transpileModule(readFileSync(sourcePath, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  for (const [pattern, replacement] of replacements) output = output.replaceAll(pattern, replacement);
  mkdirSync(dirname(destinationPath), { recursive: true });
  writeFileSync(destinationPath, output, 'utf8');
}
function closeEnough(left, right, tolerance = 1e-9) {
  return Math.abs(left - right) <= tolerance * Math.max(1, Math.abs(left), Math.abs(right));
}

const manifest = JSON.parse(readFileSync('public/data/block-model/block-model-manifest.json', 'utf8'));
const primaryPath = locate(manifest.primaryModel.expectedPathCandidates);
check(Boolean(primaryPath), 'simmodPL.csv disponible para inventario por bancos');

const temp = mkdtempSync(join(tmpdir(), 'dsrl-stage8-4-'));
try {
  transpile('src/engine/blockModelContract.ts', join(temp, 'engine', 'blockModelContract.mjs'));
  transpile('src/utils/blockModelParser.ts', join(temp, 'utils', 'blockModelParser.mjs'), [
    ["'../engine/blockModelContract'", "'../engine/blockModelContract.mjs'"],
  ]);
  transpile('src/engine/blockInventory.ts', join(temp, 'engine', 'blockInventory.mjs'), [
    ["'./blockModelContract'", "'./blockModelContract.mjs'"],
    ["'../utils/blockModelParser'", "'../utils/blockModelParser.mjs'"],
  ]);
  transpile('src/engine/blockBenchInventory.ts', join(temp, 'engine', 'blockBenchInventory.mjs'), [
    ["'./blockModelContract'", "'./blockModelContract.mjs'"],
    ["'./blockInventory'", "'./blockInventory.mjs'"],
    ["'../utils/blockModelParser'", "'../utils/blockModelParser.mjs'"],
  ]);

  const parser = await import(pathToFileURL(join(temp, 'utils', 'blockModelParser.mjs')).href);
  const benchEngine = await import(pathToFileURL(join(temp, 'engine', 'blockBenchInventory.mjs')).href);

  if (primaryPath) {
    const dataset = parser.parseBlockModelCsv(readFileSync(primaryPath, 'utf8'), {
      sourceName: 'simmodPL.csv',
      sourcePath: primaryPath,
    });
    check(dataset.report.status === 'pass', 'modelo maestro aprobado antes de agrupar bancos');

    let combinations = 0;
    for (const phase of [1, 2, 3, 4, 5, 6]) {
      for (const scope of ['incremental', 'cumulative']) {
        for (const height of [5, 10, 15, 20]) {
          const report = benchEngine.buildBlockBenchInventory(dataset, phase, scope, height);
          combinations += 1;
          check(report.benches.length > 0, `F${phase} ${scope} ${height}m genera bancos`);
          check(report.reconciliation.blockCountCloses, `F${phase} ${scope} ${height}m cierra bloques`);
          check(report.reconciliation.volumeCloses, `F${phase} ${scope} ${height}m cierra volumen`);
          check(report.reconciliation.massCloses, `F${phase} ${scope} ${height}m cierra masa`);
          check(report.reconciliation.phaseInventoryCloses, `F${phase} ${scope} ${height}m cierra contra 8.3`);
          check(report.reconciliation.cumulativeFromTopCloses, `F${phase} ${scope} ${height}m cierra acumulado vertical`);
          check(report.reconciliation.intervalsDoNotOverlap, `F${phase} ${scope} ${height}m sin solapes`);
          check(
            report.benches.every((bench, index) => index === 0 || bench.floorElevationM < report.benches[index - 1].floorElevationM),
            `F${phase} ${scope} ${height}m orden techo-fondo`,
          );
        }
      }
    }
    check(combinations === 48, 'evalúa 48 combinaciones reales');

    const f6 = benchEngine.buildBlockBenchInventory(dataset, 6, 'cumulative', 10);
    check(f6.total.blockCount === 34845, 'F6 acumulado conserva 34,845 bloques');
    check(closeEnough(f6.total.massMt, 54.89266375078649), 'F6 acumulado conserva 54.892664 Mt');
    check(closeEnough(f6.total.processMassMt, 39.106396711706985), 'F6 conserva masa de proceso');
    check(closeEnough(f6.total.wasteMassMt, 15.786267039079501), 'F6 conserva desmonte');
    check(closeEnough(f6.total.stripRatioByDestination, 0.40367480428984875), 'F6 conserva strip ratio');

    const f3 = benchEngine.buildBlockBenchInventory(dataset, 3, 'cumulative', 10);
    check(f3.total.blockCount === 18981, 'F3 acumulado conserva 18,981 bloques');
    check(f3.methodology.assignmentBasis === 'ZC', 'asignación por centro ZC declarada');
    check(f3.methodology.boundaryPolicy === '[floor, ceiling)', 'política de límites declarada');
    check(!f3.methodology.volumeSplitAcrossBenches, 'no divide subbloques entre bancos');
    check(!f3.methodology.reserveClaimAllowed, 'no declara reservas');
  }

  const syntheticRows = [
    { blockKey: 'a', XC: 0, YC: 0, ZC: 100, XINC: 1, YINC: 1, ZINC: 1, DENSITY: 2, AU: 1, CU: 2, NPVMASS: 2, NPVVOL: 1, NPVPDEST: 'Mill', PSB_PIT: 1 },
    { blockKey: 'b', XC: 0, YC: 0, ZC: 109.999, XINC: 1, YINC: 1, ZINC: 1, DENSITY: 2, AU: 2, CU: 3, NPVMASS: 2, NPVVOL: 1, NPVPDEST: '_DUMP_', PSB_PIT: 1 },
    { blockKey: 'c', XC: 0, YC: 0, ZC: 110, XINC: 1, YINC: 1, ZINC: 1, DENSITY: 2, AU: 3, CU: 4, NPVMASS: 2, NPVVOL: 1, NPVPDEST: 'Leach', PSB_PIT: 1 },
  ];
  const synthetic = {
    sourceName: 'synthetic.csv',
    sourcePath: 'synthetic.csv',
    loadedAtIso: new Date().toISOString(),
    headers: [],
    rows: syntheticRows,
    report: { status: 'pass' },
  };
  const boundary = benchEngine.buildBlockBenchInventory(synthetic, 1, 'cumulative', 10);
  check(boundary.benches.length === 2, 'caso sintético genera dos bancos');
  check(boundary.benches[0].floorElevationM === 110, 'límite superior entra al banco siguiente');
  check(boundary.benches[1].floorElevationM === 100, 'valores bajo 110 permanecen en banco inferior');
  check(boundary.benches[1].metrics.blockCount === 2, 'intervalo [100,110) contiene dos bloques');
  check(boundary.reconciliation.phaseInventoryCloses, 'caso sintético cierra contra inventario de fase');

  console.log('\nBLOCK BENCH INVENTORY VALIDATION');
  console.log(JSON.stringify({
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    passedChecks,
    failedChecks: failures.length,
    primaryFileDetected: primaryPath,
    failures,
  }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
