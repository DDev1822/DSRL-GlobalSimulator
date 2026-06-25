import { useMemo, useRef, useState } from 'react';
import type { EconomicPoint, OptimizationResults } from '../engine/economicModel';

interface EconomicCurveProps {
  results: OptimizationResults;
}

const WIDTH = 920;
const HEIGHT = 300;
const PADDING = { top: 24, right: 72, bottom: 42, left: 56 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

export default function EconomicCurve({ results }: EconomicCurveProps) {
  const chartRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<EconomicPoint | null>(null);

  const maxCutoff = Math.max(results.maximumEvaluatedCutoff, 0.01);
  const maxTonnage = Math.max(
    ...results.dataPoints.map((point) => point.tonnage),
    1,
  );
  const maxGrade = Math.max(
    ...results.dataPoints.map((point) => point.averageGrade),
    results.inputs.baseGradePercent,
    0.01,
  );
  const maxNpv = Math.max(
    ...results.dataPoints.map((point) => point.npv),
    results.maxVAN,
    1,
  );

  const xScale = (value: number) =>
    PADDING.left + (value / maxCutoff) * PLOT_WIDTH;
  const tonnageScale = (value: number) =>
    PADDING.top + PLOT_HEIGHT - (value / maxTonnage) * PLOT_HEIGHT;
  const gradeScale = (value: number) =>
    PADDING.top + PLOT_HEIGHT - (value / maxGrade) * PLOT_HEIGHT;
  const npvScale = (value: number) =>
    PADDING.top + PLOT_HEIGHT - (value / maxNpv) * PLOT_HEIGHT;

  const xTicks = useMemo(
    () => Array.from({ length: 7 }, (_, index) => (maxCutoff * index) / 6),
    [maxCutoff],
  );
  const tonnageTicks = useMemo(
    () => Array.from({ length: 4 }, (_, index) => (maxTonnage * index) / 3),
    [maxTonnage],
  );

  const paths = useMemo(() => {
    const localXScale = (value: number) =>
      PADDING.left + (value / maxCutoff) * PLOT_WIDTH;
    const localTonnageScale = (value: number) =>
      PADDING.top + PLOT_HEIGHT - (value / maxTonnage) * PLOT_HEIGHT;
    const localGradeScale = (value: number) =>
      PADDING.top + PLOT_HEIGHT - (value / maxGrade) * PLOT_HEIGHT;
    const localNpvScale = (value: number) =>
      PADDING.top + PLOT_HEIGHT - (value / maxNpv) * PLOT_HEIGHT;

    const makePath = (selector: (point: EconomicPoint) => number) =>
      results.dataPoints
        .map((point, index) => {
          const x = localXScale(point.cutoff);
          const y = selector(point);
          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');

    const tonnage = makePath((point) => localTonnageScale(point.tonnage));
    const grade = makePath((point) => localGradeScale(point.averageGrade));
    const npv = makePath((point) => localNpvScale(point.npv));
    const last = results.dataPoints.at(-1)?.cutoff ?? maxCutoff;
    const first = results.dataPoints[0]?.cutoff ?? 0;

    return {
      tonnage,
      grade,
      npv,
      npvArea: `${npv} L ${localXScale(last)} ${PADDING.top + PLOT_HEIGHT} L ${localXScale(first)} ${PADDING.top + PLOT_HEIGHT} Z`,
    };
  }, [results.dataPoints, maxCutoff, maxTonnage, maxGrade, maxNpv]);

  const activePoint =
    hoveredPoint ??
    results.dataPoints.reduce((closest, point) =>
      Math.abs(point.cutoff - results.optimalCutoff) <
      Math.abs(closest.cutoff - results.optimalCutoff)
        ? point
        : closest,
    );

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const node = chartRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const chartX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const cutoff =
      ((chartX - PADDING.left) / PLOT_WIDTH) * maxCutoff;

    const closest = results.dataPoints.reduce((previous, current) =>
      Math.abs(current.cutoff - cutoff) <
      Math.abs(previous.cutoff - cutoff)
        ? current
        : previous,
    );
    setHoveredPoint(closest);
  };

  return (
    <div className="curve-workspace">
      <aside className="curve-sidecard">
        <div className="sidecard-eyebrow">LECTURA INTERACTIVA</div>
        <div className="sidecard-title">CURVA ECONÓMICA</div>
        <p className="sidecard-copy">
          Mueve el cursor sobre la curva para leer tonelaje, ley, VAN, TIR y vida de mina.
        </p>
        <div className="curve-legend">
          <span><i className="dot ton" /> TON</span>
          <span><i className="dot grade" /> LEY</span>
          <span><i className="dot npv" /> VAN</span>
        </div>
        <div className="live-values">
          <div><span>Cut-off</span><strong>{activePoint.cutoff.toFixed(3)} % Cu</strong></div>
          <div><span>Tonelaje</span><strong>{activePoint.tonnage.toFixed(1)} Mt</strong></div>
          <div><span>Ley media</span><strong>{activePoint.averageGrade.toFixed(3)} %</strong></div>
          <div><span>VAN</span><strong>${activePoint.npv.toFixed(0)} M</strong></div>
          <div><span>TIR</span><strong>{activePoint.irr === null ? 'N/A' : `${activePoint.irr.toFixed(1)} %`}</strong></div>
          <div><span>LOM</span><strong>{activePoint.lifeOfMine} años</strong></div>
        </div>
      </aside>

      <div className="curve-canvas">
        <svg
          ref={chartRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoveredPoint(null)}
          aria-label="Curva económica Ton-Grade-VAN interactiva"
        >
          <defs>
            <linearGradient id="npv-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.02" />
            </linearGradient>
            <filter id="curve-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={`h-${ratio}`}
              x1={PADDING.left}
              x2={PADDING.left + PLOT_WIDTH}
              y1={PADDING.top + ratio * PLOT_HEIGHT}
              y2={PADDING.top + ratio * PLOT_HEIGHT}
              stroke="#294161"
              strokeDasharray="3 4"
            />
          ))}

          {xTicks.map((value) => (
            <g key={value}>
              <line
                x1={xScale(value)}
                x2={xScale(value)}
                y1={PADDING.top}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="#294161"
                strokeDasharray="3 4"
              />
              <text x={xScale(value)} y={HEIGHT - 16} fill="#9eb5d2" fontSize="10" textAnchor="middle">
                {value.toFixed(2)}
              </text>
            </g>
          ))}

          {tonnageTicks.map((value) => (
            <text key={value} x={PADDING.left - 12} y={tonnageScale(value) + 4} fill="#7dd3fc" fontSize="10" textAnchor="end">
              {Math.round(value)}
            </text>
          ))}

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <text key={ratio} x={PADDING.left + PLOT_WIDTH + 12} y={PADDING.top + PLOT_HEIGHT - ratio * PLOT_HEIGHT + 4} fill="#5eead4" fontSize="10">
              ${Math.round(maxNpv * ratio)}M
            </text>
          ))}

          <path d={paths.npvArea} fill="url(#npv-area)" />
          <path d={paths.tonnage} fill="none" stroke="#67c8ff" strokeWidth="3" />
          <path d={paths.grade} fill="none" stroke="#fde047" strokeWidth="3" />
          <path d={paths.npv} fill="none" stroke="#2dd4bf" strokeWidth="4" filter="url(#curve-glow)" />

          {Number.isFinite(results.breakeven) && results.breakeven <= maxCutoff && (
            <line
              x1={xScale(results.breakeven)}
              x2={xScale(results.breakeven)}
              y1={PADDING.top}
              y2={PADDING.top + PLOT_HEIGHT}
              stroke="#facc15"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          )}

          <line
            x1={xScale(activePoint.cutoff)}
            x2={xScale(activePoint.cutoff)}
            y1={PADDING.top}
            y2={PADDING.top + PLOT_HEIGHT}
            stroke="#5eead4"
            strokeWidth="2.5"
            opacity={hoveredPoint ? 1 : 0.72}
          />

          <circle cx={xScale(activePoint.cutoff)} cy={tonnageScale(activePoint.tonnage)} r="7" fill="#67c8ff" stroke="white" strokeWidth="2" />
          <circle cx={xScale(activePoint.cutoff)} cy={gradeScale(activePoint.averageGrade)} r="7" fill="#fde047" stroke="white" strokeWidth="2" />
          <circle cx={xScale(activePoint.cutoff)} cy={npvScale(activePoint.npv)} r="8" fill="#2dd4bf" stroke="white" strokeWidth="2" />

          <line x1={PADDING.left} x2={PADDING.left + PLOT_WIDTH} y1={PADDING.top + PLOT_HEIGHT} y2={PADDING.top + PLOT_HEIGHT} stroke="#a8bdd7" strokeWidth="2" />
          <line x1={PADDING.left} x2={PADDING.left} y1={PADDING.top} y2={PADDING.top + PLOT_HEIGHT} stroke="#a8bdd7" strokeWidth="2" />
          <text x={PADDING.left + PLOT_WIDTH / 2} y={HEIGHT - 2} fill="#e2e8f0" fontSize="12" fontWeight="700" textAnchor="middle">
            LEY DE CORTE (% Cu)
          </text>
        </svg>
      </div>
    </div>
  );
}
