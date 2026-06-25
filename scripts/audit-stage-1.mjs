import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/engine/economicModel.ts'), 'utf8');
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

function requireToken(token, label = token) {
  if (source.includes(token)) pass(label);
  else fail(`Falta ${label}`);
}

function forbidToken(token, label = token) {
  if (source.includes(token)) fail(`Persiste ${label}`);
  else pass(`Sin ${label}`);
}

const requiredInputs = [
  'metalPriceUsdPerTonne',
  'maxResourceMt',
  'wacc',
  'annualProductionMt',
  'stripRatio',
  'miningCostUsdPerTonneMoved',
  'processingCostUsdPerTonneOre',
  'baseGradePercent',
  'mineRecovery',
  'plantRecovery',
  'initialCapexUsdM',
  'sustainingCapexUsdMPerYear',
  'payableFactor',
  'royaltyRate',
  'taxRate',
  'cutoffStepPercent',
  'resourceCurveExponent',
  'gradeResponseExponent',
  'maxCutoffMultiplier',
];

for (const input of requiredInputs) {
  requireToken(`${input}: number`, `Entrada parametrizable: ${input}`);
}

requireToken('DEFAULT_ECONOMIC_INPUTS', 'Escenario económico base explícito');
requireToken('validateEconomicInputs', 'Validación económica');
requireToken('EconomicModelError', 'Error económico trazable');
requireToken('normalizeEconomicInputs', 'Normalización de contrato heredado');
requireToken('LegacyEconomicInputs', 'Compatibilidad temporal con dashboard');
requireToken('annualCashflows', 'Flujos anuales trazables');
requireToken('totalRevenue', 'Ingresos acumulados');
requireToken('totalOperatingCost', 'Costos operativos acumulados');
requireToken('totalTax', 'Impuestos acumulados');
requireToken('rawNpv', 'VAN económico sin truncar');
requireToken('optimalCutoff', 'Ley de corte óptima calculada');
requireToken('breakeven', 'Ley de corte de equilibrio calculada');
requireToken('calculateIRR', 'TIR calculada');

forbidToken('const COPPER_PRICE', 'precio fijo heredado');
forbidToken('const MAX_TONNAGE', 'recurso máximo fijo heredado');
forbidToken('const MAX_GRADE', 'ley máxima fija heredada');
forbidToken('const TAX_RATE', 'impuesto fijo heredado');
forbidToken('const NET_PAYABLE', 'factor pagable fijo heredado');

console.log('\nSTAGE 1 AUDIT SUMMARY');
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
