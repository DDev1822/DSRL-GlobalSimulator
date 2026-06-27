import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const failures=[];let passed=0;
const ok=(value,label)=>{if(value){passed++;console.log(`PASS: ${label}`)}else{failures.push(label);console.error(`FAIL: ${label}`)}};
const near=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
const temp=mkdtempSync(join(tmpdir(),'dsrl-stage8-9-'));

try{
  writeFileSync(join(temp,'blockBenchInventory.mjs'),`export function benchFloorForElevation(e,d,h){return Number((d+Math.floor((e-d)/h)*h).toFixed(9))}\n`,'utf8');
  let code=ts.transpileModule(readFileSync('src/engine/blockBenchRouteRecovery.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  code=code.replaceAll("'./blockBenchInventory'","'./blockBenchInventory.mjs'");
  writeFileSync(join(temp,'engine.mjs'),code,'utf8');
  const engine=await import(pathToFileURL(join(temp,'engine.mjs')).href);
  const economic={metalPriceUsdPerTonne:8800,maxResourceMt:1500,wacc:.08,annualProductionMt:40,stripRatio:1.5,miningCostUsdPerTonneMoved:2.5,processingCostUsdPerTonneOre:7.5,baseGradePercent:.65,mineRecovery:.95,plantRecovery:.88,initialCapexUsdM:2800,sustainingCapexUsdMPerYear:0,payableFactor:.8,royaltyRate:0,taxRate:.3,cutoffStepPercent:.01,resourceCurveExponent:2,gradeResponseExponent:.85,maxCutoffMultiplier:2.5};
  const source=[['mill',125,100000,.5,'Mill'],['leach',115,100000,.3,'Leach'],['dump',105,100000,.1,'_DUMP_'],['unknown',95,100000,.2,'Mystery']];
  const rows=source.map((r,i)=>({blockKey:r[0],XC:i,YC:0,ZC:r[1],XINC:1,YINC:1,ZINC:1,DENSITY:1,AU:0,CU:r[3],NPVMASS:r[2],NPVVOL:r[2],NPVPDEST:r[4],PSB_PIT:1}));
  const dataset={sourceName:'synthetic.csv',sourcePath:'synthetic.csv',loadedAtIso:new Date().toISOString(),headers:[],rows,report:{status:'pass'}};
  const inputs=engine.createRouteRecoveryInputs(economic,{periodCount:10,mineCapacityMtPerPeriod:.2,routes:{mill:{capacityMtPerPeriod:.05,stockpileCapacityMt:.2,reclaimCapacityMtPerPeriod:.05,recovery:.9},leach:{capacityMtPerPeriod:.05,stockpileCapacityMt:.2,reclaimCapacityMtPerPeriod:.05,recovery:.5}}});
  const report=engine.buildBlockBenchRouteRecovery(dataset,1,'cumulative',10,economic,'cu-percent','full-cost',inputs);
  ok(engine.normalizeSourceDestination('Mill')==='mill','normaliza Mill');
  ok(engine.normalizeSourceDestination('Leach')==='leach','normaliza Leach');
  ok(engine.normalizeSourceDestination('_DUMP_')==='dump','normaliza Dump');
  ok(engine.normalizeSourceDestination('Mystery')==='unknown','reporta desconocido');
  ok(near(report.routeTotals.mill.sourceMassMt,.1),'preserva masa Mill');
  ok(near(report.routeTotals.leach.sourceMassMt,.1),'preserva masa Leach');
  ok(near(report.nonProcessMassMt,.1),'preserva masa Dump');
  ok(near(report.unknownDestinationMassMt,.1)&&report.unknownDestinations.includes('Mystery'),'preserva destino desconocido');
  ok(report.reconciliation.mineMassCloses&&report.reconciliation.processRouteMassCloses,'cierra masa y rutas');
  ok(report.reconciliation.stockpileMassCloses&&report.reconciliation.copperContentCloses,'cierra stockpile y cobre');
  ok(report.reconciliation.recoveredCopperWithinFeed&&report.reconciliation.valueBalanceCloses,'cierra recuperación y valor');
  ok(report.reconciliation.routeIdentityPreserved&&report.reconciliation.verticalPrecedenceRespected,'preserva ruta y precedencia');
  ok(near(report.routeTotals.mill.effectiveRecovery,.9),'aplica recuperación Mill');
  ok(near(report.routeTotals.leach.effectiveRecovery,.5),'aplica recuperación Leach');
  const bounds=engine.createRouteRecoveryInputs(economic,{periodCount:10,mineCapacityMtPerPeriod:1,routes:{mill:{capacityMtPerPeriod:1,stockpileCapacityMt:1,reclaimCapacityMtPerPeriod:1,recovery:1},leach:{capacityMtPerPeriod:1,stockpileCapacityMt:1,reclaimCapacityMtPerPeriod:1,recovery:0}}});
  const edge=engine.buildBlockBenchRouteRecovery(dataset,1,'cumulative',10,economic,'cu-percent','full-cost',bounds);
  ok(near(edge.routeTotals.mill.effectiveRecovery,1),'recuperación 100% válida');
  ok(near(edge.routeTotals.leach.recoveredCuKt,0),'recuperación 0% válida');
  let locked=false;try{engine.buildBlockBenchRouteRecovery(dataset,1,'cumulative',10,economic,'unconfirmed','full-cost',inputs)}catch{locked=true}
  ok(locked,'bloquea sin confirmar CU');
  const invalid=engine.createRouteRecoveryInputs(economic,{routes:{mill:{recovery:1.2}}});
  ok(engine.validateRouteRecoveryInputs(invalid).length>0,'rechaza recuperación inválida');
  console.log('\nBLOCK BENCH ROUTE RECOVERY VALIDATION');
  console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',passedChecks:passed,failedChecks:failures.length,failures},null,2));
  if(failures.length)process.exitCode=1;
}finally{rmSync(temp,{recursive:true,force:true})}
