import { existsSync, readFileSync } from 'node:fs';

const failures=[]; let passed=0;
const read=(path)=>existsSync(path)?readFileSync(path,'utf8'):'';
const check=(source,token,label=token)=>{if(source.includes(token)){passed+=1;console.log(`PASS: ${label}`)}else{failures.push(label);console.error(`FAIL: ${label}`)}};
const engine=read('src/engine/preliminaryHaulageLogistics.ts');
const panel=read('src/components/PreliminaryHaulageLogisticsPanel.tsx');
const main=read('src/main.tsx');
const readme=read('docs/stage-8-11/README.md').toLowerCase();

for(const token of [
  'HaulageDestinationId','PreliminaryHaulageRouteDefinition','PreliminaryHaulageInputs',
  'PreliminaryHaulagePeriodResult','PreliminaryHaulageRouteTotals','PreliminaryHaulageLogisticsReport',
  'createPreliminaryHaulageInputs','validatePreliminaryHaulageInputs','buildPreliminaryHaulageLogistics',
  'buildHaulageSensitivity','cycleTimeMinutes','capacityDeficitMt','requiredTruckHours','fuelLiters',
  'totalLogisticsCostUsdM','weightedUnitCostUsdPerTonne','totalMarginAfterHaulageUsdM',
  "routePolicy: 'observed-destination-fixed-logistics-evaluation'",
  'automaticDestinationReassignmentAllowed: false','oemRimpullRetardingModeled: false',
  'dispatchModeled: false','globalFleetOptimizationModeled: false','projectNpvClaimAllowed: false'
]) check(engine,token,`engine: ${token}`);

for(const token of ['ACARREO & LOGÍSTICA','CONFIRMAR CU = %','SENSIBILIDAD','RECONCILIACIONES','MODELO PRELIMINAR']) check(panel,token,`panel: ${token}`);
check(main,'PreliminaryHaulageLogisticsPanel','módulo montado en main');
for(const token of ['etapa 8.11','rutas de acarreo','costo logístico','npvpdest','no será despacho']) check(readme,token,`readme: ${token}`);

console.log('\nSTAGE 8.11 AUDIT SUMMARY');
console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',passedChecks:passed,failedChecks:failures.length,failures},null,2));
if(failures.length) process.exitCode=1;
