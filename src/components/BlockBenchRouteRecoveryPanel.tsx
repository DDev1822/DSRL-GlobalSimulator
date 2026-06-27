import { useCallback, useEffect, useMemo, useState } from 'react';
import { Factory, RefreshCw, ShieldCheck, X } from 'lucide-react';
import {
  buildBlockBenchRouteRecovery,
  createRouteRecoveryInputs,
  type ProcessRouteDefinition,
  type ProcessRouteId,
  type RouteRecoveryInputs,
} from '../engine/blockBenchRouteRecovery';
import {
  SUPPORTED_BENCH_HEIGHTS,
  type BenchHeightM,
} from '../engine/blockBenchInventory';
import type { InventoryScope } from '../engine/blockInventory';
import type { BlockCostBasis, GradeConfirmation } from '../engine/blockEconomicClassification';
import { SUPPORTED_PHASES, type SupportedPhase } from '../engine/blockModelContract';
import {
  createEconomicInputs,
  validateEconomicInputs,
  type EconomicInputs,
} from '../engine/economicModel';
import type { BlockModelDataset } from '../utils/blockModelParser';
import { loadBlockModelCatalog } from '../utils/blockModelCatalogLoader';
import './BlockBenchRouteRecoveryPanel.css';

const ECONOMIC_STORAGE_KEY = 'dsrl-global-simulator:economic-scenario:v1';
const ROUTES: ProcessRouteId[] = ['mill', 'leach'];

type NumericRouteField =
  | 'capacityMtPerPeriod'
  | 'utilization'
  | 'recovery'
  | 'processingCostUsdPerTonne'
  | 'stockpileCapacityMt'
  | 'reclaimCapacityMtPerPeriod';

