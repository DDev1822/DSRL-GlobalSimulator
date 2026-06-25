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
  Target,
  Zap,
} from 'lucide-react';
import EconomicCurve from './components/EconomicCurve';
import PitWorkspace from './components/PitWorkspace';
import { calculateOptimization } from './engine/economicModel';
import {
  parsePhase6Geometry,
  type PhaseGeometryData,
} from './utils/datamineParser';

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [discountRate, setDiscountRate] = useState(0.08);
  const [millCapacity, setMillCapacity] = useState(40);
  const [mineCapacity, setMineCapacity] = useState(100);
  const [stripRatio, setStripRatio] = useState(1.5);
  const [mineRecovery, setMineRecovery] = useState(0.95);
  const [plantRecovery, setPlantRecovery] = useState(0.88);
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
    () =>
      calculateOptimization({
        discountRate,
        millCapacity,
        mineCapacity,
        stripRatio,
        mineRecovery,
        plantRecovery,
      }),
    [
      discountRate,
      millCapacity,
      mineCapacity,
      stripRatio,
      mineRecovery,
      plantRecovery,
    ],
  );

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error('No se pudo cambiar el modo de pantalla completa.', error);
    }
  };

  const economicMetrics = {
    npv: results.maxVAN,
    reserves: results.bestScenario.tonnage,
    grade: results.bestScenario.grade,
    stripRatio,
  };

  return (
    <div className="app-shell">
      <style>{APP_STYLES}</style>

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
          <button type="button" onClick={toggleFullscreen}>
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
            <ProgressMetric label="ORE TONNAGE" value={`${results.bestScenario.tonnage.toFixed(0)} Mt`} progress={results.bestScenario.tonnage / 1000} tone="cyan" />
            <ProgressMetric label="HEAD GRADE" value={`${results.bestScenario.grade.toFixed(3)} %`} progress={results.bestScenario.grade / 1.5} tone="yellow" />
            <ProgressMetric label="METAL CONTENT" value={`${results.bestScenario.metal.toFixed(2)} Mt`} progress={results.bestScenario.metal / 10} tone="green" />
          </Panel>

          <Panel icon={<Gauge size={13} />} title="RECOVERY RATES" grow>
            <Slider
              label="REC. MINADO"
              value={mineRecovery}
              min={0.85}
              max={1}
              step={0.01}
              display={`${(mineRecovery * 100).toFixed(0)} %`}
              onChange={setMineRecovery}
            />
            <Slider
              label="REC. METALÚRGICA"
              value={plantRecovery}
              min={0.75}
              max={0.95}
              step={0.01}
              display={`${(plantRecovery * 100).toFixed(0)} %`}
              onChange={setPlantRecovery}
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
          <Panel icon={<Settings2 size={13} />} title="CONTROL PARAMETERS" grow>
            <Slider label="MINE CAP." value={mineCapacity} min={50} max={200} step={10} display={`${mineCapacity} Mt/a`} onChange={setMineCapacity} />
            <Slider label="PLANT CAP." value={millCapacity} min={10} max={85} step={5} display={`${millCapacity} Mt/a`} onChange={setMillCapacity} />
            <Slider label="STRIP RATIO" value={stripRatio} min={0.4} max={5.5} step={0.1} display={`${stripRatio.toFixed(1)} : 1`} onChange={setStripRatio} />
            <Slider label="DISCOUNT RATE" value={discountRate} min={0.05} max={0.15} step={0.005} display={`${(discountRate * 100).toFixed(1)} %`} onChange={setDiscountRate} />
          </Panel>

          <Panel icon={<Expand size={13} />} title="COST STRUCTURE & SYSTEM STATUS">
            <div className="cost-grid">
              <Metric label="CAPEX" value={`$${results.dynamicCAPEX.toFixed(0)}M`} tone="purple" />
              <Metric label="MINE OPEX" value={`$${results.miningOpex.toFixed(2)}/t`} tone="cyan" />
              <Metric label="PLANT OPEX" value={`$${results.processingOpex.toFixed(2)}/t`} tone="yellow" />
              <Metric label="PRODUCTION" value={`${results.effectiveProductionRate.toFixed(1)} Mt/a`} tone="green" />
            </div>
            <div className="constraint"><CheckCircle2 size={13} /> {results.effectiveProductionRate >= millCapacity * 0.95 ? 'MILL CONSTRAINT' : 'MINE CONSTRAINT'}</div>
          </Panel>

          <Panel icon={<Zap size={13} />} title="QUICK ACTIONS">
            <button className="action primary" type="button">EXPORT REPORT</button>
            <button className="action" type="button">SAVE SCENARIO</button>
            <button className="action" type="button">RESET DEFAULT</button>
          </Panel>

          <Panel icon={<Activity size={13} />} title="SYSTEM STATUS">
            <div className="system-lines">
              <span>Engine:<b>Lane v2.1</b></span>
              <span>Geometry:<b>DATAMINE</b></span>
              <span>Triangles:<b>{geometry?.validation.stats.totalTriangles.toLocaleString() ?? '—'}</b></span>
              <span>Precision:<b>0.01%</b></span>
            </div>
          </Panel>
        </aside>
      </main>
    </div>
  );
}

