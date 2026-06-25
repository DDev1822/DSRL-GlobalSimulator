import type {
  GeometryBounds,
  PhaseGeometryData,
  Point3D,
  Triangle,
  ValidationStatus,
} from '../types/datamine';
import { fetchCsv } from './csv';

const DEFAULT_POINTS_FILE = '/data/Design%20Pit_pt.csv';
const DEFAULT_TRIANGLES_FILE = '/data/Design%20Pit_tr.csv';
const EXPECTED_POINT_COUNT = 7_995;
const EXPECTED_TRIANGLE_COUNT = 15_683;

export interface DatamineSourceFiles {
  pointsFile?: string;
  trianglesFile?: string;
}

function readNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '' || value.trim() === '-') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateBounds(points: Point3D[]): GeometryBounds {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

export async function parseDatamineGeometry(
  source: DatamineSourceFiles = {},
): Promise<PhaseGeometryData> {
  const pointsFile = source.pointsFile ?? DEFAULT_POINTS_FILE;
  const trianglesFile = source.trianglesFile ?? DEFAULT_TRIANGLES_FILE;

  const [pointRows, triangleRows] = await Promise.all([
    fetchCsv(pointsFile),
    fetchCsv(trianglesFile),
  ]);

  const pointMap = new Map<number, Point3D>();
  let invalidPointRows = 0;
  let duplicatePids = 0;

  for (const row of pointRows) {
    const pid = readNumber(row.PID);
    const x = readNumber(row.XP);
    const y = readNumber(row.YP);
    const z = readNumber(row.ZP);

    if (pid === null || x === null || y === null || z === null) {
      invalidPointRows += 1;
      continue;
    }

    if (pointMap.has(pid)) duplicatePids += 1;
    pointMap.set(pid, { pid, x, y, z });
  }

  const validTriangles: Triangle[] = [];
  let invalidTriangleRows = 0;
  let invalidPIDs = 0;

  for (const row of triangleRows) {
    const id = readNumber(row.TRIANGLE);
    const pid1 = readNumber(row.PID1);
    const pid2 = readNumber(row.PID2);
    const pid3 = readNumber(row.PID3);

    if (id === null || pid1 === null || pid2 === null || pid3 === null) {
      invalidTriangleRows += 1;
      continue;
    }

    if (!pointMap.has(pid1) || !pointMap.has(pid2) || !pointMap.has(pid3)) {
      invalidPIDs += 1;
      continue;
    }

    validTriangles.push({
      id,
      pid1,
      pid2,
      pid3,
      layer: row.LAYERS || undefined,
      pitName: row.Pit || undefined,
    });
  }

  const points = Array.from(pointMap.values());

  if (points.length === 0) {
    throw new Error('El archivo de puntos no contiene coordenadas válidas.');
  }

  if (validTriangles.length === 0) {
    throw new Error('El archivo de triángulos no contiene conectividad válida.');
  }

  const messages: string[] = [
    `${points.length.toLocaleString('en-US')} puntos válidos cargados.`,
    `${validTriangles.length.toLocaleString('en-US')} triángulos válidos cargados.`,
    `${invalidPIDs.toLocaleString('en-US')} triángulos con referencias PID inexistentes.`,
    'La fuente actual no incluye una topografía independiente.',
    'La fuente actual no incluye strings independientes.',
  ];

  if (invalidPointRows > 0) messages.push(`${invalidPointRows} filas de puntos fueron descartadas.`);
  if (invalidTriangleRows > 0) messages.push(`${invalidTriangleRows} filas de triángulos fueron descartadas.`);
  if (duplicatePids > 0) messages.push(`${duplicatePids} PID duplicados fueron reemplazados por su última aparición.`);
  if (points.length !== EXPECTED_POINT_COUNT) {
    messages.push(`Advertencia: se esperaban ${EXPECTED_POINT_COUNT.toLocaleString('en-US')} puntos.`);
  }
  if (validTriangles.length !== EXPECTED_TRIANGLE_COUNT) {
    messages.push(`Advertencia: se esperaban ${EXPECTED_TRIANGLE_COUNT.toLocaleString('en-US')} triángulos.`);
  }

  const hasWarnings =
    invalidPointRows > 0 ||
    invalidTriangleRows > 0 ||
    invalidPIDs > 0 ||
    duplicatePids > 0 ||
    points.length !== EXPECTED_POINT_COUNT ||
    validTriangles.length !== EXPECTED_TRIANGLE_COUNT;

  const status: ValidationStatus = hasWarnings ? 'warning' : 'valid';

  return {
    points,
    triangles: {
      topography: [],
      pit: validTriangles,
    },
    cutStrings: [],
    validation: {
      status,
      messages,
      stats: {
        totalPoints: points.length,
        totalTriangles: validTriangles.length,
        totalStrings: 0,
        totalStringPoints: 0,
        topographyTriangles: 0,
        pitTriangles: validTriangles.length,
        invalidPIDs,
      },
    },
    bounds: calculateBounds(points),
    dataSource: {
      type: 'REAL_DATAMINE',
      files: [pointsFile, trianglesFile],
      missingFiles: [],
    },
  };
}

export const parsePhase6Geometry = parseDatamineGeometry;
