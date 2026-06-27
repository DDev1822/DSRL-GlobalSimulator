import { classifyDestination, type SupportedPhase } from './blockModelContract';
import type { InventoryScope } from './blockInventory';
import {
  benchFloorForElevation,
  buildBlockBenchInventory,
  type BenchHeightM,
} from './blockBenchInventory';
import {
  buildBlockEconomicClassification,
  calculateBlockCutoffPercent,
  getBlockEconomicPhase,
  type BlockCostBasis,
  type GradeConfirmation,
} from './blockEconomicClassification';
import type { EconomicInputs } from './economicModel';
import type {
  BlockModelDataset,
  NormalizedBlockModelRow,
} from '../utils/blockModelParser';

export const MARGINAL_VALUE_THRESHOLD_USD_PER_TONNE = 5;

export type BenchValueBand = 'locked' | 'high' | 'marginal' | 'negative';

export interface BenchEconomicValueMetrics {
  blockCount: number;
  volumeM3: number;
  massT: number;
  massMt: number;
  sourceProcessMassT: number;
  sourceProcessMassMt: number;
  sourceWasteMassT: number;
  sourceWasteMassMt: number;
  sourceUnknownMassT: number;
  sourceProfitNative: number;
  sourceProfitPerTonneNative: number | null;
  sourceEconomicsCoverageRows: number;
  sourceEconomicsCoveragePercent: number;
  weightedCuAllNative: number | null;
  weightedCuObservedProcessNative: number | null;
  sourceProfitRowsOutsideTolerance: number;
  dsrlEnabled: boolean;
  cutoffGradePercent: number | null;
  classificationCostUsdPerTonne: number | null;
  dsrlProcessMassT: number;
  dsrlProcessMassMt: number;
  dsrlWasteMassT: number;
  dsrlWasteMassMt: number;
  selectedRevenueUsdM: number;
  selectedProcessingCostUsdM: number;
  selectedMiningCostUsdM: number;
  selectedMarginUsdM: number;
  selectedMarginUsdPerProcessTonne: number | null;
  potentialMarginUsdM: number;
  weightedCuProcessPercent: number | null;
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
  valueBand: BenchValueBand;
}

export interface BenchEconomicValueEntry {
  benchId: string;
  sequenceFromTop: number;
  floorElevationM: number;
  ceilingElevationM: number;
  centerElevationM: number;
  metrics: BenchEconomicValueMetrics;
  cumulativeFromTop: BenchEconomicValueMetrics;
}

export interface BlockBenchEconomicValueReport {
  sourceName: string;
  phase: SupportedPhase;
  scope: InventoryScope;
  benchHeightM: BenchHeightM;
  datumElevationM: number;
  selectedBlockCount: number;
  gradeConfirmation: GradeConfirmation;
  costBasis: BlockCostBasis;
  dsrlClassificationEnabled: boolean;
  cutoffGradePercent: number | null;
  classificationCostUsdPerTonne: number | null;
  netMetalPriceUsdPerTonne: number | null;
  benches: BenchEconomicValueEntry[];
  total: BenchEconomicValueMetrics;
  topValueBenchIds: string[];
  sourceNegativeBenchIds: string[];
  dsrlRiskBenchIds: string[];
  reconciliation: {
    allRowsAssigned: boolean;
    cumulativeFromTopCloses: boolean;
    physicalBlockCountCloses: boolean;
    physicalVolumeCloses: boolean;
    physicalMassCloses: boolean;
    physicalProcessMassCloses: boolean;
    physicalWasteMassCloses: boolean;
    sourceProfitClosesAgainstStage85: boolean;
    sourceMassClosesAgainstStage85: boolean;
    dsrlProcessMassClosesAgainstStage85: boolean | null;
    dsrlWasteMassClosesAgainstStage85: boolean | null;
    dsrlMarginClosesAgainstStage85: boolean | null;
    sourceProfitRowsReconcile: boolean;
    dsrlSelectedValueCloses: boolean | null;
    intervalsDoNotOverlap: boolean;
  };
  methodology: {
    assignmentBasis: 'ZC';
    boundaryPolicy: '[floor, ceiling)';
    wholeBlockAssignment: true;
    volumeSplitAcrossBenches: false;
    observedProfitField: 'NPVPROFT';
    observedCurrencyUnitConfirmed: false;
    dsrlGradeField: 'CU';
    dsrlGradeUnitConfirmed: boolean;
    selectedMarginDiscounted: false;
    marginalThresholdUsdPerTonne: number;
    inventoryLabel: 'screening económico real por banco dentro del diseño';
    reserveClaimAllowed: false;
    mineScheduleClaimAllowed: false;
  };
  notes: string[];
}

