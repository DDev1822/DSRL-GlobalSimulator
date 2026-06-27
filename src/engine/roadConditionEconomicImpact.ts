import type { BenchHeightM } from './blockBenchInventory';
import type { InventoryScope } from './blockInventory';
import type { BlockCostBasis, GradeConfirmation } from './blockEconomicClassification';
import type { SupportedPhase } from './blockModelContract';
import type { EconomicInputs } from './economicModel';
import {
  buildPreliminaryHaulageLogistics,
  createPreliminaryHaulageInputs,
  validatePreliminaryHaulageInputs,
  type HaulageRouteId,
  type PreliminaryHaulageInputs,
  type PreliminaryHaulageLogisticsReport,
  type PreliminaryHaulageRouteDefinition,
} from './preliminaryHaulageLogistics';
import type { BlockModelDataset } from '../utils/blockModelParser';

export type RoadConditionClass = 'good' | 'fair' | 'poor' | 'critical' | 'custom';
export type RoadConditionBasis = 'dsrl-scenario' | 'field-observation' | 'instrumented';
export type RoadExposureStatus = 'neutral' | 'economic-loss' | 'economic-gain';

export interface RoadConditionPreset {
  conditionClass: Exclude<RoadConditionClass, 'custom'>;
  label: string;
  rrDeltaPercent: number;
  loadedSpeedFactor: number;
  emptySpeedFactor: number;
  fuelBurnFactor: number;
  maintenanceCostFactor: number;
  tireCostFactor: number;
  otherCostFactor: number;
  addedDelayMinutes: number;
}

export interface RoadConditionRouteInput {
  routeId: HaulageRouteId;
  conditionClass: RoadConditionClass;
  currentRollingResistancePercent: number;
  targetRollingResistancePercent: number;
  loadedSpeedFactor: number;
  emptySpeedFactor: number;
  fuelBurnFactor: number;
  maintenanceCostFactor: number;
  tireCostFactor: number;
  otherCostFactor: number;
  addedDelayMinutes: number;
  confidence: number;
  basis: RoadConditionBasis;
}

export interface RoadConditionInputs {
  haulage: PreliminaryHaulageInputs;
  routes: Record<HaulageRouteId, RoadConditionRouteInput>;
}

export interface RoadConditionPeriodImpact {
  period: number;
  routeId: HaulageRouteId;
  demandMassMt: number;
  baselineCycleTimeMinutes: number;
  currentCycleTimeMinutes: number;
  cycleTimeIncreaseMinutes: number;
  baselineCapacityMassMt: number;
  currentCapacityMassMt: number;
  capacityLossMt: number;
  additionalCapacityDeficitMt: number;
  baselineTruckHours: number;
  currentTruckHours: number;
  additionalTruckHours: number;
  baselineFuelLiters: number;
  currentFuelLiters: number;
  additionalFuelLiters: number;
  baselineLogisticsCostUsdM: number;
  currentLogisticsCostUsdM: number;
  additionalLogisticsCostUsdM: number;
  baselineMarginAfterHaulageUsdM: number;
  currentMarginAfterHaulageUsdM: number;
  marginErosionUsdM: number;
  recoverableValuePotentialUsdM: number;
  exposureStatus: RoadExposureStatus;
}

export interface RoadConditionRouteImpact {
  routeId: HaulageRouteId;
  label: string;
  conditionClass: RoadConditionClass;
  basis: RoadConditionBasis;
  confidence: number;
  currentRollingResistancePercent: number;
  targetRollingResistancePercent: number;
  rollingResistanceGapPercent: number;
  weightedBaselineCycleTimeMinutes: number;
  weightedCurrentCycleTimeMinutes: number;
  weightedCycleTimeIncreaseMinutes: number;
  demandMassMt: number;
  baselineCapacityMassMt: number;
  currentCapacityMassMt: number;
  capacityLossMt: number;
  additionalCapacityDeficitMt: number;
  additionalTruckHours: number;
  additionalFuelLiters: number;
  additionalFuelCostUsdM: number;
  additionalMaintenanceCostUsdM: number;
  additionalTireCostUsdM: number;
  additionalOtherCostUsdM: number;
  additionalLogisticsCostUsdM: number;
  currentUnitCostUsdPerTonne: number | null;
  unitCostIncreaseUsdPerTonne: number | null;
  marginErosionUsdM: number;
  recoverableValuePotentialUsdM: number;
  exposureStatus: RoadExposureStatus;
  exposureScore: number;
}

