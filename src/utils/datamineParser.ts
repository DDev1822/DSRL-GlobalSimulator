// Datamine Phase 6 Geometry Parser

export interface Point3D {
  pid: number;
  x: number;
  y: number;
  z: number;
}

export interface Triangle {
  id: number;
  pid1: number;
  pid2: number;
  pid3: number;
  layer?: string;
  pitName?: string;
}

export interface CutString {
  id: number;
  points: Point3D[];
}

export interface PhaseGeometryData {
  points: Point3D[];
  triangles: {
    topography: Triangle[];
    pit: Triangle[];
  };
  cutStrings: CutString[];
  validation: {
    status: 'valid' | 'warning' | 'error';
    messages: string[];
    stats: {
      totalPoints: number;
      totalTriangles: number;
      totalStrings: number;
      totalStringPoints: number;
      topographyTriangles: number;
      pitTriangles: number;
      invalidPIDs: number;
      invalidPointRows: number;
      invalidTriangleRows: number;
      duplicatePIDs: number;
    };
  };
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  dataSource: {
    type: 'REAL_DATAMINE';
    files: string[];
    missingFiles: string[];
  };
}

interface CsvRow {
  [key: string]: string;
}

const POINTS_FILE = '/data/Design%20Pit_pt.csv';
const TRIANGLES_FILE = '/data/Design%20Pit_tr.csv';
const EXPECTED_POINT_COUNT = 7_995;
const EXPECTED_TRIANGLE_COUNT = 15_683;

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === ',' && !quoted) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: CsvRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    return row;
  });
}

async function fetchCsv(path: string): Promise<CsvRow[]> {
  const response = await fetch(path, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar ${decodeURIComponent(path)} (${response.status} ${response.statusText}).`,
    );
  }

  const text = await response.text();
  const rows = parseCsv(text);

  if (rows.length === 0) {
    throw new Error(`El archivo ${decodeURIComponent(path)} no contiene filas válidas.`);
  }

  return rows;
}

function readNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '' || value.trim() === '-') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateBounds(points: Point3D[]): PhaseGeometryData['bounds'] {
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

export async function parsePhase6Geometry(): Promise<PhaseGeometryData> {
  const [pointRows, triangleRows] = await Promise.all([
    fetchCsv(POINTS_FILE),
    fetchCsv(TRIANGLES_FILE),
  ]);

  const pointMap = new Map<number, Point3D>();
  let invalidPointRows = 0;
  let duplicatePIDs = 0;

  for (const row of pointRows) {
    const pid = readNumber(row.PID);
    const x = readNumber(row.XP);
    const y = readNumber(row.YP);
    const z = readNumber(row.ZP);

    if (pid === null || x === null || y === null || z === null) {
      invalidPointRows += 1;
      continue;
    }

    if (pointMap.has(pid)) duplicatePIDs += 1;
    pointMap.set(pid, { pid, x, y, z });
  }

  const validTriangles: Triangle[] = [];
  const seenTriangles = new Set<string>();
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

    const triangleKey = `${id}:${pid1}:${pid2}:${pid3}`;
    if (seenTriangles.has(triangleKey)) continue;
    seenTriangles.add(triangleKey);

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

  const messages = [
    `${points.length.toLocaleString('en-US')} puntos válidos cargados.`,
    `${validTriangles.length.toLocaleString('en-US')} triángulos válidos cargados.`,
    `${invalidPIDs.toLocaleString('en-US')} triángulos con referencias PID inexistentes.`,
    'La fuente actual no incluye topografía independiente.',
    'La fuente actual no incluye strings independientes.',
  ];

  if (invalidPointRows > 0) messages.push(`${invalidPointRows} filas de puntos fueron descartadas.`);
  if (invalidTriangleRows > 0) messages.push(`${invalidTriangleRows} filas de triángulos fueron descartadas.`);
  if (duplicatePIDs > 0) messages.push(`${duplicatePIDs} PID duplicados fueron reemplazados.`);

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
    duplicatePIDs > 0 ||
    points.length !== EXPECTED_POINT_COUNT ||
    validTriangles.length !== EXPECTED_TRIANGLE_COUNT;

  return {
    points,
    triangles: { topography: [], pit: validTriangles },
    cutStrings: [],
    validation: {
      status: hasWarnings ? 'warning' : 'valid',
      messages,
      stats: {
        totalPoints: points.length,
        totalTriangles: validTriangles.length,
        totalStrings: 0,
        totalStringPoints: 0,
        topographyTriangles: 0,
        pitTriangles: validTriangles.length,
        invalidPIDs,
        invalidPointRows,
        invalidTriangleRows,
        duplicatePIDs,
      },
    },
    bounds: calculateBounds(points),
    dataSource: {
      type: 'REAL_DATAMINE',
      files: [POINTS_FILE, TRIANGLES_FILE],
      missingFiles: [],
    },
  };
}
