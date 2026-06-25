import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const failures = [];
let passedChecks = 0;

function pass(message) {
  passedChecks += 1;
  console.log(`PASS: ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`FAIL: ${message}`);
}

function read(path) {
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) {
    fail(`Falta archivo requerido: ${path}`);
    return '';
  }
  pass(`Archivo requerido: ${path}`);
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

const app = read('src/App.tsx');
read('src/main.tsx');
const curve = read('src/components/EconomicCurve.tsx');
const pit = read('src/components/PitWorkspace.tsx');
const viewer = read('src/components/DataminePhaseViewer.tsx');
const model = read('src/engine/economicModel.ts');
const parser = read('src/utils/datamineParser.ts');
read('scripts/validate-datamine.mjs');
const manifest = read('public/data/datamine/geometry-manifest.json');
const packageSource = read('package.json');
read('tsconfig.json');

if (packageSource) {
  const packageJson = JSON.parse(packageSource);
  for (const script of ['dev', 'build', 'typecheck', 'validate:data']) {
    if (packageJson.scripts?.[script]) pass(`package.json: script ${script}`);
    else fail(`package.json: falta script ${script}`);
  }
  for (const script of ['restore:app', 'predev', 'prebuild', 'pretypecheck']) {
    if (packageJson.scripts?.[script]) fail(`package.json: script obsoleto ${script}`);
    else pass(`package.json: sin script obsoleto ${script}`);
  }
}

requireToken(app, "import EconomicCurve from './components/EconomicCurve';", 'src/App.tsx: EconomicCurve conectado');
requireToken(app, "import PitWorkspace from './components/PitWorkspace';", 'src/App.tsx: PitWorkspace conectado');
requireToken(app, "from './engine/economicModel';", 'src/App.tsx: módulo económico importado');
requireToken(app, 'calculateOptimization(', 'src/App.tsx: motor económico conectado');
requireToken(app, 'parsePhase6Geometry()', 'src/App.tsx: carga Datamine conectada');
forbidToken(app, 'PitShell', 'src/App.tsx: PitShell conceptual');
forbidToken(app, 'pitMode', 'src/App.tsx: selector conceptual/Datamine');
forbidToken(app, 'PIT CONCEPTUAL', 'src/App.tsx: panel conceptual');
forbidToken(app, './generated/', 'src/App.tsx: dependencia de fuente generada');

for (const token of ['setHoveredPoint', 'onMouseMove={handleMove}', 'Tonelaje', 'Ley media', 'VAN', 'TIR', 'LOM']) {
  requireToken(curve, token, `EconomicCurve: ${token}`);
}
for (const token of ['setPhaseStep', 'setPlaying', 'setSpeed', 'type="range"', 'onTriangleHover={setHovered}', 'VAN acumulado', 'VAN incremental']) {
  requireToken(pit, token, `PitWorkspace: ${token}`);
}
for (const layer of ['component', 'phase', 'elevation', 'van_cumulative', 'van_incremental', 'reserves', 'grade', 'strip_ratio']) {
  requireToken(viewer, `'${layer}'`, `DataminePhaseViewer: capa ${layer}`);
}
requireToken(viewer, '<OrbitControls', 'DataminePhaseViewer: órbita y zoom');
requireToken(viewer, 'wireframe={wireframe}', 'DataminePhaseViewer: wireframe');

requireToken(model, 'export function calculateOptimization', 'economicModel: función de optimización');
requireToken(model, 'optimalCutoff', 'economicModel: ley de corte óptima');
requireToken(model, 'maxVAN', 'economicModel: VAN máximo');
requireToken(model, 'calculateIRR', 'economicModel: TIR');

requireToken(parser, 'DatamineGeometryManifest', 'datamineParser: contrato de manifiesto');
requireToken(parser, 'parseDatamineGeometryCatalog', 'datamineParser: catálogo Datamine');
requireToken(parser, 'invalidPIDs', 'datamineParser: validación PID');
requireToken(manifest, '"topography"', 'geometry-manifest: topografía declarada');
requireToken(manifest, '"phases"', 'geometry-manifest: fases declaradas');
forbidToken(manifest, 'Design Pit_pt.csv', 'geometry-manifest: CSV antiguo de puntos');
forbidToken(manifest, 'Design Pit_tr.csv', 'geometry-manifest: CSV antiguo de triángulos');

console.log('\nBASELINE AUDIT SUMMARY');
console.log(JSON.stringify({
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  passedChecks,
  failedChecks: failures.length,
  failures,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
