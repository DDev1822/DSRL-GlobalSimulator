import React, { useState, useEffect, useRef } from 'react';
import { Mountain, Factory, Layers, TrendingUp, Clock, Activity, DollarSign, AlertTriangle, CheckCircle, Gauge, Radio, Cpu, Zap, BarChart3, Target, Database, Settings, Maximize, Minimize, Upload, Play, Pause, SkipBack, SkipForward, RotateCcw, Eye, EyeOff, GitCompare } from 'lucide-react';
import DataminePhaseViewer from './components/DataminePhaseViewer';
import { parsePhase6Geometry } from './utils/datamineParser';

interface DataPoint {
  cutoff: number;
  averageGrade: number;
  tonnage: number;
  npv: number;
  irr: number | null;
  lifeOfMine: number;
  recoveredMetal: number;
}

interface PitShell {
  id: number;
  reservePercent: number;
  cumulativeReserves: number;
  cumulativeNPV: number;
  marginalNPV: number;
  averageGrade: number;
  cutoffGrade: number;
  depth: number;
  irr: number | null;
  status: 'economic' | 'marginal' | 'uneconomic';
}

// Datamine Phase Interfaces
interface Point3D {
  pid: number;
  x: number;
  y: number;
  z: number;
  localX?: number;
  localY?: number;
  localZ?: number;
}

interface Triangle {
  id: number;
  pid1: number;
  pid2: number;
  pid3: number;
}

interface PhaseGeometry {
  phaseId: string;
  sequence: number;
  points: Point3D[];
  triangles: Triangle[];
  validationStatus: 'valid' | 'warning' | 'error';
  validationMessages: string[];
  pointCount: number;
  triangleCount: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  } | null;
}

interface PhaseEconomics {
  phaseId: string;
  sequence: number;
  reservesMt: number | null;
  averageGrade: number | null;
  stripRatio: number | null;
  recoveredMetalMt: number | null;
  cumulativeNpvMusd: number | null;
  incrementalNpvMusd: number | null;
  irrPercent: number | null;
  lifeOfMineYears: number | null;
}

type PitMode = 'conceptual' | 'datamine';
type ColorMode = 'phase' | 'van_cumulative' | 'van_incremental' | 'reserves' | 'grade' | 'strip_ratio' | 'elevation';

