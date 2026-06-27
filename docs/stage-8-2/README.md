# Etapa 8.2 — Parser e ingesta tipada

## Objetivo

Cargar los CSV reales definidos en la Etapa 8.1, normalizar sus 37 campos, excluir filas físicamente inválidas y producir un reporte de calidad visible y auditable.

Esta etapa no calcula inventarios por fase o banco. Su salida es un catálogo tipado listo para la Etapa 8.3.

## Fuentes

- maestro: `public/data/simmodPL.csv`;
- control: `public/data/OPDemo3PB.csv`;
- manifiesto: `public/data/block-model/block-model-manifest.json`.

## Motor de ingesta

`src/utils/blockModelParser.ts` incluye:

- lectura CSV con comillas;
- normalización de encabezados;
- conversión numérica explícita;
- clave compuesta por centro y dimensiones;
- carga desde URL o archivo seleccionado;
- catálogo maestro–control;
- reconciliación exacta F1–F3.

## Reglas de calidad

Una fila se excluye cuando tiene campos obligatorios inválidos, dimensiones o densidad no positivas, masa o volumen no positivos, pushback fuera de 1–9 o clave compuesta duplicada.

Un destino desconocido se conserva como advertencia para revisión humana.

Cada archivo reporta estado, puntaje, filas válidas e inválidas, encabezados, claves duplicadas, repeticiones de `IJK`, fases, destinos, años, límites XYZ, incidencias y reconciliación de volumen, masa y beneficio.

## Control cruzado

`OPDemo3PB.csv` debe coincidir exactamente con el subconjunto de `simmodPL.csv` donde `PSB_PIT <= 3`. Se comparan cantidad, claves y los 37 valores normalizados.

## Interfaz

El botón `MODELO DE BLOQUES` muestra:

- estado general;
- maestro y control;
- reconciliaciones físicas;
- control cruzado F1–F3;
- distribución por pushback y destino;
- reporte de calidad;
- primeras incidencias.

La carga ocurre al abrir el panel para no retrasar el visor 3D.

## Caso real esperado

- maestro: 49,989 filas válidas y 37 campos;
- control: 18,981 filas válidas;
- 0 filas inválidas;
- 0 claves compuestas duplicadas;
- 13,098 repeticiones de `IJK`;
- 15,144 bloques F7–F9 preservados;
- control exacto F1–F3.

## Validación

```bash
npm install
npm run verify:stage8-2
npm run dev
```

## Siguiente paso

La Etapa 8.3 usará este catálogo para inventarios físicos incrementales y acumulados F1–F6, sin reinterpretar el CSV.
