import { useCallback, useEffect, useMemo, useState } from 'react';
import { Flame, RefreshCw, ShieldCheck, X } from 'lucide-react';
import {
  SUPPORTED_BENCH_HEIGHTS,
  type BenchHeightM,
} from '../engine/blockBenchInventory';
import {
  buildBlockBenchEconomicValue,
  type BenchEconomicValueEntry,
  type BenchValueBand,
} from '../engine/blockBenchEconomicValue';
import type { InventoryScope } from '../engine/blockInventory';
import {
  type BlockCostBasis,
  type GradeConfirmation,
} from '../engine/blockEconomicClassification';
import { SUPPORTED_PHASES, type SupportedPhase } from '../engine/blockModelContract';
import {
  createEconomicInputs,
  validateEconomicInputs,
  type EconomicInputs,
} from '../engine/economicModel';
import type { BlockModelDataset } from '../utils/blockModelParser';
import {
  getBlockModelCatalogCacheState,
  loadBlockModelCatalog,
  type BlockModelCatalogCacheState,
} from '../utils/blockModelCatalogLoader';
import './BlockBenchEconomicValuePanel.css';

const ECONOMIC_STORAGE_KEY = 'dsrl-global-simulator:economic-scenario:v1';

function integer(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function decimal(value: number | null, digits = 3): string {
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

function usdPerTonne(value: number | null): string {
  return value === null ? 'N/D' : `$${decimal(value, 2)}/t`;
}

function nativeValue(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 3,
  }).format(value);
}

function bandLabel(band: BenchValueBand): string {
  if (band === 'high') return 'ALTO VALOR';
  if (band === 'marginal') return 'MARGINAL';
  if (band === 'negative') return 'NEGATIVO';
  return 'BLOQUEADO';
}

function loadSavedEconomicInputs(): EconomicInputs {
  if (typeof window === 'undefined') return createEconomicInputs();
  try {
    const stored = window.localStorage.getItem(ECONOMIC_STORAGE_KEY);
    if (!stored) return createEconomicInputs();
    const candidate = createEconomicInputs(
      JSON.parse(stored) as Partial<EconomicInputs>,
    );
    return validateEconomicInputs(candidate).valid
      ? candidate
      : createEconomicInputs();
  } catch {
    return createEconomicInputs();
  }
}

function reconciliationEntries(
  report: ReturnType<typeof buildBlockBenchEconomicValue>,
) {
  return [
    ['Filas asignadas', report.reconciliation.allRowsAssigned],
    ['Acumulado vertical', report.reconciliation.cumulativeFromTopCloses],
    ['Bloques vs 8.4', report.reconciliation.physicalBlockCountCloses],
    ['Volumen vs 8.4', report.reconciliation.physicalVolumeCloses],
    ['Masa vs 8.4', report.reconciliation.physicalMassCloses],
    ['Proceso vs 8.4', report.reconciliation.physicalProcessMassCloses],
    ['Desmonte vs 8.4', report.reconciliation.physicalWasteMassCloses],
    ['Beneficio fuente vs 8.5', report.reconciliation.sourceProfitClosesAgainstStage85],
    ['Masa fuente vs 8.5', report.reconciliation.sourceMassClosesAgainstStage85],
    ['Proceso DSRL vs 8.5', report.reconciliation.dsrlProcessMassClosesAgainstStage85],
    ['Desmonte DSRL vs 8.5', report.reconciliation.dsrlWasteMassClosesAgainstStage85],
    ['Margen DSRL vs 8.5', report.reconciliation.dsrlMarginClosesAgainstStage85],
    ['Beneficio por fila', report.reconciliation.sourceProfitRowsReconcile],
    ['Valor seleccionado', report.reconciliation.dsrlSelectedValueCloses],
    ['Intervalos sin solape', report.reconciliation.intervalsDoNotOverlap],
  ] as const;
}

export default function BlockBenchEconomicValuePanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<BlockModelDataset | null>(null);
  const [economicInputs, setEconomicInputs] = useState<EconomicInputs>(
    loadSavedEconomicInputs,
  );
  const [selectedPhase, setSelectedPhase] = useState<SupportedPhase>(6);
  const [scope, setScope] = useState<InventoryScope>('cumulative');
  const [benchHeightM, setBenchHeightM] = useState<BenchHeightM>(10);
  const [costBasis, setCostBasis] = useState<BlockCostBasis>('full-cost');
  const [gradeConfirmation, setGradeConfirmation] =
    useState<GradeConfirmation>('unconfirmed');
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null);
  const [cacheState, setCacheState] = useState<BlockModelCatalogCacheState>(
    getBlockModelCatalogCacheState,
  );

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
      setDataset(catalog.primary);
      setEconomicInputs(loadSavedEconomicInputs());
      setCacheState(getBlockModelCatalogCacheState());
    } catch (reason: unknown) {
      setDataset(null);
      setCacheState(getBlockModelCatalogCacheState());
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo construir el valor económico por banco.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !dataset && !loading && !error) void load(false);
  }, [open, dataset, loading, error, load]);

  const report = useMemo(
    () =>
      dataset
        ? buildBlockBenchEconomicValue(
            dataset,
            selectedPhase,
            scope,
            benchHeightM,
            economicInputs,
            gradeConfirmation,
            costBasis,
          )
        : null,
    [
      dataset,
      selectedPhase,
      scope,
      benchHeightM,
      economicInputs,
      gradeConfirmation,
      costBasis,
    ],
  );

  useEffect(() => {
    if (!report) return;
    if (!report.benches.some((bench) => bench.benchId === selectedBenchId)) {
      setSelectedBenchId(report.benches[0]?.benchId ?? null);
    }
  }, [report, selectedBenchId]);

  const selectedBench: BenchEconomicValueEntry | null =
    report?.benches.find((bench) => bench.benchId === selectedBenchId) ??
    report?.benches[0] ??
    null;

  const topBenches = useMemo(
    () =>
      report
        ? report.topValueBenchIds
            .map((id) => report.benches.find((bench) => bench.benchId === id))
            .filter((bench): bench is BenchEconomicValueEntry => Boolean(bench))
        : [],
    [report],
  );

  const riskBenches = useMemo(
    () =>
      report
        ? report.dsrlRiskBenchIds
            .map((id) => report.benches.find((bench) => bench.benchId === id))
            .filter((bench): bench is BenchEconomicValueEntry => Boolean(bench))
        : [],
    [report],
  );

  if (!open) {
    return (
      <button
        type="button"
        className="bench-value-toggle"
        onClick={() => setOpen(true)}
      >
        <Flame size={13} /> VALOR POR BANCO
      </button>
    );
  }

  return (
    <aside className="bench-value-panel" aria-label="Valor económico por banco">
      <header>
        <div>
          <strong>ETAPA 8.6 · VALOR ECONÓMICO REAL POR BANCO</strong>
          <small>Inventario 8.4 + economía 8.5 · screening vertical, no secuenciamiento</small>
        </div>
        <div className="bench-value-actions">
          <button type="button" onClick={() => void load(true)} disabled={loading} title="Recargar datos">
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </button>
          <button type="button" onClick={() => setOpen(false)} title="Cerrar">
            <X size={15} />
          </button>
        </div>
      </header>

      {loading && <div className="bench-value-loading">Construyendo screening económico vertical…</div>}
      {error && (
        <div className="bench-value-error">
          <strong>NO SE PUDO CONSTRUIR EL VALOR POR BANCO</strong>
          <span>{error}</span>
          <button type="button" onClick={() => void load(true)}>Reintentar</button>
        </div>
      )}

      {report && selectedBench && (
        <>
          <section className="bench-value-summary">
            <div><span>Fase / lectura</span><b>F{report.phase} · {report.scope === 'cumulative' ? 'ACUM.' : 'INCR.'}</b><small>{report.selectedBlockCount.toLocaleString()} bloques</small></div>
            <div><span>Masa total</span><b>{mt(report.total.massMt)}</b><small>{report.benches.length} bancos</small></div>
            <div><span>Beneficio fuente*</span><b>{nativeValue(report.total.sourceProfitNative)}</b><small>moneda nativa</small></div>
            <div><span>Margen DSRL</span><b>{report.dsrlClassificationEnabled ? usdM(report.total.selectedMarginUsdM) : 'BLOQUEADO'}</b><small>no descontado</small></div>
            <div><span>Valor proceso</span><b>{report.dsrlClassificationEnabled ? usdPerTonne(report.total.selectedMarginUsdPerProcessTonne) : 'BLOQUEADO'}</b><small>margen / t proceso</small></div>
            <div><span>Bancos en riesgo</span><b>{report.dsrlClassificationEnabled ? report.dsrlRiskBenchIds.length : '—'}</b><small>{report.sourceNegativeBenchIds.length} fuente negativos</small></div>
            <div><span>Caché catálogo</span><b>{cacheState.status.toUpperCase()}</b><small>{cacheState.hitCount} reutilizaciones · {cacheState.loadCount} cargas</small></div>
          </section>

          <section className="bench-value-controls">
            <div>
              <span>FASE</span>
              <div>{SUPPORTED_PHASES.map((phase) => <button key={phase} type="button" className={phase === selectedPhase ? 'active' : ''} onClick={() => setSelectedPhase(phase)}>F{phase}</button>)}</div>
            </div>
            <div>
              <span>LECTURA</span>
              <div><button type="button" className={scope === 'incremental' ? 'active' : ''} onClick={() => setScope('incremental')}>INCREMENTAL</button><button type="button" className={scope === 'cumulative' ? 'active' : ''} onClick={() => setScope('cumulative')}>ACUMULADO</button></div>
            </div>
            <div>
              <span>ALTURA</span>
              <div>{SUPPORTED_BENCH_HEIGHTS.map((height) => <button key={height} type="button" className={height === benchHeightM ? 'active' : ''} onClick={() => setBenchHeightM(height)}>{height} m</button>)}</div>
            </div>
            <div>
              <span>BASE DE COSTO</span>
              <div><button type="button" className={costBasis === 'processing-only' ? 'active' : ''} onClick={() => setCostBasis('processing-only')}>SOLO PROCESO</button><button type="button" className={costBasis === 'full-cost' ? 'active' : ''} onClick={() => setCostBasis('full-cost')}>COSTO COMPLETO</button></div>
            </div>
          </section>

          {gradeConfirmation === 'unconfirmed' ? (
            <section className="bench-value-gate locked">
              <ShieldCheck size={24} />
              <div>
                <strong>VALOR DSRL BLOQUEADO</strong>
                <span>El beneficio fuente por banco está disponible. Para calcular cut-off, margen, US$/t y riesgo DSRL debe confirmarse temporalmente `CU = %`.</span>
              </div>
              <button type="button" onClick={() => setGradeConfirmation('cu-percent')}>CONFIRMAR CU = %</button>
            </section>
          ) : (
            <section className="bench-value-gate active">
              <ShieldCheck size={22} />
              <div>
                <strong>CU CONFIRMADO COMO PORCENTAJE PARA ESTA SESIÓN</strong>
                <span>Cut-off {decimal(report.cutoffGradePercent, 4)} % Cu · costo ${decimal(report.classificationCostUsdPerTonne, 2)}/t.</span>
              </div>
              <button type="button" onClick={() => setGradeConfirmation('unconfirmed')}>REVOCAR</button>
            </section>
          )}

          <section className={`bench-value-selected ${selectedBench.metrics.valueBand}`}>
            <div className="bench-value-selected-title">
              <div><span>BANCO SELECCIONADO</span><strong>{selectedBench.benchId}</strong><small>{decimal(selectedBench.floorElevationM, 0)}–{decimal(selectedBench.ceilingElevationM, 0)} m</small></div>
              <b>{bandLabel(selectedBench.metrics.valueBand)}</b>
            </div>
            <div className="bench-value-selected-grid">
              <div><span>Masa</span><b>{mt(selectedBench.metrics.massMt)}</b></div>
              <div><span>Proceso fuente</span><b>{mt(selectedBench.metrics.sourceProcessMassMt)}</b></div>
              <div><span>CU fuente*</span><b>{decimal(selectedBench.metrics.weightedCuObservedProcessNative, 5)}</b></div>
              <div><span>Beneficio fuente*</span><b>{nativeValue(selectedBench.metrics.sourceProfitNative)}</b></div>
              <div><span>Proceso DSRL</span><b>{report.dsrlClassificationEnabled ? mt(selectedBench.metrics.dsrlProcessMassMt) : 'BLOQUEADO'}</b></div>
              <div><span>Margen DSRL</span><b>{report.dsrlClassificationEnabled ? usdM(selectedBench.metrics.selectedMarginUsdM) : 'BLOQUEADO'}</b></div>
              <div><span>Valor DSRL</span><b>{report.dsrlClassificationEnabled ? usdPerTonne(selectedBench.metrics.selectedMarginUsdPerProcessTonne) : 'BLOQUEADO'}</b></div>
              <div><span>Upgrade</span><b>{report.dsrlClassificationEnabled ? mt(selectedBench.metrics.upgradeMassMt) : '—'}</b></div>
              <div><span>Downgrade</span><b>{report.dsrlClassificationEnabled ? mt(selectedBench.metrics.downgradeMassMt) : '—'}</b></div>
              <div><span>Acum. desde techo</span><b>{report.dsrlClassificationEnabled ? usdM(selectedBench.cumulativeFromTop.selectedMarginUsdM) : nativeValue(selectedBench.cumulativeFromTop.sourceProfitNative)}</b></div>
            </div>
          </section>

          <section className="bench-value-heatmap">
            <h3>MAPA VERTICAL DE VALOR · TECHO A FONDO</h3>
            <div className="bench-value-table-head"><span>Banco</span><span>Banda</span><span>Masa</span><span>Proceso fuente</span><span>CU*</span><span>Beneficio fuente*</span><span>Margen DSRL</span><span>US$/t</span><span>Upgrade</span><span>Downgrade</span><span>Acum.</span></div>
            {report.benches.map((bench) => (
              <button key={bench.benchId} type="button" className={`${bench.metrics.valueBand} ${bench.benchId === selectedBench.benchId ? 'active' : ''}`} onClick={() => setSelectedBenchId(bench.benchId)}>
                <strong>{bench.benchId}</strong>
                <em>{bandLabel(bench.metrics.valueBand)}</em>
                <span>{mt(bench.metrics.massMt)}</span>
                <span>{mt(bench.metrics.sourceProcessMassMt)}</span>
                <span>{decimal(bench.metrics.weightedCuObservedProcessNative, 4)}</span>
                <span>{nativeValue(bench.metrics.sourceProfitNative)}</span>
                <span>{report.dsrlClassificationEnabled ? usdM(bench.metrics.selectedMarginUsdM) : '—'}</span>
                <span>{report.dsrlClassificationEnabled ? usdPerTonne(bench.metrics.selectedMarginUsdPerProcessTonne) : '—'}</span>
                <span>{report.dsrlClassificationEnabled ? mt(bench.metrics.upgradeMassMt) : '—'}</span>
                <span>{report.dsrlClassificationEnabled ? mt(bench.metrics.downgradeMassMt) : '—'}</span>
                <span>{report.dsrlClassificationEnabled ? usdM(bench.cumulativeFromTop.selectedMarginUsdM) : nativeValue(bench.cumulativeFromTop.sourceProfitNative)}</span>
              </button>
            ))}
          </section>

          <div className="bench-value-rankings">
            <section>
              <h3>TOP 5 · VALOR POR BANCO</h3>
              {topBenches.map((bench, index) => (
                <button key={bench.benchId} type="button" onClick={() => setSelectedBenchId(bench.benchId)}>
                  <b>#{index + 1}</b><span>{bench.benchId}</span><strong>{report.dsrlClassificationEnabled ? usdM(bench.metrics.selectedMarginUsdM) : nativeValue(bench.metrics.sourceProfitNative)}</strong><small>{report.dsrlClassificationEnabled ? usdPerTonne(bench.metrics.selectedMarginUsdPerProcessTonne) : 'fuente*'}</small>
                </button>
              ))}
            </section>
            <section>
              <h3>BANCOS MARGINALES O NEGATIVOS</h3>
              {!report.dsrlClassificationEnabled && <p>Confirme CU = % para activar el screening DSRL.</p>}
              {report.dsrlClassificationEnabled && riskBenches.length === 0 && <p>Sin bancos marginales o negativos bajo este escenario.</p>}
              {riskBenches.map((bench) => (
                <button key={bench.benchId} type="button" className={bench.metrics.valueBand} onClick={() => setSelectedBenchId(bench.benchId)}>
                  <span>{bench.benchId}</span><b>{bandLabel(bench.metrics.valueBand)}</b><strong>{usdM(bench.metrics.potentialMarginUsdM)}</strong><small>{mt(bench.metrics.downgradeMassMt)} downgrade</small>
                </button>
              ))}
            </section>
          </div>

          <section className="bench-value-reconciliation">
            <h3>RECONCILIACIÓN 8.4 + 8.5</h3>
            {reconciliationEntries(report).map(([label, value]) => {
              const locked = value === null;
              const passed = value === true;
              return <div key={label} className={locked ? 'locked' : passed ? 'pass' : 'fail'}><span>{label}</span><b>{locked ? 'BLOQUEADO' : passed ? 'PASS' : 'FALLA'}</b></div>;
            })}
          </section>

          <section className="bench-value-note">
            <strong>SCREENING, NO SECUENCIA</strong>
            <span>* Beneficio fuente en moneda nativa no confirmada. El margen DSRL es no descontado y no incorpora CAPEX, impuestos, precedencias ni capacidad mina/planta. La banda negativa usa margen potencial si todo el banco fuera procesado; la banda marginal usa menos de US$5/t de proceso seleccionado. Resultado: screening económico real por banco dentro del diseño, no reservas ni plan minero.</span>
          </section>
        </>
      )}
    </aside>
  );
}
