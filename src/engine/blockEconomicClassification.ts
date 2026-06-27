import {
  SUPPORTED_PHASES,
  classifyDestination,
  type SupportedPhase,
} from './blockModelContract';
import type { InventoryScope } from './blockInventory';
import {
  validateEconomicInputs,
  type EconomicInputs,
} from './economicModel';
import type {
  BlockModelDataset,
  NormalizedBlockModelRow,
} from '../utils/blockModelParser';

export type BlockCostBasis = 'processing-only' | 'full-cost';
export type GradeConfirmation = 'unconfirmed' | 'cu-percent';
export type EconomicDestinationClass = 'process' | 'waste' | 'unknown';
export type DsrlDestinationClass = 'process' | 'waste' | 'locked';
export type ReclassificationCode =
  | 'retained-process'
  | 'retained-waste'
  | 'upgrade-to-process'
  | 'downgrade-to-waste'
  | 'uncompared'
  | 'locked';

export interface BlockEconomicTrace {
  blockKey: string;
  phase: SupportedPhase;
  cuNative: number;
  observedDestination: string;
  observedClass: EconomicDestinationClass;
  sourceProfitNative: number | null;
  dsrlClass: DsrlDestinationClass;
  dsrlMarginUsd: number | null;
  code: ReclassificationCode;
  reason: string;
}

export interface SourceEconomicMetrics {
  blockCount: number;
  massT: number;
  massMt: number;
  processMassT: number;
  processMassMt: number;
  wasteMassT: number;
  wasteMassMt: number;
  unknownMassT: number;
  unknownMassMt: number;
  millMassT: number;
  millMassMt: number;
  leachMassT: number;
  leachMassMt: number;
  sourceRevenueNative: number;
  sourceProcessCostNative: number;
  sourceMiningCostNative: number;
  sourceProfitNative: number;
  economicsCoverageRows: number;
  economicsCoveragePercent: number;
  positiveProfitRows: number;
  nonPositiveProfitRows: number;
  processWithNonPositiveProfitRows: number;
  processWithNonPositiveProfitMassMt: number;
  wasteWithPositiveProfitRows: number;
  wasteWithPositiveProfitMassMt: number;
  weightedCuAllNative: number | null;
  weightedCuObservedProcessNative: number | null;
  maxProfitReconciliationError: number;
  profitReconciliationRowsOutsideTolerance: number;
}

export interface DsrlEconomicMetrics {
  enabled: boolean;
  cutoffGradePercent: number | null;
  classificationCostUsdPerTonne: number | null;
  netMetalPriceUsdPerTonne: number | null;
  processMassT: number;
  processMassMt: number;
  wasteMassT: number;
  wasteMassMt: number;
  selectedRevenueUsdM: number;
  selectedProcessingCostUsdM: number;
  selectedMiningCostUsdM: number;
  selectedMarginUsdM: number;
  retainedProcessRows: number;
  retainedProcessMassMt: number;
  retainedWasteRows: number;
  retainedWasteMassMt: number;
  upgradeRows: number;
  upgradeMassMt: number;
  downgradeRows: number;
  downgradeMassMt: number;
  uncomparedRows: number;
  uncomparedMassMt: number;
  weightedCuProcessPercent: number | null;
  traceExamples: BlockEconomicTrace[];
}

export interface BlockEconomicMetrics {
  source: SourceEconomicMetrics;
  dsrl: DsrlEconomicMetrics;
  reconciliation: {
    sourceMassCloses: boolean;
    sourceRouteMassCloses: boolean;
    sourceProfitCloses: boolean;
    dsrlMassCloses: boolean | null;
    reclassificationMassCloses: boolean | null;
    dsrlValueCloses: boolean | null;
  };
}

export interface PhaseBlockEconomicInventory {
  phase: SupportedPhase;
  incremental: BlockEconomicMetrics;
  cumulative: BlockEconomicMetrics;
}

