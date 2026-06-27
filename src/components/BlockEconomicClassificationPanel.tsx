import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, RefreshCw, ShieldCheck, X } from 'lucide-react';
import {
  buildBlockEconomicClassification,
  getBlockEconomicPhase,
  type BlockCostBasis,
  type GradeConfirmation,
} from '../engine/blockEconomicClassification';
import type { InventoryScope } from '../engine/blockInventory';
import { SUPPORTED_PHASES, type SupportedPhase } from '../engine/blockModelContract';
import {
  createEconomicInputs,
  validateEconomicInputs,
  type EconomicInputs,
} from '../engine/economicModel';
import type { BlockModelDataset } from '../utils/blockModelParser';
import { loadBlockModelCatalog } from '../utils/blockModelCatalogLoader';
import './BlockEconomicClassificationPanel.css';

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

function nativeValue(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 3,
  }).format(value);
}

function usdM(value: number): string {
  return `$${decimal(value, 2)} M`;
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

export default function BlockEconomicClassificationPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<BlockModelDataset | null>(null);
  const [economicInputs, setEconomicInputs] = useState<EconomicInputs>(
    loadSavedEconomicInputs,
  );
  const [selectedPhase, setSelectedPhase] = useState<SupportedPhase>(6);
  const [scope, setScope] = useState<InventoryScope>('cumulative');
  const [costBasis, setCostBasis] = useState<BlockCostBasis>('full-cost');
  const [gradeConfirmation, setGradeConfirmation] =
    useState<GradeConfirmation>('unconfirmed');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await loadBlockModelCatalog();
      if (catalog.primary.report.status === 'fail') {
        throw new Error('El modelo maestro no supera el control de calidad 8.2.');
      }
      setDataset(catalog.primary);
      setEconomicInputs(loadSavedEconomicInputs());
    } catch (reason: unknown) {
      setDataset(null);
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo construir la auditoría económica por bloque.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !dataset && !loading && !error) void load();
  }, [open, dataset, loading, error, load]);

  const report = useMemo(
    () =>
      dataset
        ? buildBlockEconomicClassification(
            dataset,
            economicInputs,
            gradeConfirmation,
            costBasis,
          )
        : null,
    [dataset, economicInputs, gradeConfirmation, costBasis],
  );

  const selected = useMemo(
    () =>
      report
        ? getBlockEconomicPhase(report, selectedPhase, scope)
        : null,
    [report, selectedPhase, scope],
  );

  if (!open) {
    return (
      <button
        type="button"
        className="block-economic-toggle"
        onClick={() => setOpen(true)}
      >
        <BadgeDollarSign size={13} /> ECONOMÍA POR BLOQUE
      </button>
    );
  }

  return (
    <aside className="block-economic-panel" aria-label="Economía por bloque">
      <header>
        <div>
          <strong>ETAPA 8.5 · CLASIFICACIÓN ECONÓMICA POR BLOQUE</strong>
          <small>Fuente observada separada de supuestos DSRL · proceso vs desmonte</small>
        </div>
        <div className="block-economic-actions">
          <button type="button" onClick={() => void load()} disabled={loading} title="Recargar">
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </button>
          <button type="button" onClick={() => setOpen(false)} title="Cerrar">
            <X size={15} />
          </button>
        </div>
      </header>

      {loading && <div className="block-economic-loading">Auditando economía fuente y destinos por bloque…</div>}
      {error && (
        <div className="block-economic-error">
          <strong>NO SE PUDO CONSTRUIR LA ECONOMÍA POR BLOQUE</strong>
          <span>{error}</span>
          <button type="button" onClick={() => void load()}>Reintentar</button>
        </div>
      )}

      {report && selected && (
        <>
          <section className="block-economic-summary">
            <div><span>Inventario activo</span><b>{integer(report.activeBlockCount)}</b><small>F1–F6</small></div>
            <div><span>Cobertura fuente</span><b>{decimal(selected.source.economicsCoveragePercent, 1)}%</b><small>campos NPV* completos</small></div>
            <div><span>Beneficio fuente*</span><b>{nativeValue(selected.source.sourceProfitNative)}</b><small>moneda nativa</small></div>
            <div><span>Proceso fuente</span><b>{mt(selected.source.processMassMt)}</b><small>Mill + Leach</small></div>
            <div><span>Desmonte fuente</span><b>{mt(selected.source.wasteMassMt)}</b><small>_DUMP_</small></div>
            <div><span>F7–F9 preservados</span><b>{integer(report.excludedFutureBlockCount)}</b><small>fuera del alcance</small></div>
          </section>

          <section className="block-economic-controls">
            <div>
              <span>FASE</span>
              <div>{SUPPORTED_PHASES.map((phase) => <button key={phase} type="button" className={phase === selectedPhase ? 'active' : ''} onClick={() => setSelectedPhase(phase)}>F{phase}</button>)}</div>
            </div>
            <div>
              <span>LECTURA</span>
              <div><button type="button" className={scope === 'incremental' ? 'active' : ''} onClick={() => setScope('incremental')}>INCREMENTAL</button><button type="button" className={scope === 'cumulative' ? 'active' : ''} onClick={() => setScope('cumulative')}>ACUMULADO</button></div>
            </div>
            <div>
              <span>BASE DE COSTO DSRL</span>
              <div><button type="button" className={costBasis === 'processing-only' ? 'active' : ''} onClick={() => setCostBasis('processing-only')}>SOLO PROCESO</button><button type="button" className={costBasis === 'full-cost' ? 'active' : ''} onClick={() => setCostBasis('full-cost')}>COSTO COMPLETO</button></div>
            </div>
          </section>

          <section className="block-source-audit">
            <div className="block-source-title">
              <div><span>AUDITORÍA ECONÓMICA FUENTE</span><strong>F{selectedPhase} · {scope === 'cumulative' ? 'ACUMULADO' : 'INCREMENTAL'}</strong></div>
              <b>{selected.reconciliation.sourceProfitCloses ? 'RECONCILIADO' : 'REVISAR'}</b>
            </div>
            <div className="block-source-grid">
              <div><span>Ingresos fuente*</span><b>{nativeValue(selected.source.sourceRevenueNative)}</b></div>
              <div><span>Costo proceso fuente*</span><b>{nativeValue(selected.source.sourceProcessCostNative)}</b></div>
              <div><span>Costo mina fuente*</span><b>{nativeValue(selected.source.sourceMiningCostNative)}</b></div>
              <div><span>Beneficio fuente*</span><b>{nativeValue(selected.source.sourceProfitNative)}</b></div>
              <div><span>Proceso con beneficio ≤ 0</span><b>{integer(selected.source.processWithNonPositiveProfitRows)}</b><small>{mt(selected.source.processWithNonPositiveProfitMassMt)}</small></div>
              <div><span>Desmonte con beneficio &gt; 0</span><b>{integer(selected.source.wasteWithPositiveProfitRows)}</b><small>{mt(selected.source.wasteWithPositiveProfitMassMt)}</small></div>
              <div><span>CU todo*</span><b>{decimal(selected.source.weightedCuAllNative, 5)}</b></div>
              <div><span>CU proceso fuente*</span><b>{decimal(selected.source.weightedCuObservedProcessNative, 5)}</b></div>
            </div>
          </section>

          {gradeConfirmation === 'unconfirmed' ? (
            <section className="block-grade-gate locked">
              <ShieldCheck size={24} />
              <div>
                <strong>RECLASIFICACIÓN DSRL BLOQUEADA</strong>
                <span>El campo CU sigue con unidad no confirmada. La auditoría fuente es válida, pero no se calcula ley de corte ni se cambia destino hasta una confirmación explícita.</span>
              </div>
              <button type="button" onClick={() => setGradeConfirmation('cu-percent')}>
                CONFIRMAR CU = %
              </button>
            </section>
          ) : (
            <section className="block-grade-gate active">
              <ShieldCheck size={22} />
              <div>
                <strong>CU CONFIRMADO COMO PORCENTAJE PARA ESTA SESIÓN</strong>
                <span>La confirmación no se guarda automáticamente y puede revocarse.</span>
              </div>
              <button type="button" onClick={() => setGradeConfirmation('unconfirmed')}>
                REVOCAR CONFIRMACIÓN
              </button>
            </section>
          )}

          {report.dsrlClassificationEnabled && (
            <>
              <section className="block-dsrl-summary">
                <div><span>Ley de corte DSRL</span><b>{decimal(report.cutoffGradePercent, 4)} % Cu</b><small>calculada</small></div>
                <div><span>Costo clasificación</span><b>${decimal(report.classificationCostUsdPerTonne, 2)}/t</b><small>{costBasis === 'full-cost' ? 'proceso + mina' : 'solo proceso'}</small></div>
                <div><span>Precio neto metal</span><b>${decimal(report.netMetalPriceUsdPerTonne, 0)}/t</b><small>recuperación, pagable y regalía</small></div>
                <div><span>Proceso DSRL</span><b>{mt(selected.dsrl.processMassMt)}</b><small>CU ≥ cut-off</small></div>
                <div><span>Desmonte DSRL</span><b>{mt(selected.dsrl.wasteMassMt)}</b><small>margen no positivo</small></div>
                <div><span>Margen seleccionado</span><b>{usdM(selected.dsrl.selectedMarginUsdM)}</b><small>no descontado</small></div>
              </section>

              <section className="block-reclassification-matrix">
                <h3>TRAZABILIDAD DE DESTINOS · FUENTE VS DSRL</h3>
                <div><span>Mantiene proceso</span><b>{integer(selected.dsrl.retainedProcessRows)}</b><small>{mt(selected.dsrl.retainedProcessMassMt)}</small></div>
                <div><span>Mantiene desmonte</span><b>{integer(selected.dsrl.retainedWasteRows)}</b><small>{mt(selected.dsrl.retainedWasteMassMt)}</small></div>
                <div className="upgrade"><span>Sube a proceso</span><b>{integer(selected.dsrl.upgradeRows)}</b><small>{mt(selected.dsrl.upgradeMassMt)}</small></div>
                <div className="downgrade"><span>Baja a desmonte</span><b>{integer(selected.dsrl.downgradeRows)}</b><small>{mt(selected.dsrl.downgradeMassMt)}</small></div>
              </section>

              <section className="block-economic-sequence">
                <h3>SECUENCIA ECONÓMICA F1–F6</h3>
                <div className="block-economic-table-head"><span>Fase</span><span>Masa acum.</span><span>Proceso fuente</span><span>Proceso DSRL</span><span>Upgrade</span><span>Downgrade</span><span>Margen DSRL</span></div>
                {report.phases.map((phase) => (
                  <button key={phase.phase} type="button" className={phase.phase === selectedPhase ? 'active' : ''} onClick={() => { setSelectedPhase(phase.phase); setScope('cumulative'); }}>
                    <strong>F{phase.phase}</strong>
                    <span>{mt(phase.cumulative.source.massMt)}</span>
                    <span>{mt(phase.cumulative.source.processMassMt)}</span>
                    <span>{mt(phase.cumulative.dsrl.processMassMt)}</span>
                    <span>{mt(phase.cumulative.dsrl.upgradeMassMt)}</span>
                    <span>{mt(phase.cumulative.dsrl.downgradeMassMt)}</span>
                    <span>{usdM(phase.cumulative.dsrl.selectedMarginUsdM)}</span>
                  </button>
                ))}
              </section>

              {selected.dsrl.traceExamples.length > 0 && (
                <section className="block-economic-traces">
                  <h3>EJEMPLOS DE BLOQUES RECLASIFICADOS</h3>
                  {selected.dsrl.traceExamples.map((trace) => (
                    <div key={`${trace.blockKey}-${trace.code}`}>
                      <strong>F{trace.phase} · {trace.code}</strong>
                      <span>CU {decimal(trace.cuNative, 5)} · {trace.observedDestination} → {trace.dsrlClass}</span>
                      <small>{trace.reason}</small>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}

          <section className="block-economic-reconciliation">
            <h3>RECONCILIACIÓN ECONÓMICA Y DE MASA</h3>
            <div className={selected.reconciliation.sourceMassCloses ? 'pass' : 'fail'}><span>Masa fuente</span><b>{selected.reconciliation.sourceMassCloses ? 'PASS' : 'FALLA'}</b></div>
            <div className={selected.reconciliation.sourceRouteMassCloses ? 'pass' : 'fail'}><span>Mill + Leach</span><b>{selected.reconciliation.sourceRouteMassCloses ? 'PASS' : 'FALLA'}</b></div>
            <div className={selected.reconciliation.sourceProfitCloses ? 'pass' : 'fail'}><span>Beneficio fuente</span><b>{selected.reconciliation.sourceProfitCloses ? 'PASS' : 'FALLA'}</b></div>
            <div className={report.reconciliation.incrementalMassCloses ? 'pass' : 'fail'}><span>F1–F6 incremental</span><b>{report.reconciliation.incrementalMassCloses ? 'PASS' : 'FALLA'}</b></div>
            <div className={selected.reconciliation.dsrlMassCloses === false ? 'fail' : 'pass'}><span>Masa DSRL</span><b>{selected.reconciliation.dsrlMassCloses === null ? 'BLOQUEADO' : selected.reconciliation.dsrlMassCloses ? 'PASS' : 'FALLA'}</b></div>
            <div className={selected.reconciliation.dsrlValueCloses === false ? 'fail' : 'pass'}><span>Valor DSRL</span><b>{selected.reconciliation.dsrlValueCloses === null ? 'BLOQUEADO' : selected.reconciliation.dsrlValueCloses ? 'PASS' : 'FALLA'}</b></div>
          </section>

          <section className="block-economic-note">
            <strong>GUARDAS METODOLÓGICAS</strong>
            <span>* Los campos NPV* se muestran en moneda nativa no confirmada. El margen DSRL no es VAN: es margen no descontado de bloques clasificados a proceso. No incluye CAPEX, impuestos, costo de minado del desmonte ni strip ratio global. DSRL no decide entre Mill y Leach. Resultado: inventario económico preliminar dentro del diseño, no reservas.</span>
          </section>
        </>
      )}
    </aside>
  );
}
