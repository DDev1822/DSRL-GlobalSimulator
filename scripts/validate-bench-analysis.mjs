import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync('src/engine/benchAnalysis.ts', 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const { analyzeBenches, findBenchByElevation } = await import(moduleUrl);

const geometry = {
  points: [
    { pid: 1, x: 0, y: 0, z: 100 },
    { pid: 2, x: 10, y: 0, z: 100 },
    { pid: 3, x: 0, y: 10, z: 100 },
    { pid: 4, x: 0, y: 0, z: 88 },
    { pid: 5, x: 10, y: 0, z: 88 },
    { pid: 6, x: 0, y: 10, z: 88 },
  ],
  triangles: {
    topography: [],
    pit: [
      { id: 1, pid1: 1, pid2: 2, pid3: 3 },
      { id: 2, pid1: 4, pid2: 5, pid3: 6 },
    ],
  },
  cutStrings: [],
  validation: { status: 'valid', messages: [], stats: {} },
  bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10, minZ: 88, maxZ: 100 },
  dataSource: { type: 'REAL_DATAMINE', files: [], missingFiles: [] },
};

const context = {
  phaseResourceMt: 120,
  phaseNpvUsdM: 900,
  phaseGradePercent: 0.65,
  phaseStripRatio: 1.5,
};

const result = analyzeBenches(geometry, 10, context);
const failures = [];
const pass = (condition, message) => {
  if (condition) console.log(`PASS: ${message}`);
  else {
    failures.push(message);
    console.error(`FAIL: ${message}`);
  }
};
const close = (left, right, tolerance = 1e-6) =>
  Math.abs(left - right) <= tolerance;

pass(result.benches.length === 2, 'agrupa triángulos en dos bancos');
pass(result.benches.every((bench) => bench.surfaceAreaM2 > 0), 'calcula área superficial positiva');
pass(close(result.benches.reduce((sum, bench) => sum + bench.resourceEstimateMt, 0), 120), 'conserva recurso de fase');
pass(close(result.benches.at(-1).cumulativeResourceEstimateMt, 120), 'recurso acumulado cierra en el total');
pass(close(result.benches.reduce((sum, bench) => sum + bench.incrementalNpvUsdM, 0), 900), 'conserva VAN de fase');
pass(close(result.benches.at(-1).cumulativeNpvUsdM, 900), 'VAN acumulado cierra en el total');
pass(findBenchByElevation(result, 88)?.id === 'B-80', 'selecciona banco por elevación');
pass(result.volumeStatus === 'requires-closed-solids-or-block-model', 'no declara volumen validado desde superficie abierta');

console.log('\nBENCH ANALYSIS VALIDATION');
console.log(JSON.stringify({
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  benches: result.benches.length,
  totalAreaM2: result.totalSurfaceAreaM2,
  failures,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
