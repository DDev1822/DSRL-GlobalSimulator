import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw, X } from 'lucide-react';
import {
  loadBlockModelCatalog,
  type BlockModelCatalog,
  type BlockModelDataset,
  type BlockModelQualityStatus,
  type ReconciliationMetric,
} from '../utils/blockModelParser';
import './BlockModelQualityPanel.css';

function integer(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function decimal(value: number, digits = 6): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
  }).format(value);
}

function statusLabel(status: BlockModelQualityStatus): string {
  if (status === 'pass') return 'APROBADO';
  if (status === 'warning') return 'CON OBSERVACIONES';
  return 'FALLA';
}

function metricState(metric: ReconciliationMetric): string {
  return metric.rowsOutsideTolerance === 0 ? 'PASS' : 'REVISAR';
}

function DatasetCard({ dataset, role }: { dataset: BlockModelDataset; role: string }) {
  const report = dataset.report;
  return (
    <section className="block-dataset-card">
      <div className="block-card-title">
        <div>
          <span>{role}</span>
          <strong>{dataset.sourceName}</strong>
          <small>{dataset.sourcePath}</small>
        </div>
        <b className={`block-status-chip ${report.status}`}>
          {statusLabel(report.status)}
        </b>
      </div>

      <div className="block-card-kpis">
        <div><span>Filas</span><b>{integer(report.rowCount)}</b></div>
        <div><span>Válidas</span><b>{integer(report.validRowCount)}</b></div>
        <div><span>Inválidas</span><b>{integer(report.invalidRowCount)}</b></div>
        <div><span>Calidad</span><b>{report.qualityScore.toFixed(1)}%</b></div>
        <div><span>Campos</span><b>{report.headerCount}</b></div>
        <div><span>Claves duplicadas</span><b>{integer(report.duplicateBlockKeys)}</b></div>
        <div><span>IJK repetidos</span><b>{integer(report.duplicateIjkCount)}</b></div>
        <div><span>Fuera F1–F6</span><b>{integer(report.outsideActivePhaseScopeRows)}</b></div>
      </div>
    </section>
  );
}

