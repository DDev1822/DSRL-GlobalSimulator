import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const failures=[]; let passed=0;
const check=(value,label)=>{if(value){passed+=1;console.log(`PASS: ${label}`)}else{failures.push(label);console.error(`FAIL: ${label}`)}};
const close=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
function transpile(source,target,replacements=[]){let code=ts.transpileModule(readFileSync(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;for(const [from,to] of replacements)code=code.replaceAll(from,to);writeFileSync(target,code,'utf8')}
function csvCells(line){const out=[];let value='';let quoted=false;for(let i=0;i<line.length;i+=1){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){value+='"';i+=1}else quoted=!quoted}else if(c===','&&!quoted){out.push(value);value=''}else value+=c}out.push(value);return out}
function loadDataset(path){const lines=readFileSync(path,'utf8').trim().split(/\r?\n/);const headers=csvCells(lines[0]);const p=Object.fromEntries(headers.map((h,i)=>[h.trim().toUpperCase(),i]));const rows=lines.slice(1).map((line,index)=>{const r=csvCells(line);return{blockKey:`row-${index+1}`,XC:Number(r[p.XC]??0),YC:Number(r[p.YC]??0),ZC:Number(r[p.ZC]),XINC:Number(r[p.XINC]??1),YINC:Number(r[p.YINC]??1),ZINC:Number(r[p.ZINC]??1),DENSITY:Number(r[p.DENSITY]??1),AU:Number(r[p.AU]??0),CU:Number(r[p.CU]),NPVMASS:Number(r[p.NPVMASS]),NPVVOL:Number(r[p.NPVVOL]??r[p.NPVMASS]),NPVPDEST:String(r[p.NPVPDEST]??''),PSB_PIT:Number(r[p.PSB_PIT])}});return{sourceName:'simmodPL.csv',sourcePath:path,loadedAtIso:new Date().toISOString(),headers,rows,report:{status:'pass'}}}

