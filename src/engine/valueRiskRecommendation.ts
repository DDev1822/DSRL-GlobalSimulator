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
    valueWeight: 0.35,
    riskWeight: 0.65,
    description: 'Prioriza menor exposición geométrica y operacional relativa.',
  },
  balanced: {
    id: 'balanced',
    label: 'Balanceado',
    valueWeight: 0.55,
    riskWeight: 0.45,
    description: 'Equilibra captura de valor y exposición relativa.',
  },
  aggressive: {
    id: 'aggressive',
    label: 'Agresivo',
    valueWeight: 0.75,
    riskWeight: 0.25,
    description: 'Prioriza captura de valor y tolera mayor exposición relativa.',
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
    const recommendationScore =
      valueScore * profile.valueWeight +
      (100 - riskScore) * profile.riskWeight;

    return {
      phase: snapshot.phase,
      geometryId: snapshot.geometryId,
      valueScore: round(valueScore),
      riskScore: round(riskScore),
      recommendationScore: round(recommendationScore),
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
  const ranking = [...scores].sort(
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

  const reasons = [
    `F${recommended.phase} obtiene el mayor puntaje para el perfil ${profile.label.toLowerCase()}.`,
    `Combina valor ${recommended.valueScore.toFixed(1)}/100 con riesgo relativo ${recommended.riskScore.toFixed(1)}/100.`,
    recommended.isEfficientFrontier
      ? 'La fase pertenece a la frontera eficiente valor–riesgo.'
      : 'La fase gana por ponderación, aunque existe una alternativa no dominada en la frontera.',
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
