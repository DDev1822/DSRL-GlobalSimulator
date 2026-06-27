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
  grossRevenueUsdM: number;
  processingCostUsdM: number;
  miningCostUsdM: number;
  marginUsdM: number;
  retainedProcessRows: number;
  retainedProcessMassMt: number;
  retainedWasteRows: number;
  retainedWasteMassMt: number;
  upgradeRows: number;
  upgradeMassMt: number;
  downgradeRows: number;
  downgradeMassMt: number;
  uncomparedRows: number;
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
    inventoryLabel: 'inventario económico preliminar dentro del diseño';
    reserveClaimAllowed: false;
  };
  notes: string[];
}

interface SourceAccumulator {
  blockCount: number;
  massT: number;
  processMassT: number;
  wasteMassT: number;
  unknownMassT: number;
  millMassT: number;
  leachMassT: number;
  sourceRevenueNative: number;
  sourceProcessCostNative: number;
  sourceMiningCostNative: number;
  sourceProfitNative: number;
  economicsCoverageRows: number;
  positiveProfitRows: number;
  nonPositiveProfitRows: number;
  processWithNonPositiveProfitRows: number;
  processWithNonPositiveProfitMassT: number;
  wasteWithPositiveProfitRows: number;
  wasteWithPositiveProfitMassT: number;
  cuMassAll: number;
  cuMassObservedProcess: number;
  maxProfitReconciliationError: number;
  profitReconciliationRowsOutsideTolerance: number;
}

interface DsrlAccumulator {
  processMassT: number;
  wasteMassT: number;
  grossRevenueUsd: number;
  processingCostUsd: number;
  miningCostUsd: number;
  marginUsd: number;
  retainedProcessRows: number;
  retainedProcessMassT: number;
  retainedWasteRows: number;
  retainedWasteMassT: number;
  upgradeRows: number;
  upgradeMassT: number;
  downgradeRows: number;
  downgradeMassT: number;
  uncomparedRows: number;
  cuMassProcess: number;
  traceExamples: BlockEconomicTrace[];
}

interface CombinedAccumulator {
  source: SourceAccumulator;
  dsrl: DsrlAccumulator;
}

const PROFIT_RECONCILIATION_TOLERANCE = 1e-6;
const TRACE_LIMIT = 12;

function blankSource(): SourceAccumulator {
  return {
    blockCount: 0,
    massT: 0,
    processMassT: 0,
    wasteMassT: 0,
    unknownMassT: 0,
    millMassT: 0,
    leachMassT: 0,
    sourceRevenueNative: 0,
    sourceProcessCostNative: 0,
    sourceMiningCostNative: 0,
    sourceProfitNative: 0,
    economicsCoverageRows: 0,
    positiveProfitRows: 0,
    nonPositiveProfitRows: 0,
    processWithNonPositiveProfitRows: 0,
    processWithNonPositiveProfitMassT: 0,
    wasteWithPositiveProfitRows: 0,
    wasteWithPositiveProfitMassT: 0,
    cuMassAll: 0,
    cuMassObservedProcess: 0,
    maxProfitReconciliationError: 0,
    profitReconciliationRowsOutsideTolerance: 0,
  };
}

function blankDsrl(): DsrlAccumulator {
  return {
    processMassT: 0,
    wasteMassT: 0,
    grossRevenueUsd: 0,
    processingCostUsd: 0,
    miningCostUsd: 0,
    marginUsd: 0,
    retainedProcessRows: 0,
    retainedProcessMassT: 0,
    retainedWasteRows: 0,
    retainedWasteMassT: 0,
    upgradeRows: 0,
    upgradeMassT: 0,
    downgradeRows: 0,
    downgradeMassT: 0,
    uncomparedRows: 0,
    cuMassProcess: 0,
    traceExamples: [],
  };
}

function blankCombined(): CombinedAccumulator {
  return { source: blankSource(), dsrl: blankDsrl() };
}

function closeEnough(left: number, right: number): boolean {
  return (
    Math.abs(left - right) <=
    1e-9 * Math.max(1, Math.abs(left), Math.abs(right))
  );
}

function sourceClassForRow(row: NormalizedBlockModelRow): EconomicDestinationClass {
  return classifyDestination(row.NPVPDEST);
}

