import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

const pointsPath = resolve('public/data/Design Pit_pt.csv');
const trianglesPath = resolve('public/data/Design Pit_tr.csv');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

async function readCsv(path) {
  const rows = [];
  const stream = createReadStream(path, { encoding: 'utf8' });
  const reader = createInterface({ input: stream, crlfDelay: Infinity });
  let headers = null;

  for await (const line of reader) {
    if (!line.trim()) continue;
    if (!headers) {
      headers = line.split(',').map((value) => value.trim());
      continue;
    }

    const values = line.split(',').map((value) => value.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

if (!existsSync(pointsPath)) fail(`No existe ${pointsPath}`);
if (!existsSync(trianglesPath)) fail(`No existe ${trianglesPath}`);

if (process.exitCode !== 1) {
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
    const pid = Number(row.PID);
    const x = Number(row.XP);
    const y = Number(row.YP);
    const z = Number(row.ZP);

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
    const ids = [Number(row.PID1), Number(row.PID2), Number(row.PID3)];
    if (!ids.every(Number.isFinite)) {
      invalidTriangleRows += 1;
      continue;
    }

    if (ids.every((pid) => pointIds.has(pid))) validTriangles += 1;
    else invalidPidTriangles += 1;
  }

  console.log(JSON.stringify({
    points: pointIds.size,
    pointRows: pointRows.length,
    duplicatePids,
    invalidPointRows,
    triangles: validTriangles,
    triangleRows: triangleRows.length,
    invalidPidTriangles,
    invalidTriangleRows,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ },
  }, null, 2));

  if (pointIds.size !== 7995) fail(`Se esperaban 7995 puntos y se encontraron ${pointIds.size}`);
  if (validTriangles !== 15683) fail(`Se esperaban 15683 triángulos y se encontraron ${validTriangles}`);
  if (invalidPidTriangles !== 0) fail(`Se encontraron ${invalidPidTriangles} triángulos con PID inexistentes`);
}