export interface BlockEconomicClassificationReport {
  sourceName: string;
  gradeConfirmation: GradeConfirmation;
  costBasis: BlockCostBasis;
  dsrlClassificationEnabled: boolean;
  economicScenarioValid: boolean;
  cutoffGradePercent: number | null;
  classificationCostUsdPerTonne: number | null;
  netMetalPriceUsdPerTonne: number | null;
  phases: PhaseBlockEconomicInventory[];
  activeBlockCount: number;
  excludedFutureBlockCount: number;
  reconciliation: {
    incrementalBlockCountCloses: boolean;
    incrementalMassCloses: boolean;
    cumulativeMonotonic: boolean;
  };
  methodology: {
    observedDestinationField: 'NPVPDEST';
    observedProfitField: 'NPVPROFT';
    observedCurrencyUnitConfirmed: false;
    dsrlGradeField: 'CU';
    dsrlGradeUnitConfirmed: boolean;
    dsrlClassificationLevel: 'process-vs-waste';
    millLeachReclassificationSupported: false;
    discountedNpv: false;
    capexIncluded: false;
    taxIncluded: false;
    globalStripRatioIncluded: false;
    wasteMiningCostIncluded: false;
    inventoryLabel: 'inventario económico preliminar dentro del diseño';
    reserveClaimAllowed: false;
  };
  notes: string[];
}

interface EconomicAccumulator {
  blockCount: number;
  massT: number;
  sourceProcessMassT: number;
  sourceWasteMassT: number;
  sourceUnknownMassT: number;
  sourceMillMassT: number;
  sourceLeachMassT: number;
  sourceRevenueNative: number;
  sourceProcessCostNative: number;
  sourceMiningCostNative: number;
  sourceProfitNative: number;
  sourceEconomicsRows: number;
  sourcePositiveProfitRows: number;
  sourceNonPositiveProfitRows: number;
  sourceProcessNonPositiveRows: number;
  sourceProcessNonPositiveMassT: number;
  sourceWastePositiveRows: number;
  sourceWastePositiveMassT: number;
  sourceCuMassAll: number;
  sourceCuMassProcess: number;
  maxProfitReconciliationError: number;
  profitRowsOutsideTolerance: number;
  dsrlProcessMassT: number;
  dsrlWasteMassT: number;
  dsrlSelectedRevenueUsd: number;
  dsrlSelectedProcessingCostUsd: number;
  dsrlSelectedMiningCostUsd: number;
  dsrlSelectedMarginUsd: number;
  dsrlCuMassProcess: number;
  retainedProcessRows: number;
  retainedProcessMassT: number;
  retainedWasteRows: number;
  retainedWasteMassT: number;
  upgradeRows: number;
  upgradeMassT: number;
  downgradeRows: number;
  downgradeMassT: number;
  uncomparedRows: number;
  uncomparedMassT: number;
  traceExamples: BlockEconomicTrace[];
}

const PROFIT_TOLERANCE = 1e-6;
const TRACE_LIMIT = 12;

function blankAccumulator(): EconomicAccumulator {
  return {
    blockCount: 0,
    massT: 0,
    sourceProcessMassT: 0,
    sourceWasteMassT: 0,
    sourceUnknownMassT: 0,
    sourceMillMassT: 0,
    sourceLeachMassT: 0,
    sourceRevenueNative: 0,
    sourceProcessCostNative: 0,
    sourceMiningCostNative: 0,
    sourceProfitNative: 0,
    sourceEconomicsRows: 0,
    sourcePositiveProfitRows: 0,
    sourceNonPositiveProfitRows: 0,
    sourceProcessNonPositiveRows: 0,
    sourceProcessNonPositiveMassT: 0,
    sourceWastePositiveRows: 0,
    sourceWastePositiveMassT: 0,
    sourceCuMassAll: 0,
    sourceCuMassProcess: 0,
    maxProfitReconciliationError: 0,
    profitRowsOutsideTolerance: 0,
    dsrlProcessMassT: 0,
    dsrlWasteMassT: 0,
    dsrlSelectedRevenueUsd: 0,
    dsrlSelectedProcessingCostUsd: 0,
    dsrlSelectedMiningCostUsd: 0,
    dsrlSelectedMarginUsd: 0,
    dsrlCuMassProcess: 0,
    retainedProcessRows: 0,
    retainedProcessMassT: 0,
    retainedWasteRows: 0,
    retainedWasteMassT: 0,
    upgradeRows: 0,
    upgradeMassT: 0,
    downgradeRows: 0,
    downgradeMassT: 0,
    uncomparedRows: 0,
    uncomparedMassT: 0,
    traceExamples: [],
  };
}

