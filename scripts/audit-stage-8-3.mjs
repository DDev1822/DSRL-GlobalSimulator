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

const engine = read('src/engine/blockInventory.ts');
const panel = read('src/components/BlockInventoryPanel.tsx');
const styles = read('src/components/BlockInventoryPanel.css');
const main = read('src/main.tsx');
const validator = read('scripts/validate-block-inventory.mjs');
const readme = read('docs/stage-8-3/README.md');
const checklist = read('docs/stage-8-3/manual-checklist.md');
const packageJson = read('package.json');

for (const token of [
  'PhysicalInventoryMetrics',
  'PhasePhysicalInventory',
  'BlockInventoryReport',
  'buildBlockInventory',
  'getPhaseInventory',
  'incremental',
  'cumulative',
  'processMassMt',
  'wasteMassMt',
  'millMassMt',
  'leachMassMt',
  'stripRatioByDestination',
  'weightedAuProcess',
  'weightedCuProcess',
  'excludedFutureBlockCount',
  'blockCountCloses',
  'volumeCloses',
  'massCloses',
  'processPlusWasteCloses',
  'millPlusLeachCloses',
  'cumulativeMonotonic',
  "inventoryLabel: 'inventario dentro del diseño'",
  'reserveClaimAllowed: false',
  'gradeUnitsConfirmed: false',
]) requireToken(engine, token, `inventory engine: ${token}`);

for (const token of [
  'INVENTARIO REAL',
  'ETAPA 8.3 · INVENTARIO FÍSICO REAL',
  'INVENTARIO F1–F6',
  'PROCESO',
  'DESMONTE',
  'STRIP RATIO',
  'F7–F9 PRESERVADOS',
  'INCREMENTAL',
  'ACUMULADO',
  'SECUENCIA FÍSICA F1–F6',
  'MASA INCREMENTAL',
  'MASA ACUMULADA',
  'RECONCILIACIÓN DEL INVENTARIO',
  'inventario dentro del diseño',
  'no una declaración de reservas',
]) requireToken(panel, token, `inventory panel: ${token}`);

for (const token of [
  '.block-inventory-toggle',
  '.block-inventory-panel',
  '.block-inventory-summary',
  '.block-selected-inventory',
  '.block-inventory-sequence',
  '.block-inventory-charts',
  '.block-inventory-reconciliation',
]) requireToken(styles, token, `inventory styles: ${token}`);

requireToken(main, "import BlockInventoryPanel", 'main importa panel 8.3');
requireToken(main, '<BlockInventoryPanel />', 'main monta panel 8.3');

for (const token of [
  '34845',
  '15144',
  '54.89266375078649',
  '39.106396711706985',
  '15.786267039079501',
  '0.40367480428984875',
  '18981',
  'buildBlockInventory',
]) requireToken(validator, token, `inventory validator: ${token}`);

for (const token of [
  'Etapa 8.3',
  'inventario incremental',
  'inventario acumulado',
  '34,845',
  '54.892664',
  'Etapa 8.4',
]) requireTokenInsensitive(readme, token, `readme 8.3: ${token}`);

requireToken(checklist, 'npm run verify:stage8-3', 'checklist incluye comando 8.3');
requireToken(packageJson, 'validate:block-inventory', 'package incluye validador 8.3');
requireToken(packageJson, 'audit:stage8-3', 'package incluye auditoría 8.3');
requireToken(packageJson, 'verify:stage8-3', 'package incluye verificación 8.3');

console.log('\nSTAGE 8.3 AUDIT SUMMARY');
console.log(JSON.stringify({
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  passedChecks,
  failedChecks: failures.length,
  failures,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
