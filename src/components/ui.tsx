import type { ReactNode } from 'react';

export function Panel({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/20 ${className}`}
    >
      <header className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        {icon}
        <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-300">
          {title}
        </h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  tone = 'emerald',
}: {
  label: string;
  value: string;
  tone?: 'emerald' | 'amber' | 'blue' | 'violet' | 'slate';
}) {
  const tones = {
    emerald: 'text-emerald-300 border-emerald-900/60 bg-emerald-950/20',
    amber: 'text-amber-300 border-amber-900/60 bg-amber-950/20',
    blue: 'text-blue-300 border-blue-900/60 bg-blue-950/20',
    violet: 'text-violet-300 border-violet-900/60 bg-violet-950/20',
    slate: 'text-slate-200 border-slate-700 bg-slate-950/50',
  };

  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="font-mono text-lg font-black">{value}</div>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <span className="font-mono text-sm font-black text-white">
          {value.toFixed(step < 1 ? 1 : 0)} {suffix}
        </span>
      </div>
      <input
        className="w-full accent-emerald-500"
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