function closeEnough(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(left), Math.abs(right));
}

function observedClass(row: NormalizedBlockModelRow): EconomicDestinationClass {
  return classifyDestination(row.NPVPDEST);
}

function addSource(accumulator: EconomicAccumulator, row: NormalizedBlockModelRow): void {
  const sourceClass = observedClass(row);
  accumulator.blockCount += 1;
  accumulator.massT += row.NPVMASS;
  accumulator.sourceCuMassAll += row.CU * row.NPVMASS;

  if (sourceClass === 'process') {
    accumulator.sourceProcessMassT += row.NPVMASS;
    accumulator.sourceCuMassProcess += row.CU * row.NPVMASS;
    if (row.NPVPDEST === 'Mill') accumulator.sourceMillMassT += row.NPVMASS;
    if (row.NPVPDEST === 'Leach') accumulator.sourceLeachMassT += row.NPVMASS;
  } else if (sourceClass === 'waste') {
    accumulator.sourceWasteMassT += row.NPVMASS;
  } else {
    accumulator.sourceUnknownMassT += row.NPVMASS;
  }

  const complete = [row.NPVREVEN, row.NPVPCOST, row.NPVMCOST, row.NPVPROFT]
    .every((value) => value !== undefined && Number.isFinite(value));
  if (!complete) return;

  const revenue = row.NPVREVEN!;
  const processCost = row.NPVPCOST!;
  const miningCost = row.NPVMCOST!;
  const profit = row.NPVPROFT!;
  accumulator.sourceEconomicsRows += 1;
  accumulator.sourceRevenueNative += revenue;
  accumulator.sourceProcessCostNative += processCost;
  accumulator.sourceMiningCostNative += miningCost;
  accumulator.sourceProfitNative += profit;

  if (profit > 0) accumulator.sourcePositiveProfitRows += 1;
  else accumulator.sourceNonPositiveProfitRows += 1;

  if (sourceClass === 'process' && profit <= 0) {
    accumulator.sourceProcessNonPositiveRows += 1;
    accumulator.sourceProcessNonPositiveMassT += row.NPVMASS;
  }
  if (sourceClass === 'waste' && profit > 0) {
    accumulator.sourceWastePositiveRows += 1;
    accumulator.sourceWastePositiveMassT += row.NPVMASS;
  }

  const error = Math.abs(profit - (revenue - processCost - miningCost));
  accumulator.maxProfitReconciliationError = Math.max(
    accumulator.maxProfitReconciliationError,
    error,
  );
  if (error > PROFIT_TOLERANCE) accumulator.profitRowsOutsideTolerance += 1;
}

function classificationCode(
  sourceClass: EconomicDestinationClass,
  dsrlClass: 'process' | 'waste',
): ReclassificationCode {
  if (sourceClass === 'unknown') return 'uncompared';
  if (sourceClass === 'process' && dsrlClass === 'process') return 'retained-process';
  if (sourceClass === 'waste' && dsrlClass === 'waste') return 'retained-waste';
  if (sourceClass === 'waste' && dsrlClass === 'process') return 'upgrade-to-process';
  return 'downgrade-to-waste';
}

function reason(code: ReclassificationCode, cutoff: number): string {
  if (code === 'upgrade-to-process') return `CU supera la ley de corte DSRL ${cutoff.toFixed(4)}%.`;
  if (code === 'downgrade-to-waste') return `CU no genera margen positivo sobre ${cutoff.toFixed(4)}%.`;
  if (code === 'retained-process') return 'Destino fuente y DSRL mantienen proceso.';
  if (code === 'retained-waste') return 'Destino fuente y DSRL mantienen desmonte.';
  return 'Destino fuente no comparable en proceso/desmonte.';
}

