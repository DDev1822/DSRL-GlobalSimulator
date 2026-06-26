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

const engine = read('src/engine/benchAnalysis.ts');
const panel = read('src/components/BenchPanel.tsx');
const styles = read('src/components/BenchPanel.css');
const main = read('src/main.tsx');

for (const token of [
  'triangleArea',
  'triangleCentroidElevation',
  'benchIdForElevation',
  'findBenchByElevation',
  'analyzeBenches',
  'surfaceAreaHa',
  'resourceEstimateMt',
  'cumulativeResourceEstimateMt',
  'gradeEstimatePercent',
  'stripRatioEstimate',
  'incrementalNpvUsdM',
  'cumulativeNpvUsdM',
  'requires-closed-solids-or-block-model',
]) requireToken(engine, token, `bench engine: ${token}`);

for (const token of [
  'FASE REAL',
  'ALTURA DE BANCO',
  'BANCO SELECCIONADO',
  'Área superficial',
  'Recurso banco*',
  'Recurso acumulado*',
  'Ley estimada*',
  'Strip ratio*',
  'VAN incremental*',
  'VAN acumulado*',
  'RESUMEN DE FASE',
  'TOP 5 · VAN INCREMENTAL*',
  'phaseSummary',
  'valueRanking',
  'proxies analíticos',
  'escenario económico guardado',
]) requireToken(panel, token, `bench panel: ${token}`);

requireToken(styles, '.pit-stats{display:none!important}', 'estadísticas técnicas ocultas');
requireToken(styles, '.bench-phase-summary', 'resumen de fase estilizado');
requireToken(styles, '.bench-ranking', 'ranking de bancos estilizado');
requireToken(styles, '.bench-dock', 'panel flotante estilizado');
requireToken(main, '<BenchPanel />', 'panel montado en la aplicación');

console.log('\nSTAGE 4 AUDIT SUMMARY');
console.log(JSON.stringify({
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  passedChecks: passes.length,
  failedChecks: failures.length,
  failures,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
