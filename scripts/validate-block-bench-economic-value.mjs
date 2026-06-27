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
function locate(candidates) {
  return candidates.find((path) => existsSync(path)) ?? null;
}
function closeEnough(left, right, tolerance = 1e-9) {
  return Math.abs(left - right) <= tolerance * Math.max(1, Math.abs(left), Math.abs(right));
}
function transpile(sourcePath, destinationPath, replacements = []) {
  let output = ts.transpileModule(readFileSync(sourcePath, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  for (const [pattern, replacement] of replacements) output = output.replaceAll(pattern, replacement);
  mkdirSync(dirname(destinationPath), { recursive: true });
  writeFileSync(destinationPath, output, 'utf8');
}

const manifest = JSON.parse(readFileSync('public/data/block-model/block-model-manifest.json', 'utf8'));
const primaryPath = locate(manifest.primaryModel.expectedPathCandidates);
check(Boolean(primaryPath), 'simmodPL.csv disponible para valor por banco');

const temp = mkdtempSync(join(tmpdir(), 'dsrl-stage8-6-'));
try {
  transpile('src/engine/blockModelContract.ts', join(temp, 'engine', 'blockModelContract.mjs'));
  transpile('src/engine/economicModel.ts', join(temp, 'engine', 'economicModel.mjs'));
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
  transpile('src/engine/blockEconomicClassification.ts', join(temp, 'engine', 'blockEconomicClassification.mjs'), [
    ["'./blockModelContract'", "'./blockModelContract.mjs'"],
    ["'./blockInventory'", "'./blockInventory.mjs'"],
    ["'./economicModel'", "'./economicModel.mjs'"],
    ["'../utils/blockModelParser'", "'../utils/blockModelParser.mjs'"],
  ]);
  transpile('src/engine/blockBenchEconomicValue.ts', join(temp, 'engine', 'blockBenchEconomicValue.mjs'), [
    ["'./blockModelContract'", "'./blockModelContract.mjs'"],
    ["'./blockInventory'", "'./blockInventory.mjs'"],
    ["'./blockBenchInventory'", "'./blockBenchInventory.mjs'"],
    ["'./blockEconomicClassification'", "'./blockEconomicClassification.mjs'"],
    ["'./economicModel'", "'./economicModel.mjs'"],
    ["'../utils/blockModelParser'", "'../utils/blockModelParser.mjs'"],
  ]);

  const parser = await import(pathToFileURL(join(temp, 'utils', 'blockModelParser.mjs')).href);
  const economicModel = await import(pathToFileURL(join(temp, 'engine', 'economicModel.mjs')).href);
  const economics = await import(pathToFileURL(join(temp, 'engine', 'blockEconomicClassification.mjs')).href);
  const engine = await import(pathToFileURL(join(temp, 'engine', 'blockBenchEconomicValue.mjs')).href);

  if (primaryPath) {
    const dataset = parser.parseBlockModelCsv(readFileSync(primaryPath, 'utf8'), {
      sourceName: 'simmodPL.csv',
      sourcePath: primaryPath,
    });
    const inputs = economicModel.createEconomicInputs();

    const locked = engine.buildBlockBenchEconomicValue(
      dataset,
      6,
      'cumulative',
      10,
      inputs,
      'unconfirmed',
      'full-cost',
    );
    check(!locked.dsrlClassificationEnabled, 'valor DSRL bloqueado sin CU confirmada');
    check(locked.cutoffGradePercent === null, 'sin CU confirmada no publica cut-off');
    check(locked.total.blockCount === 34845, 'F6 conserva 34,845 bloques');
    check(closeEnough(locked.total.massMt, 54.89266375078649), 'F6 conserva 54.892664 Mt');
    check(locked.total.sourceEconomicsCoveragePercent === 100, 'cobertura fuente 100%');
    check(locked.benches.every((bench) => bench.metrics.valueBand === 'locked'), 'bandas DSRL bloqueadas');
    check(locked.dsrlRiskBenchIds.length === 0, 'sin riesgo DSRL antes de confirmar unidad');
    check(locked.reconciliation.physicalMassCloses, 'modo bloqueado cierra masa contra 8.4');
    check(locked.reconciliation.sourceProfitClosesAgainstStage85, 'modo bloqueado cierra beneficio contra 8.5');
    check(locked.reconciliation.dsrlMarginClosesAgainstStage85 === null, 'margen DSRL marcado bloqueado');

    let combinations = 0;
    for (const phase of [1, 2, 3, 4, 5, 6]) {
      for (const scope of ['incremental', 'cumulative']) {
        for (const height of [5, 10, 15, 20]) {
          const report = engine.buildBlockBenchEconomicValue(
            dataset,
            phase,
            scope,
            height,
            inputs,
            'cu-percent',
            'full-cost',
          );
          combinations += 1;
          check(report.benches.length > 0, `F${phase} ${scope} ${height}m genera bancos`);
          check(report.reconciliation.allRowsAssigned, `F${phase} ${scope} ${height}m asigna todas las filas`);
          check(report.reconciliation.cumulativeFromTopCloses, `F${phase} ${scope} ${height}m cierra acumulado vertical`);
          check(report.reconciliation.physicalBlockCountCloses, `F${phase} ${scope} ${height}m cierra bloques vs 8.4`);
          check(report.reconciliation.physicalVolumeCloses, `F${phase} ${scope} ${height}m cierra volumen vs 8.4`);
          check(report.reconciliation.physicalMassCloses, `F${phase} ${scope} ${height}m cierra masa vs 8.4`);
          check(report.reconciliation.sourceProfitClosesAgainstStage85, `F${phase} ${scope} ${height}m cierra fuente vs 8.5`);
          check(report.reconciliation.dsrlProcessMassClosesAgainstStage85, `F${phase} ${scope} ${height}m cierra proceso DSRL`);
          check(report.reconciliation.dsrlWasteMassClosesAgainstStage85, `F${phase} ${scope} ${height}m cierra desmonte DSRL`);
          check(report.reconciliation.dsrlMarginClosesAgainstStage85, `F${phase} ${scope} ${height}m cierra margen DSRL`);
          check(report.reconciliation.sourceProfitRowsReconcile, `F${phase} ${scope} ${height}m reconcilia beneficio por fila`);
          check(report.reconciliation.dsrlSelectedValueCloses, `F${phase} ${scope} ${height}m cierra valor seleccionado`);
          check(report.reconciliation.intervalsDoNotOverlap, `F${phase} ${scope} ${height}m sin solapes`);
          check(
            report.benches.every((bench, index) => index === 0 || bench.floorElevationM < report.benches[index - 1].floorElevationM),
            `F${phase} ${scope} ${height}m orden techo-fondo`,
          );
          check(new Set(report.topValueBenchIds).size === report.topValueBenchIds.length, `F${phase} ${scope} ${height}m ranking único`);
          check(report.topValueBenchIds.length <= 5, `F${phase} ${scope} ${height}m top limitado a cinco`);
          check(
            report.benches.every((bench, index) =>
              index === 0 ||
              bench.cumulativeFromTop.massT >= report.benches[index - 1].cumulativeFromTop.massT,
            ),
            `F${phase} ${scope} ${height}m masa acumulada monótona`,
          );
          check(
            report.benches.every((bench, index) =>
              index === 0 ||
              bench.cumulativeFromTop.selectedMarginUsdM >=
                report.benches[index - 1].cumulativeFromTop.selectedMarginUsdM,
            ),
            `F${phase} ${scope} ${height}m margen acumulado monótono`,
          );
        }
      }
    }
    check(combinations === 48, 'evalúa 48 combinaciones reales');

    const base = engine.buildBlockBenchEconomicValue(
      dataset,
      6,
      'cumulative',
      10,
      inputs,
      'cu-percent',
      'full-cost',
    );
    const processOnly = engine.buildBlockBenchEconomicValue(
      dataset,
      6,
      'cumulative',
      10,
      inputs,
      'cu-percent',
      'processing-only',
    );
    const highPrice = engine.buildBlockBenchEconomicValue(
      dataset,
      6,
      'cumulative',
      10,
      { ...inputs, metalPriceUsdPerTonne: inputs.metalPriceUsdPerTonne * 1.2 },
      'cu-percent',
      'full-cost',
    );
    const highCost = engine.buildBlockBenchEconomicValue(
      dataset,
      6,
      'cumulative',
      10,
      {
        ...inputs,
        miningCostUsdPerTonneMoved: inputs.miningCostUsdPerTonneMoved * 1.5,
        processingCostUsdPerTonneOre: inputs.processingCostUsdPerTonneOre * 1.5,
      },
      'cu-percent',
      'full-cost',
    );
    check(base.cutoffGradePercent > processOnly.cutoffGradePercent, 'costo completo eleva cut-off');
    check(base.total.dsrlProcessMassMt <= processOnly.total.dsrlProcessMassMt, 'costo completo no aumenta proceso');
    check(highPrice.cutoffGradePercent < base.cutoffGradePercent, 'mayor precio reduce cut-off');
    check(highPrice.total.dsrlProcessMassMt >= base.total.dsrlProcessMassMt, 'mayor precio no reduce proceso');
    check(highPrice.total.selectedMarginUsdM >= base.total.selectedMarginUsdM, 'mayor precio incrementa margen seleccionado');
    check(highCost.cutoffGradePercent > base.cutoffGradePercent, 'mayor costo eleva cut-off');
    check(highCost.total.dsrlProcessMassMt <= base.total.dsrlProcessMassMt, 'mayor costo no aumenta proceso');
    check(highCost.total.selectedMarginUsdM <= base.total.selectedMarginUsdM, 'mayor costo no incrementa margen');

    const fiveMetres = engine.buildBlockBenchEconomicValue(dataset, 6, 'cumulative', 5, inputs, 'cu-percent', 'full-cost');
    const twentyMetres = engine.buildBlockBenchEconomicValue(dataset, 6, 'cumulative', 20, inputs, 'cu-percent', 'full-cost');
    check(fiveMetres.benches.length >= twentyMetres.benches.length, 'menor altura no genera menos bancos');

    const stage85 = economics.buildBlockEconomicClassification(dataset, inputs, 'cu-percent', 'full-cost');
    const stage85F6 = economics.getBlockEconomicPhase(stage85, 6, 'cumulative');
    check(closeEnough(base.total.selectedMarginUsdM, stage85F6.dsrl.selectedMarginUsdM), 'margen total coincide con 8.5');
    check(closeEnough(base.total.dsrlProcessMassMt, stage85F6.dsrl.processMassMt), 'proceso total coincide con 8.5');
  }

  const syntheticRows = [
    { blockKey: 'high', XC: 0, YC: 0, ZC: 125, XINC: 1, YINC: 1, ZINC: 1, DENSITY: 2, AU: 0, CU: 0.5, NPVMASS: 100, NPVVOL: 50, NPVREVEN: 50, NPVPCOST: 20, NPVMCOST: 10, NPVPROFT: 20, NPVPDEST: 'Mill', PSB_PIT: 1 },
    { blockKey: 'marginal', XC: 1, YC: 0, ZC: 115, XINC: 1, YINC: 1, ZINC: 1, DENSITY: 2, AU: 0, CU: 0.18, NPVMASS: 100, NPVVOL: 50, NPVREVEN: 15, NPVPCOST: 7, NPVMCOST: 5, NPVPROFT: 3, NPVPDEST: 'Leach', PSB_PIT: 1 },
    { blockKey: 'negative', XC: 2, YC: 0, ZC: 105, XINC: 1, YINC: 1, ZINC: 1, DENSITY: 2, AU: 0, CU: 0.05, NPVMASS: 100, NPVVOL: 50, NPVREVEN: 4, NPVPCOST: 6, NPVMCOST: 3, NPVPROFT: -5, NPVPDEST: '_DUMP_', PSB_PIT: 1 },
  ];
  const synthetic = {
    sourceName: 'synthetic.csv',
    sourcePath: 'synthetic.csv',
    loadedAtIso: new Date().toISOString(),
    headers: [],
    rows: syntheticRows,
    report: { status: 'pass' },
  };
  const syntheticReport = engine.buildBlockBenchEconomicValue(
    synthetic,
    1,
    'cumulative',
    10,
    economicModel.createEconomicInputs(),
    'cu-percent',
    'full-cost',
  );
  const bands = syntheticReport.benches.map((bench) => bench.metrics.valueBand);
  check(syntheticReport.benches.length === 3, 'caso sintético genera tres bancos');
  check(bands.includes('high'), 'caso sintético identifica banco de alto valor');
  check(bands.includes('marginal'), 'caso sintético identifica banco marginal');
  check(bands.includes('negative'), 'caso sintético identifica banco negativo');
  check(syntheticReport.dsrlRiskBenchIds.length === 2, 'caso sintético identifica dos bancos en riesgo');
  check(syntheticReport.sourceNegativeBenchIds.length === 1, 'caso sintético identifica beneficio fuente negativo');
  check(syntheticReport.reconciliation.physicalMassCloses, 'caso sintético cierra masa contra 8.4');
  check(syntheticReport.reconciliation.dsrlMarginClosesAgainstStage85, 'caso sintético cierra margen contra 8.5');
  check(syntheticReport.reconciliation.cumulativeFromTopCloses, 'caso sintético cierra acumulado vertical');

  console.log('\nBLOCK BENCH ECONOMIC VALUE VALIDATION');
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
