import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const passes = [];
const read = (path) => {
  if (!existsSync(path)) {
    failures.push(`Falta ${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
};
const requireToken = (source, token, label) => {
  if (source.includes(token)) {
    passes.push(label);
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL: ${label}`);
  }
};

const engine = read('src/engine/recommendationSensitivity.ts');
const panel = read('src/components/RecommendationRobustnessPanel.tsx');
const styles = read('src/components/RecommendationRobustnessPanel.css');
const main = read('src/main.tsx');

for (const token of [
  'SensitivityParameterKey',
  'SENSITIVITY_PARAMETERS',
  'metalPriceUsdPerTonne',
  'wacc',
  'miningCostUsdPerTonneMoved',
  'processingCostUsdPerTonneOre',
  'stripRatio',
  'annualProductionMt',
  'analyzeRecommendationRobustness',
  'stableScenarioCount',
  'stabilityPercent',
  'worstCaseScenario',
  'bestCaseScenario',
  'mostSensitiveParameter',
  'phaseSwitchRows',
  'one-at-a-time',
]) requireToken(engine, token, `sensitivity engine: ${token}`);

for (const token of [
  'PERFIL',
  'VARIACIÓN',
  'ALTURA DE BANCO',
  'ROBUSTEZ',
  'Fases alternativas',
  'Parámetro dominante',
  'Peor VAN',
  'Mejor VAN',
  'MATRIZ BAJO · BASE · ALTO',
  'CAMBIA FASE',
  'TORNADO · IMPACTO EN VAN',
  'Metodología one-at-a-time',
  'No sustituye simulación probabilística',
]) requireToken(panel, token, `robustness panel: ${token}`);

requireToken(styles, '.robustness-panel', 'panel de robustez estilizado');
requireToken(styles, '.sensitivity-matrix', 'matriz de sensibilidad estilizada');
requireToken(styles, '.tornado-chart', 'gráfico tornado estilizado');
requireToken(main, '<RecommendationRobustnessPanel />', 'panel de robustez montado');

console.log('\nSTAGE 7 AUDIT SUMMARY');
console.log(
  JSON.stringify(
    {
      status: failures.length === 0 ? 'PASS' : 'FAIL',
      passedChecks: passes.length,
      failedChecks: failures.length,
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exitCode = 1;
