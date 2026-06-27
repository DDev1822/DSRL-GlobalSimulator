import { existsSync, readFileSync } from 'node:fs';

const failures=[];let passed=0;
const read=(path)=>existsSync(path)?readFileSync(path,'utf8'):(failures.push(`Falta ${path}`),'');
const need=(source,token,label=token)=>{if(source.includes(token)){passed++;console.log(`PASS: ${label}`)}else{failures.push(label);console.error(`FAIL: ${label}`)}};

const engine=read('src/engine/blockBenchStockpileBlending.ts');
const panel=read('src/components/BlockBenchStockpileBlendingPanel.tsx');
const styles=read('src/components/BlockBenchStockpileBlendingPanel.css');
const main=read('src/main.tsx');
const validator=read('scripts/validate-block-bench-stockpile-blending.mjs');
const readme=read('docs/stage-8-8/README.md').toLowerCase();
const checklist=read('docs/stage-8-8/manual-checklist.md');

for(const token of[
  'StockpileBlendingInputs','StockpilePeriod','StockpileBlendingReport',
  'createStockpileBlendingInputs','validateStockpileBlendingInputs',
  'buildBlockBenchStockpileBlending','target-seeking-complementary-lots',
  'stockpileLotIdentityPreserved: true','partialLotReclaimAllowed: true',
  'stockpileLossesModeled: false','oxidationModeled: false',
  'recoveryByRouteModeled: false','equipmentFleetModeled: false',
  'haulageModeled: false','discountedNpvClaimAllowed: false',
  'mineScheduleClaimAllowed: false','reserveClaimAllowed: false',
  'copperBalanceCloses','valueBalanceCloses','stockpileCapacityRespected',
  'reclaimCapacityRespected',
])need(engine,token,`engine: ${token}`);

for(const token of[
  'STOCKPILE & BLENDING','ETAPA 8.8 · STOCKPILE Y BLENDING CONTROLADO',
  'Stockpile máximo Mt','Reclaim Mt/periodo','Ley objetivo % Cu',
  'Tolerancia ± % Cu','STOCKPILE Y BLENDING BLOQUEADOS','CONFIRMAR CU = %',
  'BALANCE POR PERIODO','Cobre en stockpile','RECONCILIACIÓN DE MASA, COBRE Y VALOR',
  'SIMULACIÓN PRELIMINAR','no es VAN','no plan minero ni reservas',
])need(panel,token,`panel: ${token}`);

for(const token of[
  '.stockpile-toggle','.stockpile-panel','.stockpile-controls','.stockpile-inputs',
  '.stockpile-gate','.stockpile-summary','.stockpile-table','.stockpile-detail',
  '.stockpile-reconciliation','.stockpile-note',
])need(styles,token,`styles: ${token}`);

need(main,"import BlockBenchStockpileBlendingPanel",'main importa 8.8');
need(main,'<BlockBenchStockpileBlendingPanel />','main monta 8.8');
for(const token of[
  '48 combinaciones reales','34845','54.89266375078649',
  'mezcla 0.20% + 0.40% = 0.30% Cu','detecta horizonte insuficiente',
])need(validator,token,`validator: ${token}`);
for(const token of[
  'etapa 8.8','stockpile','blending','balance de cobre','ley objetivo',
  'lotes complementarios','no es optimización global','no es van','etapa 8.9',
])need(readme,token,`readme: ${token}`);
for(const token of[
  'npm run verify:stage8-6','node scripts/audit-stage-8-7.mjs',
  'node scripts/validate-block-bench-preliminary-sequence.mjs',
  'node scripts/audit-stage-8-8.mjs','node scripts/validate-block-bench-stockpile-blending.mjs',
  'npm run typecheck','npm run build',
])need(checklist,token,`checklist: ${token}`);

console.log('\nSTAGE 8.8 AUDIT SUMMARY');
console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',passedChecks:passed,failedChecks:failures.length,failures},null,2));
if(failures.length)process.exitCode=1;
