import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Layers,
  Map,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import DataminePhaseViewer, {
  type HoveredGeometry,
  type ViewerColorMode,
  type ViewerEconomicMetrics,
} from './DataminePhaseViewer';
import {
  parseDatamineGeometryCatalog,
  type DatamineGeometryCatalog,
  type PhaseGeometryData,
} from '../utils/datamineParser';

interface PitWorkspaceProps {
  geometry: PhaseGeometryData | null;
  loading: boolean;
  error: string | null;
  economicMetrics: ViewerEconomicMetrics;
  onRetry: () => void;
}

const LAYERS: Array<{ value: ViewerColorMode; label: string; note: string }> = [
  { value: 'component', label: 'Componente', note: 'Color geométrico base del pit real seleccionado.' },
  { value: 'phase', label: 'Fase real', note: 'Color asociado a la fase Datamine F1–F6 activa.' },
  { value: 'elevation', label: 'Elevación', note: 'Gradiente espacial basado en coordenada Z.' },
  { value: 'van_cumulative', label: 'VAN acumulado', note: 'Capa analítica vinculada al VAN global y profundidad.' },
  { value: 'van_incremental', label: 'VAN incremental', note: 'Capa divergente para lectura marginal visual.' },
  { value: 'reserves', label: 'Reservas', note: 'Intensidad relativa según la fase real y el recurso económico.' },
  { value: 'grade', label: 'Ley media', note: 'Proxy visual condicionado por la ley global disponible.' },
  { value: 'strip_ratio', label: 'Strip ratio', note: 'Proxy visual condicionado por profundidad y relación estéril/mineral.' },
];