function addDsrl(
  accumulator: EconomicAccumulator,
  row: NormalizedBlockModelRow,
  phase: SupportedPhase,
  cutoffGradePercent: number,
  netMetalPriceUsdPerTonne: number,
  processingCostUsdPerTonne: number,
  miningCostUsdPerTonne: number,
): void {
  const revenueUsd = row.NPVMASS * (row.CU / 100) * netMetalPriceUsdPerTonne;
  const processingCostUsd = row.NPVMASS * processingCostUsdPerTonne;
  const miningCostUsd = row.NPVMASS * miningCostUsdPerTonne;
  const marginUsd = revenueUsd - processingCostUsd - miningCostUsd;
  const dsrlClass: 'process' | 'waste' =
    row.CU >= cutoffGradePercent && marginUsd > 0 ? 'process' : 'waste';

  if (dsrlClass === 'process') {
    accumulator.dsrlProcessMassT += row.NPVMASS;
    accumulator.dsrlSelectedRevenueUsd += revenueUsd;
    accumulator.dsrlSelectedProcessingCostUsd += processingCostUsd;
    accumulator.dsrlSelectedMiningCostUsd += miningCostUsd;
    accumulator.dsrlSelectedMarginUsd += marginUsd;
    accumulator.dsrlCuMassProcess += row.CU * row.NPVMASS;
  } else {
    accumulator.dsrlWasteMassT += row.NPVMASS;
  }

  const sourceClass = observedClass(row);
  const code = classificationCode(sourceClass, dsrlClass);
  if (code === 'retained-process') {
    accumulator.retainedProcessRows += 1;
    accumulator.retainedProcessMassT += row.NPVMASS;
  } else if (code === 'retained-waste') {
    accumulator.retainedWasteRows += 1;
    accumulator.retainedWasteMassT += row.NPVMASS;
  } else if (code === 'upgrade-to-process') {
    accumulator.upgradeRows += 1;
    accumulator.upgradeMassT += row.NPVMASS;
  } else if (code === 'downgrade-to-waste') {
    accumulator.downgradeRows += 1;
    accumulator.downgradeMassT += row.NPVMASS;
  } else {
    accumulator.uncomparedRows += 1;
    accumulator.uncomparedMassT += row.NPVMASS;
  }

  if (
    accumulator.traceExamples.length < TRACE_LIMIT &&
    (code === 'upgrade-to-process' || code === 'downgrade-to-waste')
  ) {
    accumulator.traceExamples.push({
      blockKey: row.blockKey,
      phase,
      cuNative: row.CU,
      observedDestination: row.NPVPDEST,
      observedClass: sourceClass,
      sourceProfitNative: row.NPVPROFT ?? null,
      dsrlClass,
      dsrlMarginUsd: marginUsd,
      code,
      reason: reason(code, cutoffGradePercent),
    });
  }
}

function merge(left: EconomicAccumulator, right: EconomicAccumulator): EconomicAccumulator {
  const result = blankAccumulator();
  for (const key of Object.keys(result) as Array<keyof EconomicAccumulator>) {
    if (key === 'traceExamples') continue;
    const leftValue = left[key];
    const rightValue = right[key];
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      (result[key] as number) = leftValue + rightValue;
    }
  }
  result.maxProfitReconciliationError = Math.max(
    left.maxProfitReconciliationError,
    right.maxProfitReconciliationError,
  );
  result.traceExamples = [...left.traceExamples, ...right.traceExamples].slice(0, TRACE_LIMIT);
  return result;
}