interface Accumulator {
  blockCount: number;
  volumeM3: number;
  massT: number;
  sourceProcessMassT: number;
  sourceWasteMassT: number;
  sourceUnknownMassT: number;
  sourceProfitNative: number;
  sourceEconomicsRows: number;
  sourceCuMassAll: number;
  sourceCuMassProcess: number;
  sourceProfitRowsOutsideTolerance: number;
  dsrlProcessMassT: number;
  dsrlWasteMassT: number;
  selectedRevenueUsd: number;
  selectedProcessingCostUsd: number;
  selectedMiningCostUsd: number;
  selectedMarginUsd: number;
  potentialMarginUsd: number;
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
}

const PROFIT_TOLERANCE = 1e-6;

function blankAccumulator(): Accumulator {
  return {
    blockCount: 0,
    volumeM3: 0,
    massT: 0,
    sourceProcessMassT: 0,
    sourceWasteMassT: 0,
    sourceUnknownMassT: 0,
    sourceProfitNative: 0,
    sourceEconomicsRows: 0,
    sourceCuMassAll: 0,
    sourceCuMassProcess: 0,
    sourceProfitRowsOutsideTolerance: 0,
    dsrlProcessMassT: 0,
    dsrlWasteMassT: 0,
    selectedRevenueUsd: 0,
    selectedProcessingCostUsd: 0,
    selectedMiningCostUsd: 0,
    selectedMarginUsd: 0,
    potentialMarginUsd: 0,
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
  };
}

function closeEnough(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(left), Math.abs(right));
}

function addRow(
  accumulator: Accumulator,
  row: NormalizedBlockModelRow,
  enabled: boolean,
  cutoffGradePercent: number | null,
  netMetalPriceUsdPerTonne: number | null,
  processingCostUsdPerTonne: number,
  miningCostUsdPerTonne: number,
): void {
  accumulator.blockCount += 1;
  accumulator.volumeM3 += row.NPVVOL;
  accumulator.massT += row.NPVMASS;
  accumulator.sourceCuMassAll += row.CU * row.NPVMASS;

  const sourceClass = classifyDestination(row.NPVPDEST);
  if (sourceClass === 'process') {
    accumulator.sourceProcessMassT += row.NPVMASS;
    accumulator.sourceCuMassProcess += row.CU * row.NPVMASS;
  } else if (sourceClass === 'waste') {
    accumulator.sourceWasteMassT += row.NPVMASS;
  } else {
    accumulator.sourceUnknownMassT += row.NPVMASS;
  }

  const sourceEconomicsComplete = [
    row.NPVREVEN,
    row.NPVPCOST,
    row.NPVMCOST,
    row.NPVPROFT,
  ].every((value) => value !== undefined && Number.isFinite(value));
  if (sourceEconomicsComplete) {
    const expectedProfit = row.NPVREVEN! - row.NPVPCOST! - row.NPVMCOST!;
    accumulator.sourceEconomicsRows += 1;
    accumulator.sourceProfitNative += row.NPVPROFT!;
    if (Math.abs(row.NPVPROFT! - expectedProfit) > PROFIT_TOLERANCE) {
      accumulator.sourceProfitRowsOutsideTolerance += 1;
    }
  }

  if (!enabled || cutoffGradePercent === null || netMetalPriceUsdPerTonne === null) {
    return;
  }

  const revenueUsd = row.NPVMASS * (row.CU / 100) * netMetalPriceUsdPerTonne;
  const processingCostUsd = row.NPVMASS * processingCostUsdPerTonne;
  const miningCostUsd = row.NPVMASS * miningCostUsdPerTonne;
  const potentialMarginUsd = revenueUsd - processingCostUsd - miningCostUsd;
  const dsrlClass: 'process' | 'waste' =
    row.CU >= cutoffGradePercent && potentialMarginUsd > 0
      ? 'process'
      : 'waste';

  accumulator.potentialMarginUsd += potentialMarginUsd;
  if (dsrlClass === 'process') {
    accumulator.dsrlProcessMassT += row.NPVMASS;
    accumulator.selectedRevenueUsd += revenueUsd;
    accumulator.selectedProcessingCostUsd += processingCostUsd;
    accumulator.selectedMiningCostUsd += miningCostUsd;
    accumulator.selectedMarginUsd += potentialMarginUsd;
    accumulator.dsrlCuMassProcess += row.CU * row.NPVMASS;
  } else {
    accumulator.dsrlWasteMassT += row.NPVMASS;
  }

  if (sourceClass === 'process' && dsrlClass === 'process') {
    accumulator.retainedProcessRows += 1;
    accumulator.retainedProcessMassT += row.NPVMASS;
  } else if (sourceClass === 'waste' && dsrlClass === 'waste') {
    accumulator.retainedWasteRows += 1;
    accumulator.retainedWasteMassT += row.NPVMASS;
  } else if (sourceClass === 'waste' && dsrlClass === 'process') {
    accumulator.upgradeRows += 1;
    accumulator.upgradeMassT += row.NPVMASS;
  } else if (sourceClass === 'process' && dsrlClass === 'waste') {
    accumulator.downgradeRows += 1;
    accumulator.downgradeMassT += row.NPVMASS;
  } else {
    accumulator.uncomparedRows += 1;
    accumulator.uncomparedMassT += row.NPVMASS;
  }
}

