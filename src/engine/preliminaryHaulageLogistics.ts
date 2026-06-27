import type { BenchHeightM } from './blockBenchInventory';
import type { InventoryScope } from './blockInventory';
import type { BlockCostBasis, GradeConfirmation } from './blockEconomicClassification';
import type { SupportedPhase } from './blockModelContract';
import type { EconomicInputs } from './economicModel';
import {
  buildIntegratedRouteEconomics,
  createIntegratedRouteEconomicInputs,
  validateIntegratedRouteEconomicInputs,
  type IntegratedRouteEconomicInputs,
  type IntegratedRouteEconomicReport,
} from './integratedRouteEconomics';
import type { BlockModelDataset } from '../utils/blockModelParser';

export type HaulageDestinationId = 'mill' | 'leach' | 'dump' | 'mill-stockpile' | 'leach-stockpile';
export type HaulageRouteId =
  | 'mill-direct'
  | 'leach-direct'
  | 'dump'
  | 'mill-stockpile'
  | 'leach-stockpile'
  | 'mill-reclaim'
  | 'leach-reclaim';
export type HaulageLegType = 'direct' | 'stockpile-in' | 'reclaim' | 'dump';

export interface PreliminaryHaulageRouteDefinition {
  id: HaulageRouteId;
  label: string;
  destinationId: HaulageDestinationId;
  sourceDestination: 'Mill' | 'Leach' | '_DUMP_' | 'Mill Stockpile' | 'Leach Stockpile';
  legType: HaulageLegType;
  loadedDistanceKm: number;
  emptyDistanceKm: number;
  averageLoadedGradePercent: number;
  rollingResistancePercent: number;
  loadedSpeedKph: number;
  emptySpeedKph: number;
  loadingMinutes: number;
  dumpingMinutes: number;
  spottingMinutes: number;
  fixedDelayMinutes: number;
  payloadTonnes: number;
  truckCount: number;
  availability: number;
  utilization: number;
  operatingHoursPerPeriod: number;
  fuelBurnLitersPerTruckHour: number;
  fuelPriceUsdPerLiter: number;
  maintenanceCostUsdPerTruckHour: number;
  tireCostUsdPerTruckHour: number;
  otherCostUsdPerTruckHour: number;
  assumptionBasis: 'dsrl-scenario';
}

export interface PreliminaryHaulageInputs {
  economics: IntegratedRouteEconomicInputs;
  routes: Record<HaulageRouteId, PreliminaryHaulageRouteDefinition>;
}

export interface PreliminaryHaulagePeriodResult {
  period: number;
  routeId: HaulageRouteId;
  destinationId: HaulageDestinationId;
  sourceDestination: PreliminaryHaulageRouteDefinition['sourceDestination'];
  legType: HaulageLegType;
  demandMassMt: number;
  loadedDistanceKm: number;
  emptyDistanceKm: number;
  totalResistancePercent: number;
  loadedTravelTimeMinutes: number;
  emptyTravelTimeMinutes: number;
  cycleTimeMinutes: number;
  effectiveTruckCount: number;
  availableTruckHours: number;
  capacityMassMt: number;
  capacityUtilizationPercent: number | null;
  capacityDeficitMt: number;
  capacitySlackMt: number;
  requiredTrips: number;
  requiredTruckHours: number;
  tonneKilometersM: number;
  fuelLiters: number;
  fuelCostUsdM: number;
  maintenanceCostUsdM: number;
  tireCostUsdM: number;
  otherCostUsdM: number;
  totalLogisticsCostUsdM: number;
  unitCostUsdPerTonne: number | null;
  marginBeforeHaulageUsdM: number;
  marginAfterHaulageUsdM: number;
  discountedLogisticsCostUsdM: number;
  discountedMarginAfterHaulageUsdM: number;
  bottleneck: 'capacity-deficit' | 'cycle-time' | 'fuel-cost' | 'none';
}

export interface PreliminaryHaulageRouteTotals {
  routeId: HaulageRouteId;
  destinationId: HaulageDestinationId;
  sourceDestination: PreliminaryHaulageRouteDefinition['sourceDestination'];
  legType: HaulageLegType;
  demandMassMt: number;
  capacityMassMt: number;
  capacityDeficitMt: number;
  capacitySlackMt: number;
  requiredTrips: number;
  requiredTruckHours: number;
  tonneKilometersM: number;
  fuelLiters: number;
  fuelCostUsdM: number;
  maintenanceCostUsdM: number;
  tireCostUsdM: number;
  otherCostUsdM: number;
  totalLogisticsCostUsdM: number;
  unitCostUsdPerTonne: number | null;
  marginBeforeHaulageUsdM: number;
  marginAfterHaulageUsdM: number;
  discountedLogisticsCostUsdM: number;
  discountedMarginAfterHaulageUsdM: number;
  deficitPeriods: number;
}

export interface HaulageSensitivityCase {
  id: string;
  label: string;
  distanceFactor: number;
  speedFactor: number;
  payloadFactor: number;
  fuelPriceFactor: number;
  hourlyCostFactor: number;
}