function finalize(
  accumulator: EconomicAccumulator,
  enabled: boolean,
  cutoffGradePercent: number | null,
  classificationCostUsdPerTonne: number | null,
  netMetalPriceUsdPerTonne: number | null,
): BlockEconomicMetrics {
  const source: SourceEconomicMetrics = {
    blockCount: accumulator.blockCount,
    massT: accumulator.massT,
    massMt: accumulator.massT / 1_000_000,
    processMassT: accumulator.sourceProcessMassT,
    processMassMt: accumulator.sourceProcessMassT / 1_000_000,
    wasteMassT: accumulator.sourceWasteMassT,
    wasteMassMt: accumulator.sourceWasteMassT / 1_000_000,
    unknownMassT: accumulator.sourceUnknownMassT,
    unknownMassMt: accumulator.sourceUnknownMassT / 1_000_000,
    millMassT: accumulator.sourceMillMassT,
    millMassMt: accumulator.sourceMillMassT / 1_000_000,
    leachMassT: accumulator.sourceLeachMassT,
    leachMassMt: accumulator.sourceLeachMassT / 1_000_000,
    sourceRevenueNative: accumulator.sourceRevenueNative,
    sourceProcessCostNative: accumulator.sourceProcessCostNative,
    sourceMiningCostNative: accumulator.sourceMiningCostNative,
    sourceProfitNative: accumulator.sourceProfitNative,
    economicsCoverageRows: accumulator.sourceEconomicsRows,
    economicsCoveragePercent:
      accumulator.blockCount > 0
        ? (accumulator.sourceEconomicsRows / accumulator.blockCount) * 100
        : 0,
    positiveProfitRows: accumulator.sourcePositiveProfitRows,
    nonPositiveProfitRows: accumulator.sourceNonPositiveProfitRows,
    processWithNonPositiveProfitRows: accumulator.sourceProcessNonPositiveRows,
    processWithNonPositiveProfitMassMt:
      accumulator.sourceProcessNonPositiveMassT / 1_000_000,
    wasteWithPositiveProfitRows: accumulator.sourceWastePositiveRows,
    wasteWithPositiveProfitMassMt:
      accumulator.sourceWastePositiveMassT / 1_000_000,
    weightedCuAllNative:
      accumulator.massT > 0 ? accumulator.sourceCuMassAll / accumulator.massT : null,
    weightedCuObservedProcessNative:
      accumulator.sourceProcessMassT > 0
        ? accumulator.sourceCuMassProcess / accumulator.sourceProcessMassT
        : null,
    maxProfitReconciliationError: accumulator.maxProfitReconciliationError,
    profitReconciliationRowsOutsideTolerance: accumulator.profitRowsOutsideTolerance,
  };

  const dsrl: DsrlEconomicMetrics = {
    enabled,
    cutoffGradePercent,
    classificationCostUsdPerTonne,
    netMetalPriceUsdPerTonne,
    processMassT: enabled ? accumulator.dsrlProcessMassT : 0,
    processMassMt: enabled ? accumulator.dsrlProcessMassT / 1_000_000 : 0,
    wasteMassT: enabled ? accumulator.dsrlWasteMassT : 0,
    wasteMassMt: enabled ? accumulator.dsrlWasteMassT / 1_000_000 : 0,
    selectedRevenueUsdM: enabled ? accumulator.dsrlSelectedRevenueUsd / 1_000_000 : 0,
    selectedProcessingCostUsdM:
      enabled ? accumulator.dsrlSelectedProcessingCostUsd / 1_000_000 : 0,
    selectedMiningCostUsdM:
      enabled ? accumulator.dsrlSelectedMiningCostUsd / 1_000_000 : 0,
    selectedMarginUsdM: enabled ? accumulator.dsrlSelectedMarginUsd / 1_000_000 : 0,
    retainedProcessRows: enabled ? accumulator.retainedProcessRows : 0,
    retainedProcessMassMt:
      enabled ? accumulator.retainedProcessMassT / 1_000_000 : 0,
    retainedWasteRows: enabled ? accumulator.retainedWasteRows : 0,
    retainedWasteMassMt:
      enabled ? accumulator.retainedWasteMassT / 1_000_000 : 0,
    upgradeRows: enabled ? accumulator.upgradeRows : 0,
    upgradeMassMt: enabled ? accumulator.upgradeMassT / 1_000_000 : 0,
    downgradeRows: enabled ? accumulator.downgradeRows : 0,
    downgradeMassMt: enabled ? accumulator.downgradeMassT / 1_000_000 : 0,
    uncomparedRows: enabled ? accumulator.uncomparedRows : 0,
    uncomparedMassMt: enabled ? accumulator.uncomparedMassT / 1_000_000 : 0,
    weightedCuProcessPercent:
      enabled && accumulator.dsrlProcessMassT > 0
        ? accumulator.dsrlCuMassProcess / accumulator.dsrlProcessMassT
        : null,
    traceExamples: enabled ? accumulator.traceExamples : [],
  };

  return {
    source,
    dsrl,
    reconciliation: {
      sourceMassCloses: closeEnough(
        accumulator.massT,
        accumulator.sourceProcessMassT +
          accumulator.sourceWasteMassT +
          accumulator.sourceUnknownMassT,
      ),
      sourceRouteMassCloses: closeEnough(
        accumulator.sourceProcessMassT,
        accumulator.sourceMillMassT + accumulator.sourceLeachMassT,
      ),
      sourceProfitCloses: accumulator.profitRowsOutsideTolerance === 0,
      dsrlMassCloses: enabled
        ? closeEnough(
            accumulator.massT,
            accumulator.dsrlProcessMassT + accumulator.dsrlWasteMassT,
          )
        : null,
      reclassificationMassCloses: enabled
        ? closeEnough(
            accumulator.massT,
            accumulator.retainedProcessMassT +
              accumulator.retainedWasteMassT +
              accumulator.upgradeMassT +
              accumulator.downgradeMassT +
              accumulator.uncomparedMassT,
          )
        : null,
      dsrlValueCloses: enabled
        ? closeEnough(
            accumulator.dsrlSelectedMarginUsd,
            accumulator.dsrlSelectedRevenueUsd -
              accumulator.dsrlSelectedProcessingCostUsd -
              accumulator.dsrlSelectedMiningCostUsd,
          )
        : null,
    },
  };
}

