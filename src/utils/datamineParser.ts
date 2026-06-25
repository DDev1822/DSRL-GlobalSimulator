// Datamine multi-surface geometry parser.
// Source files remain separated by surface; the application unifies them in memory.

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

export type GeometrySurfaceType = 'pit' | 'topography';

export interface GeometryManifestEntry {
  id: string;
  name: string;
  type: GeometrySurfaceType;
  phase?: number;
  pointsFile: string;
  trianglesFile: string;
  expectedPoints?: number;
  expectedTriangles?: number;
  enabled?: boolean;
}

export interface DatamineGeometryManifest {
  version: number;
  coordinateSystem: string;
  units: 'metres' | 'feet' | string;
  topography: GeometryManifestEntry | null;
  phases: GeometryManifestEntry[];
}

export interface GeometryValidationStats {
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
}

export interface GeometryBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
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
    stats: GeometryValidationStats;
  };
  bounds: GeometryBounds;
  dataSource: {
    type: 'REAL_DATAMINE';
    files: string[];
    missingFiles: string[];
    manifestFile?: string;
    geometryId?: string;
    geometryName?: string;
    geometryType?: GeometrySurfaceType;
    phase?: number;
    coordinateSystem?: string;
    units?: string;
  };
}

export interface DatamineGeometryCatalog {
  manifest: DatamineGeometryManifest;
  topography: PhaseGeometryData | null;
  phases: Record<number, PhaseGeometryData>;
  availablePhases: number[];
  validation: {
    status: 'valid' | 'warning' | 'error';
    messages: string[];
    loadedSurfaces: number;
    failedSurfaces: number;
    missingFiles: string[];
  };
}

interface CsvRow {
  [key: string]: string;
}

const MANIFEST_FILE = '/data/datamine/geometry-manifest.json';
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

async function fetchManifest(path = MANIFEST_FILE): Promise<DatamineGeometryManifest> {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(
      `No se pudo cargar el manifiesto ${decodeURIComponent(path)} (${response.status} ${response.statusText}).`,
    );
  }

  const manifest = (await response.json()) as DatamineGeometryManifest;
  validateManifestContract(manifest);
  return manifest;
}

function validateManifestContract(manifest: DatamineGeometryManifest): void {
  if (!Number.isInteger(manifest.version) || manifest.version < 1) {
    throw new Error('El manifiesto Datamine debe declarar una versión válida.');
  }

  if (!Array.isArray(manifest.phases)) {
    throw new Error('El manifiesto Datamine debe incluir un arreglo phases.');
  }

  const phaseNumbers = new Set<number>();
  const ids = new Set<string>();
  const entries = [
    ...(manifest.topography ? [manifest.topography] : []),
    ...manifest.phases,
  ];

  for (const entry of entries) {
    if (!entry.id || !entry.name || !entry.pointsFile || !entry.trianglesFile) {
      throw new Error('Cada superficie del manifiesto debe declarar id, name, pointsFile y trianglesFile.');
    }
    if (ids.has(entry.id)) {
      throw new Error(`El manifiesto contiene el geometry id duplicado ${entry.id}.`);
    }
    ids.add(entry.id);

    if (entry.type === 'pit') {
      if (!Number.isInteger(entry.phase) || (entry.phase ?? 0) < 1) {
        throw new Error(`La superficie ${entry.id} debe declarar una fase entera mayor que cero.`);
      }
      if (phaseNumbers.has(entry.phase as number)) {
        throw new Error(`El manifiesto contiene la fase duplicada F${entry.phase}.`);
      }
      phaseNumbers.add(entry.phase as number);
    }
  }
}

function readField(row: CsvRow, aliases: string[]): string | undefined {
  for (const alias of aliases) {
    if (row[alias] !== undefined) return row[alias];
  }
  return undefined;
}

function readNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '' || value.trim() === '-') {
    return null;
  }

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

function parsePoints(pointRows: CsvRow[]): {
  points: Point3D[];
  pointMap: Map<number, Point3D>;
  invalidPointRows: number;
  duplicatePIDs: number;
} {
  const pointMap = new Map<number, Point3D>();
  let invalidPointRows = 0;
  let duplicatePIDs = 0;

  for (const row of pointRows) {
    const pid = readNumber(readField(row, ['PID', 'POINT_ID', 'GLOBAL_PID']));
    const x = readNumber(readField(row, ['XP', 'X', 'EASTING']));
    const y = readNumber(readField(row, ['YP', 'Y', 'NORTHING']));
    const z = readNumber(readField(row, ['ZP', 'Z', 'ELEVATION', 'RL']));

    if (pid === null || x === null || y === null || z === null) {
      invalidPointRows += 1;
      continue;
    }

    if (pointMap.has(pid)) duplicatePIDs += 1;
    pointMap.set(pid, { pid, x, y, z });
  }

  return {
    points: Array.from(pointMap.values()),
    pointMap,
    invalidPointRows,
    duplicatePIDs,
  };
}