function merge(left: Accumulator, right: Accumulator): Accumulator {
  return {
    blockCount: left.blockCount + right.blockCount,
    volumeM3: left.volumeM3 + right.volumeM3,
    massT: left.massT + right.massT,
    sourceProcessMassT: left.sourceProcessMassT + right.sourceProcessMassT,
    sourceWasteMassT: left.sourceWasteMassT + right.sourceWasteMassT,
    sourceUnknownMassT: left.sourceUnknownMassT + right.sourceUnknownMassT,
    sourceProfitNative: left.sourceProfitNative + right.sourceProfitNative,
    sourceEconomicsRows: left.sourceEconomicsRows + right.sourceEconomicsRows,
    sourceCuMassAll: left.sourceCuMassAll + right.sourceCuMassAll,
    sourceCuMassProcess: left.sourceCuMassProcess + right.sourceCuMassProcess,
    sourceProfitRowsOutsideTolerance:
      left.sourceProfitRowsOutsideTolerance + right.sourceProfitRowsOutsideTolerance,
    dsrlProcessMassT: left.dsrlProcessMassT + right.dsrlProcessMassT,
    dsrlWasteMassT: left.dsrlWasteMassT + right.dsrlWasteMassT,
    selectedRevenueUsd: left.selectedRevenueUsd + right.selectedRevenueUsd,
    selectedProcessingCostUsd:
      left.selectedProcessingCostUsd + right.selectedProcessingCostUsd,
    selectedMiningCostUsd:
      left.selectedMiningCostUsd + right.selectedMiningCostUsd,
    selectedMarginUsd: left.selectedMarginUsd + right.selectedMarginUsd,
    potentialMarginUsd: left.potentialMarginUsd + right.potentialMarginUsd,
    dsrlCuMassProcess: left.dsrlCuMassProcess + right.dsrlCuMassProcess,
    retainedProcessRows: left.retainedProcessRows + right.retainedProcessRows,
    retainedProcessMassT: left.retainedProcessMassT + right.retainedProcessMassT,
    retainedWasteRows: left.retainedWasteRows + right.retainedWasteRows,
    retainedWasteMassT: left.retainedWasteMassT + right.retainedWasteMassT,
    upgradeRows: left.upgradeRows + right.upgradeRows,
    upgradeMassT: left.upgradeMassT + right.upgradeMassT,
    downgradeRows: left.downgradeRows + right.downgradeRows,
    downgradeMassT: left.downgradeMassT + right.downgradeMassT,
    uncomparedRows: left.uncomparedRows + right.uncomparedRows,
    uncomparedMassT: left.uncomparedMassT + right.uncomparedMassT,
  };
}

