import { useCallback, useEffect, useMemo, useState } from 'react';
import { Blend, RefreshCw, ShieldCheck, X } from 'lucide-react';
import {
  buildBlockBenchStockpileBlending,
  createStockpileBlendingInputs,
  type StockpileBlendingInputs,
  type StockpilePeriod,
} from '../engine/blockBenchStockpileBlending';
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
import './BlockBenchStockpileBlendingPanel.css';

const ECONOMIC_STORAGE_KEY = 'dsrl-global-simulator:economic-scenario:v1';

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

function bottleneckLabel(value: StockpilePeriod['bottleneck']): string {
  if (value === 'mine') return 'MINA';
  if (value === 'plant') return 'PLANTA';
  if (value === 'stockpile') return 'STOCKPILE';
  if (value === 'reclaim') return 'RECLAIM';
  if (value === 'inventory-exhausted') return 'INVENTARIO';
  return 'NINGUNO';
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

export default function BlockBenchStockpileBlendingPanel() {
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
  const [inputs, setInputs] = useState<StockpileBlendingInputs>(() =>
    createStockpileBlendingInputs(loadEconomicInputs()),
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
      setInputs((current) => ({
        ...createStockpileBlendingInputs(nextEconomic),
        periodCount: current.periodCount,
        mineUtilization: current.mineUtilization,
        plantUtilization: current.plantUtilization,
        stockpileCapacityMt: current.stockpileCapacityMt,
        reclaimCapacityMtPerPeriod: current.reclaimCapacityMtPerPeriod,
        targetCuPercent: current.targetCuPercent,
        blendToleranceCuPercent: current.blendToleranceCuPercent,
      }));
    } catch (reason: unknown) {
      setDataset(null);
      setError(reason instanceof Error ? reason.message : 'No se pudo construir stockpile y blending.');
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
        report: buildBlockBenchStockpileBlending(
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
        error: reason instanceof Error ? reason.message : 'Configuración inválida.',
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

  const setNumeric = (key: keyof StockpileBlendingInputs, value: number | null) =>
    setInputs((current) => ({ ...current, [key]: value }));

  if (!open) {
    return (
      <button type="button" className="stockpile-toggle" onClick={() => setOpen(true)}>
        <Blend size={13} /> STOCKPILE & BLENDING
      </button>
    );
  }

  return (
    <aside className="stockpile-panel" aria-label="Stockpile y blending controlado">
      <header>
        <div>
          <strong>ETAPA 8.8 · STOCKPILE Y BLENDING CONTROLADO</strong>
          <small>Balance de masa, cobre y valor · lotes trazables · no optimización global</small>
        </div>
        <div className="stockpile-actions">
          <button type="button" onClick={() => void load(true)} disabled={loading} title="Recargar"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => setOpen(false)} title="Cerrar"><X size={15} /></button>
        </div>
      </header>

      {loading && <div className="stockpile-loading">Construyendo inventario y blending por periodo…</div>}
      {(error || calculationError) && <div className="stockpile-error"><strong>CONFIGURACIÓN NO VÁLIDA</strong><span>{error ?? calculationError}</span></div>}

      <section className="stockpile-controls">
        <div><span>FASE</span><div>{SUPPORTED_PHASES.map((item) => <button key={item} type="button" className={item === phase ? 'active' : ''} onClick={() => setPhase(item)}>F{item}</button>)}</div></div>
        <div><span>LECTURA</span><div><button type="button" className={scope === 'incremental' ? 'active' : ''} onClick={() => setScope('incremental')}>INCREMENTAL</button><button type="button" className={scope === 'cumulative' ? 'active' : ''} onClick={() => setScope('cumulative')}>ACUMULADO</button></div></div>
        <div><span>ALTURA</span><div>{SUPPORTED_BENCH_HEIGHTS.map((height) => <button key={height} type="button" className={height === benchHeight ? 'active' : ''} onClick={() => setBenchHeight(height)}>{height} m</button>)}</div></div>
        <div><span>BASE DE COSTO</span><div><button type="button" className={costBasis === 'processing-only' ? 'active' : ''} onClick={() => setCostBasis('processing-only')}>SOLO PROCESO</button><button type="button" className={costBasis === 'full-cost' ? 'active' : ''} onClick={() => setCostBasis('full-cost')}>COSTO COMPLETO</button></div></div>
      </section>

      <section className="stockpile-inputs">
        <label><span>Periodos</span><input type="number" min="1" max="100" value={inputs.periodCount} onChange={(e) => setNumeric('periodCount', Number(e.target.value))} /></label>
        <label><span>Mina Mt/periodo</span><input type="number" min="0.01" step="1" value={inputs.mineCapacityMtPerPeriod} onChange={(e) => setNumeric('mineCapacityMtPerPeriod', Number(e.target.value))} /></label>
        <label><span>Planta Mt/periodo</span><input type="number" min="0.01" step="1" value={inputs.plantCapacityMtPerPeriod} onChange={(e) => setNumeric('plantCapacityMtPerPeriod', Number(e.target.value))} /></label>
        <label><span>Stockpile máximo Mt</span><input type="number" min="0.01" step="1" value={inputs.stockpileCapacityMt} onChange={(e) => setNumeric('stockpileCapacityMt', Number(e.target.value))} /></label>
        <label><span>Reclaim Mt/periodo</span><input type="number" min="0.01" step="1" value={inputs.reclaimCapacityMtPerPeriod} onChange={(e) => setNumeric('reclaimCapacityMtPerPeriod', Number(e.target.value))} /></label>
        <label><span>Utilización mina %</span><input type="number" min="1" max="100" value={inputs.mineUtilization * 100} onChange={(e) => setNumeric('mineUtilization', Number(e.target.value) / 100)} /></label>
        <label><span>Utilización planta %</span><input type="number" min="1" max="100" value={inputs.plantUtilization * 100} onChange={(e) => setNumeric('plantUtilization', Number(e.target.value) / 100)} /></label>
        <label><span>Ley objetivo % Cu</span><input type="number" min="0.0001" step="0.01" placeholder="AUTO" value={inputs.targetCuPercent ?? ''} onChange={(e) => setNumeric('targetCuPercent', e.target.value === '' ? null : Number(e.target.value))} /></label>
        <label><span>Tolerancia ± % Cu</span><input type="number" min="0" step="0.005" value={inputs.blendToleranceCuPercent} onChange={(e) => setNumeric('blendToleranceCuPercent', Number(e.target.value))} /></label>
      </section>

      {gradeConfirmation === 'unconfirmed' ? (
        <section className="stockpile-gate locked"><ShieldCheck size={24} /><div><strong>STOCKPILE Y BLENDING BLOQUEADOS</strong><span>La Etapa 8.8 requiere confirmar temporalmente `CU = %` para conservar masa y cobre contenido.</span></div><button type="button" onClick={() => setGradeConfirmation('cu-percent')}>CONFIRMAR CU = %</button></section>
      ) : (
        <section className="stockpile-gate active"><ShieldCheck size={22} /><div><strong>CU CONFIRMADO PARA ESTA SESIÓN</strong><span>Ley objetivo {report ? decimal(report.resolvedTargetCuPercent, 4) : '—'} % Cu · tolerancia ±{decimal(inputs.blendToleranceCuPercent, 4)}.</span></div><button type="button" onClick={() => setGradeConfirmation('unconfirmed')}>REVOCAR</button></section>
      )}

      {report && (
        <>
          <section className="stockpile-summary">
            <div><span>Estado</span><b>{report.status === 'complete' ? 'COMPLETO' : 'HORIZONTE CORTO'}</b><small>{decimal(report.completionPercent, 1)}% minado</small></div>
            <div><span>Periodos requeridos</span><b>{report.periodsRequiredAtConfiguredCapacity}</b><small>{inputs.periodCount} configurados</small></div>
            <div><span>Alimentación planta</span><b>{mt(report.totalPlantFeedMassMt)}</b><small>{report.periodsWithinTolerance} periodos dentro de tolerancia</small></div>
            <div><span>Stockpile final</span><b>{mt(report.finalStockpileMassMt)}</b><small>{decimal(report.finalStockpileCuPercent, 4)} % Cu</small></div>
            <div><span>Cobre en stockpile</span><b>{decimal(report.finalStockpileContainedCuKt, 2)} kt</b><small>contenido, no recuperado</small></div>
            <div><span>Margen realizado</span><b>{usdM(report.realizedMarginUsdM)}</b><small>{usdM(report.unrealizedStockpileMarginUsdM)} en stockpile</small></div>
            <div><span>Margen descontado</span><b>{usdM(report.totalDiscountedOperatingMarginUsdM)}</b><small>no es VAN</small></div>
          </section>

          <section className="stockpile-table">
            <h3>BALANCE POR PERIODO</h3>
            <div className="stockpile-head"><span>P</span><span>Banco inicial</span><span>Banco final</span><span>Minado</span><span>Proceso fresco</span><span>Directo</span><span>Reclaim</span><span>Feed planta</span><span>Ley feed</span><span>Desvío</span><span>Stockpile final</span><span>Ley stockpile</span><span>Cuello</span><span>Margen</span></div>
            {report.periods.map((item) => (
              <button key={item.period} type="button" className={`${item.period === selectedPeriod ? 'active' : ''} ${item.withinBlendTolerance === false ? 'outside' : ''}`} onClick={() => setSelectedPeriod(item.period)}>
                <strong>P{item.period}</strong><span>{item.startBenchId ?? '—'}</span><span>{item.endBenchId ?? '—'}</span><span>{mt(item.minedMassMt)}</span><span>{mt(item.freshProcessMassMt)}</span><span>{mt(item.directFeedMassMt)}</span><span>{mt(item.reclaimedMassMt)}</span><span>{mt(item.plantFeedMassMt)}</span><span>{decimal(item.plantFeedCuPercent, 4)}</span><span>{decimal(item.gradeDeviationCuPercent, 4)}</span><span>{mt(item.closingStockpileMassMt)}</span><span>{decimal(item.closingStockpileCuPercent, 4)}</span><em>{bottleneckLabel(item.bottleneck)}</em><span>{usdM(item.realizedMarginUsdM)}</span>
              </button>
            ))}
          </section>

          {period && (
            <section className="stockpile-detail">
              <div className="stockpile-detail-title"><div><span>PERIODO SELECCIONADO</span><strong>P{period.period}</strong></div><b>{period.withinBlendTolerance === null ? 'SIN FEED' : period.withinBlendTolerance ? 'DENTRO DE TOLERANCIA' : 'FUERA DE TOLERANCIA'}</b></div>
              <div className="stockpile-detail-grid">
                <div><span>Feed planta</span><b>{mt(period.plantFeedMassMt)}</b></div><div><span>Ley feed</span><b>{decimal(period.plantFeedCuPercent, 4)} %</b></div><div><span>Objetivo</span><b>{decimal(period.targetCuPercent, 4)} %</b></div><div><span>Directo</span><b>{mt(period.directFeedMassMt)}</b></div><div><span>Reclaim</span><b>{mt(period.reclaimedMassMt)}</b></div><div><span>Stockpile añadido</span><b>{mt(period.stockpileAddedMassMt)}</b></div><div><span>Stockpile cierre</span><b>{mt(period.closingStockpileMassMt)}</b></div><div><span>Ley stockpile</span><b>{decimal(period.closingStockpileCuPercent, 4)} %</b></div><div><span>Cobre stockpile</span><b>{decimal(period.closingStockpileContainedCuKt, 2)} kt</b></div><div><span>Margen realizado</span><b>{usdM(period.realizedMarginUsdM)}</b></div><div><span>Margen descontado</span><b>{usdM(period.discountedOperatingMarginUsdM)}</b></div><div><span>Cuello</span><b>{bottleneckLabel(period.bottleneck)}</b></div>
              </div>
            </section>
          )}

          <section className="stockpile-reconciliation">
            <h3>RECONCILIACIÓN DE MASA, COBRE Y VALOR</h3>
            {Object.entries(report.reconciliation).map(([label, passed]) => <div key={label} className={passed ? 'pass' : 'fail'}><span>{label}</span><b>{passed ? 'PASS' : 'FALLA'}</b></div>)}
          </section>

          <section className="stockpile-note"><strong>SIMULACIÓN PRELIMINAR</strong><span>El blending busca una ley objetivo mediante una regla greedy determinista; no es optimización global. No se modelan pérdidas, oxidación, recuperaciones variables, equipos ni rutas. El margen descontado no es VAN. Resultado: simulación preliminar de stockpile y blending dentro del diseño, no plan minero ni reservas.</span></section>
        </>
      )}
    </aside>
  );
}