const economic={metalPriceUsdPerTonne:8800,maxResourceMt:1500,wacc:.08,annualProductionMt:40,stripRatio:1.5,miningCostUsdPerTonneMoved:2.5,processingCostUsdPerTonneOre:7.5,baseGradePercent:.65,mineRecovery:.95,plantRecovery:.88,initialCapexUsdM:2800,sustainingCapexUsdMPerYear:0,payableFactor:.8,royaltyRate:.02,taxRate:.3,cutoffStepPercent:.01,resourceCurveExponent:2,gradeResponseExponent:.85,maxCutoffMultiplier:2.5};
const temp=mkdtempSync(join(tmpdir(),'dsrl-stage8-11-'));
try{
  writeFileSync(join(temp,'blockBenchInventory.mjs'),`export function benchFloorForElevation(e,d,h){return Number((d+Math.floor((e-d)/h)*h).toFixed(9))}\n`,'utf8');
  transpile('src/engine/blockBenchRouteRecovery.ts',join(temp,'blockBenchRouteRecovery.mjs'),[["'./blockBenchInventory'","'./blockBenchInventory.mjs'"]]);
  transpile('src/engine/integratedRouteEconomics.ts',join(temp,'integratedRouteEconomics.mjs'),[["'./blockBenchRouteRecovery'","'./blockBenchRouteRecovery.mjs'"]]);
  transpile('src/engine/preliminaryHaulageLogistics.ts',join(temp,'preliminaryHaulageLogistics.mjs'),[["'./integratedRouteEconomics'","'./integratedRouteEconomics.mjs'"]]);
  const recovery=await import(pathToFileURL(join(temp,'blockBenchRouteRecovery.mjs')).href);
  const engine=await import(pathToFileURL(join(temp,'preliminaryHaulageLogistics.mjs')).href);

  const defaults=engine.createPreliminaryHaulageInputs(economic);
  check(engine.validatePreliminaryHaulageInputs(defaults).length===0,'entradas logísticas por defecto válidas');
  check(defaults.routes['mill-direct'].sourceDestination==='Mill','Mill preserva destino observado');
  check(defaults.routes.dump.sourceDestination==='_DUMP_','Dump preserva destino observado');

  const rows=[
    ['m1',125,300000,.55,'Mill'],['l1',115,200000,.3,'Leach'],['d1',105,100000,.1,'_DUMP_'],['u1',95,100000,.2,'Mystery']
  ].map((x,i)=>({blockKey:x[0],XC:i,YC:0,ZC:x[1],XINC:1,YINC:1,ZINC:1,DENSITY:1,AU:0,CU:x[3],NPVMASS:x[2],NPVVOL:x[2],NPVPDEST:x[4],PSB_PIT:1}));
  const synthetic={sourceName:'synthetic.csv',sourcePath:'synthetic.csv',loadedAtIso:new Date().toISOString(),headers:[],rows,report:{status:'pass'}};
  const inputs=engine.createPreliminaryHaulageInputs(economic);
  inputs.economics.routeRecovery=recovery.createRouteRecoveryInputs(economic,{periodCount:6,mineCapacityMtPerPeriod:.7,routes:{mill:{capacityMtPerPeriod:.1,stockpileCapacityMt:1,reclaimCapacityMtPerPeriod:.1,recovery:.9},leach:{capacityMtPerPeriod:.1,stockpileCapacityMt:1,reclaimCapacityMtPerPeriod:.1,recovery:.6}}});
  const report=engine.buildPreliminaryHaulageLogistics(synthetic,1,'cumulative',10,economic,'cu-percent','full-cost',inputs);
  check(report.routeTotals['mill-direct'].demandMassMt>0,'ruta Mill directa validada');
  check(report.routeTotals['leach-direct'].demandMassMt>0,'ruta Leach directa validada');
  check(close(report.routeTotals.dump.demandMassMt,.1),'ruta Dump validada');
  check(report.routeTotals['mill-stockpile'].demandMassMt>0&&report.routeTotals['leach-stockpile'].demandMassMt>0,'stockpiles Mill y Leach validados');
  check(report.routeTotals['mill-reclaim'].demandMassMt>0&&report.routeTotals['leach-reclaim'].demandMassMt>0,'reclaim Mill y Leach validado');
  check(report.economicReport.routeRecoveryReport.unknownDestinationMassMt>0,'destino desconocido reportado');
  check(Object.values(report.reconciliation).every(Boolean),'reconciliaciones sintéticas en PASS');
  check(close(report.totalMarginAfterHaulageUsdM,report.totalMarginBeforeHaulageUsdM-report.totalLogisticsCostUsdM),'margen antes/después cierra');
  check(report.sensitivity.length>=6,'sensibilidad logística generada');

  const zeroDistance=engine.createPreliminaryHaulageInputs(economic,{economics:inputs.economics,routes:{'mill-direct':{loadedDistanceKm:0,emptyDistanceKm:0}}});
  const zeroDistanceReport=engine.buildPreliminaryHaulageLogistics(synthetic,1,'cumulative',10,economic,'cu-percent','full-cost',zeroDistance);
  check(zeroDistanceReport.routeTotals['mill-direct'].requiredTruckHours>=0,'distancia 0 válida');
  const invalidSpeed=engine.createPreliminaryHaulageInputs(economic,{routes:{'mill-direct':{loadedSpeedKph:0}}});
  check(engine.validatePreliminaryHaulageInputs(invalidSpeed).length>0,'velocidad inválida rechazada');
  const invalidPayload=engine.createPreliminaryHaulageInputs(economic,{routes:{'mill-direct':{payloadTonnes:0}}});
  check(engine.validatePreliminaryHaulageInputs(invalidPayload).length>0,'payload inválido rechazado');

  const availabilityZero=engine.createPreliminaryHaulageInputs(economic,{economics:inputs.economics,routes:{'mill-direct':{availability:0}}});
  const availabilityZeroReport=engine.buildPreliminaryHaulageLogistics(synthetic,1,'cumulative',10,economic,'cu-percent','full-cost',availabilityZero);
  check(availabilityZeroReport.routeTotals['mill-direct'].capacityDeficitMt>0,'disponibilidad 0% reporta déficit');
  const availabilityFull=engine.createPreliminaryHaulageInputs(economic,{economics:inputs.economics,routes:{'mill-direct':{availability:1,utilization:1,truckCount:200}}});
  const availabilityFullReport=engine.buildPreliminaryHaulageLogistics(synthetic,1,'cumulative',10,economic,'cu-percent','full-cost',availabilityFull);
  check(availabilityFullReport.routeTotals['mill-direct'].capacitySlackMt>0,'disponibilidad/utilización 100% genera holgura');

  const zeroFuel=engine.createPreliminaryHaulageInputs(economic,{economics:inputs.economics,routes:Object.fromEntries(['mill-direct','leach-direct','dump','mill-stockpile','leach-stockpile','mill-reclaim','leach-reclaim'].map(id=>[id,{fuelBurnLitersPerTruckHour:0,fuelPriceUsdPerLiter:0,maintenanceCostUsdPerTruckHour:0,tireCostUsdPerTruckHour:0,otherCostUsdPerTruckHour:0}]))});
  const zeroFuelReport=engine.buildPreliminaryHaulageLogistics(synthetic,1,'cumulative',10,economic,'cu-percent','full-cost',zeroFuel);
  check(close(zeroFuelReport.totalLogisticsCostUsdM,0),'combustible y costo horario 0 válidos');

  let locked=false;try{engine.buildPreliminaryHaulageLogistics(synthetic,1,'cumulative',10,economic,'unconfirmed','full-cost',inputs)}catch{locked=true}
  check(locked,'bloquea cálculo sin confirmar CU = %');

  const manifest=JSON.parse(readFileSync('public/data/block-model/block-model-manifest.json','utf8'));
  const primaryPath=manifest.primaryModel.expectedPathCandidates.find(candidate=>existsSync(candidate));
  check(Boolean(primaryPath),'simmodPL.csv disponible');
  if(primaryPath){
    const dataset=loadDataset(primaryPath);
    const f6=dataset.rows.filter(row=>row.PSB_PIT>=1&&row.PSB_PIT<=6);
    check(f6.length===34845,'F6 conserva 34,845 bloques');
    check(close(f6.reduce((s,row)=>s+row.NPVMASS/1e6,0),54.89266375078649),'F6 conserva 54.892664 Mt');
    const realInputs=engine.createPreliminaryHaulageInputs(economic);
    let combinations=0;let allClose=true;
    for(const phase of [1,2,3,4,5,6])for(const scope of ['incremental','cumulative'])for(const height of [5,10,15,20]){
      const current=engine.buildPreliminaryHaulageLogistics(dataset,phase,scope,height,economic,'cu-percent','full-cost',realInputs);
      combinations+=1;allClose&&=current.periods.length>0;allClose&&=Object.values(current.reconciliation).every(Boolean);allClose&&=Number.isFinite(current.totalLogisticsCostUsdM);allClose&&=Number.isFinite(current.totalMarginAfterHaulageUsdM);
    }
    check(combinations===48,'evalúa 48 combinaciones reales');
    check(allClose,'48 combinaciones cierran logística preliminar');
  }
  console.log('\nPRELIMINARY HAULAGE LOGISTICS VALIDATION');
  console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',passedChecks:passed,failedChecks:failures.length,failures},null,2));
  if(failures.length)process.exitCode=1;
}finally{rmSync(temp,{recursive:true,force:true})}
