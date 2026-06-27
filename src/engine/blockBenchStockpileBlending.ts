import type { BenchHeightM } from './blockBenchInventory';
import { buildBlockBenchEconomicValue, type BenchEconomicValueEntry } from './blockBenchEconomicValue';
import type { InventoryScope } from './blockInventory';
import type { BlockCostBasis, GradeConfirmation } from './blockEconomicClassification';
import type { SupportedPhase } from './blockModelContract';
import type { EconomicInputs } from './economicModel';
import type { BlockModelDataset } from '../utils/blockModelParser';

export interface StockpileBlendingInputs {
  periodCount: number;
  mineCapacityMtPerPeriod: number;
  plantCapacityMtPerPeriod: number;
  mineUtilization: number;
  plantUtilization: number;
  stockpileCapacityMt: number;
  reclaimCapacityMtPerPeriod: number;
  targetCuPercent: number | null;
  blendToleranceCuPercent: number;
}

export type StockpileBottleneck =
  | 'mine'
  | 'plant'
  | 'stockpile'
  | 'reclaim'
  | 'inventory-exhausted'
  | 'none';

interface MaterialLot {
  id: string;
  benchId: string;
  sequenceFromTop: number;
  source: 'fresh' | 'stockpile';
  massMt: number;
  gradeCuPercent: number;
  marginUsdPerTonne: number;
}

interface BenchRemainder {
  bench: BenchEconomicValueEntry;
  fraction: number;
}

export interface StockpilePeriod {
  period: number;
  startBenchId: string | null;
  endBenchId: string | null;
  minedMassMt: number;
  freshProcessMassMt: number;
  nonProcessMassMt: number;
  directFeedMassMt: number;
  reclaimedMassMt: number;
  plantFeedMassMt: number;
  plantFeedCuPercent: number | null;
  targetCuPercent: number;
  gradeDeviationCuPercent: number | null;
  withinBlendTolerance: boolean | null;
  stockpileAddedMassMt: number;
  closingStockpileMassMt: number;
  closingStockpileCuPercent: number | null;
  closingStockpileContainedCuKt: number;
  realizedMarginUsdM: number;
  discountedOperatingMarginUsdM: number;
  cumulativeRealizedMarginUsdM: number;
  cumulativeDiscountedOperatingMarginUsdM: number;
  mineUtilizationPercent: number;
  plantUtilizationPercent: number;
  stockpileUtilizationPercent: number;
  reclaimUtilizationPercent: number;
  bottleneck: StockpileBottleneck;
}

export interface StockpileBlendingReport {
  sourceName: string;
  phase: SupportedPhase;
  scope: InventoryScope;
  benchHeightM: BenchHeightM;
  inputs: StockpileBlendingInputs;
  resolvedTargetCuPercent: number;
  periods: StockpilePeriod[];
  periodsRequiredAtConfiguredCapacity: number;
  status: 'complete' | 'horizon-shortfall';
  completionPercent: number;
  scheduledMineMassMt: number;
  remainingMineMassMt: number;
  totalPlantFeedMassMt: number;
  finalStockpileMassMt: number;
  finalStockpileCuPercent: number | null;
  finalStockpileContainedCuKt: number;
  realizedMarginUsdM: number;
  unrealizedStockpileMarginUsdM: number;
  remainingInSituMarginUsdM: number;
  totalDiscountedOperatingMarginUsdM: number;
  periodsWithinTolerance: number;
  periodsOutsideTolerance: number;
  sourceBenchValueReport: ReturnType<typeof buildBlockBenchEconomicValue>;
  reconciliation: {
    mineMassCloses: boolean;
    processRoutingCloses: boolean;
    stockpileMassCloses: boolean;
    plantFeedMassCloses: boolean;
    copperBalanceCloses: boolean;
    valueBalanceCloses: boolean;
    mineCapacityRespected: boolean;
    plantCapacityRespected: boolean;
    stockpileCapacityRespected: boolean;
    reclaimCapacityRespected: boolean;
    verticalPrecedenceRespected: boolean;
    noNegativeBalances: boolean;
  };
  methodology: {
    sequencePolicy: 'strict-top-down';
    blendingPolicy: 'target-seeking-complementary-lots';
    stockpileLotIdentityPreserved: true;
    partialBenchAllocationAllowed: true;
    partialLotReclaimAllowed: true;
    stockpileLossesModeled: false;
    oxidationModeled: false;
    recoveryByRouteModeled: false;
    equipmentFleetModeled: false;
    haulageModeled: false;
    discountedNpvClaimAllowed: false;
    mineScheduleClaimAllowed: false;
    reserveClaimAllowed: false;
    inventoryLabel: 'simulación preliminar de stockpile y blending dentro del diseño';
  };
  notes: string[];
}

