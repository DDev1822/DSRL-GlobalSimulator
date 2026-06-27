import {
  SUPPORTED_PHASES,
  classifyDestination,
  type SupportedPhase,
} from './blockModelContract';
import {
  buildBlockInventory,
  getPhaseInventory,
  type InventoryScope,
  type PhysicalInventoryMetrics,
} from './blockInventory';
import type {
  BlockModelDataset,
  NormalizedBlockModelRow,
} from '../utils/blockModelParser';

export const SUPPORTED_BENCH_HEIGHTS = [5, 10, 15, 20] as const;
export type BenchHeightM = (typeof SUPPORTED_BENCH_HEIGHTS)[number];

export interface BenchInventoryEntry {
  benchId: string;
  sequenceFromTop: number;
  floorElevationM: number;
  ceilingElevationM: number;
  centerElevationM: number;
  metrics: PhysicalInventoryMetrics;
  cumulativeFromTop: PhysicalInventoryMetrics;
}

export interface BlockBenchInventoryReport {
  sourceName: string;
  phase: SupportedPhase;
  scope: InventoryScope;
  benchHeightM: BenchHeightM;
  datumElevationM: number;
  selectedBlockCount: number;
  benches: BenchInventoryEntry[];
  total: PhysicalInventoryMetrics;
  reconciliation: {
    blockCountCloses: boolean;
    volumeCloses: boolean;
    massCloses: boolean;
    processPlusWasteCloses: boolean;
    millPlusLeachCloses: boolean;
    cumulativeFromTopCloses: boolean;
    phaseInventoryCloses: boolean;
    intervalsDoNotOverlap: boolean;
  };
  methodology: {
    assignmentBasis: 'ZC';
    boundaryPolicy: '[floor, ceiling)';
    wholeBlockAssignment: true;
    volumeSplitAcrossBenches: false;
    inventoryLabel: 'inventario dentro del diseño';
    reserveClaimAllowed: false;
    gradeUnitsConfirmed: false;
  };
}

interface Accumulator {
  blockCount: number;
  volumeM3: number;
  massT: number;
  processMassT: number;
  wasteMassT: number;
  millMassT: number;
  leachMassT: number;
  auMassAll: number;
  cuMassAll: number;
  auMassProcess: number;
  cuMassProcess: number;
  minElevationM: number | null;
  maxElevationM: number | null;
}

const CLOSE_TOLERANCE = 1e-9;

function blankAccumulator(): Accumulator {
  return {
    blockCount: 0,
    volumeM3: 0,
    massT: 0,
    processMassT: 0,
    wasteMassT: 0,
    millMassT: 0,
    leachMassT: 0,
    auMassAll: 0,
    cuMassAll: 0,
    auMassProcess: 0,
    cuMassProcess: 0,
    minElevationM: null,
    maxElevationM: null,
  };
}

function addRow(accumulator: Accumulator, row: NormalizedBlockModelRow): void {
  accumulator.blockCount += 1;
  accumulator.volumeM3 += row.NPVVOL;
  accumulator.massT += row.NPVMASS;
  accumulator.auMassAll += row.AU * row.NPVMASS;
  accumulator.cuMassAll += row.CU * row.NPVMASS;
  accumulator.minElevationM =
    accumulator.minElevationM === null
      ? row.ZC
      : Math.min(accumulator.minElevationM, row.ZC);
  accumulator.maxElevationM =
    accumulator.maxElevationM === null
      ? row.ZC
      : Math.max(accumulator.maxElevationM, row.ZC);

  const destinationClass = classifyDestination(row.NPVPDEST);
  if (destinationClass === 'process') {
    accumulator.processMassT += row.NPVMASS;
    accumulator.auMassProcess += row.AU * row.NPVMASS;
    accumulator.cuMassProcess += row.CU * row.NPVMASS;
    if (row.NPVPDEST === 'Mill') accumulator.millMassT += row.NPVMASS;
    if (row.NPVPDEST === 'Leach') accumulator.leachMassT += row.NPVMASS;
  } else if (destinationClass === 'waste') {
    accumulator.wasteMassT += row.NPVMASS;
  }
}

function merge(left: Accumulator, right: Accumulator): Accumulator {
  return {
    blockCount: left.blockCount + right.blockCount,
    volumeM3: left.volumeM3 + right.volumeM3,
    massT: left.massT + right.massT,
    processMassT: left.processMassT + right.processMassT,
    wasteMassT: left.wasteMassT + right.wasteMassT,
    millMassT: left.millMassT + right.millMassT,
    leachMassT: left.leachMassT + right.leachMassT,
    auMassAll: left.auMassAll + right.auMassAll,
    cuMassAll: left.cuMassAll + right.cuMassAll,
    auMassProcess: left.auMassProcess + right.auMassProcess,
    cuMassProcess: left.cuMassProcess + right.cuMassProcess,
    minElevationM:
      left.minElevationM === null
        ? right.minElevationM
        : right.minElevationM === null
          ? left.minElevationM
          : Math.min(left.minElevationM, right.minElevationM),
    maxElevationM:
      left.maxElevationM === null
        ? right.maxElevationM
        : right.maxElevationM === null
          ? left.maxElevationM
          : Math.max(left.maxElevationM, right.maxElevationM),
  };
}

