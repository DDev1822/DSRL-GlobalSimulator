import type { BenchHeightM } from './blockBenchInventory';
import type { InventoryScope } from './blockInventory';
import type { BlockCostBasis, GradeConfirmation } from './blockEconomicClassification';
import type { SupportedPhase } from './blockModelContract';
import type { EconomicInputs } from './economicModel';
import {
  buildBlockBenchRouteRecovery,
  createRouteRecoveryInputs,
  validateRouteRecoveryInputs,
  type ProcessRouteId,
  type RouteRecoveryInputs,
  type RouteRecoveryReport,
} from './blockBenchRouteRecovery';
import type { BlockModelDataset } from '../utils/blockModelParser';

export interface RouteEconomicDefinition {
  id: ProcessRouteId;
  label: string;
  sourceDestination: 'Mill' | 'Leach';
  metalPriceUsdPerTonne: number;
  payableFactor: number;
  processingCostUsdPerTonneFeed: number;
  treatmentChargeUsdPerTonneFeed: number;
  refiningChargeUsdPerTonnePayableMetal: number;
  sellingCostRate: number;
  royaltyRate: number;
  assumptionBasis: 'dsrl-scenario';
}

export interface IntegratedRouteEconomicInputs {
  discountRate: number;
  routeRecovery: RouteRecoveryInputs;
  routes: Record<ProcessRouteId, RouteEconomicDefinition>;
}

export interface RouteEconomicBreakdown {
  massMt: number;
  gradeCuPercent: number | null;
  containedCuKt: number;
  recoveredCuKt: number;
  payableCuKt: number;
  grossRevenueUsdM: number;
  processingCostUsdM: number;
  miningCostUsdM: number;
  treatmentChargeUsdM: number;
  refiningChargeUsdM: number;
  sellingCostUsdM: number;
  royaltyUsdM: number;
  totalOperatingCostUsdM: number;
  operatingMarginUsdM: number;
  operatingMarginUsdPerTonne: number | null;
  operatingMarginUsdPerLbRecovered: number | null;
}

export interface RouteEconomicPeriod extends RouteEconomicBreakdown {
  route: ProcessRouteId;
  period: number;
  directFeedMassMt: number;
  reclaimedMassMt: number;
  discountedOperatingMarginUsdM: number;
  capacityUtilizationPercent: number;
}

export interface RouteEconomicTotals {
  route: ProcessRouteId;
  source: RouteEconomicBreakdown;
  realized: RouteEconomicBreakdown;
  stockpilePending: RouteEconomicBreakdown;
  inSituPending: RouteEconomicBreakdown;
  discountedRealizedMarginUsdM: number;
  pendingMarginUsdM: number;
  economicParticipationPercent: number;
  negativeMarginPeriods: number;
}

export interface RouteEconomicSensitivityResult {
  id: string;
  label: string;
  operatingMarginUsdM: number;
  deltaMarginUsdM: number;
  deltaMarginPercent: number | null;
}

export interface IntegratedRouteEconomicReport {
  sourceName: string;
  phase: SupportedPhase;
  scope: InventoryScope;
  benchHeightM: BenchHeightM;
  costBasis: BlockCostBasis;
  inputs: IntegratedRouteEconomicInputs;
  routeRecoveryReport: RouteRecoveryReport;
  periods: Array<{
    period: number;
    routes: Record<ProcessRouteId, RouteEconomicPeriod>;
    grossRevenueUsdM: number;
    totalOperatingCostUsdM: number;
    operatingMarginUsdM: number;
    discountedOperatingMarginUsdM: number;
    negativeMarginRoutes: ProcessRouteId[];
  }>;
  routeTotals: Record<ProcessRouteId, RouteEconomicTotals>;
  totalGrossRevenueUsdM: number;
  totalOperatingCostUsdM: number;
  totalOperatingMarginUsdM: number;
  totalDiscountedOperatingMarginUsdM: number;
  totalPendingMarginUsdM: number;
  totalReferenceMarginUsdM: number;
  totalContainedCuKt: number;
  totalRecoveredCuKt: number;
  totalPayableCuKt: number;
  negativeMarginPeriods: number;
  sensitivity: RouteEconomicSensitivityResult[];
  reconciliation: {
    routeMassCloses: boolean;
    containedCopperCloses: boolean;
    recoveredCopperWithinContained: boolean;
    payableCopperWithinRecovered: boolean;
    grossRevenueCloses: boolean;
    operatingCostCloses: boolean;
    operatingMarginCloses: boolean;
    realizedPlusPendingValueCloses: boolean;
    discountedValueNotAboveNominal: boolean;
    routeIdentityPreserved: boolean;
    unknownDestinationsReported: boolean;
    noImpossibleNegativeBalances: boolean;
  };
  methodology: {
    routePolicy: 'observed-route-economic-evaluation';
    observedDestinationField: 'NPVPDEST';
    routeReclassificationAllowed: false;
    payableMetalModeled: true;
    treatmentAndRefiningChargesModeled: true;
    sellingCostsModeled: true;
    royaltiesModeled: true;
    capexModeled: false;
    fullProjectTaxModeled: false;
    haulageModeled: false;
    globalRouteOptimizationModeled: false;
    projectNpvClaimAllowed: false;
    mineScheduleClaimAllowed: false;
    reserveClaimAllowed: false;
  };
  notes: string[];
}

