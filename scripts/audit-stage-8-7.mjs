import { existsSync, readFileSync } from 'node:fs';

const failures = [];
let passed = 0;
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`Falta ${path}`), '');
const requireToken = (source, token, label) => {
  if (source.includes(token)) { passed += 1; console.log(`PASS: ${label}`); }
  else { failures.push(label); console.error(`FAIL: ${label}`); }
};
const requireInsensitive = (source, token, label) => requireToken(source.toLowerCase(), token.toLowerCase(), label);

const engine = read('src/engine/blockBenchPreliminarySequence.ts');
const panel = read('src/components/BlockBenchPreliminarySequencePanel.tsx');
const styles = read('src/components/BlockBenchPreliminarySequencePanel.css');
const main = read('src/main.tsx');
const validator = read('scripts/validate-block-bench-preliminary-sequence.mjs');
const readme = read('docs/stage-8-7/README.md');
const checklist = read('docs/stage-8-7/manual-checklist.md');
const pkg = read('package.json');

for (const token of [
  'PreliminarySequenceInputs',
  'BenchScheduleSegment',
  'PreliminarySequencePeriod',
  'PreliminarySequenceReport',
  'createPreliminarySequenceInputs',
  'validatePreliminarySequenceInputs',
  'buildBlockBenchPreliminarySequence',
  "SequenceValueBasis = 'source-observed' | 'dsrl'",
  "sequencePolicy: 'strict-top-down'",
  'partialBenchAllocationAllowed: true',
  'stockpilingAllowed: false',
  'blendingModeled: false',
  'equipmentFleetModeled: false',
  'haulageModeled: false',
  'geotechnicalConstraintsModeled: false',
  'discountedNpvClaimAllowed: false',
  'mineScheduleClaimAllowed: false',
  'reserveClaimAllowed: false',
  "inventoryLabel: 'asignación preliminar de capacidad por banco dentro del diseño'",
]) requireToken(engine, token, `sequence engine: ${token}`);

for (const token of [
  'SECUENCIA PRELIMINAR',
  'ETAPA 8.7 · SECUENCIA PRELIMINAR Y CAPACIDAD',
  'Capacidad mina Mt/periodo',
  'Capacidad planta Mt/periodo',
  'Utilización mina %',
  'Utilización planta %',
  'SECUENCIA ECONÓMICA DSRL BLOQUEADA',
  'CONFIRMAR CU = %',
  'ASIGNACIÓN POR PERIODO · TECHO A FONDO',
  'TRAMOS DE BANCO',
  'RECONCILIACIÓN DE CAPACIDAD',
  'ASIGNACIÓN PRELIMINAR',
  'no es VAN',
  'no plan minero ejecutable ni reservas',
]) requireToken(panel, token, `sequence panel: ${token}`);

for (const token of [
  '.sequence-toggle', '.sequence-panel', '.sequence-summary', '.sequence-controls',
  '.sequence-capacity', '.sequence-gate', '.sequence-table', '.sequence-detail',
  '.sequence-reconciliation', '.sequence-note',
]) requireToken(styles, token, `sequence styles: ${token}`);

requireToken(main, "import BlockBenchPreliminarySequencePanel", 'main importa panel 8.7');
requireToken(main, '<BlockBenchPreliminarySequencePanel />', 'main monta panel 8.7');

for (const token of [
  '48 combinaciones reales',
  '34845',
  '54.89266375078649',
  'detecta horizonte insuficiente',
  'detecta cuello mina',
  'detecta cuello planta',
  'menor utilización no reduce periodos',
  'divide banco al 50%',
  'rechaza configuración inválida',
]) requireToken(validator, token, `sequence validator: ${token}`);

for (const token of [
  'Etapa 8.7',
  'secuencia preliminar',
  'capacidad mina',
  'capacidad planta',
  'precedencia vertical',
  'banco parcial',
  'sin stockpile',
  'margen operativo descontado',
  'no es un plan minero ejecutable',
  'Etapa 8.8',
]) requireInsensitive(readme, token, `readme 8.7: ${token}`);

requireToken(checklist, 'npm run verify:stage8-7', 'checklist incluye comando 8.7');
requireToken(pkg, 'validate:block-preliminary-sequence', 'package incluye validador 8.7');
requireToken(pkg, 'audit:stage8-7', 'package incluye auditoría 8.7');
requireToken(pkg, 'verify:stage8-7', 'package incluye verificación 8.7');

console.log('\nSTAGE 8.7 AUDIT SUMMARY');
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', passedChecks: passed, failedChecks: failures.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
