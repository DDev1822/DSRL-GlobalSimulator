# Etapa 3 — Contrato geométrico multi-pit

## Objetivo

Preparar el simulador para recibir topografía y pits F1–F6 como superficies Datamine independientes, manteniendo un par `_pt/_tr` por superficie y construyendo un catálogo común en memoria.

## Decisión arquitectónica

### Fuente maestra

Cada geometría permanece separada:

- topografía: un CSV de puntos y un CSV de triángulos;
- cada pit: un CSV de puntos y un CSV de triángulos.

### Uso interno

El parser carga las superficies declaradas en `public/data/datamine/geometry-manifest.json` y genera:

```ts
catalog.topography
catalog.phases[1]
catalog.phases[2]
...
catalog.phases[6]
```

Cada superficie conserva sus PID originales. No se exige unicidad global entre pits.

## Estado actual

El manifiesto declara solamente:

```text
PIT_F6
```

con los archivos existentes:

```text
/data/Design Pit_pt.csv
/data/Design Pit_tr.csv
```

La topografía permanece declarada como `null` hasta recibir los archivos reales.

## Funciones implementadas

- `parseDatamineGeometryCatalog()` carga todas las superficies habilitadas;
- `parsePhaseGeometry(phase)` obtiene una fase real concreta;
- `parsePhase6Geometry()` mantiene compatibilidad con el visor actual;
- carga concurrente de superficies;
- validación independiente de PID por cada par;
- reporte de fases disponibles;
- reporte de archivos faltantes;
- aliases de encabezados Datamine;
- metadatos visibles de superficie activa;
- fallback controlado a la fase más alta disponible si F6 falta.

## Manifiesto

Cada fase se registra así:

```json
{
  "id": "PIT_F4",
  "name": "Pit F4",
  "phase": 4,
  "type": "pit",
  "pointsFile": "/data/datamine/phases/pit_f4_pt.csv",
  "trianglesFile": "/data/datamine/phases/pit_f4_tr.csv",
  "expectedPoints": 12345,
  "expectedTriangles": 24000,
  "enabled": true
}
```

Los conteos esperados son opcionales, pero recomendables para detectar archivos incompletos.

## Validación

```bash
npm install
npm run verify:stage3
```

El comando ejecuta:

1. validación del manifiesto;
2. validación de cada par `_pt/_tr`;
3. conectividad PID;
4. auditorías de etapas 0–3;
5. pruebas económicas;
6. TypeScript;
7. build de producción.

## Criterios de cierre

- F6 carga mediante el manifiesto;
- el visor identifica `PIT_F6` y `F6` como fuente real;
- no existen rutas fijas únicas dentro del parser;
- topografía ausente se reporta sin romper la aplicación;
- nuevas fases pueden agregarse solo mediante archivos y manifiesto;
- la línea base visual y económica permanece intacta.

## Fuera del alcance

- selección visual entre pits reales;
- superposición topografía-pit;
- comparación geométrica entre fases;
- agrupación por bancos;
- economía real por banco.

Esas funciones se construirán encima del catálogo multi-pit ya normalizado.
