import type { BenchHeightM } from './blockBenchInventory';
import { benchFloorForElevation } from './blockBenchInventory';
import type { InventoryScope } from './blockInventory';
import type { BlockCostBasis, GradeConfirmation } from './blockEconomicClassification';
import type { SupportedPhase } from './blockModelContract';
import type { EconomicInputs } from './economicModel';
import type { BlockModelDataset, NormalizedBlockModelRow } from '../utils/blockModelParser';

export type ProcessRouteId = 'mill' | 'leach';
export type NormalizedSourceDestination = ProcessRouteId | 'dump' | 'unknown';
export type RouteLotSource = 'fresh' | 'stockpile';

export interface ProcessRouteDefinition {
  id: ProcessRouteId;
  label: string;
  sourceDestination: 'Mill' | 'Leach';
  available: boolean;
  acceptsStockpile: boolean;
  capacityMtPerPeriod: number;
  utilization: number;
  recovery: number;
  processingCostUsdPerTonne: number;
  stockpileCapacityMt: number;
  reclaimCapacityMtPerPeriod: number;
  assumptionBasis: 'dsrl-scenario';
}

export interface RouteRecoveryInputs {
  periodCount: number;
  mineCapacityMtPerPeriod: number;
  mineUtilization: number;
  routes: Record<ProcessRouteId, ProcessRouteDefinition>;
}

export interface RouteMaterialLot {
  id: string;
  route: ProcessRouteId;
  sourceDestination: 'Mill' | 'Leach';
  benchId: string;
  sequenceFromTop: number;
  enteredPeriod: number;
  source: RouteLotSource;
  massMt: number;
  gradeCuPercent: number;
  containedCuKt: number;
  recoveredCuKt: number;
  marginUsdM: number;
}

export interface RoutePeriodResult {
  route: ProcessRouteId;
  sourceDestination: 'Mill' | 'Leach';
  available: boolean;
  directFeedMassMt: number;
  reclaimedMassMt: number;
  feedMassMt: number;
  feedCuPercent: number | null;
  containedCuKt: number;
  recoveredCuKt: number;
  recovery: number;
  recoveredRevenueUsdM: number;
  processingCostUsdM: number;
  miningCostUsdM: number;
  realizedMarginUsdM: number;
  stockpileAddedMassMt: number;
  closingStockpileMassMt: number;
  closingStockpileCuPercent: number | null;
  closingStockpileContainedCuKt: number;
  capacityUtilizationPercent: number;
  stockpileUtilizationPercent: number;
  reclaimUtilizationPercent: number;
  bottleneck: 'route-capacity' | 'stockpile' | 'reclaim' | 'inventory-exhausted' | 'none';
}

export interface RouteRecoveryPeriod {
  period: number;
  startBenchId: string | null;
  endBenchId: string | null;
  minedMassMt: number;
  processMassMt: number;
  nonProcessMassMt: number;
  unknownDestinationMassMt: number;
  mineUtilizationPercent: number;
  routes: Record<ProcessRouteId, RoutePeriodResult>;
  totalFeedMassMt: number;
  totalContainedCuKt: number;
  totalRecoveredCuKt: number;
  effectiveRecovery: number | null;
  realizedMarginUsdM: number;
  discountedOperatingMarginUsdM: number;
  cumulativeRecoveredCuKt: number;
  cumulativeRealizedMarginUsdM: number;
  cumulativeDiscountedOperatingMarginUsdM: number;
  bottleneck: 'mine' | 'mill' | 'leach' | 'stockpile' | 'inventory-exhausted' | 'none';
}

export interface RouteRecoveryTotals {
  route: ProcessRouteId;
  sourceDestination: 'Mill' | 'Leach';
  sourceMassMt: number;
  feedMassMt: number;
  finalStockpileMassMt: number;
  remainingInSituMassMt: number;
  feedCuPercent: number | null;
  containedCuKt: number;
  recoveredCuKt: number;
  effectiveRecovery: number | null;
  realizedMarginUsdM: number;
  unrealizedStockpileMarginUsdM: number;
  remainingInSituMarginUsdM: number;
}

export interface RouteRecoveryReport {
  sourceName: string;
  phase: SupportedPhase;
  scope: InventoryScope;
  benchHeightM: BenchHeightM;
  inputs: RouteRecoveryInputs;
  periods: RouteRecoveryPeriod[];
  periodsRequiredAtConfiguredCapacity: number;
  status: 'complete' | 'horizon-shortfall' | 'blocked-by-route';
  completionPercent: number;
  scheduledMineMassMt: number;
  remainingMineMassMt: number;
  processMassMt: number;
  nonProcessMassMt: number;
  unknownDestinationMassMt: number;
  unknownDestinations: string[];
  routeTotals: Record<ProcessRouteId, RouteRecoveryTotals>;
  totalFeedMassMt: number;
  totalContainedCuKt: number;
  totalRecoveredCuKt: number;
  effectiveRecovery: number | null;
  totalRealizedMarginUsdM: number;
  totalDiscountedOperatingMarginUsdM: number;
  reconciliation: {
    mineMassCloses: boolean;
    processRouteMassCloses: boolean;
    stockpileMassCloses: boolean;
    copperContentCloses: boolean;
    recoveredCopperWithinFeed: boolean;
    valueBalanceCloses: boolean;
    mineCapacityRespected: boolean;
    routeCapacityRespected: boolean;
    stockpileCapacityRespected: boolean;
    reclaimCapacityRespected: boolean;
    verticalPrecedenceRespected: boolean;
    routeIdentityPreserved: boolean;
    unknownDestinationsReported: boolean;
    noNegativeBalances: boolean;
  };
  methodology: {
    sequencePolicy: 'strict-top-down';
    routePolicy: 'source-destination-preserving-route-allocation';
    observedDestinationField: 'NPVPDEST';
    gradeField: 'CU';
    gradeUnitConfirmed: true;
    routeRecoveryModeled: true;
    routeCapacityModeled: true;
    stockpileIdentityByRoutePreserved: true;
    millLeachImplicitReclassificationAllowed: false;
    unknownDestinationAutoAssignmentAllowed: false;
    globalRouteOptimizationModeled: false;
    recoveryByMineralogyModeled: false;
    leachKineticsModeled: false;
    equipmentFleetModeled: false;
    haulageModeled: false;
    discountedNpvClaimAllowed: false;
    mineScheduleClaimAllowed: false;
    reserveClaimAllowed: false;
    inventoryLabel: 'simulación preliminar de recuperación metalúrgica y rutas dentro del diseño';
  };
  notes: string[];
}