const ROUTES: ProcessRouteId[] = ['mill', 'leach'];
const EPS = 1e-10;
const LB_PER_TONNE = 2204.62262185;

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
}

function cloneRecovery(inputs: RouteRecoveryInputs): RouteRecoveryInputs {
  return {
    ...inputs,
    routes: {
      mill: { ...inputs.routes.mill },
      leach: { ...inputs.routes.leach },
    },
  };
}

export function createIntegratedRouteEconomicInputs(
  economic: EconomicInputs,
  overrides: Partial<IntegratedRouteEconomicInputs> = {},
): IntegratedRouteEconomicInputs {
  const routeRecovery = overrides.routeRecovery
    ? cloneRecovery(overrides.routeRecovery)
    : createRouteRecoveryInputs(economic);
  const defaults: Record<ProcessRouteId, RouteEconomicDefinition> = {
    mill: {
      id: 'mill', label: 'MILL / CONCENTRADORA', sourceDestination: 'Mill',
      metalPriceUsdPerTonne: economic.metalPriceUsdPerTonne,
      payableFactor: economic.payableFactor,
      processingCostUsdPerTonneFeed: economic.processingCostUsdPerTonneOre,
      treatmentChargeUsdPerTonneFeed: 0,
      refiningChargeUsdPerTonnePayableMetal: 0,
      sellingCostRate: 0,
      royaltyRate: economic.royaltyRate,
      assumptionBasis: 'dsrl-scenario',
    },
    leach: {
      id: 'leach', label: 'LEACH / LIXIVIACIÓN', sourceDestination: 'Leach',
      metalPriceUsdPerTonne: economic.metalPriceUsdPerTonne,
      payableFactor: 1,
      processingCostUsdPerTonneFeed: economic.processingCostUsdPerTonneOre * 0.65,
      treatmentChargeUsdPerTonneFeed: 0,
      refiningChargeUsdPerTonnePayableMetal: 0,
      sellingCostRate: 0,
      royaltyRate: economic.royaltyRate,
      assumptionBasis: 'dsrl-scenario',
    },
  };
  return {
    discountRate: overrides.discountRate ?? economic.wacc,
    routeRecovery,
    routes: {
      mill: { ...defaults.mill, ...(overrides.routes?.mill ?? {}), id: 'mill', sourceDestination: 'Mill', assumptionBasis: 'dsrl-scenario' },
      leach: { ...defaults.leach, ...(overrides.routes?.leach ?? {}), id: 'leach', sourceDestination: 'Leach', assumptionBasis: 'dsrl-scenario' },
    },
  };
}

