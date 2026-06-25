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

  // Load Phase 6 geometry when entering Datamine mode.
  // `isLoadingGeometry` is deliberately not a dependency: including it here
  // cancels the active request immediately after enabling the loading state.
  useEffect(() => {
    if (
      pitMode !== 'datamine' ||
      phase6Geometry ||
      geometryError
    ) {
      return;
    }

    let active = true;
    setIsLoadingGeometry(true);

    parsePhase6Geometry()
      .then((geometry) => {
        if (!active) return;
        setPhase6Geometry(geometry);
        setGeometryError(null);
        console.log('Phase 6 Geometry Loaded:', geometry.validation);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error
          ? error.message
          : 'No se pudo cargar la geometría Datamine.';
        console.error('Error loading Phase 6 geometry:', error);
        setPhase6Geometry(null);
        setGeometryError(message);
      })
      .finally(() => {
        if (active) setIsLoadingGeometry(false);
      });

    return () => {
      active = false;
    };
  }, [pitMode, phase6Geometry, geometryError]);

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
        reservePercent,
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
  const maxShellNPV = Math.max(...pitShells.map(s => s.cumulativeNPV), 1);
  const maxMarginalNPV = Math.max(...pitShells.map(s => Math.abs(s.marginalNPV)), 1);

  // Color calculation for pit shells
  const getShellColor = (shell: PitShell): string => {
    switch (pitColorVariable) {
      case 'marginal': {
        const ratio = shell.marginalNPV / maxMarginalNPV;
        if (ratio > 0.6) return '#10b981';
        if (ratio > 0.3) return '#14b8a6';
        if (ratio > 0.1) return '#06b6d4';
        if (ratio > 0) return '#3b82f6';
        return '#ef4444';
      }
      case 'cumulative': {
        const ratio = shell.cumulativeNPV / maxShellNPV;
        if (ratio > 0.8) return '#10b981';
        if (ratio > 0.6) return '#14b8a6';
        if (ratio > 0.4) return '#06b6d4';
        if (ratio > 0.2) return '#3b82f6';
        return '#6366f1';
      }
      case 'grade': {
        const ratio = shell.averageGrade / MAX_G;
        if (ratio > 0.7) return '#f59e0b';
        if (ratio > 0.5) return '#eab308';
        if (ratio > 0.3) return '#84cc16';
        return '#22c55e';
      }
      case 'reserves': {
        const ratio = shell.reservePercent;
        if (ratio > 0.8) return '#8b5cf6';
        if (ratio > 0.6) return '#6366f1';
        if (ratio > 0.4) return '#3b82f6';
        if (ratio > 0.2) return '#06b6d4';
        return '#14b8a6';
      }
      case 'value_per_ton': {
        const valuePerTon = shell.cumulativeNPV / shell.cumulativeReserves;
        const maxValuePerTon = Math.max(...pitShells.map(s => s.cumulativeNPV / s.cumulativeReserves));
        const ratio = valuePerTon / maxValuePerTon;
        if (ratio > 0.8) return '#10b981';
        if (ratio > 0.6) return '#22c55e';
        if (ratio > 0.4) return '#84cc16';
        if (ratio > 0.2) return '#eab308';
        return '#f59e0b';
      }
      default:
        return '#06b6d4';
    }
  };

  // Render pit shell based on view
  const renderPitShell = (shell: PitShell, index: number) => {
    const centerX = 400;
    const centerY = 200;
    const isSelected = selectedShell === shell.id;
    const isHovered = hoveredShell === shell.id;
    const isOptimal = shell.id === 7;
    const color = getShellColor(shell);
    const isVisible = shell.id <= maxVisibleShell;

    if (!isVisible) return null;

    if (pitView === 'plan') {
      const radiusX = 40 + shell.reservePercent * 280;
      const radiusY = 25 + shell.reservePercent * 180;
      return (
        <g
          key={shell.id}
          onMouseEnter={() => setHoveredShell(shell.id)}
          onMouseLeave={() => setHoveredShell(null)}
          onClick={() => setSelectedShell(isSelected ? null : shell.id)}
          style={{ cursor: 'pointer' }}
        >
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={radiusX}
            ry={radiusY}
            fill="none"
            stroke={color}
            strokeWidth={isSelected || isHovered ? 3 : isOptimal ? 2.5 : 1.5}
            opacity={isHovered || isSelected ? 1 : 0.7}
            filter={isOptimal ? 'url(#glow-pit)' : undefined}
          />
        </g>
      );
    } else if (pitView === 'perspective') {
      const scale = 0.25 + shell.reservePercent * 0.75;
      const offsetY = shell.depth * 80;
      const points = [];
      const numPoints = 32;
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const radiusX = 280 * scale;
        const radiusY = 120 * scale;
        const x = centerX + Math.cos(angle) * radiusX;
        const y = centerY + Math.sin(angle) * radiusY + offsetY;
        points.push(`${x},${y}`);
      }
      return (
        <g
          key={shell.id}
          onMouseEnter={() => setHoveredShell(shell.id)}
          onMouseLeave={() => setHoveredShell(null)}
          onClick={() => setSelectedShell(isSelected ? null : shell.id)}
          style={{ cursor: 'pointer' }}
        >
          <polygon
            points={points.join(' ')}
            fill={color}
            fillOpacity={0.15}
            stroke={color}
            strokeWidth={isSelected || isHovered ? 3 : isOptimal ? 2.5 : 1.5}
            opacity={isHovered || isSelected ? 1 : 0.8}
            filter={isOptimal ? 'url(#glow-pit)' : undefined}
          />
        </g>
      );
    } else {
      const width = 60 + shell.reservePercent * 560;
      const depth = shell.depth * 280;
      const x = centerX - width / 2;
      const y = 50;
      const pathData = `M ${x},${y} L ${x + width},${y} L ${x + width * 0.85},${y + depth} L ${x + width * 0.15},${y + depth} Z`;
      return (
        <g
          key={shell.id}
          onMouseEnter={() => setHoveredShell(shell.id)}
          onMouseLeave={() => setHoveredShell(null)}
          onClick={() => setSelectedShell(isSelected ? null : shell.id)}
          style={{ cursor: 'pointer' }}
        >
          <path
            d={pathData}
            fill={color}
            fillOpacity={0.12}
            stroke={color}
            strokeWidth={isSelected || isHovered ? 3 : isOptimal ? 2.5 : 1.5}
            opacity={isHovered || isSelected ? 1 : 0.8}
            filter={isOptimal ? 'url(#glow-pit)' : undefined}
          />
        </g>
      );
    }
  };

  const selectedShellData = selectedShell ? pitShells.find(s => s.id === selectedShell) : null;
  const hoveredShellData = hoveredShell ? pitShells.find(s => s.id === hoveredShell) : null;
  const displayShellData = hoveredShellData || selectedShellData;

  // Chart dimensions
  const chartWidth = 900;
  const chartHeight = 300;
  const padding = { top: 25, right: 70, bottom: 45, left: 55 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const xScale = (cutoff: number) => padding.left + (cutoff / MAX_X) * plotWidth;
  const tonnageScale = (tonnage: number) => padding.top + plotHeight - (tonnage / MAX_T) * plotHeight;
  const npvScale = (npv: number) => {
    const maxNPV = Math.max(results.maxVAN, 1);
    return padding.top + plotHeight - (npv / maxNPV) * plotHeight;
  };

  const tonnagePath = results.dataPoints.map((d, i) => {
    const x = xScale(d.cutoff);
    const y = tonnageScale(d.tonnage);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const gradePath = results.dataPoints.map((d, i) => {
    const x = xScale(d.cutoff);
    const y = padding.top + plotHeight - (d.averageGrade / MAX_G) * plotHeight;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const npvPath = results.dataPoints.map((d, i) => {
    const x = xScale(d.cutoff);
    const y = npvScale(d.npv);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const npvAreaPath = `${npvPath} L ${xScale(results.dataPoints[results.dataPoints.length - 1]?.cutoff || MAX_X)} ${padding.top + plotHeight} L ${xScale(results.dataPoints[0]?.cutoff || 0)} ${padding.top + plotHeight} Z`;

  const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cutoff = ((x / rect.width) * chartWidth - padding.left) / plotWidth * MAX_X;
    const closestPoint = results.dataPoints.reduce((prev, curr) => 
      Math.abs(curr.cutoff - cutoff) < Math.abs(prev.cutoff - cutoff) ? curr : prev
    );
    setHoveredPoint(closestPoint);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleChartMouseLeave = () => {
    setHoveredPoint(null);
    setMousePosition(null);
  };

  return (
    <div className="dashboard-shell">
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { height: 100%; margin: 0; overflow: hidden; }
        body { background: #020617; color: #e2e8f0; }
        .dashboard-shell {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #020617;
          overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .status-bar {
          height: 56px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-bottom: 2px solid #10b981;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          flex-shrink: 0;
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.15);
        }
        .dashboard-main {
          flex: 1;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 10px;
          padding: 10px;
          overflow: hidden;
          min-height: 0;
        }
        .main-content {
          display: grid;
          grid-template-rows: minmax(330px, 42%) minmax(430px, 1fr) auto;
          gap: 10px;
          min-width: 0;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .right-rail {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .panel {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border: 1px solid #334155;
          border-radius: 6px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          min-height: 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid #334155;
          flex-shrink: 0;
        }
        .panel-content {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .chart-container {
          flex: 1;
          min-height: 240px;
          position: relative;
          background: #020617;
          border: 1px solid #1e293b;
          border-radius: 4px;
          overflow: hidden;
        }
        .metric-display {
          background: #0f172a;
          border: 1px solid #1e293b;
        }
        .glow-green { box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }
        .mono { font-family: 'JetBrains Mono', 'Courier New', monospace; }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: #1e293b;
          border-radius: 2px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: #10b981;
          border: 2px solid #065f46;
          border-radius: 2px;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
        }
        select {
          background: #0f172a;
          border: 1px solid #334155;
          color: #e2e8f0;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 9px;
        }
        button {
          transition: all 0.2s;
        }
        button:hover {
          transform: translateY(-1px);
        }
        .bottom-metrics-row {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 10px;
          min-height: 145px;
          flex-shrink: 0;
        }
        @media (max-width: 1200px) {
          .dashboard-main { grid-template-columns: 1fr; overflow-y: auto; }
          .right-rail { display: grid; grid-template-columns: repeat(3, 1fr); overflow: visible; }
          .main-content { overflow: visible; grid-template-rows: auto auto auto; }
          .dashboard-shell { overflow-y: auto; }
        }
        @media (max-width: 768px) {
          .right-rail { grid-template-columns: 1fr; }
          .bottom-metrics-row { grid-template-columns: 1fr; }
          .status-bar { padding: 0 8px; }
        }
      `}</style>

      {/* STATUS BAR */}
      <div className="status-bar">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded flex items-center justify-center">
              <Mountain className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-base font-black text-emerald-400 tracking-wide">DISPATCH SYSTEM</h1>
              <p className="text-[10px] text-slate-500">Lane Cut-off Optimization Engine</p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-700"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse glow-green"></div>
            <span className="text-xs font-bold text-emerald-400 mono">SYSTEM ONLINE</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[10px] font-bold text-emerald-400 uppercase tracking-wider"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa'}</span>
          </button>
          <div className="flex items-center gap-2 text-slate-500">
            <Radio className="w-3.5 h-3.5" />
            <span className="text-xs mono">REAL-TIME</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-sm font-bold mono">{currentTime.toLocaleTimeString()}</span>
          </div>
          <div className="text-xs text-slate-500 mono">{currentTime.toLocaleDateString()}</div>
        </div>
      </div>

      {/* MAIN DASHBOARD */}
      <div className="dashboard-main">
        {/* MAIN CONTENT */}
        <div className="main-content">
          {/* PANEL 1: SENSITIVITY ANALYSIS */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold text-slate-300 uppercase">Sensitivity Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-950/50 border border-blue-900 rounded">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-[8px] text-blue-400 font-bold">TON</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-950/50 border border-amber-900 rounded">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-[8px] text-amber-400 font-bold">LEY</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-950/50 border border-emerald-900 rounded">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[8px] text-emerald-400 font-bold">VAN</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <span className="text-[8px] text-slate-400 font-bold mono">TIR: {results.finalTir.toFixed(1)}%</span>
                </div>
              </div>
            </div>
            <div className="panel-content">
              <div className="chart-container">
                <svg
                  ref={chartRef}
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  preserveAspectRatio="none"
                  className="w-full h-full"
                  onMouseMove={handleChartMouseMove}
                  onMouseLeave={handleChartMouseLeave}
                >
                  <defs>
                    <linearGradient id="npvGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Grid */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                    <line
                      key={`h-${ratio}`}
                      x1={padding.left}
                      y1={padding.top + ratio * plotHeight}
                      x2={padding.left + plotWidth}
                      y2={padding.top + ratio * plotHeight}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                  ))}

                  {[0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2].map((value) => (
                    <g key={`v-${value}`}>
                      <line
                        x1={xScale(value)}
                        y1={padding.top}
                        x2={xScale(value)}
                        y2={padding.top + plotHeight}
                        stroke="#1e293b"
                        strokeWidth="1"
                        strokeDasharray="3,3"
                      />
                      <text
                        x={xScale(value)}
                        y={padding.top + plotHeight + 18}
                        fill="#64748b"
                        fontSize="10"
                        textAnchor="middle"
                        className="mono"
                      >
                        {value.toFixed(1)}
                      </text>
                    </g>
                  ))}

                  {[0, 500, 1000, 1500].map((value) => (
                    <text
                      key={`ton-${value}`}
                      x={padding.left - 10}
                      y={tonnageScale(value) + 4}
                      fill="#3b82f6"
                      fontSize="10"
                      textAnchor="end"
                      className="mono"
                    >
                      {value}
                    </text>
                  ))}

                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                    <text
                      key={`npv-${ratio}`}
                      x={padding.left + plotWidth + 10}
                      y={padding.top + plotHeight - ratio * plotHeight + 4}
                      fill="#10b981"
                      fontSize="10"
                      className="mono"
                    >
                      ${Math.round(results.maxVAN * ratio).toLocaleString()}M
                    </text>
                  ))}

                  {/* NPV area */}
                  <path d={npvAreaPath} fill="url(#npvGradient)" />

                  {/* Tonnage curve */}
                  <path d={tonnagePath} fill="none" stroke="#3b82f6" strokeWidth="3" />

                  {/* Grade curve */}
                  <path d={gradePath} fill="none" stroke="#f59e0b" strokeWidth="3" />

                  {/* NPV curve */}
                  <path d={npvPath} fill="none" stroke="#10b981" strokeWidth="4" filter="url(#glow)" />

                  {/* Breakeven line */}
                  <line
                    x1={xScale(results.breakeven)}
                    y1={padding.top}
                    x2={xScale(results.breakeven)}
                    y2={padding.top + plotHeight}
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="6,4"
                  />

                  {/* Optimal line */}
                  <line
                    x1={xScale(results.optimalCutoff)}
                    y1={padding.top}
                    x2={xScale(results.optimalCutoff)}
                    y2={padding.top + plotHeight}
                    stroke="#10b981"
                    strokeWidth="3"
                  />

                  {/* Optimal markers */}
                  {results.maxVAN > 0 && (
                    <>
                      <circle
                        cx={xScale(results.optimalCutoff)}
                        cy={npvScale(results.maxVAN)}
                        r="7"
                        fill="#10b981"
                        stroke="#fff"
                        strokeWidth="2"
                      />
                      <circle
                        cx={xScale(results.optimalCutoff)}
                        cy={tonnageScale(results.bestScenario.tonnage)}
                        r="6"
                        fill="#3b82f6"
                        stroke="#fff"
                        strokeWidth="2"
                      />
                      <circle
                        cx={xScale(results.optimalCutoff)}
                        cy={padding.top + plotHeight - (results.bestScenario.grade / MAX_G) * plotHeight}
                        r="6"
                        fill="#f59e0b"
                        stroke="#fff"
                        strokeWidth="2"
                      />
                    </>
                  )}

                  {/* Axes */}
                  <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="#64748b" strokeWidth="2" />
                  <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#64748b" strokeWidth="2" />

                  {/* X-axis label */}
                  <text x={padding.left + plotWidth / 2} y={chartHeight - 5} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="bold">
                    LEY DE CORTE (% Cu)
                  </text>

                  {/* Hover indicator */}
                  {hoveredPoint && (
                    <>
                      <line
                        x1={xScale(hoveredPoint.cutoff)}
                        y1={padding.top}
                        x2={xScale(hoveredPoint.cutoff)}
                        y2={padding.top + plotHeight}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        opacity="0.5"
                      />
                      <circle cx={xScale(hoveredPoint.cutoff)} cy={npvScale(hoveredPoint.npv)} r="5" fill="#10b981" stroke="#fff" strokeWidth="2" />
                      <circle cx={xScale(hoveredPoint.cutoff)} cy={tonnageScale(hoveredPoint.tonnage)} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
                      <circle cx={xScale(hoveredPoint.cutoff)} cy={padding.top + plotHeight - (hoveredPoint.averageGrade / MAX_G) * plotHeight} r="5" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
                    </>
                  )}
                </svg>

                {/* Hover tooltip */}
                {hoveredPoint && mousePosition && (
                  <div
                    className="fixed z-50 bg-slate-900 border border-emerald-500/50 rounded-lg p-3 shadow-2xl pointer-events-none"
                    style={{
                      left: mousePosition.x + 15,
                      top: mousePosition.y + 15,
                      minWidth: '200px'
                    }}
                  >
                    <div className="text-emerald-400 font-bold text-xs mb-2 mono">CUT-OFF: {hoveredPoint.cutoff.toFixed(3)}% Cu</div>
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between gap-4"><span className="text-slate-500">Tonnage:</span><span className="text-blue-400 font-bold mono">{hoveredPoint.tonnage.toFixed(1)} Mt</span></div>
                      <div className="flex justify-between gap-4"><span className="text-slate-500">Grade:</span><span className="text-amber-400 font-bold mono">{hoveredPoint.averageGrade.toFixed(3)}%</span></div>
                      <div className="flex justify-between gap-4"><span className="text-slate-500">NPV:</span><span className="text-emerald-400 font-bold mono">${hoveredPoint.npv.toFixed(0)}M</span></div>
                      <div className="flex justify-between gap-4"><span className="text-slate-500">IRR:</span><span className="text-purple-400 font-bold mono">{hoveredPoint.irr !== null ? hoveredPoint.irr.toFixed(1) + '%' : 'N/A'}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-slate-500">LOM:</span><span className="text-slate-300 font-bold mono">{hoveredPoint.lifeOfMine}y</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PANEL 2: PIT CONCEPTUAL / DATAMINE PHASES */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold text-slate-300 uppercase">
                  {pitMode === 'conceptual' ? 'Pit Conceptual — Reservas y Valor' : 'Secuencia de Fases — Geometría y Valor'}
                </span>
                {pitMode === 'conceptual' ? (
                  <button
                    onClick={() => setPitMode('datamine')}
                    className="ml-2 px-2 py-1 bg-blue-950/50 hover:bg-blue-900/70 border border-blue-700 rounded text-[8px] font-bold text-blue-400 uppercase"
                  >
                    Cambiar a Datamine
                  </button>
                ) : (
                  <button
                    onClick={() => setPitMode('conceptual')}
                    className="ml-2 px-2 py-1 bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-700 rounded text-[8px] font-bold text-emerald-400 uppercase"
                  >
                    Volver a Conceptual
                  </button>
                )}
              </div>
            </div>

            <div className="panel-content">
              {pitMode === 'conceptual' ? (
                <>
                  {/* CONCEPTUAL MODE */}
                  {/* Controls */}
                  <div className="grid grid-cols-2 gap-2 mb-2 flex-shrink-0">
                    <select value={pitView} onChange={(e) => setPitView(e.target.value as any)} className="w-full">
                      <option value="plan">Vista en Planta</option>
                      <option value="perspective">Perspectiva 2.5D</option>
                      <option value="profile">Perfil Longitudinal</option>
                    </select>
                    <select value={pitColorVariable} onChange={(e) => setPitColorVariable(e.target.value as any)} className="w-full">
                      <option value="marginal">VAN Marginal</option>
                      <option value="cumulative">VAN Acumulado</option>
                      <option value="grade">Ley Media</option>
                      <option value="reserves">Reservas</option>
                      <option value="value_per_ton">Valor por Tonelada</option>
                    </select>
                  </div>

                  {/* KPIs */}
                  <div className="grid grid-cols-4 gap-1 mb-2 flex-shrink-0">
                    <div className="metric-display p-1.5 rounded">
                      <div className="text-[7px] text-blue-400 font-bold">RESERVAS</div>
                      <div className="text-xs font-black text-blue-300 mono">{results.bestScenario.tonnage.toFixed(0)} Mt</div>
                    </div>
                    <div className="metric-display p-1.5 rounded">
                      <div className="text-[7px] text-emerald-400 font-bold">ÓPTIMO</div>
                      <div className="text-xs font-black text-emerald-300 mono">7/10</div>
                    </div>
                    <div className="metric-display p-1.5 rounded">
                      <div className="text-[7px] text-amber-400 font-bold">PROF.</div>
                      <div className="text-xs font-black text-amber-300 mono">{maxVisibleShell >= 7 ? '1.00' : (maxVisibleShell / 10).toFixed(2)}</div>
                    </div>
                    <div className="metric-display p-1.5 rounded">
                      <div className="text-[7px] text-purple-400 font-bold">VAN</div>
                      <div className="text-xs font-black text-purple-300 mono">${Math.round(results.maxVAN)}M</div>
                    </div>
                  </div>

                  {/* PIT VISUALIZATION */}
                  <div className="flex-1 min-h-0 bg-slate-950 border border-slate-800 rounded relative overflow-hidden">
                    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
                      <defs>
                        <filter id="glow-pit">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                        <linearGradient id="pit-bg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#020617" />
                          <stop offset="100%" stopColor="#0f172a" />
                        </linearGradient>
                      </defs>

                      {/* Background */}
                      <rect width="800" height="400" fill="url(#pit-bg)" />

                      {/* Grid */}
                      {[0, 100, 200, 300, 400, 500, 600, 700, 800].map(x => (
                        <line key={`gx-${x}`} x1={x} y1="0" x2={x} y2="400" stroke="#0f172a" strokeWidth="1" />
                      ))}
                      {[0, 100, 200, 300, 400].map(y => (
                        <line key={`gy-${y}`} x1="0" y1={y} x2="800" y2={y} stroke="#0f172a" strokeWidth="1" />
                      ))}

                      {/* Render shells in reverse order for proper layering */}
                      {[...pitShells].reverse().map((shell, index) => renderPitShell(shell, index))}

                      {/* Optimal indicator */}
                      {maxVisibleShell >= 7 && (
                        <g>
                          <circle cx="400" cy={pitView === 'perspective' ? 200 + pitShells[6]?.depth * 80 : 200} r="6" fill="#10b981" stroke="#fff" strokeWidth="2" filter="url(#glow-pit)" />
                          <text x="415" y={pitView === 'perspective' ? 205 + pitShells[6]?.depth * 80 : 205} fill="#10b981" fontSize="10" fontWeight="bold">ÓPTIMO</text>
                        </g>
                      )}
                    </svg>

                    {/* Shell info tooltip */}
                    {displayShellData && (
                      <div className="absolute top-3 right-3 bg-slate-900/95 border border-emerald-500/50 rounded-lg p-3 shadow-2xl min-w-[220px]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-emerald-400 font-bold text-xs">SHELL {displayShellData.id}</span>
                          <span className={`text-[8px] px-2 py-0.5 rounded font-bold ${
                            displayShellData.status === 'economic' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800' :
                            displayShellData.status === 'marginal' ? 'bg-amber-950/50 text-amber-400 border border-amber-800' :
                            'bg-rose-950/50 text-rose-400 border border-rose-800'
                          }`}>
                            {displayShellData.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-1 text-[9px]">
                          <div className="flex justify-between gap-4"><span className="text-slate-500">Reserves:</span><span className="text-blue-400 font-bold mono">{displayShellData.cumulativeReserves.toFixed(1)} Mt</span></div>
                          <div className="flex justify-between gap-4"><span className="text-slate-500">Cum. NPV:</span><span className="text-emerald-400 font-bold mono">${displayShellData.cumulativeNPV.toFixed(0)}M</span></div>
                          <div className="flex justify-between gap-4"><span className="text-slate-500">Marg. NPV:</span><span className={`font-bold mono ${displayShellData.marginalNPV >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>${displayShellData.marginalNPV.toFixed(0)}M</span></div>
                          <div className="flex justify-between gap-4"><span className="text-slate-500">Grade:</span><span className="text-amber-400 font-bold mono">{displayShellData.averageGrade.toFixed(3)}%</span></div>
                          <div className="flex justify-between gap-4"><span className="text-slate-500">Cut-off:</span><span className="text-slate-300 font-bold mono">{displayShellData.cutoffGrade.toFixed(3)}%</span></div>
                          <div className="flex justify-between gap-4"><span className="text-slate-500">IRR:</span><span className="text-purple-400 font-bold mono">{displayShellData.irr !== null ? displayShellData.irr.toFixed(1) + '%' : 'N/A'}</span></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Shell visibility control */}
                  <div className="mt-2 flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] text-slate-500 font-bold">SHELLS VISIBLES</span>
                      <span className="text-[9px] text-emerald-400 mono font-bold">1 — {maxVisibleShell}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={maxVisibleShell}
                      onChange={(e) => setMaxVisibleShell(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Disclaimer */}
                  <div className="mt-1 text-[7px] text-slate-600 flex-shrink-0">
                    NOTA: Geometría representa relaciones económicas; no sustituye diseño de pit.
                  </div>
                </>
              ) : (
                <>
                  {/* DATAMINE PHASE MODE */}
                  {/* CONTROLS */}
                  <div className="grid grid-cols-2 gap-2 mb-2 flex-shrink-0">
                    <select className="w-full">
                      <option>Perspectiva 3D</option>
                      <option>Vista en Planta</option>
                      <option>Perfil Longitudinal</option>
                    </select>
                    <select value={colorMode} onChange={(e) => setColorMode(e.target.value as ColorMode)} className="w-full">
                      <option value="phase">Color por Fase</option>
                      <option value="elevation">Elevación</option>
                      <option value="van_cumulative">VAN Acumulado</option>
                      <option value="van_incremental">VAN Incremental</option>
                      <option value="reserves">Reservas</option>
                      <option value="grade">Ley Media</option>
                      <option value="strip_ratio">Strip Ratio</option>
                    </select>
                  </div>

                  {/* PHASE KPIs */}
                  <div className="grid grid-cols-3 gap-1 mb-2 flex-shrink-0">
                    <div className="metric-display p-1.5 rounded">
                      <div className="text-[7px] text-blue-400 font-bold">FASE</div>
                      <div className="text-xs font-black text-blue-300 mono">F{selectedPhase}</div>
                    </div>
                    <div className="metric-display p-1.5 rounded">
                      <div className="text-[7px] text-cyan-400 font-bold">PUNTOS</div>
                      <div className="text-xs font-black text-cyan-300 mono">
                        {phase6Geometry ? phase6Geometry.validation.stats.totalPoints.toLocaleString() : '—'}
                      </div>
                    </div>
                    <div className="metric-display p-1.5 rounded">
                      <div className="text-[7px] text-emerald-400 font-bold">TRIÁNGULOS</div>
                      <div className="text-xs font-black text-emerald-300 mono">
                        {phase6Geometry ? phase6Geometry.validation.stats.totalTriangles.toLocaleString() : '—'}
                      </div>
                    </div>
                  </div>

                  {/* 3D VIEWER */}
                  <div className="flex-1 min-h-0 bg-slate-950 border border-slate-800 rounded relative overflow-hidden">
                    {isLoadingGeometry ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Activity className="w-10 h-10 text-blue-500 animate-pulse mx-auto mb-3" />
                          <div className="text-sm font-bold text-blue-300 mb-1">CARGANDO GEOMETRÍA DATAMINE</div>
                          <div className="text-[9px] text-slate-500">Leyendo puntos y conectividad triangular desde public/data.</div>
                        </div>
                      </div>
                    ) : geometryError ? (
                      <div className="absolute inset-0 flex items-center justify-center p-6">
                        <div className="max-w-xl text-center">
                          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
                          <div className="text-sm font-bold text-rose-300 mb-2">ERROR AL CARGAR GEOMETRÍA DATAMINE</div>
                          <div className="text-[9px] text-slate-400 mb-4">{geometryError}</div>
                          <button
                            onClick={() => {
                              setGeometryError(null);
                              setPhase6Geometry(null);
                            }}
                            className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-700 rounded text-[9px] font-bold text-rose-300 uppercase"
                          >
                            Reintentar carga
                          </button>
                        </div>
                      </div>
                    ) : phase6Geometry ? (
                      <DataminePhaseViewer
                        geometryData={phase6Geometry}
                        showTopography={showTopography}
                        showPit={showPit}
                        showStrings={showStrings}
                        showWireframe={showWireframe}
                        colorMode={colorMode === 'elevation' ? 'elevation' : 'component'}
                        onTriangleHover={setHoveredTriangle}
                        onStringHover={setHoveredString}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center p-6">
                        <div className="text-center">
                          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                          <div className="text-sm font-bold text-amber-300 mb-2">GEOMETRÍA NO DISPONIBLE</div>
                          <div className="text-[9px] text-slate-500">
                            Verifique que los CSV de puntos y triángulos estén publicados en public/data.
                          </div>
                        </div>
                      </div>
                    )}

                    {phase6Geometry && hoveredTriangle && (
                      <div className="absolute top-3 right-3 bg-slate-900/95 border border-emerald-500/50 rounded-lg p-3 shadow-2xl min-w-[210px] pointer-events-none">
                        <div className="text-emerald-400 font-bold text-xs mb-2">TRIÁNGULO {hoveredTriangle.triangleId}</div>
                        <div className="space-y-1 text-[9px]">
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Componente:</span>
                            <span className="text-slate-200 mono">{hoveredTriangle.component}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Este:</span>
                            <span className="text-cyan-300 mono">{hoveredTriangle.easting.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Norte:</span>
                            <span className="text-cyan-300 mono">{hoveredTriangle.northing.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Elevación:</span>
                            <span className="text-amber-300 mono">{hoveredTriangle.elevation.toFixed(2)} m</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* VIEWER CONTROLS */}
                  <div className="mt-2 flex items-center justify-between gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!phase6Geometry?.validation?.stats?.topographyTriangles}
                        onClick={() => setShowTopography((value) => !value)}
                        className={`px-2 py-1 border rounded text-[8px] font-bold uppercase ${showTopography ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500'} disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        TOPO {phase6Geometry?.validation?.stats?.topographyTriangles ? '' : 'SIN DATOS'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPit((value) => !value)}
                        className={`px-2 py-1 border rounded text-[8px] font-bold uppercase ${showPit ? 'bg-blue-950/60 border-blue-700 text-blue-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                      >
                        PIT
                      </button>
                      <button
                        type="button"
                        disabled={!phase6Geometry?.validation?.stats?.totalStrings}
                        onClick={() => setShowStrings((value) => !value)}
                        className={`px-2 py-1 border rounded text-[8px] font-bold uppercase ${showStrings ? 'bg-amber-950/60 border-amber-700 text-amber-300' : 'bg-slate-900 border-slate-700 text-slate-500'} disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        STRINGS {phase6Geometry?.validation?.stats?.totalStrings ? '' : 'SIN DATOS'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowWireframe((value) => !value)}
                        className={`px-2 py-1 border rounded text-[8px] font-bold uppercase ${showWireframe ? 'bg-purple-950/60 border-purple-700 text-purple-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                      >
                        WIREFRAME
                      </button>
                    </div>
                    <div className="text-[7px] text-slate-600 mono">
                      ORBITAR: arrastrar · ZOOM: rueda · PAN: botón derecho
                    </div>
                  </div>

                  {/* SEQUENCE CONTROLS */}
                  <div className="mt-2 flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setSelectedPhase(1)} disabled={true} className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-700 disabled:opacity-30"><SkipBack className="w-3 h-3" /></button>
                    <button onClick={() => setIsPlayingSequence(!isPlayingSequence)} disabled={true} className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-700 disabled:opacity-30">{isPlayingSequence ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}</button>
                    <button onClick={() => setSelectedPhase(6)} disabled={true} className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-700 disabled:opacity-30"><SkipForward className="w-3 h-3" /></button>
                    <div className="flex-1 grid grid-cols-6 gap-1">
                      {[1, 2, 3, 4, 5, 6].map((phase) => (
                        <button
                          key={phase}
                          onClick={() => setSelectedPhase(phase)}
                          disabled={phase !== 6}
                          className={`py-1 text-[8px] font-bold rounded border transition-all ${
                            selectedPhase === phase
                              ? 'bg-emerald-950/50 border-emerald-500 text-emerald-400'
                              : phase === 6
                              ? 'bg-slate-900 border-slate-700 text-slate-500'
                              : 'bg-slate-950 border-slate-800 text-slate-700 cursor-not-allowed'
                          }`}
                        >
                          F{phase}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setShowGeometricDetail(!showGeometricDetail)} className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-400 hover:text-emerald-400"><Eye className="w-3 h-3" /></button>
                  </div>

                  {/* DISCLAIMER */}
                  <div className="mt-1 text-[7px] text-slate-600 flex-shrink-0">
                    NOTA: Las superficies corresponden a geometría Datamine cargada desde archivos CSV. El simulador evalúa la relación económica y no sustituye el diseño ni la optimización minera especializada.
                  </div>
                </>
              )}
            </div>
          </div>

          {/* BOTTOM METRICS ROW */}
          <div className="bottom-metrics-row">
            {/* RECOVERY RATES */}
            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase">Recovery Rates</span>
                </div>
              </div>
              <div className="panel-content space-y-2">
                <div className="bg-cyan-950/30 border border-cyan-900/50 p-2 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] text-cyan-400 font-bold">REC. MINADO</span>
                    <span className="text-sm font-black text-cyan-300 mono">{(mineRecovery * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0.85" max="1.0" step="0.01" value={mineRecovery} onChange={(e) => setMineRecovery(parseFloat(e.target.value))} />
                </div>
                <div className="bg-amber-950/30 border border-amber-900/50 p-2 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] text-amber-400 font-bold">REC. METALÚRGICA</span>
                    <span className="text-sm font-black text-amber-300 mono">{(plantRecovery * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0.75" max="0.95" step="0.01" value={plantRecovery} onChange={(e) => setPlantRecovery(parseFloat(e.target.value))} />
                </div>
              </div>
            </div>

            {/* COST STRUCTURE */}
            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase">Cost Structure & System Status</span>
                </div>
              </div>
              <div className="panel-content">
                <div className="grid grid-cols-4 gap-2">
                  <div className="metric-display p-2 rounded">
                    <div className="text-[7px] text-slate-500 mb-0.5">CAPEX</div>
                    <div className="text-sm font-black text-purple-400 mono">${results.dynamicCAPEX.toFixed(0)}<span className="text-[8px] text-slate-600">M</span></div>
                  </div>
                  <div className="metric-display p-2 rounded">
                    <div className="text-[7px] text-slate-500 mb-0.5">MINE OPEX</div>
                    <div className="text-sm font-black text-cyan-400 mono">${results.OPEX_MINING.toFixed(2)}<span className="text-[8px] text-slate-600">/t</span></div>
                  </div>
                  <div className="metric-display p-2 rounded">
                    <div className="text-[7px] text-slate-500 mb-0.5">PLANT OPEX</div>
                    <div className="text-sm font-black text-amber-400 mono">${results.dynamicOpexProcessing.toFixed(2)}<span className="text-[8px] text-slate-600">/t</span></div>
                  </div>
                  <div className="metric-display p-2 rounded">
                    <div className="text-[7px] text-slate-500 mb-0.5">PRODUCTION</div>
                    <div className="text-sm font-black text-emerald-400 mono">{results.effectiveProductionRate.toFixed(1)}<span className="text-[8px] text-slate-600">Mt/a</span></div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 bg-emerald-950/20 border border-emerald-900/40 p-2 rounded">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <div className="text-[8px] text-emerald-400 font-bold">
                    {results.effectiveProductionRate >= millCapacity * 0.95 ? 'MILL CONSTRAINT' : 'MINE CONSTRAINT'}
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
                <Settings className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-slate-300 uppercase">Control Parameters</span>
              </div>
            </div>
            <div className="panel-content space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1">
                    <Mountain className="w-3 h-3 text-slate-500" />
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Mine Cap.</span>
                  </div>
                  <span className="text-xs font-black text-white mono">{mineCapacity} <span className="text-[8px] text-slate-500">Mt/a</span></span>
                </div>
                <input type="range" min="50" max="200" step="10" value={mineCapacity} onChange={(e) => setMineCapacity(parseFloat(e.target.value))} />
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
