import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { analyzeBenches } from '../engine/benchAnalysis';
import type { PhaseComparisonSnapshot } from '../engine/phaseComparison';
import {
  DECISION_PROFILES,
  recommendOptimalPhase,
  type DecisionProfile,
} from '../engine/valueRiskRecommendation';
import {
  calculateOptimization,
  createEconomicInputs,
  type EconomicInputs,
} from '../engine/economicModel';
import {
  parseDatamineGeometryCatalog,
  type DatamineGeometryCatalog,
} from '../utils/datamineParser';
import './OptimalPhasePanel.css';

const STORAGE_KEY = 'dsrl-global-simulator:economic-scenario:v1';

function loadInputs(): EconomicInputs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? createEconomicInputs(JSON.parse(raw)) : createEconomicInputs();
  } catch {
    return createEconomicInputs();
  }
}

function confidenceLabel(value: 'low' | 'medium' | 'high'): string {
  if (value === 'high') return 'Alta';
  if (value === 'medium') return 'Media';
  return 'Baja';
}

function frontierPath(points: Array<{ riskScore: number; valueScore: number }>): string {
  return points
    .map((point, index) => {
      const x = 28 + (point.riskScore / 100) * 244;
      const y = 174 - (point.valueScore / 100) * 144;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function OptimalPhasePanel() {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<DatamineGeometryCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<DecisionProfile>('balanced');
  const [benchHeightM, setBenchHeightM] = useState(10);
  const [scenarioVersion, setScenarioVersion] = useState(0);

  useEffect(() => {
    parseDatamineGeometryCatalog()
      .then(setCatalog)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : 'No se pudo cargar el catálogo Datamine.',
        ),
      );
  }, []);

  const economics = useMemo(
    () => calculateOptimization(loadInputs()),
    [scenarioVersion],
  );

  const snapshots = useMemo<PhaseComparisonSnapshot[]>(() => {
    if (!catalog) return [];

    return catalog.availablePhases.map((phase) => {
      const geometry = catalog.phases[phase];
      const fraction = phase / 6;
      const analysis = analyzeBenches(geometry, benchHeightM, {
        phaseResourceMt: economics.bestScenario.tonnage * fraction,
        phaseNpvUsdM: economics.maxVAN * Math.pow(fraction, 0.92),
        phaseGradePercent:
          economics.bestScenario.grade * (1.08 - 0.08 * fraction),
        phaseStripRatio:
          economics.inputs.stripRatio * (0.78 + 0.22 * fraction),
      });

      return {
        phase,
        geometryId: geometry.dataSource.geometryId ?? `PIT_F${phase}`,
        benchCount: analysis.benches.length,
        triangleCount: geometry.validation.stats.totalTriangles,
        surfaceAreaHa: analysis.totalSurfaceAreaM2 / 10_000,
        minElevationM: geometry.bounds.minZ,
        maxElevationM: geometry.bounds.maxZ,
        resourceMt: analysis.benches.reduce(
          (sum, bench) => sum + bench.resourceEstimateMt,
          0,
        ),
        gradePercent:
          economics.bestScenario.grade * (1.08 - 0.08 * fraction),
        stripRatio:
          economics.inputs.stripRatio * (0.78 + 0.22 * fraction),
        npvUsdM: economics.maxVAN * Math.pow(fraction, 0.92),
      };
    });
  }, [catalog, economics, benchHeightM]);

  const recommendation = useMemo(
    () =>
      snapshots.length > 0
        ? recommendOptimalPhase(snapshots, profile)
        : null,
    [snapshots, profile],
  );

  if (!open) {
    return (
      <button
        type="button"
        className="optimal-phase-toggle"
        onClick={() => {
          setScenarioVersion((value) => value + 1);
          setOpen(true);
        }}
      >
        FASE ÓPTIMA
      </button>
    );
  }

  return (
    <aside className="optimal-phase-panel" aria-label="Recomendación de fase óptima">
      <header>
        <strong>ETAPA 6 · VALOR–RIESGO</strong>
        <button type="button" onClick={() => setOpen(false)} title="Cerrar">
          <X size={15} />
        </button>
      </header>

      <div className="optimal-controls">
        <label>
          <span>PERFIL DE DECISIÓN</span>
          <select
            value={profile}
            onChange={(event) =>
              setProfile(event.target.value as DecisionProfile)
            }
          >
            {Object.values(DECISION_PROFILES).map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>ALTURA DE BANCO</span>
          <select
            value={benchHeightM}
            onChange={(event) => setBenchHeightM(Number(event.target.value))}
          >
            {[5, 10, 15, 20].map((value) => (
              <option key={value} value={value}>{value} m</option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="optimal-status">{error}</div>}
      {!error && !recommendation && (
        <div className="optimal-status">Calculando frontera valor–riesgo…</div>
      )}

      {recommendation && (
        <>
          <section className="optimal-recommendation">
            <div className="optimal-phase-badge">F{recommendation.recommended.phase}</div>
            <div>
              <span>FASE RECOMENDADA · {recommendation.profile.label.toUpperCase()}</span>
              <strong>{recommendation.recommended.geometryId}</strong>
              <small>{recommendation.profile.description}</small>
            </div>
          </section>

          <section className="optimal-kpis">
            <div><span>Valor</span><b>{recommendation.recommended.valueScore.toFixed(1)}</b><small>/100</small></div>
            <div><span>Riesgo relativo</span><b>{recommendation.recommended.riskScore.toFixed(1)}</b><small>/100</small></div>
            <div><span>Puntaje</span><b>{recommendation.recommended.recommendationScore.toFixed(1)}</b><small>/100</small></div>
            <div><span>Confianza</span><b>{confidenceLabel(recommendation.confidence)}</b><small>Δ {recommendation.scoreGap.toFixed(1)}</small></div>
          </section>

          <section className="value-risk-chart">
            <h3>FRONTERA VALOR–RIESGO</h3>
            <svg viewBox="0 0 300 200" role="img" aria-label="Gráfico valor frente a riesgo">
              <line x1="28" y1="174" x2="280" y2="174" />
              <line x1="28" y1="174" x2="28" y2="20" />
              <text x="225" y="193">RIESGO →</text>
              <text x="4" y="14">VALOR ↑</text>
              <path d={frontierPath(recommendation.frontier)} className="frontier-line" />
              {recommendation.scores.map((score) => {
                const x = 28 + (score.riskScore / 100) * 244;
                const y = 174 - (score.valueScore / 100) * 144;
                const selected = score.phase === recommendation.recommended.phase;
                return (
                  <g key={score.phase} className={selected ? 'selected' : score.isEfficientFrontier ? 'frontier' : ''}>
                    <circle cx={x} cy={y} r={selected ? 9 : 6} />
                    <text x={x + 8} y={y - 7}>F{score.phase}</text>
                  </g>
                );
              })}
            </svg>
          </section>

          <section className="optimal-explanation">
            <h3>POR QUÉ SE RECOMIENDA</h3>
            {recommendation.reasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </section>

          <section className="optimal-alternatives">
            <h3>ALTERNATIVAS DE DECISIÓN</h3>
            <div>
              <span>Inmediatamente menor</span>
              <b>{recommendation.lowerAlternative ? `F${recommendation.lowerAlternative.phase}` : '—'}</b>
            </div>
            <div>
              <span>Segunda mejor puntuación</span>
              <b>{recommendation.runnerUp ? `F${recommendation.runnerUp.phase}` : '—'}</b>
            </div>
            <div>
              <span>Inmediatamente mayor</span>
              <b>{recommendation.upperAlternative ? `F${recommendation.upperAlternative.phase}` : '—'}</b>
            </div>
          </section>

          <section className="frontier-list">
            <h3>FASES NO DOMINADAS</h3>
            {recommendation.frontier.map((score) => (
              <div key={score.phase}>
                <b>F{score.phase}</b>
                <span>Valor {score.valueScore.toFixed(1)}</span>
                <span>Riesgo {score.riskScore.toFixed(1)}</span>
              </div>
            ))}
          </section>

          <p className="optimal-warning">
            El riesgo mostrado es relativo y no sustituye análisis geotécnico. VAN, recurso y ley son proxies del escenario guardado. La recomendación final exige modelo de bloques, geotecnia, secuenciamiento y restricciones operativas.
          </p>
        </>
      )}
    </aside>
  );
}
