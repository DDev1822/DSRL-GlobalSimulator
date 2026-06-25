import { useEffect, useMemo, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface Point3D {
  pid: number;
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  id: number;
  pid1: number;
  pid2: number;
  pid3: number;
}

interface CutString {
  id: number;
  points: Point3D[];
}

interface GeometryBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

interface PhaseGeometryData {
  points: Point3D[];
  triangles: {
    topography: Triangle[];
    pit: Triangle[];
  };
  cutStrings: CutString[];
  validation: unknown;
  bounds: GeometryBounds;
}

export interface HoveredGeometry {
  group: 'Topografía' | 'Pit';
  position: { x: number; y: number; z: number };
}

type ViewerColorMode = 'group' | 'component' | 'elevation';

interface DataminePhaseViewerProps {
  geometry?: PhaseGeometryData | null;
  geometryData?: PhaseGeometryData | null;
  showTopography: boolean;
  showPit: boolean;
  showStrings: boolean;
  showWireframe: boolean;
  colorMode: ViewerColorMode;
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
  colorMode: ViewerColorMode,
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
        const elevationColor = new THREE.Color().setHSL(
          0.62 - ratio * 0.52,
          0.82,
          0.52,
        );
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
  colorMode: ViewerColorMode;
  onHover?: (data: HoveredGeometry | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const center = useMemo(() => getCenter(bounds), [bounds]);
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
        x: event.point.x + center.x,
        y: -event.point.z + center.y,
        z: event.point.y + center.z,
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
        vertexColors={colorMode === 'elevation'}
        color={colorMode === 'elevation' ? undefined : baseColor}
        wireframe={wireframe}
        side={THREE.DoubleSide}
        opacity={hovered ? 0.96 : 0.8}
        transparent
        roughness={0.72}
        metalness={0.08}
      />
    </mesh>
  );
}

function StringLine({
  cutString,
  bounds,
  onHover,
}: {
  cutString: CutString;
  bounds: GeometryBounds;
  onHover?: (data: { stringId: number } | null) => void;
}) {
  const lineObject = useMemo(() => {
    const center = getCenter(bounds);
    const positions = cutString.points.flatMap((point) => [
      point.x - center.x,
      point.z - center.z,
      -(point.y - center.y),
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );

    const material = new THREE.LineBasicMaterial({ color: '#f59e0b' });
    return new THREE.Line(geometry, material);
  }, [cutString, bounds]);

  useEffect(
    () => () => {
      lineObject.geometry.dispose();
      const material = lineObject.material;
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose());
      } else {
        material.dispose();
      }
    },
    [lineObject],
  );

  return (
    <primitive
      object={lineObject}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onHover?.({ stringId: cutString.id });
      }}
      onPointerOut={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onHover?.(null);
      }}
    />
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
  if (!visible) return null;

  return (
    <group>
      {strings.map((cutString) => (
        <StringLine
          key={cutString.id}
          cutString={cutString}
          bounds={bounds}
          onHover={onHover}
        />
      ))}
    </group>
  );
}

export default function DataminePhaseViewer({
  geometry,
  geometryData,
  showTopography,
  showPit,
  showStrings,
  showWireframe,
  colorMode,
  onTriangleHover,
  onStringHover,
}: DataminePhaseViewerProps) {
  const resolvedGeometry = geometryData ?? geometry ?? null;

  if (!resolvedGeometry) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded bg-slate-950/70 text-xs text-slate-500">
        Sin geometría cargada
      </div>
    );
  }

  const { bounds } = resolvedGeometry;
  const rangeX = bounds.maxX - bounds.minX;
  const rangeY = bounds.maxY - bounds.minY;
  const rangeZ = bounds.maxZ - bounds.minZ;
  const maxRange = Math.max(rangeX, rangeY, rangeZ, 1);
  const cameraDistance = maxRange * 1.45;

  return (
    <div className="h-full w-full overflow-hidden rounded bg-slate-950/70">
      <Canvas dpr={[1, 2]}>
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
          minDistance={maxRange * 0.22}
          maxDistance={maxRange * 4}
          target={[0, 0, 0]}
        />

        <ambientLight intensity={0.72} />
        <directionalLight position={[10, 14, 8]} intensity={1.2} />
        <directionalLight position={[-8, 5, -10]} intensity={0.35} />

        {showTopography && resolvedGeometry.triangles.topography.length > 0 && (
          <TriangleMesh
            group="Topografía"
            triangles={resolvedGeometry.triangles.topography}
            points={resolvedGeometry.points}
            bounds={bounds}
            baseColor="#6b7280"
            wireframe={showWireframe}
            colorMode={colorMode}
            onHover={onTriangleHover}
          />
        )}

        {showPit && resolvedGeometry.triangles.pit.length > 0 && (
          <TriangleMesh
            group="Pit"
            triangles={resolvedGeometry.triangles.pit}
            points={resolvedGeometry.points}
            bounds={bounds}
            baseColor="#f59e0b"
            wireframe={showWireframe}
            colorMode={colorMode}
            onHover={onTriangleHover}
          />
        )}

        <StringLines
          strings={resolvedGeometry.cutStrings}
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