function addSourceRow(accumulator: SourceAccumulator, row: NormalizedBlockModelRow): void {
  accumulator.blockCount += 1;
  accumulator.massT += row.NPVMASS;
  accumulator.cuMassAll += row.CU * row.NPVMASS;

  const sourceClass = sourceClassForRow(row);
  if (sourceClass === 'process') {
    accumulator.processMassT += row.NPVMASS;
    accumulator.cuMassObservedProcess += row.CU * row.NPVMASS;
    if (row.NPVPDEST === 'Mill') accumulator.millMassT += row.NPVMASS;
    if (row.NPVPDEST === 'Leach') accumulator.leachMassT += row.NPVMASS;
  } else if (sourceClass === 'waste') {
    accumulator.wasteMassT += row.NPVMASS;
  } else {
    accumulator.unknownMassT += row.NPVMASS;
  }

  const economicsAvailable = [
    row.NPVREVEN,
    row.NPVPCOST,
    row.NPVMCOST,
    row.NPVPROFT,
  ].every((value) => value !== undefined && Number.isFinite(value));

  if (!economicsAvailable) return;

  const revenue = row.NPVREVEN!;
  const processCost = row.NPVPCOST!;
  const miningCost = row.NPVMCOST!;
  const profit = row.NPVPROFT!;
  accumulator.economicsCoverageRows += 1;
  accumulator.sourceRevenueNative += revenue;
  accumulator.sourceProcessCostNative += processCost;
  accumulator.sourceMiningCostNative += miningCost;
  accumulator.sourceProfitNative += profit;

  if (profit > 0) accumulator.positiveProfitRows += 1;
  else accumulator.nonPositiveProfitRows += 1;

  if (sourceClass === 'process' && profit <= 0) {
    accumulator.processWithNonPositiveProfitRows += 1;
    accumulator.processWithNonPositiveProfitMassT += row.NPVMASS;
  }
  if (sourceClass === 'waste' && profit > 0) {
    accumulator.wasteWithPositiveProfitRows += 1;
    accumulator.wasteWithPositiveProfitMassT += row.NPVMASS;
  }

  const error = Math.abs(profit - (revenue - processCost - miningCost));
  accumulator.maxProfitReconciliationError = Math.max(
    accumulator.maxProfitReconciliationError,
    error,
  );
  if (error > PROFIT_RECONCILIATION_TOLERANCE) {
    accumulator.profitReconciliationRowsOutsideTolerance += 1;
  }
}

function reclassificationCode(
  observedClass: EconomicDestinationClass,
  dsrlClass: 'process' | 'waste',
): ReclassificationCode {
  if (observedClass === 'unknown') return 'uncompared';
  if (observedClass === 'process' && dsrlClass === 'process') return 'retained-process';
  if (observedClass === 'waste' && dsrlClass === 'waste') return 'retained-waste';
  if (observedClass === 'waste' && dsrlClass === 'process') return 'upgrade-to-process';
  return 'downgrade-to-waste';
}

function reasonForCode(code: ReclassificationCode, cutoff: number): string {
  if (code === 'retained-process') return `El destino observado y DSRL mantienen proceso; CU supera ${cutoff.toFixed(4)}%.`;
  if (code === 'retained-waste') return `El destino observado y DSRL mantienen desmonte; CU no supera ${cutoff.toFixed(4)}%.`;
  if (code === 'upgrade-to-process') return `DSRL identifica margen positivo sobre la ley de corte ${cutoff.toFixed(4)}%.`;
  if (code === 'downgrade-to-waste') return `DSRL identifica margen no positivo bajo la ley de corte ${cutoff.toFixed(4)}%.`;
  return 'El destino fuente no permite una comparación binaria proceso/desmonte.';
}