const EPS = 1e-10;

export function createStockpileBlendingInputs(
  economic: EconomicInputs,
  overrides: Partial<StockpileBlendingInputs> = {},
): StockpileBlendingInputs {
  return {
    periodCount: 5,
    mineCapacityMtPerPeriod: economic.annualProductionMt * (1 + economic.stripRatio),
    plantCapacityMtPerPeriod: economic.annualProductionMt,
    mineUtilization: 1,
    plantUtilization: 1,
    stockpileCapacityMt: economic.annualProductionMt * 0.5,
    reclaimCapacityMtPerPeriod: economic.annualProductionMt * 0.25,
    targetCuPercent: null,
    blendToleranceCuPercent: 0.02,
    ...overrides,
  };
}

export function validateStockpileBlendingInputs(i: StockpileBlendingInputs): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(i.periodCount) || i.periodCount < 1 || i.periodCount > 100) errors.push('periodCount debe ser entero entre 1 y 100.');
  for (const [label, value] of [
    ['capacidad mina', i.mineCapacityMtPerPeriod],
    ['capacidad planta', i.plantCapacityMtPerPeriod],
    ['capacidad stockpile', i.stockpileCapacityMt],
    ['capacidad reclaim', i.reclaimCapacityMtPerPeriod],
  ] as const) if (!Number.isFinite(value) || value <= 0) errors.push(`${label} debe ser mayor que cero.`);
  if (i.mineUtilization <= 0 || i.mineUtilization > 1) errors.push('Utilización mina fuera de (0,1].');
  if (i.plantUtilization <= 0 || i.plantUtilization > 1) errors.push('Utilización planta fuera de (0,1].');
  if (i.targetCuPercent !== null && (!Number.isFinite(i.targetCuPercent) || i.targetCuPercent <= 0)) errors.push('Ley objetivo inválida.');
  if (!Number.isFinite(i.blendToleranceCuPercent) || i.blendToleranceCuPercent < 0) errors.push('Tolerancia de blending inválida.');
  return errors;
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
}

function containedCuKt(massMt: number, gradePercent: number): number {
  return massMt * gradePercent * 10;
}

function weightedGrade(lots: MaterialLot[]): number | null {
  const mass = lots.reduce((sum, lot) => sum + lot.massMt, 0);
  return mass > EPS
    ? lots.reduce((sum, lot) => sum + lot.massMt * lot.gradeCuPercent, 0) / mass
    : null;
}

function lotMarginUsdM(lot: MaterialLot): number {
  return lot.massMt * lot.marginUsdPerTonne;
}

function processGrade(bench: BenchEconomicValueEntry): number {
  return bench.metrics.weightedCuProcessPercent ?? bench.metrics.weightedCuAllNative ?? 0;
}

function processMarginPerTonne(bench: BenchEconomicValueEntry): number {
  return bench.metrics.dsrlProcessMassMt > EPS
    ? bench.metrics.selectedMarginUsdM / bench.metrics.dsrlProcessMassMt
    : 0;
}

function take(lot: MaterialLot, massMt: number): MaterialLot {
  const amount = Math.min(lot.massMt, massMt);
  lot.massMt -= amount;
  return { ...lot, massMt: amount };
}

function availableMass(lot: MaterialLot, reclaimed: number, reclaimCapacity: number): number {
  return lot.source === 'fresh'
    ? lot.massMt
    : Math.min(lot.massMt, Math.max(reclaimCapacity - reclaimed, 0));
}

