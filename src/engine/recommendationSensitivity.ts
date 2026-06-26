import {
  calculateOptimization,
  createEconomicInputs,
  type EconomicInputKey,
  type EconomicInputs,
  type OptimizationResults,
} from './economicModel';
import type { PhaseComparisonSnapshot } from './phaseComparison';
import {
  recommendOptimalPhase,
  type DecisionProfile,
  type PhaseRecommendationResult,
} from './valueRiskRecommendation';

export type SensitivityDirection = 'low' | 'base' | 'high';

export type SensitivityParameterKey = Extract<
  EconomicInputKey,
  | 'metalPriceUsdPerTonne'
  | 'wacc'
  | 'miningCostUsdPerTonneMoved'
  | 'processingCostUsdPerTonneOre'
  | 'stripRatio'
  | 'annualProductionMt'
>;

export interface PhaseGeometryBasis {
  phase: number;
  geometryId: string;
  benchCount: number;
  triangleCount: number;
  surfaceAreaHa: number;
  minElevationM: number;
  maxElevationM: number;
}

export interface SensitivityParameterDefinition {
  key: SensitivityParameterKey;
  label: string;
  unit: string;
  valueDigits: number;
  favorableDirection: 'higher' | 'lower' | 'mixed';
}

export interface SensitivityScenario {
  id: string;
  parameter: SensitivityParameterKey | 'base';
  parameterLabel: string;
  direction: SensitivityDirection;
  inputValue: number;
  inputs: EconomicInputs;
  optimization: OptimizationResults;
  recommendation: PhaseRecommendationResult;
  recommendedPhase: number;
  recommendedPhaseNpvUsdM: number;
  totalNpvUsdM: number;
  npvDeltaUsdM: number;
  phaseChanged: boolean;
}

export interface SensitivityRow {
  definition: SensitivityParameterDefinition;
  baseValue: number;
  low: SensitivityScenario;
  base: SensitivityScenario;
  high: SensitivityScenario;
  npvRangeUsdM: number;
  phaseSwitches: number;
  critical: boolean;
}

export interface RecommendationRobustnessResult {
  profile: DecisionProfile;
  variation: number;
  base: SensitivityScenario;
  scenarios: SensitivityScenario[];
  rows: SensitivityRow[];
  stabilityPercent: number;
  stableScenarioCount: number;
  totalScenarioCount: number;
  alternativePhases: number[];
  robustness: 'high' | 'medium' | 'low';
  worstCaseScenario: SensitivityScenario;
  bestCaseScenario: SensitivityScenario;
  mostSensitiveParameter: SensitivityParameterDefinition;
  phaseSwitchRows: SensitivityRow[];
  notes: string[];
  methodology: 'one-at-a-time';
}

export const SENSITIVITY_PARAMETERS: SensitivityParameterDefinition[] = [
  {
    key: 'metalPriceUsdPerTonne',
    label: 'Precio del metal',
    unit: 'US$/t',
    valueDigits: 0,
    favorableDirection: 'higher',
  },
  {
    key: 'wacc',
    label: 'WACC',
    unit: '%',
    valueDigits: 2,
    favorableDirection: 'lower',
  },
  {
    key: 'miningCostUsdPerTonneMoved',
    label: 'Costo de mina',
    unit: 'US$/t movida',
    valueDigits: 2,
    favorableDirection: 'lower',
  },
  {
    key: 'processingCostUsdPerTonneOre',
    label: 'Costo de planta',
    unit: 'US$/t mineral',
    valueDigits: 2,
    favorableDirection: 'lower',
  },
  {
    key: 'stripRatio',
    label: 'Strip ratio',
    unit: 't/t',
    valueDigits: 2,
    favorableDirection: 'lower',
  },
  {
    key: 'annualProductionMt',
    label: 'Producción anual',
    unit: 'Mt/año',
    valueDigits: 1,
    favorableDirection: 'mixed',
  },
];

function clampPositive(value: number): number {
  return Math.max(value, 0.0001);
}

function scenarioValue(
  baseValue: number,
  direction: Exclude<SensitivityDirection, 'base'>,
  variation: number,
): number {
  const multiplier = direction === 'low' ? 1 - variation : 1 + variation;
  return clampPositive(baseValue * multiplier);
}

function buildPhaseSnapshots(
  basis: PhaseGeometryBasis[],
  optimization: OptimizationResults,
): PhaseComparisonSnapshot[] {
  const maximumPhase = Math.max(...basis.map((item) => item.phase), 1);

  return basis.map((item) => {
    const fraction = item.phase / maximumPhase;
    return {
      phase: item.phase,
      geometryId: item.geometryId,
      benchCount: item.benchCount,
      triangleCount: item.triangleCount,
      surfaceAreaHa: item.surfaceAreaHa,
      minElevationM: item.minElevationM,
      maxElevationM: item.maxElevationM,
      resourceMt: optimization.bestScenario.tonnage * fraction,
      gradePercent:
        optimization.bestScenario.grade * (1.08 - 0.08 * fraction),
      stripRatio:
        optimization.inputs.stripRatio * (0.78 + 0.22 * fraction),
      npvUsdM: optimization.maxVAN * Math.pow(fraction, 0.92),
    };
  });
}

