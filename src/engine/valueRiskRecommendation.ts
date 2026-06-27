import type { PhaseComparisonSnapshot } from './phaseComparison';

export type DecisionProfile = 'conservative' | 'balanced' | 'aggressive';

export interface DecisionProfileDefinition {
  id: DecisionProfile;
  label: string;
  valueWeight: number;
  riskWeight: number;
  description: string;
}

export interface PhaseValueRiskScore {
  phase: number;
  geometryId: string;
  valueScore: number;
  riskScore: number;
  recommendationScore: number;
  isEfficientFrontier: boolean;
  valueMetrics: {
    npvScore: number;
    resourceScore: number;
    gradeScore: number;
    valueDensityScore: number;
  };
  riskMetrics: {
    depthScore: number;
    stripRatioScore: number;
    footprintScore: number;
    complexityScore: number;
  };
  snapshot: PhaseComparisonSnapshot;
}

export interface PhaseRecommendationResult {
  profile: DecisionProfileDefinition;
  recommended: PhaseValueRiskScore;
  runnerUp: PhaseValueRiskScore | null;
  lowerAlternative: PhaseValueRiskScore | null;
  upperAlternative: PhaseValueRiskScore | null;
  scores: PhaseValueRiskScore[];
  frontier: PhaseValueRiskScore[];
  confidence: 'low' | 'medium' | 'high';
  scoreGap: number;
  reasons: string[];
  cautions: string[];
  geometryQuality: 'surface-derived';
  economicsQuality: 'analytical-proxy';
  riskQuality: 'relative-screening-not-geotechnical';
}

export const DECISION_PROFILES: Record<DecisionProfile, DecisionProfileDefinition> = {
  conservative: {
    id: 'conservative',
    label: 'Conservador',
    valueWeight: 0.2,
    riskWeight: 0.8,
    description: 'Prioriza el extremo de menor exposición relativa dentro de la frontera eficiente.',
  },
  balanced: {
    id: 'balanced',
    label: 'Balanceado',
    valueWeight: 0.5,
    riskWeight: 0.5,
    description: 'Busca el punto rodilla más cercano al ideal de alto valor y bajo riesgo.',
  },
  aggressive: {
    id: 'aggressive',
    label: 'Agresivo',
    valueWeight: 0.9,
    riskWeight: 0.1,
    description: 'Prioriza el extremo de mayor valor dentro de la frontera eficiente.',
  },
};

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalize(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return 0;
  if (Math.abs(maximum - minimum) < 1e-9) return 50;
  return clamp(((value - minimum) / (maximum - minimum)) * 100);
}

