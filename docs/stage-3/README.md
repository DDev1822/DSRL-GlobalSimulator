# Etapa 3 — Catálogo geométrico Datamine real

## Objetivo

Integrar topografía y pits F1–F6 como superficies Datamine independientes, manteniendo un par `_pt/_tr` por superficie y construyendo un catálogo común en memoria.

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
catalog.phases[3]
catalog.phases[4]
catalog.phases[5]
catalog.phases[6]
```

Cada superficie conserva sus PID originales. No se exige unicidad global entre pits.

## Estado actual

El catálogo declara y carga:

```text
TOPOGRAPHY → Topos_pt.csv + Topos_tr.csv
PIT_F1     → P01pt.csv   + P01tr.csv
PIT_F2     → P02pt.csv   + P02tr.csv
PIT_F3     → P03pt.csv   + P03tr.csv
PIT_F4     → P04pt.csv   + P04tr.csv
PIT_F5     → P05pt.csv   + P05tr.csv
PIT_F6     → P06pt.csv   + P06tr.csv
```

Los archivos anteriores `Design Pit_pt.csv` y `Design Pit_tr.csv` fueron sustituidos por el conjunto real de fases.

## Funciones implementadas

- `parseDatamineGeometryCatalog()` carga todas las superficies habilitadas;
- `parsePhaseGeometry(phase)` obtiene una fase real concreta;
- `parsePhase6Geometry()` mantiene compatibilidad con el resto del dashboard;
- carga concurrente de superficies;
- validación independiente de PID por cada par;
- reporte de fases disponibles;
- reporte de archivos faltantes;
- aliases de encabezados Datamine;
- selección real de F1–F6 desde el visor;
- reproducción secuencial entre pits reales;
- botones anterior, siguiente y reinicio sobre fases reales;
- topografía activable y desactivable;
- superposición semitransparente de topografía;
- alineamiento espacial mediante límites combinados;
- metadatos visibles de superficie y fase activa.

## Comportamiento del visor

Cada botón F1–F6 carga la geometría completa de su pit correspondiente. Ya no se utiliza un porcentaje de triángulos de F6 para simular fases anteriores.

La topografía se carga como superficie independiente y puede mostrarse u ocultarse sin modificar los archivos de los pits.

Al cambiar de fase, el visor:

1. selecciona el par `_pt/_tr` real;
2. reconstruye la malla;
3. reinicia la cámara para encuadrar la nueva superficie;
4. conserva la capa económica seleccionada;
5. conserva wireframe y estado de topografía.

## Validación

```bash
npm install
npm run verify:stage3
```

El comando ejecuta:

1. validación del manifiesto;
2. validación de topografía y F1–F6;
3. conectividad PID por superficie;
4. auditorías de etapas 0–3;
5. pruebas económicas;
6. TypeScript;
7. build de producción.

## Criterios de cierre

- topografía y F1–F6 están declarados;
- cada par `_pt/_tr` carga independientemente;
- todos los triángulos referencian PID existentes;
- los botones F1–F6 muestran superficies reales;
- play recorre pits reales;
- la topografía se superpone correctamente;
- el pit activo muestra su ID, fase, puntos, triángulos y elevación;
- no existe recorte porcentual del pit final;
- la línea base económica permanece intacta.

## Fuera del alcance

- comparación simultánea entre dos pits;
- diferencias volumétricas entre fases;
- agrupación por bancos;
- economía real por banco;
- conexión con modelo de bloques.