export default function Component() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [discountRate, setDiscountRate] = useState(0.08);
  const [millCapacity, setMillCapacity] = useState(40);
  const [mineCapacity, setMineCapacity] = useState(100);
  const [stripRatio, setStripRatio] = useState(1.5);
  const [mineRecovery, setMineRecovery] = useState(0.95);
  const [plantRecovery, setPlantRecovery] = useState(0.88);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartRef = useRef<SVGSVGElement>(null);
  
  // Pit visualization states - Conceptual
  const [pitView, setPitView] = useState<'plan' | 'perspective' | 'profile'>('perspective');
  const [pitColorVariable, setPitColorVariable] = useState<'marginal' | 'cumulative' | 'grade' | 'reserves' | 'value_per_ton'>('marginal');
  const [selectedShell, setSelectedShell] = useState<number | null>(null);
  const [hoveredShell, setHoveredShell] = useState<number | null>(null);
  const [maxVisibleShell, setMaxVisibleShell] = useState<number>(10);

  // Datamine Mode States
  const [pitMode, setPitMode] = useState<PitMode>('conceptual');
  const [phases, setPhases] = useState<PhaseGeometry[]>([]);
  const [phaseEconomics, setPhaseEconomics] = useState<PhaseEconomics[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<number>(6);
  const [showPreviousPhases, setShowPreviousPhases] = useState<boolean>(true);
  const [showOnlySelected, setShowOnlySelected] = useState<boolean>(false);
  const [isPlayingSequence, setIsPlayingSequence] = useState<boolean>(false);
  const [sequenceSpeed, setSequenceSpeed] = useState<number>(1000);
  const [colorMode, setColorMode] = useState<ColorMode>('phase');
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [comparePhase1, setComparePhase1] = useState<number>(1);
  const [comparePhase2, setComparePhase2] = useState<number>(2);
  const [localOrigin, setLocalOrigin] = useState<{ x: number; y: number; z: number } | null>(null);
  const [showGeometricDetail, setShowGeometricDetail] = useState<boolean>(false);

  // Datamine Geometry States
  const [phase6Geometry, setPhase6Geometry] = useState<any>(null);
  const [isLoadingGeometry, setIsLoadingGeometry] = useState(false);
  const [geometryError, setGeometryError] = useState<string | null>(null);
  const [showTopography, setShowTopography] = useState(false);
  const [showPit, setShowPit] = useState(true);
  const [showStrings, setShowStrings] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);
  const [hoveredTriangle, setHoveredTriangle] = useState<any>(null);
  const [hoveredString, setHoveredString] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Phase sequence playback
  useEffect(() => {
    if (!isPlayingSequence) return;
    const interval = setInterval(() => {
      setSelectedPhase(prev => {
        if (prev >= 6) {
          setIsPlayingSequence(false);
          return 6;
        }
        return prev + 1;
      });
    }, sequenceSpeed);
    return () => clearInterval(interval);
  }, [isPlayingSequence, sequenceSpeed]);

  // Load Phase 6 geometry when entering Datamine mode
  useEffect(() => {
    if (
      pitMode !== 'datamine' ||
      phase6Geometry ||
      isLoadingGeometry ||
      geometryError
    ) {
      return;
    }

    let cancelled = false;
    setIsLoadingGeometry(true);

    parsePhase6Geometry()
      .then((geometry) => {
        if (cancelled) return;
        setPhase6Geometry(geometry);
        setGeometryError(null);
        console.log('Phase 6 Geometry Loaded:', geometry.validation);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error
          ? error.message
          : 'No se pudo cargar la geometría Datamine.';
        console.error('Error loading Phase 6 geometry:', error);
        setPhase6Geometry(null);
        setGeometryError(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingGeometry(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pitMode, phase6Geometry, isLoadingGeometry, geometryError]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const BASE_CAPACITY = 40;
  const BASE_MINE_CAPACITY = 100;
  const BASE_CAPEX = 2800;
  const MAX_X = 1.2;
  const MAX_T = 1500;
  const MAX_G = 1.5;
  const COPPER_PRICE = 8800;
  const NET_PAYABLE = 0.80;
  const TAX_RATE = 0.30;
  const NET_PRICE = COPPER_PRICE * NET_PAYABLE;

  const calculateTonnage = (x: number) => x >= MAX_X ? 0 : MAX_T * Math.pow(1 - (x / MAX_X), 2);
  const calculateGrade = (x: number) => x >= MAX_X ? 0 : x + 0.25 + 0.1 * (1 - (x / MAX_X));

  const calculateIRR = (cashflows: number[]): number | null => {
    if (!cashflows || cashflows.length < 2) return null;

    const totalCashflow = cashflows.reduce((sum, cf) => sum + cf, 0);
    if (totalCashflow <= 0) return null;

    let low = 0.0, high = 3.0, guess = 0.1;
    for (let i = 0; i < 30; i++) {
      let npvGuess = 0;
      cashflows.forEach((cf, j) => { npvGuess += cf / Math.pow(1 + guess, j); });
      if (Math.abs(npvGuess) < 0.01) break;
      if (npvGuess > 0) low = guess; else high = guess;
      guess = (low + high) / 2;
    }

    return guess * 100;
  };

  const calculateOptimization = () => {
    const sizeFactor = (millCapacity / BASE_CAPACITY + mineCapacity / BASE_MINE_CAPACITY) / 2;
    const dynamicCAPEX = BASE_CAPEX * Math.pow(sizeFactor, 0.65);
    const OPEX_MINING = 2.50 * Math.pow(BASE_MINE_CAPACITY / mineCapacity, 0.15);
    const dynamicOpexProcessing = 7.50 * Math.pow(BASE_CAPACITY / millCapacity, 0.25);
    const TOTAL_OPEX_PER_TON = (OPEX_MINING * (1 + stripRatio)) + dynamicOpexProcessing;

    const maxOreFromMine = mineCapacity / (1 + stripRatio);
    const effectiveProductionRate = Math.min(millCapacity, maxOreFromMine);

    const revenuePerPercent = NET_PRICE * plantRecovery * 0.01;
    const breakeven = TOTAL_OPEX_PER_TON / revenuePerPercent;

    let maxVAN = -Infinity;
    let optimalCutoff = breakeven;
    let bestScenario: any = null;
    let dataPoints: DataPoint[] = [];

    for (let c = 0.10; c <= 1.10; c += 0.01) {
      const rawTonnage = calculateTonnage(c);
      const currentTonnage = rawTonnage * mineRecovery;
      const currentGrade = calculateGrade(c);

      if (currentTonnage < 1 || currentGrade <= 0 || c < breakeven) {
        dataPoints.push({
          cutoff: c,
          averageGrade: currentGrade,
          tonnage: currentTonnage,
          npv: 0,
          irr: null,
          lifeOfMine: 0,
          recoveredMetal: 0
        });
        continue;
      }

      const lifeOfMine = Math.ceil(currentTonnage / effectiveProductionRate);
      let npv = -dynamicCAPEX;
      let cashflows = [-dynamicCAPEX];

      for (let year = 1; year <= lifeOfMine; year++) {
        const tonsThisYear = (year === lifeOfMine && currentTonnage % effectiveProductionRate !== 0)
          ? currentTonnage % effectiveProductionRate : effectiveProductionRate;

        const revenues = (tonsThisYear * 1000000) * (currentGrade / 100) * plantRecovery * NET_PRICE;
        const costs = (tonsThisYear * 1000000) * TOTAL_OPEX_PER_TON;
        const operatingProfit = revenues - costs;
        const afterTaxCashFlow = (operatingProfit > 0 ? operatingProfit * (1 - TAX_RATE) : operatingProfit) / 1000000;

        cashflows.push(afterTaxCashFlow);
        npv += afterTaxCashFlow / Math.pow(1 + discountRate, year);
      }

      const irr = calculateIRR(cashflows);
      const metal = currentTonnage * (currentGrade / 100) * plantRecovery;

      dataPoints.push({
        cutoff: c,
        averageGrade: currentGrade,
        tonnage: currentTonnage,
        npv: Math.max(npv, 0),
        irr: irr,
        lifeOfMine: lifeOfMine,
        recoveredMetal: metal
      });

      if (npv > maxVAN) {
        maxVAN = npv;
        optimalCutoff = c;
        bestScenario = {
          tonnage: currentTonnage,
          grade: currentGrade,
          metal: metal,
          lom: lifeOfMine,
          irr: irr
        };
      }
    }

    if (!bestScenario) {
      bestScenario = {
        tonnage: 0,
        grade: 0,
        metal: 0,
        lom: 0,
        irr: 0
      };
      maxVAN = 0;
    }

    return {
      breakeven,
      optimalCutoff,
      maxVAN,
      bestScenario,
      finalTir: bestScenario.irr || 0,
      dataPoints,
      dynamicCAPEX,
      OPEX_MINING,
      dynamicOpexProcessing,
      effectiveProductionRate,
      maxOreFromMine,
      TOTAL_OPEX_PER_TON
    };
  };

  const results = calculateOptimization();

  // Generate conceptual pit shells
  const generatePitShells = (): PitShell[] => {
    const NUM_SHELLS = 10;
    const shells: PitShell[] = [];
    const maxReserves = results.bestScenario.tonnage || 0;

    if (maxReserves === 0) return [];

    for (let i = 1; i <= NUM_SHELLS; i++) {
      const reservePercent = (i / NUM_SHELLS);
      const cumulativeReserves = maxReserves * reservePercent;

      const targetReserve = cumulativeReserves;
      let closestPoint = results.dataPoints[0];
      let minDiff = Infinity;

      for (const point of results.dataPoints) {
        const diff = Math.abs(point.tonnage - targetReserve);
        if (diff < minDiff && point.tonnage <= targetReserve && point.npv > 0) {
          minDiff = diff;
          closestPoint = point;
        }
      }

      const cumulativeNPV = closestPoint.npv;
      const previousNPV = i > 1 ? shells[i-2].cumulativeNPV : 0;
      const marginalNPV = cumulativeNPV - previousNPV;

      const reserveRatio = cumulativeReserves / maxReserves;
      const minDepth = 0.2;
      const maxDepth = 1.0;
      const depth = minDepth + Math.pow(reserveRatio, 0.65) * (maxDepth - minDepth);

      let status: 'economic' | 'marginal' | 'uneconomic' = 'economic';
      if (marginalNPV < 0) status = 'uneconomic';
      else if (marginalNPV < cumulativeNPV * 0.05) status = 'marginal';

      shells.push({
        id: i,
        reservePercent: reservePercent * 100,
        cumulativeReserves,
        cumulativeNPV,
        marginalNPV,
        averageGrade: closestPoint.averageGrade,
        cutoffGrade: closestPoint.cutoff,
        depth,
        irr: closestPoint.irr,
        status
      });
    }

    return shells;
  };

  const pitShells = generatePitShells();

  // Datamine Phase Functions
  const handleFileUpload = async (phaseNumber: number, fileType: 'points' | 'triangles', file: File) => {
    // Placeholder for file parsing logic
    console.log(`Upload ${fileType} for phase ${phaseNumber}:`, file.name);
    // TODO: Parse CSV, validate, and add to phases state
  };

  const getPhaseColor = (phaseNumber: number): string => {
    const colors = [
      '#3b82f6', // blue
      '#06b6d4', // cyan
      '#10b981', // emerald
      '#eab308', // yellow
      '#f59e0b', // orange
      '#ef4444'  // red
    ];
    return colors[phaseNumber - 1] || '#64748b';
  };

  const getPhaseEconomics = (phaseNumber: number): PhaseEconomics | null => {
    return phaseEconomics.find(p => p.sequence === phaseNumber) || null;
  };

  const InteractiveChart = () => {
    const width = 800;
    const height = 280;
    const padTop = 20;
    const padBottom = 30;
    const padLeft = 40;
    const padRight = 60;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const mapX = (x: number) => padLeft + (x / MAX_X) * chartW;
    const mapY_T = (t: number) => padTop + chartH - (t / MAX_T) * chartH;
    const mapY_G = (g: number) => padTop + chartH - (g / MAX_G) * chartH;

    const maxNpv = Math.max(...results.dataPoints.map(d => d.npv), 1);
    const mapY_V = (v: number) => padTop + chartH - (v / maxNpv) * chartH;

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = chartRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      const svgX = x * scaleX;
      const svgY = y * scaleY;

      if (svgX < padLeft || svgX > width - padRight || svgY < padTop || svgY > height - padBottom) {
        setHoveredPoint(null);
        setMousePosition(null);
        return;
      }

      const cutoffValue = ((svgX - padLeft) / chartW) * MAX_X;
      const closestPoint = results.dataPoints.reduce((prev, curr) =>
        Math.abs(curr.cutoff - cutoffValue) < Math.abs(prev.cutoff - cutoffValue) ? curr : prev
      );

      setHoveredPoint(closestPoint);
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseLeave = () => {
      setHoveredPoint(null);
      setMousePosition(null);
    };

    const pointsT: string[] = [];
    const pointsG: string[] = [];
    const pointsV: string[] = [];

    for (let i = 0; i <= MAX_X; i += 0.02) {
      pointsT.push(`${mapX(i)},${mapY_T(calculateTonnage(i))}`);
      pointsG.push(`${mapX(i)},${mapY_G(calculateGrade(i))}`);
    }
    results.dataPoints.forEach(p => { pointsV.push(`${mapX(p.cutoff)},${mapY_V(p.npv)}`); });

    const optimalTonnage = calculateTonnage(results.optimalCutoff) * mineRecovery;
    const optimalGrade = calculateGrade(results.optimalCutoff);

    return (
      <div className="relative h-full w-full">
        <svg
          ref={chartRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full cursor-crosshair"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="gradVAN" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.3, 0.6, 0.9, 1.2, 1.5].map((val, i) => (
            <line key={`g-${i}`} x1={padLeft} y1={mapY_G(val)} x2={width - padRight} y2={mapY_G(val)} stroke="#1e293b" strokeOpacity="0.5" strokeDasharray="2 2" />
          ))}

          <rect x={padLeft} y={padTop} width={Math.max(0, mapX(results.breakeven) - padLeft)} height={chartH} fill="#f59e0b" fillOpacity="0.06" />
          <path d={`M ${pointsV.join(" L ")} L ${mapX(1.1)},${padTop + chartH} L ${mapX(0.1)},${padTop + chartH} Z`} fill="url(#gradVAN)" />

          <path d={`M ${pointsT.join(" L ")}`} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeOpacity="0.8" />
          <path d={`M ${pointsG.join(" L ")}`} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeOpacity="0.8" />
          <path d={`M ${pointsV.join(" L ")}`} fill="none" stroke="#10b981" strokeWidth="3.5" />

          <line x1={mapX(results.breakeven)} y1={padTop} x2={mapX(results.breakeven)} y2={height - padBottom} stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" strokeOpacity="0.7" />
          <line x1={mapX(results.optimalCutoff)} y1={padTop} x2={mapX(results.optimalCutoff)} y2={height - padBottom} stroke="#10b981" strokeWidth="2.5" />

          {hoveredPoint && (
            <>
              <line x1={mapX(hoveredPoint.cutoff)} y1={padTop} x2={mapX(hoveredPoint.cutoff)} y2={height - padBottom} stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx={mapX(hoveredPoint.cutoff)} cy={mapY_T(hoveredPoint.tonnage / mineRecovery)} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
              <circle cx={mapX(hoveredPoint.cutoff)} cy={mapY_G(hoveredPoint.averageGrade)} r="5" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
              <circle cx={mapX(hoveredPoint.cutoff)} cy={mapY_V(hoveredPoint.npv)} r="6" fill="#10b981" stroke="#fff" strokeWidth="2.5" />
            </>
          )}

          {optimalTonnage > 0 && !hoveredPoint && (
            <>
              <circle cx={mapX(results.optimalCutoff)} cy={mapY_T(optimalTonnage / mineRecovery)} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" />
              <circle cx={mapX(results.optimalCutoff)} cy={mapY_G(optimalGrade)} r="4" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
              <circle cx={mapX(results.optimalCutoff)} cy={mapY_V(results.maxVAN)} r="5" fill="#10b981" stroke="#fff" strokeWidth="2" />
            </>
          )}

          <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} stroke="#475569" strokeWidth="2" />
          <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} stroke="#475569" strokeWidth="1.5" strokeOpacity="0.5" />

          <text x={width / 2} y={height - 8} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">LEY DE CORTE (% Cu)</text>

          {[0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2].map((val, i) => (
            <text key={`x-${i}`} x={mapX(val)} y={height - padBottom + 14} textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="600">{val.toFixed(1)}</text>
          ))}

          {[0, 500, 1000, 1500].map((val, i) => (
            <text key={`yl-${i}`} x={padLeft - 6} y={mapY_T(val) + 3} textAnchor="end" fill="#3b82f6" fontSize="8">{val}</text>
          ))}

          {[0, maxNpv / 4, maxNpv / 2, maxNpv * 3 / 4, maxNpv].map((val, i) => (
            <text key={`yr-${i}`} x={width - padRight + 6} y={mapY_V(val) + 3} textAnchor="start" fill="#10b981" fontSize="8" fontWeight="700">${Math.round(val)}M</text>
          ))}
        </svg>

        {hoveredPoint && mousePosition && (() => {
          const TOOLTIP_WIDTH = 260;
          const TOOLTIP_HEIGHT = 200;
          const OFFSET = 14;
          const CHART_RIGHT_EDGE = window.innerWidth * 0.67;

          let left = mousePosition.x + OFFSET;
          if (mousePosition.x > CHART_RIGHT_EDGE || mousePosition.x + TOOLTIP_WIDTH + OFFSET > window.innerWidth - 320) {
            left = mousePosition.x - TOOLTIP_WIDTH - OFFSET;
          }

          let top = mousePosition.y - TOOLTIP_HEIGHT / 2;
          const MIN_TOP = 100;
          const MAX_TOP = window.innerHeight - TOOLTIP_HEIGHT - 20;
          top = Math.max(MIN_TOP, Math.min(top, MAX_TOP));

          return (
            <div className="fixed z-50 pointer-events-none" style={{ left, top }}>
              <div className="bg-slate-900/97 backdrop-blur-sm border border-emerald-500/60 rounded-lg shadow-2xl p-2.5 w-[260px]">
                <div className="mb-1.5 border-b border-slate-700/60 pb-1.5">
                  <div className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Escenario Explorado</div>
                  <div className="text-[7px] text-slate-500 font-medium mt-0.5">Punto seleccionado sobre la curva</div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[8.5px] text-slate-400 font-medium">Ley de Corte</span>
                    <span className="text-[11px] text-white font-black mono">{hoveredPoint.cutoff.toFixed(3)} % Cu</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8.5px] text-amber-400 font-medium">Ley Media</span>
                    <span className="text-[11px] text-amber-300 font-black mono">{hoveredPoint.averageGrade.toFixed(3)} % Cu</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8.5px] text-blue-400 font-medium">Tonelaje</span>
                    <span className="text-[11px] text-blue-300 font-black mono">{Math.round(hoveredPoint.tonnage).toLocaleString('en-US')} Mt</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8.5px] text-emerald-400 font-medium">VAN</span>
                    <span className="text-[11px] text-emerald-300 font-black mono">${Math.round(hoveredPoint.npv).toLocaleString('en-US')} M USD</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8.5px] text-violet-400 font-medium">TIR</span>
                    <span className="text-[11px] text-violet-300 font-black mono">{hoveredPoint.irr ? hoveredPoint.irr.toFixed(1) : 'N/A'} %</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8.5px] text-slate-400 font-medium">Vida de Mina</span>
                    <span className="text-[11px] text-slate-200 font-black mono">{hoveredPoint.lifeOfMine} años</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8.5px] text-cyan-400 font-medium">Metal Recuperado</span>
                    <span className="text-[11px] text-cyan-300 font-black mono">{hoveredPoint.recoveredMetal.toFixed(2)} Mt Cu</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  const displayIRR = hoveredPoint?.irr !== null && hoveredPoint?.irr !== undefined
    ? hoveredPoint.irr
    : results.finalTir;

  // Render PIT module based on mode
  const renderPitModule = () => {
    if (pitMode === 'conceptual') {
      return renderConceptualPit();
    } else {
      return renderDataminePit();
    }
  };

  const renderConceptualPit = () => {
    return (
      <>
        <div className="panel-header">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Layers className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-slate-300 uppercase">Pit Conceptual — Reservas y Valor</span>
              <button
                onClick={() => setPitMode('datamine')}
                className="ml-2 px-2 py-0.5 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-700/50 rounded text-[7px] text-blue-300 font-bold uppercase transition-colors"
              >
                Cambiar a Datamine
              </button>
            </div>
          </div>
          <div className="flex gap-2 mb-1.5">
            <select className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 text-[8px] px-2 py-1 rounded font-bold mono" value={pitView} onChange={(e) => setPitView(e.target.value as any)}>
              <option value="perspective">Perspectiva 2.5D</option>
              <option value="plan">Planta</option>
              <option value="profile">Perfil</option>
            </select>
            <select className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 text-[8px] px-2 py-1 rounded font-bold mono" value={pitColorVariable} onChange={(e) => setPitColorVariable(e.target.value as any)}>
              <option value="marginal">VAN Marginal</option>
              <option value="cumulative">VAN Acumulado</option>
              <option value="grade">Ley Media</option>
              <option value="reserves">Reservas</option>
            </select>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <div className="bg-slate-950/70 border border-blue-900/40 p-1 rounded">
              <div className="text-[6px] text-blue-400 font-bold mb-0.5">RESERVAS</div>
              <div className="text-[9px] text-blue-300 font-black mono">{results.bestScenario.tonnage ? results.bestScenario.tonnage.toFixed(0) : '0'} Mt</div>
            </div>
            <div className="bg-slate-950/70 border border-emerald-900/40 p-1 rounded">
              <div className="text-[6px] text-emerald-400 font-bold mb-0.5">ÓPTIMO</div>
              <div className="text-[9px] text-emerald-300 font-black mono">{pitShells.length > 0 ? `${Math.round(pitShells.length * 0.7)}/${pitShells.length}` : '0/0'}</div>
            </div>
            <div className="bg-slate-950/70 border border-amber-900/40 p-1 rounded">
              <div className="text-[6px] text-amber-400 font-bold mb-0.5">PROF.</div>
              <div className="text-[9px] text-amber-300 font-black mono">{pitShells.length > 0 ? (pitShells[pitShells.length - 1].depth).toFixed(2) : '0.00'}</div>
            </div>
            <div className="bg-slate-950/70 border border-violet-900/40 p-1 rounded">
              <div className="text-[6px] text-violet-400 font-bold mb-0.5">VAN</div>
              <div className="text-[9px] text-violet-300 font-black mono">${selectedShell && pitShells[selectedShell - 1] ? Math.round(pitShells[selectedShell - 1].cumulativeNPV) : Math.round(results.maxVAN)}M</div>
            </div>
          </div>
        </div>
        <div className="panel-content bg-slate-950/70 border border-slate-800 rounded p-2 flex flex-col">
          <div className="flex-1 min-h-0 mb-2">
            <svg viewBox="0 0 800 280" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="pitGrad" cx="50%" cy="40%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </radialGradient>
                <filter id="depth-shadow">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                  <feOffset dx="0" dy="2" result="offsetblur"/>
                  <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <rect width={800} height={280} fill="url(#pitGrad)" />
              {[0, 1, 2, 3, 4].map(i => (
                <React.Fragment key={`grid-${i}`}>
                  <line x1={0} y1={i * 70} x2={800} y2={i * 70} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 2" strokeOpacity="0.3" />
                  <line x1={i * 200} y1={0} x2={i * 200} y2={280} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 2" strokeOpacity="0.3" />
                </React.Fragment>
              ))}
              {pitShells.slice().reverse().map((shell, reverseIndex) => {
                const index = pitShells.length - 1 - reverseIndex;
                if (index >= maxVisibleShell) return null;
                const sizeRatio = (index + 1) / pitShells.length;
                const radius = 110 * sizeRatio;
                const depthOffset = pitView === 'perspective' ? shell.depth * 50 : 0;
                const yOffset = pitView === 'perspective' ? depthOffset : 0;
                const centerX = 400;
                const centerY = 130;
                const points: string[] = [];
                const numPoints = 32;
                const irregularity = 0.08 + Math.sin(index * 0.7) * 0.05;
                for (let i = 0; i <= numPoints; i++) {
                  const angle = (i / numPoints) * Math.PI * 2;
                  const variation = 1 + Math.sin(angle * 3 + index) * irregularity;
                  const rx = radius * variation * (pitView === 'perspective' ? 1.2 : 1);
                  const ry = radius * variation * (pitView === 'perspective' ? 0.4 : 1);
                  const x = centerX + Math.cos(angle) * rx;
                  const y = centerY + yOffset + Math.sin(angle) * ry;
                  points.push(`${x},${y}`);
                }
                const isSelected = selectedShell === shell.id;
                const isHovered = hoveredShell === shell.id;
                const isOptimal = Math.abs(shell.cumulativeNPV - results.maxVAN) < results.maxVAN * 0.05;
                let baseColor = '#1e40af';
                if (pitColorVariable === 'marginal') {
                  const maxMarginal = Math.max(...pitShells.map(s => s.marginalNPV));
                  const ratio = shell.marginalNPV / maxMarginal;
                  if (ratio < 0.2) baseColor = '#1e40af';
                  else if (ratio < 0.4) baseColor = '#06b6d4';
                  else if (ratio < 0.6) baseColor = '#10b981';
                  else if (ratio < 0.8) baseColor = '#eab308';
                  else baseColor = '#f59e0b';
                }
                return (
                  <g key={shell.id}>
                    <polygon
                      points={points.join(' ')}
                      fill={baseColor}
                      fillOpacity={isHovered || isSelected ? 0.8 : 0.5}
                      stroke={isOptimal ? '#10b981' : (isSelected ? '#06b6d4' : (isHovered ? '#64748b' : '#334155'))}
                      strokeWidth={isOptimal ? 2.5 : (isSelected ? 2 : (isHovered ? 1.5 : 0.5))}
                      filter={pitView === 'perspective' ? 'url(#depth-shadow)' : undefined}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredShell(shell.id)}
                      onMouseLeave={() => setHoveredShell(null)}
                      onClick={() => setSelectedShell(shell.id)}
                    />
                    {(isHovered || isSelected || index === pitShells.length - 1) && (
                      <text x={centerX} y={centerY + yOffset} textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="bold" className="mono pointer-events-none">
                        SH{shell.id.toString().padStart(2, '0')}
                      </text>
                    )}
                  </g>
                );
              })}
              {hoveredShell && pitShells.find(s => s.id === hoveredShell) && (() => {
                const shell = pitShells.find(s => s.id === hoveredShell)!;
                return (
                  <g>
                    <rect x={565} y={10} width={225} height={120} fill="#0f172a" fillOpacity="0.98" stroke="#10b981" strokeWidth="1" rx="4" />
                    <text x={575} y={24} fill="#10b981" fontSize="8" fontWeight="bold" className="mono">SHELL {shell.id.toString().padStart(2, '0')}</text>
                    <text x={575} y={38} fill="#64748b" fontSize="7">Reservas acum.</text>
                    <text x={780} y={38} fill="#94a3b8" fontSize="7" textAnchor="end" fontWeight="bold" className="mono">{shell.cumulativeReserves.toFixed(0)} Mt</text>
                    <text x={575} y={50} fill="#64748b" fontSize="7">Ley de corte</text>
                    <text x={780} y={50} fill="#f59e0b" fontSize="7" textAnchor="end" fontWeight="bold" className="mono">{shell.cutoffGrade.toFixed(3)} %</text>
                    <text x={575} y={62} fill="#64748b" fontSize="7">Ley media</text>
                    <text x={780} y={62} fill="#f59e0b" fontSize="7" textAnchor="end" fontWeight="bold" className="mono">{shell.averageGrade.toFixed(3)} %</text>
                    <text x={575} y={74} fill="#64748b" fontSize="7">VAN acum.</text>
                    <text x={780} y={74} fill="#10b981" fontSize="7" textAnchor="end" fontWeight="bold" className="mono">${Math.round(shell.cumulativeNPV)} M</text>
                    <text x={575} y={86} fill="#64748b" fontSize="7">VAN marg.</text>
                    <text x={780} y={86} fill="#06b6d4" fontSize="7" textAnchor="end" fontWeight="bold" className="mono">${Math.round(shell.marginalNPV)} M</text>
                    <text x={575} y={98} fill="#64748b" fontSize="7">Prof. rel.</text>
                    <text x={780} y={98} fill="#94a3b8" fontSize="7" textAnchor="end" fontWeight="bold" className="mono">{shell.depth.toFixed(2)}</text>
                    <text x={575} y={110} fill="#64748b" fontSize="7">Estado</text>
                    <text x={780} y={110} fill={shell.status === 'economic' ? '#10b981' : '#f59e0b'} fontSize="7" textAnchor="end" fontWeight="bold" className="mono">
                      {shell.status === 'economic' ? 'ECON' : 'MARG'}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>
          <div className="flex-shrink-0 border-t border-slate-800 pt-1.5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[7px] text-slate-400 font-bold">SHELLS VISIBLES</span>
              <span className="text-[8px] text-emerald-400 font-black mono">1 - {maxVisibleShell}</span>
            </div>
            <input type="range" min="1" max={pitShells.length || 10} step="1" value={maxVisibleShell} onChange={(e) => setMaxVisibleShell(parseInt(e.target.value))} className="w-full" />
            <div className="text-[6px] text-slate-600 leading-tight mt-1">
              <span className="text-slate-500 font-semibold">NOTA:</span> Geometría representa relaciones económicas; no sustituye diseño de pit.
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderDataminePit = () => {
    const hasGeometry = phase6Geometry !== null;
    const stats = phase6Geometry?.validation?.stats;
    const bounds = phase6Geometry?.bounds;
    const hasTopography = (phase6Geometry?.triangles?.topography?.length ?? 0) > 0;
    const hasStrings = (phase6Geometry?.cutStrings?.length ?? 0) > 0;

    const retryGeometryLoad = () => {
      setPhase6Geometry(null);
      setGeometryError(null);
    };

    return (
      <>
        <div className="panel-header">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Layers className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-bold text-slate-300 uppercase">
                Secuencia de Fases — Geometría y Valor
              </span>
              <button
                onClick={() => setPitMode('conceptual')}
                className="ml-2 px-2 py-0.5 bg-emerald-900/30 hover:bg-emerald-800/40 border border-emerald-700/50 rounded text-[7px] text-emerald-300 font-bold uppercase transition-colors"
              >
                Volver a Conceptual
              </button>
            </div>
          </div>

          {geometryError && (
            <div className="bg-rose-950/30 border border-rose-900/60 rounded p-2 mb-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[8px] text-rose-300 font-black uppercase">
                    No se pudo cargar la geometría Datamine
                  </div>
                  <div className="text-[7px] text-rose-400/90 leading-tight mt-1">
                    {geometryError}
                  </div>
                  <div className="text-[7px] text-slate-500 mono mt-1">
                    /data/Design Pit_pt.csv · /data/Design Pit_tr.csv
                  </div>
                  <button
                    onClick={retryGeometryLoad}
                    className="mt-1.5 px-2 py-1 bg-rose-900/30 hover:bg-rose-800/40 border border-rose-700/50 rounded text-[7px] text-rose-200 font-bold uppercase"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          )}

          {isLoadingGeometry && (
            <div className="bg-blue-950/20 border border-blue-900/50 rounded p-2 mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
                <div>
                  <div className="text-blue-300 font-bold text-[9px]">
                    Procesando geometría triangulada...
                  </div>
                  <div className="text-[7px] text-slate-500 mono">
                    Design Pit_pt.csv · Design Pit_tr.csv
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-1.5">
            <select
              className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 text-[8px] px-2 py-1 rounded font-bold mono"
              value={pitView}
              onChange={(e) => setPitView(e.target.value as any)}
            >
              <option value="perspective">Perspectiva 3D</option>
              <option value="plan">Planta</option>
              <option value="profile">Perfil</option>
            </select>
            <select
              className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 text-[8px] px-2 py-1 rounded font-bold mono"
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as ColorMode)}
            >
              <option value="phase">Color por Componente</option>
              <option value="elevation">Elevación</option>
              <option value="van_cumulative" disabled>VAN Acumulado (requiere datos)</option>
              <option value="van_incremental" disabled>VAN Incremental (requiere datos)</option>
              <option value="reserves" disabled>Reservas (requiere datos)</option>
              <option value="grade" disabled>Ley Media (requiere datos)</option>
              <option value="strip_ratio" disabled>Strip Ratio (requiere datos)</option>
            </select>
          </div>

          {hasGeometry ? (
            <>
              <div className="grid grid-cols-3 gap-1 mb-1.5">
                <div className="bg-slate-950/70 border border-blue-900/40 p-1 rounded">
                  <div className="text-[6px] text-blue-400 font-bold mb-0.5">FASE</div>
                  <div className="flex items-center gap-1">
                    <div className="text-[9px] text-blue-300 font-black mono">
                      FASE 06
                    </div>
                    <div className={`text-[6px] font-black px-1 py-0.5 rounded ${
                      phase6Geometry.validation.status === 'valid'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {phase6Geometry.validation.status === 'valid' ? 'VÁLIDA' : 'ADV'}
                    </div>
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-cyan-900/40 p-1 rounded">
                  <div className="text-[6px] text-cyan-400 font-bold mb-0.5">PUNTOS</div>
                  <div className="text-[9px] text-cyan-300 font-black mono">
                    {stats?.totalPoints?.toLocaleString('en-US') ?? '0'}
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-amber-900/40 p-1 rounded">
                  <div className="text-[6px] text-amber-400 font-bold mb-0.5">TRIÁNGULOS</div>
                  <div className="text-[9px] text-amber-300 font-black mono">
                    {stats?.totalTriangles?.toLocaleString('en-US') ?? '0'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 mb-1.5">
                <div className="bg-slate-950/70 border border-emerald-900/40 p-1 rounded">
                  <div className="text-[6px] text-emerald-400 font-bold mb-0.5">PID INVÁLIDOS</div>
                  <div className="text-[9px] text-emerald-300 font-black mono">
                    {stats?.invalidPIDs?.toLocaleString('en-US') ?? '0'}
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-violet-900/40 p-1 rounded">
                  <div className="text-[6px] text-violet-400 font-bold mb-0.5">TOPOGRAFÍA</div>
                  <div className="text-[9px] text-violet-300 font-black mono">
                    {hasTopography ? 'DISPONIBLE' : 'SIN DATOS'}
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-orange-900/40 p-1 rounded">
                  <div className="text-[6px] text-orange-400 font-bold mb-0.5">STRINGS</div>
                  <div className="text-[9px] text-orange-300 font-black mono">
                    {hasStrings ? 'DISPONIBLE' : 'SIN DATOS'}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-900/50 rounded p-2 mb-1.5">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-[8px] text-emerald-300 font-black uppercase">
                      Geometría Datamine conectada
                    </div>
                    <div className="text-[7px] text-emerald-400/80 leading-tight mt-0.5">
                      Mesh reconstruido desde PID1, PID2 y PID3 con coordenadas reales.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 border border-slate-800/40 rounded mb-1.5">
                <button
                  onClick={() => setShowGeometricDetail(!showGeometricDetail)}
                  className="w-full flex items-center justify-between p-1.5 hover:bg-slate-900/30 transition-colors"
                >
                  <div className="text-[7px] text-slate-400 font-bold uppercase flex items-center gap-1">
                    <Database className="w-2.5 h-2.5" />
                    Diagnóstico técnico
                  </div>
                  <div className={`text-slate-500 transition-transform ${showGeometricDetail ? 'rotate-180' : ''}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {showGeometricDetail && (
                  <div className="px-1.5 pb-1.5 space-y-1">
                    <div className="bg-slate-900/50 p-1.5 rounded border border-slate-800/40">
                      <div className="text-[6px] text-slate-500 font-bold mb-1 uppercase">
                        Fuente de geometría
                      </div>
                      <div className="text-[7px] text-emerald-400 mono font-black">
                        REAL_DATAMINE
                      </div>
                      {phase6Geometry.dataSource.files.map((file: string) => (
                        <div key={file} className="text-[6px] text-slate-400 mono mt-0.5">
                          {file}
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-900/50 p-1.5 rounded border border-slate-800/40">
                      <div className="text-[6px] text-slate-500 font-bold mb-1 uppercase">
                        Reconstrucción
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[7px] text-slate-500">Puntos leídos:</span>
                          <span className="text-[7px] text-slate-300 mono font-bold">
                            {stats?.totalPoints?.toLocaleString('en-US')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[7px] text-slate-500">Triángulos renderizados:</span>
                          <span className="text-[7px] text-slate-300 mono font-bold">
                            {stats?.pitTriangles?.toLocaleString('en-US')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[7px] text-slate-500">PIDs inexistentes:</span>
                          <span className="text-[7px] text-emerald-400 mono font-bold">
                            {stats?.invalidPIDs?.toLocaleString('en-US')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[7px] text-slate-500">Transformación:</span>
                          <span className="text-[7px] text-slate-300 mono">
                            Centro local XYZ
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 p-1.5 rounded border border-slate-800/40">
                      <div className="text-[6px] text-slate-500 font-bold mb-1 uppercase">
                        Dimensiones reales
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[7px] text-slate-500">X:</span>
                          <span className="text-[7px] text-slate-300 mono">
                            {bounds ? `${bounds.minX.toFixed(2)} → ${bounds.maxX.toFixed(2)}` : '--'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[7px] text-slate-500">Y:</span>
                          <span className="text-[7px] text-slate-300 mono">
                            {bounds ? `${bounds.minY.toFixed(2)} → ${bounds.maxY.toFixed(2)}` : '--'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[7px] text-slate-500">Z:</span>
                          <span className="text-[7px] text-slate-300 mono">
                            {bounds ? `${bounds.minZ.toFixed(2)} → ${bounds.maxZ.toFixed(2)}` : '--'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-950/20 border border-emerald-900/50 p-1.5 rounded">
                      <div className="text-[6px] text-emerald-400 font-bold mb-1 uppercase">
                        Validación mesh
                      </div>
                      <div className="text-[7px] text-emerald-300 leading-tight">
                        <strong>Mesh generado desde TRIANGLES.PID1, PID2 y PID3:</strong>{' '}
                        <span className="font-black">SÍ</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-1 mb-1.5">
              {['FASE', 'PUNTOS', 'TRIÁNGULOS'].map((label) => (
                <div
                  key={label}
                  className="bg-slate-950/70 border border-slate-800/40 p-1 rounded opacity-50"
                >
                  <div className="text-[6px] text-slate-500 font-bold mb-0.5">
                    {label}
                  </div>
                  <div className="text-[9px] text-slate-400 font-black mono">--</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel-content bg-slate-950/70 border border-slate-800 rounded p-2 flex flex-col">
          <div className="flex-1 min-h-0 mb-2 relative">
            {!hasGeometry ? (
              <div className="flex items-center justify-center h-full bg-slate-950/70 rounded border-2 border-dashed border-slate-800">
                <div className="text-center px-6 py-8">
                  {isLoadingGeometry ? (
                    <Activity className="w-16 h-16 text-blue-500/40 animate-pulse mx-auto mb-4" />
                  ) : (
                    <AlertTriangle className="w-16 h-16 text-rose-500/40 mx-auto mb-4" />
                  )}
                  <div className="text-slate-400 text-sm font-black mb-2 uppercase">
                    {isLoadingGeometry ? 'Cargando geometría Datamine' : 'Geometría no disponible'}
                  </div>
                  <div className="text-slate-500 text-[10px] max-w-sm mx-auto leading-relaxed">
                    {geometryError
                      ? geometryError
                      : 'Leyendo puntos y conectividad triangular desde public/data.'}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <DataminePhaseViewer
                  geometry={phase6Geometry}
                  showTopography={showTopography && hasTopography}
                  showPit={showPit}
                  showStrings={showStrings && hasStrings}
                  showWireframe={showWireframe}
                  colorMode={colorMode === 'elevation' ? 'elevation' : 'group'}
                  onTriangleHover={setHoveredTriangle}
                  onStringHover={setHoveredString}
                />

                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                  <button
                    onClick={() => setShowPit(!showPit)}
                    className={`px-2 py-1 rounded text-[7px] font-bold mono transition-colors ${
                      showPit
                        ? 'bg-amber-900/80 border border-amber-600 text-amber-200'
                        : 'bg-slate-800/80 border border-slate-600 text-slate-400'
                    }`}
                  >
                    PIT
                  </button>

                  <button
                    disabled={!hasTopography}
                    onClick={() => setShowTopography(!showTopography)}
                    className={`px-2 py-1 rounded text-[7px] font-bold mono transition-colors ${
                      !hasTopography
                        ? 'bg-slate-900/80 border border-slate-800 text-slate-600 cursor-not-allowed'
                        : showTopography
                          ? 'bg-slate-700/80 border border-slate-500 text-slate-200'
                          : 'bg-slate-800/80 border border-slate-600 text-slate-400'
                    }`}
                  >
                    TOPO{hasTopography ? '' : ' · SIN DATOS'}
                  </button>

                  <button
                    disabled={!hasStrings}
                    onClick={() => setShowStrings(!showStrings)}
                    className={`px-2 py-1 rounded text-[7px] font-bold mono transition-colors ${
                      !hasStrings
                        ? 'bg-slate-900/80 border border-slate-800 text-slate-600 cursor-not-allowed'
                        : showStrings
                          ? 'bg-amber-900/80 border border-amber-600 text-amber-200'
                          : 'bg-slate-800/80 border border-slate-600 text-slate-400'
                    }`}
                  >
                    STRINGS{hasStrings ? '' : ' · SIN DATOS'}
                  </button>

                  <button
                    onClick={() => setShowWireframe(!showWireframe)}
                    className={`px-2 py-1 rounded text-[7px] font-bold mono transition-colors ${
                      showWireframe
                        ? 'bg-cyan-900/80 border border-cyan-600 text-cyan-200'
                        : 'bg-slate-800/80 border border-slate-600 text-slate-400'
                    }`}
                  >
                    WIRE
                  </button>
                </div>

                {hoveredTriangle && (
                  <div className="absolute top-2 right-2 bg-slate-900/95 border border-emerald-500/60 rounded p-2 z-10 min-w-[200px]">
                    <div className="text-[7px] text-emerald-400 font-bold mb-1">FASE 6</div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[7px]">
                        <span className="text-slate-400">Grupo</span>
                        <span className="text-slate-200 mono font-bold">{hoveredTriangle.group}</span>
                      </div>
                      <div className="flex justify-between text-[7px]">
                        <span className="text-slate-400">X Datamine</span>
                        <span className="text-slate-200 mono font-bold">
                          {hoveredTriangle.position?.x.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[7px]">
                        <span className="text-slate-400">Y Datamine</span>
                        <span className="text-slate-200 mono font-bold">
                          {hoveredTriangle.position?.y.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[7px]">
                        <span className="text-slate-400">Z Datamine</span>
                        <span className="text-slate-200 mono font-bold">
                          {hoveredTriangle.position?.z.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {phase6Geometry.validation.messages && !hoveredTriangle && (
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-900/95 border border-slate-700 rounded p-1.5 z-10 max-h-20 overflow-y-auto">
                    <div className="text-[6px] text-slate-400 font-bold mb-0.5">VALIDACIÓN:</div>
                    {phase6Geometry.validation.messages.map((message: string, index: number) => (
                      <div key={index} className="text-[7px] text-slate-300 mono leading-tight">
                        {message}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-slate-800 pt-1.5">
            <div className="flex items-center gap-1 mb-1.5">
              <button
                disabled
                className="p-1 bg-slate-900 opacity-30 border border-slate-800 rounded"
              >
                <SkipBack className="w-3 h-3 text-slate-500" />
              </button>
              <button
                disabled
                className="p-1 bg-slate-900 opacity-30 border border-slate-800 rounded"
              >
                <Play className="w-3 h-3 text-slate-500" />
              </button>
              <button
                disabled
                className="p-1 bg-slate-900 opacity-30 border border-slate-800 rounded"
              >
                <SkipForward className="w-3 h-3 text-slate-500" />
              </button>

              <div className="flex-1 flex items-center gap-1 px-2">
                {[1, 2, 3, 4, 5, 6].map((phase) => (
                  <button
                    key={phase}
                    disabled={phase !== 6 || !hasGeometry}
                    className={`flex-1 py-1 text-[7px] font-bold mono rounded transition-colors ${
                      phase === 6 && hasGeometry
                        ? 'bg-red-900/30 border border-red-600 text-red-300'
                        : 'bg-slate-900/50 border border-slate-800 text-slate-600'
                    } disabled:opacity-40`}
                  >
                    F{phase}
                  </button>
                ))}
              </div>

              <button
                disabled
                className="p-1 border rounded bg-slate-900 border-slate-800 text-slate-600 opacity-40"
                title="No hay fases anteriores disponibles"
              >
                <EyeOff className="w-3 h-3" />
              </button>
              <button
                disabled
                className="p-1 border rounded bg-slate-900 border-slate-800 text-slate-600 opacity-40"
                title="Se requiere más de una fase"
              >
                <GitCompare className="w-3 h-3" />
              </button>
            </div>

            <div className="text-[6px] text-slate-600 leading-tight">
              <span className="text-slate-500 font-semibold">NOTA:</span>{' '}
              La superficie corresponde a la geometría disponible de Fase 6. El simulador no sustituye el diseño ni la optimización minera especializada.
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="dashboard-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        * { box-sizing: border-box; }
        
        /* Optimized for scrollable layout */
        html {
          width: 100%;
          margin: 0;
          padding: 0;
          overflow-y: scroll;
          overflow-x: hidden;
          background-color: #020617 !important;
        }

        body {
          width: 100%;
          min-height: 100vh;
          margin: 0;
          padding: 0;
          overflow-y: auto;
          overflow-x: hidden;
          background-color: #020617 !important;
        }

        #root {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          background-color: #020617 !important;
        }

        .dashboard-shell {
          width: 100%;
          min-height: 100vh;
          height: auto;
          display: flex;
          flex-direction: column;
          overflow: visible;
          background-color: #020617;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .dashboard-main {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 12px;
          padding: 12px;
          width: 100%;
          max-width: none;
          margin: 0;
          min-height: calc(100vh - 58px);
          overflow: visible;
          box-sizing: border-box;
          align-items: start;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
          position: relative;
          width: 100%;
          min-width: 0;
        }

        .right-rail {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 0;
          position: relative;
          width: 100%;
          min-width: 0;
          height: auto;
        }

        .bottom-metrics-row {
          display: grid;
          grid-template-columns: 170px minmax(0, 1fr);
          gap: 12px;
          width: 100%;
        }

        .panel {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border: 1px solid #334155;
          border-radius: 6px;
          padding: 12px;
          min-height: 0;
          overflow: visible;
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          flex-shrink: 0;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #334155;
        }

        .panel-content {
          flex: 1;
          min-height: 0;
          overflow: visible;
        }

        /* Sensitivity Analysis - larger height */
        .main-content > .panel:nth-child(1) {
          min-height: 330px;
        }

        .main-content > .panel:nth-child(1) .panel-content {
          min-height: 280px;
        }

        /* Pit Conceptual - adequate height */
        .main-content > .panel:nth-child(2) {
          min-height: 430px;
        }

        .main-content > .panel:nth-child(2) .panel-content {
          min-height: 350px;
        }

        .mono { font-family: 'Roboto Mono', monospace; }

        input[type=range] {
          -webkit-appearance: none;
          width: 100%;
          background: transparent;
          outline: none;
          height: 4px;
        }
        
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: #1e293b;
          border-radius: 2px;
        }

        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 2px;
          cursor: pointer;
          margin-top: -5px;
          background: #10b981;
          border: 2px solid #064e3b;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        }

        input[type=range]::-moz-range-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: #1e293b;
          border-radius: 2px;
        }

        input[type=range]::-moz-range-thumb {
          height: 14px;
          width: 14px;
          border-radius: 2px;
          background: #10b981;
          border: 2px solid #064e3b;
          cursor: pointer;
        }

        .status-bar {
          background: linear-gradient(90deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          border-bottom: 1px solid #10b981;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          padding: 0 12px;
          height: 58px;
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          max-width: none;
          margin: 0;
          box-sizing: border-box;
        }

        .metric-display {
          background: #0a0f1a;
          border: 1px solid #1e293b;
          font-family: 'Roboto Mono', monospace;
        }

        @keyframes blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0.3; }
        }

        .blink { animation: blink 2s ease-in-out infinite; }

        .led-green {
          background: #10b981;
          box-shadow: 0 0 10px #10b981, inset 0 0 5px #064e3b;
        }

        .led-amber {
          background: #f59e0b;
          box-shadow: 0 0 10px #f59e0b, inset 0 0 5px #78350f;
        }

        /* Responsive - between desktop and tablet */
        @media (max-width: 1200px) {
          .dashboard-main {
            grid-template-columns: minmax(0, 1fr) 250px;
            gap: 12px;
          }
        }

        /* Responsive - mobile */
        @media (max-width: 900px) {
          .dashboard-main {
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 12px;
          }

          .main-content,
          .right-rail {
            width: 100%;
            grid-column: 1;
          }

          .bottom-metrics-row {
            grid-template-columns: 1fr;
          }
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .dashboard-main {
            padding: 10px;
          }

          .panel {
            padding: 10px;
          }

          .main-content > .panel:nth-child(1) {
            min-height: 280px;
          }

          .main-content > .panel:nth-child(1) .panel-content {
            min-height: 220px;
          }

          .main-content > .panel:nth-child(2) {
            min-height: 360px;
          }

          .main-content > .panel:nth-child(2) .panel-content {
            min-height: 280px;
          }

          .status-bar {
            padding: 8px 10px;
            height: auto;
            min-height: 58px;
            flex-wrap: wrap;
          }
        }
      `}</style>

      {/* Top Status Bar */}
      <div className="status-bar">
        <div className="w-full flex items-center justify-between px-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center">
                <Mountain className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="text-emerald-400 font-black text-sm tracking-wider">DISPATCH SYSTEM</div>
                <div className="text-[10px] text-slate-500 font-semibold">Lane Cut-off Optimization Engine</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full led-green blink"></div>
              <span className="text-emerald-400 text-xs font-bold mono">SYSTEM ONLINE</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600 rounded text-emerald-400 text-[10px] font-bold mono transition-colors"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              <span>{isFullscreen ? 'SALIR DE PANTALLA COMPLETA' : 'PANTALLA COMPLETA'}</span>
            </button>
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-400 mono">REAL-TIME</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-300 mono font-bold">{currentTime.toLocaleTimeString()}</span>
            </div>
            <div className="text-xs text-slate-400 mono">{currentTime.toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-main">
        {/* MAIN CONTENT */}
        <div className="main-content">
          {/* 1. Sensitivity Analysis */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-bold text-slate-300 uppercase">Sensitivity Analysis</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-950/30 border border-blue-900/50 rounded">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-[7px] text-blue-300 font-bold mono">TON</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-950/30 border border-amber-900/50 rounded">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-[7px] text-amber-300 font-bold mono">LEY</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-950/30 border border-emerald-900/50 rounded">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[7px] text-emerald-300 font-bold mono">VAN</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-950/40 border border-blue-800/50 rounded">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-[7px] text-blue-200 font-bold mono">TIR: {displayIRR.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="panel-content bg-slate-950/70 border border-slate-800 rounded overflow-hidden">
              <InteractiveChart />
            </div>
          </div>

          {/* 2. PIT MODULE - Switches between Conceptual and Datamine */}
          <div className="panel">
            {renderPitModule()}
          </div>

          {/* 3. Bottom Metrics Row */}
          <div className="bottom-metrics-row">
            {/* Recovery Rates */}
            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-bold text-slate-300 uppercase">Recovery Rates</span>
                </div>
              </div>
              <div className="panel-content space-y-1.5">
                <div className="bg-cyan-950/30 border border-cyan-900/50 p-1.5 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[7px] text-cyan-400 font-bold">REC. MINADO</div>
                    <div className="text-sm font-black text-cyan-400 mono">{(mineRecovery * 100).toFixed(0)}<span className="text-[9px] text-cyan-500">%</span></div>
                  </div>
                  <div className="h-1 bg-slate-900 rounded overflow-hidden mb-1">
                    <div className="h-full bg-cyan-400" style={{ width: `${mineRecovery * 100}%` }}></div>
                  </div>
                  <input type="range" min="80" max="100" step="1" value={mineRecovery * 100} onChange={(e) => setMineRecovery(parseFloat(e.target.value) / 100)} />
                </div>
                <div className="bg-amber-950/30 border border-amber-900/50 p-1.5 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[7px] text-amber-400 font-bold">REC. METALÚRGICA</div>
                    <div className="text-sm font-black text-amber-400 mono">{(plantRecovery * 100).toFixed(0)}<span className="text-[9px] text-amber-500">%</span></div>
                  </div>
                  <div className="h-1 bg-slate-900 rounded overflow-hidden mb-1">
                    <div className="h-full bg-amber-400" style={{ width: `${plantRecovery * 100}%` }}></div>
                  </div>
                  <input type="range" min="70" max="95" step="1" value={plantRecovery * 100} onChange={(e) => setPlantRecovery(parseFloat(e.target.value) / 100)} />
                </div>
              </div>
            </div>

            {/* Cost Structure & System Status */}
            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-2">
                  <Settings className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase">Cost Structure & System Status</span>
                </div>
              </div>
              <div className="panel-content space-y-1.5">
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="metric-display p-1.5 rounded">
                    <div className="text-[7px] text-slate-500 font-bold mb-0.5">CAPEX</div>
                    <div className="text-xs font-black text-purple-400 mono">${Math.round(results.dynamicCAPEX)}<span className="text-[8px] text-slate-500">M</span></div>
                  </div>
                  <div className="metric-display p-1.5 rounded">
                    <div className="text-[7px] text-slate-500 font-bold mb-0.5">MINE OPEX</div>
                    <div className="text-xs font-black text-cyan-400 mono">${results.OPEX_MINING.toFixed(2)}<span className="text-[8px] text-slate-500">/t</span></div>
                  </div>
                  <div className="metric-display p-1.5 rounded">
                    <div className="text-[7px] text-slate-500 font-bold mb-0.5">PLANT OPEX</div>
                    <div className="text-xs font-black text-orange-400 mono">${results.dynamicOpexProcessing.toFixed(2)}<span className="text-[8px] text-slate-500">/t</span></div>
                  </div>
                  <div className="metric-display p-1.5 rounded">
                    <div className="text-[7px] text-slate-500 font-bold mb-0.5">PRODUCTION</div>
                    <div className="text-xs font-black text-emerald-400 mono">{results.effectiveProductionRate.toFixed(1)}<span className="text-[8px] text-slate-500">Mt/a</span></div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 p-1.5 rounded border ${millCapacity > results.maxOreFromMine ? 'bg-amber-950/20 border-amber-900/50' : 'bg-emerald-950/20 border-emerald-900/50'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${millCapacity > results.maxOreFromMine ? 'led-amber' : 'led-green'}`}></div>
                  <div className="flex-1">
                    {millCapacity > results.maxOreFromMine ? (
                      <div>
                        <div className="text-amber-300 font-bold text-[8px] mono mb-0.5">MINE CONSTRAINT</div>
                        <div className="text-amber-400/70 text-[7px]">Plant at {(results.maxOreFromMine / millCapacity * 100).toFixed(0)}% capacity</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-emerald-300 font-bold text-[8px] mono mb-0.5">PLANT CONSTRAINT</div>
                        <div className="text-emerald-400/70 text-[7px]">Processing at 100%</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT RAIL */}
        <div className="right-rail">
          {/* 1. Control Parameters */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-slate-300 uppercase">Control Parameters</span>
              </div>
            </div>
            <div className="panel-content space-y-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1">
                    <Mountain className="w-3 h-3 text-slate-500" />
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Mine Cap.</span>
                  </div>
                  <span className="text-xs font-black text-white mono">{mineCapacity} <span className="text-[8px] text-slate-500">Mt/a</span></span>
                </div>
                <input type="range" min="30" max="250" step="5" value={mineCapacity} onChange={(e) => setMineCapacity(parseFloat(e.target.value))} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1">
                    <Factory className="w-3 h-3 text-slate-500" />
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Plant Cap.</span>
                  </div>
                  <span className="text-xs font-black text-white mono">{millCapacity} <span className="text-[8px] text-slate-500">Mt/a</span></span>
                </div>
                <input type="range" min="10" max="85" step="5" value={millCapacity} onChange={(e) => setMillCapacity(parseFloat(e.target.value))} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-500" />
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Strip Ratio</span>
                  </div>
                  <span className="text-xs font-black text-amber-400 mono">{stripRatio.toFixed(1)} <span className="text-[8px] text-slate-500">: 1</span></span>
                </div>
                <input type="range" min="0.4" max="5.5" step="0.1" value={stripRatio} onChange={(e) => setStripRatio(parseFloat(e.target.value))} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-slate-500" />
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Discount Rate</span>
                  </div>
                  <span className="text-xs font-black text-purple-400 mono">{(discountRate * 100).toFixed(1)} <span className="text-[8px] text-slate-500">%</span></span>
                </div>
                <input type="range" min="0.05" max="0.15" step="0.005" value={discountRate} onChange={(e) => setDiscountRate(parseFloat(e.target.value))} />
              </div>
            </div>
          </div>

          {/* 2. Critical Values */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-slate-300 uppercase">Critical Values</span>
              </div>
            </div>
            <div className="panel-content space-y-2">
              <div className="metric-display p-2 rounded">
                <div className="text-[8px] text-slate-500 font-bold mb-0.5">BREAKEVEN CUT-OFF</div>
                <div className="text-lg font-black text-amber-400 mono">{results.breakeven.toFixed(3)}<span className="text-xs text-amber-500 ml-1">% Cu</span></div>
              </div>
              <div className="metric-display p-2 rounded">
                <div className="text-[8px] text-emerald-500 font-bold mb-0.5">OPTIMAL CUT-OFF</div>
                <div className="text-lg font-black text-emerald-400 mono">{results.optimalCutoff.toFixed(3)}<span className="text-xs text-emerald-500 ml-1">% Cu</span></div>
              </div>
            </div>
          </div>

          {/* 3. Financial KPIs */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-slate-300 uppercase">Financial KPIs</span>
              </div>
            </div>
            <div className="panel-content">
              {results.maxVAN <= 0 ? (
                <div className="bg-rose-950/30 border border-rose-900/50 p-2 rounded flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <div>
                    <div className="text-rose-300 font-bold text-[10px] mb-1">NON-VIABLE</div>
                    <div className="text-rose-400/70 text-[9px]">Cost exceeds revenue</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="metric-display p-2 rounded">
                    <div className="text-[8px] text-slate-500 font-bold mb-0.5">NET PRESENT VALUE</div>
                    <div className="text-base font-black text-emerald-400 mono">${Math.round(results.maxVAN).toLocaleString()}<span className="text-[10px] text-slate-500 ml-1">M USD</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="metric-display p-1.5 rounded">
                      <div className="text-[7px] text-slate-500 font-bold mb-0.5">IRR</div>
                      <div className="text-sm font-black text-blue-400 mono">{results.finalTir.toFixed(1)}<span className="text-[10px]">%</span></div>
                    </div>
                    <div className="metric-display p-1.5 rounded">
                      <div className="text-[7px] text-slate-500 font-bold mb-0.5">LOM</div>
                      <div className="text-sm font-black text-slate-300 mono">{results.bestScenario.lom || 0}<span className="text-[10px] text-slate-500">y</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Resources */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-slate-300 uppercase">Resources</span>
              </div>
            </div>
            <div className="panel-content space-y-1.5">
              <div className="bg-blue-950/30 border border-blue-900/50 p-1.5 rounded">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-[8px] text-blue-400 font-bold">ORE TONNAGE</div>
                  <div className="text-blue-300 font-black mono text-xs">{results.bestScenario.tonnage ? results.bestScenario.tonnage.toFixed(0) : '0'} Mt</div>
                </div>
                <div className="h-1 bg-slate-900 rounded overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${Math.min((results.bestScenario.tonnage || 0) / MAX_T * 100, 100)}%` }}></div>
                </div>
              </div>
              <div className="bg-amber-950/30 border border-amber-900/50 p-1.5 rounded">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-[8px] text-amber-400 font-bold">HEAD GRADE</div>
                  <div className="text-amber-300 font-black mono text-xs">{results.bestScenario.grade ? results.bestScenario.grade.toFixed(3) : '0.000'}%</div>
                </div>
                <div className="h-1 bg-slate-900 rounded overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${Math.min((results.bestScenario.grade || 0) / MAX_G * 100, 100)}%` }}></div>
                </div>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-900/50 p-1.5 rounded">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-[8px] text-emerald-400 font-bold">METAL CONTENT</div>
                  <div className="text-emerald-300 font-black mono text-xs">{results.bestScenario.metal ? results.bestScenario.metal.toFixed(2) : '0.00'} Mt</div>
                </div>
                <div className="h-1 bg-slate-900 rounded overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.min((results.bestScenario.metal || 0) / 15 * 100, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Quick Actions */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-300 uppercase">Quick Actions</span>
              </div>
            </div>
            <div className="panel-content space-y-1.5">
              <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] py-1.5 px-2 rounded transition-colors uppercase">Export Report</button>
              <button className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-[9px] py-1.5 px-2 rounded transition-colors uppercase">Save Scenario</button>
              <button className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-[9px] py-1.5 px-2 rounded transition-colors uppercase">Reset Default</button>
            </div>
          </div>

          {/* 6. System Status */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-300 uppercase">System Status</span>
              </div>
            </div>
            <div className="panel-content text-[8px] text-slate-600 mono space-y-0.5">
              <div className="flex justify-between">
                <span>Engine:</span>
                <span className="text-emerald-500 font-bold">Lane v2.1</span>
              </div>
              <div className="flex justify-between">
                <span>Iterations:</span>
                <span className="text-slate-400">101</span>
              </div>
              <div className="flex justify-between">
                <span>Compute:</span>
                <span className="text-slate-400">&lt;10ms</span>
              </div>
              <div className="flex justify-between">
                <span>Precision:</span>
                <span className="text-slate-400">0.01%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