export function validateIntegratedRouteEconomicInputs(inputs: IntegratedRouteEconomicInputs): string[] {
  const errors = validateRouteRecoveryInputs(inputs.routeRecovery);
  if (!Number.isFinite(inputs.discountRate) || inputs.discountRate < 0 || inputs.discountRate > 1) {
    errors.push('La tasa de descuento debe estar entre 0 y 1.');
  }
  for (const id of ROUTES) {
    const route = inputs.routes[id];
    if (route.id !== id) errors.push(`Ruta económica inconsistente: ${id}.`);
    if (!Number.isFinite(route.metalPriceUsdPerTonne) || route.metalPriceUsdPerTonne < 0) errors.push(`Precio inválido para ${id}.`);
    for (const value of [route.payableFactor, route.sellingCostRate, route.royaltyRate]) {
      if (!Number.isFinite(value) || value < 0 || value > 1) errors.push(`Factor económico fuera de [0,1] para ${id}.`);
    }
    for (const value of [route.processingCostUsdPerTonneFeed, route.treatmentChargeUsdPerTonneFeed, route.refiningChargeUsdPerTonnePayableMetal]) {
      if (!Number.isFinite(value) || value < 0) errors.push(`Costo económico inválido para ${id}.`);
    }
  }
  return errors;
}

function evaluate(
  massMt: number,
  gradeCuPercent: number | null,
  recovery: number,
  route: RouteEconomicDefinition,
  economic: EconomicInputs,
  costBasis: BlockCostBasis,
): RouteEconomicBreakdown {
  const grade = gradeCuPercent ?? 0;
  const containedCuKt = massMt * grade * 10;
  const recoveredCuKt = containedCuKt * recovery;
  const payableCuKt = recoveredCuKt * route.payableFactor;
  const grossRevenueUsdM = payableCuKt * route.metalPriceUsdPerTonne / 1000;
  const processingCostUsdM = massMt * route.processingCostUsdPerTonneFeed;
  const miningCostUsdM = costBasis === 'full-cost' ? massMt * economic.miningCostUsdPerTonneMoved : 0;
  const treatmentChargeUsdM = massMt * route.treatmentChargeUsdPerTonneFeed;
  const refiningChargeUsdM = payableCuKt * route.refiningChargeUsdPerTonnePayableMetal / 1000;
  const sellingCostUsdM = grossRevenueUsdM * route.sellingCostRate;
  const royaltyUsdM = grossRevenueUsdM * route.royaltyRate;
  const totalOperatingCostUsdM = processingCostUsdM + miningCostUsdM + treatmentChargeUsdM + refiningChargeUsdM + sellingCostUsdM + royaltyUsdM;
  const operatingMarginUsdM = grossRevenueUsdM - totalOperatingCostUsdM;
  const recoveredLb = recoveredCuKt * 1000 * LB_PER_TONNE;
  return {
    massMt,
    gradeCuPercent: massMt > EPS ? grade : null,
    containedCuKt,
    recoveredCuKt,
    payableCuKt,
    grossRevenueUsdM,
    processingCostUsdM,
    miningCostUsdM,
    treatmentChargeUsdM,
    refiningChargeUsdM,
    sellingCostUsdM,
    royaltyUsdM,
    totalOperatingCostUsdM,
    operatingMarginUsdM,
    operatingMarginUsdPerTonne: massMt > EPS ? operatingMarginUsdM / massMt : null,
    operatingMarginUsdPerLbRecovered: recoveredLb > EPS ? operatingMarginUsdM * 1_000_000 / recoveredLb : null,
  };
}

function sum(items: RouteEconomicBreakdown[]): RouteEconomicBreakdown {
  const massMt = items.reduce((s, x) => s + x.massMt, 0);
  const containedCuKt = items.reduce((s, x) => s + x.containedCuKt, 0);
  const recoveredCuKt = items.reduce((s, x) => s + x.recoveredCuKt, 0);
  const operatingMarginUsdM = items.reduce((s, x) => s + x.operatingMarginUsdM, 0);
  const recoveredLb = recoveredCuKt * 1000 * LB_PER_TONNE;
  return {
    massMt,
    gradeCuPercent: massMt > EPS ? containedCuKt / (massMt * 10) : null,
    containedCuKt,
    recoveredCuKt,
    payableCuKt: items.reduce((s, x) => s + x.payableCuKt, 0),
    grossRevenueUsdM: items.reduce((s, x) => s + x.grossRevenueUsdM, 0),
    processingCostUsdM: items.reduce((s, x) => s + x.processingCostUsdM, 0),
    miningCostUsdM: items.reduce((s, x) => s + x.miningCostUsdM, 0),
    treatmentChargeUsdM: items.reduce((s, x) => s + x.treatmentChargeUsdM, 0),
    refiningChargeUsdM: items.reduce((s, x) => s + x.refiningChargeUsdM, 0),
    sellingCostUsdM: items.reduce((s, x) => s + x.sellingCostUsdM, 0),
    royaltyUsdM: items.reduce((s, x) => s + x.royaltyUsdM, 0),
    totalOperatingCostUsdM: items.reduce((s, x) => s + x.totalOperatingCostUsdM, 0),
    operatingMarginUsdM,
    operatingMarginUsdPerTonne: massMt > EPS ? operatingMarginUsdM / massMt : null,
    operatingMarginUsdPerLbRecovered: recoveredLb > EPS ? operatingMarginUsdM * 1_000_000 / recoveredLb : null,
  };
}

