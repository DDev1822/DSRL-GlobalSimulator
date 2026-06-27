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
  topographyData?: PhaseGeometryData | null;
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

function mergeBounds(primary: Bounds, secondary?: Bounds | null): Bounds {
  if (!secondary) return primary;
  return {
    minX: Math.min(primary.minX, secondary.minX),
    maxX: Math.max(primary.maxX, secondary.maxX),
    minY: Math.min(primary.minY, secondary.minY),
    maxY: Math.max(primary.maxY, secondary.maxY),
    minZ: Math.min(primary.minZ, secondary.minZ),
    maxZ: Math.max(primary.maxZ, secondary.maxZ),
  };
}

function colorForMode(
  mode: ViewerColorMode,
  elevationRatio: number,
  phaseRatio: number,
  metrics: ViewerEconomicMetrics,
  group: 'Topografía' | 'Pit',
): THREE.Color {
  const clampedElevation = THREE.MathUtils.clamp(elevationRatio, 0, 1);
  const clampedPhase = THREE.MathUtils.clamp(phaseRatio, 0, 1);
  const bandedElevation = Math.round(clampedElevation * 14) / 14;

  if (group === 'Topografía') {
    return new THREE.Color().setHSL(
      0.27 - bandedElevation * 0.04,
      0.18,
      0.34 + bandedElevation * 0.24,
    );
  }

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
      const reserveStrength = THREE.MathUtils.clamp(metrics.reserves / 1500, 0.2, 1);
      return new THREE.Color().setHSL(0.58, 0.78, 0.24 + reserveStrength * clampedPhase * 0.38);
    }
    case 'grade': {
      const gradeStrength = THREE.MathUtils.clamp(metrics.grade / 2, 0.15, 1);
      return new THREE.Color().setHSL(0.12 - clampedElevation * 0.08, 0.88, 0.28 + gradeStrength * 0.42);
    }
    case 'strip_ratio': {
      const stripStrength = THREE.MathUtils.clamp(metrics.stripRatio / 6, 0.1, 1);
      return new THREE.Color().setHSL(0.14 - stripStrength * 0.12, 0.86, 0.32 + (1 - clampedElevation) * 0.28);
    }
    case 'component':
    default:
      return new THREE.Color().setHSL(
        0.095 - bandedElevation * 0.025,
        0.28,
        0.22 + bandedElevation * 0.32,
      );
  }
}

function buildMeshGeometry(
  triangles: Triangle[],
  points: Point3D[],
  bounds: Bounds,
  colorMode: ViewerColorMode,
  phaseStep: number,
  metrics: ViewerEconomicMetrics,
  group: 'Topografía' | 'Pit',
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
      const color = colorForMode(
        colorMode,
        elevationRatio,
        phaseRatio,
        metrics,
        group,
      );
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
  opacity,
  depthWrite,
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
  opacity: number;
  depthWrite: boolean;
  onHover?: (data: HoveredGeometry | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const center = useMemo(() => getCenter(bounds), [bounds]);
  const meshGeometry = useMemo(
    () =>
      buildMeshGeometry(
        triangles,
        points,
        bounds,
        colorMode,
        phaseStep,
        economicMetrics,
        group,
      ),
    [triangles, points, bounds, colorMode, phaseStep, economicMetrics, group],
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
    const faceIndex = typeof event.faceIndex === 'number' ? event.faceIndex : 0;
    const safeIndex = Math.min(Math.max(faceIndex, 0), triangles.length - 1);
    const triangle = triangles[safeIndex];

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
      renderOrder={group === 'Topografía' ? 0 : 1}
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
        opacity={hovered ? Math.min(opacity + 0.08, 1) : opacity}
        transparent={opacity < 1}
        depthWrite={depthWrite}
        flatShading={group === 'Pit'}
        roughness={group === 'Pit' ? 0.94 : 0.88}
        metalness={0.02}
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
  topographyData = null,
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

  const bounds = mergeBounds(
    geometryData.bounds,
    showTopography ? topographyData?.bounds : null,
  );
  const maxRange = Math.max(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    bounds.maxZ - bounds.minZ,
    1,
  );
  const cameraDistance = maxRange * 1.45;

  return (
    <div className="datamine-canvas">
      <Canvas dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
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
        <ambientLight intensity={0.5} />
        <hemisphereLight args={['#b8c7c2', '#1a2428', 0.68]} />
        <directionalLight position={[12, 16, 9]} intensity={1.62} />
        <directionalLight position={[-10, 7, -12]} intensity={0.46} />

        {showTopography &&
          topographyData &&
          topographyData.triangles.topography.length > 0 && (
            <TriangleMesh
              group="Topografía"
              triangles={topographyData.triangles.topography}
              points={topographyData.points}
              bounds={bounds}
              wireframe={showWireframe}
              colorMode="component"
              phaseStep={phaseStep}
              economicMetrics={economicMetrics}
              opacity={0.58}
              depthWrite={false}
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
            opacity={0.98}
            depthWrite
            onHover={onTriangleHover}
          />
        )}

        {showStrings &&
          geometryData.cutStrings.map((cutString) => (
            <StringLine key={cutString.id} cutString={cutString} bounds={bounds} />
          ))}

        <gridHelper args={[maxRange * 2, 20, '#46606e', '#20323b']} />
        <axesHelper args={[maxRange / 2]} />
      </Canvas>
    </div>
  );
}
