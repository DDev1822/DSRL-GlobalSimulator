import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(
  new URL('../src/engine/economicModel.ts', import.meta.url),
  'utf8',
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const economicModel = await import(moduleUrl);

const {
  DEFAULT_ECONOMIC_INPUTS,
  EconomicModelError,
  calculateOptimization,
  createEconomicInputs,
} = economicModel;

const results = [];

function assert(condition, message, details = {}) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    console.error(JSON.stringify(details, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: ${message}`);
  results.push(message);
}

const baseline = calculateOptimization(DEFAULT_ECONOMIC_INPUTS);
assert(baseline.validation.valid, 'El escenario base es válido.');
assert(
  Number.isFinite(baseline.maxVAN) && baseline.maxVAN >= 0,
  'El VAN base es finito y no negativo.',
  { maxVAN: baseline.maxVAN },
);
assert(
  baseline.dataPoints.length > 100,
  'La búsqueda de ley de corte tiene resolución suficiente.',
  { dataPoints: baseline.dataPoints.length },
);
assert(
  baseline.bestScenario.tonnage <=
    DEFAULT_ECONOMIC_INPUTS.maxResourceMt *
      DEFAULT_ECONOMIC_INPUTS.mineRecovery +
      1e-6,
  'El tonelaje óptimo no supera el recurso recuperable.',
  {
    tonnage: baseline.bestScenario.tonnage,
    recoverableResource:
      DEFAULT_ECONOMIC_INPUTS.maxResourceMt *
      DEFAULT_ECONOMIC_INPUTS.mineRecovery,
  },
);
assert(
  Math.abs(
    baseline.totalOpexPerTon -
      (DEFAULT_ECONOMIC_INPUTS.miningCostUsdPerTonneMoved *
        (1 + DEFAULT_ECONOMIC_INPUTS.stripRatio) +
        DEFAULT_ECONOMIC_INPUTS.processingCostUsdPerTonneOre),
  ) < 1e-9,
  'El OPEX total incorpora mina, strip ratio y planta.',
  { totalOpexPerTon: baseline.totalOpexPerTon },
);

const higherPrice = calculateOptimization(
  createEconomicInputs({
    metalPriceUsdPerTonne:
      DEFAULT_ECONOMIC_INPUTS.metalPriceUsdPerTonne * 1.25,
  }),
);
assert(
  higherPrice.maxVAN > baseline.maxVAN,
  'Un mayor precio incrementa el VAN.',
  { baseline: baseline.maxVAN, higherPrice: higherPrice.maxVAN },
);
assert(
  higherPrice.breakeven < baseline.breakeven,
  'Un mayor precio reduce la ley de corte de equilibrio.',
  { baseline: baseline.breakeven, higherPrice: higherPrice.breakeven },
);

const higherCosts = calculateOptimization(
  createEconomicInputs({
    miningCostUsdPerTonneMoved:
      DEFAULT_ECONOMIC_INPUTS.miningCostUsdPerTonneMoved * 1.5,
    processingCostUsdPerTonneOre:
      DEFAULT_ECONOMIC_INPUTS.processingCostUsdPerTonneOre * 1.35,
  }),
);
assert(
  higherCosts.maxVAN < baseline.maxVAN,
  'Mayores costos reducen el VAN.',
  { baseline: baseline.maxVAN, higherCosts: higherCosts.maxVAN },
);
assert(
  higherCosts.breakeven > baseline.breakeven,
  'Mayores costos aumentan la ley de corte de equilibrio.',
  { baseline: baseline.breakeven, higherCosts: higherCosts.breakeven },
);

const higherWacc = calculateOptimization(
  createEconomicInputs({ wacc: 0.14 }),
);
assert(
  higherWacc.maxVAN < baseline.maxVAN,
  'Un WACC mayor reduce el VAN.',
  { baseline: baseline.maxVAN, higherWacc: higherWacc.maxVAN },
);

const largerResource = calculateOptimization(
  createEconomicInputs({ maxResourceMt: 2_000 }),
);
assert(
  largerResource.bestScenario.tonnage > baseline.bestScenario.tonnage,
  'Un recurso máximo mayor incrementa el tonelaje óptimo disponible.',
  {
    baseline: baseline.bestScenario.tonnage,
    largerResource: largerResource.bestScenario.tonnage,
  },
);

const legacy = calculateOptimization({
  discountRate: 0.08,
  millCapacity: 40,
  mineCapacity: 100,
  stripRatio: 1.5,
  mineRecovery: 0.95,
  plantRecovery: 0.88,
});
assert(
  legacy.inputs.wacc === 0.08 && legacy.inputs.annualProductionMt === 40,
  'El contrato anterior se normaliza al nuevo motor.',
  { inputs: legacy.inputs },
);

let invalidInputRejected = false;
try {
  calculateOptimization(
    createEconomicInputs({ metalPriceUsdPerTonne: 0 }),
  );
} catch (error) {
  invalidInputRejected = error instanceof EconomicModelError;
}
assert(
  invalidInputRejected,
  'El motor rechaza parámetros económicamente inválidos.',
);

console.log('\nECONOMIC ENGINE VALIDATION SUMMARY');
console.log(
  JSON.stringify(
    {
      status: process.exitCode ? 'FAIL' : 'PASS',
      passedChecks: results.length,
      baseline: {
        breakeven: baseline.breakeven,
        optimalCutoff: baseline.optimalCutoff,
        maxVAN: baseline.maxVAN,
        irr: baseline.finalTir,
        lifeOfMine: baseline.bestScenario.lifeOfMine,
        tonnage: baseline.bestScenario.tonnage,
      },
    },
    null,
    2,
  ),
);
