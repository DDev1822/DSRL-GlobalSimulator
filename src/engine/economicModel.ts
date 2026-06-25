export interface EconomicPoint {
  cutoff: number;
  averageGrade: number;
  tonnage: number;
  wasteTonnage: number;
  totalMaterial: number;
  npv: number;
  rawNpv: number;
  irr: number | null;
  lifeOfMine: number;
  recoveredMetal: number;
  totalRevenue: number;
  totalOperatingCost: number;
  totalTax: number;
  annualCashflows: number[];
}

export interface EconomicInputs {
  metalPriceUsdPerTonne: number;
  maxResourceMt: number;
  wacc: number;
  annualProductionMt: number;
  stripRatio: number;
  miningCostUsdPerTonneMoved: number;
  processingCostUsdPerTonneOre: number;
  baseGradePercent: number;
  mineRecovery: number;
  plantRecovery: number;
  initialCapexUsdM: number;
  sustainingCapexUsdMPerYear: number;
  payableFactor: number;
  royaltyRate: number;
  taxRate: number;
  cutoffStepPercent: number;
  resourceCurveExponent: number;
  gradeResponseExponent: number;
  maxCutoffMultiplier: number;
}

export interface LegacyEconomicInputs {
  discountRate: number;
  millCapacity: number;
  mineCapacity: number;
  stripRatio: number;
  mineRecovery: number;
  plantRecovery: number;
}

export type EconomicInputKey = keyof EconomicInputs;
export type ValidationSeverity = 'error' | 'warning';

export interface EconomicValidationIssue {
  field: EconomicInputKey;
  severity: ValidationSeverity;
  message: string;
  value: number;
}

export interface EconomicValidationResult {
  valid: boolean;
  errors: EconomicValidationIssue[];
  warnings: EconomicValidationIssue[];
  issues: EconomicValidationIssue[];
}

export interface OptimizationResults {
  inputs: EconomicInputs;
  validation: EconomicValidationResult;
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
  payableMetalPrice: number;
  maximumEvaluatedCutoff: number;
  bestScenario: {
    tonnage: number;
    wasteTonnage: number;
    totalMaterial: number;
    grade: number;
    metal: number;
    lifeOfMine: number;
    irr: number;
    totalRevenue: number;
    totalOperatingCost: number;
    totalTax: number;
    annualCashflows: number[];
  };
}

export const DEFAULT_ECONOMIC_INPUTS: EconomicInputs = {
  metalPriceUsdPerTonne: 8_800,
  maxResourceMt: 1_500,
  wacc: 0.08,
  annualProductionMt: 40,
  stripRatio: 1.5,
  miningCostUsdPerTonneMoved: 2.5,
  processingCostUsdPerTonneOre: 7.5,
  baseGradePercent: 0.65,
  mineRecovery: 0.95,
  plantRecovery: 0.88,
  initialCapexUsdM: 2_800,
  sustainingCapexUsdMPerYear: 0,
  payableFactor: 0.8,
  royaltyRate: 0,
  taxRate: 0.3,
  cutoffStepPercent: 0.01,
  resourceCurveExponent: 2,
  gradeResponseExponent: 0.85,
  maxCutoffMultiplier: 2.5,
};

export class EconomicModelError extends Error {
  readonly validation: EconomicValidationResult;

  constructor(validation: EconomicValidationResult) {
    super(
      validation.errors.map((item) => item.message).join(' ') ||
        'Los parámetros económicos no son válidos.',
    );
    this.name = 'EconomicModelError';
    this.validation = validation;
  }
}

export function createEconomicInputs(
  overrides: Partial<EconomicInputs> = {},
): EconomicInputs {
  return { ...DEFAULT_ECONOMIC_INPUTS, ...overrides };
}

function isLegacyEconomicInputs(
  inputs: EconomicInputs | LegacyEconomicInputs,
): inputs is LegacyEconomicInputs {
  return 'discountRate' in inputs && 'millCapacity' in inputs;
}

