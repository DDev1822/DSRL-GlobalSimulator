import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers3, RefreshCw, X } from 'lucide-react';
import {
  SUPPORTED_BENCH_HEIGHTS,
  buildBlockBenchInventory,
  type BenchHeightM,
  type BenchInventoryEntry,
} from '../engine/blockBenchInventory';
import type { InventoryScope } from '../engine/blockInventory';
import { SUPPORTED_PHASES, type SupportedPhase } from '../engine/blockModelContract';
import type { BlockModelDataset } from '../utils/blockModelParser';
import { loadBlockModelCatalog } from '../utils/blockModelCatalogLoader';
import './BlockBenchInventoryPanel.css';

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

function reconciliationEntries(report: ReturnType<typeof buildBlockBenchInventory>) {
  return [
    ['Bloques por banco', report.reconciliation.blockCountCloses],
    ['Volumen por banco', report.reconciliation.volumeCloses],
    ['Masa por banco', report.reconciliation.massCloses],
    ['Proceso + desmonte', report.reconciliation.processPlusWasteCloses],
    ['Mill + Leach', report.reconciliation.millPlusLeachCloses],
    ['Acumulado desde techo', report.reconciliation.cumulativeFromTopCloses],
    ['Cierre contra fase 8.3', report.reconciliation.phaseInventoryCloses],
    ['Intervalos sin solape', report.reconciliation.intervalsDoNotOverlap],
  ] as const;
}