function parseTriangles(
  triangleRows: CsvRow[],
  pointMap: Map<number, Point3D>,
): {
  triangles: Triangle[];
  invalidTriangleRows: number;
  invalidPIDs: number;
} {
  const triangles: Triangle[] = [];
  const seenTriangles = new Set<string>();
  let invalidTriangleRows = 0;
  let invalidPIDs = 0;

  for (const row of triangleRows) {
    const id = readNumber(
      readField(row, ['TRIANGLE', 'TRIANGLE_ID', 'GLOBAL_TRIANGLE_ID']),
    );
    const pid1 = readNumber(readField(row, ['PID1', 'POINT1']));
    const pid2 = readNumber(readField(row, ['PID2', 'POINT2']));
    const pid3 = readNumber(readField(row, ['PID3', 'POINT3']));

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

    triangles.push({
      id,
      pid1,
      pid2,
      pid3,
      layer: readField(row, ['LAYERS', 'LAYER']) || undefined,
      pitName: readField(row, ['Pit', 'PIT', 'PIT_NAME']) || undefined,
    });
  }

  return { triangles, invalidTriangleRows, invalidPIDs };
}

async function parseGeometrySurface(
  entry: GeometryManifestEntry,
  manifest: DatamineGeometryManifest,
): Promise<PhaseGeometryData> {
  const [pointRows, triangleRows] = await Promise.all([
    fetchCsv(entry.pointsFile),
    fetchCsv(entry.trianglesFile),
  ]);

  const pointResult = parsePoints(pointRows);
  const triangleResult = parseTriangles(triangleRows, pointResult.pointMap);
  const points = pointResult.points;
  const validTriangles = triangleResult.triangles;

  if (points.length === 0) {
    throw new Error(`${entry.name}: el archivo de puntos no contiene coordenadas válidas.`);
  }
  if (validTriangles.length === 0) {
    throw new Error(`${entry.name}: el archivo de triángulos no contiene conectividad válida.`);
  }

  const expectedPoints = entry.expectedPoints;
  const expectedTriangles = entry.expectedTriangles;
  const messages = [
    `${entry.name}: ${points.length.toLocaleString('en-US')} puntos válidos cargados.`,
    `${entry.name}: ${validTriangles.length.toLocaleString('en-US')} triángulos válidos cargados.`,
    `${entry.name}: ${triangleResult.invalidPIDs.toLocaleString('en-US')} triángulos con referencias PID inexistentes.`,
  ];

  if (pointResult.invalidPointRows > 0) {
    messages.push(`${entry.name}: ${pointResult.invalidPointRows} filas de puntos fueron descartadas.`);
  }
  if (triangleResult.invalidTriangleRows > 0) {
    messages.push(`${entry.name}: ${triangleResult.invalidTriangleRows} filas de triángulos fueron descartadas.`);
  }
  if (pointResult.duplicatePIDs > 0) {
    messages.push(`${entry.name}: ${pointResult.duplicatePIDs} PID duplicados fueron reemplazados.`);
  }
  if (expectedPoints !== undefined && points.length !== expectedPoints) {
    messages.push(`${entry.name}: se esperaban ${expectedPoints.toLocaleString('en-US')} puntos.`);
  }
  if (expectedTriangles !== undefined && validTriangles.length !== expectedTriangles) {
    messages.push(`${entry.name}: se esperaban ${expectedTriangles.toLocaleString('en-US')} triángulos.`);
  }

  const hasWarnings =
    pointResult.invalidPointRows > 0 ||
    triangleResult.invalidTriangleRows > 0 ||
    triangleResult.invalidPIDs > 0 ||
    pointResult.duplicatePIDs > 0 ||
    (expectedPoints !== undefined && points.length !== expectedPoints) ||
    (expectedTriangles !== undefined && validTriangles.length !== expectedTriangles);

  return {
    points,
    triangles: {
      topography: entry.type === 'topography' ? validTriangles : [],
      pit: entry.type === 'pit' ? validTriangles : [],
    },
    cutStrings: [],
    validation: {
      status: hasWarnings ? 'warning' : 'valid',
      messages,
      stats: {
        totalPoints: points.length,
        totalTriangles: validTriangles.length,
        totalStrings: 0,
        totalStringPoints: 0,
        topographyTriangles: entry.type === 'topography' ? validTriangles.length : 0,
        pitTriangles: entry.type === 'pit' ? validTriangles.length : 0,
        invalidPIDs: triangleResult.invalidPIDs,
        invalidPointRows: pointResult.invalidPointRows,
        invalidTriangleRows: triangleResult.invalidTriangleRows,
        duplicatePIDs: pointResult.duplicatePIDs,
      },
    },
    bounds: calculateBounds(points),
    dataSource: {
      type: 'REAL_DATAMINE',
      files: [entry.pointsFile, entry.trianglesFile],
      missingFiles: [],
      manifestFile: MANIFEST_FILE,
      geometryId: entry.id,
      geometryName: entry.name,
      geometryType: entry.type,
      phase: entry.phase,
      coordinateSystem: manifest.coordinateSystem,
      units: manifest.units,
    },
  };
}