function addDsrlRow(
  accumulator: DsrlAccumulator,
  row: NormalizedBlockModelRow,
  phase: SupportedPhase,
  cutoffGradePercent: number,
  classificationCostUsdPerTonne: number,
  netMetalPriceUsdPerTonne: number,
  includeMiningCost: boolean,
): void {
  const revenuePerTonne =
    (row.CU / 100) * netMetalPriceUsdPerTonne;
  const processingCostPerTonne = classificationCostUsdPerTonne -
    (includeMiningCost ? classificationCostUsdPerTonne - 0 : 0);
  const processingCostUsd = row.NPVMASS * Math.max(processingCostPerTonne, 0);
  const miningCostPerTonne = includeMiningCost
    ? Math.max(classificationCostUsdPerTonne - processingCostPerTonne, 0)
    : 0;
  const miningCostUsd = row.NPVMASS * miningCostPerTonne;
  const grossRevenueUsd = row.NPVMASS * revenuePerTonne;
  const marginUsd = grossRevenueUsd - row.NPVMASS * classificationCostUsdPerTonne;
  const dsrlClass: 'process' | 'waste' =
    row.CU >= cutoffGradePercent && marginUsd > 0 ? 'process' : 'waste';

  accumulator.grossRevenueUsd += grossRevenueUsd;
  accumulator.processingCostUsd += processingCostUsd;
  accumulator.miningCostUsd += miningCostUsd;
  accumulator.marginUsd += marginUsd;

  if (dsrlClass === 'process') {
    accumulator.processMassT += row.NPVMASS;
    accumulator.cuMassProcess += row.CU * row.NPVMASS;
  } else {
    accumulator.wasteMassT += row.NPVMASS;
  }

  const observedClass = sourceClassForRow(row);
  const code = reclassificationCode(observedClass, dsrlClass);
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
      observedClass,
      sourceProfitNative:
        row.NPVPROFT !== undefined && Number.isFinite(row.NPVPROFT)
          ? row.NPVPROFT
          : null,
      dsrlClass,
      dsrlMarginUsd: marginUsd,
      code,
      reason: reasonForCode(code, cutoffGradePercent),
    });
  }
}

function mergeSource(left: SourceAccumulator, right: SourceAccumulator): SourceAccumulator {
  return {
    blockCount: left.blockCount + right.blockCount,
    massT: left.massT + right.massT,
    processMassT: left.processMassT + right.processMassT,
    wasteMassT: left.wasteMassT + right.wasteMassT,
    unknownMassT: left.unknownMassT + right.unknownMassT,
    millMassT: left.millMassT + right.millMassT,
    leachMassT: left.leachMassT + right.leachMassT,
    sourceRevenueNative: left.sourceRevenueNative + right.sourceRevenueNative,
    sourceProcessCostNative: left.sourceProcessCostNative + right.sourceProcessCostNative,
    sourceMiningCostNative: left.sourceMiningCostNative + right.sourceMiningCostNative,
    sourceProfitNative: left.sourceProfitNative + right.sourceProfitNative,
    economicsCoverageRows: left.economicsCoverageRows + right.economicsCoverageRows,
    positiveProfitRows: left.positiveProfitRows + right.positiveProfitRows,
    nonPositiveProfitRows: left.nonPositiveProfitRows + right.nonPositiveProfitRows,
    processWithNonPositiveProfitRows:
      left.processWithNonPositiveProfitRows + right.processWithNonPositiveProfitRows,
    processWithNonPositiveProfitMassT:
      left.processWithNonPositiveProfitMassT + right.processWithNonPositiveProfitMassT,
    wasteWithPositiveProfitRows:
      left.wasteWithPositiveProfitRows + right.wasteWithPositiveProfitRows,
    wasteWithPositiveProfitMassT:
      left.wasteWithPositiveProfitMassT + right.wasteWithPositiveProfitMassT,
    cuMassAll: left.cuMassAll + right.cuMassAll,
    cuMassObservedProcess:
      left.cuMassObservedProcess + right.cuMassObservedProcess,
    maxProfitReconciliationError: Math.max(
      left.maxProfitReconciliationError,
      right.maxProfitReconciliationError,
    ),
    profitReconciliationRowsOutsideTolerance:
      left.profitReconciliationRowsOutsideTolerance +
      right.profitReconciliationRowsOutsideTolerance,
  };
}

function mergeDsrl(left: DsrlAccumulator, right: DsrlAccumulator): DsrlAccumulator {
  return {
    processMassT: left.processMassT + right.processMassT,
    wasteMassT: left.wasteMassT + right.wasteMassT,
    grossRevenueUsd: left.grossRevenueUsd + right.grossRevenueUsd,
    processingCostUsd: left.processingCostUsd + right.processingCostUsd,
    miningCostUsd: left.miningCostUsd + right.miningCostUsd,
    marginUsd: left.marginUsd + right.marginUsd,
    retainedProcessRows: left.retainedProcessRows + right.retainedProcessRows,
    retainedProcessMassT: left.retainedProcessMassT + right.retainedProcessMassT,
    retainedWasteRows: left.retainedWasteRows + right.retainedWasteRows,
    retainedWasteMassT: left.retainedWasteMassT + right.retainedWasteMassT,
    upgradeRows: left.upgradeRows + right.upgradeRows,
    upgradeMassT: left.upgradeMassT + right.upgradeMassT,
    downgradeRows: left.downgradeRows + right.downgradeRows,
    downgradeMassT: left.downgradeMassT + right.downgradeMassT,
    uncomparedRows: left.uncomparedRows + right.uncomparedRows,
    cuMassProcess: left.cuMassProcess + right.cuMassProcess,
    traceExamples: [...left.traceExamples, ...right.traceExamples].slice(0, TRACE_LIMIT),
  };
}

