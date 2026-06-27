import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'dsrl-stage7-'));

function transpile(sourcePath, outputName, replacements = []) {
  const source = readFileSync(sourcePath, 'utf8');
  let output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;

  for (const [from, to] of replacements) {
    output = output.replaceAll(from, to);
  }
  writeFileSync(join(temporaryDirectory, outputName), output, 'utf8');
}

try {
  transpile('src/engine/economicModel.ts', 'economicModel.mjs');
  transpile(
    'src/engine/valueRiskRecommendation.ts',
    'valueRiskRecommendation.mjs',
  );
  transpile(
    'src/engine/recommendationSensitivity.ts',
    'recommendationSensitivity.mjs',
    [
      ["'./economicModel'", "'./economicModel.mjs'"],
      ["'./valueRiskRecommendation'", "'./valueRiskRecommendation.mjs'"],
    ],
  );

  const economicsModule = await import(
    pathToFileURL(join(temporaryDirectory, 'economicModel.mjs')).href
  );
  const sensitivityModule = await import(
    pathToFileURL(join(temporaryDirectory, 'recommendationSensitivity.mjs')).href
  );

  const basis = [1, 2, 3, 4, 5, 6].map((phase) => ({
    phase,
    geometryId: `PIT_F${phase}`,
    benchCount: 3 + phase * 2,
    triangleCount: 8_000 + phase * 900,
    surfaceAreaHa: 12 + phase * 4.5,
    minElevationM: 3_720 - phase * 24,
    maxElevationM: 3_760,
  }));
  const inputs = economicsModule.createEconomicInputs({
    metalPriceUsdPerTonne: 8_800,
    wacc: 0.08,
    miningCostUsdPerTonneMoved: 2.5,
    processingCostUsdPerTonneOre: 7.5,
    stripRatio: 1.5,
    annualProductionMt: 40,
  });
  const result = sensitivityModule.analyzeRecommendationRobustness(
    inputs,
    basis,
    'balanced',
    0.2,
  );

  const failures = [];
  const pass = (condition, message) => {
    if (condition) console.log(`PASS: ${message}`);
    else {
      failures.push(message);
      console.error(`FAIL: ${message}`);
    }
  };

  pass(result.methodology === 'one-at-a-time', 'metodología one-at-a-time declarada');
  pass(result.rows.length === 6, 'evalúa seis variables económicas');
  pass(result.scenarios.length === 13, 'genera base más doce perturbaciones');
  pass(result.totalScenarioCount === 13, 'conteo total de escenarios correcto');
  pass(result.stableScenarioCount >= 1 && result.stableScenarioCount <= 13, 'conteo estable dentro de rango');
  pass(
    Math.abs(
      result.stabilityPercent -
        (result.stableScenarioCount / result.totalScenarioCount) * 100,
    ) < 1e-9,
    'porcentaje de estabilidad consistente',
  );
  pass(
    result.scenarios.every(
      (scenario) =>
        Number.isFinite(scenario.totalNpvUsdM) &&
        basis.some((item) => item.phase === scenario.recommendedPhase),
    ),
    'todos los escenarios producen VAN y fase válidos',
  );

  const priceRow = result.rows.find(
    (row) => row.definition.key === 'metalPriceUsdPerTonne',
  );
  pass(priceRow?.low.inputValue === 7_040, 'precio bajo aplica -20%');
  pass(priceRow?.high.inputValue === 10_560, 'precio alto aplica +20%');

  const waccRow = result.rows.find((row) => row.definition.key === 'wacc');
  pass(Math.abs((waccRow?.low.inputValue ?? 0) - 0.064) < 1e-9, 'WACC bajo aplica -20%');
  pass(Math.abs((waccRow?.high.inputValue ?? 0) - 0.096) < 1e-9, 'WACC alto aplica +20%');
  pass(
    result.worstCaseScenario.totalNpvUsdM <=
      result.bestCaseScenario.totalNpvUsdM,
    'peor y mejor caso ordenados por VAN',
  );
  pass(
    result.phaseSwitchRows.every((row) => row.critical && row.phaseSwitches > 0),
    'filas críticas corresponden a cambios de fase',
  );
  pass(
    result.rows.some(
      (row) =>
        row.definition.key === result.mostSensitiveParameter.key,
    ),
    'parámetro dominante pertenece al conjunto evaluado',
  );
  pass(result.notes.length >= 3, 'incluye notas de alcance y limitación');

  console.log('\nRECOMMENDATION SENSITIVITY VALIDATION');
  console.log(
    JSON.stringify(
      {
        status: failures.length === 0 ? 'PASS' : 'FAIL',
        basePhase: result.base.recommendedPhase,
        stabilityPercent: result.stabilityPercent,
        alternativePhases: result.alternativePhases,
        mostSensitiveParameter: result.mostSensitiveParameter.key,
        failures,
      },
      null,
      2,
    ),
  );

  if (failures.length > 0) process.exitCode = 1;
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