function selectPlantFeed(
  fresh: MaterialLot[],
  stockpile: MaterialLot[],
  plantCapacityMt: number,
  reclaimCapacityMt: number,
  targetCuPercent: number,
): { feed: MaterialLot[]; remainingFresh: MaterialLot[]; remainingStockpile: MaterialLot[] } {
  const candidates = [...fresh, ...stockpile].map((lot) => ({ ...lot }));
  const feed: MaterialLot[] = [];
  let feedMass = 0;
  let feedMetal = 0;
  let reclaimed = 0;

  const add = (lot: MaterialLot, amount: number) => {
    const selected = take(lot, amount);
    feed.push(selected);
    feedMass += selected.massMt;
    feedMetal += selected.massMt * selected.gradeCuPercent;
    if (selected.source === 'stockpile') reclaimed += selected.massMt;
  };

  while (feedMass < plantCapacityMt - EPS) {
    const plantLeft = plantCapacityMt - feedMass;
    const available = candidates.filter((lot) => availableMass(lot, reclaimed, reclaimCapacityMt) > EPS);
    if (!available.length) break;

    const exact = available.find((lot) => Math.abs(lot.gradeCuPercent - targetCuPercent) <= EPS);
    if (exact) {
      add(exact, Math.min(plantLeft, availableMass(exact, reclaimed, reclaimCapacityMt)));
      continue;
    }

    const highs = available.filter((lot) => lot.gradeCuPercent > targetCuPercent).sort((a, b) => a.gradeCuPercent - b.gradeCuPercent);
    const lows = available.filter((lot) => lot.gradeCuPercent < targetCuPercent).sort((a, b) => b.gradeCuPercent - a.gradeCuPercent);
    if (highs.length && lows.length) {
      const high = highs[0];
      const low = lows[0];
      const highShare = (targetCuPercent - low.gradeCuPercent) / (high.gradeCuPercent - low.gradeCuPercent);
      const lowShare = 1 - highShare;
      const highAvailable = availableMass(high, reclaimed, reclaimCapacityMt);
      const lowAvailable = availableMass(low, reclaimed, reclaimCapacityMt);
      const total = Math.min(
        plantLeft,
        highShare > EPS ? highAvailable / highShare : Number.POSITIVE_INFINITY,
        lowShare > EPS ? lowAvailable / lowShare : Number.POSITIVE_INFINITY,
      );
      if (total > EPS) {
        add(high, total * highShare);
        add(low, total * lowShare);
        continue;
      }
    }

    const currentGrade = feedMass > EPS ? feedMetal / feedMass : targetCuPercent;
    available.sort((a, b) => {
      const scoreA = Math.abs(((feedMetal + a.gradeCuPercent * Math.min(plantLeft, availableMass(a, reclaimed, reclaimCapacityMt))) / (feedMass + Math.min(plantLeft, availableMass(a, reclaimed, reclaimCapacityMt)))) - targetCuPercent);
      const scoreB = Math.abs(((feedMetal + b.gradeCuPercent * Math.min(plantLeft, availableMass(b, reclaimed, reclaimCapacityMt))) / (feedMass + Math.min(plantLeft, availableMass(b, reclaimed, reclaimCapacityMt)))) - targetCuPercent);
      return scoreA - scoreB || Math.abs(a.gradeCuPercent - currentGrade) - Math.abs(b.gradeCuPercent - currentGrade);
    });
    const lot = available[0];
    add(lot, Math.min(plantLeft, availableMass(lot, reclaimed, reclaimCapacityMt)));
  }

  return {
    feed,
    remainingFresh: candidates.filter((lot) => lot.source === 'fresh' && lot.massMt > EPS),
    remainingStockpile: candidates.filter((lot) => lot.source === 'stockpile' && lot.massMt > EPS),
  };
}

