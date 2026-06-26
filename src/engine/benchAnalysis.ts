import type {
  PhaseGeometryData,
  Point3D,
  Triangle,
} from '../utils/datamineParser';

export interface BenchEconomicContext {
  phaseResourceMt: number;
  phaseNpvUsdM: number;
  phaseGradePercent: number;
  phaseStripRatio: number;
}

export interface BenchRecord {
  id: string;
  sequence: number;
  floorElevationM: number;
  crestElevationM: number;
  midpointElevationM: number;
  triangleCount: number;
  surfaceAreaM2: number;
  surfaceAreaHa: number;
  areaShare: number;
  depthRatio: number;
  resourceEstimateMt: number;
  cumulativeResourceEstimateMt: number;
  gradeEstimatePercent: number;
  stripRatioEstimate: number;
  incrementalNpvUsdM: number;
  cumulativeNpvUsdM: number;
  geometryQuality: 'surface-derived';
  economicsQuality: 'analytical-proxy';
}

export interface BenchAnalysisResult {
  benchHeightM: number;
  minElevationM: number;
  maxElevationM: number;
  totalSurfaceAreaM2: number;
  totalTriangles: number;
  benches: BenchRecord[];
  volumeStatus: 'requires-closed-solids-or-block-model';
  notes: string[];
}

interface RawBench {
  floorElevationM: number;
  crestElevationM: number;
  triangleCount: number;
  surfaceAreaM2: number;
}

function vectorDifference(left: Point3D, right: Point3D): [number, number, number] {
  return [left.x - right.x, left.y - right.y, left.z - right.z];
}

function triangleArea(
  triangle: Triangle,
  pointMap: Map<number, Point3D>,
): number {
  const p1 = pointMap.get(triangle.pid1);
  const p2 = pointMap.get(triangle.pid2);
  const p3 = pointMap.get(triangle.pid3);
  if (!p1 || !p2 || !p3) return 0;

  const a = vectorDifference(p2, p1);
  const b = vectorDifference(p3, p1);
  const crossX = a[1] * b[2] - a[2] * b[1];
  const crossY = a[2] * b[0] - a[0] * b[2];
  const crossZ = a[0] * b[1] - a[1] * b[0];
  return 0.5 * Math.hypot(crossX, crossY, crossZ);
}

function triangleCentroidElevation(
  triangle: Triangle,
  pointMap: Map<number, Point3D>,
): number | null {
  const p1 = pointMap.get(triangle.pid1);
  const p2 = pointMap.get(triangle.pid2);
  const p3 = pointMap.get(triangle.pid3);
  if (!p1 || !p2 || !p3) return null;
  return (p1.z + p2.z + p3.z) / 3;
}

function benchFloorForElevation(elevationM: number, benchHeightM: number): number {
  return Math.floor(elevationM / benchHeightM) * benchHeightM;
}

function safePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function benchIdForElevation(
  elevationM: number,
  benchHeightM: number,
): string {
  const floor = benchFloorForElevation(elevationM, benchHeightM);
  return `B-${floor.toFixed(0)}`;
}

export function findBenchByElevation(
  analysis: BenchAnalysisResult,
  elevationM: number,
): BenchRecord | null {
  const id = benchIdForElevation(elevationM, analysis.benchHeightM);
  return analysis.benches.find((bench) => bench.id === id) ?? null;
}

