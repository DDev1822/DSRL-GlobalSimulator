import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Layers,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import DataminePhaseViewer, {
  type HoveredGeometry,
  type ViewerColorMode,
  type ViewerEconomicMetrics,
} from './DataminePhaseViewer';
import type { PhaseGeometryData } from '../utils/datamineParser';

interface PitWorkspaceProps {
  geometry: PhaseGeometryData | null;
  loading: boolean;
  error: string | null;
  economicMetrics: ViewerEconomicMetrics;
  onRetry: () => void;
}

const LAYERS: Array<{ value: ViewerColorMode; label: string; note: string }> = [
  { value: 'component', label: 'Componente', note: 'Color geométrico base del pit.' },
  { value: 'phase', label: 'Fase visual', note: 'Banda cromática según el avance F1–F6.' },
  { value: 'elevation', label: 'Elevación', note: 'Gradiente espacial basado en coordenada Z.' },
  { value: 'van_cumulative', label: 'VAN acumulado', note: 'Capa analítica vinculada al VAN global y profundidad.' },
  { value: 'van_incremental', label: 'VAN incremental', note: 'Capa divergente para lectura marginal visual.' },
  { value: 'reserves', label: 'Reservas', note: 'Intensidad relativa por avance geométrico.' },
  { value: 'grade', label: 'Ley media', note: 'Proxy visual condicionado por la ley global disponible.' },
  { value: 'strip_ratio', label: 'Strip ratio', note: 'Proxy visual condicionado por profundidad y relación estéril/mineral.' },
];

