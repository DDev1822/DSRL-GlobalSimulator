import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const failures = [];
const passes = [];

function pass(message) {
  passes.push(message);
  console.log(`PASS: ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`FAIL: ${message}`);
}

function read(path) {
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) {
    fail(`Falta ${path}`);
    return '';
  }
  return readFileSync(absolutePath, 'utf8');
}

function requireToken(source, token, label) {
  if (source.includes(token)) pass(label);
  else fail(`Falta ${label}`);
}

function forbidToken(source, token, label) {
  if (source.includes(token)) fail(`Persiste ${label}`);
  else pass(`Sin ${label}`);
}

const manifestSource = read('public/data/datamine/geometry-manifest.json');
const parser = read('src/utils/datamineParser.ts');
const validator = read('scripts/validate-datamine.mjs');
const workspace = read('src/components/PitWorkspace.tsx');

if (manifestSource) {
  const manifest = JSON.parse(manifestSource);
  if (manifest.version === 1) pass('Manifiesto versionado');
  else fail('El manifiesto debe usar version 1');

  if (Array.isArray(manifest.phases)) pass('Manifiesto con arreglo de fases');
  else fail('El manifiesto no declara phases');

  const phase6 = manifest.phases?.find((entry) => entry.phase === 6);
  if (phase6?.pointsFile && phase6?.trianglesFile) {
    pass('F6 declarado como par independiente _pt/_tr');
  } else {
    fail('F6 no está declarado con pointsFile y trianglesFile');
  }

  if (manifest.topography === null) {
    pass('Topografía ausente declarada explícitamente');
  } else if (manifest.topography?.pointsFile && manifest.topography?.trianglesFile) {
    pass('Topografía declarada como par independiente _pt/_tr');
  } else {
    fail('La topografía debe ser null o declarar su par _pt/_tr');
  }
}

requireToken(parser, 'DatamineGeometryManifest', 'Contrato tipado de manifiesto');
requireToken(parser, 'GeometryManifestEntry', 'Contrato tipado por superficie');
requireToken(parser, 'DatamineGeometryCatalog', 'Catálogo geométrico en memoria');
requireToken(parser, 'parseDatamineGeometryCatalog', 'Carga de catálogo multi-superficie');
requireToken(parser, 'parseGeometrySurface', 'Parser genérico por superficie');
requireToken(parser, 'parsePhaseGeometry', 'Carga directa por número de fase');
requireToken(parser, 'parsePhase6Geometry', 'Compatibilidad con visor F6');
requireToken(parser, 'Promise.all', 'Carga concurrente de superficies');
requireToken(parser, "['PID', 'POINT_ID', 'GLOBAL_PID']", 'Alias de PID');
requireToken(parser, "['XP', 'X', 'EASTING']", 'Alias de coordenada X');
requireToken(parser, "['YP', 'Y', 'NORTHING']", 'Alias de coordenada Y');
requireToken(parser, "['ZP', 'Z', 'ELEVATION', 'RL']", 'Alias de coordenada Z');
requireToken(parser, 'availablePhases', 'Inventario de fases disponibles');
requireToken(parser, 'missingFiles', 'Trazabilidad de archivos faltantes');
forbidToken(parser, 'const POINTS_FILE =', 'ruta fija única de puntos');
forbidToken(parser, 'const TRIANGLES_FILE =', 'ruta fija única de triángulos');

requireToken(validator, 'geometry-manifest.json', 'Validador guiado por manifiesto');
requireToken(validator, 'validateSurface', 'Validación independiente por superficie');
requireToken(validator, 'availablePhases', 'Reporte de fases disponibles');
requireToken(validator, 'topographyAvailable', 'Reporte de topografía');
requireToken(validator, 'invalidPidTriangles', 'Control de conectividad PID');

requireToken(workspace, 'geometry.dataSource.geometryName', 'Nombre de superficie visible');
requireToken(workspace, 'geometry.dataSource.geometryId', 'ID de superficie visible');
requireToken(workspace, 'geometry.dataSource.phase', 'Fase real visible');
requireToken(workspace, 'archivos _pt y _tr se conservan separados', 'Mensaje de arquitectura separada');

console.log('\nSTAGE 3 AUDIT SUMMARY');
console.log(
  JSON.stringify(
    {
      status: failures.length === 0 ? 'PASS' : 'FAIL',
      passedChecks: passes.length,
      failedChecks: failures.length,
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exitCode = 1;
