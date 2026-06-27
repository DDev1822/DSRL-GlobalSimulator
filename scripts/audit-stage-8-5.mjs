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

const engine = read('src/engine/blockEconomicClassification.ts');
const panel = read('src/components/BlockEconomicClassificationPanel.tsx');
const styles = read('src/components/BlockEconomicClassificationPanel.css');
const main = read('src/main.tsx');
const validator = read('scripts/validate-block-economic-classification.mjs');
const readme = read('docs/stage-8-5/README.md');
const checklist = read('docs/stage-8-5/manual-checklist.md');
const packageJson = read('package.json');

for (const token of [
  'BlockCostBasis',
  'GradeConfirmation',
  'BlockEconomicTrace',
  'SourceEconomicMetrics',
  'DsrlEconomicMetrics',
  'BlockEconomicClassificationReport',
  'calculateBlockCutoffPercent',
  'buildBlockEconomicClassification',
  'getBlockEconomicPhase',
  'processing-only',
  'full-cost',
  'NPVPDEST',
  'NPVPROFT',
  'cu-percent',
  'upgrade-to-process',
  'downgrade-to-waste',
  'sourceProfitCloses',
  'dsrlValueCloses',
  'millLeachReclassificationSupported: false',
  'discountedNpv: false',
  'globalStripRatioIncluded: false',
  'wasteMiningCostIncluded: false',
  "inventoryLabel: 'inventario económico preliminar dentro del diseño'",
  'reserveClaimAllowed: false',
]) requireToken(engine, token, `block economics engine: ${token}`);

for (const token of [
  'ECONOMÍA POR BLOQUE',
  'ETAPA 8.5 · CLASIFICACIÓN ECONÓMICA POR BLOQUE',
  'AUDITORÍA ECONÓMICA FUENTE',
  'RECLASIFICACIÓN DSRL BLOQUEADA',
  'CONFIRMAR CU = %',
  'CU CONFIRMADO COMO PORCENTAJE PARA ESTA SESIÓN',
  'BASE DE COSTO DSRL',
  'SOLO PROCESO',
  'COSTO COMPLETO',
  'Ley de corte DSRL',
  'TRAZABILIDAD DE DESTINOS · FUENTE VS DSRL',
  'EJEMPLOS DE BLOQUES RECLASIFICADOS',
  'RECONCILIACIÓN ECONÓMICA Y DE MASA',
  'GUARDAS METODOLÓGICAS',
  'no es VAN',
  'no reservas',
]) requireToken(panel, token, `block economics panel: ${token}`);

for (const token of [
  '.block-economic-toggle',
  '.block-economic-panel',
  '.block-source-audit',
  '.block-grade-gate',
  '.block-dsrl-summary',
  '.block-reclassification-matrix',
  '.block-economic-sequence',
  '.block-economic-traces',
  '.block-economic-reconciliation',
]) requireToken(styles, token, `block economics styles: ${token}`);

requireToken(main, "import BlockEconomicClassificationPanel", 'main importa panel 8.5');
requireToken(main, '<BlockEconomicClassificationPanel />', 'main monta panel 8.5');

for (const token of [
  '34845',
  '15144',
  '54.89266375078649',
  '18981',
  'reclasificación bloqueada',
  'costo completo eleva cut-off',
  'mayor precio reduce cut-off por bloque',
  'mayor costo eleva cut-off por bloque',
  'caso sintético mantiene un bloque de proceso',
  'caso sintético sube un bloque a proceso',
  'caso sintético baja un bloque a desmonte',
]) requireToken(validator, token, `block economics validator: ${token}`);

for (const token of [
  'Etapa 8.5',
  'auditoría fuente',
  'reclasificación DSRL',
  'CU = %',
  'proceso versus desmonte',
  'moneda nativa',
  'margen no descontado',
  'inventario económico preliminar dentro del diseño',
  'Etapa 8.6',
]) requireTokenInsensitive(readme, token, `readme 8.5: ${token}`);

requireToken(checklist, 'npm run verify:stage8-5', 'checklist incluye comando 8.5');
requireToken(packageJson, 'validate:block-economics', 'package incluye validador 8.5');
requireToken(packageJson, 'audit:stage8-5', 'package incluye auditoría 8.5');
requireToken(packageJson, 'verify:stage8-5', 'package incluye verificación 8.5');

console.log('\nSTAGE 8.5 AUDIT SUMMARY');
console.log(JSON.stringify({
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  passedChecks,
  failedChecks: failures.length,
  failures,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
