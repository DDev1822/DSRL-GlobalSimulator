import type { ReactNode } from 'react';

interface PanelProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  grow?: boolean;
}

interface MetricProps {
  label: string;
  value: string;
  tone?: string;
}

interface ProgressMetricProps {
  label: string;
  value: string;
  progress: number;
  tone: string;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}

export function Panel({ icon, title, children, grow = false }: PanelProps) {
  return (
    <section className={`rail-panel ${grow ? 'grow' : ''}`}>
      <div className="rail-title">
        <span>{icon}{title}</span>
      </div>
      <div className="rail-content">{children}</div>
    </section>
  );
}

export function Metric({ label, value, tone = 'neutral' }: MetricProps) {
  return (
    <div className={`metric tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ProgressMetric({ label, value, progress, tone }: ProgressMetricProps) {
  return (
    <div className={`progress-metric tone-${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <i>
        <b style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }} />
      </i>
    </div>
  );
}

export function Slider({ label, value, min, max, step, display, onChange }: SliderProps) {
  return (
    <label className="slider-field">
      <span>
        <b>{label}</b>
        <strong>{display}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