function extent(values: number[]): [number, number] {
  return [Math.min(...values), Math.max(...values)];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateEfficientFrontier(
  scores: PhaseValueRiskScore[],
): Set<number> {
  const frontier = new Set<number>();

  for (const candidate of scores) {
    const dominated = scores.some((other) => {
      if (other.phase === candidate.phase) return false;
      const noLessValue = other.valueScore >= candidate.valueScore;
      const noMoreRisk = other.riskScore <= candidate.riskScore;
      const strictlyBetter =
        other.valueScore > candidate.valueScore ||
        other.riskScore < candidate.riskScore;
      return noLessValue && noMoreRisk && strictlyBetter;
    });
    if (!dominated) frontier.add(candidate.phase);
  }

  return frontier;
}

function calculateProfileScore(
  valueScore: number,
  riskScore: number,
  profile: DecisionProfileDefinition,
): number {
  if (profile.id === 'balanced') {
    const valueGap = (100 - valueScore) * profile.valueWeight;
    const riskExposure = riskScore * profile.riskWeight;
    const maximumDistance = Math.hypot(
      100 * profile.valueWeight,
      100 * profile.riskWeight,
    );
    const idealDistance = Math.hypot(valueGap, riskExposure);
    return clamp(100 - (idealDistance / maximumDistance) * 100);
  }

  return clamp(
    valueScore * profile.valueWeight +
      (100 - riskScore) * profile.riskWeight,
  );
}

function nearestAlternative(
  scores: PhaseValueRiskScore[],
  phase: number,
  direction: -1 | 1,
): PhaseValueRiskScore | null {
  const ordered = [...scores].sort((left, right) => left.phase - right.phase);
  const index = ordered.findIndex((item) => item.phase === phase);
  return ordered[index + direction] ?? null;
}

export function recommendOptimalPhase(
  snapshots: PhaseComparisonSnapshot[],
  profileId: DecisionProfile = 'balanced',
): PhaseRecommendationResult {
  if (snapshots.length === 0) {
    throw new Error('Se requiere al menos una fase para recomendar una alternativa.');
  }

  const profile = DECISION_PROFILES[profileId];
  const ordered = [...snapshots].sort((left, right) => left.phase - right.phase);
  const values = {
    npv: extent(ordered.map((item) => item.npvUsdM)),
    resource: extent(ordered.map((item) => item.resourceMt)),
    grade: extent(ordered.map((item) => item.gradePercent)),
    density: extent(
      ordered.map((item) =>
        item.resourceMt > 0 ? item.npvUsdM / item.resourceMt : 0,
      ),
    ),
    depth: extent(
      ordered.map((item) => item.maxElevationM - item.minElevationM),
    ),
    strip: extent(ordered.map((item) => item.stripRatio)),
    footprint: extent(ordered.map((item) => item.surfaceAreaHa)),
    complexity: extent(
      ordered.map((item) => item.benchCount + item.triangleCount / 10_000),
    ),
  };

  const provisional: PhaseValueRiskScore[] = ordered.map((snapshot) => {
    const valueDensity =
      snapshot.resourceMt > 0 ? snapshot.npvUsdM / snapshot.resourceMt : 0;
    const complexity = snapshot.benchCount + snapshot.triangleCount / 10_000;

    const valueMetrics = {
      npvScore: normalize(snapshot.npvUsdM, ...values.npv),
      resourceScore: normalize(snapshot.resourceMt, ...values.resource),
      gradeScore: normalize(snapshot.gradePercent, ...values.grade),
      valueDensityScore: normalize(valueDensity, ...values.density),
    };
    const riskMetrics = {
      depthScore: normalize(
        snapshot.maxElevationM - snapshot.minElevationM,
        ...values.depth,
      ),
      stripRatioScore: normalize(snapshot.stripRatio, ...values.strip),
      footprintScore: normalize(snapshot.surfaceAreaHa, ...values.footprint),
      complexityScore: normalize(complexity, ...values.complexity),
    };

    const valueScore =
      valueMetrics.npvScore * 0.5 +
      valueMetrics.resourceScore * 0.2 +
      valueMetrics.gradeScore * 0.15 +
      valueMetrics.valueDensityScore * 0.15;
    const riskScore =
      riskMetrics.depthScore * 0.35 +
      riskMetrics.stripRatioScore * 0.3 +
      riskMetrics.footprintScore * 0.2 +
      riskMetrics.complexityScore * 0.15;

    return {
      phase: snapshot.phase,
      geometryId: snapshot.geometryId,
      valueScore: round(valueScore),
      riskScore: round(riskScore),
      recommendationScore: round(
        calculateProfileScore(valueScore, riskScore, profile),
      ),
      isEfficientFrontier: false,
      valueMetrics,
      riskMetrics,
      snapshot,
    };
  });

  const frontierPhases = calculateEfficientFrontier(provisional);
  const scores = provisional.map((score) => ({
    ...score,
    isEfficientFrontier: frontierPhases.has(score.phase),
  }));
  const frontierCandidates = scores.filter(
    (score) => score.isEfficientFrontier,
  );
  const rankingPool =
    frontierCandidates.length > 0 ? frontierCandidates : scores;
  const ranking = [...rankingPool].sort(
    (left, right) =>
      right.recommendationScore - left.recommendationScore ||
      left.riskScore - right.riskScore,
  );
  const recommended = ranking[0];
  const runnerUp = ranking[1] ?? null;
  const scoreGap = runnerUp
    ? recommended.recommendationScore - runnerUp.recommendationScore
    : 100;
  const confidence = scoreGap >= 12 ? 'high' : scoreGap >= 5 ? 'medium' : 'low';

  const profileReason =
    profile.id === 'conservative'
      ? 'El perfil conservador favorece la menor exposición relativa entre las fases eficientes.'
      : profile.id === 'aggressive'
        ? 'El perfil agresivo favorece la mayor captura de valor entre las fases eficientes.'
        : 'El perfil balanceado selecciona el punto rodilla más cercano al ideal valor alto–riesgo bajo.';

  const reasons = [
    `F${recommended.phase} obtiene el mayor puntaje para el perfil ${profile.label.toLowerCase()}.`,
    profileReason,
    `Combina valor ${recommended.valueScore.toFixed(1)}/100 con riesgo relativo ${recommended.riskScore.toFixed(1)}/100.`,
    'La recomendación se elige únicamente entre fases no dominadas de la frontera valor–riesgo.',
  ];

  return {
    profile,
    recommended,
    runnerUp,
    lowerAlternative: nearestAlternative(scores, recommended.phase, -1),
    upperAlternative: nearestAlternative(scores, recommended.phase, 1),
    scores,
    frontier: scores
      .filter((score) => score.isEfficientFrontier)
      .sort((left, right) => left.riskScore - right.riskScore),
    confidence,
    scoreGap: round(scoreGap),
    reasons,
    cautions: [
      'El riesgo es una comparación relativa de geometría y operación; no es un análisis geotécnico.',
      'VAN, recurso y ley por fase son proxies analíticos del escenario guardado.',
      'La decisión final requiere modelo de bloques, geotecnia, secuenciamiento y restricciones operativas.',
    ],
    geometryQuality: 'surface-derived',
    economicsQuality: 'analytical-proxy',
    riskQuality: 'relative-screening-not-geotechnical',
  };
}