export default function PitWorkspace({ geometry, loading, error, economicMetrics, onRetry }: PitWorkspaceProps) {
  const [catalog, setCatalog] = useState<DatamineGeometryCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogReloadKey, setCatalogReloadKey] = useState(0);
  const [phaseStep, setPhaseStep] = useState(6);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);
  const [colorMode, setColorMode] = useState<ViewerColorMode>('component');
  const [wireframe, setWireframe] = useState(false);
  const [showTopography, setShowTopography] = useState(true);
  const [hovered, setHovered] = useState<HoveredGeometry | null>(null);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError(null);

    parseDatamineGeometryCatalog()
      .then((data) => {
        if (!active) return;
        setCatalog(data);
      })
      .catch((catalogLoadError: unknown) => {
        if (!active) return;
        setCatalog(null);
        setCatalogError(
          catalogLoadError instanceof Error
            ? catalogLoadError.message
            : 'No se pudo cargar el catálogo Datamine.',
        );
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, [catalogReloadKey]);

  const availablePhases = useMemo(() => {
    if (catalog && catalog.availablePhases.length > 0) return catalog.availablePhases;
    const fallbackPhase = geometry?.dataSource.phase;
    return fallbackPhase ? [fallbackPhase] : [6];
  }, [catalog, geometry]);

  useEffect(() => {
    if (availablePhases.includes(phaseStep)) return;
    setPhaseStep(availablePhases.at(-1) ?? 6);
  }, [availablePhases, phaseStep]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setPhaseStep((current) => {
        const currentIndex = availablePhases.indexOf(current);
        if (currentIndex < 0) return availablePhases[0] ?? 6;
        if (currentIndex >= availablePhases.length - 1) {
          setPlaying(false);
          return current;
        }
        return availablePhases[currentIndex + 1];
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, availablePhases]);

  const activeGeometry = catalog?.phases[phaseStep] ?? (geometry?.dataSource.phase === phaseStep ? geometry : geometry);
  const topography = catalog?.topography ?? null;
  const topographyAvailable = Boolean(topography);
  const realSequence = availablePhases.length > 1;
  const maxPhase = Math.max(...availablePhases, 6);
  const layer = LAYERS.find((item) => item.value === colorMode) ?? LAYERS[0];

  const phaseEconomics = useMemo(() => {
    const fraction = phaseStep / maxPhase;
    const previousPhase = availablePhases[availablePhases.indexOf(phaseStep) - 1] ?? 0;
    const previousFraction = previousPhase / maxPhase;
    const cumulativeNpv = economicMetrics.npv * Math.pow(fraction, 0.92);
    const previousNpv = economicMetrics.npv * Math.pow(previousFraction, 0.92);
    return {
      reserves: economicMetrics.reserves * fraction,
      cumulativeNpv,
      incrementalNpv: cumulativeNpv - previousNpv,
      grade: economicMetrics.grade * (1.08 - 0.08 * fraction),
      stripRatio: economicMetrics.stripRatio * (0.78 + 0.22 * fraction),
    };
  }, [phaseStep, maxPhase, availablePhases, economicMetrics]);

  const movePhase = (next: number) => {
    if (!availablePhases.includes(next)) return;
    setPlaying(false);
    setHovered(null);
    setPhaseStep(next);
  };

  const moveRelative = (direction: -1 | 1) => {
    const currentIndex = availablePhases.indexOf(phaseStep);
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), availablePhases.length - 1);
    movePhase(availablePhases[nextIndex]);
  };

  const retryGeometry = () => {
    onRetry();
    setCatalogReloadKey((value) => value + 1);
  };

  const realPhase = activeGeometry?.dataSource.phase;
  const geometryName = activeGeometry?.dataSource.geometryName ?? '—';
  const geometryId = activeGeometry?.dataSource.geometryId ?? '—';
  const displayLoading = loading || (catalogLoading && !activeGeometry);
  const displayError = error ?? (!activeGeometry ? catalogError : null);

  return (
    <div className="pit-workspace">
      <aside className="pit-sidecard">
        <div className="sidecard-eyebrow">GEOMETRÍA DATAMINE REAL</div>
        <div className="sidecard-title">VISOR MULTI-PIT</div>
        <p className="sidecard-copy">
          Fuente activa: {geometryName}. Los archivos _pt y _tr se conservan separados por superficie y se cargan mediante el manifiesto geométrico.
        </p>
        <p className="sidecard-copy">
          {realSequence
            ? `Secuencia real disponible: ${availablePhases.map((phase) => `F${phase}`).join(' · ')}.`
            : 'Solo existe una fase disponible; la secuencia real todavía está incompleta.'}
        </p>

        <div className="pit-stats">
          <div><span>Superficie</span><strong>{geometryId}</strong></div>
          <div><span>Fase real</span><strong>{realPhase ? `F${realPhase}` : '—'}</strong></div>
          <div><span>Puntos</span><strong>{activeGeometry?.validation.stats.totalPoints.toLocaleString() ?? '—'}</strong></div>
          <div><span>Triángulos</span><strong>{activeGeometry?.validation.stats.totalTriangles.toLocaleString() ?? '—'}</strong></div>
          <div><span>PID inválidos</span><strong>{activeGeometry?.validation.stats.invalidPIDs ?? '—'}</strong></div>
          <div><span>Elevación</span><strong>{activeGeometry ? `${activeGeometry.bounds.minZ.toFixed(1)}–${activeGeometry.bounds.maxZ.toFixed(1)} m` : '—'}</strong></div>
        </div>

        <label className="field-label" htmlFor="economic-layer">CAPA DE VISUALIZACIÓN</label>
        <select id="economic-layer" className="field-select" value={colorMode} onChange={(event) => setColorMode(event.target.value as ViewerColorMode)}>
          {LAYERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <div className="layer-note">{layer.note}</div>

        <div className="phase-economics">
          <div><span>Fase real</span><strong>F{phaseStep}</strong></div>
          <div><span>Reservas</span><strong>{phaseEconomics.reserves.toFixed(1)} Mt</strong></div>
          <div><span>VAN acumulado</span><strong>${phaseEconomics.cumulativeNpv.toFixed(0)} M</strong></div>
          <div><span>VAN incremental</span><strong>${phaseEconomics.incrementalNpv.toFixed(0)} M</strong></div>
          <div><span>Ley media</span><strong>{phaseEconomics.grade.toFixed(3)} %</strong></div>
          <div><span>Strip ratio</span><strong>{phaseEconomics.stripRatio.toFixed(2)} : 1</strong></div>
        </div>

        <div className="viewer-toggle-row">
          <button type="button" className={`compact-button ${wireframe ? 'active' : ''}`} onClick={() => setWireframe((value) => !value)} aria-pressed={wireframe}>
            <Layers size={12} /> {wireframe ? 'WIREFRAME ACTIVO' : 'WIREFRAME'}
          </button>
          <button type="button" className={`compact-button ${showTopography ? 'active' : ''}`} onClick={() => setShowTopography((value) => !value)} disabled={!topographyAvailable} aria-pressed={showTopography && topographyAvailable}>
            <Map size={12} /> {showTopography ? 'TOPO ACTIVA' : 'TOPOGRAFÍA'}
          </button>
        </div>

        {catalogError && activeGeometry && <p className="layer-note">Advertencia del catálogo: {catalogError}</p>}

        <div className="hover-readout">
          <div className="hover-title">LECTURA DEL CURSOR</div>
          {hovered ? (
            <>
              <div><span>Componente</span><strong>{hovered.component}</strong></div>
              <div><span>Triángulo</span><strong>{hovered.triangleId}</strong></div>
              <div><span>Este</span><strong>{hovered.easting.toFixed(2)}</strong></div>
              <div><span>Norte</span><strong>{hovered.northing.toFixed(2)}</strong></div>
              <div><span>Elevación</span><strong>{hovered.elevation.toFixed(2)} m</strong></div>
            </>
          ) : <p>Pasa el cursor sobre el pit o la topografía para consultar la geometría.</p>}
        </div>
      </aside>

      <section className="pit-view-column">
        <div className="pit-viewer-shell">
          {displayLoading && <div className="viewer-state">Cargando catálogo Datamine…</div>}
          {!displayLoading && displayError && (
            <div className="viewer-state error-state">
              <AlertTriangle size={30} />
              <strong>Error al cargar geometría</strong>
              <span>{displayError}</span>
              <button type="button" onClick={retryGeometry}>Reintentar</button>
            </div>
          )}
          {!displayLoading && !displayError && activeGeometry && (
            <>
              <DataminePhaseViewer
                key={activeGeometry.dataSource.geometryId ?? phaseStep}
                geometryData={activeGeometry}
                topographyData={topography}
                showTopography={showTopography && topographyAvailable}
                colorMode={colorMode}
                phaseStep={phaseStep}
                economicMetrics={economicMetrics}
                showWireframe={wireframe}
                onTriangleHover={setHovered}
              />
              <div className="viewer-help-overlay" aria-hidden="true">
                <span>Drag: rotar</span>
                <span>Scroll: zoom</span>
                <span>Right drag: pan</span>
              </div>
              <div className="viewer-layer-chip" aria-hidden="true">
                <b>{layer.label}</b>
                <span>{showTopography && topographyAvailable ? 'TOPO ON' : 'TOPO OFF'} · {wireframe ? 'WIREFRAME' : 'SOLID'}</span>
              </div>
            </>
          )}
        </div>

        <div className="phase-toolbar">
          <button type="button" onClick={() => movePhase(availablePhases[0])} title="Primera fase real" aria-label="Ir a la primera fase real"><RotateCcw size={14} /></button>
          <button type="button" onClick={() => moveRelative(-1)} title="Fase anterior" aria-label="Ir a la fase anterior"><ChevronLeft size={14} /></button>
          <button
            type="button"
            className={playing ? 'active' : ''}
            onClick={() => {
              if (phaseStep === availablePhases.at(-1)) setPhaseStep(availablePhases[0]);
              setPlaying((value) => !value);
            }}
            title={playing ? 'Pausar' : 'Reproducir fases reales'}
            aria-label={playing ? 'Pausar reproducción de fases reales' : 'Reproducir fases reales'}
            aria-pressed={playing}
            disabled={availablePhases.length < 2}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button type="button" onClick={() => moveRelative(1)} title="Fase siguiente" aria-label="Ir a la fase siguiente"><ChevronRight size={14} /></button>

          <div className="phase-buttons" aria-label="Fases Datamine disponibles">
            {[1, 2, 3, 4, 5, 6].map((phase) => (
              <button
                key={phase}
                type="button"
                className={phase === phaseStep ? 'selected' : ''}
                onClick={() => movePhase(phase)}
                disabled={!availablePhases.includes(phase)}
                title={availablePhases.includes(phase) ? `Cargar Pit F${phase}` : `Pit F${phase} no disponible`}
                aria-label={availablePhases.includes(phase) ? `Cargar Pit F${phase}` : `Pit F${phase} no disponible`}
                aria-pressed={phase === phaseStep}
              >
                F{phase}
              </button>
            ))}
          </div>

          <input aria-label="Selección de fase Datamine real" type="range" min={availablePhases[0]} max={availablePhases.at(-1)} step="1" value={phaseStep} onChange={(event) => movePhase(Number(event.target.value))} />

          <select aria-label="Velocidad de reproducción" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            <option value={1400}>0.7×</option>
            <option value={900}>1×</option>
            <option value={550}>1.6×</option>
          </select>
        </div>
      </section>
    </div>
  );
}
