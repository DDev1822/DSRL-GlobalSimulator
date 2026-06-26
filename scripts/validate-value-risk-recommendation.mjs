import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync('src/engine/valueRiskRecommendation.ts', 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
const { recommendOptimalPhase } = await import(moduleUrl);

const snapshots = [
  { phase: 1, geometryId: 'PIT_F1', benchCount: 2, triangleCount: 100, surfaceAreaHa: 10, minElevationM: 100, maxElevationM: 120, resourceMt: 20, gradePercent: 0.9, stripRatio: 1.0, npvUsdM: 100 },
  { phase: 2, geometryId: 'PIT_F2', benchCount: 4, triangleCount: 150, surfaceAreaHa: 15, minElevationM: 80, maxElevationM: 120, resourceMt: 40, gradePercent: 0.8, stripRatio: 1.3, npvUsdM: 170 },
  { phase: 3, geometryId: 'PIT_F3', benchCount: 6, triangleCount: 200, surfaceAreaHa: 22, minElevationM: 60, maxElevationM: 120, resourceMt: 60, gradePercent: 0.7, stripRatio: 1.7, npvUsdM: 250 },
  { phase: 4, geometryId: 'PIT_F4', benchCount: 7, triangleCount: 220, surfaceAreaHa: 25, minElevationM: 50, maxElevationM: 120, resourceMt: 35, gradePercent: 0.75, stripRatio: 1.8, npvUsdM: 160 },
];

const conservative = recommendOptimalPhase(snapshots, 'conservative');
const balanced = recommendOptimalPhase(snapshots, 'balanced');
const aggressive = recommendOptimalPhase(snapshots, 'aggressive');
const failures = [];
const pass = (condition, message) => {
  if (condition) console.log(`PASS: ${message}`);
  else {
    failures.push(message);
    console.error(`FAIL: ${message}`);
  }
};

pass(conservative.recommended.phase === 1, 'perfil conservador prioriza la fase de menor exposición');
pass(balanced.recommended.phase === 2, 'perfil balanceado selecciona el punto rodilla');
pass(aggressive.recommended.phase === 3, 'perfil agresivo prioriza la fase de mayor valor eficiente');
pass(new Set([
  conservative.recommended.phase,
  balanced.recommended.phase,
  aggressive.recommended.phase,
]).size === 3, 'los tres perfiles producen decisiones diferenciadas');
pass(balanced.recommended.recommendationScore >= balanced.runnerUp.recommendationScore, 'ranking balanceado ordenado por puntaje');
pass(conservative.scores.every((score) => score.valueScore >= 0 && score.valueScore <= 100), 'puntajes de valor acotados');
pass(conservative.scores.every((score) => score.riskScore >= 0 && score.riskScore <= 100), 'puntajes de riesgo acotados');
pass(!conservative.frontier.some((score) => score.phase === 4), 'fase dominada excluida de la frontera');
pass(conservative.frontier.length >= 2, 'frontera contiene alternativas no dominadas');
pass([conservative, balanced, aggressive].every((result) => result.recommended.isEfficientFrontier), 'toda recomendación pertenece a la frontera eficiente');
pass(conservative.riskQuality === 'relative-screening-not-geotechnical', 'riesgo identificado como screening relativo');
pass(conservative.cautions.length >= 3, 'recomendación incluye advertencias técnicas');

console.log('\nVALUE-RISK RECOMMENDATION VALIDATION');
console.log(JSON.stringify({
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  conservative: conservative.recommended.phase,
  balanced: balanced.recommended.phase,
  aggressive: aggressive.recommended.phase,
  frontier: conservative.frontier.map((score) => score.phase),
  failures,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
