export interface DataPoint {
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

export interface EconomicResults {
  breakeven: number;
  best: DataPoint | null;
  data: DataPoint[];
  dynamicCapex: number;
  miningOpex: number;
  processingOpex: number;
  totalOpex: number;
  production: number;
  maxOreFromMine: number;
}

export const MAX_CUTOFF = 1.2;
export const MAX_TONNAGE = 1500;
export const MAX_GRADE = 1.5;

const BASE_CAPACITY = 40;
const BASE_MINE_CAPACITY = 100;
const BASE_CAPEX = 2800;
const COPPER_PRICE = 8800;
const NET_PAYABLE = 0.8;
const TAX_RATE = 0.3;
const NET_PRICE = COPPER_PRICE * NET_PAYABLE;

export function calculateTonnage(cutoff: number): number {
  return cutoff >= MAX_CUTOFF
    ? 0
    : MAX_TONNAGE * Math.pow(1 - cutoff / MAX_CUTOFF, 2);
}

export function calculateGrade(cutoff: number): number {
  return cutoff >= MAX_CUTOFF
    ? 0
    : cutoff + 0.25 + 0.1 * (1 - cutoff / MAX_CUTOFF);
}

function calculateIrr(cashflows: number[]): number | null {
  if (cashflows.length < 2 || cashflows.reduce((sum, value) => sum + value, 0) <= 0) {
    return null;
  }

  let low = 0;
  let high = 3;
  let guess = 0.1;

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const npv = cashflows.reduce(
      (sum, cashflow, year) => sum + cashflow / Math.pow(1 + guess, year),
      0,
    );

    if (Math.abs(npv) < 0.001) break;
    if (npv > 0) low = guess;
    else high = guess;
    guess = (low + high) / 2;
  }

  return guess * 100;
}

export function calculateOptimization(inputs: EconomicInputs): EconomicResults {
  const discount = inputs.discountRate / 100;
  const mineRecovery = inputs.mineRecovery / 100;
  const plantRecovery = inputs.plantRecovery / 100;
  const sizeFactor =
    (inputs.millCapacity / BASE_CAPACITY + inputs.mineCapacity / BASE_MINE_CAPACITY) / 2;
  const dynamicCapex = BASE_CAPEX * Math.pow(sizeFactor, 0.65);
  const miningOpex = 2.5 * Math.pow(BASE_MINE_CAPACITY / inputs.mineCapacity, 0.15);
  const processingOpex = 7.5 * Math.pow(BASE_CAPACITY / inputs.millCapacity, 0.25);
  const totalOpex = miningOpex * (1 + inputs.stripRatio) + processingOpex;
  const maxOreFromMine = inputs.mineCapacity / (1 + inputs.stripRatio);
  const production = Math.min(inputs.millCapacity, maxOreFromMine);
  const breakeven = totalOpex / (NET_PRICE * plantRecovery * 0.01);
  const data: DataPoint[] = [];
  let best: DataPoint | null = null;

  for (let cutoff = 0.1; cutoff <= 1.1; cutoff += 0.01) {
    const normalizedCutoff = Number(cutoff.toFixed(2));
    const tonnage = calculateTonnage(normalizedCutoff) * mineRecovery;
    const averageGrade = calculateGrade(normalizedCutoff);

    if (tonnage < 1 || normalizedCutoff < breakeven) {
      data.push({
        cutoff: normalizedCutoff,
        averageGrade,
        tonnage,
        npv: 0,
        irr: null,
        lifeOfMine: 0,
        recoveredMetal: 0,
      });
      continue;
    }

    const lifeOfMine = Math.ceil(tonnage / production);
    const cashflows = [-dynamicCapex];
    let npv = -dynamicCapex;

    for (let year = 1; year <= lifeOfMine; year += 1) {
      const remaining = tonnage - production * (year - 1);
      const tonnesThisYear = Math.min(production, remaining);
      const revenue =
        tonnesThisYear * 1_000_000 * (averageGrade / 100) * plantRecovery * NET_PRICE;
      const cost = tonnesThisYear * 1_000_000 * totalOpex;
      const operatingProfit = revenue - cost;
      const afterTax =
        (operatingProfit > 0 ? operatingProfit * (1 - TAX_RATE) : operatingProfit) /
        1_000_000;

      cashflows.push(afterTax);
      npv += afterTax / Math.pow(1 + discount, year);
    }

    const point: DataPoint = {
      cutoff: normalizedCutoff,
      averageGrade,
      tonnage,
      npv: Math.max(npv, 0),
      irr: calculateIrr(cashflows),
      lifeOfMine,
      recoveredMetal: tonnage * (averageGrade / 100) * plantRecovery,
    };

    data.push(point);
    if (!best || point.npv > best.npv) best = point;
  }

  return {
    breakeven,
    best,
    data,
    dynamicCapex,
    miningOpex,
    processingOpex,
    totalOpex,
    production,
    maxOreFromMine,
  };
}
