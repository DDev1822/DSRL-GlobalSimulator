# Etapa 1 — Motor económico completamente parametrizable

## Objetivo

Eliminar las constantes económicas rígidas del motor y convertirlas en entradas explícitas, validadas y trazables, sin modificar todavía el layout del dashboard ni construir el Control Deck de la Etapa 2.

## Entradas principales

| Parámetro | Campo | Unidad |
|---|---|---:|
| Precio del metal | `metalPriceUsdPerTonne` | US$/t metal |
| Recurso máximo | `maxResourceMt` | Mt de mineral |
| WACC | `wacc` | fracción decimal |
| Producción anual | `annualProductionMt` | Mt mineral/año |
| Strip ratio | `stripRatio` | t estéril/t mineral |
| Costo de mina | `miningCostUsdPerTonneMoved` | US$/t movida |
| Costo de planta | `processingCostUsdPerTonneOre` | US$/t mineral procesada |
| Ley base | `baseGradePercent` | % metal |
| Recuperación minera | `mineRecovery` | fracción decimal |
| Recuperación metalúrgica | `plantRecovery` | fracción decimal |

## Entradas avanzadas

- CAPEX inicial.
- CAPEX anual de sostenimiento.
- Factor pagable.
- Regalía.
- Impuesto.
- Paso de evaluación de ley de corte.
- Exponente de la curva de recursos.
- Exponente de respuesta de ley.
- Multiplicador de ley máxima evaluada.

## Resultados calculados

- ley de corte de equilibrio;
- ley de corte óptima;
- tonelaje mineral;
- tonelaje estéril;
- material total;
- ley media;
- metal recuperado;
- vida de mina;
- ingresos acumulados;
- OPEX acumulado;
- impuestos acumulados;
- flujos anuales;
- VAN;
- TIR.

La ley de corte no es una entrada manual. Se determina mediante la búsqueda económica del mayor VAN dentro del rango geológico parametrizado.

## Convenciones económicas

### OPEX unitario por tonelada de mineral

```text
OPEX mineral = costo mina × (1 + strip ratio) + costo planta
```

### Precio pagable

```text
Precio pagable = precio del metal × factor pagable
```

### Ley de equilibrio

```text
Cut-off equilibrio = OPEX mineral /
                     (precio pagable × recuperación planta × (1 − regalía) × 0.01)
```

### Flujo anual

```text
Ingreso bruto
− regalía
− costo operativo
− CAPEX de sostenimiento
− impuesto sobre flujo positivo
= flujo de caja libre
```

## Compatibilidad temporal

El motor mantiene un adaptador para el contrato anterior del dashboard:

- `discountRate` → `wacc`;
- capacidades de mina y planta → producción anual efectiva;
- costos y CAPEX anteriores → valores normalizados del nuevo contrato.

Esta compatibilidad se retirará únicamente cuando el Control Deck de la Etapa 2 utilice directamente el nuevo contrato.

## Validación

```bash
npm install
npm run verify:stage1
```

La validación comprueba:

- contrato completo de entradas;
- ausencia de constantes económicas rígidas heredadas;
- escenario base;
- sensibilidad a precio;
- sensibilidad a costos;
- sensibilidad a WACC;
- sensibilidad a recurso máximo;
- compatibilidad con el dashboard actual;
- rechazo de parámetros inválidos;
- línea base Datamine, TypeScript y build.

## Fuera del alcance de esta etapa

- diseño del Control Deck;
- inputs editables para todos los parámetros;
- persistencia de escenarios;
- bancos;
- topografía;
- pits F1–F6 reales;
- economía por bloque.
