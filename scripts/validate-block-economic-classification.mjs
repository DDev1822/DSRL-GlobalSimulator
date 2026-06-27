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
check(Boolean(primaryPath), 'simmodPL.csv disponible para economía por bloque');

const temp = mkdtempSync(join(tmpdir(), 'dsrl-stage8-5-'));
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
  transpile('src/engine/blockEconomicClassification.ts', join(temp, 'engine', 'blockEconomicClassification.mjs'), [
    ["'./blockModelContract'", "'./blockModelContract.mjs'"],
    ["'./blockInventory'", "'./blockInventory.mjs'"],
    ["'./economicModel'", "'./economicModel.mjs'"],
    ["'../utils/blockModelParser'", "'../utils/blockModelParser.mjs'"],
  ]);

  const parser = await import(pathToFileURL(join(temp, 'utils', 'blockModelParser.mjs')).href);
  const economicModel = await import(pathToFileURL(join(temp, 'engine', 'economicModel.mjs')).href);
  const engine = await import(pathToFileURL(join(temp, 'engine', 'blockEconomicClassification.mjs')).href);

  if (primaryPath) {
    const dataset = parser.parseBlockModelCsv(readFileSync(primaryPath, 'utf8'), {
      sourceName: 'simmodPL.csv',
      sourcePath: primaryPath,
    });
    const inputs = economicModel.createEconomicInputs();
    const locked = engine.buildBlockEconomicClassification(
      dataset,
      inputs,
      'unconfirmed',
      'full-cost',
    );

    check(!locked.dsrlClassificationEnabled, 'reclasificación bloqueada sin unidad confirmada');
    check(locked.cutoffGradePercent === null, 'sin unidad no publica ley de corte');
    check(locked.activeBlockCount === 34845, 'audita 34,845 bloques F1–F6');
    check(locked.excludedFutureBlockCount === 15144, 'preserva 15,144 bloques F7–F9');
    check(locked.reconciliation.incrementalBlockCountCloses, 'cierra conteo incremental fuente');
    check(locked.reconciliation.incrementalMassCloses, 'cierra masa incremental fuente');
    check(locked.reconciliation.cumulativeMonotonic, 'acumulado fuente es monótono');

    const lockedF6 = engine.getBlockEconomicPhase(locked, 6, 'cumulative');
    check(lockedF6.source.blockCount === 34845, 'F6 fuente conserva 34,845 bloques');
    check(closeEnough(lockedF6.source.massMt, 54.89266375078649), 'F6 fuente conserva 54.892664 Mt');
    check(lockedF6.source.economicsCoveragePercent === 100, 'cobertura económica fuente 100%');
    check(lockedF6.reconciliation.sourceMassCloses, 'F6 cierra masa fuente');
    check(lockedF6.reconciliation.sourceRouteMassCloses, 'F6 cierra Mill + Leach');
    check(lockedF6.reconciliation.sourceProfitCloses, 'F6 reconcilia beneficio fuente');
    check(lockedF6.dsrl.enabled === false, 'métricas DSRL permanecen bloqueadas');

    const lockedF3 = engine.getBlockEconomicPhase(locked, 3, 'cumulative');
    check(lockedF3.source.blockCount === 18981, 'F3 fuente conserva 18,981 bloques');

    const full = engine.buildBlockEconomicClassification(
      dataset,
      inputs,
      'cu-percent',
      'full-cost',
    );
    const processOnly = engine.buildBlockEconomicClassification(
      dataset,
      inputs,
      'cu-percent',
      'processing-only',
    );
    check(full.dsrlClassificationEnabled, 'confirmación CU activa DSRL');
    check(Number.isFinite(full.cutoffGradePercent), 'ley de corte DSRL finita');
    check(full.cutoffGradePercent > processOnly.cutoffGradePercent, 'costo completo eleva cut-off');
    check(closeEnough(full.classificationCostUsdPerTonne, 10), 'costo completo = 7.5 + 2.5 USD/t');
    check(closeEnough(processOnly.classificationCostUsdPerTonne, 7.5), 'solo proceso = 7.5 USD/t');

    for (const phase of [1, 2, 3, 4, 5, 6]) {
      for (const scope of ['incremental', 'cumulative']) {
        const metrics = engine.getBlockEconomicPhase(full, phase, scope);
        check(metrics.reconciliation.sourceMassCloses, `F${phase} ${scope} cierra masa fuente`);
        check(metrics.reconciliation.sourceProfitCloses, `F${phase} ${scope} cierra beneficio fuente`);
        check(metrics.reconciliation.dsrlMassCloses, `F${phase} ${scope} cierra masa DSRL`);
        check(metrics.reconciliation.reclassificationMassCloses, `F${phase} ${scope} cierra reclasificación`);
        check(metrics.reconciliation.dsrlValueCloses, `F${phase} ${scope} cierra valor DSRL`);
      }
    }

    const fullF6 = engine.getBlockEconomicPhase(full, 6, 'cumulative');
    const processF6 = engine.getBlockEconomicPhase(processOnly, 6, 'cumulative');
    check(fullF6.dsrl.processMassMt <= processF6.dsrl.processMassMt, 'costo completo no aumenta masa de proceso');
    check(fullF6.dsrl.selectedMarginUsdM >= 0, 'margen seleccionado no negativo');
    check(
      fullF6.dsrl.retainedProcessRows +
        fullF6.dsrl.retainedWasteRows +
        fullF6.dsrl.upgradeRows +
        fullF6.dsrl.downgradeRows +
        fullF6.dsrl.uncomparedRows ===
        fullF6.source.blockCount,
      'matriz de destinos cubre todos los bloques',
    );

    const highPrice = engine.buildBlockEconomicClassification(
      dataset,
      { ...inputs, metalPriceUsdPerTonne: inputs.metalPriceUsdPerTonne * 1.2 },
      'cu-percent',
      'full-cost',
    );
    const highCost = engine.buildBlockEconomicClassification(
      dataset,
      {
        ...inputs,
        miningCostUsdPerTonneMoved: inputs.miningCostUsdPerTonneMoved * 1.5,
        processingCostUsdPerTonneOre: inputs.processingCostUsdPerTonneOre * 1.5,
      },
      'cu-percent',
      'full-cost',
    );
    check(highPrice.cutoffGradePercent < full.cutoffGradePercent, 'mayor precio reduce cut-off por bloque');
    check(highCost.cutoffGradePercent > full.cutoffGradePercent, 'mayor costo eleva cut-off por bloque');
    check(
      engine.getBlockEconomicPhase(highPrice, 6, 'cumulative').dsrl.processMassMt >= fullF6.dsrl.processMassMt,
      'mayor precio no reduce masa clasificada a proceso',
    );
    check(
      engine.getBlockEconomicPhase(highCost, 6, 'cumulative').dsrl.processMassMt <= fullF6.dsrl.processMassMt,
      'mayor costo no aumenta masa clasificada a proceso',
    );
  }

  const syntheticRows = [
    { blockKey: 'down', XC: 0, YC: 0, ZC: 100, XINC: 1, YINC: 1, ZINC: 1, DENSITY: 2, AU: 0, CU: 0.05, NPVMASS: 100, NPVVOL: 50, NPVREVEN: 10, NPVPCOST: 8, NPVMCOST: 5, NPVPROFT: -3, NPVPDEST: 'Mill', PSB_PIT: 1 },
    { blockKey: 'stay-waste', XC: 1, YC: 0, ZC: 100, XINC: 1, YINC: 1, ZINC: 1, DENSITY: 2, AU: 0, CU: 0.15, NPVMASS: 100, NPVVOL: 50, NPVREVEN: 20, NPVPCOST: 7, NPVMCOST: 3, NPVPROFT: 10, NPVPDEST: '_DUMP_', PSB_PIT: 1 },
    { blockKey: 'up', XC: 2, YC: 0, ZC: 100, XINC: 1, YINC: 1, ZINC: 1, DENSITY: 2, AU: 0, CU: 0.25, NPVMASS: 100, NPVVOL: 50, NPVREVEN: 30, NPVPCOST: 10, NPVMCOST: 5, NPVPROFT: 15, NPVPDEST: '_DUMP_', PSB_PIT: 1 },
    { blockKey: 'stay-process', XC: 3, YC: 0, ZC: 100, XINC: 1, YINC: 1, ZINC: 1, DENSITY: 2, AU: 0, CU: 0.5, NPVMASS: 100, NPVVOL: 50, NPVREVEN: 50, NPVPCOST: 20, NPVMCOST: 10, NPVPROFT: 20, NPVPDEST: 'Leach', PSB_PIT: 1 },
  ];
  const synthetic = {
    sourceName: 'synthetic.csv',
    sourcePath: 'synthetic.csv',
    loadedAtIso: new Date().toISOString(),
    headers: [],
    rows: syntheticRows,
    report: { status: 'pass' },
  };
  const syntheticReport = engine.buildBlockEconomicClassification(
    synthetic,
    economicModel.createEconomicInputs(),
    'cu-percent',
    'full-cost',
  );
  const syntheticF1 = engine.getBlockEconomicPhase(syntheticReport, 1, 'incremental');
  check(syntheticF1.dsrl.retainedProcessRows === 1, 'caso sintético mantiene un bloque de proceso');
  check(syntheticF1.dsrl.retainedWasteRows === 1, 'caso sintético mantiene un bloque de desmonte');
  check(syntheticF1.dsrl.upgradeRows === 1, 'caso sintético sube un bloque a proceso');
  check(syntheticF1.dsrl.downgradeRows === 1, 'caso sintético baja un bloque a desmonte');
  check(syntheticF1.source.processWithNonPositiveProfitRows === 1, 'detecta proceso fuente con beneficio no positivo');
  check(syntheticF1.source.wasteWithPositiveProfitRows === 2, 'detecta desmonte fuente con beneficio positivo');
  check(syntheticF1.dsrl.traceExamples.length === 2, 'registra ejemplos de reclasificación');
  check(syntheticF1.reconciliation.dsrlValueCloses, 'caso sintético cierra valor DSRL');

  console.log('\nBLOCK ECONOMIC CLASSIFICATION VALIDATION');
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
