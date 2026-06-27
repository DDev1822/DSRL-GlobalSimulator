import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarRange, RefreshCw, ShieldCheck, X } from 'lucide-react';
import {
  SUPPORTED_BENCH_HEIGHTS,
  type BenchHeightM,
} from '../engine/blockBenchInventory';
import {
  buildBlockBenchPreliminarySequence,
  createPreliminarySequenceInputs,
  type PreliminarySequenceInputs,
  type PreliminarySequencePeriod,
} from '../engine/blockBenchPreliminarySequence';
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
import './BlockBenchPreliminarySequencePanel.css';

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

function usdM(value: number | null): string {
  return value === null ? 'BLOQUEADO' : `$${decimal(value, 2)} M`;
}

function nativeValue(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 3,
  }).format(value);
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

function bottleneckLabel(value: PreliminarySequencePeriod['bottleneck']): string {
  if (value === 'mine') return 'MINA';
  if (value === 'plant') return 'PLANTA';
  if (value === 'dual') return 'DOBLE';
  if (value === 'inventory-exhausted') return 'INVENTARIO';
  return 'NINGUNO';
}

export default function BlockBenchPreliminarySequencePanel() {
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
  const [sequenceInputs, setSequenceInputs] = useState<PreliminarySequenceInputs>(() =>
    createPreliminarySequenceInputs(loadEconomicInputs()),
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
      setSequenceInputs((current) => ({
        ...createPreliminarySequenceInputs(nextEconomic),
        periodCount: current.periodCount,
        mineUtilization: current.mineUtilization,
        plantUtilization: current.plantUtilization,
      }));
    } catch (reason: unknown) {
      setDataset(null);
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo construir la secuencia preliminar.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !dataset && !loading && !error) void load(false);
  }, [open, dataset, loading, error, load]);

  const report = useMemo(() => {
    if (!dataset) return null;
    try {
      setError(null);
      return buildBlockBenchPreliminarySequence(
        dataset,
        phase,
        scope,
        benchHeight,
        economic,
        gradeConfirmation,
        costBasis,
        sequenceInputs,
      );
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Configuración inválida.');
      return null;
    }
  }, [dataset, phase, scope, benchHeight, economic, gradeConfirmation, costBasis, sequenceInputs]);

  useEffect(() => {
    if (!report?.periods.some((period) => period.period === selectedPeriod)) {
      setSelectedPeriod(report?.periods[0]?.period ?? 1);
    }
  }, [report, selectedPeriod]);

  const period = report?.periods.find((item) => item.period === selectedPeriod) ?? null;

  const setNumeric = (
    key: keyof PreliminarySequenceInputs,
    value: number,
  ) => setSequenceInputs((current) => ({ ...current, [key]: value }));

  if (!open) {
    return (
      <button type="button" className="sequence-toggle" onClick={() => setOpen(true)}>
        <CalendarRange size={13} /> SECUENCIA PRELIMINAR
      </button>
    );
  }

  return (
    <aside className="sequence-panel" aria-label="Secuencia preliminar por capacidad">
      <header>
        <div>
          <strong>ETAPA 8.7 · SECUENCIA PRELIMINAR Y CAPACIDAD</strong>
          <small>Precedencia vertical · mina/planta · sin stockpile · no plan ejecutable</small>
        </div>
        <div className="sequence-actions">
          <button type="button" onClick={() => void load(true)} disabled={loading} title="Recargar"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => setOpen(false)} title="Cerrar"><X size={15} /></button>
        </div>
      </header>

      {loading && <div className="sequence-loading">Asignando bancos a periodos…</div>}
      {error && <div className="sequence-error"><strong>CONFIGURACIÓN NO VÁLIDA</strong><span>{error}</span></div>}

      {report && (
        <>
          <section className="sequence-summary">
            <div><span>Estado</span><b>{report.status === 'complete' ? 'COMPLETO' : 'HORIZONTE CORTO'}</b><small>{decimal(report.completionPercent, 1)}% asignado</small></div>
            <div><span>Periodos requeridos</span><b>{report.periodsRequiredAtConfiguredCapacity}</b><small>{sequenceInputs.periodCount} configurados</small></div>
            <div><span>Masa programada</span><b>{mt(report.scheduledMassMt)}</b><small>{mt(report.remainingMassMt)} pendiente</small></div>
            <div><span>Proceso programado</span><b>{mt(report.scheduledProcessMassMt)}</b><small>{mt(report.remainingProcessMassMt)} pendiente</small></div>
            <div><span>Margen DSRL</span><b>{usdM(report.scheduledDsrlMarginUsdM)}</b><small>{usdM(report.remainingDsrlMarginUsdM)} pendiente</small></div>
            <div><span>Margen descontado</span><b>{usdM(report.totalDiscountedOperatingMarginUsdM)}</b><small>no es VAN</small></div>
          </section>

          <section className="sequence-controls">
            <div><span>FASE</span><div>{SUPPORTED_PHASES.map((item) => <button key={item} type="button" className={item === phase ? 'active' : ''} onClick={() => setPhase(item)}>F{item}</button>)}</div></div>
            <div><span>LECTURA</span><div><button type="button" className={scope === 'incremental' ? 'active' : ''} onClick={() => setScope('incremental')}>INCREMENTAL</button><button type="button" className={scope === 'cumulative' ? 'active' : ''} onClick={() => setScope('cumulative')}>ACUMULADO</button></div></div>
            <div><span>ALTURA</span><div>{SUPPORTED_BENCH_HEIGHTS.map((height) => <button key={height} type="button" className={height === benchHeight ? 'active' : ''} onClick={() => setBenchHeight(height)}>{height} m</button>)}</div></div>
            <div><span>BASE DE COSTO</span><div><button type="button" className={costBasis === 'processing-only' ? 'active' : ''} onClick={() => setCostBasis('processing-only')}>SOLO PROCESO</button><button type="button" className={costBasis === 'full-cost' ? 'active' : ''} onClick={() => setCostBasis('full-cost')}>COSTO COMPLETO</button></div></div>
          </section>

          <section className="sequence-capacity">
            <label><span>Periodos</span><input type="number" min="1" max="100" step="1" value={sequenceInputs.periodCount} onChange={(event) => setNumeric('periodCount', Number(event.target.value))} /></label>
            <label><span>Capacidad mina Mt/periodo</span><input type="number" min="0.01" step="1" value={sequenceInputs.mineCapacityMtPerPeriod} onChange={(event) => setNumeric('mineCapacityMtPerPeriod', Number(event.target.value))} /></label>
            <label><span>Capacidad planta Mt/periodo</span><input type="number" min="0.01" step="1" value={sequenceInputs.plantCapacityMtPerPeriod} onChange={(event) => setNumeric('plantCapacityMtPerPeriod', Number(event.target.value))} /></label>
            <label><span>Utilización mina %</span><input type="number" min="1" max="100" step="1" value={sequenceInputs.mineUtilization * 100} onChange={(event) => setNumeric('mineUtilization', Number(event.target.value) / 100)} /></label>
            <label><span>Utilización planta %</span><input type="number" min="1" max="100" step="1" value={sequenceInputs.plantUtilization * 100} onChange={(event) => setNumeric('plantUtilization', Number(event.target.value) / 100)} /></label>
          </section>

          {gradeConfirmation === 'unconfirmed' ? (
            <section className="sequence-gate locked"><ShieldCheck size={24} /><div><strong>SECUENCIA ECONÓMICA DSRL BLOQUEADA</strong><span>La asignación usa destinos fuente. Confirme `CU = %` para activar proceso DSRL y margen por periodo.</span></div><button type="button" onClick={() => setGradeConfirmation('cu-percent')}>CONFIRMAR CU = %</button></section>
          ) : (
            <section className="sequence-gate active"><ShieldCheck size={22} /><div><strong>CU CONFIRMADO PARA ESTA SESIÓN</strong><span>La capacidad planta usa proceso DSRL y el valor se descuenta con WACC {decimal(economic.wacc * 100, 1)}%.</span></div><button type="button" onClick={() => setGradeConfirmation('unconfirmed')}>REVOCAR</button></section>
          )}

          <section className="sequence-table">
            <h3>ASIGNACIÓN POR PERIODO · TECHO A FONDO</h3>
            <div className="sequence-head"><span>Periodo</span><span>Banco inicial</span><span>Banco final</span><span>Movimiento</span><span>Proceso</span><span>No proceso</span><span>Util. mina</span><span>Util. planta</span><span>Cuello</span><span>Margen</span><span>Margen desc.</span></div>
            {report.periods.map((item) => (
              <button key={item.period} type="button" className={item.period === selectedPeriod ? 'active' : ''} onClick={() => setSelectedPeriod(item.period)}>
                <strong>P{item.period}</strong><span>{item.startBenchId ?? '—'}</span><span>{item.endBenchId ?? '—'}</span><span>{mt(item.minedMassMt)}</span><span>{mt(item.processMassMt)}</span><span>{mt(item.nonProcessMassMt)}</span><span>{decimal(item.mineUtilizationPercent, 1)}%</span><span>{decimal(item.plantUtilizationPercent, 1)}%</span><em>{bottleneckLabel(item.bottleneck)}</em><span>{usdM(item.dsrlMarginUsdM)}</span><span>{usdM(item.discountedOperatingMarginUsdM)}</span>
              </button>
            ))}
          </section>

          {period && (
            <section className="sequence-detail">
              <div className="sequence-detail-title"><div><span>PERIODO SELECCIONADO</span><strong>P{period.period}</strong></div><b>{bottleneckLabel(period.bottleneck)}</b></div>
              <div className="sequence-detail-grid">
                <div><span>Movimiento</span><b>{mt(period.minedMassMt)}</b></div><div><span>Proceso</span><b>{mt(period.processMassMt)}</b></div><div><span>No proceso</span><b>{mt(period.nonProcessMassMt)}</b></div><div><span>Margen fuente*</span><b>{nativeValue(period.sourceProfitNative)}</b></div><div><span>Margen DSRL</span><b>{usdM(period.dsrlMarginUsdM)}</b></div><div><span>Margen descontado</span><b>{usdM(period.discountedOperatingMarginUsdM)}</b></div>
              </div>
              <h3>TRAMOS DE BANCO</h3>
              {period.segments.map((segment, index) => <div className="sequence-segment" key={`${segment.benchId}-${index}`}><strong>{segment.benchId}</strong><span>{decimal(segment.fractionOfBench * 100, 1)}% banco</span><span>{mt(segment.minedMassMt)}</span><span>{mt(segment.processMassMt)} proceso</span><span>{usdM(segment.dsrlMarginUsdM)}</span></div>)}
            </section>
          )}

          <section className="sequence-reconciliation">
            <h3>RECONCILIACIÓN DE CAPACIDAD</h3>
            {Object.entries(report.reconciliation).map(([label, passed]) => <div key={label} className={passed === null ? 'locked' : passed ? 'pass' : 'fail'}><span>{label}</span><b>{passed === null ? 'BLOQUEADO' : passed ? 'PASS' : 'FALLA'}</b></div>)}
          </section>

          <section className="sequence-note"><strong>ASIGNACIÓN PRELIMINAR</strong><span>Precedencia vertical estricta. Los bancos pueden dividirse proporcionalmente. No existe stockpile, blending, equipos, rutas ni restricciones geotécnicas. El margen operativo descontado no es VAN. Resultado: asignación preliminar de capacidad por banco dentro del diseño, no plan minero ejecutable ni reservas.</span></section>
        </>
      )}
    </aside>
  );
}
