import { existsSync, readFileSync } from 'node:fs';

const failures = [];
let passed = 0;
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const check = (source, token, label = token) => {
  if (source.includes(token)) { passed += 1; console.log(`PASS: ${label}`); }
  else { failures.push(label); console.error(`FAIL: ${label}`); }
};

const engine = read('src/engine/integratedRouteEconomics.ts');
const panel = read('src/components/IntegratedRouteEconomicsPanel.tsx');
const main = read('src/main.tsx');
const readme = read('docs/stage-8-10/README.md').toLowerCase();

for (const token of [
  'RouteEconomicDefinition',
  'IntegratedRouteEconomicInputs',
  'RouteEconomicPeriod',
  'RouteEconomicTotals',
  'IntegratedRouteEconomicReport',
  'createIntegratedRouteEconomicInputs',
  'validateIntegratedRouteEconomicInputs',
  'buildIntegratedRouteEconomics',
  'buildRouteEconomicSensitivity',
  'payableCuKt',
  'grossRevenueUsdM',
  'treatmentChargeUsdM',
  'refiningChargeUsdM',
  'sellingCostUsdM',
  'royaltyUsdM',
  'totalPendingMarginUsdM',
  'realizedPlusPendingValueCloses',
  "routePolicy: 'observed-route-economic-evaluation'",
  'routeReclassificationAllowed: false',
  'projectNpvClaimAllowed: false',
]) check(engine, token, `engine: ${token}`);

for (const token of [
  'ECONOMÍA POR RUTA',
  'CONFIRMAR CU = %',
  'SENSIBILIDAD ECONÓMICA',
  'RECONCILIACIONES',
  'valor operativo descontado no es VAN',
]) check(panel, token, `panel: ${token}`);

check(main, 'IntegratedRouteEconomicsPanel', 'módulo montado en main');
for (const token of ['etapa 8.10', 'economía integrada por ruta', 'metal pagable', 'valor pendiente', 'no será van']) {
  check(readme, token, `readme: ${token}`);
}

console.log('\nSTAGE 8.10 AUDIT SUMMARY');
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', passedChecks: passed, failedChecks: failures.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