export interface RoadConditionEconomicImpactReport {
  sourceName: string;
  phase: SupportedPhase;
  scope: InventoryScope;
  benchHeightM: BenchHeightM;
  costBasis: BlockCostBasis;
  inputs: RoadConditionInputs;
  baselineReport: PreliminaryHaulageLogisticsReport;
  currentReport: PreliminaryHaulageLogisticsReport;
  periods: Array<{
    period: number;
    impacts: Record<HaulageRouteId, RoadConditionPeriodImpact>;
    additionalLogisticsCostUsdM: number;
    marginErosionUsdM: number;
    additionalFuelLiters: number;
    additionalCapacityDeficitMt: number;
  }>;
  routeImpacts: Record<HaulageRouteId, RoadConditionRouteImpact>;
  exposureRanking: HaulageRouteId[];
  totalAdditionalLogisticsCostUsdM: number;
  totalMarginErosionUsdM: number;
  totalRecoverableValuePotentialUsdM: number;
  totalAdditionalFuelLiters: number;
  totalAdditionalFuelCostUsdM: number;
  totalAdditionalMaintenanceCostUsdM: number;
  totalAdditionalTireCostUsdM: number;
  totalAdditionalOtherCostUsdM: number;
  totalCapacityLossMt: number;
  totalAdditionalCapacityDeficitMt: number;
  weightedUnitCostIncreaseUsdPerTonne: number | null;
  highestExposureRoute: HaulageRouteId | null;
  reconciliation: {
    demandMassPreserved: boolean;
    destinationIdentityPreserved: boolean;
    routeCostDeltasClose: boolean;
    periodCostDeltasClose: boolean;
    totalCostDeltaCloses: boolean;
    marginErosionCloses: boolean;
    fuelDeltaCloses: boolean;
    componentDeltasClose: boolean;
    baselineReconciliationsPass: boolean;
    currentReconciliationsPass: boolean;
    noImpossibleNegativeBalances: boolean;
  };
  methodology: {
    conditionPolicy: 'target-versus-current-road-condition-scenario';
    roadConditionObservedByDefault: false;
    rollingResistanceCanBeMeasured: true;
    speedPenaltyModeled: true;
    fuelPenaltyModeled: true;
    tirePenaltyModeled: true;
    maintenancePenaltyModeled: true;
    dynamicRoadDegradationModeled: false;
    interventionOptimizationModeled: false;
    oemRimpullRetardingModeled: false;
    dispatchModeled: false;
    stochasticQueuesModeled: false;
    roadGeometry3dModeled: false;
    projectNpvClaimAllowed: false;
    valueRecoveryClaimAllowed: false;
  };
  notes: string[];
}

export const ROAD_CONDITION_ROUTE_IDS: HaulageRouteId[] = [
  'mill-direct',
  'leach-direct',
  'dump',
  'mill-stockpile',
  'leach-stockpile',
  'mill-reclaim',
  'leach-reclaim',
];

