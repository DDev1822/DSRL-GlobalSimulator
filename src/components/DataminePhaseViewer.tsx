import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type {
  CutString,
  GeometryBounds,
  PhaseGeometryData,
  Point3D,
  Triangle,
} from '../types/datamine';

export interface HoveredGeometry {
  group: 'Topografía' | 'Pit';
  position: { x: number; y: number; z: number };
}

interface DataminePhaseViewerProps {
  geometry: PhaseGeometryData | null;
  showTopography: boolean;
  showPit: boolean;
  showStrings: boolean;
  showWireframe: boolean;
  colorMode: 'group' | 'elevation';
  onTriangleHover?: (data: HoveredGeometry | null) => void;
  onStringHover?: (data: { stringId: number } | null) => void;
}

function getCenter(bounds: GeometryBounds) {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  };
}

function buildMeshGeometry(
  triangles: Triangle[],
  points: Point3D[],
  bounds: GeometryBounds,
  baseColor: string,
  colorMode: 'group' | 'elevation',
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const pointMap = new Map(points.map((point) => [point.pid, point]));
  const center = getCenter(bounds);
  const elevationRange = Math.max(bounds.maxZ - bounds.minZ, 1);
  const vertices: number[] = [];
  const colors: number[] = [];
  const solidColor = new THREE.Color(baseColor);

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

      if (colorMode === 'elevation') {
        const ratio = (point.z - bounds.minZ) / elevationRange;
        const elevationColor = new THREE.Color().setHSL(0.62 - ratio * 0.52, 0.82, 0.52);
        colors.push(elevationColor.r, elevationColor.g, elevationColor.b);
      } else {
        colors.push(solidColor.r, solidColor.g, solidColor.b);
      }
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
  baseColor,
  wireframe,
  colorMode,
  onHover,
}: {
  group: 'Topografía' | 'Pit';
  triangles: Triangle[];
  points: Point3D[];
  bounds: GeometryBounds;
  baseColor: string;
  wireframe: boolean;
  colorMode: 'group' | 'elevation';
  onHover?: (data: HoveredGeometry | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const meshGeometry = useMemo(
    () => buildMeshGeometry(triangles, points, bounds, baseColor, colorMode),
    [triangles, points, bounds, baseColor, colorMode],
  );

  useEffect(() => () => meshGeometry.dispose(), [meshGeometry]);

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(true);
    onHover?.({
      group,
      position: {
        x: event.point.x,
        y: event.point.y,
        z: event.point.z,
      },
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
        ref={materialRef}
        vertexColors={colorMode === 'elevation'}
        color={colorMode === 'elevation' ? undefined : baseColor}
        wireframe={wireframe}
        side={THREE.DoubleSide}
        opacity={hovered ? 0.95 : 0.78}
        transparent
        roughness={0.72}
        metalness={0.08}
      />
    </mesh>
  );
}

function StringLines({
  strings,
  bounds,
  visible,
  onHover,
}: {
  strings: CutString[];
  bounds: GeometryBounds;
  visible: boolean;
  onHover?: (data: { stringId: number } | null) => void;
}) {
  const center = getCenter(bounds);
  if (!visible) return null;

  return (
    <group>
      {strings.map((string) => {
        const positions = string.points.flatMap((point) => [
          point.x - center.x,
          point.z - center.z,
          -(point.y - center.y),
        ]);

        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(positions, 3),
        );

        return (
          <line
            key={string.id}
            geometry={lineGeometry}
            onPointerOver={(event) => {
              event.stopPropagation();
              onHover?.({ stringId: string.id });
            }}
            onPointerOut={(event) => {
              event.stopPropagation();
              onHover?.(null);
            }}
          >
            <lineBasicMaterial color="#f59e0b" />
          </line>
        );
      })}
    </group>
  );
}

export default function DataminePhaseViewer({
  geometry,
  showTopography,
  showPit,
  showStrings,
  showWireframe,
  colorMode,
  onTriangleHover,
  onStringHover,
}: DataminePhaseViewerProps) {
  if (!geometry) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded bg-slate-950/70 text-xs text-slate-500">
        Sin geometría cargada
      </div>
    );
  }

  const { bounds } = geometry;
  const rangeX = bounds.maxX - bounds.minX;
  const rangeY = bounds.maxY - bounds.minY;
  const rangeZ = bounds.maxZ - bounds.minZ;
  const maxRange = Math.max(rangeX, rangeY, rangeZ, 1);
  const cameraDistance = maxRange * 1.45;

  return (
    <div className="h-full w-full overflow-hidden rounded bg-slate-950/70">
      <Canvas>
        <PerspectiveCamera
          makeDefault
          position={[cameraDistance * 0.75, cameraDistance * 0.55, cameraDistance * 0.75]}
          fov={48}
          near={0.1}
          far={cameraDistance * 10}
        />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.07}
          minDistance={maxRange * 0.22}
          maxDistance={maxRange * 4}
          target={[0, 0, 0]}
        />

        <ambientLight intensity={0.72} />
        <directionalLight position={[10, 14, 8]} intensity={1.2} />
        <directionalLight position={[-8, 5, -10]} intensity={0.35} />

        {showTopography && geometry.triangles.topography.length > 0 && (
          <TriangleMesh
            group="Topografía"
            triangles={geometry.triangles.topography}
            points={geometry.points}
            bounds={bounds}
            baseColor="#6b7280"
            wireframe={showWireframe}
            colorMode={colorMode}
            onHover={onTriangleHover}
          />
        )}

        {showPit && geometry.triangles.pit.length > 0 && (
          <TriangleMesh
            group="Pit"
            triangles={geometry.triangles.pit}
            points={geometry.points}
            bounds={bounds}
            baseColor="#f59e0b"
            wireframe={showWireframe}
            colorMode={colorMode}
            onHover={onTriangleHover}
          />
        )}

        <StringLines
          strings={geometry.cutStrings}
          bounds={bounds}
          visible={showStrings}
          onHover={onStringHover}
        />

        <gridHelper args={[maxRange * 2, 20, '#334155', '#1e293b']} />
        <axesHelper args={[maxRange / 2]} />
      </Canvas>
    </div>
  );
}