export function normalizeEconomicInputs(
  providedInputs: EconomicInputs | LegacyEconomicInputs,
): EconomicInputs {
  if (!isLegacyEconomicInputs(providedInputs)) {
    return { ...providedInputs };
  }

  const effectiveProduction = Math.max(
    Math.min(
      providedInputs.millCapacity,
      providedInputs.mineCapacity / (1 + providedInputs.stripRatio),
    ),
    0.01,
  );
  const sizeFactor =
    (providedInputs.millCapacity / 40 + providedInputs.mineCapacity / 100) /
    2;

  return createEconomicInputs({
    wacc: providedInputs.discountRate,
    annualProductionMt: effectiveProduction,
    stripRatio: providedInputs.stripRatio,
    mineRecovery: providedInputs.mineRecovery,
    plantRecovery: providedInputs.plantRecovery,
    initialCapexUsdM:
      DEFAULT_ECONOMIC_INPUTS.initialCapexUsdM *
      Math.pow(Math.max(sizeFactor, 0.01), 0.65),
    miningCostUsdPerTonneMoved:
      DEFAULT_ECONOMIC_INPUTS.miningCostUsdPerTonneMoved *
      Math.pow(100 / Math.max(providedInputs.mineCapacity, 0.01), 0.15),
    processingCostUsdPerTonneOre:
      DEFAULT_ECONOMIC_INPUTS.processingCostUsdPerTonneOre *
      Math.pow(40 / Math.max(providedInputs.millCapacity, 0.01), 0.25),
  });
}

function issue(
  field: EconomicInputKey,
  severity: ValidationSeverity,
  message: string,
  value: number,
): EconomicValidationIssue {
  return { field, severity, message, value };
}

export function validateEconomicInputs(
  inputs: EconomicInputs,
): EconomicValidationResult {
  const issues: EconomicValidationIssue[] = [];
  const finiteFields = Object.entries(inputs) as Array<
    [EconomicInputKey, number]
  >;

  for (const [field, value] of finiteFields) {
    if (!Number.isFinite(value)) {
      issues.push(
        issue(field, 'error', `${field} debe ser un número finito.`, value),
      );
    }
  }

  const requirePositive = (
    field: EconomicInputKey,
    label: string,
    allowZero = false,
  ) => {
    const value = inputs[field];
    const invalid = allowZero ? value < 0 : value <= 0;
    if (invalid) {
      issues.push(
        issue(
          field,
          'error',
          `${label} debe ser ${allowZero ? 'mayor o igual que cero' : 'mayor que cero'}.`,
          value,
        ),
      );
    }
  };

  const requireFraction = (field: EconomicInputKey, label: string) => {
    const value = inputs[field];
    if (value < 0 || value > 1) {
      issues.push(
        issue(field, 'error', `${label} debe estar entre 0 y 1.`, value),
      );
    }
  };

  requirePositive('metalPriceUsdPerTonne', 'El precio del metal');
  requirePositive('maxResourceMt', 'El recurso máximo');
  requirePositive('annualProductionMt', 'La producción anual');
  requirePositive('stripRatio', 'El strip ratio', true);
  requirePositive(
    'miningCostUsdPerTonneMoved',
    'El costo de mina',
    true,
  );
  requirePositive(
    'processingCostUsdPerTonneOre',
    'El costo de planta',
    true,
  );
  requirePositive('baseGradePercent', 'La ley base');
  requirePositive('initialCapexUsdM', 'El CAPEX inicial', true);
  requirePositive(
    'sustainingCapexUsdMPerYear',
    'El CAPEX de sostenimiento',
    true,
  );
  requirePositive('cutoffStepPercent', 'El paso de ley de corte');
  requirePositive(
    'resourceCurveExponent',
    'El exponente de la curva de recursos',
  );
  requirePositive(
    'gradeResponseExponent',
    'El exponente de respuesta de ley',
  );

  requireFraction('mineRecovery', 'La recuperación minera');
  requireFraction('plantRecovery', 'La recuperación metalúrgica');
  requireFraction('payableFactor', 'El factor pagable');
  requireFraction('royaltyRate', 'La regalía');
  requireFraction('taxRate', 'La tasa de impuesto');

  if (inputs.wacc < 0 || inputs.wacc >= 1) {
    issues.push(
      issue(
        'wacc',
        'error',
        'El WACC debe ser mayor o igual que 0 y menor que 1.',
        inputs.wacc,
      ),
    );
  }

  if (inputs.maxCutoffMultiplier <= 1) {
    issues.push(
      issue(
        'maxCutoffMultiplier',
        'error',
        'El multiplicador de ley máxima debe ser mayor que 1.',
        inputs.maxCutoffMultiplier,
      ),
    );
  }

  if (inputs.annualProductionMt > inputs.maxResourceMt) {
    issues.push(
      issue(
        'annualProductionMt',
        'warning',
        'La producción anual supera el recurso máximo; la vida de mina será menor a un año efectivo.',
        inputs.annualProductionMt,
      ),
    );
  }

  if (inputs.mineRecovery === 0 || inputs.plantRecovery === 0) {
    issues.push(
      issue(
        inputs.mineRecovery === 0 ? 'mineRecovery' : 'plantRecovery',
        'warning',
        'Una recuperación igual a cero produce un escenario sin metal recuperado.',
        0,
      ),
    );
  }

  if (inputs.cutoffStepPercent > inputs.baseGradePercent / 4) {
    issues.push(
      issue(
        'cutoffStepPercent',
        'warning',
        'El paso de ley de corte es grande respecto de la ley base y puede ocultar el óptimo.',
        inputs.cutoffStepPercent,
      ),
    );
  }

  if (inputs.metalPriceUsdPerTonne < 2_000) {
    issues.push(
      issue(
        'metalPriceUsdPerTonne',
        'warning',
        'El precio del metal es inusualmente bajo para el rango de referencia del simulador.',
        inputs.metalPriceUsdPerTonne,
      ),
    );
  }

  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');
  return { valid: errors.length === 0, errors, warnings, issues };
}

