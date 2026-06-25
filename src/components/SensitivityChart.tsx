import type { DataPoint } from '../lib/economics';
import { MAX_CUTOFF, MAX_GRADE, MAX_TONNAGE } from '../lib/economics';

export default function SensitivityChart({ data }: { data: DataPoint[] }) {
  const width = 800;
  const height = 300;
  const left = 48;
  const right = 72;
  const top = 24;
  const bottom = 38;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxNpv = Math.max(...data.map((point) => point.npv), 1);

  const x = (value: number) => left + (value / MAX_CUTOFF) * chartWidth;
  const yTonnage = (value: number) => top + chartHeight - (value / MAX_TONNAGE) * chartHeight;
  const yGrade = (value: number) => top + chartHeight - (value / MAX_GRADE) * chartHeight;
  const yNpv = (value: number) => top + chartHeight - (value / maxNpv) * chartHeight;
  const line = (points: Array<[number, number]>) =>
    points.map(([px, py]) => `${px},${py}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full min-h-[260px] w-full">
      {[0, 1, 2, 3, 4].map((index) => {
        const gridY = top + (chartHeight / 4) * index;
        return (
          <line
            key={index}
            x1={left}
            x2={width - right}
            y1={gridY}
            y2={gridY}
            stroke="#1e293b"
            strokeDasharray="4 4"
          />
        );
      })}

      <polyline
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2.5"
        points={line(data.map((point) => [x(point.cutoff), yTonnage(point.tonnage)]))}
      />
      <polyline
        fill="none"
        stroke="#f59e0b"
        strokeWidth="2.5"
        points={line(data.map((point) => [x(point.cutoff), yGrade(point.averageGrade)]))}
      />
      <polyline
        fill="none"
        stroke="#10b981"
        strokeWidth="3.5"
        points={line(data.map((point) => [x(point.cutoff), yNpv(point.npv)]))}
      />

      <line
        x1={left}
        x2={width - right}
        y1={height - bottom}
        y2={height - bottom}
        stroke="#475569"
      />
      <text
        x={width / 2}
        y={height - 10}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="10"
      >
        LEY DE CORTE (% Cu)
      </text>
    </svg>
  );
}