export function calculateBlockCutoffPercent(
  inputs: EconomicInputs,
  costBasis: BlockCostBasis,
): {
  cutoffGradePercent: number;
  classificationCostUsdPerTonne: number;
  netMetalPriceUsdPerTonne: number;
  processingCostUsdPerTonne: number;
  miningCostUsdPerTonne: number;
} {
  const validation = validateEconomicInputs(inputs);
  if (!validation.valid) {
    throw new Error('El escenario económico DSRL no es válido para clasificar bloques.');
  }

  const processingCostUsdPerTonne = inputs.processingCostUsdPerTonneOre;
  const miningCostUsdPerTonne =
    costBasis === 'full-cost' ? inputs.miningCostUsdPerTonneMoved : 0;
  const classificationCostUsdPerTonne =
    processingCostUsdPerTonne + miningCostUsdPerTonne;
  const netMetalPriceUsdPerTonne =
    inputs.metalPriceUsdPerTonne *
    inputs.plantRecovery *
    inputs.payableFactor *
    (1 - inputs.royaltyRate);
  const revenuePerGradePercent = netMetalPriceUsdPerTonne * 0.01;

  return {
    cutoffGradePercent:
      revenuePerGradePercent > 0
        ? classificationCostUsdPerTonne / revenuePerGradePercent
        : Number.POSITIVE_INFINITY,
    classificationCostUsdPerTonne,
    netMetalPriceUsdPerTonne,
    processingCostUsdPerTonne,
    miningCostUsdPerTonne,
  };
}

