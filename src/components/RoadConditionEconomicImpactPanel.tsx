import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Gauge, RefreshCw, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import {
  applyRoadConditionPreset,
  buildRoadConditionEconomicImpact,
  createRoadConditionInputs,
  ROAD_CONDITION_PRESETS,
  ROAD_CONDITION_ROUTE_IDS,
  type RoadConditionBasis,
  type RoadConditionClass,
  type RoadConditionInputs,
  type RoadConditionRouteInput,
} from '../engine/roadConditionEconomicImpact';
import type { HaulageRouteId } from '../engine/preliminaryHaulageLogistics';
import { SUPPORTED_BENCH_HEIGHTS, type BenchHeightM } from '../engine/blockBenchInventory';
import type { InventoryScope } from '../engine/blockInventory';
import type { BlockCostBasis, GradeConfirmation } from '../engine/blockEconomicClassification';
import { SUPPORTED_PHASES, type SupportedPhase } from '../engine/blockModelContract';
import { createEconomicInputs, validateEconomicInputs, type EconomicInputs } from '../engine/economicModel';
import type { BlockModelDataset } from '../utils/blockModelParser';
import { loadBlockModelCatalog } from '../utils/blockModelCatalogLoader';
import './RoadConditionEconomicImpactPanel.css';

const STORAGE = 'dsrl-global-simulator:economic-scenario:v1';
const PRESET_CLASSES: Array<Exclude<RoadConditionClass, 'custom'>> = ['good', 'fair', 'poor', 'critical'];
type RoadField = keyof Pick<
  RoadConditionRouteInput,
  | 'currentRollingResistancePercent'
  | 'targetRollingResistancePercent'
  | 'loadedSpeedFactor'
  | 'emptySpeedFactor'
  | 'fuelBurnFactor'
  | 'maintenanceCostFactor'
  | 'tireCostFactor'
  | 'otherCostFactor'
  | 'addedDelayMinutes'
  | 'confidence'
>;

function loadEconomic(): EconomicInputs {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return createEconomicInputs();
    const candidate = createEconomicInputs(JSON.parse(raw) as Partial<EconomicInputs>);
    return validateEconomicInputs(candidate).valid ? candidate : createEconomicInputs();
  } catch {
    return createEconomicInputs();
  }
}

const number = (value: number | null, digits = 2) =>
  value === null || !Number.isFinite(value)
    ? 'N/D'
    : new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
const usd = (value: number) => `$${number(value)} M`;
const mt = (value: number) => `${number(value, 3)} Mt`;
const pct = (value: number) => `${number(value * 100, 0)}%`;
const conditionLabel = (value: RoadConditionClass) =>
  value === 'custom' ? 'PERSONALIZADA' : ROAD_CONDITION_PRESETS[value].label;

