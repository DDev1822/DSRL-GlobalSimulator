# Etapa 6 — Recomendación de fase óptima y frontera valor–riesgo

La aplicación incorpora el botón `FASE ÓPTIMA`.

## Perfiles de decisión

- **Conservador:** pondera 35 % valor y 65 % control de riesgo relativo.
- **Balanceado:** pondera 55 % valor y 45 % control de riesgo relativo.
- **Agresivo:** pondera 75 % valor y 25 % control de riesgo relativo.

## Puntaje de valor

Se normaliza entre las fases disponibles usando:

- VAN: 50 %;
- recurso: 20 %;
- ley: 15 %;
- densidad de valor VAN/recurso: 15 %.

## Puntaje de riesgo relativo

Se normaliza entre las fases usando:

- profundidad geométrica: 35 %;
- strip ratio: 30 %;
- huella superficial: 20 %;
- complejidad relativa de bancos y triángulos: 15 %.

Este puntaje no representa riesgo geotécnico. Es un screening relativo para comparar las fases cargadas.

## Recomendación

El puntaje combinado se calcula como:

```text
valor × peso de valor + (100 − riesgo) × peso de riesgo
```

El panel muestra:

- fase recomendada;
- valor, riesgo y puntaje combinado;
- confianza según la diferencia con la segunda alternativa;
- explicación de la recomendación;
- alternativa inferior, segunda mejor y alternativa superior;
- fases no dominadas.

## Frontera eficiente

Una fase pertenece a la frontera valor–riesgo cuando ninguna otra fase ofrece simultáneamente:

- valor igual o mayor;
- riesgo igual o menor;
- al menos una mejora estricta.

## Calidad de datos

- geometría: derivada de las superficies Datamine reales;
- economía: proxy analítico del escenario guardado;
- riesgo: comparación relativa, no geotécnica.

La decisión final requiere modelo de bloques, geotecnia, secuenciamiento y restricciones operativas.

## Validación

```bash
npm install
npm run verify:stage6
npm run dev
```
