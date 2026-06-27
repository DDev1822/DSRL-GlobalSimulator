import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const failures = [];
let passed = 0;
const check = (ok, label) => {
  if (ok) { passed += 1; console.log(`PASS: ${label}`); }
  else { failures.push(label); console.error(`FAIL: ${label}`); }
};
const close = (a, b) => Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
const locate = (items) => items.find((path) => existsSync(path)) ?? null;
function transpile(source, target, replacements = []) {
  let code = ts.transpileModule(readFileSync(source, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  for (const [from, to] of replacements) code = code.replaceAll(from, to);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, code, 'utf8');
}

const manifest = JSON.parse(readFileSync('public/data/block-model/block-model-manifest.json', 'utf8'));
const primaryPath = locate(manifest.primaryModel.expectedPathCandidates);
check(Boolean(primaryPath), 'simmodPL.csv disponible');

const temp = mkdtempSync(join(tmpdir(), 'dsrl-stage8-7-'));
try {
  transpile('src/engine/blockModelContract.ts', join(temp, 'engine/blockModelContract.mjs'));
  transpile('src/engine/economicModel.ts', join(temp, 'engine/economicModel.mjs'));
  transpile('src/utils/blockModelParser.ts', join(temp, 'utils/blockModelParser.mjs'), [["'../engine/blockModelContract'", "'../engine/blockModelContract.mjs'"]]);
  transpile('src/engine/blockInventory.ts', join(temp, 'engine/blockInventory.mjs'), [["'./blockModelContract'", "'./blockModelContract.mjs'"], ["'../utils/blockModelParser'", "'../utils/blockModelParser.mjs'"]]);
  transpile('src/engine/blockBenchInventory.ts', join(temp, 'engine/blockBenchInventory.mjs'), [["'./blockModelContract'", "'./blockModelContract.mjs'"], ["'./blockInventory'", "'./blockInventory.mjs'"], ["'../utils/blockModelParser'", "'../utils/blockModelParser.mjs'"]]);
  transpile('src/engine/blockEconomicClassification.ts', join(temp, 'engine/blockEconomicClassification.mjs'), [["'./blockModelContract'", "'./blockModelContract.mjs'"], ["'./blockInventory'", "'./blockInventory.mjs'"], ["'./economicModel'", "'./economicModel.mjs'"], ["'../utils/blockModelParser'", "'../utils/blockModelParser.mjs'"]]);
  transpile('src/engine/blockBenchEconomicValue.ts', join(temp, 'engine/blockBenchEconomicValue.mjs'), [["'./blockModelContract'", "'./blockModelContract.mjs'"], ["'./blockInventory'", "'./blockInventory.mjs'"], ["'./blockBenchInventory'", "'./blockBenchInventory.mjs'"], ["'./blockEconomicClassification'", "'./blockEconomicClassification.mjs'"], ["'./economicModel'", "'./economicModel.mjs'"], ["'../utils/blockModelParser'", "'../utils/blockModelParser.mjs'"]]);
  transpile('src/engine/blockBenchPreliminarySequence.ts', join(temp, 'engine/blockBenchPreliminarySequence.mjs'), [["'./blockBenchInventory'", "'./blockBenchInventory.mjs'"], ["'./blockBenchEconomicValue'", "'./blockBenchEconomicValue.mjs'"], ["'./blockInventory'", "'./blockInventory.mjs'"], ["'./blockEconomicClassification'", "'./blockEconomicClassification.mjs'"], ["'./blockModelContract'", "'./blockModelContract.mjs'"], ["'./economicModel'", "'./economicModel.mjs'"], ["'../utils/blockModelParser'", "'../utils/blockModelParser.mjs'"]]);

  const parser = await import(pathToFileURL(join(temp, 'utils/blockModelParser.mjs')).href);
  const economics = await import(pathToFileURL(join(temp, 'engine/economicModel.mjs')).href);
  const benchValue = await import(pathToFileURL(join(temp, 'engine/blockBenchEconomicValue.mjs')).href);
  const engine = await import(pathToFileURL(join(temp, 'engine/blockBenchPreliminarySequence.mjs')).href);
  const economic = economics.createEconomicInputs();

  if (primaryPath) {
    const dataset = parser.parseBlockModelCsv(readFileSync(primaryPath, 'utf8'), { sourceName: 'simmodPL.csv', sourcePath: primaryPath });
    const config = { periodCount: 12, mineCapacityMtPerPeriod: 12, plantCapacityMtPerPeriod: 8, mineUtilization: 1, plantUtilization: 1 };
    const locked = engine.buildBlockBenchPreliminarySequence(dataset, 6, 'cumulative', 10, economic, 'unconfirmed', 'full-cost', config);
    const lockedBenchValue = benchValue.buildBlockBenchEconomicValue(dataset, 6, 'cumulative', 10, economic, 'unconfirmed', 'full-cost');
    check(locked.valueBasis === 'source-observed' && locked.scheduledDsrlMarginUsdM === null, 'modo fuente bloqueado');
    check(lockedBenchValue.total.blockCount === 34845, 'F6 conserva 34,845 bloques');
    check(close(lockedBenchValue.total.massMt, 54.89266375078649), 'F6 conserva 54.892664 Mt');

    let combinations = 0;
    let allClose = true;
    for (const phase of [1, 2, 3, 4, 5, 6]) for (const scope of ['incremental', 'cumulative']) for (const height of [5, 10, 15, 20]) {
      const r = engine.buildBlockBenchPreliminarySequence(dataset, phase, scope, height, economic, 'cu-percent', 'full-cost', config);
      combinations += 1;
      allClose &&= r.periods.length > 0 && r.reconciliation.massCloses && r.reconciliation.processCloses && r.reconciliation.valueCloses && r.reconciliation.periodSegmentsClose && r.reconciliation.mineCapacityRespected && r.reconciliation.plantCapacityRespected && r.reconciliation.verticalPrecedenceRespected && r.reconciliation.noNegativeAllocations && r.completionPercent >= 0 && r.completionPercent <= 100 + 1e-8;
    }
    check(combinations === 48, 'evalúa 48 combinaciones reales');
    check(allClose, '48 combinaciones cierran capacidad, masa, proceso, valor y precedencia');

    const short = engine.buildBlockBenchPreliminarySequence(dataset, 6, 'cumulative', 10, economic, 'cu-percent', 'full-cost', { ...config, periodCount: 1 });
    check(short.status === 'horizon-shortfall' && short.remainingMassMt > 0, 'detecta horizonte insuficiente');

    const mine = engine.buildBlockBenchPreliminarySequence(dataset, 6, 'cumulative', 10, economic, 'cu-percent', 'full-cost', { periodCount: 20, mineCapacityMtPerPeriod: 5, plantCapacityMtPerPeriod: 100, mineUtilization: 1, plantUtilization: 1 });
    const plant = engine.buildBlockBenchPreliminarySequence(dataset, 6, 'cumulative', 10, economic, 'cu-percent', 'full-cost', { periodCount: 20, mineCapacityMtPerPeriod: 100, plantCapacityMtPerPeriod: 3, mineUtilization: 1, plantUtilization: 1 });
    check(mine.periods.some((p) => p.bottleneck === 'mine'), 'detecta cuello mina');
    check(plant.periods.some((p) => p.bottleneck === 'plant'), 'detecta cuello planta');

    const full = engine.buildBlockBenchPreliminarySequence(dataset, 6, 'cumulative', 10, economic, 'cu-percent', 'full-cost', config);
    const low = engine.buildBlockBenchPreliminarySequence(dataset, 6, 'cumulative', 10, economic, 'cu-percent', 'full-cost', { ...config, mineUtilization: 0.7, plantUtilization: 0.7 });
    check(low.periodsRequiredAtConfiguredCapacity >= full.periodsRequiredAtConfiguredCapacity, 'menor utilización no reduce periodos');
    check((full.totalDiscountedOperatingMarginUsdM ?? 0) <= (full.scheduledDsrlMarginUsdM ?? 0) + 1e-8, 'margen descontado no supera nominal');
    check(!full.methodology.stockpilingAllowed && !full.methodology.mineScheduleClaimAllowed, 'guardas de stockpile y plan minero');
  }

  const rows = [125, 115, 105].map((z, i) => ({ blockKey: `b${i}`, XC: i, YC: 0, ZC: z, XINC: 1, YINC: 1, ZINC: 1, DENSITY: 2, AU: 0, CU: 0.5, NPVMASS: 100, NPVVOL: 50, NPVREVEN: 50, NPVPCOST: 20, NPVMCOST: 10, NPVPROFT: 20, NPVPDEST: 'Mill', PSB_PIT: 1 }));
  const synthetic = { sourceName: 'synthetic.csv', sourcePath: 'synthetic.csv', loadedAtIso: new Date().toISOString(), headers: [], rows, report: { status: 'pass' } };
  const s = engine.buildBlockBenchPreliminarySequence(synthetic, 1, 'cumulative', 10, economic, 'cu-percent', 'full-cost', { periodCount: 10, mineCapacityMtPerPeriod: 0.00005, plantCapacityMtPerPeriod: 0.00005, mineUtilization: 1, plantUtilization: 1 });
  check(s.status === 'complete' && s.periodsRequiredAtConfiguredCapacity === 6, 'caso sintético completa en seis periodos');
  check(close(s.periods[0].segments[0].fractionOfBench, 0.5), 'divide banco al 50%');
  check(s.reconciliation.verticalPrecedenceRespected && s.reconciliation.massCloses && s.reconciliation.valueCloses, 'caso sintético cierra y respeta precedencia');

  let rejected = false;
  try { engine.buildBlockBenchPreliminarySequence(synthetic, 1, 'cumulative', 10, economic, 'cu-percent', 'full-cost', { periodCount: 0, mineCapacityMtPerPeriod: 1, plantCapacityMtPerPeriod: 1, mineUtilization: 1, plantUtilization: 1 }); } catch { rejected = true; }
  check(rejected, 'rechaza configuración inválida');

  console.log('\nBLOCK BENCH PRELIMINARY SEQUENCE VALIDATION');
  console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', passedChecks: passed, failedChecks: failures.length, primaryFileDetected: primaryPath, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
