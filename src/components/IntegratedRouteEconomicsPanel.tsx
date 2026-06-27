import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, RefreshCw, ShieldCheck, X } from 'lucide-react';
import {
  buildIntegratedRouteEconomics,
  createIntegratedRouteEconomicInputs,
  type IntegratedRouteEconomicInputs,
  type RouteEconomicDefinition,
} from '../engine/integratedRouteEconomics';
import { SUPPORTED_BENCH_HEIGHTS, type BenchHeightM } from '../engine/blockBenchInventory';
import type { InventoryScope } from '../engine/blockInventory';
import type { BlockCostBasis, GradeConfirmation } from '../engine/blockEconomicClassification';
import { SUPPORTED_PHASES, type SupportedPhase } from '../engine/blockModelContract';
import { createEconomicInputs, validateEconomicInputs, type EconomicInputs } from '../engine/economicModel';
import type { ProcessRouteId } from '../engine/blockBenchRouteRecovery';
import type { BlockModelDataset } from '../utils/blockModelParser';
import { loadBlockModelCatalog } from '../utils/blockModelCatalogLoader';
import './IntegratedRouteEconomicsPanel.css';

const ECONOMIC_STORAGE_KEY = 'dsrl-global-simulator:economic-scenario:v1';
const ROUTES: ProcessRouteId[] = ['mill', 'leach'];

type RouteNumberField = keyof Pick<RouteEconomicDefinition,
  | 'metalPriceUsdPerTonne'
  | 'payableFactor'
  | 'processingCostUsdPerTonneFeed'
  | 'treatmentChargeUsdPerTonneFeed'
  | 'refiningChargeUsdPerTonnePayableMetal'
  | 'sellingCostRate'
  | 'royaltyRate'>;

function loadEconomicInputs(): EconomicInputs {
  if (typeof window === 'undefined') return createEconomicInputs();
  try {
    const raw = window.localStorage.getItem(ECONOMIC_STORAGE_KEY);
    if (!raw) return createEconomicInputs();
    const candidate = createEconomicInputs(JSON.parse(raw) as Partial<EconomicInputs>);
    return validateEconomicInputs(candidate).valid ? candidate : createEconomicInputs();
  } catch {
    return createEconomicInputs();
  }
}

