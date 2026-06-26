import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync('src/engine/phaseComparison.ts', 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
const { buildPhaseComparison, comparePhasePair } = await import(moduleUrl);

const snapshots = [
  { phase: 1, geometryId: 'PIT_F1', benchCount: 4, triangleCount: 100, surfaceAreaHa: 10, minElevationM: 100, maxElevationM: 140, resourceMt: 20, gradePercent: 0.8, stripRatio: 1.1, npvUsdM: 100 },
  { phase: 2, geometryId: 'PIT_F2', benchCount: 6, triangleCount: 140, surfaceAreaHa: 14, minElevationM: 80, maxElevationM: 140, resourceMt: 35, gradePercent: 0.76, stripRatio: 1.25, npvUsdM: 170 },
  { phase: 3, geometryId: 'PIT_F3', benchCount: 8, triangleCount: 180, surfaceAreaHa: 18, minElevationM: 60, maxElevationM: 140, resourceMt: 52, gradePercent: 0.72, stripRatio: 1.4, npvUsdM: 240 },
];

const result = buildPhaseComparison(snapshots);
const pair = comparePhasePair(result, 1, 3);
const failures = [];
const pass = (condition, message) => {
  if (condition) console.log(`PASS: ${message}`);
  else { failures.push(message); console.error(`FAIL: ${message}`); }
};

pass(result.snapshots.length === 3, 'conserva las tres fases');
pass(result.sequentialDeltas.length === 3, 'genera deltas secuenciales');
pass(result.snapshots[0].phase === 1 && result.snapshots[2].phase === 3, 'ordena fases');
pass(pair?.delta.surfaceAreaDeltaHa === 8, 'calcula delta de área');
pass(pair?.delta.benchCountDelta === 4, 'calcula delta de bancos');
pass(pair?.delta.triangleCountDelta === 80, 'calcula delta de triángulos');
pass(pair?.delta.minimumElevationDeltaM === -40, 'calcula profundización');
pass(pair?.delta.resourceDeltaMt === 32, 'calcula delta de recurso');
pass(pair?.delta.npvDeltaUsdM === 140, 'calcula delta de VAN');
pass(result.volumeStatus === 'requires-closed-solids-or-block-model', 'no declara volumen validado');

console.log('\nPHASE COMPARISON VALIDATION');
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', failures }, null, 2));
if (failures.length) process.exitCode = 1;