function runAllocation(
  benches: BenchEconomicValueEntry[],
  inputs: StockpileBlendingInputs,
  targetCuPercent: number,
  wacc: number,
  periodLimit: number,
) {
  const mineCap = inputs.mineCapacityMtPerPeriod * inputs.mineUtilization;
  const plantCap = inputs.plantCapacityMtPerPeriod * inputs.plantUtilization;
  const remainders: BenchRemainder[] = benches.map((bench) => ({ bench, fraction: 1 }));
  let stockpile: MaterialLot[] = [];
  const periods: StockpilePeriod[] = [];
  let index = 0;
  let cumulativeMargin = 0;
  let cumulativeDiscounted = 0;

  for (let period = 1; period <= periodLimit && (index < remainders.length || stockpile.length); period += 1) {
    const openingStockpileMass = stockpile.reduce((sum, lot) => sum + lot.massMt, 0);
    const freeStockpile = Math.max(inputs.stockpileCapacityMt - openingStockpileMass, 0);
    let mineLeft = mineCap;
    let processStorageLeft = plantCap + freeStockpile;
    const fresh: MaterialLot[] = [];
    let minedMass = 0;
    let freshProcess = 0;
    let nonProcess = 0;
    let startBenchId: string | null = null;
    let endBenchId: string | null = null;

    while (index < remainders.length && mineLeft > EPS) {
      const item = remainders[index];
      const bench = item.bench;
      const massLeft = bench.metrics.massMt * item.fraction;
      const processLeft = bench.metrics.dsrlProcessMassMt * item.fraction;
      if (massLeft <= EPS) { item.fraction = 0; index += 1; continue; }
      const share = Math.min(
        1,
        mineLeft / massLeft,
        processLeft > EPS ? processStorageLeft / processLeft : Number.POSITIVE_INFINITY,
      );
      if (!Number.isFinite(share) || share <= EPS) break;
      const fraction = item.fraction * share;
      const mass = bench.metrics.massMt * fraction;
      const process = bench.metrics.dsrlProcessMassMt * fraction;
      startBenchId ??= bench.benchId;
      endBenchId = bench.benchId;
      minedMass += mass;
      freshProcess += process;
      nonProcess += Math.max(mass - process, 0);
      mineLeft -= mass;
      processStorageLeft -= process;
      if (process > EPS) fresh.push({
        id: `${period}-${bench.benchId}-${fresh.length}`,
        benchId: bench.benchId,
        sequenceFromTop: bench.sequenceFromTop,
        source: 'fresh',
        massMt: process,
        gradeCuPercent: processGrade(bench),
        marginUsdPerTonne: processMarginPerTonne(bench),
      });
      item.fraction = Math.max(item.fraction - fraction, 0);
      if (item.fraction <= EPS) { item.fraction = 0; index += 1; }
    }

    const blend = selectPlantFeed(fresh, stockpile, plantCap, inputs.reclaimCapacityMtPerPeriod, targetCuPercent);
    const feedMass = blend.feed.reduce((sum, lot) => sum + lot.massMt, 0);
    const directFeed = blend.feed.filter((lot) => lot.source === 'fresh').reduce((sum, lot) => sum + lot.massMt, 0);
    const reclaimed = blend.feed.filter((lot) => lot.source === 'stockpile').reduce((sum, lot) => sum + lot.massMt, 0);
    const feedGrade = weightedGrade(blend.feed);
    const realizedMargin = blend.feed.reduce((sum, lot) => sum + lotMarginUsdM(lot), 0);
    cumulativeMargin += realizedMargin;
    const discounted = realizedMargin / Math.pow(1 + wacc, period);
    cumulativeDiscounted += discounted;

    stockpile = [
      ...blend.remainingStockpile.map((lot) => ({ ...lot, source: 'stockpile' as const })),
      ...blend.remainingFresh.map((lot) => ({ ...lot, source: 'stockpile' as const })),
    ];
    const closingMass = stockpile.reduce((sum, lot) => sum + lot.massMt, 0);
    const closingGrade = weightedGrade(stockpile);
    const stockpileAdded = blend.remainingFresh.reduce((sum, lot) => sum + lot.massMt, 0);
    const exhausted = index >= remainders.length && closingMass <= EPS;
    const bottleneck: StockpileBottleneck = exhausted
      ? 'inventory-exhausted'
      : close(closingMass, inputs.stockpileCapacityMt)
        ? 'stockpile'
        : close(feedMass, plantCap)
          ? 'plant'
          : close(minedMass, mineCap)
            ? 'mine'
            : close(reclaimed, inputs.reclaimCapacityMtPerPeriod)
              ? 'reclaim'
              : 'none';

    periods.push({
      period,
      startBenchId,
      endBenchId,
      minedMassMt: minedMass,
      freshProcessMassMt: freshProcess,
      nonProcessMassMt: nonProcess,
      directFeedMassMt: directFeed,
      reclaimedMassMt: reclaimed,
      plantFeedMassMt: feedMass,
      plantFeedCuPercent: feedGrade,
      targetCuPercent,
      gradeDeviationCuPercent: feedGrade === null ? null : Math.abs(feedGrade - targetCuPercent),
      withinBlendTolerance: feedGrade === null ? null : Math.abs(feedGrade - targetCuPercent) <= inputs.blendToleranceCuPercent + EPS,
      stockpileAddedMassMt: stockpileAdded,
      closingStockpileMassMt: closingMass,
      closingStockpileCuPercent: closingGrade,
      closingStockpileContainedCuKt: closingGrade === null ? 0 : containedCuKt(closingMass, closingGrade),
      realizedMarginUsdM: realizedMargin,
      discountedOperatingMarginUsdM: discounted,
      cumulativeRealizedMarginUsdM: cumulativeMargin,
      cumulativeDiscountedOperatingMarginUsdM: cumulativeDiscounted,
      mineUtilizationPercent: (minedMass / mineCap) * 100,
      plantUtilizationPercent: (feedMass / plantCap) * 100,
      stockpileUtilizationPercent: (closingMass / inputs.stockpileCapacityMt) * 100,
      reclaimUtilizationPercent: (reclaimed / inputs.reclaimCapacityMtPerPeriod) * 100,
      bottleneck,
    });

    if (minedMass <= EPS && feedMass <= EPS && !exhausted) break;
  }
  return { periods, remainders, stockpile };
}

