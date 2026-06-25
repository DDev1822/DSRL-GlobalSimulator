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
    fail(`No existe ${path}`);
    return '';
  }
  return readFileSync(absolutePath, 'utf8');
}

function requireFile(path) {
  if (existsSync(resolve(path))) pass(`Archivo requerido: ${path}`);
  else fail(`Falta archivo requerido: ${path}`);
}

function requireText(path, source, token, label = token) {
  if (source.includes(token)) pass(`${path}: ${label}`);
  else fail(`${path}: falta ${label}`);
}

function forbidText(path, source, token, label = token) {
  if (source.includes(token)) fail(`${path}: persiste ${label}`);
  else pass(`${path}: sin ${label}`);
}

const requiredFiles = [
  'src/App.tsx',
  'src/main.tsx',
  'src/components/EconomicCurve.tsx',
  'src/components/PitWorkspace.tsx',
  'src/components/DataminePhaseViewer.tsx',
  'src/engine/economicModel.ts',
  'src/utils/datamineParser.ts',
  'scripts/validate-datamine.mjs',
  'public/data/Design Pit_pt.csv',
  'public/data/Design Pit_tr.csv',
  'package.json',
  'tsconfig.json',
];

for (const path of requiredFiles) requireFile(path);

const packageJsonSource = read('package.json');
const packageJson = packageJsonSource ? JSON.parse(packageJsonSource) : null;

if (packageJson) {
  const requiredScripts = ['dev', 'build', 'typecheck', 'validate:data'];
  for (const script of requiredScripts) {
    if (packageJson.scripts?.[script]) pass(`package.json: script ${script}`);
    else fail(`package.json: falta script ${script}`);
  }

  const obsoleteScripts = ['restore:app', 'predev', 'prebuild', 'pretypecheck'];
  for (const script of obsoleteScripts) {
    if (packageJson.scripts?.[script]) fail(`package.json: script obsoleto ${script}`);
    else pass(`package.json: sin script obsoleto ${script}`);
  }
}

const appSource = read('src/App.tsx');
requireText('src/App.tsx', appSource, "import EconomicCurve from './components/EconomicCurve';", 'EconomicCurve conectado');
requireText('src/App.tsx', appSource, "import PitWorkspace from './components/PitWorkspace';", 'PitWorkspace conectado');
requireText('src/App.tsx', appSource, "import { calculateOptimization } from './engine/economicModel';", 'motor económico conectado');
requireText('src/App.tsx', appSource, 'parsePhase6Geometry()', 'carga Datamine conectada');
forbidText('src/App.tsx', appSource, 'PitShell', 'PitShell conceptual');
forbidText('src/App.tsx', appSource, 'pitMode', 'selector conceptual/Datamine');
forbidText('src/App.tsx', appSource, 'PIT CONCEPTUAL', 'panel conceptual');
forbidText('src/App.tsx', appSource, './generated/', 'dependencia de fuente generada');

const curveSource = read('src/components/EconomicCurve.tsx');
requireText('EconomicCurve', curveSource, 'setHoveredPoint', 'estado de seguimiento del cursor');
requireText('EconomicCurve', curveSource, 'onMouseMove={handleMove}', 'evento de movimiento');
requireText('EconomicCurve', curveSource, 'onMouseLeave={() => setHoveredPoint(null)}', 'restablecimiento al salir');
requireText('EconomicCurve', curveSource, 'Tonelaje', 'lectura de tonelaje');
requireText('EconomicCurve', curveSource, 'Ley media', 'lectura de ley');
requireText('EconomicCurve', curveSource, 'VAN', 'lectura de VAN');
requireText('EconomicCurve', curveSource, 'TIR', 'lectura de TIR');
requireText('EconomicCurve', curveSource, 'LOM', 'lectura de vida de mina');

const pitSource = read('src/components/PitWorkspace.tsx');
requireText('PitWorkspace', pitSource, 'setPhaseStep', 'control de fase');
requireText('PitWorkspace', pitSource, 'setPlaying', 'play/pausa');
requireText('PitWorkspace', pitSource, 'setSpeed', 'velocidad de secuencia');
requireText('PitWorkspace', pitSource, 'type="range"', 'barra de evolución');
requireText('PitWorkspace', pitSource, 'onTriangleHover={setHovered}', 'lectura lateral del cursor');
requireText('PitWorkspace', pitSource, 'VAN acumulado', 'economía acumulada');
requireText('PitWorkspace', pitSource, 'VAN incremental', 'economía incremental');

const viewerSource = read('src/components/DataminePhaseViewer.tsx');
const expectedLayers = [
  'component',
  'phase',
  'elevation',
  'van_cumulative',
  'van_incremental',
  'reserves',
  'grade',
  'strip_ratio',
];
for (const layer of expectedLayers) {
  requireText('DataminePhaseViewer', viewerSource, `'${layer}'`, `capa ${layer}`);
}
requireText('DataminePhaseViewer', viewerSource, '<OrbitControls', 'órbita y zoom');
requireText('DataminePhaseViewer', viewerSource, 'wireframe={wireframe}', 'wireframe');

const modelSource = read('src/engine/economicModel.ts');
requireText('economicModel', modelSource, 'export function calculateOptimization', 'función de optimización');
requireText('economicModel', modelSource, 'optimalCutoff', 'ley de corte óptima');
requireText('economicModel', modelSource, 'maxVAN', 'VAN máximo');
requireText('economicModel', modelSource, 'calculateIRR', 'TIR');

const parserSource = read('src/utils/datamineParser.ts');
requireText('datamineParser', parserSource, 'EXPECTED_POINT_COUNT = 7_995', 'conteo esperado de puntos');
requireText('datamineParser', parserSource, 'EXPECTED_TRIANGLE_COUNT = 15_683', 'conteo esperado de triángulos');
requireText('datamineParser', parserSource, 'invalidPIDs', 'validación PID');

const summary = {
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  passedChecks: passes.length,
  failedChecks: failures.length,
  failures,
};

console.log('\nBASELINE AUDIT SUMMARY');
console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) process.exitCode = 1;