export function buildBlockEconomicClassification(
  dataset: BlockModelDataset,
  economicInputs: EconomicInputs,
  gradeConfirmation: GradeConfirmation,
  costBasis: BlockCostBasis,
): BlockEconomicClassificationReport {
  const economicScenarioValid = validateEconomicInputs(economicInputs).valid;
  const enabled = gradeConfirmation === 'cu-percent' && economicScenarioValid;
  const cutoff = enabled
    ? calculateBlockCutoffPercent(economicInputs, costBasis)
    : null;

  const incremental = new Map<SupportedPhase, EconomicAccumulator>();
  for (const phase of SUPPORTED_PHASES) incremental.set(phase, blankAccumulator());

  let activeBlockCount = 0;
  let excludedFutureBlockCount = 0;
  for (const row of dataset.rows) {
    if (!SUPPORTED_PHASES.includes(row.PSB_PIT as SupportedPhase)) {
      excludedFutureBlockCount += 1;
      continue;
    }

    const phase = row.PSB_PIT as SupportedPhase;
    const accumulator = incremental.get(phase)!;
    addSource(accumulator, row);
    if (enabled && cutoff) {
      addDsrl(
        accumulator,
        row,
        phase,
        cutoff.cutoffGradePercent,
        cutoff.netMetalPriceUsdPerTonne,
        cutoff.processingCostUsdPerTonne,
        cutoff.miningCostUsdPerTonne,
      );
    }
    activeBlockCount += 1;
  }

  let cumulative = blankAccumulator();
  const phases = SUPPORTED_PHASES.map((phase) => {
    const phaseAccumulator = incremental.get(phase)!;
    cumulative = merge(cumulative, phaseAccumulator);
    return {
      phase,
      incremental: finalize(
        phaseAccumulator,
        enabled,
        cutoff?.cutoffGradePercent ?? null,
        cutoff?.classificationCostUsdPerTonne ?? null,
        cutoff?.netMetalPriceUsdPerTonne ?? null,
      ),
      cumulative: finalize(
        cumulative,
        enabled,
        cutoff?.cutoffGradePercent ?? null,
        cutoff?.classificationCostUsdPerTonne ?? null,
        cutoff?.netMetalPriceUsdPerTonne ?? null,
      ),
    };
  });

  const finalCumulative = phases.at(-1)!.cumulative;
  const incrementalBlockCount = phases.reduce(
    (sum, phase) => sum + phase.incremental.source.blockCount,
    0,
  );
  const incrementalMassT = phases.reduce(
    (sum, phase) => sum + phase.incremental.source.massT,
    0,
  );

  return {
    sourceName: dataset.sourceName,
    gradeConfirmation,
    costBasis,
    dsrlClassificationEnabled: enabled,
    economicScenarioValid,
    cutoffGradePercent: cutoff?.cutoffGradePercent ?? null,
    classificationCostUsdPerTonne:
      cutoff?.classificationCostUsdPerTonne ?? null,
    netMetalPriceUsdPerTonne: cutoff?.netMetalPriceUsdPerTonne ?? null,
    phases,
    activeBlockCount,
    excludedFutureBlockCount,
    reconciliation: {
      incrementalBlockCountCloses:
        incrementalBlockCount === finalCumulative.source.blockCount,
      incrementalMassCloses: closeEnough(
        incrementalMassT,
        finalCumulative.source.massT,
      ),
      cumulativeMonotonic: phases.every(
        (phase, index) =>
          index === 0 ||
          phase.cumulative.source.massT >=
            phases[index - 1].cumulative.source.massT,
      ),
    },
    methodology: {
      observedDestinationField: 'NPVPDEST',
      observedProfitField: 'NPVPROFT',
      observedCurrencyUnitConfirmed: false,
      dsrlGradeField: 'CU',
      dsrlGradeUnitConfirmed: gradeConfirmation === 'cu-percent',
      dsrlClassificationLevel: 'process-vs-waste',
      millLeachReclassificationSupported: false,
      discountedNpv: false,
      capexIncluded: false,
      taxIncluded: false,
      globalStripRatioIncluded: false,
      wasteMiningCostIncluded: false,
      inventoryLabel: 'inventario económico preliminar dentro del diseño',
      reserveClaimAllowed: false,
    },
    notes: [
      'NPVPROFT se conserva como beneficio fuente en moneda nativa no confirmada.',
      'La reclasificación DSRL requiere confirmación explícita de CU en porcentaje.',
      'DSRL clasifica proceso versus desmonte; no selecciona Mill versus Leach.',
      'El margen DSRL es no descontado y no incluye CAPEX, impuestos ni strip ratio global.',
      'El costo de mina se aplica a bloques de proceso solo cuando se usa costo completo.',
      'El costo de minado del desmonte no forma parte de este margen de selección por bloque.',
    ],
  };
}

export function getBlockEconomicPhase(
  report: BlockEconomicClassificationReport,
  phase: SupportedPhase,
  scope: InventoryScope,
): BlockEconomicMetrics {
  const item = report.phases.find((candidate) => candidate.phase === phase);
  if (!item) throw new Error(`No existe clasificación económica para F${phase}.`);
  return scope === 'incremental' ? item.incremental : item.cumulative;
}
