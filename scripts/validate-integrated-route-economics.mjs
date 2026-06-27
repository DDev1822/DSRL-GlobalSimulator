import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const failures = [];
let passed = 0;
const check = (value, label) => {
  if (value) { passed += 1; console.log(`PASS: ${label}`); }
  else { failures.push(label); console.error(`FAIL: ${label}`); }
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
  const values = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value); value = '';
    } else value += char;
  }
  values.push(value);
  return values;
}

function loadDataset(path) {
  const lines = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const headers = csvCells(lines[0]);
  const positions = Object.fromEntries(headers.map((header, index) => [header.trim().toUpperCase(), index]));
  const required = ['ZC', 'CU', 'NPVMASS', 'NPVPDEST', 'PSB_PIT'];
  for (const field of required) if (positions[field] === undefined) throw new Error(`Falta columna ${field}.`);
  const rows = lines.slice(1).map((line, index) => {
    const row = csvCells(line);
    return {
      blockKey: `row-${index + 1}`,
      XC: Number(row[positions.XC] ?? 0),
      YC: Number(row[positions.YC] ?? 0),
      ZC: Number(row[positions.ZC]),
      XINC: Number(row[positions.XINC] ?? 1),
      YINC: Number(row[positions.YINC] ?? 1),
      ZINC: Number(row[positions.ZINC] ?? 1),
      DENSITY: Number(row[positions.DENSITY] ?? 1),
      AU: Number(row[positions.AU] ?? 0),
      CU: Number(row[positions.CU]),
      NPVMASS: Number(row[positions.NPVMASS]),
      NPVVOL: Number(row[positions.NPVVOL] ?? row[positions.NPVMASS]),
      NPVPDEST: String(row[positions.NPVPDEST] ?? ''),
      PSB_PIT: Number(row[positions.PSB_PIT]),
    };
  });
  return { sourceName: 'simmodPL.csv', sourcePath: path, loadedAtIso: new Date().toISOString(), headers, rows, report: { status: 'pass' } };
}

const economic = {
  metalPriceUsdPerTonne: 8800,
  maxResourceMt: 1500,
  wacc: 0.08,
  annualProductionMt: 40,
  stripRatio: 1.5,
  miningCostUsdPerTonneMoved: 2.5,
  processingCostUsdPerTonneOre: 7.5,
  baseGradePercent: 0.65,
  mineRecovery: 0.95,
  plantRecovery: 0.88,
  initialCapexUsdM: 2800,
  sustainingCapexUsdMPerYear: 0,
  payableFactor: 0.8,
  royaltyRate: 0.02,
  taxRate: 0.3,
  cutoffStepPercent: 0.01,
  resourceCurveExponent: 2,
  gradeResponseExponent: 0.85,
  maxCutoffMultiplier: 2.5,
};