function finalize(
  accumulator: Accumulator,
  enabled: boolean,
  cutoffGradePercent: number | null,
  classificationCostUsdPerTonne: number | null,
): BenchEconomicValueMetrics {
  const selectedMarginUsdPerProcessTonne =
    enabled && accumulator.dsrlProcessMassT > 0
      ? accumulator.selectedMarginUsd / accumulator.dsrlProcessMassT
      : null;
  const valueBand: BenchValueBand = !enabled
    ? 'locked'
    : accumulator.potentialMarginUsd < 0
      ? 'negative'
      : selectedMarginUsdPerProcessTonne === null ||
          selectedMarginUsdPerProcessTonne < MARGINAL_VALUE_THRESHOLD_USD_PER_TONNE
        ? 'marginal'
        : 'high';

  return {
    blockCount: accumulator.blockCount,
    volumeM3: accumulator.volumeM3,
    massT: accumulator.massT,
    massMt: accumulator.massT / 1_000_000,
    sourceProcessMassT: accumulator.sourceProcessMassT,
    sourceProcessMassMt: accumulator.sourceProcessMassT / 1_000_000,
    sourceWasteMassT: accumulator.sourceWasteMassT,
    sourceWasteMassMt: accumulator.sourceWasteMassT / 1_000_000,
    sourceUnknownMassT: accumulator.sourceUnknownMassT,
    sourceProfitNative: accumulator.sourceProfitNative,
    sourceProfitPerTonneNative:
      accumulator.massT > 0
        ? accumulator.sourceProfitNative / accumulator.massT
        : null,
    sourceEconomicsCoverageRows: accumulator.sourceEconomicsRows,
    sourceEconomicsCoveragePercent:
      accumulator.blockCount > 0
        ? (accumulator.sourceEconomicsRows / accumulator.blockCount) * 100
        : 0,
    weightedCuAllNative:
      accumulator.massT > 0
        ? accumulator.sourceCuMassAll / accumulator.massT
        : null,
    weightedCuObservedProcessNative:
      accumulator.sourceProcessMassT > 0
        ? accumulator.sourceCuMassProcess / accumulator.sourceProcessMassT
        : null,
    sourceProfitRowsOutsideTolerance: accumulator.sourceProfitRowsOutsideTolerance,
    dsrlEnabled: enabled,
    cutoffGradePercent,
    classificationCostUsdPerTonne,
    dsrlProcessMassT: enabled ? accumulator.dsrlProcessMassT : 0,
    dsrlProcessMassMt: enabled ? accumulator.dsrlProcessMassT / 1_000_000 : 0,
    dsrlWasteMassT: enabled ? accumulator.dsrlWasteMassT : 0,
    dsrlWasteMassMt: enabled ? accumulator.dsrlWasteMassT / 1_000_000 : 0,
    selectedRevenueUsdM: enabled ? accumulator.selectedRevenueUsd / 1_000_000 : 0,
    selectedProcessingCostUsdM:
      enabled ? accumulator.selectedProcessingCostUsd / 1_000_000 : 0,
    selectedMiningCostUsdM:
      enabled ? accumulator.selectedMiningCostUsd / 1_000_000 : 0,
    selectedMarginUsdM: enabled ? accumulator.selectedMarginUsd / 1_000_000 : 0,
    selectedMarginUsdPerProcessTonne,
    potentialMarginUsdM: enabled ? accumulator.potentialMarginUsd / 1_000_000 : 0,
    weightedCuProcessPercent:
      enabled && accumulator.dsrlProcessMassT > 0
        ? accumulator.dsrlCuMassProcess / accumulator.dsrlProcessMassT
        : null,
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
    valueBand,
  };
}

function metricsClose(
  left: BenchEconomicValueMetrics,
  right: BenchEconomicValueMetrics,
  enabled: boolean,
): boolean {
  return (
    left.blockCount === right.blockCount &&
    closeEnough(left.volumeM3, right.volumeM3) &&
    closeEnough(left.massT, right.massT) &&
    closeEnough(left.sourceProcessMassT, right.sourceProcessMassT) &&
    closeEnough(left.sourceWasteMassT, right.sourceWasteMassT) &&
    closeEnough(left.sourceProfitNative, right.sourceProfitNative) &&
    (!enabled ||
      (closeEnough(left.dsrlProcessMassT, right.dsrlProcessMassT) &&
        closeEnough(left.dsrlWasteMassT, right.dsrlWasteMassT) &&
        closeEnough(left.selectedMarginUsdM, right.selectedMarginUsdM)))
  );
}