export function buildBlockBenchStockpileBlending(
  dataset: BlockModelDataset,
  phase: SupportedPhase,
  scope: InventoryScope,
  benchHeightM: BenchHeightM,
  economic: EconomicInputs,
  gradeConfirmation: GradeConfirmation,
  costBasis: BlockCostBasis,
  inputs: StockpileBlendingInputs,
): StockpileBlendingReport {
  const errors = validateStockpileBlendingInputs(inputs);
  if (errors.length) throw new Error(errors.join(' '));
  if (gradeConfirmation !== 'cu-percent') throw new Error('La Etapa 8.8 requiere confirmación explícita de CU = %.');

  const value = buildBlockBenchEconomicValue(dataset, phase, scope, benchHeightM, economic, gradeConfirmation, costBasis);
  const target = inputs.targetCuPercent ?? value.total.weightedCuProcessPercent;
  if (target === null || !Number.isFinite(target) || target <= 0) throw new Error('No existe una ley objetivo válida para blending.');

  const result = runAllocation(value.benches, inputs, target, economic.wacc, inputs.periodCount);
  const full = runAllocation(value.benches, inputs, target, economic.wacc, 1000);
  const scheduledMine = result.periods.reduce((sum, p) => sum + p.minedMassMt, 0);
  const remainingMine = result.remainders.reduce((sum, item) => sum + item.bench.metrics.massMt * item.fraction, 0);
  const feedMass = result.periods.reduce((sum, p) => sum + p.plantFeedMassMt, 0);
  const finalStockpileMass = result.stockpile.reduce((sum, lot) => sum + lot.massMt, 0);
  const finalStockpileGrade = weightedGrade(result.stockpile);
  const realized = result.periods.reduce((sum, p) => sum + p.realizedMarginUsdM, 0);
  const stockpileMargin = result.stockpile.reduce((sum, lot) => sum + lotMarginUsdM(lot), 0);
  const inSituMargin = result.remainders.reduce((sum, item) => sum + item.bench.metrics.selectedMarginUsdM * item.fraction, 0);
  const totalDiscounted = result.periods.reduce((sum, p) => sum + p.discountedOperatingMarginUsdM, 0);
  const totalProcess = value.total.dsrlProcessMassMt;
  const freshProcess = result.periods.reduce((sum, p) => sum + p.freshProcessMassMt, 0);
  const direct = result.periods.reduce((sum, p) => sum + p.directFeedMassMt, 0);
  const reclaimed = result.periods.reduce((sum, p) => sum + p.reclaimedMassMt, 0);
  const added = result.periods.reduce((sum, p) => sum + p.stockpileAddedMassMt, 0);
  const feedCu = result.periods.reduce((sum, p) => sum + (p.plantFeedCuPercent ?? 0) * p.plantFeedMassMt, 0);
  const stockCu = result.stockpile.reduce((sum, lot) => sum + lot.gradeCuPercent * lot.massMt, 0);
  const remainingCu = result.remainders.reduce((sum, item) => sum + processGrade(item.bench) * item.bench.metrics.dsrlProcessMassMt * item.fraction, 0);
  const totalCu = value.benches.reduce((sum, bench) => sum + processGrade(bench) * bench.metrics.dsrlProcessMassMt, 0);
  const sequence = result.periods.flatMap((p) => [p.startBenchId, p.endBenchId]).filter(Boolean) as string[];
  const order = new Map(value.benches.map((bench) => [bench.benchId, bench.sequenceFromTop]));

  return {
    sourceName: dataset.sourceName,
    phase,
    scope,
    benchHeightM,
    inputs: { ...inputs },
    resolvedTargetCuPercent: target,
    periods: result.periods,
    periodsRequiredAtConfiguredCapacity: full.periods.length,
    status: remainingMine <= EPS && finalStockpileMass <= EPS ? 'complete' : 'horizon-shortfall',
    completionPercent: value.total.massMt > 0 ? (scheduledMine / value.total.massMt) * 100 : 100,
    scheduledMineMassMt: scheduledMine,
    remainingMineMassMt: remainingMine,
    totalPlantFeedMassMt: feedMass,
    finalStockpileMassMt: finalStockpileMass,
    finalStockpileCuPercent: finalStockpileGrade,
    finalStockpileContainedCuKt: finalStockpileGrade === null ? 0 : containedCuKt(finalStockpileMass, finalStockpileGrade),
    realizedMarginUsdM: realized,
    unrealizedStockpileMarginUsdM: stockpileMargin,
    remainingInSituMarginUsdM: inSituMargin,
    totalDiscountedOperatingMarginUsdM: totalDiscounted,
    periodsWithinTolerance: result.periods.filter((p) => p.withinBlendTolerance === true).length,
    periodsOutsideTolerance: result.periods.filter((p) => p.withinBlendTolerance === false).length,
    sourceBenchValueReport: value,
    reconciliation: {
      mineMassCloses: close(scheduledMine + remainingMine, value.total.massMt),
      processRoutingCloses: close(freshProcess, direct + added),
      stockpileMassCloses: close(added - reclaimed, finalStockpileMass),
      plantFeedMassCloses: close(feedMass, direct + reclaimed),
      copperBalanceCloses: close(feedCu + stockCu + remainingCu, totalCu),
      valueBalanceCloses: close(realized + stockpileMargin + inSituMargin, value.total.selectedMarginUsdM),
      mineCapacityRespected: result.periods.every((p) => p.mineUtilizationPercent <= 100 + EPS),
      plantCapacityRespected: result.periods.every((p) => p.plantUtilizationPercent <= 100 + EPS),
      stockpileCapacityRespected: result.periods.every((p) => p.stockpileUtilizationPercent <= 100 + EPS),
      reclaimCapacityRespected: result.periods.every((p) => p.reclaimUtilizationPercent <= 100 + EPS),
      verticalPrecedenceRespected: sequence.every((id, index) => index === 0 || (order.get(id) ?? 0) >= (order.get(sequence[index - 1]) ?? 0)),
      noNegativeBalances: result.periods.every((p) => [p.minedMassMt, p.freshProcessMassMt, p.nonProcessMassMt, p.directFeedMassMt, p.reclaimedMassMt, p.plantFeedMassMt, p.stockpileAddedMassMt, p.closingStockpileMassMt].every((v) => v >= -EPS)),
    },
    methodology: {
      sequencePolicy: 'strict-top-down',
      blendingPolicy: 'target-seeking-complementary-lots',
      stockpileLotIdentityPreserved: true,
      partialBenchAllocationAllowed: true,
      partialLotReclaimAllowed: true,
      stockpileLossesModeled: false,
      oxidationModeled: false,
      recoveryByRouteModeled: false,
      equipmentFleetModeled: false,
      haulageModeled: false,
      discountedNpvClaimAllowed: false,
      mineScheduleClaimAllowed: false,
      reserveClaimAllowed: false,
      inventoryLabel: 'simulación preliminar de stockpile y blending dentro del diseño',
    },
    notes: [
      'El stockpile conserva masa, ley y densidad de margen por lote.',
      'El blending prioriza lotes complementarios alto/bajo y luego completa por cercanía al objetivo.',
      'No se modelan pérdidas, oxidación ni recuperación variable por permanencia.',
      'El margen operativo descontado no es VAN.',
      'El resultado no es un plan minero ejecutable ni una declaración de reservas.',
    ],
  };
}