function finalize(
  accumulator: CombinedAccumulator,
  enabled: boolean,
  cutoffGradePercent: number | null,
  classificationCostUsdPerTonne: number | null,
  netMetalPriceUsdPerTonne: number | null,
): BlockEconomicMetrics {
  const source = accumulator.source;
  const dsrl = accumulator.dsrl;
  const sourceMetrics: SourceEconomicMetrics = {
    blockCount: source.blockCount,
    massT: source.massT,
    massMt: source.massT / 1_000_000,
    processMassT: source.processMassT,
    processMassMt: source.processMassT / 1_000_000,
    wasteMassT: source.wasteMassT,
    wasteMassMt: source.wasteMassT / 1_000_000,
    unknownMassT: source.unknownMassT,
    unknownMassMt: source.unknownMassT / 1_000_000,
    millMassT: source.millMassT,
    millMassMt: source.millMassT / 1_000_000,
    leachMassT: source.leachMassT,
    leachMassMt: source.leachMassT / 1_000_000,
    sourceRevenueNative: source.sourceRevenueNative,
    sourceProcessCostNative: source.sourceProcessCostNative,
    sourceMiningCostNative: source.sourceMiningCostNative,
    sourceProfitNative: source.sourceProfitNative,
    economicsCoverageRows: source.economicsCoverageRows,
    economicsCoveragePercent:
      source.blockCount > 0
        ? (source.economicsCoverageRows / source.blockCount) * 100
        : 0,
    positiveProfitRows: source.positiveProfitRows,
    nonPositiveProfitRows: source.nonPositiveProfitRows,
    processWithNonPositiveProfitRows: source.processWithNonPositiveProfitRows,
    processWithNonPositiveProfitMassMt:
      source.processWithNonPositiveProfitMassT / 1_000_000,
    wasteWithPositiveProfitRows: source.wasteWithPositiveProfitRows,
    wasteWithPositiveProfitMassMt:
      source.wasteWithPositiveProfitMassT / 1_000_000,
    weightedCuAllNative:
      source.massT > 0 ? source.cuMassAll / source.massT : null,
    weightedCuObservedProcessNative:
      source.processMassT > 0
        ? source.cuMassObservedProcess / source.processMassT
        : null,
    maxProfitReconciliationError: source.maxProfitReconciliationError,
    profitReconciliationRowsOutsideTolerance:
      source.profitReconciliationRowsOutsideTolerance,
  };

  const dsrlMetrics: DsrlEconomicMetrics = {
    enabled,
    cutoffGradePercent,
    classificationCostUsdPerTonne,
    netMetalPriceUsdPerTonne,
    processMassT: enabled ? dsrl.processMassT : 0,
    processMassMt: enabled ? dsrl.processMassT / 1_000_000 : 0,
    wasteMassT: enabled ? dsrl.wasteMassT : 0,
    wasteMassMt: enabled ? dsrl.wasteMassT / 1_000_000 : 0,
    grossRevenueUsdM: enabled ? dsrl.grossRevenueUsd / 1_000_000 : 0,
    processingCostUsdM: enabled ? dsrl.processingCostUsd / 1_000_000 : 0,
    miningCostUsdM: enabled ? dsrl.miningCostUsd / 1_000_000 : 0,
    marginUsdM: enabled ? dsrl.marginUsd / 1_000_000 : 0,
    retainedProcessRows: enabled ? dsrl.retainedProcessRows : 0,
    retainedProcessMassMt: enabled ? dsrl.retainedProcessMassT / 1_000_000 : 0,
    retainedWasteRows: enabled ? dsrl.retainedWasteRows : 0,
    retainedWasteMassMt: enabled ? dsrl.retainedWasteMassT / 1_000_000 : 0,
    upgradeRows: enabled ? dsrl.upgradeRows : 0,
    upgradeMassMt: enabled ? dsrl.upgradeMassT / 1_000_000 : 0,
    downgradeRows: enabled ? dsrl.downgradeRows : 0,
    downgradeMassMt: enabled ? dsrl.downgradeMassT / 1_000_000 : 0,
    uncomparedRows: enabled ? dsrl.uncomparedRows : 0,
    weightedCuProcessPercent:
      enabled && dsrl.processMassT > 0
        ? dsrl.cuMassProcess / dsrl.processMassT
        : null,
    traceExamples: enabled ? dsrl.traceExamples : [],
  };

  const sourceMassCloses = closeEnough(
    source.massT,
    source.processMassT + source.wasteMassT + source.unknownMassT,
  );
  const sourceRouteMassCloses = closeEnough(
    source.processMassT,
    source.millMassT + source.leachMassT,
  );
  const dsrlMassCloses = enabled
    ? closeEnough(source.massT, dsrl.processMassT + dsrl.wasteMassT)
    : null;
  const reclassificationMassCloses = enabled
    ? closeEnough(
        source.massT,
        dsrl.retainedProcessMassT +
          dsrl.retainedWasteMassT +
          dsrl.upgradeMassT +
          dsrl.downgradeMassT,
      ) && dsrl.uncomparedRows === 0
    : null;

  return {
    source: sourceMetrics,
    dsrl: dsrlMetrics,
    reconciliation: {
      sourceMassCloses,
      sourceRouteMassCloses,
      sourceProfitCloses:
        source.profitReconciliationRowsOutsideTolerance === 0,
      dsrlMassCloses,
      reclassificationMassCloses,
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
} {
  const validation = validateEconomicInputs(inputs);
  if (!validation.valid) {
    throw new Error('El escenario económico DSRL no es válido para clasificar bloques.');
  }
  const netMetalPriceUsdPerTonne =
    inputs.metalPriceUsdPerTonne *
    inputs.plantRecovery *
    inputs.payableFactor *
    (1 - inputs.royaltyRate);
  const classificationCostUsdPerTonne =
    inputs.processingCostUsdPerTonneOre +
    (costBasis === 'full-cost' ? inputs.miningCostUsdPerTonneMoved : 0);
  const revenuePerGradePercent = netMetalPriceUsdPerTonne * 0.01;
  const cutoffGradePercent =
    revenuePerGradePercent > 0
      ? classificationCostUsdPerTonne / revenuePerGradePercent
      : Number.POSITIVE_INFINITY;
  return {
    cutoffGradePercent,
    classificationCostUsdPerTonne,
    netMetalPriceUsdPerTonne,
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
  const includeMiningCost = costBasis === 'full-cost';

  const incremental = new Map<SupportedPhase, CombinedAccumulator>();
  for (const phase of SUPPORTED_PHASES) incremental.set(phase, blankCombined());

  let activeBlockCount = 0;
  let excludedFutureBlockCount = 0;
  for (const row of dataset.rows) {
    if (!SUPPORTED_PHASES.includes(row.PSB_PIT as SupportedPhase)) {
      excludedFutureBlockCount += 1;
      continue;
    }
    const phase = row.PSB_PIT as SupportedPhase;
    const accumulator = incremental.get(phase)!;
    addSourceRow(accumulator.source, row);
    if (enabled && cutoff) {
      addDsrlRow(
        accumulator.dsrl,
        row,
        phase,
        cutoff.cutoffGradePercent,
        cutoff.classificationCostUsdPerTonne,
        cutoff.netMetalPriceUsdPerTonne,
        includeMiningCost,
      );
    }
    activeBlockCount += 1;
  }

  let cumulative = blankCombined();
  const phases: PhaseBlockEconomicInventory[] = SUPPORTED_PHASES.map((phase) => {
    const phaseIncremental = incremental.get(phase)!;
    cumulative = {
      source: mergeSource(cumulative.source, phaseIncremental.source),
      dsrl: mergeDsrl(cumulative.dsrl, phaseIncremental.dsrl),
    };
    return {
      phase,
      incremental: finalize(
        phaseIncremental,
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
  const cumulativeMonotonic = phases.every(
    (phase, index) =>
      index === 0 ||
      phase.cumulative.source.massT >= phases[index - 1].cumulative.source.massT,
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
      cumulativeMonotonic,
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
      inventoryLabel: 'inventario económico preliminar dentro del diseño',
      reserveClaimAllowed: false,
    },
    notes: [
      'NPVPROFT se conserva como beneficio fuente en moneda nativa no confirmada.',
      'La reclasificación DSRL requiere confirmación explícita de CU en porcentaje.',
      'DSRL clasifica proceso versus desmonte; no selecciona Mill versus Leach.',
      'El margen DSRL es no descontado y no incluye CAPEX, impuestos ni strip ratio global.',
      'El costo completo incluye costo de proceso más costo de mina por tonelada de bloque.',
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
