# Etapa 6 — Recomendación de fase óptima y frontera valor–riesgo

La aplicación incorpora el botón `FASE ÓPTIMA`.

## Perfiles de decisión

- **Conservador:** 20 % valor y 80 % control del riesgo relativo. Elige el extremo eficiente de menor exposición.
- **Balanceado:** 50 % valor y 50 % riesgo. Busca el punto rodilla más cercano al ideal de alto valor y bajo riesgo.
- **Agresivo:** 90 % valor y 10 % control del riesgo relativo. Elige el extremo eficiente de mayor valor.

Las recomendaciones solo compiten entre fases pertenecientes a la frontera no dominada.

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

Conservador y Agresivo utilizan una utilidad ponderada entre valor y control del riesgo. Balanceado minimiza la distancia al punto ideal:

```text
valor = 100
riesgo = 0
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

Una fase dominada nunca puede convertirse en recomendación, aunque su ponderación aislada sea alta.

## Calidad de datos

- geometría: derivada de las superficies Datamine reales;
- economía: proxy analítico del escenario guardado;
- riesgo: comparación relativa, no geotécnica.

La decisión final requiere modelo de bloques, geotecnia, secuenciamiento y restricciones operativas.

## Validación

La prueba sintética exige tres decisiones diferenciadas:

```text
Conservador → fase de menor exposición
Balanceado  → punto rodilla
Agresivo    → fase de mayor valor eficiente
```

```bash
npm install
npm run verify:stage6
npm run dev
```
