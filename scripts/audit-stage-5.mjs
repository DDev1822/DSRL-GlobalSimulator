import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const passes = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`Falta ${path}`), '');
const requireToken = (source, token, label) => {
  if (source.includes(token)) { passes.push(label); console.log(`PASS: ${label}`); }
  else { failures.push(label); console.error(`FAIL: ${label}`); }
};

const engine = read('src/engine/phaseComparison.ts');
const panel = read('src/components/PhaseComparisonPanel.tsx');
const styles = read('src/components/PhaseComparisonPanel.css');
const main = read('src/main.tsx');

for (const token of [
  'PhaseComparisonSnapshot',
  'PhaseStepDelta',
  'buildPhaseComparison',
  'comparePhasePair',
  'surfaceAreaDeltaHa',
  'benchCountDelta',
  'triangleCountDelta',
  'minimumElevationDeltaM',
  'resourceDeltaMt',
  'npvDeltaUsdM',
  'requires-closed-solids-or-block-model',
]) requireToken(engine, token, `phase engine: ${token}`);

for (const token of [
  'FASE BASE',
  'FASE DESTINO',
  'ALTURA BANCO',
  'Δ área superficial',
  'Δ bancos',
  'Δ triángulos',
  'Δ cota mínima',
  'Δ recurso*',
  'Δ VAN*',
  'SECUENCIA DE FASES',
  'No se reporta volumen incremental',
]) requireToken(panel, token, `phase panel: ${token}`);

requireToken(styles, '.phase-compare-panel', 'panel de comparación estilizado');
requireToken(main, '<PhaseComparisonPanel />', 'comparador montado en la aplicación');

console.log('\nSTAGE 5 AUDIT SUMMARY');
console.log(JSON.stringify({
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  passedChecks: passes.length,
  failedChecks: failures.length,
  failures,
}, null, 2));

if (failures.length) process.exitCode = 1;