interface RouteAggregate {
  massMt: number;
  cuMassMtPercent: number;
}

interface BenchRouteInventory {
  benchId: string;
  sequenceFromTop: number;
  totalMassMt: number;
  nonProcessMassMt: number;
  unknownMassMt: number;
  routes: Record<ProcessRouteId, RouteAggregate>;
}

interface BenchRemainder {
  bench: BenchRouteInventory;
  fraction: number;
}

interface AllocationResult {
  periods: RouteRecoveryPeriod[];
  remainders: BenchRemainder[];
  stockpiles: Record<ProcessRouteId, RouteMaterialLot[]>;
  unknownDestinations: Set<string>;
}

const ROUTES: ProcessRouteId[] = ['mill', 'leach'];
const EPS = 1e-10;

function close(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-8 * Math.max(1, Math.abs(left), Math.abs(right));
}

function cloneRouteDefinition(definition: ProcessRouteDefinition): ProcessRouteDefinition {
  return { ...definition };
}

export function createRouteRecoveryInputs(
  economic: EconomicInputs,
  overrides: Partial<Omit<RouteRecoveryInputs, 'routes'>> & {
    routes?: Partial<Record<ProcessRouteId, Partial<ProcessRouteDefinition>>>;
  } = {},
): RouteRecoveryInputs {
  const defaults: Record<ProcessRouteId, ProcessRouteDefinition> = {
    mill: {
      id: 'mill',
      label: 'MILL / CONCENTRADORA',
      sourceDestination: 'Mill',
      available: true,
      acceptsStockpile: true,
      capacityMtPerPeriod: economic.annualProductionMt,
      utilization: 1,
      recovery: economic.plantRecovery,
      processingCostUsdPerTonne: economic.processingCostUsdPerTonneOre,
      stockpileCapacityMt: economic.annualProductionMt * 0.5,
      reclaimCapacityMtPerPeriod: economic.annualProductionMt * 0.25,
      assumptionBasis: 'dsrl-scenario',
    },
    leach: {
      id: 'leach',
      label: 'LEACH / LIXIVIACIÓN',
      sourceDestination: 'Leach',
      available: true,
      acceptsStockpile: true,
      capacityMtPerPeriod: economic.annualProductionMt * 0.35,
      utilization: 1,
      recovery: Math.max(Math.min(economic.plantRecovery * 0.72, 1), 0),
      processingCostUsdPerTonne: economic.processingCostUsdPerTonneOre * 0.65,
      stockpileCapacityMt: economic.annualProductionMt * 0.25,
      reclaimCapacityMtPerPeriod: economic.annualProductionMt * 0.12,
      assumptionBasis: 'dsrl-scenario',
    },
  };

  return {
    periodCount: overrides.periodCount ?? 5,
    mineCapacityMtPerPeriod:
      overrides.mineCapacityMtPerPeriod ??
      economic.annualProductionMt * (1 + economic.stripRatio),
    mineUtilization: overrides.mineUtilization ?? 1,
    routes: {
      mill: {
        ...defaults.mill,
        ...(overrides.routes?.mill ?? {}),
        id: 'mill',
        sourceDestination: 'Mill',
        assumptionBasis: 'dsrl-scenario',
      },
      leach: {
        ...defaults.leach,
        ...(overrides.routes?.leach ?? {}),
        id: 'leach',
        sourceDestination: 'Leach',
        assumptionBasis: 'dsrl-scenario',
      },
    },
  };
}

export function validateRouteRecoveryInputs(inputs: RouteRecoveryInputs): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(inputs.periodCount) || inputs.periodCount < 1 || inputs.periodCount > 100) {
    errors.push('periodCount debe ser entero entre 1 y 100.');
  }
  if (!Number.isFinite(inputs.mineCapacityMtPerPeriod) || inputs.mineCapacityMtPerPeriod <= 0) {
    errors.push('Capacidad mina inválida.');
  }
  if (!Number.isFinite(inputs.mineUtilization) || inputs.mineUtilization <= 0 || inputs.mineUtilization > 1) {
    errors.push('Utilización mina fuera de (0,1].');
  }

  for (const routeId of ROUTES) {
    const route = inputs.routes[routeId];
    if (route.id !== routeId) errors.push(`Identificador inconsistente para ruta ${routeId}.`);
    if (!Number.isFinite(route.capacityMtPerPeriod) || route.capacityMtPerPeriod < 0) {
      errors.push(`Capacidad inválida para ruta ${routeId}.`);
    }
    if (!Number.isFinite(route.utilization) || route.utilization < 0 || route.utilization > 1) {
      errors.push(`Utilización fuera de [0,1] para ruta ${routeId}.`);
    }
    if (!Number.isFinite(route.recovery) || route.recovery < 0 || route.recovery > 1) {
      errors.push(`Recuperación fuera de [0,1] para ruta ${routeId}.`);
    }
    if (!Number.isFinite(route.processingCostUsdPerTonne) || route.processingCostUsdPerTonne < 0) {
      errors.push(`Costo de proceso inválido para ruta ${routeId}.`);
    }
    if (!Number.isFinite(route.stockpileCapacityMt) || route.stockpileCapacityMt < 0) {
      errors.push(`Capacidad de stockpile inválida para ruta ${routeId}.`);
    }
    if (!Number.isFinite(route.reclaimCapacityMtPerPeriod) || route.reclaimCapacityMtPerPeriod < 0) {
      errors.push(`Capacidad de reclaim inválida para ruta ${routeId}.`);
    }
  }
  return errors;
}

