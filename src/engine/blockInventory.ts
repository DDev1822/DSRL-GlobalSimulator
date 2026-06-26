import {
  SUPPORTED_PHASES,
  classifyDestination,
  type SupportedPhase,
} from './blockModelContract';
import type {
  BlockModelDataset,
  NormalizedBlockModelRow,
} from '../utils/blockModelParser';

export type InventoryScope = 'incremental' | 'cumulative';

export interface PhysicalInventoryMetrics {
  blockCount: number;
  volumeM3: number;
  massT: number;
  massMt: number;
  processMassT: number;
  processMassMt: number;
  wasteMassT: number;
  wasteMassMt: number;
  millMassT: number;
  millMassMt: number;
  leachMassT: number;
  leachMassMt: number;
  stripRatioByDestination: number | null;
  weightedAuAll: number | null;
  weightedCuAll: number | null;
  weightedAuProcess: number | null;
  weightedCuProcess: number | null;
  minElevationM: number | null;
  maxElevationM: number | null;
}

export interface PhasePhysicalInventory {
  phase: SupportedPhase;
  incremental: PhysicalInventoryMetrics;
  cumulative: PhysicalInventoryMetrics;
}

export interface BlockInventoryReport {
  sourceName: string;
  activePhases: readonly SupportedPhase[];
  activeBlockCount: number;
  excludedFutureBlockCount: number;
  phaseInventories: PhasePhysicalInventory[];
  totalF1ToF6: PhysicalInventoryMetrics;
  reconciliation: {
    blockCountCloses: boolean;
    volumeCloses: boolean;
    massCloses: boolean;
    processPlusWasteCloses: boolean;
    millPlusLeachCloses: boolean;
    cumulativeMonotonic: boolean;
  };
  terminology: {
    inventoryLabel: 'inventario dentro del diseño';
    reserveClaimAllowed: false;
    destinationBasis: 'NPVPDEST';
    gradeUnitsConfirmed: false;
  };
}

interface InventoryAccumulator {
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

function blankAccumulator(): InventoryAccumulator {
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

function addRow(accumulator: InventoryAccumulator, row: NormalizedBlockModelRow): void {
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

function mergeAccumulators(
  left: InventoryAccumulator,
  right: InventoryAccumulator,
): InventoryAccumulator {
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

function finalize(accumulator: InventoryAccumulator): PhysicalInventoryMetrics {
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
  return Math.abs(left - right) <= CLOSE_TOLERANCE * Math.max(1, Math.abs(left), Math.abs(right));
}

function isMonotonic(values: number[]): boolean {
  return values.every((value, index) => index === 0 || value >= values[index - 1]);
}

export function buildBlockInventory(
  dataset: BlockModelDataset,
): BlockInventoryReport {
  const byPhase = new Map<SupportedPhase, InventoryAccumulator>();
  for (const phase of SUPPORTED_PHASES) {
    byPhase.set(phase, blankAccumulator());
  }

  let excludedFutureBlockCount = 0;
  for (const row of dataset.rows) {
    if (!SUPPORTED_PHASES.includes(row.PSB_PIT as SupportedPhase)) {
      excludedFutureBlockCount += 1;
      continue;
    }
    addRow(byPhase.get(row.PSB_PIT as SupportedPhase)!, row);
  }

  let cumulativeAccumulator = blankAccumulator();
  const phaseInventories: PhasePhysicalInventory[] = SUPPORTED_PHASES.map((phase) => {
    const incrementalAccumulator = byPhase.get(phase)!;
    cumulativeAccumulator = mergeAccumulators(
      cumulativeAccumulator,
      incrementalAccumulator,
    );
    return {
      phase,
      incremental: finalize(incrementalAccumulator),
      cumulative: finalize(cumulativeAccumulator),
    };
  });

  const totalF1ToF6 = phaseInventories.at(-1)!.cumulative;
  const incrementalBlockCount = phaseInventories.reduce(
    (sum, phase) => sum + phase.incremental.blockCount,
    0,
  );
  const incrementalVolume = phaseInventories.reduce(
    (sum, phase) => sum + phase.incremental.volumeM3,
    0,
  );
  const incrementalMass = phaseInventories.reduce(
    (sum, phase) => sum + phase.incremental.massT,
    0,
  );

  return {
    sourceName: dataset.sourceName,
    activePhases: SUPPORTED_PHASES,
    activeBlockCount: totalF1ToF6.blockCount,
    excludedFutureBlockCount,
    phaseInventories,
    totalF1ToF6,
    reconciliation: {
      blockCountCloses: incrementalBlockCount === totalF1ToF6.blockCount,
      volumeCloses: closeEnough(incrementalVolume, totalF1ToF6.volumeM3),
      massCloses: closeEnough(incrementalMass, totalF1ToF6.massT),
      processPlusWasteCloses: closeEnough(
        totalF1ToF6.processMassT + totalF1ToF6.wasteMassT,
        totalF1ToF6.massT,
      ),
      millPlusLeachCloses: closeEnough(
        totalF1ToF6.millMassT + totalF1ToF6.leachMassT,
        totalF1ToF6.processMassT,
      ),
      cumulativeMonotonic:
        isMonotonic(phaseInventories.map((phase) => phase.cumulative.blockCount)) &&
        isMonotonic(phaseInventories.map((phase) => phase.cumulative.volumeM3)) &&
        isMonotonic(phaseInventories.map((phase) => phase.cumulative.massT)),
    },
    terminology: {
      inventoryLabel: 'inventario dentro del diseño',
      reserveClaimAllowed: false,
      destinationBasis: 'NPVPDEST',
      gradeUnitsConfirmed: false,
    },
  };
}

export function getPhaseInventory(
  report: BlockInventoryReport,
  phase: SupportedPhase,
): PhasePhysicalInventory {
  const result = report.phaseInventories.find((item) => item.phase === phase);
  if (!result) throw new Error(`No existe inventario para F${phase}.`);
  return result;
}