export default function BlockModelQualityPanel() {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<BlockModelCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCatalog(await loadBlockModelCatalog());
    } catch (reason: unknown) {
      setCatalog(null);
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo cargar el modelo de bloques.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !catalog && !loading && !error) void load();
  }, [open, catalog, loading, error, load]);

  const overallStatus = useMemo<BlockModelQualityStatus>(() => {
    if (!catalog) return 'warning';
    if (
      catalog.primary.report.status === 'fail' ||
      catalog.control.report.status === 'fail' ||
      catalog.reconciliation.status === 'fail'
    ) return 'fail';
    if (
      catalog.primary.report.status === 'warning' ||
      catalog.control.report.status === 'warning'
    ) return 'warning';
    return 'pass';
  }, [catalog]);

  if (!open) {
    return (
      <button
        type="button"
        className="block-model-toggle"
        onClick={() => setOpen(true)}
      >
        <Database size={13} /> MODELO DE BLOQUES
      </button>
    );
  }

  const primary = catalog?.primary;
  const control = catalog?.control;
  const reconciliation = catalog?.reconciliation;
  const maxPhaseCount = Math.max(
    ...Object.values(primary?.report.countsByPhase ?? { none: 1 }),
    1,
  );

  return (
    <aside className="block-model-panel" aria-label="Calidad del modelo de bloques">
      <header>
        <div>
          <strong>ETAPA 8.2 · INGESTA Y CALIDAD</strong>
          <small>Contrato {catalog?.contractVersion ?? '8.1.0'} · inventario aún no calculado</small>
        </div>
        <div className="block-header-actions">
          <button type="button" onClick={() => void load()} title="Recargar" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </button>
          <button type="button" onClick={() => setOpen(false)} title="Cerrar">
            <X size={15} />
          </button>
        </div>
      </header>

      {loading && (
        <div className="block-loading">Leyendo y normalizando el modelo real…</div>
      )}
      {error && (
        <div className="block-error">
          <strong>NO SE PUDO COMPLETAR LA INGESTA</strong>
          <span>{error}</span>
          <button type="button" onClick={() => void load()}>Reintentar</button>
        </div>
      )}

      {catalog && primary && control && reconciliation && (
        <>
          <section className={`block-overall ${overallStatus}`}>
            <div className="block-score">
              {Math.min(primary.report.qualityScore, control.report.qualityScore).toFixed(0)}
            </div>
            <div>
              <span>ESTADO DEL CATÁLOGO</span>
              <strong>{statusLabel(overallStatus)}</strong>
              <small>
                {integer(primary.report.validRowCount + control.report.validRowCount)} filas tipadas entre maestro y control.
              </small>
            </div>
          </section>

          <div className="block-dataset-grid">
            <DatasetCard dataset={primary} role="MODELO MAESTRO" />
            <DatasetCard dataset={control} role="MODELO DE CONTROL F1–F3" />
          </div>

          <section className="block-reconciliation">
            <h3>RECONCILIACIÓN FÍSICA · MODELO MAESTRO</h3>
            <div className="block-reconciliation-grid">
              <div>
                <span>NPVVOL vs dimensiones</span>
                <b>{metricState(primary.report.volumeReconciliation)}</b>
                <small>máx. {decimal(primary.report.volumeReconciliation.maxAbsoluteError, 8)} m³</small>
                <em>{primary.report.volumeReconciliation.rowsOutsideTolerance} fuera de tolerancia</em>
              </div>
              <div>
                <span>NPVMASS vs volumen × densidad</span>
                <b>{metricState(primary.report.massReconciliation)}</b>
                <small>máx. {decimal(primary.report.massReconciliation.maxAbsoluteError, 10)} t</small>
                <em>{primary.report.massReconciliation.rowsOutsideTolerance} fuera de tolerancia</em>
              </div>
              <div>
                <span>NPVPROFT vs ingreso − costos</span>
                <b>{metricState(primary.report.profitReconciliation)}</b>
                <small>máx. {decimal(primary.report.profitReconciliation.maxAbsoluteError, 10)}</small>
                <em>{primary.report.profitReconciliation.rowsOutsideTolerance} fuera de tolerancia</em>
              </div>
            </div>
          </section>

          <section className="block-cross-check">
            <h3>CONTROL CRUZADO · F1–F3</h3>
            <div className={`block-cross-result ${reconciliation.status}`}>
              <div>
                <span>SUBCONJUNTO EXACTO</span>
                <strong>{reconciliation.exactSubset ? 'SÍ' : 'NO'}</strong>
              </div>
              <div><span>Esperadas</span><b>{integer(reconciliation.expectedControlRows)}</b></div>
              <div><span>Coincidentes</span><b>{integer(reconciliation.matchedRows)}</b></div>
              <div><span>Faltantes</span><b>{integer(reconciliation.missingFromControl)}</b></div>
              <div><span>Extras</span><b>{integer(reconciliation.extraInControl)}</b></div>
              <div><span>Valores distintos</span><b>{integer(reconciliation.valueMismatchRows)}</b></div>
            </div>
          </section>

          <div className="block-distributions">
            <section className="block-phase-distribution">
              <h3>DISTRIBUCIÓN POR PUSHBACK · MAESTRO</h3>
              {Object.entries(primary.report.countsByPhase)
                .sort(([left], [right]) => Number(left) - Number(right))
                .map(([phase, count]) => (
                  <div key={phase}>
                    <span>F{phase}</span>
                    <i><b style={{ width: `${(count / maxPhaseCount) * 100}%` }} /></i>
                    <strong>{integer(count)}</strong>
                    {Number(phase) > 6 && <em>preservado</em>}
                  </div>
                ))}
            </section>

            <section className="block-destination-distribution">
              <h3>DESTINOS OBSERVADOS</h3>
              {Object.entries(primary.report.countsByDestination)
                .sort(([, left], [, right]) => right - left)
                .map(([destination, count]) => (
                  <div key={destination}>
                    <span>{destination}</span>
                    <b>{integer(count)}</b>
                    <small>{((count / primary.report.validRowCount) * 100).toFixed(1)}%</small>
                  </div>
                ))}
            </section>
          </div>

          <section className="block-quality-checks">
            <h3>REPORTE DE CALIDAD</h3>
            <div>
              <span>Encabezados obligatorios</span>
              <b>{primary.report.missingRequiredHeaders.length === 0 ? 'PASS' : 'FALLA'}</b>
              <small>{primary.report.recognizedHeaderCount} de 37 reconocidos</small>
            </div>
            <div>
              <span>Filas físicamente inválidas</span>
              <b>{primary.report.invalidRowCount === 0 ? 'PASS' : 'FALLA'}</b>
              <small>{integer(primary.report.invalidRowCount)}</small>
            </div>
            <div>
              <span>Claves compuestas duplicadas</span>
              <b>{primary.report.duplicateBlockKeys === 0 ? 'PASS' : 'FALLA'}</b>
              <small>{integer(primary.report.duplicateBlockKeys)}</small>
            </div>
            <div>
              <span>Destinos desconocidos</span>
              <b>{primary.report.unknownDestinationRows === 0 ? 'PASS' : 'REVISAR'}</b>
              <small>{integer(primary.report.unknownDestinationRows)}</small>
            </div>
            <div>
              <span>Pushbacks inválidos</span>
              <b>{primary.report.invalidPushbackRows === 0 ? 'PASS' : 'FALLA'}</b>
              <small>{integer(primary.report.invalidPushbackRows)}</small>
            </div>
            <div>
              <span>Incidencias registradas</span>
              <b>{primary.report.issueCounts.error + primary.report.issueCounts.warning}</b>
              <small>{primary.report.truncatedIssueCount > 0 ? `+${primary.report.truncatedIssueCount} truncadas` : 'sin truncar'}</small>
            </div>
          </section>

          {(primary.report.issues.length > 0 || control.report.issues.length > 0) && (
            <section className="block-issues">
              <h3>PRIMERAS INCIDENCIAS</h3>
              {[...primary.report.issues, ...control.report.issues]
                .filter((issue) => issue.severity !== 'info')
                .slice(0, 8)
                .map((issue, index) => (
                  <div key={`${issue.code}-${issue.rowNumber ?? 0}-${index}`} className={issue.severity}>
                    <b>{issue.code}</b>
                    <span>{issue.message}</span>
                    <small>{issue.rowNumber ? `fila ${issue.rowNumber}` : 'archivo'}</small>
                  </div>
                ))}
            </section>
          )}

          <section className="block-scope-note">
            <strong>ALCANCE 8.2</strong>
            <span>
              Esta etapa carga, tipa y audita el modelo real. Los inventarios incremental/acumulado, leyes ponderadas y resultados por banco comienzan en la Etapa 8.3.
            </span>
          </section>
        </>
      )}
    </aside>
  );
}
