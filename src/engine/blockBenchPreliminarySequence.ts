import type { BenchHeightM } from './blockBenchInventory';
import { buildBlockBenchEconomicValue, type BenchEconomicValueEntry } from './blockBenchEconomicValue';
import type { InventoryScope } from './blockInventory';
import type { BlockCostBasis, GradeConfirmation } from './blockEconomicClassification';
import type { SupportedPhase } from './blockModelContract';
import type { EconomicInputs } from './economicModel';
import type { BlockModelDataset } from '../utils/blockModelParser';

export interface PreliminarySequenceInputs {
  periodCount: number;
  mineCapacityMtPerPeriod: number;
  plantCapacityMtPerPeriod: number;
  mineUtilization: number;
  plantUtilization: number;
}

export type SequenceValueBasis = 'source-observed' | 'dsrl';
export type PeriodBottleneck = 'mine' | 'plant' | 'dual' | 'inventory-exhausted' | 'none';

export interface BenchScheduleSegment {
  benchId: string;
  sequenceFromTop: number;
  fractionOfBench: number;
  minedMassMt: number;
  processMassMt: number;
  nonProcessMassMt: number;
  sourceProfitNative: number;
  dsrlMarginUsdM: number | null;
}

export interface PreliminarySequencePeriod {
  period: number;
  startBenchId: string | null;
  endBenchId: string | null;
  minedMassMt: number;
  processMassMt: number;
  nonProcessMassMt: number;
  mineUtilizationPercent: number;
  plantUtilizationPercent: number;
  sourceProfitNative: number;
  dsrlMarginUsdM: number | null;
  discountedOperatingMarginUsdM: number | null;
  cumulativeMinedMassMt: number;
  cumulativeProcessMassMt: number;
  cumulativeDsrlMarginUsdM: number | null;
  bottleneck: PeriodBottleneck;
  segments: BenchScheduleSegment[];
}

export interface PreliminarySequenceReport {
  sourceName: string;
  phase: SupportedPhase;
  scope: InventoryScope;
  benchHeightM: BenchHeightM;
  valueBasis: SequenceValueBasis;
  inputs: PreliminarySequenceInputs;
  effectiveMineCapacityMtPerPeriod: number;
  effectivePlantCapacityMtPerPeriod: number;
  periods: PreliminarySequencePeriod[];
  periodsRequiredAtConfiguredCapacity: number;
  status: 'complete' | 'horizon-shortfall';
  completionPercent: number;
  scheduledMassMt: number;
  scheduledProcessMassMt: number;
  remainingMassMt: number;
  remainingProcessMassMt: number;
  scheduledDsrlMarginUsdM: number | null;
  remainingDsrlMarginUsdM: number | null;
  totalDiscountedOperatingMarginUsdM: number | null;
  reconciliation: {
    massCloses: boolean;
    processCloses: boolean;
    valueCloses: boolean | null;
    periodSegmentsClose: boolean;
    mineCapacityRespected: boolean;
    plantCapacityRespected: boolean;
    verticalPrecedenceRespected: boolean;
    noNegativeAllocations: boolean;
  };
  methodology: {
    sequencePolicy: 'strict-top-down';
    partialBenchAllocationAllowed: true;
    stockpilingAllowed: false;
    blendingModeled: false;
    equipmentFleetModeled: false;
    haulageModeled: false;
    geotechnicalConstraintsModeled: false;
    discountedNpvClaimAllowed: false;
    mineScheduleClaimAllowed: false;
    reserveClaimAllowed: false;
    inventoryLabel: 'asignación preliminar de capacidad por banco dentro del diseño';
  };
  notes: string[];
}

interface Remainder { bench: BenchEconomicValueEntry; fraction: number }
interface Allocation { periods: PreliminarySequencePeriod[]; remaining: Remainder[] }

const EPS = 1e-10;

export function createPreliminarySequenceInputs(
  economic: EconomicInputs,
  overrides: Partial<PreliminarySequenceInputs> = {},
): PreliminarySequenceInputs {
  return {
    periodCount: 5,
    mineCapacityMtPerPeriod: economic.annualProductionMt * (1 + economic.stripRatio),
    plantCapacityMtPerPeriod: economic.annualProductionMt,
    mineUtilization: 1,
    plantUtilization: 1,
    ...overrides,
  };
}

export function validatePreliminarySequenceInputs(i: PreliminarySequenceInputs): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(i.periodCount) || i.periodCount < 1 || i.periodCount > 100) errors.push('periodCount debe ser entero entre 1 y 100.');
  if (!Number.isFinite(i.mineCapacityMtPerPeriod) || i.mineCapacityMtPerPeriod <= 0) errors.push('Capacidad mina inválida.');
  if (!Number.isFinite(i.plantCapacityMtPerPeriod) || i.plantCapacityMtPerPeriod <= 0) errors.push('Capacidad planta inválida.');
  if (!Number.isFinite(i.mineUtilization) || i.mineUtilization <= 0 || i.mineUtilization > 1) errors.push('Utilización mina fuera de (0,1].');
  if (!Number.isFinite(i.plantUtilization) || i.plantUtilization <= 0 || i.plantUtilization > 1) errors.push('Utilización planta fuera de (0,1].');
  return errors;
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
}