export async function parseDatamineGeometryCatalog(
  manifestPath = MANIFEST_FILE,
): Promise<DatamineGeometryCatalog> {
  const manifest = await fetchManifest(manifestPath);
  const enabledTopography =
    manifest.topography && manifest.topography.enabled !== false
      ? manifest.topography
      : null;
  const enabledPhases = manifest.phases
    .filter((entry) => entry.enabled !== false)
    .sort((left, right) => (left.phase ?? 0) - (right.phase ?? 0));

  const phases: Record<number, PhaseGeometryData> = {};
  let topography: PhaseGeometryData | null = null;
  const messages: string[] = [];
  const missingFiles: string[] = [];
  let loadedSurfaces = 0;
  let failedSurfaces = 0;

  const loadEntry = async (entry: GeometryManifestEntry) => {
    try {
      const geometry = await parseGeometrySurface(entry, manifest);
      loadedSurfaces += 1;
      messages.push(...geometry.validation.messages);
      if (entry.type === 'topography') topography = geometry;
      else phases[entry.phase as number] = geometry;
    } catch (error) {
      failedSurfaces += 1;
      missingFiles.push(entry.pointsFile, entry.trianglesFile);
      messages.push(
        error instanceof Error
          ? error.message
          : `No se pudo cargar la superficie ${entry.name}.`,
      );
    }
  };

  await Promise.all([
    ...(enabledTopography ? [loadEntry(enabledTopography)] : []),
    ...enabledPhases.map(loadEntry),
  ]);

  const availablePhases = Object.keys(phases)
    .map(Number)
    .sort((left, right) => left - right);

  if (loadedSurfaces === 0) {
    throw new Error(
      `El manifiesto ${decodeURIComponent(manifestPath)} no produjo ninguna superficie Datamine válida. ${messages.join(' ')}`,
    );
  }

  if (!topography) {
    messages.push('La topografía independiente todavía no está declarada o disponible.');
  }
  if (availablePhases.length < 6) {
    messages.push(
      `Fases disponibles: ${availablePhases.map((phase) => `F${phase}`).join(', ') || 'ninguna'}. Las fases restantes se incorporarán como pares _pt/_tr separados.`,
    );
  }

  return {
    manifest,
    topography,
    phases,
    availablePhases,
    validation: {
      status: failedSurfaces > 0 ? 'warning' : 'valid',
      messages,
      loadedSurfaces,
      failedSurfaces,
      missingFiles: Array.from(new Set(missingFiles)),
    },
  };
}

export async function parsePhaseGeometry(
  phase: number,
): Promise<PhaseGeometryData> {
  const catalog = await parseDatamineGeometryCatalog();
  const geometry = catalog.phases[phase];
  if (!geometry) {
    throw new Error(
      `La fase F${phase} no está disponible. Fases cargadas: ${catalog.availablePhases.map((value) => `F${value}`).join(', ') || 'ninguna'}.`,
    );
  }
  return geometry;
}

export async function parsePhase6Geometry(): Promise<PhaseGeometryData> {
  const catalog = await parseDatamineGeometryCatalog();
  const phase6 = catalog.phases[6];
  if (phase6) return phase6;

  const fallbackPhase = catalog.availablePhases.at(-1);
  if (fallbackPhase === undefined) {
    throw new Error('No existe ninguna fase Datamine disponible para el visor.');
  }

  const fallback = catalog.phases[fallbackPhase];
  fallback.validation.messages.push(
    `F6 no está disponible; el visor utilizó temporalmente F${fallbackPhase}.`,
  );
  fallback.validation.status = 'warning';
  return fallback;
}

// Baseline exports retained for the Stage 0 audit and current F6 dataset.
export { EXPECTED_POINT_COUNT, EXPECTED_TRIANGLE_COUNT, MANIFEST_FILE };