export interface HaulageSensitivityResult extends HaulageSensitivityCase {
  totalLogisticsCostUsdM: number;
  weightedUnitCostUsdPerTonne: number | null;
  totalMarginAfterHaulageUsdM: number;
  totalCapacityDeficitMt: number;
  deltaCostUsdM: number;
  deltaMarginUsdM: number;
}

export interface PreliminaryHaulageLogisticsReport {
  sourceName: string;
  phase: SupportedPhase;
  scope: InventoryScope;
  benchHeightM: BenchHeightM;
  costBasis: BlockCostBasis;
  inputs: PreliminaryHaulageInputs;
  economicReport: IntegratedRouteEconomicReport;
  periods: Array<{
    period: number;
    routes: Record<HaulageRouteId, PreliminaryHaulagePeriodResult>;
    primaryHaulageMassMt: number;
    rehandleMassMt: number;
    unknownDestinationMassMt: number;
    totalDemandMassMt: number;
    totalLogisticsCostUsdM: number;
    marginBeforeHaulageUsdM: number;
    marginAfterHaulageUsdM: number;
    discountedMarginAfterHaulageUsdM: number;
    capacityDeficitMt: number;
    bottleneckRoutes: HaulageRouteId[];
  }>;
  routeTotals: Record<HaulageRouteId, PreliminaryHaulageRouteTotals>;
  totalPrimaryHaulageMassMt: number;
  totalRehandleMassMt: number;
  totalDemandMassMt: number;
  totalTonneKilometersM: number;
  totalTruckHours: number;
  totalFuelLiters: number;
  totalFuelCostUsdM: number;
  totalMaintenanceCostUsdM: number;
  totalTireCostUsdM: number;
  totalOtherCostUsdM: number;
  totalLogisticsCostUsdM: number;
  weightedUnitCostUsdPerTonne: number | null;
  totalCapacityDeficitMt: number;
  totalCapacitySlackMt: number;
  totalMarginBeforeHaulageUsdM: number;
  totalMarginAfterHaulageUsdM: number;
  totalDiscountedMarginAfterHaulageUsdM: number;
  routesWithCapacityDeficit: HaulageRouteId[];
  sensitivity: HaulageSensitivityResult[];
  reconciliation: {
    primaryMassCloses: boolean;
    rehandleMassCloses: boolean;
    tripPayloadCloses: boolean;
    capacityDeficitReported: boolean;
    truckHoursNonNegative: boolean;
    fuelNonNegative: boolean;
    costComponentsClose: boolean;
    unitCostCloses: boolean;
    marginAfterHaulageCloses: boolean;
    destinationIdentityPreserved: boolean;
    unknownDestinationsReported: boolean;
    noImpossibleNegativeBalances: boolean;
  };
  methodology: {
    routePolicy: 'observed-destination-fixed-logistics-evaluation';
    observedDestinationField: 'NPVPDEST';
    automaticDestinationReassignmentAllowed: false;
    distanceIsObserved: false;
    speedIsObserved: false;
    fleetIsObserved: false;
    cycleTimeModeled: true;
    capacityModeled: true;
    fuelModeled: true;
    logisticsCostModeled: true;
    oemRimpullRetardingModeled: false;
    dispatchModeled: false;
    stochasticQueuesModeled: false;
    roadGeometry3dModeled: false;
    globalFleetOptimizationModeled: false;
    projectNpvClaimAllowed: false;
    mineScheduleClaimAllowed: false;
    reserveClaimAllowed: false;
  };
  notes: string[];
}

const ROUTE_IDS: HaulageRouteId[] = [
  'mill-direct',
  'leach-direct',
  'dump',
  'mill-stockpile',
  'leach-stockpile',
  'mill-reclaim',
  'leach-reclaim',
];
const EPS = 1e-10;

export const DEFAULT_HAULAGE_SENSITIVITY: HaulageSensitivityCase[] = [
  { id: 'base', label: 'BASE', distanceFactor: 1, speedFactor: 1, payloadFactor: 1, fuelPriceFactor: 1, hourlyCostFactor: 1 },
  { id: 'distance-high', label: 'DISTANCIA +20%', distanceFactor: 1.2, speedFactor: 1, payloadFactor: 1, fuelPriceFactor: 1, hourlyCostFactor: 1 },
  { id: 'speed-low', label: 'VELOCIDAD -15%', distanceFactor: 1, speedFactor: 0.85, payloadFactor: 1, fuelPriceFactor: 1, hourlyCostFactor: 1 },
  { id: 'payload-low', label: 'PAYLOAD -10%', distanceFactor: 1, speedFactor: 1, payloadFactor: 0.9, fuelPriceFactor: 1, hourlyCostFactor: 1 },
  { id: 'fuel-high', label: 'COMBUSTIBLE +20%', distanceFactor: 1, speedFactor: 1, payloadFactor: 1, fuelPriceFactor: 1.2, hourlyCostFactor: 1 },
  { id: 'hourly-high', label: 'COSTO HORARIO +15%', distanceFactor: 1, speedFactor: 1, payloadFactor: 1, fuelPriceFactor: 1, hourlyCostFactor: 1.15 },
];

