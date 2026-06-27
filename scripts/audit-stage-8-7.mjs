import { existsSync, readFileSync } from 'node:fs';

const failures = [];
let passed = 0;
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`Falta ${path}`), '');
const need = (source, token, label = token) => {
  if (source.includes(token)) { passed += 1; console.log(`PASS: ${label}`); }
  else { failures.push(label); console.error(`FAIL: ${label}`); }
};

const engine = read('src/engine/blockBenchPreliminarySequence.ts');
const panel = read('src/components/BlockBenchPreliminarySequencePanel.tsx');
const styles = read('src/components/BlockBenchPreliminarySequencePanel.css');
const main = read('src/main.tsx');
const validator = read('scripts/validate-block-bench-preliminary-sequence.mjs');
const readme = read('docs/stage-8-7/README.md').toLowerCase();
const checklist = read('docs/stage-8-7/manual-checklist.md');

for (const token of [
  'PreliminarySequenceInputs','BenchScheduleSegment','PreliminarySequencePeriod',
  'PreliminarySequenceReport','createPreliminarySequenceInputs',
  'validatePreliminarySequenceInputs','buildBlockBenchPreliminarySequence',
  "sequencePolicy: 'strict-top-down'",'partialBenchAllocationAllowed: true',
  'stockpilingAllowed: false','blendingModeled: false','equipmentFleetModeled: false',
  'haulageModeled: false','geotechnicalConstraintsModeled: false',
  'discountedNpvClaimAllowed: false','mineScheduleClaimAllowed: false',
  'reserveClaimAllowed: false',
]) need(engine, token, `engine: ${token}`);

for (const token of [
  'SECUENCIA PRELIMINAR','ETAPA 8.7 · SECUENCIA PRELIMINAR Y CAPACIDAD',
  'Capacidad mina Mt/periodo','Capacidad planta Mt/periodo','Utilización mina %',
  'Utilización planta %','SECUENCIA ECONÓMICA DSRL BLOQUEADA','CONFIRMAR CU = %',
  'ASIGNACIÓN POR PERIODO · TECHO A FONDO','TRAMOS DE BANCO',
  'RECONCILIACIÓN DE CAPACIDAD','ASIGNACIÓN PRELIMINAR','no es VAN',
]) need(panel, token, `panel: ${token}`);

for (const token of [
  '.sequence-toggle','.sequence-panel','.sequence-summary','.sequence-controls',
  '.sequence-capacity','.sequence-gate','.sequence-table','.sequence-detail',
  '.sequence-reconciliation','.sequence-note',
]) need(styles, token, `styles: ${token}`);

need(main, "import BlockBenchPreliminarySequencePanel", 'main importa 8.7');
need(main, '<BlockBenchPreliminarySequencePanel />', 'main monta 8.7');

for (const token of [
  '48 combinaciones reales','34845','54.89266375078649',
  'detecta horizonte insuficiente','detecta cuello mina','detecta cuello planta',
  'menor utilización no reduce periodos','divide banco al 50%',
  'rechaza configuración inválida',
]) need(validator, token, `validator: ${token}`);

for (const token of [
  'etapa 8.7','secuencia preliminar','capacidad mina','capacidad planta',
  'precedencia vertical','banco parcial','sin stockpile',
  'margen operativo descontado','no es un plan minero ejecutable','etapa 8.8',
]) need(readme, token, `readme: ${token}`);

for (const token of [
  'npm run verify:stage8-6','node scripts/audit-stage-8-7.mjs',
  'node scripts/validate-block-bench-preliminary-sequence.mjs',
  'npm run typecheck','npm run build',
]) need(checklist, token, `checklist: ${token}`);

console.log('\nSTAGE 8.7 AUDIT SUMMARY');
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', passedChecks: passed, failedChecks: failures.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
