import { Layers } from 'lucide-react';
import type { EconomicResults } from '../lib/economics';
import { Metric, Panel } from './ui';

export default function ConceptualPit({ results }: { results: EconomicResults }) {
  return (
    <Panel
      title="Pit conceptual — reservas y valor"
      icon={<Layers size={15} className="text-emerald-400" />}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="flex min-h-[390px] items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70">
          <svg viewBox="0 0 800 360" className="h-full w-full">
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((shell) => {
              const radius = shell * 23;
              const hue = 205 - shell * 10;
              return (
                <ellipse
                  key={shell}
                  cx="400"
                  cy={155 + shell * 5}
                  rx={radius * 1.35}
                  ry={radius * 0.48}
                  fill={`hsla(${hue}, 75%, 45%, 0.32)`}
                  stroke={shell === 7 ? '#10b981' : `hsl(${hue}, 75%, 50%)`}
                  strokeWidth={shell === 7 ? 4 : 2}
                />
              );
            })}
          </svg>
        </div>

        <div className="space-y-3">
          <Metric
            label="Reservas"
            value={`${Math.round(results.best?.tonnage ?? 0)} Mt`}
            tone="blue"
          />
          <Metric
            label="Ley media"
            value={`${results.best?.averageGrade.toFixed(3) ?? '0.000'} %`}
            tone="amber"
          />
          <Metric
            label="Metal recuperado"
            value={`${results.best?.recoveredMetal.toFixed(2) ?? '0.00'} Mt Cu`}
          />
          <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-200/80">
            Geometría conceptual para comunicar relaciones económicas. No sustituye el diseño de pit.
          </p>
        </div>
      </div>
    </Panel>
  );
}
