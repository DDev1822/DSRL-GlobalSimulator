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

const engine = read('src/engine/valueRiskRecommendation.ts');
const panel = read('src/components/OptimalPhasePanel.tsx');
const styles = read('src/components/OptimalPhasePanel.css');
const main = read('src/main.tsx');

for (const token of [
  'DecisionProfile',
  'DECISION_PROFILES',
  'conservative',
  'balanced',
  'aggressive',
  'valueScore',
  'riskScore',
  'recommendationScore',
  'calculateEfficientFrontier',
  'recommendOptimalPhase',
  'isEfficientFrontier',
  'relative-screening-not-geotechnical',
  'analytical-proxy',
]) requireToken(engine, token, `recommendation engine: ${token}`);

for (const token of [
  'PERFIL DE DECISIÓN',
  'FASE RECOMENDADA',
  'FRONTERA VALOR–RIESGO',
  'POR QUÉ SE RECOMIENDA',
  'ALTERNATIVAS DE DECISIÓN',
  'FASES NO DOMINADAS',
  'Riesgo relativo',
  'no sustituye análisis geotécnico',
  'modelo de bloques',
]) requireToken(panel, token, `optimal panel: ${token}`);

requireToken(styles, '.optimal-phase-panel', 'panel de recomendación estilizado');
requireToken(styles, '.frontier-line', 'frontera visual estilizada');
requireToken(main, '<OptimalPhasePanel />', 'panel óptimo montado en la aplicación');

console.log('\nSTAGE 6 AUDIT SUMMARY');
console.log(JSON.stringify({
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  passedChecks: passes.length,
  failedChecks: failures.length,
  failures,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
