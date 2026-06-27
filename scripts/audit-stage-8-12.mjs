import { existsSync, readFileSync } from 'node:fs';

const failures = [];
let passed = 0;
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const check = (source, token, label = token) => {
  if (source.includes(token)) {
    passed += 1;
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL: ${label}`);
  }
};

const engine = read('src/engine/roadConditionEconomicImpact.ts');
const panel = read('src/components/RoadConditionEconomicImpactPanel.tsx');
const main = read('src/main.tsx');
const readme = read('docs/stage-8-12/README.md').toLowerCase();

for (const token of [
  'RoadConditionClass', 'RoadConditionBasis', 'RoadConditionRouteInput', 'RoadConditionInputs',
  'RoadConditionPeriodImpact', 'RoadConditionRouteImpact', 'RoadConditionEconomicImpactReport',
  'ROAD_CONDITION_PRESETS', 'createRoadConditionInputs', 'validateRoadConditionInputs',
  'applyRoadConditionPreset', 'buildRoadConditionEconomicImpact', 'totalAdditionalLogisticsCostUsdM',
  'totalMarginErosionUsdM', 'totalRecoverableValuePotentialUsdM', 'totalCapacityLossMt',
  'exposureRanking', "conditionPolicy: 'target-versus-current-road-condition-scenario'",
  'roadConditionObservedByDefault: false', 'dynamicRoadDegradationModeled: false',
  'interventionOptimizationModeled: false', 'oemRimpullRetardingModeled: false',
  'dispatchModeled: false', 'projectNpvClaimAllowed: false', 'valueRecoveryClaimAllowed: false',
]) check(engine, token, `engine: ${token}`);

for (const token of [
  'VÍAS & EXPOSICIÓN', 'CONDICIÓN DE VÍA & EXPOSICIÓN ECONÓMICA', 'RR actual %',
  'RR objetivo %', 'Potencial recuperable', 'EXPOSICIÓN POR PERIODO',
  'DESCOMPOSICIÓN DEL COSTO ADICIONAL', 'RECONCILIACIONES',
  'EXPOSICIÓN MODELADA, NO AHORRO REALIZADO',
]) check(panel, token, `panel: ${token}`);

check(main, 'RoadConditionEconomicImpactPanel', 'módulo 8.12 montado en main');
for (const token of ['etapa 8.12', 'condición de vía', 'exposición económica', 'npvpdest', 'no declara todavía ahorro realizado']) {
  check(readme, token, `readme: ${token}`);
}

console.log('\nSTAGE 8.12 AUDIT SUMMARY');
console.log(JSON.stringify({
  status: failures.length ? 'FAIL' : 'PASS',
  passedChecks: passed,
  failedChecks: failures.length,
  failures,
}, null, 2));
if (failures.length) process.exitCode = 1;