export default function BlockBenchInventoryPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<BlockModelDataset | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<SupportedPhase>(6);
  const [scope, setScope] = useState<InventoryScope>('cumulative');
  const [benchHeightM, setBenchHeightM] = useState<BenchHeightM>(10);
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await loadBlockModelCatalog();
      if (catalog.primary.report.status === 'fail') {
        throw new Error('El modelo maestro no supera el control de calidad de la Etapa 8.2.');
      }
      setDataset(catalog.primary);
    } catch (reason: unknown) {
      setDataset(null);
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo construir el inventario real por bancos.',
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
        ? buildBlockBenchInventory(dataset, selectedPhase, scope, benchHeightM)
        : null,
    [dataset, selectedPhase, scope, benchHeightM],
  );

  useEffect(() => {
    if (!report) return;
    if (!report.benches.some((bench) => bench.benchId === selectedBenchId)) {
      setSelectedBenchId(report.benches[0]?.benchId ?? null);
    }
  }, [report, selectedBenchId]);

  const selectedBench: BenchInventoryEntry | null =
    report?.benches.find((bench) => bench.benchId === selectedBenchId) ??
    report?.benches[0] ??
    null;

  const maxBenchMass = Math.max(
    ...(report?.benches.map((bench) => bench.metrics.massMt) ?? [1]),
    1,
  );
  const maxCumulativeMass = Math.max(
    ...(report?.benches.map((bench) => bench.cumulativeFromTop.massMt) ?? [1]),
    1,
  );

  if (!open) {
    return (
      <button
        type="button"
        className="block-bench-toggle"
        onClick={() => setOpen(true)}
      >
        <Layers3 size={13} /> BANCOS REALES
      </button>
    );
  }

  return (
    <aside className="block-bench-panel" aria-label="Inventario real por bancos">
      <header>
        <div>
          <strong>ETAPA 8.4 · INVENTARIO REAL POR BANCOS</strong>
          <small>ZC · bloque completo · intervalo [cota inferior, cota superior)</small>
        </div>
        <div className="block-bench-actions">
          <button type="button" onClick={() => void load()} disabled={loading} title="Recargar">
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </button>
          <button type="button" onClick={() => setOpen(false)} title="Cerrar">
            <X size={15} />
          </button>
        </div>
      </header>

      {loading && <div className="block-bench-loading">Agrupando bloques reales por elevación…</div>}
      {error && (
        <div className="block-bench-error">
          <strong>NO SE PUDO CONSTRUIR EL INVENTARIO POR BANCOS</strong>
          <span>{error}</span>
          <button type="button" onClick={() => void load()}>Reintentar</button>
        </div>
      )}

      {report && selectedBench && (
        <>
          <section className="block-bench-summary">
            <div><span>Fase / alcance</span><b>F{report.phase} · {report.scope === 'cumulative' ? 'ACUM.' : 'INCR.'}</b><small>{report.selectedBlockCount.toLocaleString()} bloques</small></div>
            <div><span>Altura banco</span><b>{report.benchHeightM} m</b><small>datum {decimal(report.datumElevationM, 0)} m</small></div>
            <div><span>Bancos activos</span><b>{report.benches.length}</b><small>ordenados desde techo</small></div>
            <div><span>Masa total</span><b>{mt(report.total.massMt)}</b><small>{mt(report.total.processMassMt)} proceso</small></div>
            <div><span>Strip ratio</span><b>{decimal(report.total.stripRatioByDestination)}</b><small>desmonte / proceso</small></div>
          </section>

          <section className="block-bench-controls">
            <div>
              <span>FASE</span>
              <div>{SUPPORTED_PHASES.map((phase) => <button key={phase} type="button" className={phase === selectedPhase ? 'active' : ''} onClick={() => setSelectedPhase(phase)}>F{phase}</button>)}</div>
            </div>
            <div>
              <span>LECTURA</span>
              <div><button type="button" className={scope === 'incremental' ? 'active' : ''} onClick={() => setScope('incremental')}>INCREMENTAL</button><button type="button" className={scope === 'cumulative' ? 'active' : ''} onClick={() => setScope('cumulative')}>ACUMULADO</button></div>
            </div>
            <div>
              <span>ALTURA DE BANCO</span>
              <div>{SUPPORTED_BENCH_HEIGHTS.map((height) => <button key={height} type="button" className={height === benchHeightM ? 'active' : ''} onClick={() => setBenchHeightM(height)}>{height} m</button>)}</div>
            </div>
          </section>

          <section className="block-bench-selected">
            <div className="block-bench-selected-title">
              <div><span>BANCO SELECCIONADO</span><strong>{selectedBench.benchId}</strong></div>
              <b>{mt(selectedBench.metrics.massMt)}</b>
            </div>
            <div className="block-bench-selected-grid">
              <div><span>Intervalo</span><b>{decimal(selectedBench.floorElevationM, 0)}–{decimal(selectedBench.ceilingElevationM, 0)} m</b></div>
              <div><span>Bloques</span><b>{integer(selectedBench.metrics.blockCount)}</b></div>
              <div><span>Volumen</span><b>{decimal(selectedBench.metrics.volumeM3 / 1_000_000, 3)} Mm³</b></div>
              <div><span>Proceso</span><b>{mt(selectedBench.metrics.processMassMt)}</b></div>
              <div><span>Desmonte</span><b>{mt(selectedBench.metrics.wasteMassMt)}</b></div>
              <div><span>Mill</span><b>{mt(selectedBench.metrics.millMassMt)}</b></div>
              <div><span>Leach</span><b>{mt(selectedBench.metrics.leachMassMt)}</b></div>
              <div><span>Strip ratio</span><b>{decimal(selectedBench.metrics.stripRatioByDestination)}</b></div>
              <div><span>AU proceso*</span><b>{decimal(selectedBench.metrics.weightedAuProcess, 5)}</b></div>
              <div><span>CU proceso*</span><b>{decimal(selectedBench.metrics.weightedCuProcess, 5)}</b></div>
            </div>
          </section>

          <section className="block-bench-sequence">
            <h3>SECUENCIA VERTICAL · TECHO A FONDO</h3>
            <div className="block-bench-table-head"><span>Banco</span><span>Cota</span><span>Bloques</span><span>Masa</span><span>Proceso</span><span>Desmonte</span><span>Strip</span><span>Acum. techo</span></div>
            {report.benches.map((bench) => (
              <button key={bench.benchId} type="button" className={bench.benchId === selectedBench.benchId ? 'active' : ''} onClick={() => setSelectedBenchId(bench.benchId)}>
                <strong>{bench.benchId}</strong>
                <span>{decimal(bench.floorElevationM, 0)}–{decimal(bench.ceilingElevationM, 0)}</span>
                <span>{integer(bench.metrics.blockCount)}</span>
                <span>{mt(bench.metrics.massMt)}</span>
                <span>{mt(bench.metrics.processMassMt)}</span>
                <span>{mt(bench.metrics.wasteMassMt)}</span>
                <span>{decimal(bench.metrics.stripRatioByDestination)}</span>
                <span>{mt(bench.cumulativeFromTop.massMt)}</span>
              </button>
            ))}
          </section>

          <div className="block-bench-charts">
            <section>
              <h3>MASA POR BANCO</h3>
              {report.benches.map((bench) => <div key={bench.benchId}><span>{decimal(bench.floorElevationM, 0)}</span><i><b style={{ width: `${(bench.metrics.massMt / maxBenchMass) * 100}%` }} /></i><strong>{mt(bench.metrics.massMt)}</strong></div>)}
            </section>
            <section>
              <h3>ACUMULADO DESDE TECHO</h3>
              {report.benches.map((bench) => <div key={bench.benchId}><span>{decimal(bench.floorElevationM, 0)}</span><i><b style={{ width: `${(bench.cumulativeFromTop.massMt / maxCumulativeMass) * 100}%` }} /></i><strong>{mt(bench.cumulativeFromTop.massMt)}</strong></div>)}
            </section>
          </div>

          <section className="block-bench-reconciliation">
            <h3>RECONCILIACIÓN CONTRA INVENTARIO FÍSICO 8.3</h3>
            {reconciliationEntries(report).map(([label, passed]) => <div key={label} className={passed ? 'pass' : 'fail'}><span>{label}</span><b>{passed ? 'PASS' : 'FALLA'}</b></div>)}
          </section>

          <section className="block-bench-note">
            <strong>METODOLOGÍA CONTROLADA</strong>
            <span>Cada bloque completo se asigna por su centro ZC. No se divide volumen entre bancos cuando un subbloque cruza un límite. AU/CU permanecen en unidad nativa no confirmada. Resultado: inventario dentro del diseño, no declaración de reservas.</span>
          </section>
        </>
      )}
    </aside>
  );
}