export function normalizeSourceDestination(destination: string): NormalizedSourceDestination {
  const normalized = destination.trim().toLowerCase();
  if (normalized === 'mill') return 'mill';
  if (normalized === 'leach') return 'leach';
  if (normalized === '_dump_' || normalized === 'dump' || normalized === 'waste') return 'dump';
  return 'unknown';
}

function containedCuKt(massMt: number, gradeCuPercent: number): number {
  return massMt * gradeCuPercent * 10;
}

function recoveredRevenueUsdM(
  massMt: number,
  gradeCuPercent: number,
  recovery: number,
  metalPriceUsdPerTonne: number,
): number {
  return (containedCuKt(massMt, gradeCuPercent) * recovery * metalPriceUsdPerTonne) / 1000;
}

function processingCostUsdM(massMt: number, costUsdPerTonne: number): number {
  return massMt * costUsdPerTonne;
}

function miningCostUsdM(
  massMt: number,
  economic: EconomicInputs,
  costBasis: BlockCostBasis,
): number {
  return costBasis === 'full-cost' ? massMt * economic.miningCostUsdPerTonneMoved : 0;
}

function routeMarginUsdM(
  massMt: number,
  gradeCuPercent: number,
  route: ProcessRouteDefinition,
  economic: EconomicInputs,
  costBasis: BlockCostBasis,
): number {
  return (
    recoveredRevenueUsdM(massMt, gradeCuPercent, route.recovery, economic.metalPriceUsdPerTonne) -
    processingCostUsdM(massMt, route.processingCostUsdPerTonne) -
    miningCostUsdM(massMt, economic, costBasis)
  );
}

function weightedGrade(lots: RouteMaterialLot[]): number | null {
  const mass = lots.reduce((sum, lot) => sum + lot.massMt, 0);
  return mass > EPS
    ? lots.reduce((sum, lot) => sum + lot.massMt * lot.gradeCuPercent, 0) / mass
    : null;
}

function cloneLot(lot: RouteMaterialLot): RouteMaterialLot {
  return { ...lot };
}

function takeLot(lot: RouteMaterialLot, requestedMassMt: number): RouteMaterialLot {
  const amount = Math.min(lot.massMt, Math.max(requestedMassMt, 0));
  if (amount <= EPS) return { ...lot, massMt: 0, containedCuKt: 0, recoveredCuKt: 0, marginUsdM: 0 };
  const ratio = amount / lot.massMt;
  lot.massMt -= amount;
  lot.containedCuKt *= 1 - ratio;
  lot.recoveredCuKt *= 1 - ratio;
  lot.marginUsdM *= 1 - ratio;
  return {
    ...lot,
    massMt: amount,
    containedCuKt: lot.containedCuKt * 0 + containedCuKt(amount, lot.gradeCuPercent),
    recoveredCuKt: containedCuKt(amount, lot.gradeCuPercent) * (lot.recoveredCuKt + containedCuKt(amount, lot.gradeCuPercent) > 0
      ? 0
      : 0),
    marginUsdM: 0,
  };
}

function splitLot(
  lot: RouteMaterialLot,
  requestedMassMt: number,
  route: ProcessRouteDefinition,
  economic: EconomicInputs,
  costBasis: BlockCostBasis,
): RouteMaterialLot {
  const amount = Math.min(lot.massMt, Math.max(requestedMassMt, 0));
  const selected = {
    ...lot,
    massMt: amount,
    containedCuKt: containedCuKt(amount, lot.gradeCuPercent),
    recoveredCuKt: containedCuKt(amount, lot.gradeCuPercent) * route.recovery,
    marginUsdM: routeMarginUsdM(amount, lot.gradeCuPercent, route, economic, costBasis),
  };
  lot.massMt = Math.max(lot.massMt - amount, 0);
  lot.containedCuKt = containedCuKt(lot.massMt, lot.gradeCuPercent);
  lot.recoveredCuKt = lot.containedCuKt * route.recovery;
  lot.marginUsdM = routeMarginUsdM(lot.massMt, lot.gradeCuPercent, route, economic, costBasis);
  return selected;
}

function aggregateRowsByBench(
  dataset: BlockModelDataset,
  phase: SupportedPhase,
  scope: InventoryScope,
  benchHeightM: BenchHeightM,
): { benches: BenchRouteInventory[]; unknownDestinations: Set<string> } {
  const selectedRows = dataset.rows.filter((row) =>
    scope === 'incremental' ? row.PSB_PIT === phase : row.PSB_PIT <= phase,
  );
  if (selectedRows.length === 0) throw new Error(`No existen bloques para F${phase} en alcance ${scope}.`);

  const minimumCenterElevation = Math.min(...selectedRows.map((row) => row.ZC));
  const datumElevationM = Math.floor(minimumCenterElevation / benchHeightM) * benchHeightM;
  const byFloor = new Map<number, BenchRouteInventory>();
  const unknownDestinations = new Set<string>();

  for (const row of selectedRows) {
    const floor = benchFloorForElevation(row.ZC, datumElevationM, benchHeightM);
    const current = byFloor.get(floor) ?? {
      benchId: `B-${floor.toFixed(0)}-${(floor + benchHeightM).toFixed(0)}`,
      sequenceFromTop: 0,
      totalMassMt: 0,
      nonProcessMassMt: 0,
      unknownMassMt: 0,
      routes: {
        mill: { massMt: 0, cuMassMtPercent: 0 },
        leach: { massMt: 0, cuMassMtPercent: 0 },
      },
    };
    const massMt = row.NPVMASS / 1_000_000;
    const destination = normalizeSourceDestination(row.NPVPDEST);
    current.totalMassMt += massMt;
    if (destination === 'mill' || destination === 'leach') {
      current.routes[destination].massMt += massMt;
      current.routes[destination].cuMassMtPercent += massMt * row.CU;
    } else if (destination === 'dump') {
      current.nonProcessMassMt += massMt;
    } else {
      current.unknownMassMt += massMt;
      unknownDestinations.add(row.NPVPDEST);
    }
    byFloor.set(floor, current);
  }

  const benches = [...byFloor.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([, bench], index) => ({ ...bench, sequenceFromTop: index + 1 }));
  return { benches, unknownDestinations };
}