function sourceMetrics(dataset: BlockModelDataset, phase: SupportedPhase, scope: InventoryScope, id: ProcessRouteId) {
  const destination = id === 'mill' ? 'Mill' : 'Leach';
  const rows = dataset.rows.filter((row) => (scope === 'incremental' ? row.PSB_PIT === phase : row.PSB_PIT <= phase) && row.NPVPDEST === destination);
  const massMt = rows.reduce((s, row) => s + row.NPVMASS / 1_000_000, 0);
  const gradeMass = rows.reduce((s, row) => s + row.NPVMASS / 1_000_000 * row.CU, 0);
  return { massMt, gradeCuPercent: massMt > EPS ? gradeMass / massMt : null };
}

function buildSensitivity(report: Omit<IntegratedRouteEconomicReport, 'sensitivity'>): RouteEconomicSensitivityResult[] {
  const cases = [
    ['base', 'BASE', 1, 1], ['price-low', 'PRECIO -15%', 0.85, 1],
    ['price-high', 'PRECIO +15%', 1.15, 1], ['cost-low', 'COSTOS -10%', 1, 0.9],
    ['cost-high', 'COSTOS +15%', 1, 1.15],
  ] as const;
  const base = report.totalOperatingMarginUsdM;
  return cases.map(([id, label, revenueFactor, costFactor]) => {
    const margin = report.totalGrossRevenueUsdM * revenueFactor - report.totalOperatingCostUsdM * costFactor;
    const deltaMarginUsdM = margin - base;
    return { id, label, operatingMarginUsdM: margin, deltaMarginUsdM, deltaMarginPercent: Math.abs(base) > EPS ? deltaMarginUsdM / Math.abs(base) * 100 : null };
  });
}