function calculateTonnage(
  cutoff: number,
  inputs: EconomicInputs,
  maximumCutoff: number,
): number {
  if (cutoff >= maximumCutoff) return 0;
  const remainingFraction = Math.max(1 - cutoff / maximumCutoff, 0);
  return (
    inputs.maxResourceMt *
    inputs.mineRecovery *
    Math.pow(remainingFraction, inputs.resourceCurveExponent)
  );
}

function calculateAverageGrade(
  cutoff: number,
  inputs: EconomicInputs,
  maximumCutoff: number,
): number {
  if (cutoff >= maximumCutoff) return maximumCutoff;
  const remainingFraction = Math.max(1 - cutoff / maximumCutoff, 0);
  return (
    cutoff +
    inputs.baseGradePercent *
      Math.pow(remainingFraction, inputs.gradeResponseExponent)
  );
}

function discountedNpv(cashflows: number[], rate: number): number {
  return cashflows.reduce(
    (sum, cashflow, year) => sum + cashflow / Math.pow(1 + rate, year),
    0,
  );
}

function calculateIRR(cashflows: number[]): number | null {
  if (cashflows.length < 2) return null;

  const npvAtLower = discountedNpv(cashflows, -0.99);
  const npvAtUpper = discountedNpv(cashflows, 10);
  if (npvAtLower === 0) return -99;
  if (npvAtUpper === 0) return 1_000;
  if (npvAtLower * npvAtUpper > 0) return null;

  let lower = -0.99;
  let upper = 10;
  let guess = 0.1;

  for (let iteration = 0; iteration < 100; iteration += 1) {
    guess = (lower + upper) / 2;
    const npv = discountedNpv(cashflows, guess);
    if (Math.abs(npv) < 1e-6) break;

    const lowerNpv = discountedNpv(cashflows, lower);
    if (lowerNpv * npv <= 0) upper = guess;
    else lower = guess;
  }

  return guess * 100;
}

function evaluateCutoff(
  cutoff: number,
  inputs: EconomicInputs,
  maximumCutoff: number,
  payableMetalPrice: number,
  totalOpexPerTon: number,
): EconomicPoint {
  const tonnage = calculateTonnage(cutoff, inputs, maximumCutoff);
  const averageGrade = calculateAverageGrade(
    cutoff,
    inputs,
    maximumCutoff,
  );
  const wasteTonnage = tonnage * inputs.stripRatio;
  const totalMaterial = tonnage + wasteTonnage;
  const lifeOfMine =
    tonnage > 0 ? Math.max(Math.ceil(tonnage / inputs.annualProductionMt), 1) : 0;
  const cashflows: number[] = [-inputs.initialCapexUsdM];
  let totalRevenue = 0;
  let totalOperatingCost = 0;
  let totalTax = 0;

  for (let year = 1; year <= lifeOfMine; year += 1) {
    const remainingOre = tonnage - inputs.annualProductionMt * (year - 1);
    const annualOre = Math.min(
      inputs.annualProductionMt,
      Math.max(remainingOre, 0),
    );
    const grossRevenueUsdM =
      annualOre *
      1_000_000 *
      (averageGrade / 100) *
      inputs.plantRecovery *
      payableMetalPrice /
      1_000_000;
    const royaltyUsdM = grossRevenueUsdM * inputs.royaltyRate;
    const operatingCostUsdM = annualOre * totalOpexPerTon;
    const preTaxCashflowUsdM =
      grossRevenueUsdM -
      royaltyUsdM -
      operatingCostUsdM -
      inputs.sustainingCapexUsdMPerYear;
    const taxUsdM = Math.max(preTaxCashflowUsdM, 0) * inputs.taxRate;
    const freeCashflowUsdM = preTaxCashflowUsdM - taxUsdM;

    totalRevenue += grossRevenueUsdM;
    totalOperatingCost +=
      operatingCostUsdM + inputs.sustainingCapexUsdMPerYear;
    totalTax += taxUsdM;
    cashflows.push(freeCashflowUsdM);
  }

  const rawNpv = discountedNpv(cashflows, inputs.wacc);
  const irr = calculateIRR(cashflows);
  const recoveredMetal =
    tonnage * (averageGrade / 100) * inputs.plantRecovery;

  return {
    cutoff,
    averageGrade,
    tonnage,
    wasteTonnage,
    totalMaterial,
    npv: Math.max(rawNpv, 0),
    rawNpv,
    irr,
    lifeOfMine,
    recoveredMetal,
    totalRevenue,
    totalOperatingCost,
    totalTax,
    annualCashflows: cashflows,
  };
}

