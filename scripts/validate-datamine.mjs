import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

const manifestPath = resolve('public/data/datamine/geometry-manifest.json');
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`ERROR: ${message}`);
}

function parseCsvLine(line) {
  const values = [];
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

async function readCsv(path) {
  const rows = [];
  const stream = createReadStream(path, { encoding: 'utf8' });
  const reader = createInterface({ input: stream, crlfDelay: Infinity });
  let headers = null;

  for await (const rawLine of reader) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (!line.trim()) continue;
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }

    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

function readField(row, aliases) {
  for (const alias of aliases) {
    if (row[alias] !== undefined) return row[alias];
  }
  return undefined;
}

function localPath(publicPath) {
  return resolve('public', publicPath.replace(/^\//, ''));
}

function validateManifest(manifest) {
  if (!Number.isInteger(manifest.version) || manifest.version < 1) {
    fail('El manifiesto debe declarar una versión entera mayor o igual que 1.');
  }
  if (!Array.isArray(manifest.phases)) {
    fail('El manifiesto debe declarar phases como arreglo.');
    return;
  }

  const ids = new Set();
  const phases = new Set();
  const entries = [
    ...(manifest.topography ? [manifest.topography] : []),
    ...manifest.phases,
  ];

  for (const entry of entries) {
    if (!entry.id || !entry.name || !entry.pointsFile || !entry.trianglesFile) {
      fail('Cada superficie debe declarar id, name, pointsFile y trianglesFile.');
      continue;
    }
    if (ids.has(entry.id)) fail(`Geometry id duplicado: ${entry.id}`);
    ids.add(entry.id);

    if (entry.type === 'pit') {
      if (!Number.isInteger(entry.phase) || entry.phase < 1) {
        fail(`${entry.id}: phase debe ser un entero mayor que cero.`);
      } else if (phases.has(entry.phase)) {
        fail(`Fase duplicada: F${entry.phase}`);
      } else {
        phases.add(entry.phase);
      }
    }
  }
}

async function validateSurface(entry) {
  const pointsPath = localPath(entry.pointsFile);
  const trianglesPath = localPath(entry.trianglesFile);

  if (!existsSync(pointsPath)) {
    fail(`${entry.id}: no existe ${pointsPath}`);
    return null;
  }
  if (!existsSync(trianglesPath)) {
    fail(`${entry.id}: no existe ${trianglesPath}`);
    return null;
  }

  const [pointRows, triangleRows] = await Promise.all([
    readCsv(pointsPath),
    readCsv(trianglesPath),
  ]);

  const pointIds = new Set();
  let duplicatePids = 0;
  let invalidPointRows = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const row of pointRows) {
    const pid = Number(readField(row, ['PID', 'POINT_ID', 'GLOBAL_PID']));
    const x = Number(readField(row, ['XP', 'X', 'EASTING']));
    const y = Number(readField(row, ['YP', 'Y', 'NORTHING']));
    const z = Number(readField(row, ['ZP', 'Z', 'ELEVATION', 'RL']));

    if (![pid, x, y, z].every(Number.isFinite)) {
      invalidPointRows += 1;
      continue;
    }

    if (pointIds.has(pid)) duplicatePids += 1;
    pointIds.add(pid);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  let validTriangles = 0;
  let invalidPidTriangles = 0;
  let invalidTriangleRows = 0;

  for (const row of triangleRows) {
    const triangleId = Number(
      readField(row, ['TRIANGLE', 'TRIANGLE_ID', 'GLOBAL_TRIANGLE_ID']),
    );
    const ids = [
      Number(readField(row, ['PID1', 'POINT1'])),
      Number(readField(row, ['PID2', 'POINT2'])),
      Number(readField(row, ['PID3', 'POINT3'])),
    ];

    if (!Number.isFinite(triangleId) || !ids.every(Number.isFinite)) {
      invalidTriangleRows += 1;
      continue;
    }

    if (ids.every((pid) => pointIds.has(pid))) validTriangles += 1;
    else invalidPidTriangles += 1;
  }

  const result = {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    phase: entry.phase ?? null,
    files: {
      points: entry.pointsFile,
      triangles: entry.trianglesFile,
    },
    points: pointIds.size,
    pointRows: pointRows.length,
    duplicatePids,
    invalidPointRows,
    triangles: validTriangles,
    triangleRows: triangleRows.length,
    invalidPidTriangles,
    invalidTriangleRows,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ },
  };

  if (entry.expectedPoints !== undefined && pointIds.size !== entry.expectedPoints) {
    fail(`${entry.id}: se esperaban ${entry.expectedPoints} puntos y se encontraron ${pointIds.size}.`);
  }
  if (
    entry.expectedTriangles !== undefined &&
    validTriangles !== entry.expectedTriangles
  ) {
    fail(`${entry.id}: se esperaban ${entry.expectedTriangles} triángulos y se encontraron ${validTriangles}.`);
  }
  if (invalidPidTriangles !== 0) {
    fail(`${entry.id}: se encontraron ${invalidPidTriangles} triángulos con PID inexistentes.`);
  }

  return result;
}

if (!existsSync(manifestPath)) {
  fail(`No existe ${manifestPath}`);
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  validateManifest(manifest);

  const entries = [
    ...(manifest.topography && manifest.topography.enabled !== false
      ? [manifest.topography]
      : []),
    ...manifest.phases.filter((entry) => entry.enabled !== false),
  ];
  const surfaces = (
    await Promise.all(entries.map((entry) => validateSurface(entry)))
  ).filter(Boolean);
  const availablePhases = surfaces
    .filter((surface) => surface.type === 'pit')
    .map((surface) => surface.phase)
    .sort((left, right) => left - right);

  const summary = {
    manifest: 'public/data/datamine/geometry-manifest.json',
    version: manifest.version,
    coordinateSystem: manifest.coordinateSystem,
    units: manifest.units,
    loadedSurfaces: surfaces.length,
    availablePhases,
    topographyAvailable: surfaces.some(
      (surface) => surface.type === 'topography',
    ),
    totals: {
      points: surfaces.reduce((sum, surface) => sum + surface.points, 0),
      triangles: surfaces.reduce((sum, surface) => sum + surface.triangles, 0),
      invalidPidTriangles: surfaces.reduce(
        (sum, surface) => sum + surface.invalidPidTriangles,
        0,
      ),
    },
    surfaces,
    status: failures.length === 0 ? 'PASS' : 'FAIL',
  };

  console.log(JSON.stringify(summary, null, 2));
}

if (failures.length > 0) process.exitCode = 1;
