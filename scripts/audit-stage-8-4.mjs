import { existsSync, readFileSync } from 'node:fs';

const failures = [];
let passedChecks = 0;
function read(path) {
  if (!existsSync(path)) {
    failures.push(`Falta ${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}
function requireToken(source, token, label) {
  if (source.includes(token)) {
    passedChecks += 1;
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL: ${label}`);
  }
}
function requireTokenInsensitive(source, token, label) {
  if (source.toLocaleLowerCase('es').includes(token.toLocaleLowerCase('es'))) {
    passedChecks += 1;
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL: ${label}`);
  }
}

const engine = read('src/engine/blockBenchInventory.ts');
const panel = read('src/components/BlockBenchInventoryPanel.tsx');
const styles = read('src/components/BlockBenchInventoryPanel.css');
const main = read('src/main.tsx');
const validator = read('scripts/validate-block-bench-inventory.mjs');
const readme = read('docs/stage-8-4/README.md');
const checklist = read('docs/stage-8-4/manual-checklist.md');
const packageJson = read('package.json');

for (const token of [
  'SUPPORTED_BENCH_HEIGHTS',
  'BenchInventoryEntry',
  'BlockBenchInventoryReport',
  'benchFloorForElevation',
  'buildBlockBenchInventory',
  'cumulativeFromTop',
  'phaseInventoryCloses',
  'intervalsDoNotOverlap',
  "assignmentBasis: 'ZC'",
  "boundaryPolicy: '[floor, ceiling)'",
  'wholeBlockAssignment: true',
  'volumeSplitAcrossBenches: false',
  "inventoryLabel: 'inventario dentro del diseño'",
  'reserveClaimAllowed: false',
  'gradeUnitsConfirmed: false',
]) requireToken(engine, token, `bench inventory engine: ${token}`);

for (const token of [
  'BANCOS REALES',
  'ETAPA 8.4 · INVENTARIO REAL POR BANCOS',
  'FASE',
  'LECTURA',
  'ALTURA DE BANCO',
  'BANCO SELECCIONADO',
  'SECUENCIA VERTICAL · TECHO A FONDO',
  'MASA POR BANCO',
  'ACUMULADO DESDE TECHO',
  'RECONCILIACIÓN CONTRA INVENTARIO FÍSICO 8.3',
  'METODOLOGÍA CONTROLADA',
  'inventario dentro del diseño',
  'no declaración de reservas',
]) requireToken(panel, token, `bench inventory panel: ${token}`);

for (const token of [
  '.block-bench-toggle',
  '.block-bench-panel',
  '.block-bench-summary',
  '.block-bench-controls',
  '.block-bench-selected',
  '.block-bench-sequence',
  '.block-bench-charts',
  '.block-bench-reconciliation',
]) requireToken(styles, token, `bench inventory styles: ${token}`);

requireToken(main, "import BlockBenchInventoryPanel", 'main importa panel 8.4');
requireToken(main, '<BlockBenchInventoryPanel />', 'main monta panel 8.4');

for (const token of [
  '48 combinaciones reales',
  '34845',
  '54.89266375078649',
  '18981',
  'invalid',
  'boundaryPolicy',
  'volumeSplitAcrossBenches',
]) requireToken(validator, token, `bench validator: ${token}`);

for (const token of [
  'Etapa 8.4',
  'inventario real por bancos',
  'ZC',
  'bloque completo',
  'F1–F6',
  'Etapa 8.5',
]) requireTokenInsensitive(readme, token, `readme 8.4: ${token}`);

requireToken(checklist, 'npm run verify:stage8-4', 'checklist incluye comando 8.4');
requireToken(packageJson, 'validate:block-bench-inventory', 'package incluye validador 8.4');
requireToken(packageJson, 'audit:stage8-4', 'package incluye auditoría 8.4');
requireToken(packageJson, 'verify:stage8-4', 'package incluye verificación 8.4');

console.log('\nSTAGE 8.4 AUDIT SUMMARY');
console.log(JSON.stringify({
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  passedChecks,
  failedChecks: failures.length,
  failures,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
