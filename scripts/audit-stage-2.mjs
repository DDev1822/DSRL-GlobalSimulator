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

const app = read('src/App.tsx');
const deck = read('src/components/EconomicControlDeck.tsx');
const curve = read('src/components/EconomicCurve.tsx');

requireToken(app, "import EconomicControlDeck", 'Control Deck conectado en App');
requireToken(app, 'useState<EconomicInputs>', 'estado económico tipado');
requireToken(app, 'calculateOptimization(economicInputs)', 'motor conectado al contrato nativo');
requireToken(app, 'ECONOMIC_STORAGE_KEY', 'clave de persistencia versionada');
requireToken(app, 'window.localStorage.setItem', 'guardado local del escenario');
requireToken(app, 'window.localStorage.removeItem', 'restablecimiento del escenario');
requireToken(app, 'DEFAULT_ECONOMIC_INPUTS', 'restablecimiento a valores base');
requireToken(app, 'onChange={changeEconomicInput}', 'cambios del drawer conectados');
requireToken(app, 'onSave={saveScenario}', 'acción Guardar conectada');
requireToken(app, 'onReset={resetScenario}', 'acción Restablecer conectada');

forbidToken(app, 'const [discountRate', 'estado heredado discountRate');
forbidToken(app, 'const [millCapacity', 'estado heredado millCapacity');
forbidToken(app, 'const [mineCapacity', 'estado heredado mineCapacity');

const expectedParameters = [
  'metalPriceUsdPerTonne',
  'maxResourceMt',
  'wacc',
  'annualProductionMt',
  'stripRatio',
  'miningCostUsdPerTonneMoved',
  'processingCostUsdPerTonneOre',
  'baseGradePercent',
];

for (const parameter of expectedParameters) {
  requireToken(deck, `key: '${parameter}'`, `Control editable: ${parameter}`);
}

requireToken(deck, 'type="number"', 'entrada numérica directa');
requireToken(deck, 'type="range"', 'slider por parámetro');
requireToken(deck, 'la ley de corte se calcula automáticamente', 'cut-off identificado como resultado');
requireToken(deck, 'onSave', 'botón Guardar');
requireToken(deck, 'onReset', 'botón Restablecer');
requireToken(deck, 'onClose', 'drawer cerrable');

requireToken(curve, 'results.maximumEvaluatedCutoff', 'escala dinámica de cut-off');
requireToken(curve, 'results.inputs.baseGradePercent', 'escala dinámica de ley');
requireToken(curve, 'results.dataPoints.map((point) => point.tonnage)', 'escala dinámica de tonelaje');
forbidToken(curve, 'const MAX_TONNAGE', 'tonelaje máximo gráfico fijo');
forbidToken(curve, 'const MAX_GRADE', 'ley máxima gráfica fija');
forbidToken(curve, 'const MAX_CUTOFF', 'cut-off máximo gráfico fijo');

console.log('\nSTAGE 2 AUDIT SUMMARY');
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
