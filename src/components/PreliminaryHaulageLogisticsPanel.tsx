import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck, Truck, X } from 'lucide-react';
import {
  buildPreliminaryHaulageLogistics,
  createPreliminaryHaulageInputs,
  type HaulageRouteId,
  type PreliminaryHaulageInputs,
  type PreliminaryHaulageRouteDefinition,
} from '../engine/preliminaryHaulageLogistics';
import { SUPPORTED_BENCH_HEIGHTS, type BenchHeightM } from '../engine/blockBenchInventory';
import type { InventoryScope } from '../engine/blockInventory';
import type { BlockCostBasis, GradeConfirmation } from '../engine/blockEconomicClassification';
import { SUPPORTED_PHASES, type SupportedPhase } from '../engine/blockModelContract';
import { createEconomicInputs, validateEconomicInputs, type EconomicInputs } from '../engine/economicModel';
import type { BlockModelDataset } from '../utils/blockModelParser';
import { loadBlockModelCatalog } from '../utils/blockModelCatalogLoader';
import './PreliminaryHaulageLogisticsPanel.css';

const STORAGE = 'dsrl-global-simulator:economic-scenario:v1';
const ROUTES: HaulageRouteId[] = ['mill-direct','leach-direct','dump','mill-stockpile','leach-stockpile','mill-reclaim','leach-reclaim'];
type Field = keyof Pick<PreliminaryHaulageRouteDefinition,'loadedDistanceKm'|'emptyDistanceKm'|'loadedSpeedKph'|'emptySpeedKph'|'payloadTonnes'|'truckCount'|'availability'|'utilization'|'operatingHoursPerPeriod'|'fuelBurnLitersPerTruckHour'|'fuelPriceUsdPerLiter'|'maintenanceCostUsdPerTruckHour'|'tireCostUsdPerTruckHour'>;