export const ROAD_CONDITION_PRESETS: Record<Exclude<RoadConditionClass, 'custom'>, RoadConditionPreset> = {
  good: {
    conditionClass: 'good',
    label: 'BUENA',
    rrDeltaPercent: 0,
    loadedSpeedFactor: 1,
    emptySpeedFactor: 1,
    fuelBurnFactor: 1,
    maintenanceCostFactor: 1,
    tireCostFactor: 1,
    otherCostFactor: 1,
    addedDelayMinutes: 0,
  },
  fair: {
    conditionClass: 'fair',
    label: 'REGULAR',
    rrDeltaPercent: 1,
    loadedSpeedFactor: 0.93,
    emptySpeedFactor: 0.95,
    fuelBurnFactor: 1.06,
    maintenanceCostFactor: 1.05,
    tireCostFactor: 1.08,
    otherCostFactor: 1.03,
    addedDelayMinutes: 0.5,
  },
  poor: {
    conditionClass: 'poor',
    label: 'MALA',
    rrDeltaPercent: 2.5,
    loadedSpeedFactor: 0.82,
    emptySpeedFactor: 0.87,
    fuelBurnFactor: 1.16,
    maintenanceCostFactor: 1.18,
    tireCostFactor: 1.25,
    otherCostFactor: 1.1,
    addedDelayMinutes: 1.5,
  },
  critical: {
    conditionClass: 'critical',
    label: 'CRÍTICA',
    rrDeltaPercent: 4.5,
    loadedSpeedFactor: 0.68,
    emptySpeedFactor: 0.75,
    fuelBurnFactor: 1.32,
    maintenanceCostFactor: 1.4,
    tireCostFactor: 1.55,
    otherCostFactor: 1.2,
    addedDelayMinutes: 3,
  },
};

const EPS = 1e-10;

function close(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-8 * Math.max(1, Math.abs(left), Math.abs(right));
}

function cloneHaulageInputs(inputs: PreliminaryHaulageInputs): PreliminaryHaulageInputs {
  const routes = {} as Record<HaulageRouteId, PreliminaryHaulageRouteDefinition>;
  for (const id of ROAD_CONDITION_ROUTE_IDS) routes[id] = { ...inputs.routes[id] };

  return {
    economics: {
      ...inputs.economics,
      routeRecovery: {
        ...inputs.economics.routeRecovery,
        routes: {
          mill: { ...inputs.economics.routeRecovery.routes.mill },
          leach: { ...inputs.economics.routeRecovery.routes.leach },
        },
      },
      routes: {
        mill: { ...inputs.economics.routes.mill },
        leach: { ...inputs.economics.routes.leach },
      },
    },
    routes,
  };
}

function routeCondition(
  routeId: HaulageRouteId,
  targetRollingResistancePercent: number,
  conditionClass: Exclude<RoadConditionClass, 'custom'>,
  overrides: Partial<RoadConditionRouteInput> = {},
): RoadConditionRouteInput {
  const preset = ROAD_CONDITION_PRESETS[conditionClass];
  return {
    conditionClass,
    currentRollingResistancePercent: targetRollingResistancePercent + preset.rrDeltaPercent,
    targetRollingResistancePercent,
    loadedSpeedFactor: preset.loadedSpeedFactor,
    emptySpeedFactor: preset.emptySpeedFactor,
    fuelBurnFactor: preset.fuelBurnFactor,
    maintenanceCostFactor: preset.maintenanceCostFactor,
    tireCostFactor: preset.tireCostFactor,
    otherCostFactor: preset.otherCostFactor,
    addedDelayMinutes: preset.addedDelayMinutes,
    confidence: 0.5,
    basis: 'dsrl-scenario',
    ...overrides,
    routeId,
  };
}

export function applyRoadConditionPreset(
  current: RoadConditionRouteInput,
  conditionClass: Exclude<RoadConditionClass, 'custom'>,
): RoadConditionRouteInput {
  const preset = ROAD_CONDITION_PRESETS[conditionClass];
  return {
    ...current,
    conditionClass,
    currentRollingResistancePercent: current.targetRollingResistancePercent + preset.rrDeltaPercent,
    loadedSpeedFactor: preset.loadedSpeedFactor,
    emptySpeedFactor: preset.emptySpeedFactor,
    fuelBurnFactor: preset.fuelBurnFactor,
    maintenanceCostFactor: preset.maintenanceCostFactor,
    tireCostFactor: preset.tireCostFactor,
    otherCostFactor: preset.otherCostFactor,
    addedDelayMinutes: preset.addedDelayMinutes,
  };
}

