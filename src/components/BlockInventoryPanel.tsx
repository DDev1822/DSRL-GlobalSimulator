import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, RefreshCw, X } from 'lucide-react';
import {
  buildBlockInventory,
  getPhaseInventory,
  type BlockInventoryReport,
  type InventoryScope,
  type PhysicalInventoryMetrics,
} from '../engine/blockInventory';
import { SUPPORTED_PHASES, type SupportedPhase } from '../engine/blockModelContract';
import { loadBlockModelCatalog } from '../utils/blockModelCatalogLoader';
import './BlockInventoryPanel.css';

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

function metricForScope(
  report: BlockInventoryReport,
  phase: SupportedPhase,
  scope: InventoryScope,
): PhysicalInventoryMetrics {
  const phaseInventory = getPhaseInventory(report, phase);
  return scope === 'incremental'
    ? phaseInventory.incremental
    : phaseInventory.cumulative;
}

export default function BlockInventoryPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<BlockInventoryReport | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<SupportedPhase>(6);
  const [scope, setScope] = useState<InventoryScope>('cumulative');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await loadBlockModelCatalog();
      if (catalog.primary.report.status === 'fail') {
        throw new Error('El modelo maestro no supera el control de calidad de la Etapa 8.2.');
      }
      setReport(buildBlockInventory(catalog.primary));
    } catch (reason: unknown) {
      setReport(null);
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo construir el inventario físico.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !report && !loading && !error) void load();
  }, [open, report, loading, error, load]);

  const selectedMetrics = useMemo(
    () => (report ? metricForScope(report, selectedPhase, scope) : null),
    [report, selectedPhase, scope],
  );

  if (!open) {
    return (
      <button
        type="button"
        className="block-inventory-toggle"
        onClick={() => setOpen(true)}
      >
        <Boxes size={13} /> INVENTARIO REAL
      </button>
    );
  }

  const maxIncrementalMass = Math.max(
    ...(report?.phaseInventories.map((item) => item.incremental.massMt) ?? [1]),
    1,
  );
  const maxCumulativeMass = Math.max(
    ...(report?.phaseInventories.map((item) => item.cumulative.massMt) ?? [1]),
    1,
  );

  return (
    <aside className="block-inventory-panel" aria-label="Inventario físico F1 a F6">
      <header>
        <div>
          <strong>ETAPA 8.3 · INVENTARIO FÍSICO REAL</strong>
          <small>PSB_PIT · NPVVOL · NPVMASS · NPVPDEST</small>
        </div>
        <div className="block-inventory-actions">
          <button type="button" onClick={() => void load()} disabled={loading} title="Recargar">
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </button>
          <button type="button" onClick={() => setOpen(false)} title="Cerrar">
            <X size={15} />
          </button>
        </div>
      </header>

      {loading && <div className="block-inventory-loading">Construyendo inventarios F1–F6…</div>}
      {error && (
        <div className="block-inventory-error">
          <strong>NO SE PUDO CALCULAR EL INVENTARIO</strong>
          <span>{error}</span>
          <button type="button" onClick={() => void load()}>Reintentar</button>
        </div>
      )}

      {report && selectedMetrics && (
        <>
          <section className="block-inventory-summary">
            <div>
              <span>INVENTARIO F1–F6</span>
              <b>{mt(report.totalF1ToF6.massMt)}</b>
              <small>{integer(report.totalF1ToF6.blockCount)} bloques</small>
            </div>
            <div>
              <span>PROCESO</span>
              <b>{mt(report.totalF1ToF6.processMassMt)}</b>
              <small>Mill + Leach</small>
            </div>
            <div>
              <span>DESMONTE</span>
              <b>{mt(report.totalF1ToF6.wasteMassMt)}</b>
              <small>destino _DUMP_</small>
            </div>
            <div>
              <span>STRIP RATIO</span>
              <b>{decimal(report.totalF1ToF6.stripRatioByDestination, 3)}</b>
              <small>desmonte / proceso</small>
            </div>
            <div>
              <span>F7–F9 PRESERVADOS</span>
              <b>{integer(report.excludedFutureBlockCount)}</b>
              <small>fuera del alcance activo</small>
            </div>
          </section>

          <section className="block-inventory-controls">
            <div>
              <span>FASE</span>
              <div className="block-phase-buttons">
                {SUPPORTED_PHASES.map((phase) => (
                  <button
                    key={phase}
                    type="button"
                    className={phase === selectedPhase ? 'active' : ''}
                    onClick={() => setSelectedPhase(phase)}
                  >
                    F{phase}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span>LECTURA</span>
              <div className="block-scope-buttons">
                <button
                  type="button"
                  className={scope === 'incremental' ? 'active' : ''}
                  onClick={() => setScope('incremental')}
                >
                  INCREMENTAL
                </button>
                <button
                  type="button"
                  className={scope === 'cumulative' ? 'active' : ''}
                  onClick={() => setScope('cumulative')}
                >
                  ACUMULADO
                </button>
              </div>
            </div>
          </section>

          <section className="block-selected-inventory">
            <div className="block-selected-title">
              <div>
                <span>{scope === 'incremental' ? 'INVENTARIO INCREMENTAL' : 'INVENTARIO ACUMULADO'}</span>
                <strong>F{selectedPhase}</strong>
              </div>
              <b>{mt(selectedMetrics.massMt)}</b>
            </div>
            <div className="block-selected-grid">
              <div><span>Bloques</span><b>{integer(selectedMetrics.blockCount)}</b></div>
              <div><span>Volumen</span><b>{decimal(selectedMetrics.volumeM3 / 1_000_000, 3)} Mm³</b></div>
              <div><span>Proceso</span><b>{mt(selectedMetrics.processMassMt)}</b></div>
              <div><span>Desmonte</span><b>{mt(selectedMetrics.wasteMassMt)}</b></div>
              <div><span>Mill</span><b>{mt(selectedMetrics.millMassMt)}</b></div>
              <div><span>Leach</span><b>{mt(selectedMetrics.leachMassMt)}</b></div>
              <div><span>Strip ratio</span><b>{decimal(selectedMetrics.stripRatioByDestination, 3)}</b></div>
              <div><span>AU proceso*</span><b>{decimal(selectedMetrics.weightedAuProcess, 5)}</b></div>
              <div><span>CU proceso*</span><b>{decimal(selectedMetrics.weightedCuProcess, 5)}</b></div>
              <div><span>Cota central</span><b>{decimal(selectedMetrics.minElevationM, 1)}–{decimal(selectedMetrics.maxElevationM, 1)} m</b></div>
            </div>
          </section>

          <section className="block-inventory-sequence">
            <h3>SECUENCIA FÍSICA F1–F6</h3>
            <div className="block-inventory-table-head">
              <span>Fase</span><span>Bloques inc.</span><span>Masa inc.</span><span>Masa acum.</span><span>Proceso acum.</span><span>Desmonte acum.</span><span>Strip acum.</span>
            </div>
            {report.phaseInventories.map((item) => (
              <button
                type="button"
                key={item.phase}
                className={item.phase === selectedPhase ? 'active' : ''}
                onClick={() => setSelectedPhase(item.phase)}
              >
                <strong>F{item.phase}</strong>
                <span>{integer(item.incremental.blockCount)}</span>
                <span>{decimal(item.incremental.massMt, 3)} Mt</span>
                <span>{decimal(item.cumulative.massMt, 3)} Mt</span>
                <span>{decimal(item.cumulative.processMassMt, 3)} Mt</span>
                <span>{decimal(item.cumulative.wasteMassMt, 3)} Mt</span>
                <span>{decimal(item.cumulative.stripRatioByDestination, 3)}</span>
              </button>
            ))}
          </section>

          <div className="block-inventory-charts">
            <section>
              <h3>MASA INCREMENTAL</h3>
              {report.phaseInventories.map((item) => (
                <div key={item.phase}>
                  <span>F{item.phase}</span>
                  <i><b style={{ width: `${(item.incremental.massMt / maxIncrementalMass) * 100}%` }} /></i>
                  <strong>{decimal(item.incremental.massMt, 3)} Mt</strong>
                </div>
              ))}
            </section>
            <section>
              <h3>MASA ACUMULADA</h3>
              {report.phaseInventories.map((item) => (
                <div key={item.phase}>
                  <span>F{item.phase}</span>
                  <i><b style={{ width: `${(item.cumulative.massMt / maxCumulativeMass) * 100}%` }} /></i>
                  <strong>{decimal(item.cumulative.massMt, 3)} Mt</strong>
                </div>
              ))}
            </section>
          </div>

          <section className="block-inventory-reconciliation">
            <h3>RECONCILIACIÓN DEL INVENTARIO</h3>
            {Object.entries(report.reconciliation).map(([key, value]) => (
              <div key={key} className={value ? 'pass' : 'fail'}>
                <span>{key}</span>
                <b>{value ? 'PASS' : 'FALLA'}</b>
              </div>
            ))}
          </section>

          <section className="block-inventory-note">
            <strong>ALCANCE Y TERMINOLOGÍA</strong>
            <span>
              Resultados físicos reales del modelo de bloques. Proceso y desmonte se basan en `NPVPDEST`. Las unidades de AU y CU siguen sin confirmarse, por lo que no se calcula metal contenido. Esto es inventario dentro del diseño, no una declaración de reservas.
            </span>
          </section>
        </>
      )}
    </aside>
  );
}