function loadEconomic(): EconomicInputs {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return createEconomicInputs();
    const candidate = createEconomicInputs(JSON.parse(raw) as Partial<EconomicInputs>);
    return validateEconomicInputs(candidate).valid ? candidate : createEconomicInputs();
  } catch { return createEconomicInputs(); }
}
const n = (value: number | null, digits = 2) => value === null || !Number.isFinite(value) ? 'N/D' : new Intl.NumberFormat('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
const usd = (value:number) => `$${n(value)} M`;
const mt = (value:number) => `${n(value,3)} Mt`;

export default function PreliminaryHaulageLogisticsPanel() {
  const [open,setOpen] = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [dataset,setDataset] = useState<BlockModelDataset|null>(null);
  const [economic,setEconomic] = useState<EconomicInputs>(loadEconomic);
  const [phase,setPhase] = useState<SupportedPhase>(6);
  const [scope,setScope] = useState<InventoryScope>('cumulative');
  const [height,setHeight] = useState<BenchHeightM>(10);
  const [costBasis,setCostBasis] = useState<BlockCostBasis>('full-cost');
  const [grade,setGrade] = useState<GradeConfirmation>('unconfirmed');
  const [active,setActive] = useState<HaulageRouteId>('mill-direct');
  const [inputs,setInputs] = useState<PreliminaryHaulageInputs>(()=>createPreliminaryHaulageInputs(loadEconomic()));

  const load = useCallback(async(force=false)=>{
    setLoading(true); setError(null);
    try {
      const catalog = await loadBlockModelCatalog('/data/block-model/block-model-manifest.json',force);
      if(catalog.primary.report.status==='fail') throw new Error('El modelo maestro no supera el control de calidad 8.2.');
      setDataset(catalog.primary); setEconomic(loadEconomic());
    } catch(reason:unknown) { setDataset(null); setError(reason instanceof Error?reason.message:'No se pudo calcular el acarreo.'); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{ if(open&&!dataset&&!loading&&!error) void load(false); },[open,dataset,loading,error,load]);

  const calc = useMemo(()=>{
    if(!dataset||grade!=='cu-percent') return {report:null,error:null as string|null};
    try { return {report:buildPreliminaryHaulageLogistics(dataset,phase,scope,height,economic,grade,costBasis,inputs),error:null}; }
    catch(reason:unknown){ return {report:null,error:reason instanceof Error?reason.message:'Configuración logística inválida.'}; }
  },[dataset,phase,scope,height,economic,grade,costBasis,inputs]);

  const setValue=(field:Field,value:number)=>setInputs(current=>({...current,routes:{...current.routes,[active]:{...current.routes[active],[field]:value}}}));
  const route=inputs.routes[active];
  const field=(label:string,key:Field,value:number,step:number,scale=1)=><label><span>{label}</span><input type="number" step={step} value={value*scale} onChange={e=>setValue(key,Number(e.target.value)/scale)}/></label>;

  if(!open) return <button type="button" className="haulage-logistics-toggle" onClick={()=>setOpen(true)}><Truck size={13}/> ACARREO & LOGÍSTICA</button>;
  const report=calc.report;
  const checks=report?Object.entries(report.reconciliation):[];

  return <aside className="haulage-logistics-panel">
    <header><div><strong>ETAPA 8.11 · ACARREO & LOGÍSTICA</strong><small>capacidad · ciclo · combustible · costo</small></div><div><button onClick={()=>void load(true)}><RefreshCw size={14}/></button><button onClick={()=>setOpen(false)}><X size={15}/></button></div></header>
    {loading&&<div className="haulage-message">Calculando logística preliminar…</div>}
    {(error||calc.error)&&<div className="haulage-message error">{error??calc.error}</div>}

    <section className="haulage-controls">
      <div><span>FASE</span><div>{SUPPORTED_PHASES.map(x=><button key={x} className={x===phase?'active':''} onClick={()=>setPhase(x)}>F{x}</button>)}</div></div>
      <div><span>LECTURA</span><div><button className={scope==='incremental'?'active':''} onClick={()=>setScope('incremental')}>INCREMENTAL</button><button className={scope==='cumulative'?'active':''} onClick={()=>setScope('cumulative')}>ACUMULADO</button></div></div>
      <div><span>ALTURA</span><div>{SUPPORTED_BENCH_HEIGHTS.map(x=><button key={x} className={x===height?'active':''} onClick={()=>setHeight(x)}>{x} m</button>)}</div></div>
      <div><span>BASE</span><div><button className={costBasis==='processing-only'?'active':''} onClick={()=>setCostBasis('processing-only')}>PROCESO</button><button className={costBasis==='full-cost'?'active':''} onClick={()=>setCostBasis('full-cost')}>COMPLETO</button></div></div>
    </section>

    <section className="haulage-route-tabs">{ROUTES.map(id=><button key={id} className={id===active?'active':''} onClick={()=>setActive(id)}>{inputs.routes[id].label}</button>)}</section>
    <section className="haulage-route-editor"><header><div><strong>{route.label}</strong><small>{route.sourceDestination} · SUPUESTO DSRL</small></div></header><div className="haulage-input-grid">
      {field('Dist. cargado km','loadedDistanceKm',route.loadedDistanceKm,.1)}{field('Dist. vacío km','emptyDistanceKm',route.emptyDistanceKm,.1)}{field('Vel. cargado km/h','loadedSpeedKph',route.loadedSpeedKph,1)}{field('Vel. vacío km/h','emptySpeedKph',route.emptySpeedKph,1)}{field('Payload t','payloadTonnes',route.payloadTonnes,10)}{field('Camiones','truckCount',route.truckCount,1)}{field('Disponibilidad %','availability',route.availability,1,100)}{field('Utilización %','utilization',route.utilization,1,100)}{field('Horas/periodo','operatingHoursPerPeriod',route.operatingHoursPerPeriod,100)}{field('Consumo L/h','fuelBurnLitersPerTruckHour',route.fuelBurnLitersPerTruckHour,5)}{field('Combustible US$/L','fuelPriceUsdPerLiter',route.fuelPriceUsdPerLiter,.05)}{field('Mantenimiento US$/h','maintenanceCostUsdPerTruckHour',route.maintenanceCostUsdPerTruckHour,5)}{field('Neumáticos US$/h','tireCostUsdPerTruckHour',route.tireCostUsdPerTruckHour,5)}
    </div></section>

    {grade==='unconfirmed'?<section className="haulage-gate locked"><ShieldCheck size={22}/><div><strong>CÁLCULO BLOQUEADO</strong><span>Confirma temporalmente CU = %.</span></div><button onClick={()=>setGrade('cu-percent')}>CONFIRMAR CU = %</button></section>:<section className="haulage-gate active"><ShieldCheck size={22}/><div><strong>CU CONFIRMADO</strong><span>Distancias, velocidades, flota y costos son supuestos DSRL.</span></div><button onClick={()=>setGrade('unconfirmed')}>REVOCAR</button></section>}

    {report&&<>
      <section className="haulage-summary"><div><span>Masa primaria</span><b>{mt(report.totalPrimaryHaulageMassMt)}</b></div><div><span>Rehandle</span><b>{mt(report.totalRehandleMassMt)}</b></div><div><span>Horas-camión</span><b>{n(report.totalTruckHours,0)}</b></div><div><span>Combustible</span><b>{n(report.totalFuelLiters/1e6)} ML</b></div><div><span>Costo</span><b>{usd(report.totalLogisticsCostUsdM)}</b></div><div><span>US$/t</span><b>{n(report.weightedUnitCostUsdPerTonne)}</b></div><div><span>Déficit</span><b>{mt(report.totalCapacityDeficitMt)}</b></div><div><span>Margen post</span><b>{usd(report.totalMarginAfterHaulageUsdM)}</b></div></section>
      <section className="haulage-route-cards">{ROUTES.map(id=>{const x=report.routeTotals[id];return <article key={id} className={x.capacityDeficitMt>0?'deficit':''}><header><strong>{inputs.routes[id].label}</strong><span>{x.deficitPeriods?'déficit':'OK'}</span></header><div><span>Demanda</span><b>{mt(x.demandMassMt)}</b></div><div><span>Capacidad</span><b>{mt(x.capacityMassMt)}</b></div><div><span>Costo</span><b>{usd(x.totalLogisticsCostUsdM)}</b></div><div><span>US$/t</span><b>{n(x.unitCostUsdPerTonne)}</b></div></article>})}</section>
      <section className="haulage-table"><h3>BALANCE POR PERIODO</h3><div className="head"><span>P</span><span>Primaria</span><span>Rehandle</span><span>Costo</span><span>Margen previo</span><span>Margen post</span><span>Déficit</span></div>{report.periods.map(p=><div key={p.period}><span>{p.period}</span><span>{mt(p.primaryHaulageMassMt)}</span><span>{mt(p.rehandleMassMt)}</span><span>{usd(p.totalLogisticsCostUsdM)}</span><span>{usd(p.marginBeforeHaulageUsdM)}</span><span>{usd(p.marginAfterHaulageUsdM)}</span><span>{mt(p.capacityDeficitMt)}</span></div>)}</section>
      <section className="haulage-sensitivity"><h3>SENSIBILIDAD</h3><div>{report.sensitivity.map(x=><article key={x.id}><span>{x.label}</span><b>{usd(x.totalLogisticsCostUsdM)}</b><small>Δ {usd(x.deltaCostUsdM)}</small></article>)}</div></section>
      <section className="haulage-reconciliation"><h3>RECONCILIACIONES</h3><div>{checks.map(([label,pass])=><span key={label} className={pass?'pass':'fail'}>{label}<b>{pass?'PASS':'FAIL'}</b></span>)}</div></section>
      <section className="haulage-note"><strong>MODELO PRELIMINAR</strong><span>NPVPDEST se preserva. No modela Dispatch, curvas OEM, colas, geometría vial 3D ni optimización global. El margen posterior al acarreo no es VAN.</span></section>
    </>}
  </aside>;
}
