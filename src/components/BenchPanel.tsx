import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  analyzeBenches,
  type BenchRecord,
} from '../engine/benchAnalysis';
import {
  calculateOptimization,
  createEconomicInputs,
  type EconomicInputs,
} from '../engine/economicModel';
import {
  parseDatamineGeometryCatalog,
  type DatamineGeometryCatalog,
} from '../utils/datamineParser';
import './BenchPanel.css';

const STORAGE_KEY = 'dsrl-global-simulator:economic-scenario:v1';

function loadInputs(): EconomicInputs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? createEconomicInputs(JSON.parse(raw)) : createEconomicInputs();
  } catch {
    return createEconomicInputs();
  }
}

function money(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(1)} M`;
}

export default function BenchPanel() {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<DatamineGeometryCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState(6);
  const [benchHeight, setBenchHeight] = useState(10);
  const [benchId, setBenchId] = useState('');
  const [scenarioVersion, setScenarioVersion] = useState(0);

  useEffect(() => {
    parseDatamineGeometryCatalog()
      .then(setCatalog)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : 'No se pudo cargar el catálogo.'),
      );
  }, []);

  const economics = useMemo(
    () => calculateOptimization(loadInputs()),
    [scenarioVersion],
  );

  const analysis = useMemo(() => {
    const geometry = catalog?.phases[phase];
    if (!geometry) return null;
    const fraction = phase / 6;
    return analyzeBenches(geometry, benchHeight, {
      phaseResourceMt: economics.bestScenario.tonnage * fraction,
      phaseNpvUsdM: economics.maxVAN * Math.pow(fraction, 0.92),
      phaseGradePercent: economics.bestScenario.grade * (1.08 - 0.08 * fraction),
      phaseStripRatio: economics.inputs.stripRatio * (0.78 + 0.22 * fraction),
    });
  }, [catalog, phase, benchHeight, economics]);

  useEffect(() => {
    const first = analysis?.benches[0]?.id ?? '';
    if (!analysis?.benches.some((bench) => bench.id === benchId)) setBenchId(first);
  }, [analysis, benchId]);

  const selected: BenchRecord | null =
    analysis?.benches.find((bench) => bench.id === benchId) ?? null;

  const phaseSummary = useMemo(() => {
    if (!analysis) return null;
    return {
      areaHa: analysis.totalSurfaceAreaM2 / 10_000,
      resourceMt: analysis.benches.reduce(
        (sum, bench) => sum + bench.resourceEstimateMt,
        0,
      ),
      npvUsdM: analysis.benches.reduce(
        (sum, bench) => sum + bench.incrementalNpvUsdM,
        0,
      ),
      benches: analysis.benches.length,
    };
  }, [analysis]);

  const valueRanking = useMemo(
    () =>
      [...(analysis?.benches ?? [])]
        .sort((left, right) => right.incrementalNpvUsdM - left.incrementalNpvUsdM)
        .slice(0, 5),
    [analysis],
  );

  const maxRankingValue = Math.max(
    ...valueRanking.map((bench) => Math.abs(bench.incrementalNpvUsdM)),
    1,
  );

  if (!open) {
    return (
      <button
        type="button"
        className="bench-dock-toggle"
        onClick={() => {
          setScenarioVersion((value) => value + 1);
          setOpen(true);
        }}
      >
        ANÁLISIS POR BANCOS
      </button>
    );
  }

  return (
    <aside className="bench-dock" aria-label="Análisis por bancos">
      <header>
        <strong>ETAPA 4 · BANCOS</strong>
        <button type="button" onClick={() => setOpen(false)} title="Cerrar">
          <X size={15} />
        </button>
      </header>

      <div className="controls">
        <label>
          <span>FASE REAL</span>
          <select value={phase} onChange={(event) => setPhase(Number(event.target.value))}>
            {(catalog?.availablePhases ?? [6]).map((value) => (
              <option key={value} value={value}>F{value}</option>
            ))}
          </select>
        </label>
        <label>
          <span>ALTURA DE BANCO</span>
          <select value={benchHeight} onChange={(event) => setBenchHeight(Number(event.target.value))}>
            {[5, 10, 15, 20].map((value) => (
              <option key={value} value={value}>{value} m</option>
            ))}
          </select>
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          <span>BANCO SELECCIONADO</span>
          <select value={benchId} onChange={(event) => setBenchId(event.target.value)}>
            {analysis?.benches.map((bench) => (
              <option key={bench.id} value={bench.id}>
                {bench.id} · {bench.floorElevationM.toFixed(0)}–{bench.crestElevationM.toFixed(0)} m
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="bench-status">{error}</div>}
      {!error && !selected && <div className="bench-status">Calculando bancos Datamine…</div>}

      {phaseSummary && (
        <section className="bench-phase-summary">
          <h3>RESUMEN DE FASE F{phase}</h3>
          <div>
            <span>Bancos</span><b>{phaseSummary.benches}</b>
            <span>Área total</span><b>{phaseSummary.areaHa.toFixed(2)} ha</b>
            <span>Recurso fase*</span><b>{phaseSummary.resourceMt.toFixed(2)} Mt</b>
            <span>VAN fase*</span><b>{money(phaseSummary.npvUsdM)}</b>
          </div>
        </section>
      )}

      {selected && (
        <section className="bench-card">
          <h3><span>{selected.id}</span><span>F{phase}</span></h3>
          <div className="bench-grid">
            <div><span>Cotas</span><b>{selected.floorElevationM.toFixed(0)}–{selected.crestElevationM.toFixed(0)} m</b></div>
            <div><span>Triángulos</span><b>{selected.triangleCount.toLocaleString()}</b></div>
            <div><span>Área superficial</span><b>{selected.surfaceAreaHa.toFixed(2)} ha</b></div>
            <div><span>Recurso banco*</span><b>{selected.resourceEstimateMt.toFixed(2)} Mt</b></div>
            <div><span>Recurso acumulado*</span><b>{selected.cumulativeResourceEstimateMt.toFixed(2)} Mt</b></div>
            <div><span>Ley estimada*</span><b>{selected.gradeEstimatePercent.toFixed(3)} %</b></div>
            <div><span>Strip ratio*</span><b>{selected.stripRatioEstimate.toFixed(2)} : 1</b></div>
            <div><span>VAN incremental*</span><b>{money(selected.incrementalNpvUsdM)}</b></div>
            <div><span>VAN acumulado*</span><b>{money(selected.cumulativeNpvUsdM)}</b></div>
            <div><span>Participación área</span><b>{(selected.areaShare * 100).toFixed(1)} %</b></div>
          </div>
        </section>
      )}

      {valueRanking.length > 0 && (
        <section className="bench-ranking">
          <h3>TOP 5 · VAN INCREMENTAL*</h3>
          {valueRanking.map((bench, index) => (
            <button
              key={bench.id}
              type="button"
              className={bench.id === selected?.id ? 'selected' : ''}
              onClick={() => setBenchId(bench.id)}
            >
              <span className="rank">#{index + 1}</span>
              <span className="name">{bench.id}</span>
              <span className="bar"><i style={{ width: `${Math.max(8, Math.abs(bench.incrementalNpvUsdM) / maxRankingValue * 100)}%` }} /></span>
              <b>{money(bench.incrementalNpvUsdM)}</b>
            </button>
          ))}
        </section>
      )}

      <p className="bench-note">
        Cotas, triángulos y área son geométricos. Los campos con * son proxies analíticos; su validación requiere sólidos cerrados o modelo de bloques. El panel usa el escenario económico guardado.
      </p>
    </aside>
  );
}