function number(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return 'N/D';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function usdM(value: number): string {
  return `$${number(value, 2)} M`;
}

function mt(value: number): string {
  return `${number(value, 3)} Mt`;
}

function reconciliationEntries(report: ReturnType<typeof buildIntegratedRouteEconomics>) {
  return [
    ['Masa por ruta', report.reconciliation.routeMassCloses],
    ['Cobre contenido', report.reconciliation.containedCopperCloses],
    ['Recuperado ≤ contenido', report.reconciliation.recoveredCopperWithinContained],
    ['Pagable ≤ recuperado', report.reconciliation.payableCopperWithinRecovered],
    ['Ingreso bruto', report.reconciliation.grossRevenueCloses],
    ['Costos', report.reconciliation.operatingCostCloses],
    ['Margen', report.reconciliation.operatingMarginCloses],
    ['Realizado + pendiente', report.reconciliation.realizedPlusPendingValueCloses],
    ['Descuento', report.reconciliation.discountedValueNotAboveNominal],
    ['Identidad de ruta', report.reconciliation.routeIdentityPreserved],
    ['Destinos desconocidos', report.reconciliation.unknownDestinationsReported],
    ['Balances posibles', report.reconciliation.noImpossibleNegativeBalances],
  ] as const;
}

export default function IntegratedRouteEconomicsPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<BlockModelDataset | null>(null);
  const [economic, setEconomic] = useState<EconomicInputs>(loadEconomicInputs);
  const [phase, setPhase] = useState<SupportedPhase>(6);
  const [scope, setScope] = useState<InventoryScope>('cumulative');
  const [benchHeight, setBenchHeight] = useState<BenchHeightM>(10);
  const [costBasis, setCostBasis] = useState<BlockCostBasis>('full-cost');
  const [gradeConfirmation, setGradeConfirmation] = useState<GradeConfirmation>('unconfirmed');
  const [inputs, setInputs] = useState<IntegratedRouteEconomicInputs>(() => createIntegratedRouteEconomicInputs(loadEconomicInputs()));

  const load = useCallback(async (forceReload = false) => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await loadBlockModelCatalog('/data/block-model/block-model-manifest.json', forceReload);
      if (catalog.primary.report.status === 'fail') throw new Error('El modelo maestro no supera el control de calidad 8.2.');
      const nextEconomic = loadEconomicInputs();
      setEconomic(nextEconomic);
      setDataset(catalog.primary);
      setInputs((current) => ({ ...createIntegratedRouteEconomicInputs(nextEconomic), ...current }));
    } catch (reason: unknown) {
      setDataset(null);
      setError(reason instanceof Error ? reason.message : 'No se pudo calcular economía por ruta.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !dataset && !loading && !error) void load(false);
  }, [open, dataset, loading, error, load]);

  const calculation = useMemo(() => {
    if (!dataset || gradeConfirmation !== 'cu-percent') return { report: null, error: null as string | null };
    try {
      return { report: buildIntegratedRouteEconomics(dataset, phase, scope, benchHeight, economic, gradeConfirmation, costBasis, inputs), error: null };
    } catch (reason: unknown) {
      return { report: null, error: reason instanceof Error ? reason.message : 'Configuración económica inválida.' };
    }
  }, [dataset, phase, scope, benchHeight, economic, gradeConfirmation, costBasis, inputs]);

  const setRouteValue = (routeId: ProcessRouteId, field: RouteNumberField, value: number) => {
    setInputs((current) => ({ ...current, routes: { ...current.routes, [routeId]: { ...current.routes[routeId], [field]: value } } }));
  };

  const setRecovery = (routeId: ProcessRouteId, recovery: number) => {
    setInputs((current) => ({
      ...current,
      routeRecovery: {
        ...current.routeRecovery,
        routes: { ...current.routeRecovery.routes, [routeId]: { ...current.routeRecovery.routes[routeId], recovery } },
      },
    }));
  };

  if (!open) {
    return <button type="button" className="route-economics-toggle" onClick={() => setOpen(true)}><BadgeDollarSign size={13} /> ECONOMÍA POR RUTA</button>;
  }

  const report = calculation.report;
  return (
    <aside className="route-economics-panel" aria-label="Economía integrada por ruta">
      <header>
        <div><strong>ETAPA 8.10 · ECONOMÍA POR RUTA</strong><small>Mill / Leach · valor realizado, pendiente y sensibilidad</small></div>
        <div><button type="button" onClick={() => void load(true)} title="Recargar"><RefreshCw size={14} /></button><button type="button" onClick={() => setOpen(false)} title="Cerrar"><X size={15} /></button></div>
      </header>

      {loading && <div className="route-economics-message">Calculando economía integrada…</div>}
      {(error || calculation.error) && <div className="route-economics-message error">{error ?? calculation.error}</div>}

      <section className="route-economics-controls">
        <div><span>FASE</span><div>{SUPPORTED_PHASES.map((item) => <button key={item} type="button" className={item === phase ? 'active' : ''} onClick={() => setPhase(item)}>F{item}</button>)}</div></div>
        <div><span>LECTURA</span><div><button type="button" className={scope === 'incremental' ? 'active' : ''} onClick={() => setScope('incremental')}>INCREMENTAL</button><button type="button" className={scope === 'cumulative' ? 'active' : ''} onClick={() => setScope('cumulative')}>ACUMULADO</button></div></div>
        <div><span>ALTURA</span><div>{SUPPORTED_BENCH_HEIGHTS.map((height) => <button key={height} type="button" className={height === benchHeight ? 'active' : ''} onClick={() => setBenchHeight(height)}>{height} m</button>)}</div></div>
        <div><span>BASE DE COSTO</span><div><button type="button" className={costBasis === 'processing-only' ? 'active' : ''} onClick={() => setCostBasis('processing-only')}>SOLO PROCESO</button><button type="button" className={costBasis === 'full-cost' ? 'active' : ''} onClick={() => setCostBasis('full-cost')}>COSTO COMPLETO</button></div></div>
      </section>

      <section className="route-economics-global">
        <label><span>Tasa de descuento %</span><input type="number" min="0" max="100" step="0.5" value={inputs.discountRate * 100} onChange={(event) => setInputs((current) => ({ ...current, discountRate: Number(event.target.value) / 100 }))} /></label>
        <label><span>Periodos</span><input type="number" min="1" max="100" value={inputs.routeRecovery.periodCount} onChange={(event) => setInputs((current) => ({ ...current, routeRecovery: { ...current.routeRecovery, periodCount: Number(event.target.value) } }))} /></label>
        <label><span>Mina Mt/periodo</span><input type="number" min="0.01" step="1" value={inputs.routeRecovery.mineCapacityMtPerPeriod} onChange={(event) => setInputs((current) => ({ ...current, routeRecovery: { ...current.routeRecovery, mineCapacityMtPerPeriod: Number(event.target.value) } }))} /></label>
      </section>

      <section className="route-economics-routes">
        {ROUTES.map((routeId) => {
          const route = inputs.routes[routeId];
          return (
            <article key={routeId} className={routeId}>
              <header><div><strong>{route.label}</strong><small>Destino observado: {route.sourceDestination}</small></div><b>SUPUESTO DSRL</b></header>
              <div className="route-economics-input-grid">
                <label><span>Precio US$/t</span><input type="number" min="0" step="100" value={route.metalPriceUsdPerTonne} onChange={(event) => setRouteValue(routeId, 'metalPriceUsdPerTonne', Number(event.target.value))} /></label>
                <label><span>Recuperación %</span><input type="number" min="0" max="100" step="1" value={inputs.routeRecovery.routes[routeId].recovery * 100} onChange={(event) => setRecovery(routeId, Number(event.target.value) / 100)} /></label>
                <label><span>Pagabilidad %</span><input type="number" min="0" max="100" step="1" value={route.payableFactor * 100} onChange={(event) => setRouteValue(routeId, 'payableFactor', Number(event.target.value) / 100)} /></label>
                <label><span>Proceso US$/t</span><input type="number" min="0" step="0.1" value={route.processingCostUsdPerTonneFeed} onChange={(event) => setRouteValue(routeId, 'processingCostUsdPerTonneFeed', Number(event.target.value))} /></label>
                <label><span>Tratamiento US$/t</span><input type="number" min="0" step="0.1" value={route.treatmentChargeUsdPerTonneFeed} onChange={(event) => setRouteValue(routeId, 'treatmentChargeUsdPerTonneFeed', Number(event.target.value))} /></label>
                <label><span>Refinación US$/t pagable</span><input type="number" min="0" step="1" value={route.refiningChargeUsdPerTonnePayableMetal} onChange={(event) => setRouteValue(routeId, 'refiningChargeUsdPerTonnePayableMetal', Number(event.target.value))} /></label>
                <label><span>Venta % ingreso</span><input type="number" min="0" max="100" step="0.1" value={route.sellingCostRate * 100} onChange={(event) => setRouteValue(routeId, 'sellingCostRate', Number(event.target.value) / 100)} /></label>
                <label><span>Regalía %</span><input type="number" min="0" max="100" step="0.1" value={route.royaltyRate * 100} onChange={(event) => setRouteValue(routeId, 'royaltyRate', Number(event.target.value) / 100)} /></label>
              </div>
            </article>
          );
        })}
      </section>

      {gradeConfirmation === 'unconfirmed' ? (
        <section className="route-economics-gate locked"><ShieldCheck size={22} /><div><strong>ECONOMÍA BLOQUEADA</strong><span>Confirma temporalmente que CU está expresado en porcentaje.</span></div><button type="button" onClick={() => setGradeConfirmation('cu-percent')}>CONFIRMAR CU = %</button></section>
      ) : (
        <section className="route-economics-gate active"><ShieldCheck size={22} /><div><strong>CU CONFIRMADO PARA ESTA SESIÓN</strong><span>Precio, recuperación, pagabilidad, costos y regalías siguen siendo supuestos DSRL.</span></div><button type="button" onClick={() => setGradeConfirmation('unconfirmed')}>REVOCAR</button></section>
      )}

      {report && <>
        <section className="route-economics-summary">
          <div><span>Ingreso bruto</span><b>{usdM(report.totalGrossRevenueUsdM)}</b></div>
          <div><span>Costos operativos</span><b>{usdM(report.totalOperatingCostUsdM)}</b></div>
          <div><span>Margen realizado</span><b>{usdM(report.totalOperatingMarginUsdM)}</b></div>
          <div><span>Valor pendiente</span><b>{usdM(report.totalPendingMarginUsdM)}</b></div>
          <div><span>Valor descontado</span><b>{usdM(report.totalDiscountedOperatingMarginUsdM)}</b><small>no es VAN</small></div>
          <div><span>Cu recuperado</span><b>{number(report.totalRecoveredCuKt)} kt</b></div>
          <div><span>Cu pagable</span><b>{number(report.totalPayableCuKt)} kt</b></div>
          <div><span>Periodos negativos</span><b>{report.negativeMarginPeriods}</b></div>
        </section>

        <section className="route-economics-cards">
          {ROUTES.map((routeId) => {
            const totals = report.routeTotals[routeId];
            return <article key={routeId} className={routeId}>
              <header><strong>{inputs.routes[routeId].label}</strong><span>{number(totals.economicParticipationPercent, 1)}% participación</span></header>
              <div><span>Masa fuente</span><b>{mt(totals.source.massMt)}</b></div>
              <div><span>Masa realizada</span><b>{mt(totals.realized.massMt)}</b></div>
              <div><span>Ley feed</span><b>{number(totals.realized.gradeCuPercent, 4)}% Cu</b></div>
              <div><span>Metal pagable</span><b>{number(totals.realized.payableCuKt)} kt</b></div>
              <div><span>Ingreso</span><b>{usdM(totals.realized.grossRevenueUsdM)}</b></div>
              <div><span>Costos</span><b>{usdM(totals.realized.totalOperatingCostUsdM)}</b></div>
              <div><span>Margen</span><b>{usdM(totals.realized.operatingMarginUsdM)}</b></div>
              <div><span>Margen US$/t</span><b>{number(totals.realized.operatingMarginUsdPerTonne)}</b></div>
              <div><span>Stockpile pendiente</span><b>{usdM(totals.stockpilePending.operatingMarginUsdM)}</b></div>
              <div><span>In situ pendiente</span><b>{usdM(totals.inSituPending.operatingMarginUsdM)}</b></div>
            </article>;
          })}
        </section>

        <section className="route-economics-table">
          <h3>ECONOMÍA POR PERIODO</h3>
          <div className="head"><span>P</span><span>Ingreso</span><span>Costos</span><span>Margen</span><span>Descontado</span><span>Mill margen</span><span>Leach margen</span><span>Rutas negativas</span></div>
          {report.periods.map((period) => <div key={period.period}><span>{period.period}</span><span>{usdM(period.grossRevenueUsdM)}</span><span>{usdM(period.totalOperatingCostUsdM)}</span><span>{usdM(period.operatingMarginUsdM)}</span><span>{usdM(period.discountedOperatingMarginUsdM)}</span><span>{usdM(period.routes.mill.operatingMarginUsdM)}</span><span>{usdM(period.routes.leach.operatingMarginUsdM)}</span><span>{period.negativeMarginRoutes.join(', ') || 'ninguna'}</span></div>)}
        </section>

        <section className="route-economics-sensitivity"><h3>SENSIBILIDAD ECONÓMICA</h3><div>{report.sensitivity.map((item) => <article key={item.id}><span>{item.label}</span><b>{usdM(item.operatingMarginUsdM)}</b><small>{item.deltaMarginUsdM >= 0 ? '+' : ''}{usdM(item.deltaMarginUsdM)} · {number(item.deltaMarginPercent, 1)}%</small></article>)}</div></section>

        <section className="route-economics-reconciliation"><h3>RECONCILIACIONES</h3><div>{reconciliationEntries(report).map(([label, pass]) => <span key={label} className={pass ? 'pass' : 'fail'}>{label}<b>{pass ? 'PASS' : 'FAIL'}</b></span>)}</div></section>

        <section className="route-economics-note"><strong>EVALUACIÓN PRELIMINAR</strong><span>NPVPDEST se preserva. No modela CAPEX completo, impuestos de proyecto, equipos, acarreo ni optimización global. El valor operativo descontado no es VAN, plan minero ni reservas.</span></section>
      </>}
    </aside>
  );
}