export function buildBlockBenchEconomicValue(
  dataset: BlockModelDataset,
  phase: SupportedPhase,
  scope: InventoryScope,
  benchHeightM: BenchHeightM,
  economicInputs: EconomicInputs,
  gradeConfirmation: GradeConfirmation,
  costBasis: BlockCostBasis,
): BlockBenchEconomicValueReport {
  const enabled = gradeConfirmation === 'cu-percent';
  const cutoff = enabled
    ? calculateBlockCutoffPercent(economicInputs, costBasis)
    : null;
  const selectedRows = dataset.rows.filter((row) =>
    scope === 'incremental' ? row.PSB_PIT === phase : row.PSB_PIT <= phase,
  );
  if (selectedRows.length === 0) {
    throw new Error(`No existen bloques para F${phase} en alcance ${scope}.`);
  }

  const minimumCenterElevation = Math.min(...selectedRows.map((row) => row.ZC));
  const datumElevationM =
    Math.floor(minimumCenterElevation / benchHeightM) * benchHeightM;
  const byBench = new Map<number, Accumulator>();

  for (const row of selectedRows) {
    const floor = benchFloorForElevation(row.ZC, datumElevationM, benchHeightM);
    const accumulator = byBench.get(floor) ?? blankAccumulator();
    addRow(
      accumulator,
      row,
      enabled,
      cutoff?.cutoffGradePercent ?? null,
      cutoff?.netMetalPriceUsdPerTonne ?? null,
      cutoff?.processingCostUsdPerTonne ?? 0,
      cutoff?.miningCostUsdPerTonne ?? 0,
    );
    byBench.set(floor, accumulator);
  }

  const sortedFloors = [...byBench.keys()].sort((left, right) => right - left);
  let cumulative = blankAccumulator();
  const benches: BenchEconomicValueEntry[] = sortedFloors.map((floor, index) => {
    const accumulator = byBench.get(floor)!;
    cumulative = merge(cumulative, accumulator);
    const ceiling = floor + benchHeightM;
    return {
      benchId: `B-${floor.toFixed(0)}-${ceiling.toFixed(0)}`,
      sequenceFromTop: index + 1,
      floorElevationM: floor,
      ceilingElevationM: ceiling,
      centerElevationM: floor + benchHeightM / 2,
      metrics: finalize(
        accumulator,
        enabled,
        cutoff?.cutoffGradePercent ?? null,
        cutoff?.classificationCostUsdPerTonne ?? null,
      ),
      cumulativeFromTop: finalize(
        cumulative,
        enabled,
        cutoff?.cutoffGradePercent ?? null,
        cutoff?.classificationCostUsdPerTonne ?? null,
      ),
    };
  });

  const totalAccumulator = [...byBench.values()].reduce(
    (result, accumulator) => merge(result, accumulator),
    blankAccumulator(),
  );
  const total = finalize(
    totalAccumulator,
    enabled,
    cutoff?.cutoffGradePercent ?? null,
    cutoff?.classificationCostUsdPerTonne ?? null,
  );
  const finalCumulative = benches.at(-1)!.cumulativeFromTop;

  const physical = buildBlockBenchInventory(dataset, phase, scope, benchHeightM);
  const economics = buildBlockEconomicClassification(
    dataset,
    economicInputs,
    gradeConfirmation,
    costBasis,
  );
  const expectedEconomic = getBlockEconomicPhase(economics, phase, scope);

  const topValueBenchIds = [...benches]
    .sort((left, right) =>
      enabled
        ? right.metrics.selectedMarginUsdM - left.metrics.selectedMarginUsdM
        : right.metrics.sourceProfitNative - left.metrics.sourceProfitNative,
    )
    .slice(0, 5)
    .map((bench) => bench.benchId);
  const sourceNegativeBenchIds = benches
    .filter((bench) => bench.metrics.sourceProfitNative < 0)
    .map((bench) => bench.benchId);
  const dsrlRiskBenchIds = enabled
    ? benches
        .filter((bench) => bench.metrics.valueBand !== 'high')
        .map((bench) => bench.benchId)
    : [];
  const intervalsDoNotOverlap = benches.every(
    (bench, index) =>
      index === 0 ||
      bench.ceilingElevationM <= benches[index - 1].floorElevationM,
  );

  return {
    sourceName: dataset.sourceName,
    phase,
    scope,
    benchHeightM,
    datumElevationM,
    selectedBlockCount: selectedRows.length,
    gradeConfirmation,
    costBasis,
    dsrlClassificationEnabled: enabled,
    cutoffGradePercent: cutoff?.cutoffGradePercent ?? null,
    classificationCostUsdPerTonne:
      cutoff?.classificationCostUsdPerTonne ?? null,
    netMetalPriceUsdPerTonne: cutoff?.netMetalPriceUsdPerTonne ?? null,
    benches,
    total,
    topValueBenchIds,
    sourceNegativeBenchIds,
    dsrlRiskBenchIds,
    reconciliation: {
      allRowsAssigned:
        benches.reduce((sum, bench) => sum + bench.metrics.blockCount, 0) ===
        selectedRows.length,
      cumulativeFromTopCloses: metricsClose(finalCumulative, total, enabled),
      physicalBlockCountCloses: total.blockCount === physical.total.blockCount,
      physicalVolumeCloses: closeEnough(total.volumeM3, physical.total.volumeM3),
      physicalMassCloses: closeEnough(total.massT, physical.total.massT),
      physicalProcessMassCloses: closeEnough(
        total.sourceProcessMassT,
        physical.total.processMassT,
      ),
      physicalWasteMassCloses: closeEnough(
        total.sourceWasteMassT,
        physical.total.wasteMassT,
      ),
      sourceProfitClosesAgainstStage85: closeEnough(
        total.sourceProfitNative,
        expectedEconomic.source.sourceProfitNative,
      ),
      sourceMassClosesAgainstStage85: closeEnough(
        total.massT,
        expectedEconomic.source.massT,
      ),
      dsrlProcessMassClosesAgainstStage85: enabled
        ? closeEnough(total.dsrlProcessMassT, expectedEconomic.dsrl.processMassT)
        : null,
      dsrlWasteMassClosesAgainstStage85: enabled
        ? closeEnough(total.dsrlWasteMassT, expectedEconomic.dsrl.wasteMassT)
        : null,
      dsrlMarginClosesAgainstStage85: enabled
        ? closeEnough(
            total.selectedMarginUsdM,
            expectedEconomic.dsrl.selectedMarginUsdM,
          )
        : null,
      sourceProfitRowsReconcile:
        total.sourceProfitRowsOutsideTolerance === 0,
      dsrlSelectedValueCloses: enabled
        ? closeEnough(
            total.selectedMarginUsdM,
            total.selectedRevenueUsdM -
              total.selectedProcessingCostUsdM -
              total.selectedMiningCostUsdM,
          )
        : null,
      intervalsDoNotOverlap,
    },
    methodology: {
      assignmentBasis: 'ZC',
      boundaryPolicy: '[floor, ceiling)',
      wholeBlockAssignment: true,
      volumeSplitAcrossBenches: false,
      observedProfitField: 'NPVPROFT',
      observedCurrencyUnitConfirmed: false,
      dsrlGradeField: 'CU',
      dsrlGradeUnitConfirmed: enabled,
      selectedMarginDiscounted: false,
      marginalThresholdUsdPerTonne:
        MARGINAL_VALUE_THRESHOLD_USD_PER_TONNE,
      inventoryLabel: 'screening económico real por banco dentro del diseño',
      reserveClaimAllowed: false,
      mineScheduleClaimAllowed: false,
    },
    notes: [
      'El beneficio fuente se conserva en moneda nativa no confirmada.',
      'El margen DSRL es no descontado y solo suma bloques seleccionados a proceso.',
      'La banda negativa usa el margen potencial del banco si todo su material fuera procesado.',
      `La banda marginal usa menos de ${MARGINAL_VALUE_THRESHOLD_USD_PER_TONNE} USD/t de proceso seleccionado.`,
      'El ranking de bancos es screening de valor; no es una secuencia minera.',
      'No se declaran reservas ni precedencias operacionales.',
    ],
  };
}
