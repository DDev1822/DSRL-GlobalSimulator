# Etapa 8.1 — Contrato del modelo de bloques

## Objetivo

Definir intelectualmente y de forma ejecutable el contrato de datos que permitirá reemplazar los proxies físicos por inventarios reales derivados del modelo de bloques.

Esta etapa no implementa todavía la ingesta completa, el inventario por banco ni el panel. Esas responsabilidades comienzan en la Etapa 8.2.

## Archivos seleccionados

### Modelo maestro

`simmodPL.csv`

- 49,989 bloques;
- 37 campos;
- pushbacks observados 1–9;
- años programados 1–11;
- destinos `_DUMP_`, `Mill` y `Leach`.

### Modelo de control

`OPDemo3PB.csv`

- 18,981 bloques;
- 37 campos;
- pushbacks 1–3;
- coincide exactamente con el subconjunto de `simmodPL.csv` donde `PSB_PIT <= 3`.

## Alcance inicial

La aplicación dispone actualmente de geometrías F1–F6. Por ello, el contrato activa los pushbacks 1–6 y preserva 7–9 para una expansión futura.

```text
Fase incremental del bloque = PSB_PIT
Inventario acumulado F4 = PSB_PIT <= 4
Inventario incremental F4 = PSB_PIT == 4
```

La interpretación de `PSB_PIT` como pushback incremental está respaldada por la estructura de los archivos y por la equivalencia del modelo de control, pero su confirmación semántica mediante diccionario Datamine continúa pendiente.

## Magnitudes físicas oficiales

```text
Volumen oficial = NPVVOL
Masa oficial = NPVMASS
```

Se auditan mediante:

```text
NPVVOL ≈ XINC × YINC × ZINC
NPVMASS ≈ NPVVOL × DENSITY
```

Las dimensiones reales del subbloque se conservan; no se reemplazan por dimensiones nominales de la malla madre.

## Identidad del bloque

`IJK` es una referencia de la celda padre y no es único cuando existen subbloques.

La identidad contractual es:

```text
XC | YC | ZC | XINC | YINC | ZINC
```

Esta clave evita colisiones entre subbloques de una misma celda madre.

## Clasificación por destino

```text
_DUMP_ → waste
Mill   → process
Leach  → process
```

La clasificación describe el destino observado en el modelo. No convierte por sí sola el material en reserva minera.

## Guardas semánticas

Hasta disponer del diccionario completo:

- la unidad de `AU` permanece sin confirmar;
- la unidad de `CU` permanece sin confirmar;
- la unidad monetaria de los campos `NPV*` permanece sin confirmar;
- `MRAU`, `MRCU`, `UPT_*`, `GRA_*` y `MFO_*` se mantienen reservados;
- los campos económicos del archivo se usan como referencia de auditoría y no sustituyen el motor económico DSRL.

## Terminología permitida

El resultado se denominará:

> inventario dentro del diseño

No se declara reserva. La conversión a reserva requiere factores modificadores, diseño, geotecnia, recuperación, dilución, pérdidas, capacidades, secuenciamiento y demostración económica.

## Evidencia observada para F1–F6

- 34,845 bloques;
- 54.8926637508 Mt de masa total;
- 39.1063967117 Mt con destino `Mill` o `Leach`;
- 15.7862670391 Mt con destino `_DUMP_`;
- strip ratio basado en destino: 0.4036748043.

Estas cifras son referencias de reconciliación y no reemplazan los cálculos que realizará el motor de inventarios en etapas posteriores.

## Salidas de esta etapa

- contrato TypeScript versionado;
- diccionario de los 37 campos;
- manifiesto con archivos y métricas observadas;
- reglas de identidad y clasificación;
- guardas semánticas;
- validación automática del contrato;
- auditoría documental.

## Próxima etapa

La Etapa 8.2 implementará:

- localización y carga de CSV;
- parser tipado;
- reporte de calidad;
- normalización de filas;
- errores y advertencias por bloque;
- preparación del catálogo para inventarios incrementales y acumulados.

## Validación

```bash
npm install
npm run verify:stage8-1
```

Cuando los CSV estén disponibles en una ruta candidata de `data` o `public/data`, el mismo comando también verifica sus encabezados, cantidades, reconciliaciones físicas y relación maestro–control.