function close(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-8 * Math.max(1, Math.abs(left), Math.abs(right));
}

function route(
  id: HaulageRouteId,
  label: string,
  destinationId: HaulageDestinationId,
  sourceDestination: PreliminaryHaulageRouteDefinition['sourceDestination'],
  legType: HaulageLegType,
  overrides: Partial<PreliminaryHaulageRouteDefinition> = {},
): PreliminaryHaulageRouteDefinition {
  return {
    loadedDistanceKm: 4,
    emptyDistanceKm: 4,
    averageLoadedGradePercent: 5,
    rollingResistancePercent: 2,
    loadedSpeedKph: 18,
    emptySpeedKph: 28,
    loadingMinutes: 4.5,
    dumpingMinutes: 1.5,
    spottingMinutes: 1,
    fixedDelayMinutes: 1,
    payloadTonnes: 220,
    truckCount: 30,
    availability: 0.85,
    utilization: 0.8,
    operatingHoursPerPeriod: 6000,
    fuelBurnLitersPerTruckHour: 180,
    fuelPriceUsdPerLiter: 1.1,
    maintenanceCostUsdPerTruckHour: 95,
    tireCostUsdPerTruckHour: 45,
    otherCostUsdPerTruckHour: 20,
    ...overrides,
    id,
    label,
    destinationId,
    sourceDestination,
    legType,
    assumptionBasis: 'dsrl-scenario',
  };
}

export function createPreliminaryHaulageInputs(
  economic: EconomicInputs,
  overrides: {
    economics?: IntegratedRouteEconomicInputs;
    routes?: Partial<Record<HaulageRouteId, Partial<PreliminaryHaulageRouteDefinition>>>;
  } = {},
): PreliminaryHaulageInputs {
  const defaults: Record<HaulageRouteId, PreliminaryHaulageRouteDefinition> = {
    'mill-direct': route('mill-direct', 'PIT → MILL', 'mill', 'Mill', 'direct', { loadedDistanceKm: 4.5, emptyDistanceKm: 4.2, truckCount: 32 }),
    'leach-direct': route('leach-direct', 'PIT → LEACH', 'leach', 'Leach', 'direct', { loadedDistanceKm: 6.5, emptyDistanceKm: 6.2, loadedSpeedKph: 16, emptySpeedKph: 26, truckCount: 28 }),
    dump: route('dump', 'PIT → DUMP', 'dump', '_DUMP_', 'dump', { loadedDistanceKm: 3.5, emptyDistanceKm: 3.2, loadedSpeedKph: 20, emptySpeedKph: 30, truckCount: 24, dumpingMinutes: 1 }),
    'mill-stockpile': route('mill-stockpile', 'PIT → MILL STOCKPILE', 'mill-stockpile', 'Mill Stockpile', 'stockpile-in', { loadedDistanceKm: 2.2, emptyDistanceKm: 2, loadedSpeedKph: 20, emptySpeedKph: 30, truckCount: 12 }),
    'leach-stockpile': route('leach-stockpile', 'PIT → LEACH STOCKPILE', 'leach-stockpile', 'Leach Stockpile', 'stockpile-in', { loadedDistanceKm: 2.8, emptyDistanceKm: 2.5, loadedSpeedKph: 19, emptySpeedKph: 29, truckCount: 12 }),
    'mill-reclaim': route('mill-reclaim', 'MILL STOCKPILE → MILL', 'mill', 'Mill Stockpile', 'reclaim', { loadedDistanceKm: 1.2, emptyDistanceKm: 1.2, averageLoadedGradePercent: 1, loadedSpeedKph: 18, emptySpeedKph: 24, loadingMinutes: 3, truckCount: 8, operatingHoursPerPeriod: 5000 }),
    'leach-reclaim': route('leach-reclaim', 'LEACH STOCKPILE → LEACH', 'leach', 'Leach Stockpile', 'reclaim', { loadedDistanceKm: 1.6, emptyDistanceKm: 1.5, averageLoadedGradePercent: 1.5, loadedSpeedKph: 17, emptySpeedKph: 24, loadingMinutes: 3, truckCount: 8, operatingHoursPerPeriod: 5000 }),
  };

  const routes = {} as Record<HaulageRouteId, PreliminaryHaulageRouteDefinition>;
  for (const id of ROUTE_IDS) {
    routes[id] = {
      ...defaults[id],
      ...(overrides.routes?.[id] ?? {}),
      id,
      assumptionBasis: 'dsrl-scenario',
    };
  }

  return {
    economics: overrides.economics ?? createIntegratedRouteEconomicInputs(economic),
    routes,
  };
}