function routeGrade(aggregate: RouteAggregate): number {
  return aggregate.massMt > EPS ? aggregate.cuMassMtPercent / aggregate.massMt : 0;
}

function makeLot(
  routeId: ProcessRouteId,
  bench: BenchRouteInventory,
  period: number,
  massMt: number,
  gradeCuPercent: number,
  route: ProcessRouteDefinition,
  economic: EconomicInputs,
  costBasis: BlockCostBasis,
  source: RouteLotSource,
  suffix: number,
): RouteMaterialLot {
  const contained = containedCuKt(massMt, gradeCuPercent);
  return {
    id: `${period}-${routeId}-${bench.benchId}-${suffix}`,
    route: routeId,
    sourceDestination: route.sourceDestination,
    benchId: bench.benchId,
    sequenceFromTop: bench.sequenceFromTop,
    enteredPeriod: period,
    source,
    massMt,
    gradeCuPercent,
    containedCuKt: contained,
    recoveredCuKt: contained * route.recovery,
    marginUsdM: routeMarginUsdM(massMt, gradeCuPercent, route, economic, costBasis),
  };
}

function selectRouteFeed(
  freshLots: RouteMaterialLot[],
  openingStockpileLots: RouteMaterialLot[],
  route: ProcessRouteDefinition,
  economic: EconomicInputs,
  costBasis: BlockCostBasis,
): {
  feed: RouteMaterialLot[];
  remainingFresh: RouteMaterialLot[];
  remainingStockpile: RouteMaterialLot[];
} {
  const fresh = freshLots.map(cloneLot);
  const stockpile = openingStockpileLots.map(cloneLot).sort((left, right) =>
    left.enteredPeriod - right.enteredPeriod || left.sequenceFromTop - right.sequenceFromTop,
  );
  const feed: RouteMaterialLot[] = [];
  const capacity = route.available ? route.capacityMtPerPeriod * route.utilization : 0;
  let capacityLeft = capacity;

  for (const lot of fresh) {
    if (capacityLeft <= EPS) break;
    const selected = splitLot(lot, capacityLeft, route, economic, costBasis);
    if (selected.massMt > EPS) {
      selected.source = 'fresh';
      feed.push(selected);
      capacityLeft -= selected.massMt;
    }
  }

  let reclaimLeft = route.acceptsStockpile ? route.reclaimCapacityMtPerPeriod : 0;
  for (const lot of stockpile) {
    if (capacityLeft <= EPS || reclaimLeft <= EPS) break;
    const selected = splitLot(lot, Math.min(capacityLeft, reclaimLeft), route, economic, costBasis);
    if (selected.massMt > EPS) {
      selected.source = 'stockpile';
      feed.push(selected);
      capacityLeft -= selected.massMt;
      reclaimLeft -= selected.massMt;
    }
  }

  return {
    feed,
    remainingFresh: fresh.filter((lot) => lot.massMt > EPS),
    remainingStockpile: stockpile.filter((lot) => lot.massMt > EPS),
  };
}

function emptyRoutePeriod(route: ProcessRouteDefinition): RoutePeriodResult {
  return {
    route: route.id,
    sourceDestination: route.sourceDestination,
    available: route.available,
    directFeedMassMt: 0,
    reclaimedMassMt: 0,
    feedMassMt: 0,
    feedCuPercent: null,
    containedCuKt: 0,
    recoveredCuKt: 0,
    recovery: route.recovery,
    recoveredRevenueUsdM: 0,
    processingCostUsdM: 0,
    miningCostUsdM: 0,
    realizedMarginUsdM: 0,
    stockpileAddedMassMt: 0,
    closingStockpileMassMt: 0,
    closingStockpileCuPercent: null,
    closingStockpileContainedCuKt: 0,
    capacityUtilizationPercent: 0,
    stockpileUtilizationPercent: 0,
    reclaimUtilizationPercent: 0,
    bottleneck: 'none',
  };
}

