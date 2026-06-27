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

const engine = read('src/engine/blockBenchEconomicValue.ts');
const panel = read('src/components/BlockBenchEconomicValuePanel.tsx');
const styles = read('src/components/BlockBenchEconomicValuePanel.css');
const cache = read('src/utils/blockModelCatalogLoader.ts');
const main = read('src/main.tsx');
const validator = read('scripts/validate-block-bench-economic-value.mjs');
const readme = read('docs/stage-8-6/README.md');
const checklist = read('docs/stage-8-6/manual-checklist.md');
const packageJson = read('package.json');

for (const token of [
  'MARGINAL_VALUE_THRESHOLD_USD_PER_TONNE',
  'BenchValueBand',
  'BenchEconomicValueMetrics',
  'BenchEconomicValueEntry',
  'BlockBenchEconomicValueReport',
  'buildBlockBenchEconomicValue',
  'sourceProfitNative',
  'selectedMarginUsdM',
  'selectedMarginUsdPerProcessTonne',
  'potentialMarginUsdM',
  'topValueBenchIds',
  'sourceNegativeBenchIds',
  'dsrlRiskBenchIds',
  'cumulativeFromTop',
  'physicalMassCloses',
  'sourceProfitClosesAgainstStage85',
  'dsrlMarginClosesAgainstStage85',
  "assignmentBasis: 'ZC'",
  "boundaryPolicy: '[floor, ceiling)'",
  'selectedMarginDiscounted: false',
  "inventoryLabel: 'screening económico real por banco dentro del diseño'",
  'reserveClaimAllowed: false',
  'mineScheduleClaimAllowed: false',
]) requireToken(engine, token, `bench value engine: ${token}`);

for (const token of [
  'VALOR POR BANCO',
  'ETAPA 8.6 · VALOR ECONÓMICO REAL POR BANCO',
  'VALOR DSRL BLOQUEADO',
  'CONFIRMAR CU = %',
  'MAPA VERTICAL DE VALOR · TECHO A FONDO',
  'TOP 5 · VALOR POR BANCO',
  'BANCOS MARGINALES O NEGATIVOS',
  'RECONCILIACIÓN 8.4 + 8.5',
  'SCREENING, NO SECUENCIA',
  'Beneficio fuente*',
  'Margen DSRL',
  'Valor DSRL',
  'Upgrade',
  'Downgrade',
  'Caché catálogo',
  'no reservas ni plan minero',
]) requireToken(panel, token, `bench value panel: ${token}`);

for (const token of [
  '.bench-value-toggle',
  '.bench-value-panel',
  '.bench-value-summary',
  '.bench-value-gate',
  '.bench-value-selected',
  '.bench-value-heatmap',
  '.bench-value-rankings',
  '.bench-value-reconciliation',
]) requireToken(styles, token, `bench value styles: ${token}`);

for (const token of [
  'BlockModelCatalogCacheState',
  'getBlockModelCatalogCacheState',
  'invalidateBlockModelCatalogCache',
  'forceReload',
  'hitCount',
  'loadCount',
  "status: 'ready'",
]) requireToken(cache, token, `catalog cache: ${token}`);

requireToken(main, "import BlockBenchEconomicValuePanel", 'main importa panel 8.6');
requireToken(main, '<BlockBenchEconomicValuePanel />', 'main monta panel 8.6');

for (const token of [
  '48 combinaciones reales',
  '34845',
  '54.89266375078649',
  'valor DSRL bloqueado',
  'costo completo eleva cut-off',
  'mayor precio reduce cut-off',
  'mayor costo eleva cut-off',
  'caso sintético identifica banco de alto valor',
  'caso sintético identifica banco marginal',
  'caso sintético identifica banco negativo',
  'margen total coincide con 8.5',
]) requireToken(validator, token, `bench value validator: ${token}`);

for (const token of [
  'Etapa 8.6',
  'valor económico real por banco',
  'caché compartido',
  'alto valor',
  'marginal',
  'negativo',
  'screening',
  'no es una secuencia minera',
  'Etapa 8.7',
]) requireTokenInsensitive(readme, token, `readme 8.6: ${token}`);

requireToken(checklist, 'npm run verify:stage8-6', 'checklist incluye comando 8.6');
requireToken(packageJson, 'validate:block-bench-value', 'package incluye validador 8.6');
requireToken(packageJson, 'audit:stage8-6', 'package incluye auditoría 8.6');
requireToken(packageJson, 'verify:stage8-6', 'package incluye verificación 8.6');

console.log('\nSTAGE 8.6 AUDIT SUMMARY');
console.log(JSON.stringify({
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  passedChecks,
  failedChecks: failures.length,
  failures,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
