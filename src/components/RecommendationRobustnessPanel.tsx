import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { analyzeBenches } from '../engine/benchAnalysis';
import {
  analyzeRecommendationRobustness,
  formatSensitivityValue,
  type PhaseGeometryBasis,
} from '../engine/recommendationSensitivity';
import {
  calculateOptimization,
  createEconomicInputs,
  type EconomicInputs,
} from '../engine/economicModel';
import type { DecisionProfile } from '../engine/valueRiskRecommendation';
import {
  parseDatamineGeometryCatalog,
  type DatamineGeometryCatalog,
} from '../utils/datamineParser';
import './RecommendationRobustnessPanel.css';

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
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(0)} M`;
}

function robustnessLabel(value: 'high' | 'medium' | 'low'): string {
  if (value === 'high') return 'Alta';
  if (value === 'medium') return 'Media';
  return 'Baja';
}

function scenarioTag(phase: number, changed: boolean): string {
  return `${changed ? '↔ ' : ''}F${phase}`;
}

export default function RecommendationRobustnessPanel() {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<DatamineGeometryCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<DecisionProfile>('balanced');
  const [variation, setVariation] = useState(0.2);
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

  const baseInputs = useMemo(() => loadInputs(), [scenarioVersion]);
  const baseOptimization = useMemo(
    () => calculateOptimization(baseInputs),
    [baseInputs],
  );

  const geometryBasis = useMemo<PhaseGeometryBasis[]>(() => {
    if (!catalog) return [];

    return catalog.availablePhases.map((phase) => {
      const geometry = catalog.phases[phase];
      const fraction = phase / Math.max(...catalog.availablePhases, 1);
      const analysis = analyzeBenches(geometry, benchHeightM, {
        phaseResourceMt: baseOptimization.bestScenario.tonnage * fraction,
        phaseNpvUsdM: baseOptimization.maxVAN * Math.pow(fraction, 0.92),
        phaseGradePercent:
          baseOptimization.bestScenario.grade * (1.08 - 0.08 * fraction),
        phaseStripRatio:
          baseInputs.stripRatio * (0.78 + 0.22 * fraction),
      });

      return {
        phase,
        geometryId: geometry.dataSource.geometryId ?? `PIT_F${phase}`,
        benchCount: analysis.benches.length,
        triangleCount: geometry.validation.stats.totalTriangles,
        surfaceAreaHa: analysis.totalSurfaceAreaM2 / 10_000,
        minElevationM: geometry.bounds.minZ,
        maxElevationM: geometry.bounds.maxZ,
      };
    });
  }, [catalog, benchHeightM, baseOptimization, baseInputs.stripRatio]);

  const robustness = useMemo(() => {
    if (geometryBasis.length === 0) return null;
    return analyzeRecommendationRobustness(
      baseInputs,
      geometryBasis,
      profile,
      variation,
    );
  }, [baseInputs, geometryBasis, profile, variation]);

  const maxImpact = Math.max(
    ...(robustness?.rows.flatMap((row) => [
      Math.abs(row.low.npvDeltaUsdM),
      Math.abs(row.high.npvDeltaUsdM),
    ]) ?? [1]),
    1,
  );

  if (!open) {
    return (
      <button
        type="button"
        className="robustness-toggle"
        onClick={() => {
          setScenarioVersion((value) => value + 1);
          setOpen(true);
        }}
      >
        ROBUSTEZ
      </button>
    );
  }

  return (
    <aside className="robustness-panel" aria-label="Sensibilidad y robustez">
      <header>
        <strong>ETAPA 7 · SENSIBILIDAD Y ROBUSTEZ</strong>
        <button type="button" onClick={() => setOpen(false)} title="Cerrar">
          <X size={15} />
        </button>
      </header>

      <div className="robustness-controls">
        <label>
          <span>PERFIL</span>
          <select
            value={profile}
            onChange={(event) =>
              setProfile(event.target.value as DecisionProfile)
            }
          >
            <option value="conservative">Conservador</option>
            <option value="balanced">Balanceado</option>
            <option value="aggressive">Agresivo</option>
          </select>
        </label>
        <label>
          <span>VARIACIÓN</span>
          <select
            value={variation}
            onChange={(event) => setVariation(Number(event.target.value))}
          >
            <option value={0.1}>±10 %</option>
            <option value={0.2}>±20 %</option>
            <option value={0.3}>±30 %</option>
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

      {error && <div className="robustness-status">{error}</div>}
      {!error && !robustness && (
        <div className="robustness-status">Ejecutando escenarios de sensibilidad…</div>
      )}

      {robustness && (
        <>
          <section className="robustness-summary">
            <div className={`robustness-grade ${robustness.robustness}`}>
              {robustness.stabilityPercent.toFixed(0)}%
            </div>
            <div>
              <span>ROBUSTEZ {robustnessLabel(robustness.robustness).toUpperCase()}</span>
              <strong>F{robustness.base.recommendedPhase}</strong>
              <small>
                {robustness.stableScenarioCount} de {robustness.totalScenarioCount} escenarios conservan la recomendación base.
              </small>
            </div>
          </section>

          <section className="robustness-kpis">
            <div>
              <span>Fases alternativas</span>
              <b>{robustness.alternativePhases.length > 0 ? robustness.alternativePhases.map((phase) => `F${phase}`).join(' · ') : 'Ninguna'}</b>
            </div>
            <div>
              <span>Parámetro dominante</span>
              <b>{robustness.mostSensitiveParameter.label}</b>
            </div>
            <div>
              <span>Peor VAN</span>
              <b>${robustness.worstCaseScenario.totalNpvUsdM.toFixed(0)} M</b>
              <small>{robustness.worstCaseScenario.parameterLabel}</small>
            </div>
            <div>
              <span>Mejor VAN</span>
              <b>${robustness.bestCaseScenario.totalNpvUsdM.toFixed(0)} M</b>
              <small>{robustness.bestCaseScenario.parameterLabel}</small>
            </div>
          </section>

          <section className="sensitivity-matrix">
            <h3>MATRIZ BAJO · BASE · ALTO</h3>
            <div className="sensitivity-head">
              <span>Variable</span><span>Bajo</span><span>Base</span><span>Alto</span>
            </div>
            {robustness.rows.map((row) => (
              <div key={row.definition.key} className={`sensitivity-row ${row.critical ? 'critical' : ''}`}>
                <span className="variable">
                  <b>{row.definition.label}</b>
                  <small>{row.critical ? 'CAMBIA FASE' : 'estable'}</small>
                </span>
                <span>
                  <b>{scenarioTag(row.low.recommendedPhase, row.low.phaseChanged)}</b>
                  <small>{formatSensitivityValue(row.definition, row.low.inputValue)}</small>
                  <em>{money(row.low.npvDeltaUsdM)}</em>
                </span>
                <span>
                  <b>F{row.base.recommendedPhase}</b>
                  <small>{formatSensitivityValue(row.definition, row.baseValue)}</small>
                  <em>$0 M</em>
                </span>
                <span>
                  <b>{scenarioTag(row.high.recommendedPhase, row.high.phaseChanged)}</b>
                  <small>{formatSensitivityValue(row.definition, row.high.inputValue)}</small>
                  <em>{money(row.high.npvDeltaUsdM)}</em>
                </span>
              </div>
            ))}
          </section>

          <section className="tornado-chart">
            <h3>TORNADO · IMPACTO EN VAN</h3>
            {robustness.rows
              .slice()
              .sort((left, right) => right.npvRangeUsdM - left.npvRangeUsdM)
              .map((row) => {
                const lowWidth = Math.abs(row.low.npvDeltaUsdM) / maxImpact * 48;
                const highWidth = Math.abs(row.high.npvDeltaUsdM) / maxImpact * 48;
                return (
                  <div key={row.definition.key} className={row.critical ? 'critical' : ''}>
                    <span>{row.definition.label}</span>
                    <div className="tornado-track">
                      <i className="low" style={{ width: `${lowWidth}%` }} />
                      <i className="high" style={{ width: `${highWidth}%` }} />
                    </div>
                    <b>{money(row.low.npvDeltaUsdM)} / {money(row.high.npvDeltaUsdM)}</b>
                  </div>
                );
              })}
          </section>

          <p className="robustness-note">
            Metodología one-at-a-time: cambia una variable y mantiene las demás constantes. Una robustez baja indica que la fase recomendada depende fuertemente de los supuestos. No sustituye simulación probabilística ni modelo de bloques.
          </p>
        </>
      )}
    </aside>
  );
}
