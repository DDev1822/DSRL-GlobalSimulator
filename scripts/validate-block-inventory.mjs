import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const failures = [];
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
function close(left, right, tolerance = 1e-8) {
  return Math.abs(left - right) <= tolerance * Math.max(1, Math.abs(left), Math.abs(right));
}
function locate(candidates) {
  return candidates.find((path) => existsSync(path)) ?? null;
}
function transpile(sourcePath, destinationPath, replacements = []) {
  let output = ts.transpileModule(readFileSync(sourcePath, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  for (const [pattern, replacement] of replacements) output = output.replace(pattern, replacement);
  mkdirSync(dirname(destinationPath), { recursive: true });
  writeFileSync(destinationPath, output, 'utf8');
}

const manifest = JSON.parse(readFileSync('public/data/block-model/block-model-manifest.json', 'utf8'));
const primaryPath = locate(manifest.primaryModel.expectedPathCandidates);
check(Boolean(primaryPath), 'simmodPL.csv disponible para inventario');

const temp = mkdtempSync(join(tmpdir(), 'dsrl-stage8-3-'));
try {
  const contractTarget = join(temp, 'engine', 'blockModelContract.mjs');
  const parserTarget = join(temp, 'utils', 'blockModelParser.mjs');
  const inventoryTarget = join(temp, 'engine', 'blockInventory.mjs');
  transpile('src/engine/blockModelContract.ts', contractTarget);
  transpile('src/utils/blockModelParser.ts', parserTarget, [
    ["'../engine/blockModelContract'", "'../engine/blockModelContract.mjs'"],
  ]);
  transpile('src/engine/blockInventory.ts', inventoryTarget, [
    ["'./blockModelContract'", "'./blockModelContract.mjs'"],
  ]);

  const parser = await import(pathToFileURL(parserTarget).href);
  const inventory = await import(pathToFileURL(inventoryTarget).href);

  if (primaryPath) {
    const dataset = parser.parseBlockModelCsv(readFileSync(primaryPath, 'utf8'), {
      sourceName: 'simmodPL.csv',
      sourcePath: primaryPath,
    });
    const report = inventory.buildBlockInventory(dataset);
    const phases = report.phaseInventories;
    const totals = report.totalF1ToF6;
    const activeRows = dataset.rows.filter((row) => row.PSB_PIT <= 6);
    const expectedVolume = activeRows.reduce((sum, row) => sum + row.NPVVOL, 0);
    const expectedMass = activeRows.reduce((sum, row) => sum + row.NPVMASS, 0);
    const expectedProcess = activeRows
      .filter((row) => row.NPVPDEST === 'Mill' || row.NPVPDEST === 'Leach')
      .reduce((sum, row) => sum + row.NPVMASS, 0);
    const expectedWaste = activeRows
      .filter((row) => row.NPVPDEST === '_DUMP_')
      .reduce((sum, row) => sum + row.NPVMASS, 0);
    const expectedMill = activeRows
      .filter((row) => row.NPVPDEST === 'Mill')
      .reduce((sum, row) => sum + row.NPVMASS, 0);
    const expectedLeach = activeRows
      .filter((row) => row.NPVPDEST === 'Leach')
      .reduce((sum, row) => sum + row.NPVMASS, 0);

    check(report.sourceName === 'simmodPL.csv', 'conserva fuente del modelo maestro');
    check(report.activePhases.join(',') === '1,2,3,4,5,6', 'limita inventario activo a F1–F6');
    check(phases.length === 6, 'genera seis inventarios de fase');
    check(report.activeBlockCount === 34845, 'inventario F1–F6 contiene 34,845 bloques');
    check(report.excludedFutureBlockCount === 15144, 'preserva 15,144 bloques F7–F9 fuera del alcance');
    check(totals.blockCount === 34845, 'cierre acumulado F6 en 34,845 bloques');
    check(close(totals.massMt, 54.89266375078649), 'masa total F1–F6 correcta');
    check(close(totals.processMassMt, 39.106396711706985), 'masa de proceso F1–F6 correcta');
    check(close(totals.wasteMassMt, 15.786267039079501), 'masa de desmonte F1–F6 correcta');
    check(close(totals.stripRatioByDestination, 0.40367480428984875), 'strip ratio por destino correcto');
    check(close(totals.volumeM3, expectedVolume), 'volumen coincide con suma directa de bloques');
    check(close(totals.massT, expectedMass), 'masa coincide con suma directa de bloques');
    check(close(totals.processMassT, expectedProcess), 'proceso coincide con destinos directos');
    check(close(totals.wasteMassT, expectedWaste), 'desmonte coincide con destino directo');
    check(close(totals.millMassT, expectedMill), 'masa Mill coincide con suma directa');
    check(close(totals.leachMassT, expectedLeach), 'masa Leach coincide con suma directa');
    check(close(totals.millMassT + totals.leachMassT, totals.processMassT), 'Mill + Leach cierra proceso');
    check(close(totals.processMassT + totals.wasteMassT, totals.massT), 'proceso + desmonte cierra masa');

    const expectedPhaseCounts = [8389, 6571, 4021, 5632, 5030, 5202];
    phases.forEach((phase, index) => {
      check(phase.phase === index + 1, `fase F${index + 1} ordenada`);
      check(
        phase.incremental.blockCount === expectedPhaseCounts[index],
        `conteo incremental F${index + 1} correcto`,
      );
    });

    check(phases[0].incremental.blockCount === phases[0].cumulative.blockCount, 'F1 incremental igual a acumulado');
    check(phases[2].cumulative.blockCount === 18981, 'acumulado F3 coincide con modelo de control');
    check(phases[5].cumulative.blockCount === 34845, 'acumulado F6 cierra el alcance activo');
    check(
      phases.every((phase, index) => index === 0 || phase.cumulative.massT >= phases[index - 1].cumulative.massT),
      'masa acumulada es monótona',
    );
    check(
      phases.every((phase, index) => index === 0 || phase.cumulative.volumeM3 >= phases[index - 1].cumulative.volumeM3),
      'volumen acumulado es monótono',
    );
    check(phases.every((phase) => Number.isFinite(phase.incremental.weightedAuAll)), 'ley AU ponderada finita por fase');
    check(phases.every((phase) => Number.isFinite(phase.incremental.weightedCuAll)), 'ley CU ponderada finita por fase');
    check(phases.every((phase) => phase.incremental.minElevationM <= phase.incremental.maxElevationM), 'rangos de elevación válidos');

    check(report.reconciliation.blockCountCloses, 'reconciliación de bloques PASS');
    check(report.reconciliation.volumeCloses, 'reconciliación de volumen PASS');
    check(report.reconciliation.massCloses, 'reconciliación de masa PASS');
    check(report.reconciliation.processPlusWasteCloses, 'reconciliación proceso + desmonte PASS');
    check(report.reconciliation.millPlusLeachCloses, 'reconciliación Mill + Leach PASS');
    check(report.reconciliation.cumulativeMonotonic, 'reconciliación acumulada monótona PASS');
    check(report.terminology.inventoryLabel === 'inventario dentro del diseño', 'terminología de inventario declarada');
    check(report.terminology.reserveClaimAllowed === false, 'prohíbe declarar reserva');
    check(report.terminology.gradeUnitsConfirmed === false, 'unidades de ley permanecen sin confirmar');

    const phase4 = inventory.getPhaseInventory(report, 4);
    check(phase4.phase === 4, 'consulta directa de F4 disponible');
    check(phase4.cumulative.blockCount > phase4.incremental.blockCount, 'F4 acumulado incorpora fases anteriores');
  }

  console.log('\nBLOCK INVENTORY VALIDATION');
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