function runAllocation(
  benches: BenchRouteInventory[],
  inputs: RouteRecoveryInputs,
  economic: EconomicInputs,
  costBasis: BlockCostBasis,
  periodLimit: number,
  initialUnknownDestinations: Set<string>,
): AllocationResult {
  const mineCapacity = inputs.mineCapacityMtPerPeriod * inputs.mineUtilization;
  const remainders: BenchRemainder[] = benches.map((bench) => ({ bench, fraction: 1 }));
  const stockpiles: Record<ProcessRouteId, RouteMaterialLot[]> = { mill: [], leach: [] };
  const periods: RouteRecoveryPeriod[] = [];
  const unknownDestinations = new Set(initialUnknownDestinations);
  let index = 0;
  let cumulativeRecoveredCuKt = 0;
  let cumulativeMarginUsdM = 0;
  let cumulativeDiscountedUsdM = 0;

  for (let period = 1; period <= periodLimit && (index < remainders.length || ROUTES.some((id) => stockpiles[id].length > 0)); period += 1) {
    let mineLeft = mineCapacity;
    const fresh: Record<ProcessRouteId, RouteMaterialLot[]> = { mill: [], leach: [] };
    const routeStorageLeft: Record<ProcessRouteId, number> = { mill: 0, leach: 0 };

    for (const routeId of ROUTES) {
      const route = inputs.routes[routeId];
      const openingMass = stockpiles[routeId].reduce((sum, lot) => sum + lot.massMt, 0);
      const freeStockpile = route.acceptsStockpile
        ? Math.max(route.stockpileCapacityMt - openingMass, 0)
        : 0;
      const feedCapacity = route.available ? route.capacityMtPerPeriod * route.utilization : 0;
      routeStorageLeft[routeId] = feedCapacity + freeStockpile;
    }

    let minedMassMt = 0;
    let processMassMt = 0;
    let nonProcessMassMt = 0;
    let unknownDestinationMassMt = 0;
    let startBenchId: string | null = null;
    let endBenchId: string | null = null;

    while (index < remainders.length && mineLeft > EPS) {
      const item = remainders[index];
      const bench = item.bench;
      const massLeft = bench.totalMassMt * item.fraction;
      if (massLeft <= EPS) {
        item.fraction = 0;
        index += 1;
        continue;
      }

      const shares = [1, mineLeft / massLeft];
      for (const routeId of ROUTES) {
        const routeMassLeft = bench.routes[routeId].massMt * item.fraction;
        if (routeMassLeft > EPS) shares.push(routeStorageLeft[routeId] / routeMassLeft);
      }
      const share = Math.min(...shares);
      if (!Number.isFinite(share) || share <= EPS) break;

      const fraction = item.fraction * share;
      const totalMass = bench.totalMassMt * fraction;
      const nonProcessMass = bench.nonProcessMassMt * fraction;
      const unknownMass = bench.unknownMassMt * fraction;
      startBenchId ??= bench.benchId;
      endBenchId = bench.benchId;
      minedMassMt += totalMass;
      nonProcessMassMt += nonProcessMass;
      unknownDestinationMassMt += unknownMass;
      mineLeft = Math.max(mineLeft - totalMass, 0);

      for (const routeId of ROUTES) {
        const aggregate = bench.routes[routeId];
        const routeMass = aggregate.massMt * fraction;
        if (routeMass <= EPS) continue;
        const route = inputs.routes[routeId];
        processMassMt += routeMass;
        routeStorageLeft[routeId] = Math.max(routeStorageLeft[routeId] - routeMass, 0);
        fresh[routeId].push(makeLot(
          routeId,
          bench,
          period,
          routeMass,
          routeGrade(aggregate),
          route,
          economic,
          costBasis,
          'fresh',
          fresh[routeId].length,
        ));
      }

      item.fraction = Math.max(item.fraction - fraction, 0);
      if (item.fraction <= EPS) {
        item.fraction = 0;
        index += 1;
      }
    }

    const routePeriods: Record<ProcessRouteId, RoutePeriodResult> = {
      mill: emptyRoutePeriod(inputs.routes.mill),
      leach: emptyRoutePeriod(inputs.routes.leach),
    };

    for (const routeId of ROUTES) {
      const route = inputs.routes[routeId];
      const selected = selectRouteFeed(fresh[routeId], stockpiles[routeId], route, economic, costBasis);
      const directFeedMass = selected.feed
        .filter((lot) => lot.source === 'fresh')
        .reduce((sum, lot) => sum + lot.massMt, 0);
      const reclaimedMass = selected.feed
        .filter((lot) => lot.source === 'stockpile')
        .reduce((sum, lot) => sum + lot.massMt, 0);
      const feedMass = selected.feed.reduce((sum, lot) => sum + lot.massMt, 0);
      const feedGrade = weightedGrade(selected.feed);
      const feedContained = selected.feed.reduce((sum, lot) => sum + lot.containedCuKt, 0);
      const recovered = selected.feed.reduce((sum, lot) => sum + lot.recoveredCuKt, 0);
      const revenue = feedGrade === null
        ? 0
        : recoveredRevenueUsdM(feedMass, feedGrade, route.recovery, economic.metalPriceUsdPerTonne);
      const processingCost = processingCostUsdM(feedMass, route.processingCostUsdPerTonne);
      const miningCost = miningCostUsdM(feedMass, economic, costBasis);
      const margin = selected.feed.reduce((sum, lot) => sum + lot.marginUsdM, 0);

      stockpiles[routeId] = [
        ...selected.remainingStockpile.map((lot) => ({ ...lot, source: 'stockpile' as const })),
        ...selected.remainingFresh.map((lot) => ({ ...lot, source: 'stockpile' as const })),
      ];
      const stockpileAdded = selected.remainingFresh.reduce((sum, lot) => sum + lot.massMt, 0);
      const closingMass = stockpiles[routeId].reduce((sum, lot) => sum + lot.massMt, 0);
      const closingGrade = weightedGrade(stockpiles[routeId]);
      const capacity = route.available ? route.capacityMtPerPeriod * route.utilization : 0;
      const exhausted = index >= remainders.length && closingMass <= EPS;
      const bottleneck: RoutePeriodResult['bottleneck'] = exhausted
        ? 'inventory-exhausted'
        : route.stockpileCapacityMt > 0 && close(closingMass, route.stockpileCapacityMt)
          ? 'stockpile'
          : capacity > 0 && close(feedMass, capacity)
            ? 'route-capacity'
            : route.reclaimCapacityMtPerPeriod > 0 && close(reclaimedMass, route.reclaimCapacityMtPerPeriod)
              ? 'reclaim'
              : 'none';

      routePeriods[routeId] = {
        route: routeId,
        sourceDestination: route.sourceDestination,
        available: route.available,
        directFeedMassMt: directFeedMass,
        reclaimedMassMt: reclaimedMass,
        feedMassMt: feedMass,
        feedCuPercent: feedGrade,
        containedCuKt: feedContained,
        recoveredCuKt: recovered,
        recovery: route.recovery,
        recoveredRevenueUsdM: revenue,
        processingCostUsdM: processingCost,
        miningCostUsdM: miningCost,
        realizedMarginUsdM: margin,
        stockpileAddedMassMt: stockpileAdded,
        closingStockpileMassMt: closingMass,
        closingStockpileCuPercent: closingGrade,
        closingStockpileContainedCuKt: stockpiles[routeId].reduce((sum, lot) => sum + lot.containedCuKt, 0),
        capacityUtilizationPercent: capacity > EPS ? (feedMass / capacity) * 100 : 0,
        stockpileUtilizationPercent: route.stockpileCapacityMt > EPS ? (closingMass / route.stockpileCapacityMt) * 100 : 0,
        reclaimUtilizationPercent: route.reclaimCapacityMtPerPeriod > EPS ? (reclaimedMass / route.reclaimCapacityMtPerPeriod) * 100 : 0,
        bottleneck,
      };
    }

    const totalFeedMass = ROUTES.reduce((sum, routeId) => sum + routePeriods[routeId].feedMassMt, 0);
    const totalContained = ROUTES.reduce((sum, routeId) => sum + routePeriods[routeId].containedCuKt, 0);
    const totalRecovered = ROUTES.reduce((sum, routeId) => sum + routePeriods[routeId].recoveredCuKt, 0);
    const totalMargin = ROUTES.reduce((sum, routeId) => sum + routePeriods[routeId].realizedMarginUsdM, 0);
    const discounted = totalMargin / Math.pow(1 + economic.wacc, period);
    cumulativeRecoveredCuKt += totalRecovered;
    cumulativeMarginUsdM += totalMargin;
    cumulativeDiscountedUsdM += discounted;
    const inventoryExhausted = index >= remainders.length && ROUTES.every((routeId) => stockpiles[routeId].length === 0);
    const bottleneck: RouteRecoveryPeriod['bottleneck'] = inventoryExhausted
      ? 'inventory-exhausted'
      : close(minedMassMt, mineCapacity)
        ? 'mine'
        : routePeriods.mill.bottleneck === 'route-capacity'
          ? 'mill'
          : routePeriods.leach.bottleneck === 'route-capacity'
            ? 'leach'
            : routePeriods.mill.bottleneck === 'stockpile' || routePeriods.leach.bottleneck === 'stockpile'
              ? 'stockpile'
              : 'none';

    periods.push({
      period,
      startBenchId,
      endBenchId,
      minedMassMt,
      processMassMt,
      nonProcessMassMt,
      unknownDestinationMassMt,
      mineUtilizationPercent: mineCapacity > EPS ? (minedMassMt / mineCapacity) * 100 : 0,
      routes: routePeriods,
      totalFeedMassMt: totalFeedMass,
      totalContainedCuKt: totalContained,
      totalRecoveredCuKt: totalRecovered,
      effectiveRecovery: totalContained > EPS ? totalRecovered / totalContained : null,
      realizedMarginUsdM: totalMargin,
      discountedOperatingMarginUsdM: discounted,
      cumulativeRecoveredCuKt,
      cumulativeRealizedMarginUsdM: cumulativeMarginUsdM,
      cumulativeDiscountedOperatingMarginUsdM: cumulativeDiscountedUsdM,
      bottleneck,
    });

    if (minedMassMt <= EPS && totalFeedMass <= EPS && !inventoryExhausted) break;
  }

  return { periods, remainders, stockpiles, unknownDestinations };
}

