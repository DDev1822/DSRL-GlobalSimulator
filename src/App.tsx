import { useMemo, useState } from 'react';
import {
  BarChart3,
  Cpu,
  Database,
  Factory,
  Mountain,
  RotateCcw,
  Settings,
} from 'lucide-react';
import ConceptualPit from './components/ConceptualPit';
import DatamineModule from './components/DatamineModule';
import SensitivityChart from './components/SensitivityChart';
import { Metric, Panel, Slider } from './components/ui';
import { calculateOptimization } from './lib/economics';

type PitMode = 'conceptual' | 'datamine';

export default function App() {
  const [mode, setMode] = useState<PitMode>('conceptual');
  const [discountRate, setDiscountRate] = useState(8);
  const [millCapacity, setMillCapacity] = useState(40);
  const [mineCapacity, setMineCapacity] = useState(100);
  const [stripRatio, setStripRatio] = useState(1.5);
  const [mineRecovery, setMineRecovery] = useState(95);
  const [plantRecovery, setPlantRecovery] = useState(88);

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

  const resetParameters = () => {
    setDiscountRate(8);
    setMillCapacity(40);
    setMineCapacity(100);
    setStripRatio(1.5);
    setMineRecovery(95);
    setPlantRecovery(88);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-emerald-500/40 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-slate-950">
              <Mountain size={22} />
            </div>
            <div>
              <h1 className="font-black tracking-wider text-emerald-300">
                DSRL GLOBAL SIMULATOR
              </h1>
              <p className="text-[11px] text-slate-500">
                Cut-off Optimization + Datamine Geometry
              </p>
            </div>
          </div>

          <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setMode('conceptual')}
              className={`rounded-md px-4 py-2 text-xs font-bold ${
                mode === 'conceptual'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400'
              }`}
            >
              CONCEPTUAL
            </button>
            <button
              onClick={() => setMode('datamine')}
              className={`rounded-md px-4 py-2 text-xs font-bold ${
                mode === 'datamine'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400'
              }`}
            >
              DATAMINE
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1920px] grid-cols-1 gap-4 p-4 xl:grid-cols-[280px_minmax(620px,1fr)_300px]">
        <aside className="space-y-4">
          <Panel
            title="Valores críticos"
            icon={<Database size={15} className="text-emerald-400" />}
          >
            <div className="grid gap-3">
              <Metric
                label="Breakeven cut-off"
                value={`${results.breakeven.toFixed(3)} % Cu`}
                tone="amber"
              />
              <Metric
                label="Optimal cut-off"
                value={`${results.best?.cutoff.toFixed(3) ?? '0.000'} % Cu`}
              />
            </div>
          </Panel>

          <Panel
            title="KPI financieros"
            icon={<BarChart3 size={15} className="text-emerald-400" />}
          >
            <div className="grid gap-3">
              <Metric
                label="VAN máximo"
                value={`$${Math.round(results.best?.npv ?? 0).toLocaleString()} M`}
              />
              <div className="grid grid-cols-2 gap-3">
                <Metric
                  label="TIR"
                  value={`${results.best?.irr?.toFixed(1) ?? 'N/A'} %`}
                  tone="blue"
                />
                <Metric
                  label="LOM"
                  value={`${results.best?.lifeOfMine ?? 0} años`}
                  tone="slate"
                />
              </div>
            </div>
          </Panel>

          <Panel
            title="Recuperaciones"
            icon={<Settings size={15} className="text-emerald-400" />}
          >
            <div className="space-y-5">
              <Slider
                label="Recuperación mina"
                value={mineRecovery}
                min={80}
                max={100}
                step={1}
                suffix="%"
                onChange={setMineRecovery}
              />
              <Slider
                label="Recuperación planta"
                value={plantRecovery}
                min={70}
                max={95}
                step={1}
                suffix="%"
                onChange={setPlantRecovery}
              />
            </div>
          </Panel>
        </aside>

        <div className="space-y-4">
          <Panel
            title="Análisis de sensibilidad"
            icon={<BarChart3 size={15} className="text-emerald-400" />}
          >
            <div className="min-h-[320px] rounded-lg border border-slate-800 bg-slate-950/70">
              <SensitivityChart data={results.data} />
            </div>
          </Panel>

          {mode === 'conceptual' ? (
            <ConceptualPit results={results} />
          ) : (
            <DatamineModule />
          )}
        </div>

        <aside className="space-y-4">
          <Panel
            title="Parámetros de control"
            icon={<Cpu size={15} className="text-emerald-400" />}
          >
            <div className="space-y-5">
              <Slider
                label="Capacidad mina"
                value={mineCapacity}
                min={30}
                max={250}
                step={5}
                suffix="Mt/a"
                onChange={setMineCapacity}
              />
              <Slider
                label="Capacidad planta"
                value={millCapacity}
                min={10}
                max={85}
                step={5}
                suffix="Mt/a"
                onChange={setMillCapacity}
              />
              <Slider
                label="Strip ratio"
                value={stripRatio}
                min={0.4}
                max={5.5}
                step={0.1}
                suffix=": 1"
                onChange={setStripRatio}
              />
              <Slider
                label="Tasa de descuento"
                value={discountRate}
                min={5}
                max={15}
                step={0.5}
                suffix="%"
                onChange={setDiscountRate}
              />
            </div>
          </Panel>

          <Panel
            title="Estructura de costos"
            icon={<Factory size={15} className="text-emerald-400" />}
          >
            <div className="grid gap-3">
              <Metric
                label="CAPEX"
                value={`$${Math.round(results.dynamicCapex)} M`}
                tone="violet"
              />
              <Metric
                label="OPEX mina"
                value={`$${results.miningOpex.toFixed(2)} /t`}
                tone="blue"
              />
              <Metric
                label="OPEX planta"
                value={`$${results.processingOpex.toFixed(2)} /t`}
                tone="amber"
              />
              <Metric
                label="Producción efectiva"
                value={`${results.production.toFixed(1)} Mt/a`}
              />
            </div>
          </Panel>

          <button
            onClick={resetParameters}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-black text-slate-300 hover:border-emerald-600 hover:text-emerald-300"
          >
            <RotateCcw size={15} />
            RESTABLECER PARÁMETROS
          </button>
        </aside>
      </main>
    </div>
  );
}
