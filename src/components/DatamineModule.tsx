import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Layers, Upload } from 'lucide-react';
import DataminePhaseViewer, {
  type HoveredGeometry,
  type ViewerColorMode,
} from './DataminePhaseViewer';
import {
  parsePhase6Geometry,
  type PhaseGeometryData,
} from '../utils/datamineParser';
import { Metric, Panel } from './ui';

export default function DatamineModule() {
  const [geometry, setGeometry] = useState<PhaseGeometryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPit, setShowPit] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);
  const [colorMode, setColorMode] = useState<ViewerColorMode>('component');
  const [hovered, setHovered] = useState<HoveredGeometry | null>(null);

  const loadGeometry = async () => {
    setLoading(true);
    setError(null);

    try {
      setGeometry(await parsePhase6Geometry());
    } catch (loadError) {
      setGeometry(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Error desconocido al cargar la geometría.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGeometry();
  }, []);

  return (
    <Panel
      title="Geometría Datamine — Fase 6"
      icon={<Layers size={15} className="text-cyan-400" />}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => void loadGeometry()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          <Upload size={14} />
          {loading ? 'CARGANDO...' : 'RECARGAR DATOS'}
        </button>

        <button
          onClick={() => setShowPit((value) => !value)}
          className={`rounded-md border px-3 py-2 text-xs font-bold ${
            showPit
              ? 'border-amber-500 bg-amber-950/40 text-amber-200'
              : 'border-slate-700 text-slate-500'
          }`}
        >
          PIT
        </button>

        <button
          disabled
          title="La fuente actual no contiene topografía separada"
          className="rounded-md border border-slate-800 px-3 py-2 text-xs font-bold text-slate-600"
        >
          TOPO · SIN DATOS
        </button>

        <button
          disabled
          title="La fuente actual no contiene strings"
          className="rounded-md border border-slate-800 px-3 py-2 text-xs font-bold text-slate-600"
        >
          STRINGS · SIN DATOS
        </button>

        <button
          onClick={() => setShowWireframe((value) => !value)}
          className={`rounded-md border px-3 py-2 text-xs font-bold ${
            showWireframe
              ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
              : 'border-slate-700 text-slate-400'
          }`}
        >
          WIREFRAME
        </button>

        <select
          value={colorMode}
          onChange={(event) =>
            setColorMode(event.target.value as ViewerColorMode)
          }
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300"
        >
          <option value="component">Color por componente</option>
          <option value="elevation">Color por elevación</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <div>
            <div className="font-black">
              No fue posible cargar la geometría Datamine
            </div>
            <div className="mt-1 text-xs text-rose-300/80">{error}</div>
            <div className="mt-2 text-xs text-slate-400">
              Verifica que los dos CSV estén dentro de{' '}
              <code>public/data</code>.
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="h-[520px] overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm font-bold text-cyan-300">
              Procesando puntos y triángulos reales...
            </div>
          ) : (
            <DataminePhaseViewer
              geometryData={geometry}
              showTopography={false}
              showPit={showPit}
              showStrings={false}
              showWireframe={showWireframe}
              colorMode={colorMode}
              phaseStep={6}
              economicMetrics={{
                npv: 0,
                reserves: 0,
                grade: 0,
                stripRatio: 0,
              }}
              onTriangleHover={setHovered}
            />
          )}
        </div>

        <div className="space-y-3">
          {geometry ? (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-3 text-xs font-bold text-emerald-300">
                <CheckCircle2 size={16} />
                {geometry.validation.status.toUpperCase()}
              </div>
              <Metric
                label="Puntos"
                value={geometry.validation.stats.totalPoints.toLocaleString()}
                tone="blue"
              />
              <Metric
                label="Triángulos"
                value={geometry.validation.stats.totalTriangles.toLocaleString()}
              />
              <Metric
                label="PID inválidos"
                value={geometry.validation.stats.invalidPIDs.toLocaleString()}
                tone="amber"
              />

              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 font-mono text-[11px] leading-6 text-slate-400">
                <div>
                  X: {geometry.bounds.minX.toFixed(2)} –{' '}
                  {geometry.bounds.maxX.toFixed(2)}
                </div>
                <div>
                  Y: {geometry.bounds.minY.toFixed(2)} –{' '}
                  {geometry.bounds.maxY.toFixed(2)}
                </div>
                <div>
                  Z: {geometry.bounds.minZ.toFixed(2)} –{' '}
                  {geometry.bounds.maxZ.toFixed(2)}
                </div>
              </div>

              {hovered && (
                <div className="rounded-lg border border-cyan-900/60 bg-cyan-950/20 p-3 font-mono text-xs text-cyan-200">
                  <div className="mb-1 font-black">{hovered.group}</div>
                  <div>Triángulo: {hovered.triangleId}</div>
                  <div>Este: {hovered.easting.toFixed(2)}</div>
                  <div>Norte: {hovered.northing.toFixed(2)}</div>
                  <div>Elevación: {hovered.elevation.toFixed(2)}</div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-500">
              La geometría aparecerá aquí cuando los CSV estén disponibles.
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
