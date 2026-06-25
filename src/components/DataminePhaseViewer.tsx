import { useEffect, useMemo, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type {
  CutString,
  PhaseGeometryData,
  Point3D,
  Triangle,
} from '../utils/datamineParser';

export type ViewerColorMode =
  | 'component'
  | 'phase'
  | 'elevation'
  | 'van_cumulative'
  | 'van_incremental'
  | 'reserves'
  | 'grade'
  | 'strip_ratio';

export interface HoveredGeometry {
  group: 'Topografía' | 'Pit';
  position: { x: number; y: number; z: number };
  triangleId: number;
  component: 'Topografía' | 'Pit';
  easting: number;
  northing: number;
  elevation: number;
}

export interface ViewerEconomicMetrics {
  npv: number;
  reserves: number;
  grade: number;
  stripRatio: number;
}

interface DataminePhaseViewerProps {
  geometryData: PhaseGeometryData | null;
  showTopography?: boolean;
  showPit?: boolean;
  showStrings?: boolean;
  showWireframe?: boolean;
  colorMode: ViewerColorMode;
  phaseStep: number;
  economicMetrics: ViewerEconomicMetrics;
  onTriangleHover?: (data: HoveredGeometry | null) => void;
  onStringHover?: (data: { stringId: number } | null) => void;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

function getCenter(bounds: Bounds) {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  };
}

function colorForMode(
  mode: ViewerColorMode,
  elevationRatio: number,
  phaseRatio: number,
  metrics: ViewerEconomicMetrics,
): THREE.Color {
  const clampedElevation = THREE.MathUtils.clamp(elevationRatio, 0, 1);
  const clampedPhase = THREE.MathUtils.clamp(phaseRatio, 0, 1);

  switch (mode) {
    case 'phase':
      return new THREE.Color().setHSL(0.58 - clampedPhase * 0.48, 0.82, 0.55);
    case 'elevation':
      return new THREE.Color().setHSL(0.64 - clampedElevation * 0.58, 0.84, 0.53);
    case 'van_cumulative': {
      const strength = THREE.MathUtils.clamp(metrics.npv / 6000, 0.18, 1);
      return new THREE.Color().setHSL(0.47, 0.78, 0.2 + strength * 0.38 * clampedElevation);
    }
    case 'van_incremental': {
      const delta = clampedElevation - 0.48;
      return delta >= 0
        ? new THREE.Color().setHSL(0.42, 0.82, 0.36 + delta * 0.32)
        : new THREE.Color().setHSL(0.02, 0.82, 0.44 + Math.abs(delta) * 0.2);
    }
    case 'reserves': {
      const reserveStrength = THREE.MathUtils.clamp(metrics.reserves / 700, 0.2, 1);
      return new THREE.Color().setHSL(0.58, 0.78, 0.24 + reserveStrength * clampedPhase * 0.38);
    }
    case 'grade': {
      const gradeStrength = THREE.MathUtils.clamp(metrics.grade / 1.5, 0.15, 1);
      return new THREE.Color().setHSL(0.12 - clampedElevation * 0.08, 0.88, 0.28 + gradeStrength * 0.42);
    }
    case 'strip_ratio': {
      const stripStrength = THREE.MathUtils.clamp(metrics.stripRatio / 5.5, 0.1, 1);
      return new THREE.Color().setHSL(0.14 - stripStrength * 0.12, 0.86, 0.32 + (1 - clampedElevation) * 0.28);
    }
    case 'component':
    default:
      return new THREE.Color('#38bdf8');
  }
}

function triangleAverageElevation(
  triangle: Triangle,
  pointMap: Map<number, Point3D>,
): number {
  const points = [
    pointMap.get(triangle.pid1),
    pointMap.get(triangle.pid2),
    pointMap.get(triangle.pid3),
  ].filter((point): point is Point3D => point !== undefined);

  if (points.length !== 3) return Number.NEGATIVE_INFINITY;
  return points.reduce((sum, point) => sum + point.z, 0) / 3;
}

function visibleTrianglesForPhase(
  triangles: Triangle[],
  points: Point3D[],
  phaseStep: number,
): Triangle[] {
  const pointMap = new Map(points.map((point) => [point.pid, point]));
  const sorted = [...triangles].sort(
    (left, right) =>
      triangleAverageElevation(right, pointMap) -
      triangleAverageElevation(left, pointMap),
  );
  const visibleCount = Math.max(
    1,
    Math.ceil(sorted.length * THREE.MathUtils.clamp(phaseStep / 6, 1 / 6, 1)),
  );
  return sorted.slice(0, visibleCount);
}

function buildMeshGeometry(
  triangles: Triangle[],
  points: Point3D[],
  bounds: Bounds,
  colorMode: ViewerColorMode,
  phaseStep: number,
  metrics: ViewerEconomicMetrics,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const pointMap = new Map(points.map((point) => [point.pid, point]));
  const center = getCenter(bounds);
  const elevationRange = Math.max(bounds.maxZ - bounds.minZ, 1);
  const vertices: number[] = [];
  const colors: number[] = [];
  const phaseRatio = THREE.MathUtils.clamp(phaseStep / 6, 0, 1);

  for (const triangle of triangles) {
    const trianglePoints = [
      pointMap.get(triangle.pid1),
      pointMap.get(triangle.pid2),
      pointMap.get(triangle.pid3),
    ];
    if (trianglePoints.some((point) => point === undefined)) continue;

    for (const point of trianglePoints as Point3D[]) {
      vertices.push(
        point.x - center.x,
        point.z - center.z,
        -(point.y - center.y),
      );
      const elevationRatio = (point.z - bounds.minZ) / elevationRange;
      const color = colorForMode(colorMode, elevationRatio, phaseRatio, metrics);
      colors.push(color.r, color.g, color.b);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function TriangleMesh({
  group,
  triangles,
  points,
  bounds,
  wireframe,
  colorMode,
  phaseStep,
  economicMetrics,
  onHover,
}: {
  group: 'Topografía' | 'Pit';
  triangles: Triangle[];
  points: Point3D[];
  bounds: Bounds;
  wireframe: boolean;
  colorMode: ViewerColorMode;
  phaseStep: number;
  economicMetrics: ViewerEconomicMetrics;
  onHover?: (data: HoveredGeometry | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const center = useMemo(() => getCenter(bounds), [bounds]);
  const visibleTriangles = useMemo(
    () => visibleTrianglesForPhase(triangles, points, phaseStep),
    [triangles, points, phaseStep],
  );
  const meshGeometry = useMemo(
    () =>
      buildMeshGeometry(
        visibleTriangles,
        points,
        bounds,
        colorMode,
        phaseStep,
        economicMetrics,
      ),
    [visibleTriangles, points, bounds, colorMode, phaseStep, economicMetrics],
  );

  useEffect(() => () => meshGeometry.dispose(), [meshGeometry]);

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(true);
    const position = {
      x: event.point.x + center.x,
      y: -event.point.z + center.y,
      z: event.point.y + center.z,
    };
    const faceIndex = Number.isInteger(event.faceIndex) ? event.faceIndex ?? 0 : 0;
    const safeIndex = Math.min(Math.max(faceIndex, 0), visibleTriangles.length - 1);
    const triangle = visibleTriangles[safeIndex];

    onHover?.({
      group,
      position,
      triangleId: triangle?.id ?? safeIndex + 1,
      component: group,
      easting: position.x,
      northing: position.y,
      elevation: position.z,
    });
  };

  return (
    <mesh
      geometry={meshGeometry}
      onPointerMove={handlePointerMove}
      onPointerOut={(event) => {
        event.stopPropagation();
        setHovered(false);
        onHover?.(null);
      }}
    >
      <meshStandardMaterial
        vertexColors
        wireframe={wireframe}
        side={THREE.DoubleSide}
        opacity={hovered ? 0.96 : 0.84}
        transparent
        roughness={0.72}
        metalness={0.08}
      />
    </mesh>
  );
}

function StringLine({ cutString, bounds }: { cutString: CutString; bounds: Bounds }) {
  const lineObject = useMemo(() => {
    const center = getCenter(bounds);
    const positions = cutString.points.flatMap((point) => [
      point.x - center.x,
      point.z - center.z,
      -(point.y - center.y),
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: '#f59e0b' }),
    );
  }, [cutString, bounds]);

  useEffect(
    () => () => {
      lineObject.geometry.dispose();
      const material = lineObject.material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material.dispose();
    },
    [lineObject],
  );

  return <primitive object={lineObject} />;
}

export default function DataminePhaseViewer({
  geometryData,
  showTopography = false,
  showPit = true,
  showStrings = false,
  showWireframe = false,
  colorMode,
  phaseStep,
  economicMetrics,
  onTriangleHover,
}: DataminePhaseViewerProps) {
  if (!geometryData) {
    return <div className="viewer-empty">Sin geometría cargada</div>;
  }

  const { bounds } = geometryData;
  const maxRange = Math.max(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    bounds.maxZ - bounds.minZ,
    1,
  );
  const cameraDistance = maxRange * 1.45;

  return (
    <div className="datamine-canvas">
      <Canvas dpr={[1, 1.6]}>
        <PerspectiveCamera
          makeDefault
          position={[
            cameraDistance * 0.75,
            cameraDistance * 0.55,
            cameraDistance * 0.75,
          ]}
          fov={48}
          near={0.1}
          far={cameraDistance * 10}
        />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.07}
          minDistance={maxRange * 0.2}
          maxDistance={maxRange * 4}
          target={[0, 0, 0]}
        />
        <ambientLight intensity={0.82} />
        <directionalLight position={[10, 14, 8]} intensity={1.28} />
        <directionalLight position={[-8, 5, -10]} intensity={0.38} />

        {showTopography && geometryData.triangles.topography.length > 0 && (
          <TriangleMesh
            group="Topografía"
            triangles={geometryData.triangles.topography}
            points={geometryData.points}
            bounds={bounds}
            wireframe={showWireframe}
            colorMode={colorMode}
            phaseStep={phaseStep}
            economicMetrics={economicMetrics}
            onHover={onTriangleHover}
          />
        )}

        {showPit && geometryData.triangles.pit.length > 0 && (
          <TriangleMesh
            group="Pit"
            triangles={geometryData.triangles.pit}
            points={geometryData.points}
            bounds={bounds}
            wireframe={showWireframe}
            colorMode={colorMode}
            phaseStep={phaseStep}
            economicMetrics={economicMetrics}
            onHover={onTriangleHover}
          />
        )}

        {showStrings &&
          geometryData.cutStrings.map((cutString) => (
            <StringLine key={cutString.id} cutString={cutString} bounds={bounds} />
          ))}

        <gridHelper args={[maxRange * 2, 20, '#33516f', '#18304a']} />
        <axesHelper args={[maxRange / 2]} />
      </Canvas>
    </div>
  );
}