export function validatePreliminaryHaulageInputs(inputs: PreliminaryHaulageInputs): string[] {
  const errors = validateIntegratedRouteEconomicInputs(inputs.economics);

  for (const id of ROUTE_IDS) {
    const item = inputs.routes[id];
    if (item.id !== id) errors.push(`Identificador logístico inconsistente para ${id}.`);

    for (const [label, value] of [
      ['distancia cargado', item.loadedDistanceKm],
      ['distancia vacío', item.emptyDistanceKm],
      ['tiempo carguío', item.loadingMinutes],
      ['tiempo descarga', item.dumpingMinutes],
      ['tiempo posicionamiento', item.spottingMinutes],
      ['demora fija', item.fixedDelayMinutes],
      ['combustible por hora', item.fuelBurnLitersPerTruckHour],
      ['precio combustible', item.fuelPriceUsdPerLiter],
      ['mantenimiento', item.maintenanceCostUsdPerTruckHour],
      ['neumáticos', item.tireCostUsdPerTruckHour],
      ['otros costos', item.otherCostUsdPerTruckHour],
    ] as const) {
      if (!Number.isFinite(value) || value < 0) errors.push(`${label} inválido para ${id}.`);
    }

    for (const [label, value] of [
      ['velocidad cargado', item.loadedSpeedKph],
      ['velocidad vacío', item.emptySpeedKph],
      ['payload', item.payloadTonnes],
      ['horas operativas', item.operatingHoursPerPeriod],
    ] as const) {
      if (!Number.isFinite(value) || value <= 0) errors.push(`${label} debe ser mayor que cero para ${id}.`);
    }

    if (!Number.isInteger(item.truckCount) || item.truckCount < 0) errors.push(`Número de camiones inválido para ${id}.`);
    if (!Number.isFinite(item.availability) || item.availability < 0 || item.availability > 1) errors.push(`Disponibilidad fuera de [0,1] para ${id}.`);
    if (!Number.isFinite(item.utilization) || item.utilization < 0 || item.utilization > 1) errors.push(`Utilización fuera de [0,1] para ${id}.`);
    if (!Number.isFinite(item.averageLoadedGradePercent) || item.averageLoadedGradePercent < -20 || item.averageLoadedGradePercent > 20) errors.push(`Pendiente media fuera de rango para ${id}.`);
    if (!Number.isFinite(item.rollingResistancePercent) || item.rollingResistancePercent < 0 || item.rollingResistancePercent > 20) errors.push(`RR fuera de rango para ${id}.`);
  }

  return errors;
}