function processMt(b: BenchEconomicValueEntry, basis: SequenceValueBasis): number {
  return basis === 'dsrl' ? b.metrics.dsrlProcessMassMt : b.metrics.sourceProcessMassMt;
}

function marginM(b: BenchEconomicValueEntry, basis: SequenceValueBasis): number | null {
  return basis === 'dsrl' ? b.metrics.selectedMarginUsdM : null;
}

function allocate(
  benches: BenchEconomicValueEntry[],
  inputs: PreliminarySequenceInputs,
  basis: SequenceValueBasis,
  wacc: number,
  limit: number,
): Allocation {
  const mineCap = inputs.mineCapacityMtPerPeriod * inputs.mineUtilization;
  const plantCap = inputs.plantCapacityMtPerPeriod * inputs.plantUtilization;
  const remaining = benches.map((bench) => ({ bench, fraction: 1 }));
  const periods: PreliminarySequencePeriod[] = [];
  let index = 0;
  let cumMine = 0;
  let cumProcess = 0;
  let cumMargin = 0;

  for (let p = 1; p <= limit && index < remaining.length; p += 1) {
    let mineLeft = mineCap;
    let plantLeft = plantCap;
    let mined = 0;
    let process = 0;
    let sourceProfit = 0;
    let dsrlMargin = 0;
    const segments: BenchScheduleSegment[] = [];

    while (index < remaining.length && mineLeft > EPS) {
      const item = remaining[index];
      const massLeft = item.bench.metrics.massMt * item.fraction;
      const processLeft = processMt(item.bench, basis) * item.fraction;
      if (massLeft <= EPS) { item.fraction = 0; index += 1; continue; }
      const share = Math.min(
        1,
        mineLeft / massLeft,
        processLeft > EPS ? plantLeft / processLeft : Number.POSITIVE_INFINITY,
      );
      if (!Number.isFinite(share) || share <= EPS) break;

      const fractionOfBench = item.fraction * share;
      const mass = item.bench.metrics.massMt * fractionOfBench;
      const ore = processMt(item.bench, basis) * fractionOfBench;
      const value = marginM(item.bench, basis);
      const allocatedMargin = value === null ? null : value * fractionOfBench;
      segments.push({
        benchId: item.bench.benchId,
        sequenceFromTop: item.bench.sequenceFromTop,
        fractionOfBench,
        minedMassMt: mass,
        processMassMt: ore,
        nonProcessMassMt: Math.max(mass - ore, 0),
        sourceProfitNative: item.bench.metrics.sourceProfitNative * fractionOfBench,
        dsrlMarginUsdM: allocatedMargin,
      });
      mined += mass;
      process += ore;
      sourceProfit += item.bench.metrics.sourceProfitNative * fractionOfBench;
      dsrlMargin += allocatedMargin ?? 0;
      mineLeft = Math.max(mineLeft - mass, 0);
      plantLeft = Math.max(plantLeft - ore, 0);
      item.fraction = Math.max(item.fraction - fractionOfBench, 0);
      if (item.fraction <= EPS) { item.fraction = 0; index += 1; }
      if (plantLeft <= EPS && index < remaining.length && processMt(remaining[index].bench, basis) * remaining[index].fraction > EPS) break;
    }

    if (segments.length === 0) break;
    cumMine += mined;
    cumProcess += process;
    if (basis === 'dsrl') cumMargin += dsrlMargin;
    const discounted = basis === 'dsrl' ? dsrlMargin / Math.pow(1 + wacc, p) : null;
    const mineFull = close(mined, mineCap);
    const plantFull = close(process, plantCap);
    const exhausted = index >= remaining.length;
    const bottleneck: PeriodBottleneck = exhausted ? 'inventory-exhausted' : mineFull && plantFull ? 'dual' : mineFull ? 'mine' : plantFull ? 'plant' : 'none';

    periods.push({
      period: p,
      startBenchId: segments[0]?.benchId ?? null,
      endBenchId: segments.at(-1)?.benchId ?? null,
      minedMassMt: mined,
      processMassMt: process,
      nonProcessMassMt: Math.max(mined - process, 0),
      mineUtilizationPercent: (mined / mineCap) * 100,
      plantUtilizationPercent: (process / plantCap) * 100,
      sourceProfitNative: sourceProfit,
      dsrlMarginUsdM: basis === 'dsrl' ? dsrlMargin : null,
      discountedOperatingMarginUsdM: discounted,
      cumulativeMinedMassMt: cumMine,
      cumulativeProcessMassMt: cumProcess,
      cumulativeDsrlMarginUsdM: basis === 'dsrl' ? cumMargin : null,
      bottleneck,
      segments,
    });
  }
  return { periods, remaining };
}

function remainingTotals(items: Remainder[], basis: SequenceValueBasis) {
  return items.reduce(
    (a, item) => {
      a.mass += item.bench.metrics.massMt * item.fraction;
      a.process += processMt(item.bench, basis) * item.fraction;
      a.margin += (marginM(item.bench, basis) ?? 0) * item.fraction;
      return a;
    },
    { mass: 0, process: 0, margin: 0 },
  );
}

