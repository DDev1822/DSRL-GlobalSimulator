import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  DollarSign,
  Expand,
  Gauge,
  Layers3,
  Maximize2,
  Minimize2,
  Mountain,
  Radio,
  Settings2,
  SlidersHorizontal,
  Target,
  Zap,
} from 'lucide-react';
import './styles/app-shell.css';
import EconomicControlDeck from './components/EconomicControlDeck';
import EconomicCurve from './components/EconomicCurve';
import PitWorkspace from './components/PitWorkspace';
import {
  calculateOptimization,
  createEconomicInputs,
  DEFAULT_ECONOMIC_INPUTS,
  validateEconomicInputs,
  type EconomicInputKey,
  type EconomicInputs,
} from './engine/economicModel';
import {
  parsePhase6Geometry,
  type PhaseGeometryData,
} from './utils/datamineParser';

const ECONOMIC_STORAGE_KEY = 'dsrl-global-simulator:economic-scenario:v1';

function loadInitialEconomicInputs(): EconomicInputs {
  if (typeof window === 'undefined') return createEconomicInputs();

  try {
    const stored = window.localStorage.getItem(ECONOMIC_STORAGE_KEY);
    if (!stored) return createEconomicInputs();
    const parsed = JSON.parse(stored) as Partial<EconomicInputs>;
    const candidate = createEconomicInputs(parsed);
    return validateEconomicInputs(candidate).valid
      ? candidate
      : createEconomicInputs();
  } catch {
    return createEconomicInputs();
  }
}

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlDeckOpen, setControlDeckOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [economicInputs, setEconomicInputs] = useState<EconomicInputs>(
    loadInitialEconomicInputs,
  );
  const [geometry, setGeometry] = useState<PhaseGeometryData | null>(null);
  const [loadingGeometry, setLoadingGeometry] = useState(true);
  const [geometryError, setGeometryError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const listener = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', listener);
    return () => document.removeEventListener('fullscreenchange', listener);
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingGeometry(true);
    setGeometryError(null);

    parsePhase6Geometry()
      .then((data) => {
        if (!active) return;
        setGeometry(data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setGeometry(null);
        setGeometryError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la geometría Datamine.',
        );
      })
      .finally(() => {
        if (active) setLoadingGeometry(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const results = useMemo(
    () => calculateOptimization(economicInputs),
    [economicInputs],
  );

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error('No se pudo cambiar el modo de pantalla completa.', error);
    }
  };

  const changeEconomicInput = (
    field: EconomicInputKey,
    value: number,
  ) => {
    setEconomicInputs((current) => ({ ...current, [field]: value }));
    setSavedAt(null);
  };

  const saveScenario = () => {
    window.localStorage.setItem(
      ECONOMIC_STORAGE_KEY,
      JSON.stringify(economicInputs),
    );
    setSavedAt(new Date());
  };

  const resetScenario = () => {
    setEconomicInputs({ ...DEFAULT_ECONOMIC_INPUTS });
    window.localStorage.removeItem(ECONOMIC_STORAGE_KEY);
    setSavedAt(null);
  };

  const economicMetrics = {
    npv: results.maxVAN,
    reserves: results.bestScenario.tonnage,
    grade: results.bestScenario.grade,
    stripRatio: economicInputs.stripRatio,
  };

  const maxRecoverableResource =
    economicInputs.maxResourceMt * economicInputs.mineRecovery;
  const maximumMetalReference =
    maxRecoverableResource *
    (Math.max(economicInputs.baseGradePercent, results.bestScenario.grade) / 100) *
    economicInputs.plantRecovery;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-icon"><Mountain size={21} /></div>
          <div>
            <div className="brand-title">DISPATCH SYSTEM</div>
            <div className="brand-subtitle">Lane Cut-off Optimization Engine · Datamine Geometry</div>
          </div>
          <span className="divider" />
          <span className="online"><i /> SYSTEM ONLINE</span>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className={controlDeckOpen ? 'active' : ''}
            onClick={() => setControlDeckOpen((value) => !value)}
            aria-expanded={controlDeckOpen}
            aria-controls="economic-control-deck"
            aria-label={controlDeckOpen ? 'Cerrar panel de control económico' : 'Abrir panel de control económico'}
          >
            <SlidersHorizontal size={13} /> CONTROL DECK
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Activar pantalla completa'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            {isFullscreen ? 'SALIR DE PANTALLA COMPLETA' : 'PANTALLA COMPLETA'}
          </button>
          <span><Radio size={12} /> REAL-TIME</span>
          <span><Clock3 size={12} /> {currentTime.toLocaleTimeString()}</span>
          <span>{currentTime.toLocaleDateString()}</span>
        </div>
      </header>

      <main className="dashboard-grid">
        <aside className="left-rail">
          <Panel icon={<Target size={13} />} title="CRITICAL VALUES">
            <Metric label="BREAKEVEN CUT-OFF" value={`${results.breakeven.toFixed(3)} % Cu`} tone="yellow" />
            <Metric label="OPTIMAL CUT-OFF" value={`${results.optimalCutoff.toFixed(3)} % Cu`} tone="cyan" />
          </Panel>

          <Panel icon={<DollarSign size={13} />} title="FINANCIAL KPIs">
            <Metric label="NET PRESENT VALUE" value={`$${results.maxVAN.toFixed(0)} M USD`} tone="cyan" />
            <div className="metric-pair">
              <Metric label="IRR" value={`${results.finalTir.toFixed(1)} %`} tone="blue" />
              <Metric label="LOM" value={`${results.bestScenario.lifeOfMine} y`} tone="neutral" />
            </div>
          </Panel>

          <Panel icon={<Database size={13} />} title="RESOURCES">
            <ProgressMetric
              label="ORE TONNAGE"
              value={`${results.bestScenario.tonnage.toFixed(0)} Mt`}
              progress={results.bestScenario.tonnage / Math.max(maxRecoverableResource, 1)}
              tone="cyan"
            />
            <ProgressMetric
              label="HEAD GRADE"
              value={`${results.bestScenario.grade.toFixed(3)} %`}
              progress={results.bestScenario.grade / Math.max(results.maximumEvaluatedCutoff, 0.01)}
              tone="yellow"
            />
            <ProgressMetric
              label="METAL CONTENT"
              value={`${results.bestScenario.metal.toFixed(2)} Mt`}
              progress={results.bestScenario.metal / Math.max(maximumMetalReference, 0.01)}
              tone="green"
            />
          </Panel>

          <Panel icon={<Gauge size={13} />} title="RECOVERY RATES" grow>
            <Slider
              label="REC. MINADO"
              value={economicInputs.mineRecovery}
              min={0.85}
              max={1}
              step={0.01}
              display={`${(economicInputs.mineRecovery * 100).toFixed(0)} %`}
              onChange={(value) => changeEconomicInput('mineRecovery', value)}
            />
            <Slider
              label="REC. METALÚRGICA"
              value={economicInputs.plantRecovery}
              min={0.75}
              max={0.95}
              step={0.01}
              display={`${(economicInputs.plantRecovery * 100).toFixed(0)} %`}
              onChange={(value) => changeEconomicInput('plantRecovery', value)}
            />
          </Panel>
        </aside>

        <section className="center-stage">
          <section className="hero-panel curve-panel">
            <div className="section-heading">
              <span><BarChart3 size={14} /> SENSITIVITY ANALYSIS</span>
              <div className="heading-badges">
                <b>TON</b><b>LEY</b><b>VAN</b><b>TIR {results.finalTir.toFixed(1)}%</b>
              </div>
            </div>
            <EconomicCurve results={results} />
          </section>

          <section className="hero-panel pit-panel">
            <div className="section-heading">
              <span><Layers3 size={14} /> PIT DATAMINE — GEOMETRÍA, EVOLUCIÓN Y VALOR</span>
              <small>{geometry?.validation.status === 'valid' ? 'DATOS VALIDADOS' : 'LECTURA CONTROLADA'}</small>
            </div>
            <PitWorkspace
              geometry={geometry}
              loading={loadingGeometry}
              error={geometryError}
              economicMetrics={economicMetrics}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </section>
        </section>

        <aside className="right-rail">
          <Panel icon={<Settings2 size={13} />} title="ECONOMIC SCENARIO" grow>
            <Metric
              label="METAL PRICE"
              value={`$${economicInputs.metalPriceUsdPerTonne.toLocaleString()} /t`}
              tone="cyan"
            />
            <Metric
              label="MAX RESOURCE"
              value={`${economicInputs.maxResourceMt.toFixed(0)} Mt`}
              tone="blue"
            />
            <div className="metric-pair">
              <Metric label="WACC" value={`${(economicInputs.wacc * 100).toFixed(1)} %`} tone="yellow" />
              <Metric label="PRODUCTION" value={`${economicInputs.annualProductionMt.toFixed(0)} Mt/a`} tone="green" />
            </div>
            <button className="action primary" type="button" onClick={() => setControlDeckOpen(true)}>
              ABRIR CONTROL DECK
            </button>
          </Panel>

          <Panel icon={<Expand size={13} />} title="COST STRUCTURE & SYSTEM STATUS">
            <div className="cost-grid">
              <Metric label="CAPEX" value={`$${results.dynamicCAPEX.toFixed(0)}M`} tone="purple" />
              <Metric label="MINE OPEX" value={`$${results.miningOpex.toFixed(2)}/t`} tone="cyan" />
              <Metric label="PLANT OPEX" value={`$${results.processingOpex.toFixed(2)}/t`} tone="yellow" />
              <Metric label="TOTAL OPEX" value={`$${results.totalOpexPerTon.toFixed(2)}/t`} tone="green" />
            </div>
            <div className="constraint">
              <CheckCircle2 size={13} /> PARAMETRIC ENGINE · {results.validation.warnings.length} WARNINGS
            </div>
          </Panel>

          <Panel icon={<Zap size={13} />} title="QUICK ACTIONS">
            <button className="action primary" type="button">EXPORT REPORT</button>
            <button className="action" type="button" onClick={saveScenario}>SAVE SCENARIO</button>
            <button className="action" type="button" onClick={resetScenario}>RESET DEFAULT</button>
          </Panel>

          <Panel icon={<Activity size={13} />} title="SYSTEM STATUS">
            <div className="system-lines">
              <span>Engine:<b>Lane Parametric v3</b></span>
              <span>Geometry:<b>DATAMINE</b></span>
              <span>Triangles:<b>{geometry?.validation.stats.totalTriangles.toLocaleString() ?? '—'}</b></span>
              <span>Precision:<b>{economicInputs.cutoffStepPercent.toFixed(2)}%</b></span>
            </div>
          </Panel>
        </aside>
      </main>

      <EconomicControlDeck
        open={controlDeckOpen}
        inputs={economicInputs}
        validation={results.validation}
        breakeven={results.breakeven}
        optimalCutoff={results.optimalCutoff}
        maxVAN={results.maxVAN}
        savedAt={savedAt}
        onClose={() => setControlDeckOpen(false)}
        onChange={changeEconomicInput}
        onSave={saveScenario}
        onReset={resetScenario}
      />
    </div>
  );
}

function Panel({ icon, title, children, grow = false }: { icon: React.ReactNode; title: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <section className={`rail-panel ${grow ? 'grow' : ''}`}>
      <div className="rail-title"><span>{icon}{title}</span></div>
      <div className="rail-content">{children}</div>
    </section>
  );
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`metric tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProgressMetric({ label, value, progress, tone }: { label: string; value: string; progress: number; tone: string }) {
  return (
    <div className={`progress-metric tone-${tone}`}>
      <div><span>{label}</span><strong>{value}</strong></div>
      <i><b style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }} /></i>
    </div>
  );
}

function Slider({ label, value, min, max, step, display, onChange }: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (value: number) => void }) {
  return (
    <label className="slider-field">
      <span><b>{label}</b><strong>{display}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