function buildScenario(
  id: string,
  parameter: SensitivityParameterKey | 'base',
  parameterLabel: string,
  direction: SensitivityDirection,
  inputValue: number,
  inputs: EconomicInputs,
  basis: PhaseGeometryBasis[],
  profile: DecisionProfile,
  basePhase: number | null,
  baseNpvUsdM: number,
): SensitivityScenario {
  const optimization = calculateOptimization(inputs);
  const snapshots = buildPhaseSnapshots(basis, optimization);
  const recommendation = recommendOptimalPhase(snapshots, profile);
  const recommendedSnapshot = snapshots.find(
    (item) => item.phase === recommendation.recommended.phase,
  );

  return {
    id,
    parameter,
    parameterLabel,
    direction,
    inputValue,
    inputs,
    optimization,
    recommendation,
    recommendedPhase: recommendation.recommended.phase,
    recommendedPhaseNpvUsdM: recommendedSnapshot?.npvUsdM ?? 0,
    totalNpvUsdM: optimization.maxVAN,
    npvDeltaUsdM: optimization.maxVAN - baseNpvUsdM,
    phaseChanged:
      basePhase !== null && recommendation.recommended.phase !== basePhase,
  };
}

function classifyRobustness(stabilityPercent: number): 'high' | 'medium' | 'low' {
  if (stabilityPercent >= 85) return 'high';
  if (stabilityPercent >= 65) return 'medium';
  return 'low';
}

export function analyzeRecommendationRobustness(
  baseInputs: EconomicInputs,
  basis: PhaseGeometryBasis[],
  profile: DecisionProfile = 'balanced',
  variation = 0.2,
): RecommendationRobustnessResult {
  if (basis.length === 0) {
    throw new Error('Se requiere al menos una fase geométrica para analizar sensibilidad.');
  }
  if (!Number.isFinite(variation) || variation <= 0 || variation >= 1) {
    throw new Error('La variación de sensibilidad debe estar entre 0 y 1.');
  }

  const normalizedInputs = createEconomicInputs(baseInputs);
  const baseOptimization = calculateOptimization(normalizedInputs);
  const baseSnapshots = buildPhaseSnapshots(basis, baseOptimization);
  const baseRecommendation = recommendOptimalPhase(baseSnapshots, profile);
  const basePhase = baseRecommendation.recommended.phase;
  const baseScenario = buildScenario(
    'base',
    'base',
    'Escenario base',
    'base',
    0,
    normalizedInputs,
    basis,
    profile,
    null,
    baseOptimization.maxVAN,
  );

  const scenarios: SensitivityScenario[] = [baseScenario];
  const rows: SensitivityRow[] = [];

  for (const definition of SENSITIVITY_PARAMETERS) {
    const baseValue = normalizedInputs[definition.key];
    const lowValue = scenarioValue(baseValue, 'low', variation);
    const highValue = scenarioValue(baseValue, 'high', variation);
    const lowInputs = createEconomicInputs({
      ...normalizedInputs,
      [definition.key]: lowValue,
    });
    const highInputs = createEconomicInputs({
      ...normalizedInputs,
      [definition.key]: highValue,
    });

    const low = buildScenario(
      `${definition.key}-low`,
      definition.key,
      definition.label,
      'low',
      lowValue,
      lowInputs,
      basis,
      profile,
      basePhase,
      baseOptimization.maxVAN,
    );
    const high = buildScenario(
      `${definition.key}-high`,
      definition.key,
      definition.label,
      'high',
      highValue,
      highInputs,
      basis,
      profile,
      basePhase,
      baseOptimization.maxVAN,
    );

    scenarios.push(low, high);
    const phaseSwitches = Number(low.phaseChanged) + Number(high.phaseChanged);
    rows.push({
      definition,
      baseValue,
      low,
      base: baseScenario,
      high,
      npvRangeUsdM: Math.abs(high.totalNpvUsdM - low.totalNpvUsdM),
      phaseSwitches,
      critical: phaseSwitches > 0,
    });
  }

  const stableScenarioCount = scenarios.filter(
    (scenario) => scenario.recommendedPhase === basePhase,
  ).length;
  const totalScenarioCount = scenarios.length;
  const stabilityPercent = (stableScenarioCount / totalScenarioCount) * 100;
  const orderedByNpv = [...scenarios].sort(
    (left, right) => left.totalNpvUsdM - right.totalNpvUsdM,
  );
  const mostSensitiveRow = [...rows].sort(
    (left, right) => right.npvRangeUsdM - left.npvRangeUsdM,
  )[0];

  return {
    profile,
    variation,
    base: baseScenario,
    scenarios,
    rows,
    stabilityPercent,
    stableScenarioCount,
    totalScenarioCount,
    alternativePhases: Array.from(
      new Set(
        scenarios
          .map((scenario) => scenario.recommendedPhase)
          .filter((phase) => phase !== basePhase),
      ),
    ).sort((left, right) => left - right),
    robustness: classifyRobustness(stabilityPercent),
    worstCaseScenario: orderedByNpv[0],
    bestCaseScenario: orderedByNpv.at(-1) ?? orderedByNpv[0],
    mostSensitiveParameter: mostSensitiveRow.definition,
    phaseSwitchRows: rows.filter((row) => row.critical),
    notes: [
      'El análisis modifica un parámetro por vez y mantiene los demás constantes.',
      'La estabilidad mide cuántos escenarios conservan la fase recomendada del caso base.',
      'Los resultados económicos y la fase recomendada siguen siendo analíticos hasta integrar modelo de bloques y restricciones operativas.',
    ],
    methodology: 'one-at-a-time',
  };
}

export function formatSensitivityValue(
  definition: SensitivityParameterDefinition,
  value: number,
): string {
  const displayValue = definition.key === 'wacc' ? value * 100 : value;
  return `${displayValue.toFixed(definition.valueDigits)} ${definition.unit}`;
}
