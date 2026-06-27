import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const failures = [];
let passed = 0;
const check = (value, label) => {
  if (value) {
    passed += 1;
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL: ${label}`);
  }
};
const close = (a, b) => Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
function transpile(source, target, replacements = []) {
  let code = ts.transpileModule(readFileSync(source, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  for (const [from, to] of replacements) code = code.replaceAll(from, to);
  writeFileSync(target, code, 'utf8');
}
function csvCells(line) {
  const out = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      out.push(value);
      value = '';
    } else value += c;
  }
  out.push(value);
  return out;
}
function loadDataset(path) {
  const lines = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const headers = csvCells(lines[0]);
  const p = Object.fromEntries(headers.map((h, i) => [h.trim().toUpperCase(), i]));
  const rows = lines.slice(1).map((line, index) => {
    const r = csvCells(line);
    return {
      blockKey: `row-${index + 1}`,
      XC: Number(r[p.XC] ?? 0), YC: Number(r[p.YC] ?? 0), ZC: Number(r[p.ZC]),
      XINC: Number(r[p.XINC] ?? 1), YINC: Number(r[p.YINC] ?? 1), ZINC: Number(r[p.ZINC] ?? 1),
      DENSITY: Number(r[p.DENSITY] ?? 1), AU: Number(r[p.AU] ?? 0), CU: Number(r[p.CU]),
      NPVMASS: Number(r[p.NPVMASS]), NPVVOL: Number(r[p.NPVVOL] ?? r[p.NPVMASS]),
      NPVPDEST: String(r[p.NPVPDEST] ?? ''), PSB_PIT: Number(r[p.PSB_PIT]),
    };
  });
  return { sourceName: 'simmodPL.csv', sourcePath: path, loadedAtIso: new Date().toISOString(), headers, rows, report: { status: 'pass' } };
}

const economic = {
  metalPriceUsdPerTonne: 8800, maxResourceMt: 1500, wacc: 0.08, annualProductionMt: 40,
  stripRatio: 1.5, miningCostUsdPerTonneMoved: 2.5, processingCostUsdPerTonneOre: 7.5,
  baseGradePercent: 0.65, mineRecovery: 0.95, plantRecovery: 0.88, initialCapexUsdM: 2800,
  sustainingCapexUsdMPerYear: 0, payableFactor: 0.8, royaltyRate: 0.02, taxRate: 0.3,
  cutoffStepPercent: 0.01, resourceCurveExponent: 2, gradeResponseExponent: 0.85, maxCutoffMultiplier: 2.5,
};
const routeIds = ['mill-direct', 'leach-direct', 'dump', 'mill-stockpile', 'leach-stockpile', 'mill-reclaim', 'leach-reclaim'];
const temp = mkdtempSync(join(tmpdir(), 'dsrl-stage8-12-'));

try {
  writeFileSync(join(temp, 'blockBenchInventory.mjs'), `export function benchFloorForElevation(e,d,h){return Number((d+Math.floor((e-d)/h)*h).toFixed(9))}\n`, 'utf8');
  transpile('src/engine/blockBenchRouteRecovery.ts', join(temp, 'blockBenchRouteRecovery.mjs'), [["'./blockBenchInventory'", "'./blockBenchInventory.mjs'"]]);
  transpile('src/engine/integratedRouteEconomics.ts', join(temp, 'integratedRouteEconomics.mjs'), [["'./blockBenchRouteRecovery'", "'./blockBenchRouteRecovery.mjs'"]]);
  transpile('src/engine/preliminaryHaulageLogistics.ts', join(temp, 'preliminaryHaulageLogistics.mjs'), [["'./integratedRouteEconomics'", "'./integratedRouteEconomics.mjs'"]]);
  transpile('src/engine/roadConditionEconomicImpact.ts', join(temp, 'roadConditionEconomicImpact.mjs'), [["'./preliminaryHaulageLogistics'", "'./preliminaryHaulageLogistics.mjs'"]]);

  const recovery = await import(pathToFileURL(join(temp, 'blockBenchRouteRecovery.mjs')).href);
  const haulage = await import(pathToFileURL(join(temp, 'preliminaryHaulageLogistics.mjs')).href);
  const engine = await import(pathToFileURL(join(temp, 'roadConditionEconomicImpact.mjs')).href);

  const haulageInputs = haulage.createPreliminaryHaulageInputs(economic);
  haulageInputs.economics.routeRecovery = recovery.createRouteRecoveryInputs(economic, {
    periodCount: 6, mineCapacityMtPerPeriod: 0.7,
    routes: {
      mill: { capacityMtPerPeriod: 0.1, stockpileCapacityMt: 1, reclaimCapacityMtPerPeriod: 0.1, recovery: 0.9 },
      leach: { capacityMtPerPeriod: 0.1, stockpileCapacityMt: 1, reclaimCapacityMtPerPeriod: 0.1, recovery: 0.6 },
    },
  });
  const defaults = engine.createRoadConditionInputs(economic, { haulage: haulageInputs });
  check(engine.validateRoadConditionInputs(defaults).length === 0, 'entradas de condición de vía por defecto válidas');
  check(defaults.routes['mill-direct'].conditionClass === 'fair', 'Mill inicia en condición Regular');
  check(defaults.routes['leach-direct'].conditionClass === 'poor', 'Leach inicia en condición Mala');
  check(defaults.routes.dump.routeId === 'dump', 'identidad de ruta preservada');

  const poor = engine.applyRoadConditionPreset(defaults.routes['mill-direct'], 'poor');
  check(poor.currentRollingResistancePercent > poor.targetRollingResistancePercent, 'preset Mala incrementa RR');
  check(poor.loadedSpeedFactor < 1 && poor.fuelBurnFactor > 1, 'preset Mala penaliza velocidad y combustible');

  const rows = [
    ['m1', 125, 300000, 0.55, 'Mill'], ['l1', 115, 200000, 0.3, 'Leach'],
    ['d1', 105, 100000, 0.1, '_DUMP_'], ['u1', 95, 100000, 0.2, 'Mystery'],
  ].map((x, i) => ({
    blockKey: x[0], XC: i, YC: 0, ZC: x[1], XINC: 1, YINC: 1, ZINC: 1, DENSITY: 1,
    AU: 0, CU: x[3], NPVMASS: x[2], NPVVOL: x[2], NPVPDEST: x[4], PSB_PIT: 1,
  }));
  const synthetic = { sourceName: 'synthetic.csv', sourcePath: 'synthetic.csv', loadedAtIso: new Date().toISOString(), headers: [], rows, report: { status: 'pass' } };

  const report = engine.buildRoadConditionEconomicImpact(synthetic, 1, 'cumulative', 10, economic, 'cu-percent', 'full-cost', defaults);
  check(Object.values(report.reconciliation).every(Boolean), 'reconciliaciones sintéticas en PASS');
  check(close(report.baselineReport.totalDemandMassMt, report.currentReport.totalDemandMassMt), 'masa preservada objetivo vs actual');
  check(report.totalAdditionalLogisticsCostUsdM > 0, 'deterioro por defecto aumenta costo');
  check(report.totalMarginErosionUsdM > 0, 'deterioro por defecto erosiona margen');
  check(report.totalRecoverableValuePotentialUsdM > 0, 'potencial recuperable positivo');
  check(report.totalAdditionalFuelLiters > 0, 'deterioro por defecto aumenta combustible');
  check(report.exposureRanking.length === 7, 'ranking contiene siete rutas');
  check(report.highestExposureRoute !== null, 'ruta de mayor exposición identificada');
  check(report.baselineReport.reconciliation.destinationIdentityPreserved, 'NPVPDEST preservado en objetivo');
  check(report.currentReport.reconciliation.destinationIdentityPreserved, 'NPVPDEST preservado en actual');

  const allGood = engine.createRoadConditionInputs(economic, { haulage: haulageInputs });
  for (const id of routeIds) allGood.routes[id] = engine.applyRoadConditionPreset(allGood.routes[id], 'good');
  const goodReport = engine.buildRoadConditionEconomicImpact(synthetic, 1, 'cumulative', 10, economic, 'cu-percent', 'full-cost', allGood);
  check(close(goodReport.totalAdditionalLogisticsCostUsdM, 0), 'condición Buena igual al objetivo produce costo adicional cero');
  check(close(goodReport.totalMarginErosionUsdM, 0), 'condición Buena igual al objetivo no erosiona margen');
  check(goodReport.highestExposureRoute === null, 'sin deterioro no declara ruta crítica');

  const critical = engine.createRoadConditionInputs(economic, { haulage: haulageInputs });
  critical.routes['mill-direct'] = engine.applyRoadConditionPreset(critical.routes['mill-direct'], 'critical');
  const criticalReport = engine.buildRoadConditionEconomicImpact(synthetic, 1, 'cumulative', 10, economic, 'cu-percent', 'full-cost', critical);
  const millImpact = criticalReport.routeImpacts['mill-direct'];
  check(millImpact.weightedCycleTimeIncreaseMinutes > 0, 'condición Crítica aumenta ciclo Mill');
  check(millImpact.capacityLossMt > 0, 'condición Crítica reduce capacidad Mill');
  check(millImpact.additionalFuelLiters > 0, 'condición Crítica aumenta combustible Mill');
  check(millImpact.additionalLogisticsCostUsdM > 0, 'condición Crítica aumenta costo Mill');

  const invalidRr = engine.createRoadConditionInputs(economic, { haulage: haulageInputs, routes: { 'mill-direct': { currentRollingResistancePercent: 25 } } });
  check(engine.validateRoadConditionInputs(invalidRr).length > 0, 'RR fuera de rango rechazada');
  const invalidFactor = engine.createRoadConditionInputs(economic, { haulage: haulageInputs, routes: { 'mill-direct': { loadedSpeedFactor: 0 } } });
  check(engine.validateRoadConditionInputs(invalidFactor).length > 0, 'factor de velocidad inválido rechazado');
  const invalidConfidence = engine.createRoadConditionInputs(economic, { haulage: haulageInputs, routes: { 'mill-direct': { confidence: 1.2 } } });
  check(engine.validateRoadConditionInputs(invalidConfidence).length > 0, 'confianza fuera de rango rechazada');

  let locked = false;
  try { engine.buildRoadConditionEconomicImpact(synthetic, 1, 'cumulative', 10, economic, 'unconfirmed', 'full-cost', defaults); } catch { locked = true; }
  check(locked, 'bloquea cálculo sin confirmar CU = %');

  const manifest = JSON.parse(readFileSync('public/data/block-model/block-model-manifest.json', 'utf8'));
  const primaryPath = manifest.primaryModel.expectedPathCandidates.find((candidate) => existsSync(candidate));
  check(Boolean(primaryPath), 'simmodPL.csv disponible');
  if (primaryPath) {
    const dataset = loadDataset(primaryPath);
    const f6 = dataset.rows.filter((row) => row.PSB_PIT >= 1 && row.PSB_PIT <= 6);
    check(f6.length === 34845, 'F6 conserva 34,845 bloques');
    check(close(f6.reduce((sum, row) => sum + row.NPVMASS / 1e6, 0), 54.89266375078649), 'F6 conserva 54.892664 Mt');
    const realInputs = engine.createRoadConditionInputs(economic);
    let combinations = 0;
    let allClose = true;
    for (const phase of [1, 2, 3, 4, 5, 6]) for (const scope of ['incremental', 'cumulative']) for (const height of [5, 10, 15, 20]) {
      const current = engine.buildRoadConditionEconomicImpact(dataset, phase, scope, height, economic, 'cu-percent', 'full-cost', realInputs);
      combinations += 1;
      allClose &&= current.periods.length > 0;
      allClose &&= Object.values(current.reconciliation).every(Boolean);
      allClose &&= Number.isFinite(current.totalAdditionalLogisticsCostUsdM);
      allClose &&= Number.isFinite(current.totalMarginErosionUsdM);
      allClose &&= Number.isFinite(current.totalRecoverableValuePotentialUsdM);
    }
    check(combinations === 48, 'evalúa 48 combinaciones reales');
    check(allClose, '48 combinaciones cierran condición de vía y exposición económica');
  }

  console.log('\nROAD CONDITION ECONOMIC IMPACT VALIDATION');
  console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', passedChecks: passed, failedChecks: failures.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
