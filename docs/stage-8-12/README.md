# Etapa 8.12 — Condición de vía y exposición económica por ruta

## Objetivo

Extender la Etapa 8.11 para comparar, por cada ruta de acarreo, una condición objetivo de vía contra una condición actual o simulada y cuantificar su efecto sobre ciclo, capacidad, combustible, mantenimiento, neumáticos, costo logístico y margen operativo.

La etapa convierte el deterioro vial en una lectura económica trazable. No declara todavía ahorro realizado, VAN, mantenimiento óptimo, Dispatch, curvas OEM ni diseño vial definitivo.

## Dependencia

La Etapa 8.12 se construye sobre la Etapa 8.11 validada localmente y conserva:

- destino observado `NPVPDEST`;
- rutas Mill, Leach, Dump, stockpiles y reclaim;
- masa por periodo;
- ciclo y capacidad preliminar;
- horas-camión;
- combustible y costos;
- margen antes y después del acarreo;
- reconciliaciones de la cadena heredada.

## Principio de comparación

Para cada ruta se mantienen dos escenarios:

1. **Condición objetivo**: RR objetivo y parámetros base de velocidad, combustible y costos horarios definidos en 8.11.
2. **Condición actual**: RR actual y factores de penalización editables sobre velocidad, combustible, mantenimiento, neumáticos, otros costos y demora fija.

La masa, el destino y la secuencia económica permanecen iguales. La diferencia entre ambos escenarios representa exposición económica modelada.

## Entradas por ruta

- clase de condición: Buena, Regular, Mala, Crítica o Personalizada;
- RR actual;
- RR objetivo;
- factor de velocidad cargado;
- factor de velocidad vacío;
- factor de consumo de combustible;
- factor de mantenimiento;
- factor de neumáticos;
- factor de otros costos;
- demora adicional;
- confianza del dato;
- base del dato: escenario DSRL, observación de campo o medición instrumental.

## Presets DSRL

Los presets son escenarios editables y no datos observados:

| Condición | Δ RR | Vel. cargado | Vel. vacío | Combustible | Mantenimiento | Neumáticos | Demora |
|---|---:|---:|---:|---:|---:|---:|---:|
| Buena | 0.0 % | 100 % | 100 % | 100 % | 100 % | 100 % | 0.0 min |
| Regular | +1.0 % | 93 % | 95 % | 106 % | 105 % | 108 % | 0.5 min |
| Mala | +2.5 % | 82 % | 87 % | 116 % | 118 % | 125 % | 1.5 min |
| Crítica | +4.5 % | 68 % | 75 % | 132 % | 140 % | 155 % | 3.0 min |

## Cálculos principales

```text
velocidad_actual
= velocidad_base × factor_velocidad
```

```text
consumo_actual
= consumo_base × factor_combustible
```

```text
costo_actual_componente
= costo_base_componente × factor_componente
```

```text
costo_adicional
= costo_logístico_actual - costo_logístico_objetivo
```

```text
erosión_de_margen
= margen_objetivo_post_acarreo - margen_actual_post_acarreo
```

```text
potencial_recuperable
= max(costo_adicional, 0)
```

El potencial recuperable es una exposición técnica. No se presenta como ahorro realizado hasta validar una intervención y su respuesta real.

## Resultados por ruta

- RR actual y objetivo;
- brecha de RR;
- ciclo objetivo y actual;
- incremento de ciclo;
- capacidad objetivo y actual;
- pérdida de capacidad;
- déficit adicional;
- horas-camión adicionales;
- combustible adicional;
- costos adicionales de combustible, mantenimiento, neumáticos y otros;
- costo logístico adicional;
- incremento de US$/t;
- erosión de margen;
- potencial recuperable;
- score de exposición;
- ranking económico de rutas.

## Resultados consolidados

- costo logístico adicional total;
- erosión total de margen;
- potencial total recuperable;
- combustible adicional;
- pérdida de capacidad;
- déficit adicional;
- incremento ponderado de US$/t;
- ruta con mayor exposición;
- descomposición del costo adicional;
- exposición por periodo;
- reconciliaciones completas.

## Reconciliaciones

La etapa verifica:

- masa demandada preservada entre objetivo y actual;
- identidad de destino preservada;
- deltas por ruta cierran con el delta total;
- deltas por periodo cierran con el delta total;
- costo actual = costo objetivo + costo adicional;
- erosión de margen = costo adicional;
- combustible actual = combustible objetivo + combustible adicional;
- componentes de costo cierran;
- reconciliaciones 8.11 pasan en ambos escenarios;
- no existen balances físicos negativos imposibles.

## Guardas metodológicas

No se modelan todavía:

- degradación dinámica de la vía en el tiempo;
- optimización de mantenimiento;
- costo y ventana de intervención;
- respuesta real post-intervención;
- curvas rimpull/retarding OEM;
- aceleración y frenado por tramo;
- geometría vial 3D;
- Dispatch/FMS;
- colas estocásticas;
- tráfico bidireccional;
- clima;
- plan minero ejecutable;
- VAN del proyecto.

## Archivos de la etapa

- `src/engine/roadConditionEconomicImpact.ts`;
- `src/components/RoadConditionEconomicImpactPanel.tsx`;
- `src/components/RoadConditionEconomicImpactPanel.css`;
- `scripts/audit-stage-8-12.mjs`;
- `scripts/validate-road-condition-economic-impact.mjs`;
- `docs/stage-8-12/manual-checklist.md`.

## Validación

```bash
node scripts/audit-stage-8-11.mjs
node scripts/validate-preliminary-haulage-logistics.mjs
node scripts/audit-stage-8-12.mjs
node scripts/validate-road-condition-economic-impact.mjs
npm run typecheck
npm run build
npm run dev
```

## Criterio de cierre

La Etapa 8.12 cerrará cuando:

- la cadena 8.11 permanezca en PASS;
- condición objetivo y actual mantengan la misma masa y destino;
- costo, combustible, capacidad y margen reconcilien;
- presets y entradas personalizadas funcionen;
- las 48 combinaciones reales cierren;
- TypeScript y build estén en PASS;
- el panel sea legible y responsive;
- la revisión visual sea aprobada.