export function calculateOptimization(
  providedInputs: EconomicInputs | LegacyEconomicInputs,
): OptimizationResults {
  const inputs = normalizeEconomicInputs(providedInputs);
  const validation = validateEconomicInputs(inputs);
  if (!validation.valid) throw new EconomicModelError(validation);

  const payableMetalPrice =
    inputs.metalPriceUsdPerTonne * inputs.payableFactor;
  const miningOpex = inputs.miningCostUsdPerTonneMoved;
  const processingOpex = inputs.processingCostUsdPerTonneOre;
  const totalOpexPerTon =
    miningOpex * (1 + inputs.stripRatio) + processingOpex;
  const revenuePerGradePercent =
    payableMetalPrice * inputs.plantRecovery * (1 - inputs.royaltyRate) * 0.01;
  const breakeven =
    revenuePerGradePercent > 0
      ? totalOpexPerTon / revenuePerGradePercent
      : Number.POSITIVE_INFINITY;
  const maximumEvaluatedCutoff = Math.max(
    inputs.baseGradePercent * inputs.maxCutoffMultiplier,
    inputs.baseGradePercent + inputs.cutoffStepPercent,
  );
  const dataPoints: EconomicPoint[] = [];
  const numberOfSteps = Math.ceil(
    maximumEvaluatedCutoff / inputs.cutoffStepPercent,
  );

  for (let step = 0; step <= numberOfSteps; step += 1) {
    const cutoff = Math.min(
      Number((step * inputs.cutoffStepPercent).toFixed(6)),
      maximumEvaluatedCutoff,
    );
    dataPoints.push(
      evaluateCutoff(
        cutoff,
        inputs,
        maximumEvaluatedCutoff,
        payableMetalPrice,
        totalOpexPerTon,
      ),
    );
  }

  const viablePoints = dataPoints.filter(
    (point) => point.tonnage > 0 && point.rawNpv > 0,
  );
  const bestPoint = viablePoints.reduce<EconomicPoint | null>(
    (best, point) =>
      best === null || point.rawNpv > best.rawNpv ? point : best,
    null,
  );
  const fallbackPoint = dataPoints.reduce((best, point) =>
    point.rawNpv > best.rawNpv ? point : best,
  );
  const optimum = bestPoint ?? fallbackPoint;
  const maxVAN = Math.max(optimum.rawNpv, 0);

  return {
    inputs,
    validation,
    breakeven,
    optimalCutoff: optimum.cutoff,
    maxVAN,
    finalTir: optimum.irr ?? 0,
    dataPoints,
    dynamicCAPEX: inputs.initialCapexUsdM,
    miningOpex,
    processingOpex,
    totalOpexPerTon,
    effectiveProductionRate: inputs.annualProductionMt,
    payableMetalPrice,
    maximumEvaluatedCutoff,
    bestScenario: {
      tonnage: optimum.tonnage,
      wasteTonnage: optimum.wasteTonnage,
      totalMaterial: optimum.totalMaterial,
      grade: optimum.averageGrade,
      metal: optimum.recoveredMetal,
      lifeOfMine: optimum.lifeOfMine,
      irr: optimum.irr ?? 0,
      totalRevenue: optimum.totalRevenue,
      totalOperatingCost: optimum.totalOperatingCost,
      totalTax: optimum.totalTax,
      annualCashflows: optimum.annualCashflows,
    },
  };
}
