import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { analyzeBenches } from '../engine/benchAnalysis';
import {
  buildPhaseComparison,
  comparePhasePair,
  type PhaseComparisonSnapshot,
} from '../engine/phaseComparison';
import {
  calculateOptimization,
  createEconomicInputs,
  type EconomicInputs,
} from '../engine/economicModel';
import {
  parseDatamineGeometryCatalog,
  type DatamineGeometryCatalog,
} from '../utils/datamineParser';
import './PhaseComparisonPanel.css';

const STORAGE_KEY = 'dsrl-global-simulator:economic-scenario:v1';

function loadInputs(): EconomicInputs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? createEconomicInputs(JSON.parse(raw)) : createEconomicInputs();
  } catch {
    return createEconomicInputs();
  }
}

function signed(value: number, digits = 2): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(digits)}`;
}

function money(value: number): string {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${prefix}$${Math.abs(value).toFixed(1)} M`;
}

export default function PhaseComparisonPanel() {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<DatamineGeometryCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [basePhase, setBasePhase] = useState(1);
  const [targetPhase, setTargetPhase] = useState(6);
  const [benchHeightM, setBenchHeightM] = useState(10);
  const [scenarioVersion, setScenarioVersion] = useState(0);

  useEffect(() => {
    parseDatamineGeometryCatalog()
      .then(setCatalog)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : 'No se pudo cargar el catálogo Datamine.'),
      );
  }, []);

  const economics = useMemo(
    () => calculateOptimization(loadInputs()),
    [scenarioVersion],
  );

  const result = useMemo(() => {
    if (!catalog) return null;
    const snapshots: PhaseComparisonSnapshot[] = catalog.availablePhases.map((phase) => {
      const geometry = catalog.phases[phase];
      const fraction = phase / 6;
      const analysis = analyzeBenches(geometry, benchHeightM, {
        phaseResourceMt: economics.bestScenario.tonnage * fraction,
        phaseNpvUsdM: economics.maxVAN * Math.pow(fraction, 0.92),
        phaseGradePercent: economics.bestScenario.grade * (1.08 - 0.08 * fraction),
        phaseStripRatio: economics.inputs.stripRatio * (0.78 + 0.22 * fraction),
      });
      return {
        phase,
        geometryId: geometry.dataSource.geometryId ?? `PIT_F${phase}`,
        benchCount: analysis.benches.length,
        triangleCount: geometry.validation.stats.totalTriangles,
        surfaceAreaHa: analysis.totalSurfaceAreaM2 / 10_000,
        minElevationM: geometry.bounds.minZ,
        maxElevationM: geometry.bounds.maxZ,
        resourceMt: analysis.benches.reduce((sum, bench) => sum + bench.resourceEstimateMt, 0),
        gradePercent: economics.bestScenario.grade * (1.08 - 0.08 * fraction),
        stripRatio: economics.inputs.stripRatio * (0.78 + 0.22 * fraction),
        npvUsdM: economics.maxVAN * Math.pow(fraction, 0.92),
      };
    });
    return buildPhaseComparison(snapshots);
  }, [catalog, economics, benchHeightM]);

  const comparison = useMemo(
    () => result ? comparePhasePair(result, basePhase, targetPhase) : null,
    [result, basePhase, targetPhase],
  );

  const phases = catalog?.availablePhases ?? [1, 2, 3, 4, 5, 6];

  if (!open) {
    return (
      <button
        type="button"
        className="phase-compare-toggle"
        onClick={() => {
          setScenarioVersion((value) => value + 1);
          setOpen(true);
        }}
      >
        COMPARAR FASES
      </button>
    );
  }

  return (
    <aside className="phase-compare-panel" aria-label="Comparación entre fases">
      <header>
        <strong>ETAPA 5 · COMPARACIÓN F1–F6</strong>
        <button type="button" onClick={() => setOpen(false)} title="Cerrar"><X size={15} /></button>
      </header>

      <div className="phase-compare-controls">
        <label>
          <span>FASE BASE</span>
          <select value={basePhase} onChange={(event) => setBasePhase(Number(event.target.value))}>
            {phases.map((phase) => <option key={phase} value={phase}>F{phase}</option>)}
          </select>
        </label>
        <label>
          <span>FASE DESTINO</span>
          <select value={targetPhase} onChange={(event) => setTargetPhase(Number(event.target.value))}>
            {phases.map((phase) => <option key={phase} value={phase}>F{phase}</option>)}
          </select>
        </label>
        <label>
          <span>ALTURA BANCO</span>
          <select value={benchHeightM} onChange={(event) => setBenchHeightM(Number(event.target.value))}>
            {[5, 10, 15, 20].map((value) => <option key={value} value={value}>{value} m</option>)}
          </select>
        </label>
      </div>

      {error && <div className="phase-compare-status">{error}</div>}
      {!error && !comparison && <div className="phase-compare-status">Calculando comparación…</div>}

      {comparison && (
        <>
          <section className="phase-pair-summary">
            <h3>F{comparison.base.phase} → F{comparison.target.phase}</h3>
            <div className="phase-pair-grid">
              <div><span>Δ área superficial</span><b>{signed(comparison.delta.surfaceAreaDeltaHa)} ha</b><small>geométrico</small></div>
              <div><span>Δ bancos</span><b>{signed(comparison.delta.benchCountDelta, 0)}</b><small>geométrico</small></div>
              <div><span>Δ triángulos</span><b>{signed(comparison.delta.triangleCountDelta, 0)}</b><small>geométrico</small></div>
              <div><span>Δ cota mínima</span><b>{signed(comparison.delta.minimumElevationDeltaM)} m</b><small>geométrico</small></div>
              <div><span>Δ recurso*</span><b>{signed(comparison.delta.resourceDeltaMt)} Mt</b><small>proxy</small></div>
              <div><span>Δ VAN*</span><b>{money(comparison.delta.npvDeltaUsdM)}</b><small>proxy</small></div>
              <div><span>Δ ley*</span><b>{signed(comparison.delta.gradeDeltaPercent, 3)} %</b><small>proxy</small></div>
              <div><span>Δ strip ratio*</span><b>{signed(comparison.delta.stripRatioDelta)}</b><small>proxy</small></div>
            </div>
          </section>

          <section className="phase-sequence-table">
            <h3>SECUENCIA DE FASES</h3>
            <div className="phase-table-head">
              <span>Fase</span><span>Área ha</span><span>Bancos</span><span>Recurso*</span><span>VAN*</span>
            </div>
            {result?.snapshots.map((snapshot) => (
              <button
                key={snapshot.phase}
                type="button"
                className={snapshot.phase === targetPhase ? 'selected' : ''}
                onClick={() => setTargetPhase(snapshot.phase)}
              >
                <b>F{snapshot.phase}</b>
                <span>{snapshot.surfaceAreaHa.toFixed(1)}</span>
                <span>{snapshot.benchCount}</span>
                <span>{snapshot.resourceMt.toFixed(1)} Mt</span>
                <span>${snapshot.npvUsdM.toFixed(0)} M</span>
              </button>
            ))}
          </section>
        </>
      )}

      <p className="phase-compare-note">
        Área, bancos, triángulos y cotas provienen de las superficies Datamine. Los campos con * son proxies analíticos. No se reporta volumen incremental sin sólidos cerrados o modelo de bloques.
      </p>
    </aside>
  );
}
