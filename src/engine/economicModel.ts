export interface EconomicPoint {
  cutoff: number;
  averageGrade: number;
  tonnage: number;
  npv: number;
  irr: number | null;
  lifeOfMine: number;
  recoveredMetal: number;
}

export interface EconomicInputs {
  discountRate: number;
  millCapacity: number;
  mineCapacity: number;
  stripRatio: number;
  mineRecovery: number;
  plantRecovery: number;
}

export interface OptimizationResults {
  breakeven: number;
  optimalCutoff: number;
  maxVAN: number;
  finalTir: number;
  dataPoints: EconomicPoint[];
  dynamicCAPEX: number;
  miningOpex: number;
  processingOpex: number;
  totalOpexPerTon: number;
  effectiveProductionRate: number;
  bestScenario: {
    tonnage: number;
    grade: number;
    metal: number;
    lifeOfMine: number;
    irr: number;
  };
}

const BASE_CAPACITY = 40;
const BASE_MINE_CAPACITY = 100;
const BASE_CAPEX = 2800;
const MAX_CUTOFF = 1.2;
const MAX_TONNAGE = 1500;
const MAX_GRADE = 1.5;
const COPPER_PRICE = 8800;
const NET_PAYABLE = 0.8;
const TAX_RATE = 0.3;
const NET_PRICE = COPPER_PRICE * NET_PAYABLE;

function calculateTonnage(cutoff: number): number {
  return cutoff >= MAX_CUTOFF
    ? 0
    : MAX_TONNAGE * Math.pow(1 - cutoff / MAX_CUTOFF, 2);
}

function calculateGrade(cutoff: number): number {
  return cutoff >= MAX_CUTOFF
    ? 0
    : cutoff + 0.25 + 0.1 * (1 - cutoff / MAX_CUTOFF);
}

function calculateIRR(cashflows: number[]): number | null {
  if (cashflows.length < 2) return null;
  if (cashflows.reduce((sum, value) => sum + value, 0) <= 0) return null;

  let low = 0;
  let high = 3;
  let guess = 0.1;

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const npv = cashflows.reduce(
      (sum, cashflow, year) => sum + cashflow / Math.pow(1 + guess, year),
      0,
    );

    if (Math.abs(npv) < 0.01) break;
    if (npv > 0) low = guess;
    else high = guess;
    guess = (low + high) / 2;
  }

  return guess * 100;
}

export function calculateOptimization(inputs: EconomicInputs): OptimizationResults {
  const sizeFactor =
    (inputs.millCapacity / BASE_CAPACITY +
      inputs.mineCapacity / BASE_MINE_CAPACITY) /
    2;
  const dynamicCAPEX = BASE_CAPEX * Math.pow(sizeFactor, 0.65);
  const miningOpex =
    2.5 * Math.pow(BASE_MINE_CAPACITY / inputs.mineCapacity, 0.15);
  const processingOpex =
    7.5 * Math.pow(BASE_CAPACITY / inputs.millCapacity, 0.25);
  const totalOpexPerTon = miningOpex * (1 + inputs.stripRatio) + processingOpex;
  const maxOreFromMine = inputs.mineCapacity / (1 + inputs.stripRatio);
  const effectiveProductionRate = Math.min(inputs.millCapacity, maxOreFromMine);
  const revenuePerPercent = NET_PRICE * inputs.plantRecovery * 0.01;
  const breakeven = totalOpexPerTon / revenuePerPercent;

  let maxVAN = 0;
  let optimalCutoff = breakeven;
  let bestScenario = {
    tonnage: 0,
    grade: 0,
    metal: 0,
    lifeOfMine: 0,
    irr: 0,
  };
  const dataPoints: EconomicPoint[] = [];

  for (let cutoff = 0.1; cutoff <= 1.1 + 1e-9; cutoff += 0.01) {
    const normalizedCutoff = Number(cutoff.toFixed(2));
    const tonnage = calculateTonnage(normalizedCutoff) * inputs.mineRecovery;
    const grade = calculateGrade(normalizedCutoff);

    if (tonnage < 1 || grade <= 0 || normalizedCutoff < breakeven) {
      dataPoints.push({
        cutoff: normalizedCutoff,
        averageGrade: grade,
        tonnage,
        npv: 0,
        irr: null,
        lifeOfMine: 0,
        recoveredMetal: 0,
      });
      continue;
    }

    const lifeOfMine = Math.ceil(tonnage / effectiveProductionRate);
    const cashflows: number[] = [-dynamicCAPEX];
    let npv = -dynamicCAPEX;

    for (let year = 1; year <= lifeOfMine; year += 1) {
      const remaining = tonnage - effectiveProductionRate * (year - 1);
      const annualTonnage = Math.min(effectiveProductionRate, Math.max(remaining, 0));
      const revenue =
        annualTonnage * 1_000_000 * (grade / 100) * inputs.plantRecovery * NET_PRICE;
      const cost = annualTonnage * 1_000_000 * totalOpexPerTon;
      const operatingProfit = revenue - cost;
      const afterTaxCashflow =
        (operatingProfit > 0
          ? operatingProfit * (1 - TAX_RATE)
          : operatingProfit) / 1_000_000;

      cashflows.push(afterTaxCashflow);
      npv += afterTaxCashflow / Math.pow(1 + inputs.discountRate, year);
    }

    const irr = calculateIRR(cashflows);
    const recoveredMetal = tonnage * (grade / 100) * inputs.plantRecovery;
    const positiveNpv = Math.max(npv, 0);

    dataPoints.push({
      cutoff: normalizedCutoff,
      averageGrade: grade,
      tonnage,
      npv: positiveNpv,
      irr,
      lifeOfMine,
      recoveredMetal,
    });

    if (npv > maxVAN) {
      maxVAN = npv;
      optimalCutoff = normalizedCutoff;
      bestScenario = {
        tonnage,
        grade,
        metal: recoveredMetal,
        lifeOfMine,
        irr: irr ?? 0,
      };
    }
  }

  return {
    breakeven,
    optimalCutoff,
    maxVAN,
    finalTir: bestScenario.irr,
    dataPoints,
    dynamicCAPEX,
    miningOpex,
    processingOpex,
    totalOpexPerTon,
    effectiveProductionRate,
    bestScenario,
  };
}