function decimal(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return 'N/D';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function mt(value: number): string {
  return `${decimal(value, 3)} Mt`;
}

function usdM(value: number): string {
  return `$${decimal(value, 2)} M`;
}

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

function statusLabel(status: 'complete' | 'horizon-shortfall' | 'blocked-by-route'): string {
  if (status === 'complete') return 'COMPLETO';
  if (status === 'blocked-by-route') return 'BLOQUEADO POR RUTA';
  return 'HORIZONTE CORTO';
}

function reconciliationEntries(report: ReturnType<typeof buildBlockBenchRouteRecovery>) {
  return [
    ['Masa mina', report.reconciliation.mineMassCloses],
    ['Masa por rutas', report.reconciliation.processRouteMassCloses],
    ['Stockpiles', report.reconciliation.stockpileMassCloses],
    ['Cobre contenido', report.reconciliation.copperContentCloses],
    ['Cobre recuperado', report.reconciliation.recoveredCopperWithinFeed],
    ['Valor', report.reconciliation.valueBalanceCloses],
    ['Capacidad mina', report.reconciliation.mineCapacityRespected],
    ['Capacidad rutas', report.reconciliation.routeCapacityRespected],
    ['Capacidad stockpile', report.reconciliation.stockpileCapacityRespected],
    ['Capacidad reclaim', report.reconciliation.reclaimCapacityRespected],
    ['Precedencia vertical', report.reconciliation.verticalPrecedenceRespected],
    ['Identidad de ruta', report.reconciliation.routeIdentityPreserved],
    ['Destinos desconocidos', report.reconciliation.unknownDestinationsReported],
    ['Balances no negativos', report.reconciliation.noNegativeBalances],
  ] as const;
}

export default function BlockBenchRouteRecoveryPanel() {
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
  const [inputs, setInputs] = useState<RouteRecoveryInputs>(() =>
    createRouteRecoveryInputs(loadEconomicInputs()),
  );
  const [selectedPeriod, setSelectedPeriod] = useState(1);

  const load = useCallback(async (forceReload = false) => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await loadBlockModelCatalog(
        '/data/block-model/block-model-manifest.json',
        forceReload,
      );
      if (catalog.primary.report.status === 'fail') {
        throw new Error('El modelo maestro no supera el control de calidad 8.2.');
      }
      const nextEconomic = loadEconomicInputs();
      setDataset(catalog.primary);
      setEconomic(nextEconomic);
      setInputs((current) => {
        const defaults = createRouteRecoveryInputs(nextEconomic);
        return {
          ...defaults,
          periodCount: current.periodCount,
          mineCapacityMtPerPeriod: current.mineCapacityMtPerPeriod,
          mineUtilization: current.mineUtilization,
          routes: {
            mill: { ...defaults.routes.mill, ...current.routes.mill },
            leach: { ...defaults.routes.leach, ...current.routes.leach },
          },
        };
      });
    } catch (reason: unknown) {
      setDataset(null);
      setError(reason instanceof Error ? reason.message : 'No se pudo construir recuperación por rutas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !dataset && !loading && !error) void load(false);
  }, [open, dataset, loading, error, load]);

  const calculation = useMemo(() => {
    if (!dataset || gradeConfirmation !== 'cu-percent') {
      return { report: null, error: null as string | null };
    }
    try {
      return {
        report: buildBlockBenchRouteRecovery(
          dataset,
          phase,
          scope,
          benchHeight,
          economic,
          gradeConfirmation,
          costBasis,
          inputs,
        ),
        error: null,
      };
    } catch (reason: unknown) {
      return {
        report: null,
        error: reason instanceof Error ? reason.message : 'Configuración de rutas inválida.',
      };
    }
  }, [dataset, phase, scope, benchHeight, economic, gradeConfirmation, costBasis, inputs]);

  const report = calculation.report;
  const calculationError = calculation.error;
  const period = report?.periods.find((item) => item.period === selectedPeriod) ?? report?.periods[0] ?? null;

  useEffect(() => {
    if (report && !report.periods.some((item) => item.period === selectedPeriod)) {
      setSelectedPeriod(report.periods[0]?.period ?? 1);
    }
  }, [report, selectedPeriod]);

  const setInput = (field: 'periodCount' | 'mineCapacityMtPerPeriod' | 'mineUtilization', value: number) => {
    setInputs((current) => ({ ...current, [field]: value }));
  };

  const setRouteNumber = (routeId: ProcessRouteId, field: NumericRouteField, value: number) => {
    setInputs((current) => ({
      ...current,
      routes: {
        ...current.routes,
        [routeId]: { ...current.routes[routeId], [field]: value },
      },
    }));
  };

  const setRouteFlag = (
    routeId: ProcessRouteId,
    field: 'available' | 'acceptsStockpile',
    value: boolean,
  ) => {
    setInputs((current) => ({
      ...current,
      routes: {
        ...current.routes,
        [routeId]: { ...current.routes[routeId], [field]: value },
      },
    }));
  };

  if (!open) {
    return (
      <button type="button" className="route-recovery-toggle" onClick={() => setOpen(true)}>
        <Factory size={13} /> RECUPERACIÓN & RUTAS
      </button>
    );
  }

  return (
    <aside className="route-recovery-panel" aria-label="Recuperación metalúrgica y rutas de proceso">
      <header>
        <div>
          <strong>ETAPA 8.9 · RECUPERACIÓN METALÚRGICA Y RUTAS</strong>
          <small>NPVPDEST preservado · Mill / Leach / Dump · supuestos DSRL explícitos</small>
        </div>
        <div className="route-recovery-actions">
          <button type="button" onClick={() => void load(true)} disabled={loading} title="Recargar"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => setOpen(false)} title="Cerrar"><X size={15} /></button>
        </div>
      </header>

      {loading && <div className="route-recovery-loading">Construyendo inventario y recuperación por ruta…</div>}
      {(error || calculationError) && (
        <div className="route-recovery-error">
          <strong>CONFIGURACIÓN NO VÁLIDA</strong>
          <span>{error ?? calculationError}</span>
        </div>
      )}

      <section className="route-recovery-controls">
        <div><span>FASE</span><div>{SUPPORTED_PHASES.map((item) => <button key={item} type="button" className={item === phase ? 'active' : ''} onClick={() => setPhase(item)}>F{item}</button>)}</div></div>
        <div><span>LECTURA</span><div><button type="button" className={scope === 'incremental' ? 'active' : ''} onClick={() => setScope('incremental')}>INCREMENTAL</button><button type="button" className={scope === 'cumulative' ? 'active' : ''} onClick={() => setScope('cumulative')}>ACUMULADO</button></div></div>
        <div><span>ALTURA</span><div>{SUPPORTED_BENCH_HEIGHTS.map((height) => <button key={height} type="button" className={height === benchHeight ? 'active' : ''} onClick={() => setBenchHeight(height)}>{height} m</button>)}</div></div>
        <div><span>BASE DE COSTO</span><div><button type="button" className={costBasis === 'processing-only' ? 'active' : ''} onClick={() => setCostBasis('processing-only')}>SOLO PROCESO</button><button type="button" className={costBasis === 'full-cost' ? 'active' : ''} onClick={() => setCostBasis('full-cost')}>COSTO COMPLETO</button></div></div>
      </section>

      <section className="route-recovery-global-inputs">
        <label><span>Periodos</span><input type="number" min="1" max="100" value={inputs.periodCount} onChange={(event) => setInput('periodCount', Number(event.target.value))} /></label>
        <label><span>Mina Mt/periodo</span><input type="number" min="0.01" step="1" value={inputs.mineCapacityMtPerPeriod} onChange={(event) => setInput('mineCapacityMtPerPeriod', Number(event.target.value))} /></label>
        <label><span>Utilización mina %</span><input type="number" min="1" max="100" value={inputs.mineUtilization * 100} onChange={(event) => setInput('mineUtilization', Number(event.target.value) / 100)} /></label>
      </section>

      <section className="route-recovery-route-inputs">
        {ROUTES.map((routeId) => {
          const route: ProcessRouteDefinition = inputs.routes[routeId];
          return (
            <article key={routeId} className={`route-config ${routeId}`}>
              <div className="route-config-title">
                <div><strong>{route.label}</strong><small>Origen observado: {route.sourceDestination}</small></div>
                <label><input type="checkbox" checked={route.available} onChange={(event) => setRouteFlag(routeId, 'available', event.target.checked)} /> ACTIVA</label>
              </div>
              <div className="route-config-grid">
                <label><span>Capacidad Mt/p</span><input type="number" min="0" step="0.5" value={route.capacityMtPerPeriod} onChange={(event) => setRouteNumber(routeId, 'capacityMtPerPeriod', Number(event.target.value))} /></label>
                <label><span>Utilización %</span><input type="number" min="0" max="100" value={route.utilization * 100} onChange={(event) => setRouteNumber(routeId, 'utilization', Number(event.target.value) / 100)} /></label>
                <label><span>Recuperación %</span><input type="number" min="0" max="100" step="1" value={route.recovery * 100} onChange={(event) => setRouteNumber(routeId, 'recovery', Number(event.target.value) / 100)} /></label>
                <label><span>Costo proceso US$/t</span><input type="number" min="0" step="0.1" value={route.processingCostUsdPerTonne} onChange={(event) => setRouteNumber(routeId, 'processingCostUsdPerTonne', Number(event.target.value))} /></label>
                <label><span>Stockpile Mt</span><input type="number" min="0" step="0.5" value={route.stockpileCapacityMt} onChange={(event) => setRouteNumber(routeId, 'stockpileCapacityMt', Number(event.target.value))} /></label>
                <label><span>Reclaim Mt/p</span><input type="number" min="0" step="0.5" value={route.reclaimCapacityMtPerPeriod} onChange={(event) => setRouteNumber(routeId, 'reclaimCapacityMtPerPeriod', Number(event.target.value))} /></label>
              </div>
              <label className="route-stockpile-flag"><input type="checkbox" checked={route.acceptsStockpile} onChange={(event) => setRouteFlag(routeId, 'acceptsStockpile', event.target.checked)} /> ACEPTA STOCKPILE / RECLAIM</label>
            </article>
          );
        })}
      </section>

      {gradeConfirmation === 'unconfirmed' ? (
        <section className="route-recovery-gate locked">
          <ShieldCheck size={24} />
          <div><strong>RECUPERACIÓN POR RUTAS BLOQUEADA</strong><span>Confirma temporalmente `CU = %` para calcular cobre contenido y recuperado.</span></div>
          <button type="button" onClick={() => setGradeConfirmation('cu-percent')}>CONFIRMAR CU = %</button>
        </section>
      ) : (
        <section className="route-recovery-gate active">
          <ShieldCheck size={22} />
          <div><strong>CU CONFIRMADO PARA ESTA SESIÓN</strong><span>Las recuperaciones, capacidades y costos por ruta siguen siendo supuestos DSRL.</span></div>
          <button type="button" onClick={() => setGradeConfirmation('unconfirmed')}>REVOCAR</button>
        </section>
      )}

      {report && (
        <>
          <section className="route-recovery-summary">
            <div><span>Estado</span><b>{statusLabel(report.status)}</b><small>{decimal(report.completionPercent, 1)}% minado</small></div>
            <div><span>Periodos requeridos</span><b>{report.periodsRequiredAtConfiguredCapacity}</b><small>{inputs.periodCount} configurados</small></div>
            <div><span>Feed total</span><b>{mt(report.totalFeedMassMt)}</b><small>{mt(report.processMassMt)} de proceso observado</small></div>
            <div><span>Cu contenido feed</span><b>{decimal(report.totalContainedCuKt, 2)} kt</b><small>antes de recuperación</small></div>
            <div><span>Cu recuperado</span><b>{decimal(report.totalRecoveredCuKt, 2)} kt</b><small>{decimal(report.effectiveRecovery === null ? null : report.effectiveRecovery * 100, 1)}% efectiva</small></div>
            <div><span>Margen realizado</span><b>{usdM(report.totalRealizedMarginUsdM)}</b><small>operativo por rutas</small></div>
            <div><span>Margen descontado</span><b>{usdM(report.totalDiscountedOperatingMarginUsdM)}</b><small>no es VAN</small></div>
            <div><span>Destino desconocido</span><b>{mt(report.unknownDestinationMassMt)}</b><small>{report.unknownDestinations.join(', ') || 'ninguno'}</small></div>
          </section>

          <section className="route-recovery-cards">
            {ROUTES.map((routeId) => {
              const totals = report.routeTotals[routeId];
              const route = inputs.routes[routeId];
              return (
                <article key={routeId} className={routeId}>
                  <header><strong>{route.label}</strong><span>{route.sourceDestination}</span></header>
                  <div><span>Masa fuente</span><b>{mt(totals.sourceMassMt)}</b></div>
                  <div><span>Feed</span><b>{mt(totals.feedMassMt)}</b></div>
                  <div><span>Ley feed</span><b>{decimal(totals.feedCuPercent, 4)} % Cu</b></div>
                  <div><span>Cu contenido</span><b>{decimal(totals.containedCuKt, 2)} kt</b></div>
                  <div><span>Cu recuperado</span><b>{decimal(totals.recoveredCuKt, 2)} kt</b></div>
                  <div><span>Recuperación efectiva</span><b>{decimal(totals.effectiveRecovery === null ? null : totals.effectiveRecovery * 100, 1)}%</b></div>
                  <div><span>Stockpile final</span><b>{mt(totals.finalStockpileMassMt)}</b></div>
                  <div><span>Margen realizado</span><b>{usdM(totals.realizedMarginUsdM)}</b></div>
                </article>
              );
            })}
          </section>

          <section className="route-recovery-table">
            <h3>BALANCE POR PERIODO Y RUTA</h3>
            <div className="route-recovery-head"><span>P</span><span>Banco inicial</span><span>Banco final</span><span>Minado</span><span>Mill feed</span><span>Mill Cu rec.</span><span>Leach feed</span><span>Leach Cu rec.</span><span>Rec. efectiva</span><span>Margen</span><span>Cuello</span></div>
            {report.periods.map((item) => (
              <button key={item.period} type="button" className={item.period === selectedPeriod ? 'active' : ''} onClick={() => setSelectedPeriod(item.period)}>
                <span>{item.period}</span><span>{item.startBenchId ?? '—'}</span><span>{item.endBenchId ?? '—'}</span><span>{mt(item.minedMassMt)}</span><span>{mt(item.routes.mill.feedMassMt)}</span><span>{decimal(item.routes.mill.recoveredCuKt, 2)} kt</span><span>{mt(item.routes.leach.feedMassMt)}</span><span>{decimal(item.routes.leach.recoveredCuKt, 2)} kt</span><span>{decimal(item.effectiveRecovery === null ? null : item.effectiveRecovery * 100, 1)}%</span><span>{usdM(item.realizedMarginUsdM)}</span><span>{item.bottleneck.toUpperCase()}</span>
              </button>
            ))}
          </section>

          {period && (
            <section className="route-recovery-detail">
              <h3>DETALLE DEL PERIODO {period.period}</h3>
              <div><span>Masa minada</span><b>{mt(period.minedMassMt)}</b></div>
              <div><span>Proceso observado</span><b>{mt(period.processMassMt)}</b></div>
              <div><span>No proceso</span><b>{mt(period.nonProcessMassMt)}</b></div>
              <div><span>Destino desconocido</span><b>{mt(period.unknownDestinationMassMt)}</b></div>
              <div><span>Cobre contenido</span><b>{decimal(period.totalContainedCuKt, 2)} kt</b></div>
              <div><span>Cobre recuperado</span><b>{decimal(period.totalRecoveredCuKt, 2)} kt</b></div>
              <div><span>Margen realizado</span><b>{usdM(period.realizedMarginUsdM)}</b></div>
              <div><span>Margen descontado</span><b>{usdM(period.discountedOperatingMarginUsdM)}</b></div>
            </section>
          )}

          <section className="route-recovery-reconciliation">
            <h3>RECONCILIACIÓN DE MASA, COBRE, RECUPERACIÓN Y VALOR</h3>
            <div>{reconciliationEntries(report).map(([label, value]) => <span key={label} className={value ? 'pass' : 'fail'}>{label}<b>{value ? 'PASS' : 'FAIL'}</b></span>)}</div>
          </section>

          <section className="route-recovery-note">
            <strong>SIMULACIÓN PRELIMINAR</strong>
            <span>NPVPDEST se preserva. Las recuperaciones, capacidades y costos son supuestos DSRL. No modela mineralogía, cinética de lixiviación, equipos, acarreo ni optimización global. El margen descontado no es VAN; no es plan minero ni reservas.</span>
          </section>
        </>
      )}
    </aside>
  );
}