function Panel({
  icon,
  title,
  children,
  grow = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  grow?: boolean;
}) {
  return (
    <section className={`rail-panel ${grow ? 'grow' : ''}`}>
      <div className="rail-title"><span>{icon}{title}</span></div>
      <div className="rail-content">{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className={`metric tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProgressMetric({
  label,
  value,
  progress,
  tone,
}: {
  label: string;
  value: string;
  progress: number;
  tone: string;
}) {
  return (
    <div className={`progress-metric tone-${tone}`}>
      <div><span>{label}</span><strong>{value}</strong></div>
      <i><b style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }} /></i>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider-field">
      <span><b>{label}</b><strong>{display}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

const APP_STYLES = `
  * { box-sizing: border-box; }
  html, body, #root { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #08182d; }
  button, input, select { font: inherit; }
  .app-shell { width: 100vw; height: 100vh; overflow: hidden; background: linear-gradient(180deg,#142a49 0,#0b1d34 100%); color: #e8f2ff; font-family: Inter, Segoe UI, sans-serif; }
  .topbar { height: 49px; display:flex; align-items:center; justify-content:space-between; padding:0 12px; border-bottom:2px solid #28e6dc; background:#203a5f; }
  .brand-block,.topbar-actions,.brand-block>div,.online,.topbar-actions span,.topbar-actions button { display:flex; align-items:center; }
  .brand-block { gap:10px; }
  .brand-icon { width:30px;height:30px;justify-content:center;background:#31e6d7;color:#062036;border-radius:3px; }
  .brand-title { font-weight:900; color:#35eee0; font-size:13px; letter-spacing:.3px; }
  .brand-subtitle { font-size:7px; color:#b4c7df; margin-top:1px; }
  .divider { width:1px;height:26px;background:#86a4c7;opacity:.55; }
  .online { gap:6px;color:#35eee0;font-size:8px;font-weight:800; }
  .online i { width:7px;height:7px;border-radius:50%;background:#35eee0;box-shadow:0 0 9px #35eee0; }
  .topbar-actions { gap:14px;font-size:8px;color:#c3d4e8; }
  .topbar-actions span { gap:5px; }
  .topbar-actions button { gap:6px;padding:7px 12px;background:#29486f;border:1px solid #6f91b8;color:#62f4e8;border-radius:3px;font-size:8px;font-weight:800;cursor:pointer; }
  .dashboard-grid { height:calc(100vh - 49px); display:grid; grid-template-columns:180px minmax(0,1fr) 205px; gap:7px; padding:7px; overflow:hidden; }
  .left-rail,.right-rail { display:flex;flex-direction:column;gap:7px;min-height:0; }
  .center-stage { display:grid;grid-template-rows:minmax(250px,42%) minmax(330px,58%);gap:7px;min-width:0;min-height:0; }
  .rail-panel,.hero-panel { background:linear-gradient(180deg,#27476f,#1b3557);border:1px solid #6d89aa;border-radius:5px;box-shadow:inset 0 0 0 1px rgba(7,24,45,.5);overflow:hidden;min-height:0; }
  .rail-panel { display:flex;flex-direction:column; }
  .rail-panel.grow { flex:1; }
  .rail-title,.section-heading { height:29px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;border-bottom:1px solid #7591b3;background:#294a74;font-size:8px;font-weight:900; }
  .rail-title span,.section-heading span { display:flex;align-items:center;gap:6px; }
  .section-heading small { color:#43eee0;font-size:7px; }
  .rail-content { display:flex;flex-direction:column;gap:7px;padding:7px;min-height:0; }
  .metric { background:#183252;border:1px solid #527095;border-radius:3px;padding:8px;min-width:0; }
  .metric span { display:block;font-size:6px;color:#b5c8df;font-weight:800;margin-bottom:5px; }
  .metric strong { display:block;font-family:Consolas,monospace;font-size:12px;white-space:nowrap; }
  .metric-pair,.cost-grid { display:grid;grid-template-columns:1fr 1fr;gap:6px; }
  .tone-yellow strong { color:#ffe02e; }.tone-cyan strong { color:#3ff6ef; }.tone-blue strong { color:#65c9ff; }.tone-green strong { color:#3de7b4; }.tone-purple strong { color:#e188ff; }.tone-neutral strong { color:#e7effa; }
  .progress-metric { padding:7px;background:#183252;border:1px solid #527095;border-radius:3px; }
  .progress-metric>div { display:flex;justify-content:space-between;gap:4px;font-size:7px;font-weight:800; }
  .progress-metric strong { font-family:Consolas,monospace; }
  .progress-metric i { display:block;height:3px;background:#24415f;margin-top:7px;overflow:hidden; }
  .progress-metric i b { display:block;height:100%;background:#3ff6ef; }
  .slider-field { display:block;padding:4px 0 7px; }
  .slider-field span { display:flex;justify-content:space-between;font-size:7px;margin-bottom:7px; }
  .slider-field strong { color:#f4f8ff;font-family:Consolas,monospace; }
  input[type=range] { width:100%;accent-color:#31e6d7;cursor:pointer; }
  .hero-panel { display:flex;flex-direction:column; }
  .hero-panel>.curve-workspace,.hero-panel>.pit-workspace { flex:1;min-height:0; }
  .heading-badges { display:flex;gap:6px; }
  .heading-badges b { padding:3px 7px;border:1px solid #6685aa;border-radius:3px;font-size:7px;color:#bfeeff;background:#153252; }
  .curve-workspace,.pit-workspace { display:grid;grid-template-columns:225px minmax(0,1fr);gap:0;background:#081b32;min-width:0;min-height:0; }
  .curve-sidecard,.pit-sidecard { padding:10px;border-right:1px solid #7691ae;background:linear-gradient(180deg,#24456e,#172f4e);overflow:auto; }
  .sidecard-eyebrow { color:#52f4e8;font-size:7px;font-weight:900; }
  .sidecard-title { font-size:11px;font-weight:900;margin:6px 0; }
  .sidecard-copy { font-size:7px;line-height:1.45;color:#c5d3e5;margin:0 0 9px; }
  .curve-legend { display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px; }
  .curve-legend span { display:flex;align-items:center;gap:5px;padding:4px;border:1px solid #6783a6;border-radius:3px;font-size:7px;font-weight:800; }
  .dot { width:7px;height:7px;border-radius:50%; }.dot.ton{background:#67c8ff}.dot.grade{background:#fde047}.dot.npv{background:#2dd4bf}
  .live-values,.pit-stats,.phase-economics,.hover-readout { display:flex;flex-direction:column;gap:4px; }
  .live-values div,.pit-stats div,.phase-economics div,.hover-readout div { display:flex;justify-content:space-between;gap:8px;padding:5px 6px;background:#173351;border:1px solid #4f6e93;border-radius:2px;font-size:7px; }
  .live-values strong,.pit-stats strong,.phase-economics strong,.hover-readout strong { font-family:Consolas,monospace;color:#eaf7ff; }
  .curve-canvas { min-width:0;min-height:0;background:#071a31;padding:5px; }
  .curve-canvas svg { width:100%;height:100%;display:block; }
  .field-label { display:block;margin:9px 0 4px;font-size:7px;font-weight:900;color:#b8cce2; }
  .field-select,.phase-toolbar select { width:100%;padding:6px;background:#173452;color:#eef7ff;border:1px solid #7a96b7;border-radius:3px;font-size:8px; }
  .layer-note { margin:5px 0 8px;color:#9db6d1;font-size:6px;line-height:1.35; }
  .compact-button,.action { border:1px solid #6f8fb2;background:#24466d;color:#eaf4ff;border-radius:3px;padding:7px;font-size:7px;font-weight:900;cursor:pointer; }
  .compact-button.active,.action.primary { background:#29e6d7;color:#062138;border-color:#29e6d7; }
  .hover-readout { margin-top:8px; }
  .hover-title { color:#52f4e8;font-size:7px;font-weight:900;margin-bottom:3px; }
  .hover-readout p { font-size:6px;line-height:1.4;color:#a8bdd4;margin:0; }
  .pit-view-column { display:grid;grid-template-rows:minmax(0,1fr) 44px;min-width:0;min-height:0; }
  .pit-viewer-shell,.datamine-canvas { width:100%;height:100%;min-height:0;background:#071a31;position:relative; }
  .viewer-empty,.viewer-state { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;color:#a8bdd4;font-size:10px; }
  .error-state { color:#ffb4b4;padding:20px;text-align:center; }.error-state button{padding:6px 10px;background:#5b2333;color:white;border:1px solid #ff8b9c;border-radius:3px;cursor:pointer;}
  .phase-toolbar { display:grid;grid-template-columns:30px 30px 30px 30px minmax(220px,1fr) minmax(150px,.9fr) 72px;gap:5px;align-items:center;padding:5px 7px;border-top:1px solid #6f8dad;background:#1d3a5d; }
  .phase-toolbar>button,.phase-buttons button { height:28px;border:1px solid #6a89ac;background:#24476f;color:#dceaff;border-radius:3px;cursor:pointer; }
  .phase-toolbar>button.active,.phase-buttons button.selected { background:#2ce5d7;color:#062238;border-color:#2ce5d7; }
  .phase-buttons { display:grid;grid-template-columns:repeat(6,1fr);gap:4px; }
  .phase-toolbar input { min-width:0; }
  .constraint { display:flex;align-items:center;gap:5px;margin-top:7px;padding:6px;border:1px solid #1d977f;background:#174d52;color:#51f0d2;font-size:7px;font-weight:900; }
  .action { width:100%;margin-bottom:5px; }
  .system-lines { display:flex;flex-direction:column;gap:4px;font-size:7px;color:#b6c8dc; }
  .system-lines span { display:flex;justify-content:space-between; }.system-lines b{color:#46ede0;font-family:Consolas,monospace;}
  @media (max-width:1200px), (max-height:720px) {
    html,body,#root { overflow:auto; }
    .app-shell { height:auto;min-height:100vh;overflow:visible; }
    .dashboard-grid { height:auto;grid-template-columns:1fr;overflow:visible; }
    .left-rail,.right-rail { display:grid;grid-template-columns:repeat(2,minmax(0,1fr)); }
    .center-stage { grid-template-rows:420px 560px; }
  }
`;