function cloneInputs(inputs: PreliminaryHaulageInputs): PreliminaryHaulageInputs {
  const routes = {} as Record<HaulageRouteId, PreliminaryHaulageRouteDefinition>;
  for (const id of ROUTE_IDS) routes[id] = { ...inputs.routes[id] };

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

function evaluateRoute(
  definition: PreliminaryHaulageRouteDefinition,
  period: number,
  demandMassMt: number,
  marginBeforeHaulageUsdM: number,
  discountRate: number,
): PreliminaryHaulagePeriodResult {
  const loadedTravelTimeMinutes = definition.loadedDistanceKm / definition.loadedSpeedKph * 60;
  const emptyTravelTimeMinutes = definition.emptyDistanceKm / definition.emptySpeedKph * 60;
  const cycleTimeMinutes =
    loadedTravelTimeMinutes +
    emptyTravelTimeMinutes +
    definition.loadingMinutes +
    definition.dumpingMinutes +
    definition.spottingMinutes +
    definition.fixedDelayMinutes;

  const effectiveTruckCount = definition.truckCount * definition.availability * definition.utilization;
  const availableTruckHours = effectiveTruckCount * definition.operatingHoursPerPeriod;
  const availableTrips = cycleTimeMinutes > EPS ? availableTruckHours * 60 / cycleTimeMinutes : 0;
  const capacityMassMt = availableTrips * definition.payloadTonnes / 1_000_000;
  const requiredTrips = demandMassMt * 1_000_000 / definition.payloadTonnes;
  const requiredTruckHours = requiredTrips * cycleTimeMinutes / 60;
  const fuelLiters = requiredTruckHours * definition.fuelBurnLitersPerTruckHour;
  const fuelCostUsdM = fuelLiters * definition.fuelPriceUsdPerLiter / 1_000_000;
  const maintenanceCostUsdM = requiredTruckHours * definition.maintenanceCostUsdPerTruckHour / 1_000_000;
  const tireCostUsdM = requiredTruckHours * definition.tireCostUsdPerTruckHour / 1_000_000;
  const otherCostUsdM = requiredTruckHours * definition.otherCostUsdPerTruckHour / 1_000_000;
  const totalLogisticsCostUsdM = fuelCostUsdM + maintenanceCostUsdM + tireCostUsdM + otherCostUsdM;
  const capacityDeficitMt = Math.max(demandMassMt - capacityMassMt, 0);
  const capacitySlackMt = Math.max(capacityMassMt - demandMassMt, 0);
  const discountedLogisticsCostUsdM = totalLogisticsCostUsdM / Math.pow(1 + discountRate, period);
  const marginAfterHaulageUsdM = marginBeforeHaulageUsdM - totalLogisticsCostUsdM;
  const discountedMarginAfterHaulageUsdM =
    marginBeforeHaulageUsdM / Math.pow(1 + discountRate, period) - discountedLogisticsCostUsdM;
  const fuelShare = totalLogisticsCostUsdM > EPS ? fuelCostUsdM / totalLogisticsCostUsdM : 0;

  return {
    period,
    routeId: definition.id,
    destinationId: definition.destinationId,
    sourceDestination: definition.sourceDestination,
    legType: definition.legType,
    demandMassMt,
    loadedDistanceKm: definition.loadedDistanceKm,
    emptyDistanceKm: definition.emptyDistanceKm,
    totalResistancePercent: definition.averageLoadedGradePercent + definition.rollingResistancePercent,
    loadedTravelTimeMinutes,
    emptyTravelTimeMinutes,
    cycleTimeMinutes,
    effectiveTruckCount,
    availableTruckHours,
    capacityMassMt,
    capacityUtilizationPercent: capacityMassMt > EPS ? demandMassMt / capacityMassMt * 100 : demandMassMt > EPS ? null : 0,
    capacityDeficitMt,
    capacitySlackMt,
    requiredTrips,
    requiredTruckHours,
    tonneKilometersM: demandMassMt * definition.loadedDistanceKm,
    fuelLiters,
    fuelCostUsdM,
    maintenanceCostUsdM,
    tireCostUsdM,
    otherCostUsdM,
    totalLogisticsCostUsdM,
    unitCostUsdPerTonne: demandMassMt > EPS ? totalLogisticsCostUsdM / demandMassMt : null,
    marginBeforeHaulageUsdM,
    marginAfterHaulageUsdM,
    discountedLogisticsCostUsdM,
    discountedMarginAfterHaulageUsdM,
    bottleneck: capacityDeficitMt > EPS
      ? 'capacity-deficit'
      : cycleTimeMinutes > 60
        ? 'cycle-time'
        : fuelShare > 0.55
          ? 'fuel-cost'
          : 'none',
  };
}

function periodMasses(
  report: IntegratedRouteEconomicReport,
  index: number,
): Record<HaulageRouteId, number> {
  const recovery = report.routeRecoveryReport.periods[index];
  return {
    'mill-direct': recovery.routes.mill.directFeedMassMt,
    'leach-direct': recovery.routes.leach.directFeedMassMt,
    dump: recovery.nonProcessMassMt,
    'mill-stockpile': recovery.routes.mill.stockpileAddedMassMt,
    'leach-stockpile': recovery.routes.leach.stockpileAddedMassMt,
    'mill-reclaim': recovery.routes.mill.reclaimedMassMt,
    'leach-reclaim': recovery.routes.leach.reclaimedMassMt,
  };
}

function periodMargins(
  report: IntegratedRouteEconomicReport,
  index: number,
): Record<HaulageRouteId, number> {
  const recovery = report.routeRecoveryReport.periods[index];
  const economics = report.periods[index];
  const millFeed = recovery.routes.mill.feedMassMt;
  const leachFeed = recovery.routes.leach.feedMassMt;

  return {
    'mill-direct': millFeed > EPS
      ? economics.routes.mill.operatingMarginUsdM * recovery.routes.mill.directFeedMassMt / millFeed
      : 0,
    'leach-direct': leachFeed > EPS
      ? economics.routes.leach.operatingMarginUsdM * recovery.routes.leach.directFeedMassMt / leachFeed
      : 0,
    dump: 0,
    'mill-stockpile': 0,
    'leach-stockpile': 0,
    'mill-reclaim': millFeed > EPS
      ? economics.routes.mill.operatingMarginUsdM * recovery.routes.mill.reclaimedMassMt / millFeed
      : 0,
    'leach-reclaim': leachFeed > EPS
      ? economics.routes.leach.operatingMarginUsdM * recovery.routes.leach.reclaimedMassMt / leachFeed
      : 0,
  };
}

function aggregateRoute(
  id: HaulageRouteId,
  periods: PreliminaryHaulageLogisticsReport['periods'],
  definition: PreliminaryHaulageRouteDefinition,
): PreliminaryHaulageRouteTotals {
  const items = periods.map((period) => period.routes[id]);
  const demandMassMt = items.reduce((sum, item) => sum + item.demandMassMt, 0);
  const totalLogisticsCostUsdM = items.reduce((sum, item) => sum + item.totalLogisticsCostUsdM, 0);

  return {
    routeId: id,
    destinationId: definition.destinationId,
    sourceDestination: definition.sourceDestination,
    legType: definition.legType,
    demandMassMt,
    capacityMassMt: items.reduce((sum, item) => sum + item.capacityMassMt, 0),
    capacityDeficitMt: items.reduce((sum, item) => sum + item.capacityDeficitMt, 0),
    capacitySlackMt: items.reduce((sum, item) => sum + item.capacitySlackMt, 0),
    requiredTrips: items.reduce((sum, item) => sum + item.requiredTrips, 0),
    requiredTruckHours: items.reduce((sum, item) => sum + item.requiredTruckHours, 0),
    tonneKilometersM: items.reduce((sum, item) => sum + item.tonneKilometersM, 0),
    fuelLiters: items.reduce((sum, item) => sum + item.fuelLiters, 0),
    fuelCostUsdM: items.reduce((sum, item) => sum + item.fuelCostUsdM, 0),
    maintenanceCostUsdM: items.reduce((sum, item) => sum + item.maintenanceCostUsdM, 0),
    tireCostUsdM: items.reduce((sum, item) => sum + item.tireCostUsdM, 0),
    otherCostUsdM: items.reduce((sum, item) => sum + item.otherCostUsdM, 0),
    totalLogisticsCostUsdM,
    unitCostUsdPerTonne: demandMassMt > EPS ? totalLogisticsCostUsdM / demandMassMt : null,
    marginBeforeHaulageUsdM: items.reduce((sum, item) => sum + item.marginBeforeHaulageUsdM, 0),
    marginAfterHaulageUsdM: items.reduce((sum, item) => sum + item.marginAfterHaulageUsdM, 0),
    discountedLogisticsCostUsdM: items.reduce((sum, item) => sum + item.discountedLogisticsCostUsdM, 0),
    discountedMarginAfterHaulageUsdM: items.reduce((sum, item) => sum + item.discountedMarginAfterHaulageUsdM, 0),
    deficitPeriods: items.filter((item) => item.capacityDeficitMt > EPS).length,
  };
}

function scaledRoutes(
  routes: Record<HaulageRouteId, PreliminaryHaulageRouteDefinition>,
  scenario: HaulageSensitivityCase,
): Record<HaulageRouteId, PreliminaryHaulageRouteDefinition> {
  const scaled = {} as Record<HaulageRouteId, PreliminaryHaulageRouteDefinition>;

  for (const id of ROUTE_IDS) {
    const item = routes[id];
    scaled[id] = {
      ...item,
      loadedDistanceKm: item.loadedDistanceKm * scenario.distanceFactor,
      emptyDistanceKm: item.emptyDistanceKm * scenario.distanceFactor,
      loadedSpeedKph: item.loadedSpeedKph * scenario.speedFactor,
      emptySpeedKph: item.emptySpeedKph * scenario.speedFactor,
      payloadTonnes: item.payloadTonnes * scenario.payloadFactor,
      fuelPriceUsdPerLiter: item.fuelPriceUsdPerLiter * scenario.fuelPriceFactor,
      maintenanceCostUsdPerTruckHour: item.maintenanceCostUsdPerTruckHour * scenario.hourlyCostFactor,
      tireCostUsdPerTruckHour: item.tireCostUsdPerTruckHour * scenario.hourlyCostFactor,
      otherCostUsdPerTruckHour: item.otherCostUsdPerTruckHour * scenario.hourlyCostFactor,
    };
  }

  return scaled;
}

export function buildHaulageSensitivity(
  report: Omit<PreliminaryHaulageLogisticsReport, 'sensitivity'>,
  cases: HaulageSensitivityCase[] = DEFAULT_HAULAGE_SENSITIVITY,
): HaulageSensitivityResult[] {
  const baseCost = report.totalLogisticsCostUsdM;
  const baseMargin = report.totalMarginAfterHaulageUsdM;

  return cases.map((scenario) => {
    const routes = scaledRoutes(report.inputs.routes, scenario);
    let totalCost = 0;
    let totalMass = 0;
    let totalDeficit = 0;

    for (const period of report.periods) {
      for (const id of ROUTE_IDS) {
        const source = period.routes[id];
        const evaluated = evaluateRoute(
          routes[id],
          period.period,
          source.demandMassMt,
          source.marginBeforeHaulageUsdM,
          report.inputs.economics.discountRate,
        );
        totalCost += evaluated.totalLogisticsCostUsdM;
        totalMass += evaluated.demandMassMt;
        totalDeficit += evaluated.capacityDeficitMt;
      }
    }

    const marginAfter = report.totalMarginBeforeHaulageUsdM - totalCost;
    return {
      ...scenario,
      totalLogisticsCostUsdM: totalCost,
      weightedUnitCostUsdPerTonne: totalMass > EPS ? totalCost / totalMass : null,
      totalMarginAfterHaulageUsdM: marginAfter,
      totalCapacityDeficitMt: totalDeficit,
      deltaCostUsdM: totalCost - baseCost,
      deltaMarginUsdM: marginAfter - baseMargin,
    };
  });
}

export function buildPreliminaryHaulageLogistics(
  dataset: BlockModelDataset,
  phase: SupportedPhase,
  scope: InventoryScope,
  benchHeightM: BenchHeightM,
  economic: EconomicInputs,
  gradeConfirmation: GradeConfirmation,
  costBasis: BlockCostBasis,
  inputs: PreliminaryHaulageInputs,
): PreliminaryHaulageLogisticsReport {
  const errors = validatePreliminaryHaulageInputs(inputs);
  if (errors.length) throw new Error(errors.join(' '));

  const economicReport = buildIntegratedRouteEconomics(
    dataset,
    phase,
    scope,
    benchHeightM,
    economic,
    gradeConfirmation,
    costBasis,
    inputs.economics,
  );

  const periods = economicReport.periods.map((economicPeriod, index) => {
    const masses = periodMasses(economicReport, index);
    const margins = periodMargins(economicReport, index);
    const routes = {} as Record<HaulageRouteId, PreliminaryHaulagePeriodResult>;

    for (const id of ROUTE_IDS) {
      routes[id] = evaluateRoute(
        inputs.routes[id],
        economicPeriod.period,
        masses[id],
        margins[id],
        inputs.economics.discountRate,
      );
    }

    const primaryHaulageMassMt =
      routes['mill-direct'].demandMassMt +
      routes['leach-direct'].demandMassMt +
      routes.dump.demandMassMt +
      routes['mill-stockpile'].demandMassMt +
      routes['leach-stockpile'].demandMassMt;
    const rehandleMassMt = routes['mill-reclaim'].demandMassMt + routes['leach-reclaim'].demandMassMt;
    const totalDemandMassMt = primaryHaulageMassMt + rehandleMassMt;
    const totalLogisticsCostUsdM = ROUTE_IDS.reduce((sum, id) => sum + routes[id].totalLogisticsCostUsdM, 0);
    const marginBeforeHaulageUsdM = ROUTE_IDS.reduce((sum, id) => sum + routes[id].marginBeforeHaulageUsdM, 0);
    const marginAfterHaulageUsdM = marginBeforeHaulageUsdM - totalLogisticsCostUsdM;
    const discountedMarginAfterHaulageUsdM = ROUTE_IDS.reduce(
      (sum, id) => sum + routes[id].discountedMarginAfterHaulageUsdM,
      0,
    );
    const capacityDeficitMt = ROUTE_IDS.reduce((sum, id) => sum + routes[id].capacityDeficitMt, 0);

    return {
      period: economicPeriod.period,
      routes,
      primaryHaulageMassMt,
      rehandleMassMt,
      unknownDestinationMassMt: economicReport.routeRecoveryReport.periods[index].unknownDestinationMassMt,
      totalDemandMassMt,
      totalLogisticsCostUsdM,
      marginBeforeHaulageUsdM,
      marginAfterHaulageUsdM,
      discountedMarginAfterHaulageUsdM,
      capacityDeficitMt,
      bottleneckRoutes: ROUTE_IDS.filter((id) => routes[id].capacityDeficitMt > EPS),
    };
  });

  const routeTotals = {} as Record<HaulageRouteId, PreliminaryHaulageRouteTotals>;
  for (const id of ROUTE_IDS) routeTotals[id] = aggregateRoute(id, periods, inputs.routes[id]);

  const totalPrimaryHaulageMassMt = periods.reduce((sum, period) => sum + period.primaryHaulageMassMt, 0);
  const totalRehandleMassMt = periods.reduce((sum, period) => sum + period.rehandleMassMt, 0);
  const totalDemandMassMt = totalPrimaryHaulageMassMt + totalRehandleMassMt;
  const totalFuelCostUsdM = ROUTE_IDS.reduce((sum, id) => sum + routeTotals[id].fuelCostUsdM, 0);
  const totalMaintenanceCostUsdM = ROUTE_IDS.reduce((sum, id) => sum + routeTotals[id].maintenanceCostUsdM, 0);
  const totalTireCostUsdM = ROUTE_IDS.reduce((sum, id) => sum + routeTotals[id].tireCostUsdM, 0);
  const totalOtherCostUsdM = ROUTE_IDS.reduce((sum, id) => sum + routeTotals[id].otherCostUsdM, 0);
  const totalLogisticsCostUsdM = totalFuelCostUsdM + totalMaintenanceCostUsdM + totalTireCostUsdM + totalOtherCostUsdM;
  const totalMarginBeforeHaulageUsdM = economicReport.totalOperatingMarginUsdM;
  const totalMarginAfterHaulageUsdM = totalMarginBeforeHaulageUsdM - totalLogisticsCostUsdM;
  const totalDiscountedMarginAfterHaulageUsdM = periods.reduce(
    (sum, period) => sum + period.discountedMarginAfterHaulageUsdM,
    0,
  );
  const totalCapacityDeficitMt = ROUTE_IDS.reduce((sum, id) => sum + routeTotals[id].capacityDeficitMt, 0);
  const totalCapacitySlackMt = ROUTE_IDS.reduce((sum, id) => sum + routeTotals[id].capacitySlackMt, 0);
  const totalUnknownMassMt = periods.reduce((sum, period) => sum + period.unknownDestinationMassMt, 0);
  const totalScheduledMineMassMt = economicReport.routeRecoveryReport.scheduledMineMassMt;
  const expectedRehandleMassMt = economicReport.routeRecoveryReport.periods.reduce(
    (sum, period) => sum + period.routes.mill.reclaimedMassMt + period.routes.leach.reclaimedMassMt,
    0,
  );

  const core: Omit<PreliminaryHaulageLogisticsReport, 'sensitivity'> = {
    sourceName: dataset.sourceName,
    phase,
    scope,
    benchHeightM,
    costBasis,
    inputs: cloneInputs(inputs),
    economicReport,
    periods,
    routeTotals,
    totalPrimaryHaulageMassMt,
    totalRehandleMassMt,
    totalDemandMassMt,
    totalTonneKilometersM: ROUTE_IDS.reduce((sum, id) => sum + routeTotals[id].tonneKilometersM, 0),
    totalTruckHours: ROUTE_IDS.reduce((sum, id) => sum + routeTotals[id].requiredTruckHours, 0),
    totalFuelLiters: ROUTE_IDS.reduce((sum, id) => sum + routeTotals[id].fuelLiters, 0),
    totalFuelCostUsdM,
    totalMaintenanceCostUsdM,
    totalTireCostUsdM,
    totalOtherCostUsdM,
    totalLogisticsCostUsdM,
    weightedUnitCostUsdPerTonne: totalDemandMassMt > EPS ? totalLogisticsCostUsdM / totalDemandMassMt : null,
    totalCapacityDeficitMt,
    totalCapacitySlackMt,
    totalMarginBeforeHaulageUsdM,
    totalMarginAfterHaulageUsdM,
    totalDiscountedMarginAfterHaulageUsdM,
    routesWithCapacityDeficit: ROUTE_IDS.filter((id) => routeTotals[id].capacityDeficitMt > EPS),
    reconciliation: {
      primaryMassCloses: close(totalPrimaryHaulageMassMt + totalUnknownMassMt, totalScheduledMineMassMt),
      rehandleMassCloses: close(totalRehandleMassMt, expectedRehandleMassMt),
      tripPayloadCloses: ROUTE_IDS.every((id) => close(
        routeTotals[id].requiredTrips * inputs.routes[id].payloadTonnes / 1_000_000,
        routeTotals[id].demandMassMt,
      )),
      capacityDeficitReported: ROUTE_IDS.every((id) =>
        routeTotals[id].demandMassMt <= routeTotals[id].capacityMassMt + routeTotals[id].capacityDeficitMt + EPS,
      ),
      truckHoursNonNegative: ROUTE_IDS.every((id) => routeTotals[id].requiredTruckHours >= -EPS),
      fuelNonNegative: ROUTE_IDS.every((id) => routeTotals[id].fuelLiters >= -EPS),
      costComponentsClose: close(
        totalLogisticsCostUsdM,
        totalFuelCostUsdM + totalMaintenanceCostUsdM + totalTireCostUsdM + totalOtherCostUsdM,
      ),
      unitCostCloses: totalDemandMassMt <= EPS || close(
        unitCost(totalLogisticsCostUsdM, totalDemandMassMt) * totalDemandMassMt,
        totalLogisticsCostUsdM,
      ),
      marginAfterHaulageCloses: close(
        totalMarginAfterHaulageUsdM,
        totalMarginBeforeHaulageUsdM - totalLogisticsCostUsdM,
      ),
      destinationIdentityPreserved:
        inputs.routes['mill-direct'].sourceDestination === 'Mill' &&
        inputs.routes['leach-direct'].sourceDestination === 'Leach' &&
        inputs.routes.dump.sourceDestination === '_DUMP_',
      unknownDestinationsReported: economicReport.reconciliation.unknownDestinationsReported,
      noImpossibleNegativeBalances: ROUTE_IDS.every((id) => [
        routeTotals[id].demandMassMt,
        routeTotals[id].capacityMassMt,
        routeTotals[id].requiredTrips,
        routeTotals[id].requiredTruckHours,
        routeTotals[id].fuelLiters,
        routeTotals[id].totalLogisticsCostUsdM,
      ].every((value) => value >= -EPS)),
    },
    methodology: {
      routePolicy: 'observed-destination-fixed-logistics-evaluation',
      observedDestinationField: 'NPVPDEST',
      automaticDestinationReassignmentAllowed: false,
      distanceIsObserved: false,
      speedIsObserved: false,
      fleetIsObserved: false,
      cycleTimeModeled: true,
      capacityModeled: true,
      fuelModeled: true,
      logisticsCostModeled: true,
      oemRimpullRetardingModeled: false,
      dispatchModeled: false,
      stochasticQueuesModeled: false,
      roadGeometry3dModeled: false,
      globalFleetOptimizationModeled: false,
      projectNpvClaimAllowed: false,
      mineScheduleClaimAllowed: false,
      reserveClaimAllowed: false,
    },
    notes: [
      'NPVPDEST se preserva; la etapa no reasigna automáticamente material entre destinos.',
      'Distancias, velocidades, flota, consumo y costos son supuestos DSRL editables.',
      'La resistencia total se reporta, pero no sustituye un modelo OEM rimpull/retarding.',
      'Los costos se calculan con horas-camión requeridas; el déficit muestra si la flota configurada no puede cumplir el periodo.',
      'El margen posterior al acarreo es una referencia operativa y no VAN.',
    ],
  };

  return { ...core, sensitivity: buildHaulageSensitivity(core) };
}

function unitCost(costUsdM: number, massMt: number): number {
  return massMt > EPS ? costUsdM / massMt : 0;
}