function remainingRouteMass(
  remainders: BenchRemainder[],
  routeId: ProcessRouteId,
): number {
  return remainders.reduce((sum, item) => sum + item.bench.routes[routeId].massMt * item.fraction, 0);
}

function remainingRouteCuMass(
  remainders: BenchRemainder[],
  routeId: ProcessRouteId,
): number {
  return remainders.reduce((sum, item) => sum + item.bench.routes[routeId].cuMassMtPercent * item.fraction, 0);
}

function totalRouteMass(benches: BenchRouteInventory[], routeId: ProcessRouteId): number {
  return benches.reduce((sum, bench) => sum + bench.routes[routeId].massMt, 0);
}

function totalRouteCuMass(benches: BenchRouteInventory[], routeId: ProcessRouteId): number {
  return benches.reduce((sum, bench) => sum + bench.routes[routeId].cuMassMtPercent, 0);
}

export function buildBlockBenchRouteRecovery(
  dataset: BlockModelDataset,
  phase: SupportedPhase,
  scope: InventoryScope,
  benchHeightM: BenchHeightM,
  economic: EconomicInputs,
  gradeConfirmation: GradeConfirmation,
  costBasis: BlockCostBasis,
  inputs: RouteRecoveryInputs,
): RouteRecoveryReport {
  const errors = validateRouteRecoveryInputs(inputs);
  if (errors.length) throw new Error(errors.join(' '));
  if (gradeConfirmation !== 'cu-percent') {
    throw new Error('La Etapa 8.9 requiere confirmación explícita de CU = %.');
  }

  const inventory = aggregateRowsByBench(dataset, phase, scope, benchHeightM);
  const result = runAllocation(inventory.benches, inputs, economic, costBasis, inputs.periodCount, inventory.unknownDestinations);
  const full = runAllocation(inventory.benches, inputs, economic, costBasis, 1000, inventory.unknownDestinations);
  const totalMass = inventory.benches.reduce((sum, bench) => sum + bench.totalMassMt, 0);
  const scheduledMine = result.periods.reduce((sum, period) => sum + period.minedMassMt, 0);
  const remainingMine = result.remainders.reduce((sum, item) => sum + item.bench.totalMassMt * item.fraction, 0);
  const processMass = ROUTES.reduce((sum, routeId) => sum + totalRouteMass(inventory.benches, routeId), 0);
  const nonProcessMass = inventory.benches.reduce((sum, bench) => sum + bench.nonProcessMassMt, 0);
  const unknownMass = inventory.benches.reduce((sum, bench) => sum + bench.unknownMassMt, 0);

  const routeTotals = {} as Record<ProcessRouteId, RouteRecoveryTotals>;
  for (const routeId of ROUTES) {
    const route = inputs.routes[routeId];
    const sourceMass = totalRouteMass(inventory.benches, routeId);
    const sourceCuMass = totalRouteCuMass(inventory.benches, routeId);
    const feedMass = result.periods.reduce((sum, period) => sum + period.routes[routeId].feedMassMt, 0);
    const feedCuMass = result.periods.reduce(
      (sum, period) => sum + (period.routes[routeId].feedCuPercent ?? 0) * period.routes[routeId].feedMassMt,
      0,
    );
    const feedContained = result.periods.reduce((sum, period) => sum + period.routes[routeId].containedCuKt, 0);
    const recovered = result.periods.reduce((sum, period) => sum + period.routes[routeId].recoveredCuKt, 0);
    const finalStockpileMass = result.stockpiles[routeId].reduce((sum, lot) => sum + lot.massMt, 0);
    const remainingMass = remainingRouteMass(result.remainders, routeId);
    const realized = result.periods.reduce((sum, period) => sum + period.routes[routeId].realizedMarginUsdM, 0);
    const stockpileMargin = result.stockpiles[routeId].reduce((sum, lot) => sum + lot.marginUsdM, 0);
    const remainingCuMass = remainingRouteCuMass(result.remainders, routeId);
    const remainingGrade = remainingMass > EPS ? remainingCuMass / remainingMass : 0;
    const remainingMargin = routeMarginUsdM(remainingMass, remainingGrade, route, economic, costBasis);

    routeTotals[routeId] = {
      route: routeId,
      sourceDestination: route.sourceDestination,
      sourceMassMt: sourceMass,
      feedMassMt: feedMass,
      finalStockpileMassMt: finalStockpileMass,
      remainingInSituMassMt: remainingMass,
      feedCuPercent: feedMass > EPS ? feedCuMass / feedMass : null,
      containedCuKt: feedContained,
      recoveredCuKt: recovered,
      effectiveRecovery: feedContained > EPS ? recovered / feedContained : null,
      realizedMarginUsdM: realized,
      unrealizedStockpileMarginUsdM: stockpileMargin,
      remainingInSituMarginUsdM: remainingMargin,
    };
  }

  const totalFeedMass = ROUTES.reduce((sum, routeId) => sum + routeTotals[routeId].feedMassMt, 0);
  const totalContained = ROUTES.reduce((sum, routeId) => sum + routeTotals[routeId].containedCuKt, 0);
  const totalRecovered = ROUTES.reduce((sum, routeId) => sum + routeTotals[routeId].recoveredCuKt, 0);
  const totalRealized = ROUTES.reduce((sum, routeId) => sum + routeTotals[routeId].realizedMarginUsdM, 0);
  const totalDiscounted = result.periods.reduce((sum, period) => sum + period.discountedOperatingMarginUsdM, 0);
  const routeMassCloses = ROUTES.every((routeId) => {
    const route = routeTotals[routeId];
    return close(route.sourceMassMt, route.feedMassMt + route.finalStockpileMassMt + route.remainingInSituMassMt);
  });
  const stockpileMassCloses = ROUTES.every((routeId) => {
    const added = result.periods.reduce((sum, period) => sum + period.routes[routeId].stockpileAddedMassMt, 0);
    const reclaimed = result.periods.reduce((sum, period) => sum + period.routes[routeId].reclaimedMassMt, 0);
    return close(added - reclaimed, routeTotals[routeId].finalStockpileMassMt);
  });
  const copperCloses = ROUTES.every((routeId) => {
    const totalCuMass = totalRouteCuMass(inventory.benches, routeId);
    const feedCuMass = result.periods.reduce(
      (sum, period) => sum + (period.routes[routeId].feedCuPercent ?? 0) * period.routes[routeId].feedMassMt,
      0,
    );
    const stockCuMass = result.stockpiles[routeId].reduce((sum, lot) => sum + lot.massMt * lot.gradeCuPercent, 0);
    const inSituCuMass = remainingRouteCuMass(result.remainders, routeId);
    return close(totalCuMass, feedCuMass + stockCuMass + inSituCuMass);
  });
  const valueCloses = ROUTES.every((routeId) => {
    const route = inputs.routes[routeId];
    const totalMassRoute = totalRouteMass(inventory.benches, routeId);
    const totalCuMassRoute = totalRouteCuMass(inventory.benches, routeId);
    const totalGrade = totalMassRoute > EPS ? totalCuMassRoute / totalMassRoute : 0;
    const expected = routeMarginUsdM(totalMassRoute, totalGrade, route, economic, costBasis);
    const totals = routeTotals[routeId];
    return close(
      expected,
      totals.realizedMarginUsdM + totals.unrealizedStockpileMarginUsdM + totals.remainingInSituMarginUsdM,
    );
  });
  const sequence = result.periods
    .flatMap((period) => [period.startBenchId, period.endBenchId])
    .filter((value): value is string => Boolean(value));
  const order = new Map(inventory.benches.map((bench) => [bench.benchId, bench.sequenceFromTop]));
  const fullRemaining = full.remainders.reduce((sum, item) => sum + item.bench.totalMassMt * item.fraction, 0);
  const fullStockpile = ROUTES.reduce(
    (sum, routeId) => sum + full.stockpiles[routeId].reduce((routeSum, lot) => routeSum + lot.massMt, 0),
    0,
  );
  const blocked = fullRemaining > EPS || fullStockpile > EPS;

  return {
    sourceName: dataset.sourceName,
    phase,
    scope,
    benchHeightM,
    inputs: {
      periodCount: inputs.periodCount,
      mineCapacityMtPerPeriod: inputs.mineCapacityMtPerPeriod,
      mineUtilization: inputs.mineUtilization,
      routes: {
        mill: cloneRouteDefinition(inputs.routes.mill),
        leach: cloneRouteDefinition(inputs.routes.leach),
      },
    },
    periods: result.periods,
    periodsRequiredAtConfiguredCapacity: full.periods.length,
    status: blocked
      ? 'blocked-by-route'
      : remainingMine <= EPS && ROUTES.every((routeId) => result.stockpiles[routeId].length === 0)
        ? 'complete'
        : 'horizon-shortfall',
    completionPercent: totalMass > EPS ? (scheduledMine / totalMass) * 100 : 100,
    scheduledMineMassMt: scheduledMine,
    remainingMineMassMt: remainingMine,
    processMassMt: processMass,
    nonProcessMassMt: nonProcessMass,
    unknownDestinationMassMt: unknownMass,
    unknownDestinations: [...result.unknownDestinations].sort(),
    routeTotals,
    totalFeedMassMt: totalFeedMass,
    totalContainedCuKt: totalContained,
    totalRecoveredCuKt: totalRecovered,
    effectiveRecovery: totalContained > EPS ? totalRecovered / totalContained : null,
    totalRealizedMarginUsdM: totalRealized,
    totalDiscountedOperatingMarginUsdM: totalDiscounted,
    reconciliation: {
      mineMassCloses: close(scheduledMine + remainingMine, totalMass),
      processRouteMassCloses: routeMassCloses,
      stockpileMassCloses,
      copperContentCloses: copperCloses,
      recoveredCopperWithinFeed: ROUTES.every((routeId) => routeTotals[routeId].recoveredCuKt <= routeTotals[routeId].containedCuKt + EPS),
      valueBalanceCloses: valueCloses,
      mineCapacityRespected: result.periods.every((period) => period.mineUtilizationPercent <= 100 + EPS),
      routeCapacityRespected: result.periods.every((period) => ROUTES.every((routeId) => period.routes[routeId].capacityUtilizationPercent <= 100 + EPS)),
      stockpileCapacityRespected: result.periods.every((period) => ROUTES.every((routeId) => period.routes[routeId].stockpileUtilizationPercent <= 100 + EPS)),
      reclaimCapacityRespected: result.periods.every((period) => ROUTES.every((routeId) => period.routes[routeId].reclaimUtilizationPercent <= 100 + EPS)),
      verticalPrecedenceRespected: sequence.every((benchId, index) => index === 0 || (order.get(benchId) ?? 0) >= (order.get(sequence[index - 1]) ?? 0)),
      routeIdentityPreserved: result.periods.every((period) => ROUTES.every((routeId) => period.routes[routeId].sourceDestination === inputs.routes[routeId].sourceDestination)),
      unknownDestinationsReported: unknownMass <= EPS || result.unknownDestinations.size > 0,
      noNegativeBalances: result.periods.every((period) => [
        period.minedMassMt,
        period.processMassMt,
        period.nonProcessMassMt,
        period.unknownDestinationMassMt,
        ...ROUTES.flatMap((routeId) => [
          period.routes[routeId].directFeedMassMt,
          period.routes[routeId].reclaimedMassMt,
          period.routes[routeId].feedMassMt,
          period.routes[routeId].stockpileAddedMassMt,
          period.routes[routeId].closingStockpileMassMt,
          period.routes[routeId].containedCuKt,
          period.routes[routeId].recoveredCuKt,
        ]),
      ].every((value) => value >= -EPS)),
    },
    methodology: {
      sequencePolicy: 'strict-top-down',
      routePolicy: 'source-destination-preserving-route-allocation',
      observedDestinationField: 'NPVPDEST',
      gradeField: 'CU',
      gradeUnitConfirmed: true,
      routeRecoveryModeled: true,
      routeCapacityModeled: true,
      stockpileIdentityByRoutePreserved: true,
      millLeachImplicitReclassificationAllowed: false,
      unknownDestinationAutoAssignmentAllowed: false,
      globalRouteOptimizationModeled: false,
      recoveryByMineralogyModeled: false,
      leachKineticsModeled: false,
      equipmentFleetModeled: false,
      haulageModeled: false,
      discountedNpvClaimAllowed: false,
      mineScheduleClaimAllowed: false,
      reserveClaimAllowed: false,
      inventoryLabel: 'simulación preliminar de recuperación metalúrgica y rutas dentro del diseño',
    },
    notes: [
      'NPVPDEST se conserva como dato observado y no se reclasifica implícitamente entre Mill y Leach.',
      'Las recuperaciones, capacidades y costos por ruta son supuestos DSRL editables.',
      'El cobre contenido y el cobre recuperado se reportan por separado.',
      'El reclaim utiliza primero material fresco y después lotes de stockpile en orden FIFO.',
      'No se modelan mineralogía, cinética de lixiviación, equipos, acarreo ni optimización global de rutas.',
      'El margen operativo descontado no es VAN.',
      'El resultado no es un plan minero ejecutable ni una declaración de reservas.',
    ],
  };
}