export function createRoadConditionInputs(
  economic: EconomicInputs,
  overrides: {
    haulage?: PreliminaryHaulageInputs;
    routes?: Partial<Record<HaulageRouteId, Partial<RoadConditionRouteInput>>>;
  } = {},
): RoadConditionInputs {
  const haulage = cloneHaulageInputs(overrides.haulage ?? createPreliminaryHaulageInputs(economic));
  const defaultClasses: Record<HaulageRouteId, Exclude<RoadConditionClass, 'custom'>> = {
    'mill-direct': 'fair',
    'leach-direct': 'poor',
    dump: 'fair',
    'mill-stockpile': 'good',
    'leach-stockpile': 'fair',
    'mill-reclaim': 'good',
    'leach-reclaim': 'good',
  };
  const routes = {} as Record<HaulageRouteId, RoadConditionRouteInput>;

  for (const id of ROAD_CONDITION_ROUTE_IDS) {
    routes[id] = routeCondition(
      id,
      haulage.routes[id].rollingResistancePercent,
      defaultClasses[id],
      overrides.routes?.[id] ?? {},
    );
  }

  return { haulage, routes };
}

export function validateRoadConditionInputs(inputs: RoadConditionInputs): string[] {
  const errors = validatePreliminaryHaulageInputs(inputs.haulage);

  for (const id of ROAD_CONDITION_ROUTE_IDS) {
    const item = inputs.routes[id];
    if (item.routeId !== id) errors.push(`Identificador de condición de vía inconsistente para ${id}.`);

    for (const [label, value] of [
      ['RR actual', item.currentRollingResistancePercent],
      ['RR objetivo', item.targetRollingResistancePercent],
      ['demora adicional', item.addedDelayMinutes],
    ] as const) {
      if (!Number.isFinite(value) || value < 0) errors.push(`${label} inválido para ${id}.`);
    }

    if (item.currentRollingResistancePercent > 20 || item.targetRollingResistancePercent > 20) {
      errors.push(`RR fuera de rango para ${id}.`);
    }

    for (const [label, value] of [
      ['factor velocidad cargado', item.loadedSpeedFactor],
      ['factor velocidad vacío', item.emptySpeedFactor],
      ['factor combustible', item.fuelBurnFactor],
      ['factor mantenimiento', item.maintenanceCostFactor],
      ['factor neumáticos', item.tireCostFactor],
      ['factor otros costos', item.otherCostFactor],
    ] as const) {
      if (!Number.isFinite(value) || value <= 0 || value > 3) errors.push(`${label} fuera de rango para ${id}.`);
    }

    if (!Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1) {
      errors.push(`Confianza fuera de [0,1] para ${id}.`);
    }
  }

  return errors;
}

function targetRoutes(inputs: RoadConditionInputs): Record<HaulageRouteId, PreliminaryHaulageRouteDefinition> {
  const routes = {} as Record<HaulageRouteId, PreliminaryHaulageRouteDefinition>;
  for (const id of ROAD_CONDITION_ROUTE_IDS) {
    routes[id] = {
      ...inputs.haulage.routes[id],
      rollingResistancePercent: inputs.routes[id].targetRollingResistancePercent,
    };
  }
  return routes;
}

function currentRoutes(inputs: RoadConditionInputs): Record<HaulageRouteId, PreliminaryHaulageRouteDefinition> {
  const routes = {} as Record<HaulageRouteId, PreliminaryHaulageRouteDefinition>;
  for (const id of ROAD_CONDITION_ROUTE_IDS) {
    const base = inputs.haulage.routes[id];
    const condition = inputs.routes[id];
    routes[id] = {
      ...base,
      rollingResistancePercent: condition.currentRollingResistancePercent,
      loadedSpeedKph: base.loadedSpeedKph * condition.loadedSpeedFactor,
      emptySpeedKph: base.emptySpeedKph * condition.emptySpeedFactor,
      fixedDelayMinutes: base.fixedDelayMinutes + condition.addedDelayMinutes,
      fuelBurnLitersPerTruckHour: base.fuelBurnLitersPerTruckHour * condition.fuelBurnFactor,
      maintenanceCostUsdPerTruckHour: base.maintenanceCostUsdPerTruckHour * condition.maintenanceCostFactor,
      tireCostUsdPerTruckHour: base.tireCostUsdPerTruckHour * condition.tireCostFactor,
      otherCostUsdPerTruckHour: base.otherCostUsdPerTruckHour * condition.otherCostFactor,
    };
  }
  return routes;
}