export function analyzeBenches(
  geometry: PhaseGeometryData,
  requestedBenchHeightM: number,
  economicContext: BenchEconomicContext,
): BenchAnalysisResult {
  const benchHeightM = safePositive(requestedBenchHeightM, 10);
  const pointMap = new Map(geometry.points.map((point) => [point.pid, point]));
  const sourceTriangles = geometry.triangles.pit;
  const rawByFloor = new Map<number, RawBench>();

  for (const triangle of sourceTriangles) {
    const centroidElevation = triangleCentroidElevation(triangle, pointMap);
    if (centroidElevation === null) continue;

    const floorElevationM = benchFloorForElevation(
      centroidElevation,
      benchHeightM,
    );
    const current = rawByFloor.get(floorElevationM) ?? {
      floorElevationM,
      crestElevationM: floorElevationM + benchHeightM,
      triangleCount: 0,
      surfaceAreaM2: 0,
    };

    current.triangleCount += 1;
    current.surfaceAreaM2 += triangleArea(triangle, pointMap);
    rawByFloor.set(floorElevationM, current);
  }

  const rawBenches = Array.from(rawByFloor.values()).sort(
    (left, right) => right.floorElevationM - left.floorElevationM,
  );
  const totalSurfaceAreaM2 = rawBenches.reduce(
    (sum, bench) => sum + bench.surfaceAreaM2,
    0,
  );
  const denominator = Math.max(rawBenches.length - 1, 1);

  const resourceWeights = rawBenches.map((bench, index) => {
    const depthRatio = index / denominator;
    return Math.max(bench.surfaceAreaM2, 1) * (0.85 + depthRatio * 0.3);
  });
  const totalResourceWeight = resourceWeights.reduce(
    (sum, weight) => sum + weight,
    0,
  );

  const phaseResourceMt = Math.max(economicContext.phaseResourceMt, 0);
  const phaseGradePercent = Math.max(economicContext.phaseGradePercent, 0);
  const phaseStripRatio = Math.max(economicContext.phaseStripRatio, 0);

  const provisional = rawBenches.map((bench, index) => {
    const depthRatio = index / denominator;
    const resourceEstimateMt =
      phaseResourceMt * (resourceWeights[index] / Math.max(totalResourceWeight, 1));
    const gradeEstimatePercent =
      phaseGradePercent * (1.05 - depthRatio * 0.1);
    const stripRatioEstimate =
      phaseStripRatio * (0.8 + depthRatio * 0.4);
    const valueWeight =
      resourceEstimateMt *
      Math.max(gradeEstimatePercent, 0.0001) /
      Math.max(1 + stripRatioEstimate, 1);

    return {
      id: `B-${bench.floorElevationM.toFixed(0)}`,
      sequence: index + 1,
      floorElevationM: bench.floorElevationM,
      crestElevationM: bench.crestElevationM,
      midpointElevationM:
        (bench.floorElevationM + bench.crestElevationM) / 2,
      triangleCount: bench.triangleCount,
      surfaceAreaM2: bench.surfaceAreaM2,
      surfaceAreaHa: bench.surfaceAreaM2 / 10_000,
      areaShare:
        bench.surfaceAreaM2 / Math.max(totalSurfaceAreaM2, 1),
      depthRatio,
      resourceEstimateMt,
      gradeEstimatePercent,
      stripRatioEstimate,
      valueWeight,
    };
  });

  const totalValueWeight = provisional.reduce(
    (sum, bench) => sum + bench.valueWeight,
    0,
  );
  let cumulativeResourceEstimateMt = 0;
  let cumulativeNpvUsdM = 0;

  const benches: BenchRecord[] = provisional.map((bench) => {
    const incrementalNpvUsdM =
      economicContext.phaseNpvUsdM *
      (bench.valueWeight / Math.max(totalValueWeight, 1));
    cumulativeResourceEstimateMt += bench.resourceEstimateMt;
    cumulativeNpvUsdM += incrementalNpvUsdM;

    return {
      id: bench.id,
      sequence: bench.sequence,
      floorElevationM: bench.floorElevationM,
      crestElevationM: bench.crestElevationM,
      midpointElevationM: bench.midpointElevationM,
      triangleCount: bench.triangleCount,
      surfaceAreaM2: bench.surfaceAreaM2,
      surfaceAreaHa: bench.surfaceAreaHa,
      areaShare: bench.areaShare,
      depthRatio: bench.depthRatio,
      resourceEstimateMt: bench.resourceEstimateMt,
      cumulativeResourceEstimateMt,
      gradeEstimatePercent: bench.gradeEstimatePercent,
      stripRatioEstimate: bench.stripRatioEstimate,
      incrementalNpvUsdM,
      cumulativeNpvUsdM,
      geometryQuality: 'surface-derived',
      economicsQuality: 'analytical-proxy',
    };
  });

  return {
    benchHeightM,
    minElevationM: geometry.bounds.minZ,
    maxElevationM: geometry.bounds.maxZ,
    totalSurfaceAreaM2,
    totalTriangles: sourceTriangles.length,
    benches,
    volumeStatus: 'requires-closed-solids-or-block-model',
    notes: [
      'Triángulos, cotas y área superficial se calculan directamente desde la malla Datamine.',
      'Recurso, ley, strip ratio y VAN por banco son distribuciones analíticas del escenario de fase.',
      'El volumen y tonelaje validados requieren sólidos cerrados o un modelo de bloques.',
    ],
  };
}
