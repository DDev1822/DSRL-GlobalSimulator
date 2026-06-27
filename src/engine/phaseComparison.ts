export interface PhaseComparisonSnapshot {
  phase: number;
  geometryId: string;
  benchCount: number;
  triangleCount: number;
  surfaceAreaHa: number;
  minElevationM: number;
  maxElevationM: number;
  resourceMt: number;
  gradePercent: number;
  stripRatio: number;
  npvUsdM: number;
}

export interface PhaseStepDelta {
  fromPhase: number | null;
  toPhase: number;
  surfaceAreaDeltaHa: number;
  benchCountDelta: number;
  triangleCountDelta: number;
  minimumElevationDeltaM: number;
  resourceDeltaMt: number;
  gradeDeltaPercent: number;
  stripRatioDelta: number;
  npvDeltaUsdM: number;
}

export interface PhasePairComparison {
  base: PhaseComparisonSnapshot;
  target: PhaseComparisonSnapshot;
  delta: PhaseStepDelta;
}

export interface PhaseComparisonResult {
  snapshots: PhaseComparisonSnapshot[];
  sequentialDeltas: PhaseStepDelta[];
  geometryQuality: 'surface-derived';
  economicsQuality: 'analytical-proxy';
  volumeStatus: 'requires-closed-solids-or-block-model';
}

function subtract(
  base: PhaseComparisonSnapshot | null,
  target: PhaseComparisonSnapshot,
): PhaseStepDelta {
  return {
    fromPhase: base?.phase ?? null,
    toPhase: target.phase,
    surfaceAreaDeltaHa: target.surfaceAreaHa - (base?.surfaceAreaHa ?? 0),
    benchCountDelta: target.benchCount - (base?.benchCount ?? 0),
    triangleCountDelta: target.triangleCount - (base?.triangleCount ?? 0),
    minimumElevationDeltaM:
      target.minElevationM - (base?.minElevationM ?? target.minElevationM),
    resourceDeltaMt: target.resourceMt - (base?.resourceMt ?? 0),
    gradeDeltaPercent: target.gradePercent - (base?.gradePercent ?? 0),
    stripRatioDelta: target.stripRatio - (base?.stripRatio ?? 0),
    npvDeltaUsdM: target.npvUsdM - (base?.npvUsdM ?? 0),
  };
}

export function buildPhaseComparison(
  sourceSnapshots: PhaseComparisonSnapshot[],
): PhaseComparisonResult {
  const snapshots = [...sourceSnapshots].sort(
    (left, right) => left.phase - right.phase,
  );
  const sequentialDeltas = snapshots.map((snapshot, index) =>
    subtract(index > 0 ? snapshots[index - 1] : null, snapshot),
  );

  return {
    snapshots,
    sequentialDeltas,
    geometryQuality: 'surface-derived',
    economicsQuality: 'analytical-proxy',
    volumeStatus: 'requires-closed-solids-or-block-model',
  };
}

export function comparePhasePair(
  result: PhaseComparisonResult,
  basePhase: number,
  targetPhase: number,
): PhasePairComparison | null {
  const base = result.snapshots.find((item) => item.phase === basePhase);
  const target = result.snapshots.find((item) => item.phase === targetPhase);
  if (!base || !target) return null;
  return { base, target, delta: subtract(base, target) };
}