function exposureStatus(deltaCostUsdM: number): RoadExposureStatus {
  if (deltaCostUsdM > EPS) return 'economic-loss';
  if (deltaCostUsdM < -EPS) return 'economic-gain';
  return 'neutral';
}

function weightedAverage(values: Array<{ value: number; weight: number }>): number {
  const weight = values.reduce((sum, item) => sum + item.weight, 0);
  if (weight <= EPS) return 0;
  return values.reduce((sum, item) => sum + item.value * item.weight, 0) / weight;
}

function buildPeriodImpact(
  routeId: HaulageRouteId,
  baseline: PreliminaryHaulageLogisticsReport['periods'][number]['routes'][HaulageRouteId],
  current: PreliminaryHaulageLogisticsReport['periods'][number]['routes'][HaulageRouteId],
): RoadConditionPeriodImpact {
  const additionalLogisticsCostUsdM = current.totalLogisticsCostUsdM - baseline.totalLogisticsCostUsdM;
  const marginErosionUsdM = baseline.marginAfterHaulageUsdM - current.marginAfterHaulageUsdM;

  return {
    period: current.period,
    routeId,
    demandMassMt: current.demandMassMt,
    baselineCycleTimeMinutes: baseline.cycleTimeMinutes,
    currentCycleTimeMinutes: current.cycleTimeMinutes,
    cycleTimeIncreaseMinutes: current.cycleTimeMinutes - baseline.cycleTimeMinutes,
    baselineCapacityMassMt: baseline.capacityMassMt,
    currentCapacityMassMt: current.capacityMassMt,
    capacityLossMt: baseline.capacityMassMt - current.capacityMassMt,
    additionalCapacityDeficitMt: current.capacityDeficitMt - baseline.capacityDeficitMt,
    baselineTruckHours: baseline.requiredTruckHours,
    currentTruckHours: current.requiredTruckHours,
    additionalTruckHours: current.requiredTruckHours - baseline.requiredTruckHours,
    baselineFuelLiters: baseline.fuelLiters,
    currentFuelLiters: current.fuelLiters,
    additionalFuelLiters: current.fuelLiters - baseline.fuelLiters,
    baselineLogisticsCostUsdM: baseline.totalLogisticsCostUsdM,
    currentLogisticsCostUsdM: current.totalLogisticsCostUsdM,
    additionalLogisticsCostUsdM,
    baselineMarginAfterHaulageUsdM: baseline.marginAfterHaulageUsdM,
    currentMarginAfterHaulageUsdM: current.marginAfterHaulageUsdM,
    marginErosionUsdM,
    recoverableValuePotentialUsdM: Math.max(additionalLogisticsCostUsdM, 0),
    exposureStatus: exposureStatus(additionalLogisticsCostUsdM),
  };
}

