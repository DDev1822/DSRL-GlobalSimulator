import {
  ChevronDown,
  RotateCcw,
  Save,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  EconomicInputKey,
  EconomicInputs,
  EconomicValidationResult,
} from '../engine/economicModel';

interface ParameterDefinition {
  key: EconomicInputKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  decimals: number;
  transform?: 'percent';
}

const PARAMETERS: ParameterDefinition[] = [
  {
    key: 'metalPriceUsdPerTonne',
    label: 'PRECIO DEL METAL',
    unit: 'US$/t metal',
    min: 2_000,
    max: 16_000,
    step: 100,
    decimals: 0,
  },
  {
    key: 'maxResourceMt',
    label: 'RECURSO MÁXIMO',
    unit: 'Mt mineral',
    min: 100,
    max: 3_000,
    step: 50,
    decimals: 0,
  },
  {
    key: 'wacc',
    label: 'WACC',
    unit: '%',
    min: 0.03,
    max: 0.2,
    step: 0.005,
    decimals: 1,
    transform: 'percent',
  },
  {
    key: 'annualProductionMt',
    label: 'PRODUCCIÓN',
    unit: 'Mt/año',
    min: 5,
    max: 120,
    step: 1,
    decimals: 0,
  },
  {
    key: 'stripRatio',
    label: 'STRIP RATIO',
    unit: 't/t',
    min: 0,
    max: 6,
    step: 0.1,
    decimals: 1,
  },
  {
    key: 'miningCostUsdPerTonneMoved',
    label: 'COSTO DE MINA',
    unit: 'US$/t movida',
    min: 0.5,
    max: 12,
    step: 0.1,
    decimals: 2,
  },
  {
    key: 'processingCostUsdPerTonneOre',
    label: 'COSTO DE PLANTA',
    unit: 'US$/t mineral',
    min: 2,
    max: 35,
    step: 0.5,
    decimals: 2,
  },
  {
    key: 'baseGradePercent',
    label: 'LEY BASE',
    unit: '% metal',
    min: 0.15,
    max: 2,
    step: 0.01,
    decimals: 2,
  },
];

interface EconomicControlDeckProps {
  open: boolean;
  inputs: EconomicInputs;
  validation: EconomicValidationResult;
  breakeven: number;
  optimalCutoff: number;
  maxVAN: number;
  savedAt: Date | null;
  onClose: () => void;
  onChange: (field: EconomicInputKey, value: number) => void;
  onSave: () => void;
  onReset: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function displayValue(
  definition: ParameterDefinition,
  rawValue: number,
): number {
  return definition.transform === 'percent' ? rawValue * 100 : rawValue;
}

function rawValue(
  definition: ParameterDefinition,
  displayedValue: number,
): number {
  return definition.transform === 'percent'
    ? displayedValue / 100
    : displayedValue;
}

export default function EconomicControlDeck({
  open,
  inputs,
  validation,
  breakeven,
  optimalCutoff,
  maxVAN,
  savedAt,
  onClose,
  onChange,
  onSave,
  onReset,
}: EconomicControlDeckProps) {
  if (!open) return null;

  return (
    <section className="economic-control-drawer" aria-label="Control Deck geoeconómico">
      <div className="economic-control-header">
        <div className="economic-control-title">
          <SlidersHorizontal size={15} />
          <div>
            <strong>ECONOMIC CONTROL DECK</strong>
            <span>Entradas geoeconómicas · la ley de corte se calcula automáticamente</span>
          </div>
        </div>

        <div className="economic-control-summary">
          <span>BREAKEVEN <b>{breakeven.toFixed(3)} %</b></span>
          <span>CUT-OFF ÓPTIMO <b>{optimalCutoff.toFixed(3)} %</b></span>
          <span>VAN <b>${maxVAN.toFixed(0)} M</b></span>
        </div>

        <div className="economic-control-actions">
          <button type="button" onClick={onSave} title="Guardar escenario en este navegador">
            <Save size={13} /> GUARDAR
          </button>
          <button type="button" onClick={onReset} title="Restablecer escenario base">
            <RotateCcw size={13} /> RESTABLECER
          </button>
          <button type="button" className="drawer-close" onClick={onClose} title="Cerrar Control Deck">
            <ChevronDown size={15} />
          </button>
        </div>
      </div>

      <div className="economic-control-grid">
        {PARAMETERS.map((definition) => {
          const value = inputs[definition.key];
          const shownValue = displayValue(definition, value);
          const shownMin = displayValue(definition, definition.min);
          const shownMax = displayValue(definition, definition.max);
          const shownStep = displayValue(definition, definition.step);
          const fieldIssues = validation.issues.filter(
            (item) => item.field === definition.key,
          );

          return (
            <label className="economic-control-field" key={definition.key}>
              <span className="economic-field-heading">
                <b>{definition.label}</b>
                <small>{definition.unit}</small>
              </span>

              <div className="economic-field-input-row">
                <input
                  type="number"
                  min={shownMin}
                  max={shownMax}
                  step={shownStep}
                  value={Number(shownValue.toFixed(definition.decimals))}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (!Number.isFinite(parsed)) return;
                    const normalized = rawValue(definition, parsed);
                    onChange(
                      definition.key,
                      clamp(normalized, definition.min, definition.max),
                    );
                  }}
                />
                <strong>{definition.unit}</strong>
              </div>

              <input
                type="range"
                min={definition.min}
                max={definition.max}
                step={definition.step}
                value={value}
                onChange={(event) =>
                  onChange(definition.key, Number(event.target.value))
                }
              />

              {fieldIssues.length > 0 && (
                <span className={`economic-field-message ${fieldIssues[0].severity}`}>
                  {fieldIssues[0].message}
                </span>
              )}
            </label>
          );
        })}
      </div>

      <footer className="economic-control-footer">
        <span>
          Precio: US$/t metal · Mina: US$/t total movida · Planta: US$/t de mineral procesado
        </span>
        <span>
          {savedAt
            ? `Escenario guardado: ${savedAt.toLocaleTimeString()}`
            : 'Escenario temporal sin guardar'}
        </span>
      </footer>
    </section>
  );
}