export default function PitWorkspace({
  geometry,
  loading,
  error,
  economicMetrics,
  onRetry,
}: PitWorkspaceProps) {
  const [phaseStep, setPhaseStep] = useState(6);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);
  const [colorMode, setColorMode] = useState<ViewerColorMode>('component');
  const [wireframe, setWireframe] = useState(false);
  const [hovered, setHovered] = useState<HoveredGeometry | null>(null);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setPhaseStep((current) => {
        if (current >= 6) {
          setPlaying(false);
          return 6;
        }
        return current + 1;
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [playing, speed]);

  const layer = LAYERS.find((item) => item.value === colorMode) ?? LAYERS[0];
  const phaseEconomics = useMemo(() => {
    const fraction = phaseStep / 6;
    const previousFraction = Math.max((phaseStep - 1) / 6, 0);
    const cumulativeNpv = economicMetrics.npv * Math.pow(fraction, 0.92);
    const previousNpv = economicMetrics.npv * Math.pow(previousFraction, 0.92);
    return {
      reserves: economicMetrics.reserves * fraction,
      cumulativeNpv,
      incrementalNpv: cumulativeNpv - previousNpv,
      grade: economicMetrics.grade * (1.08 - 0.08 * fraction),
      stripRatio: economicMetrics.stripRatio * (0.78 + 0.22 * fraction),
    };
  }, [phaseStep, economicMetrics]);

  const movePhase = (next: number) => {
    setPlaying(false);
    setPhaseStep(Math.min(6, Math.max(1, next)));
  };

  return (
    <div className="pit-workspace">
      <aside className="pit-sidecard">
        <div className="sidecard-eyebrow">GEOMETRÍA REAL</div>
        <div className="sidecard-title">VISOR DATAMINE</div>
        <p className="sidecard-copy">
          La secuencia F1–F6 es una evolución visual sobre el pit final disponible; no representa seis superficies Datamine independientes.
        </p>

        <div className="pit-stats">
          <div><span>Puntos</span><strong>{geometry?.validation.stats.totalPoints.toLocaleString() ?? '—'}</strong></div>
          <div><span>Triángulos</span><strong>{geometry?.validation.stats.totalTriangles.toLocaleString() ?? '—'}</strong></div>
          <div><span>PID inválidos</span><strong>{geometry?.validation.stats.invalidPIDs ?? '—'}</strong></div>
          <div><span>Elevación</span><strong>{geometry ? `${geometry.bounds.minZ.toFixed(1)}–${geometry.bounds.maxZ.toFixed(1)} m` : '—'}</strong></div>
        </div>

        <label className="field-label" htmlFor="economic-layer">CAPA DE VISUALIZACIÓN</label>
        <select
          id="economic-layer"
          className="field-select"
          value={colorMode}
          onChange={(event) => setColorMode(event.target.value as ViewerColorMode)}
        >
          {LAYERS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <div className="layer-note">{layer.note}</div>

        <div className="phase-economics">
          <div><span>Fase visual</span><strong>F{phaseStep}</strong></div>
          <div><span>Reservas</span><strong>{phaseEconomics.reserves.toFixed(1)} Mt</strong></div>
          <div><span>VAN acumulado</span><strong>${phaseEconomics.cumulativeNpv.toFixed(0)} M</strong></div>
          <div><span>VAN incremental</span><strong>${phaseEconomics.incrementalNpv.toFixed(0)} M</strong></div>
          <div><span>Ley media</span><strong>{phaseEconomics.grade.toFixed(3)} %</strong></div>
          <div><span>Strip ratio</span><strong>{phaseEconomics.stripRatio.toFixed(2)} : 1</strong></div>
        </div>

        <button
          type="button"
          className={`compact-button ${wireframe ? 'active' : ''}`}
          onClick={() => setWireframe((value) => !value)}
        >
          {wireframe ? 'WIREFRAME ACTIVO' : 'ACTIVAR WIREFRAME'}
        </button>

        <div className="hover-readout">
          <div className="hover-title">LECTURA DEL CURSOR</div>
          {hovered ? (
            <>
              <div><span>Triángulo</span><strong>{hovered.triangleId}</strong></div>
              <div><span>Este</span><strong>{hovered.easting.toFixed(2)}</strong></div>
              <div><span>Norte</span><strong>{hovered.northing.toFixed(2)}</strong></div>
              <div><span>Elevación</span><strong>{hovered.elevation.toFixed(2)} m</strong></div>
            </>
          ) : (
            <p>Pasa el cursor sobre el pit para leer coordenadas sin cubrir la geometría.</p>
          )}
        </div>
      </aside>

      <section className="pit-view-column">
        <div className="pit-viewer-shell">
          {loading && <div className="viewer-state">Cargando geometría Datamine…</div>}
          {!loading && error && (
            <div className="viewer-state error-state">
              <AlertTriangle size={30} />
              <strong>Error al cargar geometría</strong>
              <span>{error}</span>
              <button type="button" onClick={onRetry}>Reintentar</button>
            </div>
          )}
          {!loading && !error && geometry && (
            <DataminePhaseViewer
              geometryData={geometry}
              colorMode={colorMode}
              phaseStep={phaseStep}
              economicMetrics={economicMetrics}
              showWireframe={wireframe}
              onTriangleHover={setHovered}
            />
          )}
        </div>

        <div className="phase-toolbar">
          <button type="button" onClick={() => movePhase(1)} title="Reiniciar secuencia"><RotateCcw size={14} /></button>
          <button type="button" onClick={() => movePhase(phaseStep - 1)} title="Fase anterior"><ChevronLeft size={14} /></button>
          <button
            type="button"
            className={playing ? 'active' : ''}
            onClick={() => {
              if (phaseStep >= 6) setPhaseStep(1);
              setPlaying((value) => !value);
            }}
            title={playing ? 'Pausar' : 'Reproducir'}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button type="button" onClick={() => movePhase(phaseStep + 1)} title="Fase siguiente"><ChevronRight size={14} /></button>

          <div className="phase-buttons">
            {[1, 2, 3, 4, 5, 6].map((phase) => (
              <button
                key={phase}
                type="button"
                className={phase === phaseStep ? 'selected' : ''}
                onClick={() => movePhase(phase)}
              >
                F{phase}
              </button>
            ))}
          </div>

          <input
            aria-label="Evolución visual del pit"
            type="range"
            min="1"
            max="6"
            step="1"
            value={phaseStep}
            onChange={(event) => movePhase(Number(event.target.value))}
          />

          <select
            aria-label="Velocidad de reproducción"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          >
            <option value={1400}>0.7×</option>
            <option value={900}>1×</option>
            <option value={550}>1.6×</option>
          </select>
        </div>
      </section>
    </div>
  );
}