function finalize(accumulator: Accumulator): PhysicalInventoryMetrics {
  return {
    blockCount: accumulator.blockCount,
    volumeM3: accumulator.volumeM3,
    massT: accumulator.massT,
    massMt: accumulator.massT / 1_000_000,
    processMassT: accumulator.processMassT,
    processMassMt: accumulator.processMassT / 1_000_000,
    wasteMassT: accumulator.wasteMassT,
    wasteMassMt: accumulator.wasteMassT / 1_000_000,
    millMassT: accumulator.millMassT,
    millMassMt: accumulator.millMassT / 1_000_000,
    leachMassT: accumulator.leachMassT,
    leachMassMt: accumulator.leachMassT / 1_000_000,
    stripRatioByDestination:
      accumulator.processMassT > 0
        ? accumulator.wasteMassT / accumulator.processMassT
        : null,
    weightedAuAll:
      accumulator.massT > 0
        ? accumulator.auMassAll / accumulator.massT
        : null,
    weightedCuAll:
      accumulator.massT > 0
        ? accumulator.cuMassAll / accumulator.massT
        : null,
    weightedAuProcess:
      accumulator.processMassT > 0
        ? accumulator.auMassProcess / accumulator.processMassT
        : null,
    weightedCuProcess:
      accumulator.processMassT > 0
        ? accumulator.cuMassProcess / accumulator.processMassT
        : null,
    minElevationM: accumulator.minElevationM,
    maxElevationM: accumulator.maxElevationM,
  };
}

function closeEnough(left: number, right: number): boolean {
  return (
    Math.abs(left - right) <=
    CLOSE_TOLERANCE * Math.max(1, Math.abs(left), Math.abs(right))
  );
}

function metricsClose(
  left: PhysicalInventoryMetrics,
  right: PhysicalInventoryMetrics,
): boolean {
  return (
    left.blockCount === right.blockCount &&
    closeEnough(left.volumeM3, right.volumeM3) &&
    closeEnough(left.massT, right.massT) &&
    closeEnough(left.processMassT, right.processMassT) &&
    closeEnough(left.wasteMassT, right.wasteMassT) &&
    closeEnough(left.millMassT, right.millMassT) &&
    closeEnough(left.leachMassT, right.leachMassT)
  );
}

export function benchFloorForElevation(
  elevationM: number,
  datumElevationM: number,
  benchHeightM: BenchHeightM,
): number {
  const raw =
    datumElevationM +
    Math.floor((elevationM - datumElevationM) / benchHeightM) * benchHeightM;
  return Number(raw.toFixed(9));
}

export function buildBlockBenchInventory(
  dataset: BlockModelDataset,
  phase: SupportedPhase,
  scope: InventoryScope,
  benchHeightM: BenchHeightM,
): BlockBenchInventoryReport {
  if (!SUPPORTED_PHASES.includes(phase)) {
    throw new Error(`Fase no soportada: F${phase}.`);
  }
  if (!SUPPORTED_BENCH_HEIGHTS.includes(benchHeightM)) {
    throw new Error(`Altura de banco no soportada: ${benchHeightM} m.`);
  }

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
    addRow(accumulator, row);
    byBench.set(floor, accumulator);
  }

  const sortedFloors = [...byBench.keys()].sort((left, right) => right - left);
  let cumulative = blankAccumulator();
  const benches: BenchInventoryEntry[] = sortedFloors.map((floor, index) => {
    const metricsAccumulator = byBench.get(floor)!;
    cumulative = merge(cumulative, metricsAccumulator);
    const ceiling = floor + benchHeightM;
    return {
      benchId: `B-${floor.toFixed(0)}-${ceiling.toFixed(0)}`,
      sequenceFromTop: index + 1,
      floorElevationM: floor,
      ceilingElevationM: ceiling,
      centerElevationM: floor + benchHeightM / 2,
      metrics: finalize(metricsAccumulator),
      cumulativeFromTop: finalize(cumulative),
    };
  });

  const totalAccumulator = [...byBench.values()].reduce(
    (result, accumulator) => merge(result, accumulator),
    blankAccumulator(),
  );
  const total = finalize(totalAccumulator);
  const phaseInventory = getPhaseInventory(buildBlockInventory(dataset), phase);
  const expected = phaseInventory[scope];
  const finalCumulative = benches.at(-1)!.cumulativeFromTop;

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
    benches,
    total,
    reconciliation: {
      blockCountCloses:
        benches.reduce((sum, bench) => sum + bench.metrics.blockCount, 0) ===
        total.blockCount,
      volumeCloses: closeEnough(
        benches.reduce((sum, bench) => sum + bench.metrics.volumeM3, 0),
        total.volumeM3,
      ),
      massCloses: closeEnough(
        benches.reduce((sum, bench) => sum + bench.metrics.massT, 0),
        total.massT,
      ),
      processPlusWasteCloses: closeEnough(
        total.processMassT + total.wasteMassT,
        total.massT,
      ),
      millPlusLeachCloses: closeEnough(
        total.millMassT + total.leachMassT,
        total.processMassT,
      ),
      cumulativeFromTopCloses: metricsClose(finalCumulative, total),
      phaseInventoryCloses: metricsClose(total, expected),
      intervalsDoNotOverlap,
    },
    methodology: {
      assignmentBasis: 'ZC',
      boundaryPolicy: '[floor, ceiling)',
      wholeBlockAssignment: true,
      volumeSplitAcrossBenches: false,
      inventoryLabel: 'inventario dentro del diseño',
      reserveClaimAllowed: false,
      gradeUnitsConfirmed: false,
    },
  };
}