function buildRouteImpact(
  id: HaulageRouteId,
  inputs: RoadConditionInputs,
  baselineReport: PreliminaryHaulageLogisticsReport,
  currentReport: PreliminaryHaulageLogisticsReport,
  periodImpacts: RoadConditionPeriodImpact[],
): RoadConditionRouteImpact {
  const baseline = baselineReport.routeTotals[id];
  const current = currentReport.routeTotals[id];
  const condition = inputs.routes[id];
  const additionalLogisticsCostUsdM = current.totalLogisticsCostUsdM - baseline.totalLogisticsCostUsdM;
  const demandMassMt = current.demandMassMt;
  const baselineUnitCost = baseline.unitCostUsdPerTonne;
  const currentUnitCost = current.unitCostUsdPerTonne;
  const unitCostIncreaseUsdPerTonne = baselineUnitCost === null || currentUnitCost === null
    ? null
    : currentUnitCost - baselineUnitCost;
  const recoverableValuePotentialUsdM = Math.max(additionalLogisticsCostUsdM, 0);
  const weightedCurrentCycleTimeMinutes = weightedAverage(periodImpacts.map((item) => ({
    value: item.currentCycleTimeMinutes,
    weight: item.demandMassMt,
  })));
  const weightedBaselineCycleTimeMinutes = weightedAverage(periodImpacts.map((item) => ({
    value: item.baselineCycleTimeMinutes,
    weight: item.demandMassMt,
  })));
  const confidenceWeight = 0.5 + 0.5 * condition.confidence;
  const exposureScore = Math.max(0, Math.min(100,
    (recoverableValuePotentialUsdM * 10 + Math.max(current.capacityDeficitMt - baseline.capacityDeficitMt, 0) * 20) * confidenceWeight,
  ));

  return {
    routeId: id,
    label: inputs.haulage.routes[id].label,
    conditionClass: condition.conditionClass,
    basis: condition.basis,
    confidence: condition.confidence,
    currentRollingResistancePercent: condition.currentRollingResistancePercent,
    targetRollingResistancePercent: condition.targetRollingResistancePercent,
    rollingResistanceGapPercent: condition.currentRollingResistancePercent - condition.targetRollingResistancePercent,
    weightedBaselineCycleTimeMinutes,
    weightedCurrentCycleTimeMinutes,
    weightedCycleTimeIncreaseMinutes: weightedCurrentCycleTimeMinutes - weightedBaselineCycleTimeMinutes,
    demandMassMt,
    baselineCapacityMassMt: baseline.capacityMassMt,
    currentCapacityMassMt: current.capacityMassMt,
    capacityLossMt: baseline.capacityMassMt - current.capacityMassMt,
    additionalCapacityDeficitMt: current.capacityDeficitMt - baseline.capacityDeficitMt,
    additionalTruckHours: current.requiredTruckHours - baseline.requiredTruckHours,
    additionalFuelLiters: current.fuelLiters - baseline.fuelLiters,
    additionalFuelCostUsdM: current.fuelCostUsdM - baseline.fuelCostUsdM,
    additionalMaintenanceCostUsdM: current.maintenanceCostUsdM - baseline.maintenanceCostUsdM,
    additionalTireCostUsdM: current.tireCostUsdM - baseline.tireCostUsdM,
    additionalOtherCostUsdM: current.otherCostUsdM - baseline.otherCostUsdM,
    additionalLogisticsCostUsdM,
    currentUnitCostUsdPerTonne: currentUnitCost,
    unitCostIncreaseUsdPerTonne,
    marginErosionUsdM: baseline.marginAfterHaulageUsdM - current.marginAfterHaulageUsdM,
    recoverableValuePotentialUsdM,
    exposureStatus: exposureStatus(additionalLogisticsCostUsdM),
    exposureScore,
  };
}