export function buildIntegratedRouteEconomics(
  dataset: BlockModelDataset,
  phase: SupportedPhase,
  scope: InventoryScope,
  benchHeightM: BenchHeightM,
  economic: EconomicInputs,
  gradeConfirmation: GradeConfirmation,
  costBasis: BlockCostBasis,
  inputs: IntegratedRouteEconomicInputs,
): IntegratedRouteEconomicReport {
  const errors = validateIntegratedRouteEconomicInputs(inputs);
  if (errors.length) throw new Error(errors.join(' '));
  const routeRecoveryReport = buildBlockBenchRouteRecovery(dataset, phase, scope, benchHeightM, economic, gradeConfirmation, costBasis, inputs.routeRecovery);
  const periods = routeRecoveryReport.periods.map((period) => {
    const routes = {} as Record<ProcessRouteId, RouteEconomicPeriod>;
    for (const id of ROUTES) {
      const source = period.routes[id];
      const breakdown = evaluate(source.feedMassMt, source.feedCuPercent, source.recovery, inputs.routes[id], economic, costBasis);
      routes[id] = {
        ...breakdown,
        route: id,
        period: period.period,
        directFeedMassMt: source.directFeedMassMt,
        reclaimedMassMt: source.reclaimedMassMt,
        discountedOperatingMarginUsdM: breakdown.operatingMarginUsdM / Math.pow(1 + inputs.discountRate, period.period),
        capacityUtilizationPercent: source.capacityUtilizationPercent,
      };
    }
    const grossRevenueUsdM = ROUTES.reduce((s, id) => s + routes[id].grossRevenueUsdM, 0);
    const totalOperatingCostUsdM = ROUTES.reduce((s, id) => s + routes[id].totalOperatingCostUsdM, 0);
    const operatingMarginUsdM = grossRevenueUsdM - totalOperatingCostUsdM;
    return {
      period: period.period,
      routes,
      grossRevenueUsdM,
      totalOperatingCostUsdM,
      operatingMarginUsdM,
      discountedOperatingMarginUsdM: ROUTES.reduce((s, id) => s + routes[id].discountedOperatingMarginUsdM, 0),
      negativeMarginRoutes: ROUTES.filter((id) => routes[id].operatingMarginUsdM < -EPS),
    };
  });

  const routeTotals = {} as Record<ProcessRouteId, RouteEconomicTotals>;
  for (const id of ROUTES) {
    const metrics = sourceMetrics(dataset, phase, scope, id);
    const route = inputs.routes[id];
    const recovery = inputs.routeRecovery.routes[id].recovery;
    const source = evaluate(metrics.massMt, metrics.gradeCuPercent, recovery, route, economic, costBasis);
    const realized = sum(periods.map((period) => period.routes[id]));
    const recoveryTotal = routeRecoveryReport.routeTotals[id];
    const lastRoutePeriod = routeRecoveryReport.periods.at(-1)?.routes[id];
    const stockpilePending = evaluate(recoveryTotal.finalStockpileMassMt, lastRoutePeriod?.closingStockpileCuPercent ?? null, recovery, route, economic, costBasis);
    const remainingContained = Math.max(source.containedCuKt - realized.containedCuKt - stockpilePending.containedCuKt, 0);
    const remainingGrade = recoveryTotal.remainingInSituMassMt > EPS ? remainingContained / (recoveryTotal.remainingInSituMassMt * 10) : null;
    const inSituPending = evaluate(recoveryTotal.remainingInSituMassMt, remainingGrade, recovery, route, economic, costBasis);
    routeTotals[id] = {
      route: id,
      source,
      realized,
      stockpilePending,
      inSituPending,
      discountedRealizedMarginUsdM: periods.reduce((s, period) => s + period.routes[id].discountedOperatingMarginUsdM, 0),
      pendingMarginUsdM: stockpilePending.operatingMarginUsdM + inSituPending.operatingMarginUsdM,
      economicParticipationPercent: 0,
      negativeMarginPeriods: periods.filter((period) => period.routes[id].operatingMarginUsdM < -EPS).length,
    };
  }

  const participationBase = ROUTES.reduce((s, id) => s + Math.abs(routeTotals[id].source.operatingMarginUsdM), 0);
  for (const id of ROUTES) routeTotals[id].economicParticipationPercent = participationBase > EPS ? Math.abs(routeTotals[id].source.operatingMarginUsdM) / participationBase * 100 : 0;

  const totalGrossRevenueUsdM = periods.reduce((s, p) => s + p.grossRevenueUsdM, 0);
  const totalOperatingCostUsdM = periods.reduce((s, p) => s + p.totalOperatingCostUsdM, 0);
  const totalOperatingMarginUsdM = totalGrossRevenueUsdM - totalOperatingCostUsdM;
  const totalDiscountedOperatingMarginUsdM = periods.reduce((s, p) => s + p.discountedOperatingMarginUsdM, 0);
  const totalPendingMarginUsdM = ROUTES.reduce((s, id) => s + routeTotals[id].pendingMarginUsdM, 0);
  const totalReferenceMarginUsdM = ROUTES.reduce((s, id) => s + routeTotals[id].source.operatingMarginUsdM, 0);

  const core: Omit<IntegratedRouteEconomicReport, 'sensitivity'> = {
    sourceName: dataset.sourceName,
    phase,
    scope,
    benchHeightM,
    costBasis,
    inputs: { discountRate: inputs.discountRate, routeRecovery: cloneRecovery(inputs.routeRecovery), routes: { mill: { ...inputs.routes.mill }, leach: { ...inputs.routes.leach } } },
    routeRecoveryReport,
    periods,
    routeTotals,
    totalGrossRevenueUsdM,
    totalOperatingCostUsdM,
    totalOperatingMarginUsdM,
    totalDiscountedOperatingMarginUsdM,
    totalPendingMarginUsdM,
    totalReferenceMarginUsdM,
    totalContainedCuKt: ROUTES.reduce((s, id) => s + routeTotals[id].realized.containedCuKt, 0),
    totalRecoveredCuKt: ROUTES.reduce((s, id) => s + routeTotals[id].realized.recoveredCuKt, 0),
    totalPayableCuKt: ROUTES.reduce((s, id) => s + routeTotals[id].realized.payableCuKt, 0),
    negativeMarginPeriods: periods.filter((p) => p.operatingMarginUsdM < -EPS).length,
    reconciliation: {
      routeMassCloses: ROUTES.every((id) => close(routeTotals[id].source.massMt, routeTotals[id].realized.massMt + routeTotals[id].stockpilePending.massMt + routeTotals[id].inSituPending.massMt)),
      containedCopperCloses: ROUTES.every((id) => close(routeTotals[id].source.containedCuKt, routeTotals[id].realized.containedCuKt + routeTotals[id].stockpilePending.containedCuKt + routeTotals[id].inSituPending.containedCuKt)),
      recoveredCopperWithinContained: ROUTES.every((id) => routeTotals[id].source.recoveredCuKt <= routeTotals[id].source.containedCuKt + EPS),
      payableCopperWithinRecovered: ROUTES.every((id) => routeTotals[id].source.payableCuKt <= routeTotals[id].source.recoveredCuKt + EPS),
      grossRevenueCloses: close(totalGrossRevenueUsdM, ROUTES.reduce((s, id) => s + routeTotals[id].realized.grossRevenueUsdM, 0)),
      operatingCostCloses: close(totalOperatingCostUsdM, ROUTES.reduce((s, id) => s + routeTotals[id].realized.totalOperatingCostUsdM, 0)),
      operatingMarginCloses: close(totalOperatingMarginUsdM, totalGrossRevenueUsdM - totalOperatingCostUsdM),
      realizedPlusPendingValueCloses: close(totalReferenceMarginUsdM, totalOperatingMarginUsdM + totalPendingMarginUsdM),
      discountedValueNotAboveNominal: inputs.discountRate <= EPS || periods.every((p) => p.operatingMarginUsdM < 0 || p.discountedOperatingMarginUsdM <= p.operatingMarginUsdM + EPS),
      routeIdentityPreserved: routeRecoveryReport.reconciliation.routeIdentityPreserved,
      unknownDestinationsReported: routeRecoveryReport.reconciliation.unknownDestinationsReported,
      noImpossibleNegativeBalances: ROUTES.every((id) => [routeTotals[id].source, routeTotals[id].realized, routeTotals[id].stockpilePending, routeTotals[id].inSituPending].every((x) => [x.massMt, x.containedCuKt, x.recoveredCuKt, x.payableCuKt, x.grossRevenueUsdM, x.totalOperatingCostUsdM].every((value) => value >= -EPS))),
    },
    methodology: {
      routePolicy: 'observed-route-economic-evaluation',
      observedDestinationField: 'NPVPDEST',
      routeReclassificationAllowed: false,
      payableMetalModeled: true,
      treatmentAndRefiningChargesModeled: true,
      sellingCostsModeled: true,
      royaltiesModeled: true,
      capexModeled: false,
      fullProjectTaxModeled: false,
      haulageModeled: false,
      globalRouteOptimizationModeled: false,
      projectNpvClaimAllowed: false,
      mineScheduleClaimAllowed: false,
      reserveClaimAllowed: false,
    },
    notes: [
      'NPVPDEST se preserva sin reclasificación automática.',
      'Precio, pagabilidad, costos, cargos y regalías son supuestos DSRL editables.',
      'El valor pendiente incluye stockpile e inventario in situ.',
      'El valor operativo descontado no es VAN.',
    ],
  };
  return { ...core, sensitivity: buildSensitivity(core) };
}

export function buildRouteEconomicSensitivity(report: IntegratedRouteEconomicReport): RouteEconomicSensitivityResult[] {
  return [...report.sensitivity];
}
