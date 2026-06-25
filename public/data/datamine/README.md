# Fuentes geométricas Datamine

La fuente oficial conserva cada superficie como un par independiente:

- un archivo de puntos `_pt.csv`;
- un archivo de triángulos `_tr.csv`.

El archivo `geometry-manifest.json` declara qué par corresponde a topografía y a cada fase de pit. La aplicación carga todos los pares habilitados y construye un catálogo unificado en memoria.

## Estructura recomendada cuando estén disponibles todas las superficies

```text
public/data/datamine/
├── geometry-manifest.json
├── topography/
│   ├── topography_pt.csv
│   └── topography_tr.csv
└── phases/
    ├── pit_f1_pt.csv
    ├── pit_f1_tr.csv
    ├── pit_f2_pt.csv
    ├── pit_f2_tr.csv
    ├── pit_f3_pt.csv
    ├── pit_f3_tr.csv
    ├── pit_f4_pt.csv
    ├── pit_f4_tr.csv
    ├── pit_f5_pt.csv
    ├── pit_f5_tr.csv
    ├── pit_f6_pt.csv
    └── pit_f6_tr.csv
```

## Encabezados admitidos

### Puntos

El parser reconoce las siguientes alternativas:

- ID: `PID`, `POINT_ID` o `GLOBAL_PID`;
- X: `XP`, `X` o `EASTING`;
- Y: `YP`, `Y` o `NORTHING`;
- Z: `ZP`, `Z`, `ELEVATION` o `RL`.

### Triángulos

- ID: `TRIANGLE`, `TRIANGLE_ID` o `GLOBAL_TRIANGLE_ID`;
- vértices: `PID1`, `PID2`, `PID3`;
- aliases opcionales: `POINT1`, `POINT2`, `POINT3`.

Los PID solo tienen que ser únicos dentro de su propia superficie. No es necesario renumerarlos globalmente porque cada par se valida y almacena por separado.

## Incorporar una nueva fase

1. Copiar el par `_pt/_tr` dentro de `public/data/datamine/phases/`.
2. Agregar una entrada al arreglo `phases` de `geometry-manifest.json`.
3. Ejecutar:

```bash
npm run validate:data
npm run verify:stage3
```

Ejemplo:

```json
{
  "id": "PIT_F3",
  "name": "Pit F3",
  "phase": 3,
  "type": "pit",
  "pointsFile": "/data/datamine/phases/pit_f3_pt.csv",
  "trianglesFile": "/data/datamine/phases/pit_f3_tr.csv",
  "enabled": true
}
```

## Incorporar topografía

La propiedad `topography` debe pasar de `null` a una entrada como:

```json
{
  "id": "TOPOGRAPHY",
  "name": "Topografía base",
  "type": "topography",
  "pointsFile": "/data/datamine/topography/topography_pt.csv",
  "trianglesFile": "/data/datamine/topography/topography_tr.csv",
  "enabled": true
}
```

No se debe consolidar manualmente todos los pits en un CSV único. El catálogo unificado se genera en memoria y preserva la trazabilidad de cada superficie original.
