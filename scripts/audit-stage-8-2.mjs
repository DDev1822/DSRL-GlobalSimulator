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

const parser = read('src/utils/blockModelParser.ts');
const panel = read('src/components/BlockModelQualityPanel.tsx');
const styles = read('src/components/BlockModelQualityPanel.css');
const main = read('src/main.tsx');
const validator = read('scripts/validate-block-model-ingestion.mjs');
const readme = read('docs/stage-8-2/README.md');
const checklist = read('docs/stage-8-2/manual-checklist.md');
const packageJson = read('package.json');

for (const token of [
  'NormalizedBlockModelRow',
  'BlockModelQualityReport',
  'BlockModelDataset',
  'BlockModelCatalog',
  'parseCsvMatrix',
  'parseBlockModelCsv',
  'loadBlockModelFromUrl',
  'loadBlockModelFromFile',
  'loadBlockModelCatalog',
  'reconcileBlockModelCatalog',
  'duplicateBlockKeys',
  'duplicateIjkCount',
  'outsideActivePhaseScopeRows',
  'volumeReconciliation',
  'massReconciliation',
  'profitReconciliation',
  'UNKNOWN_DESTINATION',
  'NON_POSITIVE_DIMENSION',
  'DUPLICATE_BLOCK_KEY',
]) requireToken(parser, token, `parser: ${token}`);

for (const token of [
  'MODELO DE BLOQUES',
  'ETAPA 8.2 · INGESTA Y CALIDAD',
  'MODELO MAESTRO',
  'MODELO DE CONTROL F1–F3',
  'RECONCILIACIÓN FÍSICA',
  'CONTROL CRUZADO · F1–F3',
  'DISTRIBUCIÓN POR PUSHBACK',
  'DESTINOS OBSERVADOS',
  'REPORTE DE CALIDAD',
  'ALCANCE 8.2',
  'loadBlockModelCatalog',
]) requireToken(panel, token, `panel: ${token}`);

for (const token of [
  '.block-model-toggle',
  '.block-model-panel',
  '.block-overall',
  '.block-reconciliation',
  '.block-cross-result',
  '.block-quality-checks',
]) requireToken(styles, token, `styles: ${token}`);

requireToken(main, "import BlockModelQualityPanel", 'main importa panel 8.2');
requireToken(main, '<BlockModelQualityPanel />', 'main monta panel 8.2');

for (const token of [
  '49989',
  '18981',
  '13098',
  '15144',
  'reconcileBlockModelCatalog',
  'invalid-dimension.csv',
  'duplicate.csv',
]) requireToken(validator, token, `validator: ${token}`);

for (const token of [
  'Etapa 8.2',
  '49,989',
  '18,981',
  'control exacto F1–F3',
  'Etapa 8.3',
]) requireToken(readme, token, `readme: ${token}`);

requireToken(checklist, 'npm run verify:stage8-2', 'checklist incluye comando de cierre');
requireToken(packageJson, 'validate:block-ingestion', 'package incluye validador 8.2');
requireToken(packageJson, 'audit:stage8-2', 'package incluye auditoría 8.2');
requireToken(packageJson, 'verify:stage8-2', 'package incluye verificación 8.2');

console.log('\nSTAGE 8.2 AUDIT SUMMARY');
console.log(JSON.stringify({
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  passedChecks,
  failedChecks: failures.length,
  failures,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