export function buildBlockBenchPreliminarySequence(
  dataset: BlockModelDataset,
  phase: SupportedPhase,
  scope: InventoryScope,
  benchHeightM: BenchHeightM,
  economic: EconomicInputs,
  gradeConfirmation: GradeConfirmation,
  costBasis: BlockCostBasis,
  inputs: PreliminarySequenceInputs,
): PreliminarySequenceReport {
  const errors = validatePreliminarySequenceInputs(inputs);
  if (errors.length) throw new Error(errors.join(' '));

  const value = buildBlockBenchEconomicValue(dataset, phase, scope, benchHeightM, economic, gradeConfirmation, costBasis);
  const basis: SequenceValueBasis = value.dsrlClassificationEnabled ? 'dsrl' : 'source-observed';
  const result = allocate(value.benches, inputs, basis, economic.wacc, inputs.periodCount);
  const full = allocate(value.benches, inputs, basis, economic.wacc, 1000);
  const remaining = remainingTotals(result.remaining, basis);
  const scheduledMass = result.periods.reduce((s, p) => s + p.minedMassMt, 0);
  const scheduledProcess = result.periods.reduce((s, p) => s + p.processMassMt, 0);
  const scheduledMargin = basis === 'dsrl' ? result.periods.reduce((s, p) => s + (p.dsrlMarginUsdM ?? 0), 0) : null;
  const discounted = basis === 'dsrl' ? result.periods.reduce((s, p) => s + (p.discountedOperatingMarginUsdM ?? 0), 0) : null;
  const totalProcess = basis === 'dsrl' ? value.total.dsrlProcessMassMt : value.total.sourceProcessMassMt;
  const mineCap = inputs.mineCapacityMtPerPeriod * inputs.mineUtilization;
  const plantCap = inputs.plantCapacityMtPerPeriod * inputs.plantUtilization;
  const sequence = result.periods.flatMap((p) => p.segments.map((s) => s.sequenceFromTop));

  return {
    sourceName: dataset.sourceName,
    phase,
    scope,
    benchHeightM,
    valueBasis: basis,
    inputs: { ...inputs },
    effectiveMineCapacityMtPerPeriod: mineCap,
    effectivePlantCapacityMtPerPeriod: plantCap,
    periods: result.periods,
    periodsRequiredAtConfiguredCapacity: full.periods.length,
    status: remaining.mass <= EPS ? 'complete' : 'horizon-shortfall',
    completionPercent: value.total.massMt > 0 ? (scheduledMass / value.total.massMt) * 100 : 100,
    scheduledMassMt: scheduledMass,
    scheduledProcessMassMt: scheduledProcess,
    remainingMassMt: remaining.mass,
    remainingProcessMassMt: remaining.process,
    scheduledDsrlMarginUsdM: scheduledMargin,
    remainingDsrlMarginUsdM: basis === 'dsrl' ? remaining.margin : null,
    totalDiscountedOperatingMarginUsdM: discounted,
    reconciliation: {
      massCloses: close(scheduledMass + remaining.mass, value.total.massMt),
      processCloses: close(scheduledProcess + remaining.process, totalProcess),
      valueCloses: basis === 'dsrl' ? close((scheduledMargin ?? 0) + remaining.margin, value.total.selectedMarginUsdM) : null,
      periodSegmentsClose: result.periods.every((p) => close(p.minedMassMt, p.segments.reduce((s, x) => s + x.minedMassMt, 0)) && close(p.processMassMt, p.segments.reduce((s, x) => s + x.processMassMt, 0))),
      mineCapacityRespected: result.periods.every((p) => p.minedMassMt <= mineCap + EPS),
      plantCapacityRespected: result.periods.every((p) => p.processMassMt <= plantCap + EPS),
      verticalPrecedenceRespected: sequence.every((x, i) => i === 0 || x >= sequence[i - 1]),
      noNegativeAllocations: result.periods.every((p) => p.segments.every((s) => s.fractionOfBench >= -EPS && s.minedMassMt >= -EPS && s.processMassMt >= -EPS)),
    },
    methodology: {
      sequencePolicy: 'strict-top-down',
      partialBenchAllocationAllowed: true,
      stockpilingAllowed: false,
      blendingModeled: false,
      equipmentFleetModeled: false,
      haulageModeled: false,
      geotechnicalConstraintsModeled: false,
      discountedNpvClaimAllowed: false,
      mineScheduleClaimAllowed: false,
      reserveClaimAllowed: false,
      inventoryLabel: 'asignación preliminar de capacidad por banco dentro del diseño',
    },
    notes: [
      'Precedencia vertical estricta de techo a fondo.',
      'Los bancos pueden dividirse proporcionalmente entre periodos.',
      'No existe stockpile implícito: masa y proceso avanzan juntos.',
      'El margen operativo descontado no es VAN.',
      'No se modelan equipos, rutas, blending ni restricciones geotécnicas.',
      'El resultado no es un plan minero ejecutable ni una declaración de reservas.',
    ],
  };
}
