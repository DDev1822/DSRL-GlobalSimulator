# Etapa 7 — Sensibilidad y robustez de la recomendación

La aplicación incorpora el botón `ROBUSTEZ`.

## Objetivo

Evaluar si la fase recomendada se mantiene cuando cambian los principales supuestos económicos y operativos.

## Metodología

Se utiliza un análisis **one-at-a-time**: se modifica una variable por vez y se mantienen las demás constantes.

Variables evaluadas:

- precio del metal;
- WACC;
- costo de mina;
- costo de planta;
- strip ratio;
- producción anual.

El usuario puede aplicar variaciones de ±10 %, ±20 % o ±30 %.

## Escenarios

Para cada perfil se ejecutan 13 escenarios:

```text
1 escenario base
6 variables × 2 perturbaciones = 12 escenarios
Total = 13 escenarios
```

Cada escenario recalcula:

- curva económica;
- VAN máximo;
- fase recomendada;
- frontera valor–riesgo;
- cambio o estabilidad de la recomendación.

## Indicadores

- porcentaje de estabilidad;
- cantidad de escenarios que conservan la fase base;
- fases alternativas observadas;
- parámetro con mayor rango de impacto en VAN;
- peor y mejor caso;
- filas que cambian la fase recomendada;
- clasificación de robustez Alta, Media o Baja.

## Criterio de robustez

```text
Alta  ≥ 85 %
Media ≥ 65 % y < 85 %
Baja  < 65 %
```

## Matriz bajo–base–alto

La matriz muestra para cada variable:

- valor perturbado;
- fase recomendada;
- cambio de VAN respecto al caso base;
- indicador `CAMBIA FASE` cuando corresponde.

## Tornado

El gráfico tornado ordena las variables según el rango total de impacto en VAN entre su caso bajo y alto.

## Limitaciones

- no es una simulación Monte Carlo;
- no incorpora correlación entre variables;
- no representa incertidumbre geológica;
- los resultados económicos continúan siendo analíticos;
- la decisión final requiere modelo de bloques, geotecnia, secuenciamiento y restricciones operativas.

## Validación

```bash
npm install
npm run verify:stage7
npm run dev
```