export default function RoadConditionEconomicImpactPanel() {
  const initialEconomic = useMemo(loadEconomic, []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<BlockModelDataset | null>(null);
  const [economic, setEconomic] = useState<EconomicInputs>(initialEconomic);
  const [phase, setPhase] = useState<SupportedPhase>(6);
  const [scope, setScope] = useState<InventoryScope>('cumulative');
  const [height, setHeight] = useState<BenchHeightM>(10);
  const [costBasis, setCostBasis] = useState<BlockCostBasis>('full-cost');
  const [grade, setGrade] = useState<GradeConfirmation>('unconfirmed');
  const [active, setActive] = useState<HaulageRouteId>('mill-direct');
  const [inputs, setInputs] = useState<RoadConditionInputs>(() => createRoadConditionInputs(initialEconomic));

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await loadBlockModelCatalog('/data/block-model/block-model-manifest.json', force);
      if (catalog.primary.report.status === 'fail') {
        throw new Error('El modelo maestro no supera el control de calidad 8.2.');
      }
      const nextEconomic = loadEconomic();
      setDataset(catalog.primary);
      setEconomic(nextEconomic);
      setInputs(createRoadConditionInputs(nextEconomic));
    } catch (reason: unknown) {
      setDataset(null);
      setError(reason instanceof Error ? reason.message : 'No se pudo calcular el impacto de condición de vía.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !dataset && !loading && !error) void load(false);
  }, [open, dataset, loading, error, load]);

  const calculation = useMemo(() => {
    if (!dataset || grade !== 'cu-percent') return { report: null, error: null as string | null };
    try {
      return {
        report: buildRoadConditionEconomicImpact(
          dataset,
          phase,
          scope,
          height,
          economic,
          grade,
          costBasis,
          inputs,
        ),
        error: null,
      };
    } catch (reason: unknown) {
      return {
        report: null,
        error: reason instanceof Error ? reason.message : 'Configuración de vía inválida.',
      };
    }
  }, [dataset, phase, scope, height, economic, grade, costBasis, inputs]);

  const updateRoute = (patch: Partial<RoadConditionRouteInput>) => {
    setInputs((current) => ({
      ...current,
      routes: {
        ...current.routes,
        [active]: {
          ...current.routes[active],
          ...patch,
          routeId: active,
        },
      },
    }));
  };

  const setValue = (field: RoadField, value: number) => {
    updateRoute({ [field]: value, conditionClass: 'custom' } as Partial<RoadConditionRouteInput>);
  };

  const setPreset = (conditionClass: Exclude<RoadConditionClass, 'custom'>) => {
    setInputs((current) => ({
      ...current,
      routes: {
        ...current.routes,
        [active]: applyRoadConditionPreset(current.routes[active], conditionClass),
      },
    }));
  };

  const setBasis = (basis: RoadConditionBasis) => updateRoute({ basis });
  const route = inputs.routes[active];
  const field = (label: string, key: RoadField, value: number, step: number, scale = 1) => (
    <label>
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={value * scale}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setValue(key, Number(event.target.value) / scale)}
      />
    </label>
  );

  if (!open) {
    return (
      <button type="button" className="road-condition-toggle" onClick={() => setOpen(true)}>
        <Gauge size={13} /> VÍAS & EXPOSICIÓN
      </button>
    );
  }

  const report = calculation.report;
  const checks = report ? Object.entries(report.reconciliation) : [];

  return (
    <aside className="road-condition-panel">
      <header>
        <div>
          <strong>ETAPA 8.12 · CONDICIÓN DE VÍA & EXPOSICIÓN ECONÓMICA</strong>
          <small>RR · velocidad · combustible · neumáticos · mantenimiento · margen</small>
        </div>
        <div>
          <button type="button" onClick={() => void load(true)}><RefreshCw size={14} /></button>
          <button type="button" onClick={() => setOpen(false)}><X size={15} /></button>
        </div>
      </header>

      {loading && <div className="road-condition-message">Evaluando condición de vía por ruta…</div>}
      {(error || calculation.error) && (
        <div className="road-condition-message error">{error ?? calculation.error}</div>
      )}

      <section className="road-condition-controls">
        <div><span>FASE</span><div>{SUPPORTED_PHASES.map((item) => <button type="button" key={item} className={item === phase ? 'active' : ''} onClick={() => setPhase(item)}>F{item}</button>)}</div></div>
        <div><span>LECTURA</span><div><button type="button" className={scope === 'incremental' ? 'active' : ''} onClick={() => setScope('incremental')}>INCREMENTAL</button><button type="button" className={scope === 'cumulative' ? 'active' : ''} onClick={() => setScope('cumulative')}>ACUMULADO</button></div></div>
        <div><span>ALTURA</span><div>{SUPPORTED_BENCH_HEIGHTS.map((item) => <button type="button" key={item} className={item === height ? 'active' : ''} onClick={() => setHeight(item)}>{item} m</button>)}</div></div>
        <div><span>BASE</span><div><button type="button" className={costBasis === 'processing-only' ? 'active' : ''} onClick={() => setCostBasis('processing-only')}>PROCESO</button><button type="button" className={costBasis === 'full-cost' ? 'active' : ''} onClick={() => setCostBasis('full-cost')}>COMPLETO</button></div></div>
      </section>

      <section className="road-condition-route-tabs">
        {ROAD_CONDITION_ROUTE_IDS.map((id) => (
          <button type="button" key={id} className={id === active ? 'active' : ''} onClick={() => setActive(id)}>
            {inputs.haulage.routes[id].label}
          </button>
        ))}
      </section>

      <section className="road-condition-editor">
        <header>
          <div><strong>{inputs.haulage.routes[active].label}</strong><small>{conditionLabel(route.conditionClass)} · {route.basis.toUpperCase()}</small></div>
          <div className="road-condition-presets">
            {PRESET_CLASSES.map((item) => (
              <button type="button" key={item} className={route.conditionClass === item ? `active ${item}` : item} onClick={() => setPreset(item)}>
                {ROAD_CONDITION_PRESETS[item].label}
              </button>
            ))}
          </div>
        </header>
        <div className="road-condition-basis">
          <span>BASE DEL DATO</span>
          <button type="button" className={route.basis === 'dsrl-scenario' ? 'active' : ''} onClick={() => setBasis('dsrl-scenario')}>ESCENARIO DSRL</button>
          <button type="button" className={route.basis === 'field-observation' ? 'active' : ''} onClick={() => setBasis('field-observation')}>OBSERVACIÓN CAMPO</button>
          <button type="button" className={route.basis === 'instrumented' ? 'active' : ''} onClick={() => setBasis('instrumented')}>MEDICIÓN</button>
        </div>
        <div className="road-condition-input-grid">
          {field('RR actual %', 'currentRollingResistancePercent', route.currentRollingResistancePercent, 0.1)}
          {field('RR objetivo %', 'targetRollingResistancePercent', route.targetRollingResistancePercent, 0.1)}
          {field('Vel. cargado %', 'loadedSpeedFactor', route.loadedSpeedFactor, 1, 100)}
          {field('Vel. vacío %', 'emptySpeedFactor', route.emptySpeedFactor, 1, 100)}
          {field('Combustible %', 'fuelBurnFactor', route.fuelBurnFactor, 1, 100)}
          {field('Mantenimiento %', 'maintenanceCostFactor', route.maintenanceCostFactor, 1, 100)}
          {field('Neumáticos %', 'tireCostFactor', route.tireCostFactor, 1, 100)}
          {field('Otros costos %', 'otherCostFactor', route.otherCostFactor, 1, 100)}
          {field('Demora adicional min', 'addedDelayMinutes', route.addedDelayMinutes, 0.1)}
          {field('Confianza %', 'confidence', route.confidence, 5, 100)}
        </div>
      </section>

      {grade === 'unconfirmed' ? (
        <section className="road-condition-gate locked">
          <ShieldCheck size={22} />
          <div><strong>CÁLCULO BLOQUEADO</strong><span>Confirma temporalmente CU = % para heredar la cadena económica.</span></div>
          <button type="button" onClick={() => setGrade('cu-percent')}>CONFIRMAR CU = %</button>
        </section>
      ) : (
        <section className="road-condition-gate active">
          <ShieldCheck size={22} />
          <div><strong>CADENA ECONÓMICA ACTIVA</strong><span>La condición de vía se evalúa contra el objetivo sin cambiar NPVPDEST.</span></div>
          <button type="button" onClick={() => setGrade('unconfirmed')}>REVOCAR</button>
        </section>
      )}

      {report && (
        <>
          <section className="road-condition-summary">
            <div><span>Costo adicional</span><b>{usd(report.totalAdditionalLogisticsCostUsdM)}</b></div>
            <div><span>Erosión margen</span><b>{usd(report.totalMarginErosionUsdM)}</b></div>
            <div><span>Potencial recuperable</span><b>{usd(report.totalRecoverableValuePotentialUsdM)}</b></div>
            <div><span>Combustible extra</span><b>{number(report.totalAdditionalFuelLiters / 1e6)} ML</b></div>
            <div><span>Pérdida capacidad</span><b>{mt(report.totalCapacityLossMt)}</b></div>
            <div><span>Déficit adicional</span><b>{mt(report.totalAdditionalCapacityDeficitMt)}</b></div>
            <div><span>Δ US$/t</span><b>{number(report.weightedUnitCostIncreaseUsdPerTonne)}</b></div>
            <div><span>Ruta crítica</span><b>{report.highestExposureRoute ? inputs.haulage.routes[report.highestExposureRoute].label : 'SIN EXPOSICIÓN'}</b></div>
          </section>

          <section className="road-condition-route-cards">
            {report.exposureRanking.map((id, index) => {
              const impact = report.routeImpacts[id];
              return (
                <article key={id} className={impact.exposureStatus === 'economic-loss' ? 'loss' : impact.exposureStatus === 'economic-gain' ? 'gain' : ''}>
                  <header><strong>#{index + 1} {impact.label}</strong><span>{conditionLabel(impact.conditionClass)}</span></header>
                  <div><span>RR actual / obj.</span><b>{number(impact.currentRollingResistancePercent, 1)} / {number(impact.targetRollingResistancePercent, 1)}%</b></div>
                  <div><span>Δ ciclo</span><b>{number(impact.weightedCycleTimeIncreaseMinutes)} min</b></div>
                  <div><span>Δ costo</span><b>{usd(impact.additionalLogisticsCostUsdM)}</b></div>
                  <div><span>Potencial</span><b>{usd(impact.recoverableValuePotentialUsdM)}</b></div>
                  <div><span>Δ combustible</span><b>{number(impact.additionalFuelLiters / 1e6)} ML</b></div>
                  <div><span>Δ déficit</span><b>{mt(impact.additionalCapacityDeficitMt)}</b></div>
                  <div><span>Confianza</span><b>{pct(impact.confidence)}</b></div>
                  <div><span>Score</span><b>{number(impact.exposureScore, 0)}</b></div>
                </article>
              );
            })}
          </section>

          <section className="road-condition-table">
            <h3>EXPOSICIÓN POR PERIODO</h3>
            <div className="head"><span>P</span><span>Δ costo</span><span>Erosión margen</span><span>Δ combustible</span><span>Δ déficit</span></div>
            {report.periods.map((period) => (
              <div key={period.period}>
                <span>{period.period}</span>
                <span>{usd(period.additionalLogisticsCostUsdM)}</span>
                <span>{usd(period.marginErosionUsdM)}</span>
                <span>{number(period.additionalFuelLiters / 1e6)} ML</span>
                <span>{mt(period.additionalCapacityDeficitMt)}</span>
              </div>
            ))}
          </section>

          <section className="road-condition-components">
            <h3>DESCOMPOSICIÓN DEL COSTO ADICIONAL</h3>
            <div><article><span>Combustible</span><b>{usd(report.totalAdditionalFuelCostUsdM)}</b></article><article><span>Mantenimiento</span><b>{usd(report.totalAdditionalMaintenanceCostUsdM)}</b></article><article><span>Neumáticos</span><b>{usd(report.totalAdditionalTireCostUsdM)}</b></article><article><span>Otros</span><b>{usd(report.totalAdditionalOtherCostUsdM)}</b></article></div>
          </section>

          <section className="road-condition-reconciliation">
            <h3>RECONCILIACIONES</h3>
            <div>{checks.map(([label, pass]) => <span key={label} className={pass ? 'pass' : 'fail'}>{label}<b>{pass ? 'PASS' : 'FAIL'}</b></span>)}</div>
          </section>

          <section className="road-condition-note">
            <TriangleAlert size={18} />
            <div><strong>EXPOSICIÓN MODELADA, NO AHORRO REALIZADO</strong><span>La oportunidad recuperable exige validar intervención, costo, ventana operacional y respuesta de campo. No es VAN, Dispatch, curva OEM ni optimización de mantenimiento.</span></div>
          </section>
        </>
      )}
    </aside>
  );
}