const temp = mkdtempSync(join(tmpdir(), 'dsrl-stage8-10-'));
try {
  writeFileSync(join(temp, 'blockBenchInventory.mjs'), `export function benchFloorForElevation(e,d,h){return Number((d+Math.floor((e-d)/h)*h).toFixed(9))}\n`, 'utf8');
  transpile('src/engine/blockBenchRouteRecovery.ts', join(temp, 'blockBenchRouteRecovery.mjs'), [["'./blockBenchInventory'", "'./blockBenchInventory.mjs'"]]);
  transpile('src/engine/integratedRouteEconomics.ts', join(temp, 'integratedRouteEconomics.mjs'), [["'./blockBenchRouteRecovery'", "'./blockBenchRouteRecovery.mjs'"]]);
  const recovery = await import(pathToFileURL(join(temp, 'blockBenchRouteRecovery.mjs')).href);
  const engine = await import(pathToFileURL(join(temp, 'integratedRouteEconomics.mjs')).href);

  const defaults = engine.createIntegratedRouteEconomicInputs(economic);
  check(engine.validateIntegratedRouteEconomicInputs(defaults).length === 0, 'entradas económicas por defecto válidas');
  check(defaults.routes.mill.payableFactor === economic.payableFactor, 'Mill hereda pagabilidad del escenario');
  check(defaults.routes.leach.sourceDestination === 'Leach', 'Leach conserva identidad de ruta');

  const syntheticRows = [
    ['mill', 125, 100000, 0.5, 'Mill'],
    ['leach', 115, 100000, 0.3, 'Leach'],
    ['dump', 105, 100000, 0.1, '_DUMP_'],
    ['unknown', 95, 100000, 0.2, 'Mystery'],
  ].map((item, index) => ({
    blockKey: item[0], XC: index, YC: 0, ZC: item[1], XINC: 1, YINC: 1, ZINC: 1,
    DENSITY: 1, AU: 0, CU: item[3], NPVMASS: item[2], NPVVOL: item[2], NPVPDEST: item[4], PSB_PIT: 1,
  }));
  const synthetic = { sourceName: 'synthetic.csv', sourcePath: 'synthetic.csv', loadedAtIso: new Date().toISOString(), headers: [], rows: syntheticRows, report: { status: 'pass' } };
  const routeRecovery = recovery.createRouteRecoveryInputs(economic, {
    periodCount: 10,
    mineCapacityMtPerPeriod: 0.2,
    routes: {
      mill: { capacityMtPerPeriod: 0.05, stockpileCapacityMt: 0.2, reclaimCapacityMtPerPeriod: 0.05, recovery: 0.9 },
      leach: { capacityMtPerPeriod: 0.05, stockpileCapacityMt: 0.2, reclaimCapacityMtPerPeriod: 0.05, recovery: 0.5 },
    },
  });
  const inputs = engine.createIntegratedRouteEconomicInputs(economic, {
    discountRate: 0.08,
    routeRecovery,
    routes: {
      mill: { payableFactor: 0.8, treatmentChargeUsdPerTonneFeed: 1, refiningChargeUsdPerTonnePayableMetal: 100, sellingCostRate: 0.01, royaltyRate: 0.02 },
      leach: { payableFactor: 1, treatmentChargeUsdPerTonneFeed: 0.5, refiningChargeUsdPerTonnePayableMetal: 50, sellingCostRate: 0.01, royaltyRate: 0.02 },
    },
  });
  const report = engine.buildIntegratedRouteEconomics(synthetic, 1, 'cumulative', 10, economic, 'cu-percent', 'full-cost', inputs);
  check(close(report.routeTotals.mill.source.massMt, 0.1), 'preserva masa fuente Mill');
  check(close(report.routeTotals.leach.source.massMt, 0.1), 'preserva masa fuente Leach');
  check(close(report.routeTotals.mill.source.payableCuKt, report.routeTotals.mill.source.recoveredCuKt * 0.8), 'aplica pagabilidad Mill');
  check(close(report.routeTotals.leach.source.payableCuKt, report.routeTotals.leach.source.recoveredCuKt), 'aplica pagabilidad Leach');
  check(report.totalGrossRevenueUsdM >= 0 && report.totalOperatingCostUsdM >= 0, 'ingreso y costos no negativos');
  check(report.reconciliation.routeMassCloses && report.reconciliation.containedCopperCloses, 'cierra masa y cobre contenido');
  check(report.reconciliation.recoveredCopperWithinContained && report.reconciliation.payableCopperWithinRecovered, 'cierra cobre recuperado y pagable');
  check(report.reconciliation.grossRevenueCloses && report.reconciliation.operatingCostCloses && report.reconciliation.operatingMarginCloses, 'cierra ingreso, costos y margen');
  check(report.reconciliation.realizedPlusPendingValueCloses, 'cierra valor realizado y pendiente');
  check(report.reconciliation.routeIdentityPreserved && report.reconciliation.unknownDestinationsReported, 'preserva rutas y reporta desconocidos');
  check(report.sensitivity.length >= 5 && report.sensitivity.some((item) => item.id === 'price-low'), 'genera sensibilidad económica');

  const payableZero = engine.createIntegratedRouteEconomicInputs(economic, { routeRecovery, routes: { mill: { payableFactor: 0 }, leach: { payableFactor: 0 } } });
  const payableZeroReport = engine.buildIntegratedRouteEconomics(synthetic, 1, 'cumulative', 10, economic, 'cu-percent', 'full-cost', payableZero);
  check(close(payableZeroReport.totalPayableCuKt, 0) && close(payableZeroReport.totalGrossRevenueUsdM, 0), 'pagabilidad 0% válida');

  const payableFull = engine.createIntegratedRouteEconomicInputs(economic, { routeRecovery, routes: { mill: { payableFactor: 1 }, leach: { payableFactor: 1 } } });
  const payableFullReport = engine.buildIntegratedRouteEconomics(synthetic, 1, 'cumulative', 10, economic, 'cu-percent', 'full-cost', payableFull);
  check(close(payableFullReport.totalPayableCuKt, payableFullReport.totalRecoveredCuKt), 'pagabilidad 100% válida');

  const zeroPrice = engine.createIntegratedRouteEconomicInputs(economic, { routeRecovery, routes: { mill: { metalPriceUsdPerTonne: 0 }, leach: { metalPriceUsdPerTonne: 0 } } });
  const zeroPriceReport = engine.buildIntegratedRouteEconomics(synthetic, 1, 'cumulative', 10, economic, 'cu-percent', 'full-cost', zeroPrice);
  check(close(zeroPriceReport.totalGrossRevenueUsdM, 0), 'precio 0 válido');

  const highCost = engine.createIntegratedRouteEconomicInputs(economic, { routeRecovery, routes: { mill: { processingCostUsdPerTonneFeed: 100000 }, leach: { processingCostUsdPerTonneFeed: 100000 } } });
  const highCostReport = engine.buildIntegratedRouteEconomics(synthetic, 1, 'cumulative', 10, economic, 'cu-percent', 'full-cost', highCost);
  check(highCostReport.totalOperatingMarginUsdM < 0, 'costo alto genera margen negativo');

  const zeroDiscount = engine.createIntegratedRouteEconomicInputs(economic, { discountRate: 0, routeRecovery });
  const zeroDiscountReport = engine.buildIntegratedRouteEconomics(synthetic, 1, 'cumulative', 10, economic, 'cu-percent', 'full-cost', zeroDiscount);
  check(close(zeroDiscountReport.totalDiscountedOperatingMarginUsdM, zeroDiscountReport.totalOperatingMarginUsdM), 'tasa 0% conserva margen nominal');
  check(report.reconciliation.discountedValueNotAboveNominal, 'tasa positiva descuenta márgenes positivos');

  let locked = false;
  try { engine.buildIntegratedRouteEconomics(synthetic, 1, 'cumulative', 10, economic, 'unconfirmed', 'full-cost', inputs); } catch { locked = true; }
  check(locked, 'bloquea cálculo sin confirmar CU = %');

  const manifest = JSON.parse(readFileSync('public/data/block-model/block-model-manifest.json', 'utf8'));
  const primaryPath = manifest.primaryModel.expectedPathCandidates.find((candidate) => existsSync(candidate));
  check(Boolean(primaryPath), 'simmodPL.csv disponible');

  if (primaryPath) {
    const dataset = loadDataset(primaryPath);
    const f6Rows = dataset.rows.filter((row) => row.PSB_PIT >= 1 && row.PSB_PIT <= 6);
    check(f6Rows.length === 34845, 'F6 conserva 34,845 bloques');
    check(close(f6Rows.reduce((sum, row) => sum + row.NPVMASS / 1_000_000, 0), 54.89266375078649), 'F6 conserva 54.892664 Mt');

    const realRecovery = recovery.createRouteRecoveryInputs(economic, {
      periodCount: 20,
      mineCapacityMtPerPeriod: 12,
      routes: {
        mill: { capacityMtPerPeriod: 8, stockpileCapacityMt: 10, reclaimCapacityMtPerPeriod: 5, recovery: 0.88 },
        leach: { capacityMtPerPeriod: 4, stockpileCapacityMt: 10, reclaimCapacityMtPerPeriod: 3, recovery: 0.65 },
      },
    });
    const realInputs = engine.createIntegratedRouteEconomicInputs(economic, { routeRecovery: realRecovery });
    let combinations = 0;
    let allClose = true;
    for (const phase of [1, 2, 3, 4, 5, 6]) {
      for (const scope of ['incremental', 'cumulative']) {
        for (const height of [5, 10, 15, 20]) {
          const current = engine.buildIntegratedRouteEconomics(dataset, phase, scope, height, economic, 'cu-percent', 'full-cost', realInputs);
          combinations += 1;
          allClose &&= current.periods.length > 0;
          allClose &&= Object.values(current.reconciliation).every(Boolean);
          allClose &&= Number.isFinite(current.totalOperatingMarginUsdM);
          allClose &&= Number.isFinite(current.totalPendingMarginUsdM);
        }
      }
    }
    check(combinations === 48, 'evalúa 48 combinaciones reales');
    check(allClose, '48 combinaciones cierran economía integrada por ruta');
  }

  console.log('\nINTEGRATED ROUTE ECONOMICS VALIDATION');
  console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', passedChecks: passed, failedChecks: failures.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