export function buildRoadConditionEconomicImpact(
  dataset: BlockModelDataset,
  phase: SupportedPhase,
  scope: InventoryScope,
  benchHeightM: BenchHeightM,
  economic: EconomicInputs,
  gradeConfirmation: GradeConfirmation,
  costBasis: BlockCostBasis,
  inputs: RoadConditionInputs,
): RoadConditionEconomicImpactReport {
  const errors = validateRoadConditionInputs(inputs);
  if (errors.length) throw new Error(errors.join(' '));

  const baselineInputs: PreliminaryHaulageInputs = {
    economics: inputs.haulage.economics,
    routes: targetRoutes(inputs),
  };
  const currentInputs: PreliminaryHaulageInputs = {
    economics: inputs.haulage.economics,
    routes: currentRoutes(inputs),
  };

  const baselineReport = buildPreliminaryHaulageLogistics(
    dataset,
    phase,
    scope,
    benchHeightM,
    economic,
    gradeConfirmation,
    costBasis,
    baselineInputs,
  );
  const currentReport = buildPreliminaryHaulageLogistics(
    dataset,
    phase,
    scope,
    benchHeightM,
    economic,
    gradeConfirmation,
    costBasis,
    currentInputs,
  );

  const periods = currentReport.periods.map((period, index) => {
    const impacts = {} as Record<HaulageRouteId, RoadConditionPeriodImpact>;
    for (const id of ROAD_CONDITION_ROUTE_IDS) {
      impacts[id] = buildPeriodImpact(id, baselineReport.periods[index].routes[id], period.routes[id]);
    }

    return {
      period: period.period,
      impacts,
      additionalLogisticsCostUsdM: ROAD_CONDITION_ROUTE_IDS.reduce(
        (sum, id) => sum + impacts[id].additionalLogisticsCostUsdM,
        0,
      ),
      marginErosionUsdM: ROAD_CONDITION_ROUTE_IDS.reduce((sum, id) => sum + impacts[id].marginErosionUsdM, 0),
      additionalFuelLiters: ROAD_CONDITION_ROUTE_IDS.reduce((sum, id) => sum + impacts[id].additionalFuelLiters, 0),
      additionalCapacityDeficitMt: ROAD_CONDITION_ROUTE_IDS.reduce(
        (sum, id) => sum + impacts[id].additionalCapacityDeficitMt,
        0,
      ),
    };
  });

  const routeImpacts = {} as Record<HaulageRouteId, RoadConditionRouteImpact>;
  for (const id of ROAD_CONDITION_ROUTE_IDS) {
    routeImpacts[id] = buildRouteImpact(
      id,
      inputs,
      baselineReport,
      currentReport,
      periods.map((period) => period.impacts[id]),
    );
  }

  const totalAdditionalFuelCostUsdM = ROAD_CONDITION_ROUTE_IDS.reduce(
    (sum, id) => sum + routeImpacts[id].additionalFuelCostUsdM,
    0,
  );
  const totalAdditionalMaintenanceCostUsdM = ROAD_CONDITION_ROUTE_IDS.reduce(
    (sum, id) => sum + routeImpacts[id].additionalMaintenanceCostUsdM,
    0,
  );
  const totalAdditionalTireCostUsdM = ROAD_CONDITION_ROUTE_IDS.reduce(
    (sum, id) => sum + routeImpacts[id].additionalTireCostUsdM,
    0,
  );
  const totalAdditionalOtherCostUsdM = ROAD_CONDITION_ROUTE_IDS.reduce(
    (sum, id) => sum + routeImpacts[id].additionalOtherCostUsdM,
    0,
  );
  const totalAdditionalLogisticsCostUsdM = currentReport.totalLogisticsCostUsdM - baselineReport.totalLogisticsCostUsdM;
  const totalMarginErosionUsdM = baselineReport.totalMarginAfterHaulageUsdM - currentReport.totalMarginAfterHaulageUsdM;
  const totalAdditionalFuelLiters = currentReport.totalFuelLiters - baselineReport.totalFuelLiters;
  const totalCapacityLossMt = ROAD_CONDITION_ROUTE_IDS.reduce(
    (sum, id) => sum + routeImpacts[id].capacityLossMt,
    0,
  );
  const totalAdditionalCapacityDeficitMt = currentReport.totalCapacityDeficitMt - baselineReport.totalCapacityDeficitMt;
  const totalRecoverableValuePotentialUsdM = ROAD_CONDITION_ROUTE_IDS.reduce(
    (sum, id) => sum + routeImpacts[id].recoverableValuePotentialUsdM,
    0,
  );
  const exposureRanking = [...ROAD_CONDITION_ROUTE_IDS].sort(
    (left, right) => routeImpacts[right].recoverableValuePotentialUsdM - routeImpacts[left].recoverableValuePotentialUsdM,
  );
  const routeDeltaTotal = ROAD_CONDITION_ROUTE_IDS.reduce(
    (sum, id) => sum + routeImpacts[id].additionalLogisticsCostUsdM,
    0,
  );
  const periodDeltaTotal = periods.reduce((sum, period) => sum + period.additionalLogisticsCostUsdM, 0);
  const componentDeltaTotal =
    totalAdditionalFuelCostUsdM +
    totalAdditionalMaintenanceCostUsdM +
    totalAdditionalTireCostUsdM +
    totalAdditionalOtherCostUsdM;
  const allBaselineReconciliationsPass = Object.values(baselineReport.reconciliation).every(Boolean);
  const allCurrentReconciliationsPass = Object.values(currentReport.reconciliation).every(Boolean);

  return {
    sourceName: dataset.sourceName,
    phase,
    scope,
    benchHeightM,
    costBasis,
    inputs: {
      haulage: cloneHaulageInputs(inputs.haulage),
      routes: Object.fromEntries(
        ROAD_CONDITION_ROUTE_IDS.map((id) => [id, { ...inputs.routes[id] }]),
      ) as Record<HaulageRouteId, RoadConditionRouteInput>,
    },
    baselineReport,
    currentReport,
    periods,
    routeImpacts,
    exposureRanking,
    totalAdditionalLogisticsCostUsdM,
    totalMarginErosionUsdM,
    totalRecoverableValuePotentialUsdM,
    totalAdditionalFuelLiters,
    totalAdditionalFuelCostUsdM,
    totalAdditionalMaintenanceCostUsdM,
    totalAdditionalTireCostUsdM,
    totalAdditionalOtherCostUsdM,
    totalCapacityLossMt,
    totalAdditionalCapacityDeficitMt,
    weightedUnitCostIncreaseUsdPerTonne: currentReport.totalDemandMassMt > EPS
      ? totalAdditionalLogisticsCostUsdM / currentReport.totalDemandMassMt
      : null,
    highestExposureRoute: totalRecoverableValuePotentialUsdM > EPS ? exposureRanking[0] : null,
    reconciliation: {
      demandMassPreserved: close(baselineReport.totalDemandMassMt, currentReport.totalDemandMassMt),
      destinationIdentityPreserved:
        baselineReport.reconciliation.destinationIdentityPreserved && currentReport.reconciliation.destinationIdentityPreserved,
      routeCostDeltasClose: close(routeDeltaTotal, totalAdditionalLogisticsCostUsdM),
      periodCostDeltasClose: close(periodDeltaTotal, totalAdditionalLogisticsCostUsdM),
      totalCostDeltaCloses: close(
        baselineReport.totalLogisticsCostUsdM + totalAdditionalLogisticsCostUsdM,
        currentReport.totalLogisticsCostUsdM,
      ),
      marginErosionCloses: close(totalMarginErosionUsdM, totalAdditionalLogisticsCostUsdM),
      fuelDeltaCloses: close(
        baselineReport.totalFuelLiters + totalAdditionalFuelLiters,
        currentReport.totalFuelLiters,
      ),
      componentDeltasClose: close(componentDeltaTotal, totalAdditionalLogisticsCostUsdM),
      baselineReconciliationsPass: allBaselineReconciliationsPass,
      currentReconciliationsPass: allCurrentReconciliationsPass,
      noImpossibleNegativeBalances: ROAD_CONDITION_ROUTE_IDS.every((id) => [
        routeImpacts[id].demandMassMt,
        routeImpacts[id].baselineCapacityMassMt,
        routeImpacts[id].currentCapacityMassMt,
        currentReport.routeTotals[id].requiredTruckHours,
        currentReport.routeTotals[id].fuelLiters,
        currentReport.routeTotals[id].totalLogisticsCostUsdM,
      ].every((value) => value >= -EPS)),
    },
    methodology: {
      conditionPolicy: 'target-versus-current-road-condition-scenario',
      roadConditionObservedByDefault: false,
      rollingResistanceCanBeMeasured: true,
      speedPenaltyModeled: true,
      fuelPenaltyModeled: true,
      tirePenaltyModeled: true,
      maintenancePenaltyModeled: true,
      dynamicRoadDegradationModeled: false,
      interventionOptimizationModeled: false,
      oemRimpullRetardingModeled: false,
      dispatchModeled: false,
      stochasticQueuesModeled: false,
      roadGeometry3dModeled: false,
      projectNpvClaimAllowed: false,
      valueRecoveryClaimAllowed: false,
    },
    notes: [
      'La condición objetivo se compara con un escenario actual por ruta sin cambiar NPVPDEST.',
      'Los factores de velocidad, combustible, mantenimiento y neumáticos son supuestos DSRL editables salvo que la base se marque como observación de campo o medición instrumental.',
      'La exposición económica representa costo adicional modelado; no es VAN ni ahorro realizado.',
      'El valor potencial recuperable requiere validar intervención, costo, ventana operacional y respuesta real de la vía.',
      'No se modelan todavía degradación dinámica, mantenimiento óptimo, curvas OEM, Dispatch, colas ni geometría vial 3D.',
    ],
  };
}
