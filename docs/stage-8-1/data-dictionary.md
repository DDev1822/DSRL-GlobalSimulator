# Diccionario de datos — Modelo de bloques

## Identidad y geometría

| Campo | Tipo | Unidad | Uso contractual | Estado |
|---|---|---:|---|---|
| `IJK` | entero | índice | Referencia de celda padre; no es ID único | recomendado |
| `XC` | número | m | Centro X del bloque | obligatorio |
| `YC` | número | m | Centro Y del bloque | obligatorio |
| `ZC` | número | m | Centro Z/elevación | obligatorio |
| `XINC` | número | m | Dimensión real X | obligatorio |
| `YINC` | número | m | Dimensión real Y | obligatorio |
| `ZINC` | número | m | Dimensión real Z | obligatorio |
| `XMORIG` | número | m | Origen X de la malla | recomendado |
| `YMORIG` | número | m | Origen Y de la malla | recomendado |
| `ZMORIG` | número | m | Origen Z de la malla | recomendado |
| `NX` | entero | conteo | Tamaño nominal de malla X | recomendado |
| `NY` | entero | conteo | Tamaño nominal de malla Y | recomendado |
| `NZ` | entero | conteo | Tamaño nominal de malla Z | recomendado |

## Geología y leyes

| Campo | Tipo | Unidad | Uso contractual | Estado |
|---|---|---:|---|---|
| `DENSITY` | número | t/m³ | Conversión de volumen a masa | obligatorio |
| `ROCKCODE` | entero | código | Dominio litológico/material | recomendado |
| `AU` | número | por confirmar | Ley de oro | obligatorio, unidad pendiente |
| `CU` | número | por confirmar | Ley de cobre | obligatorio, unidad pendiente |

## Magnitudes físicas y destino

| Campo | Tipo | Unidad | Uso contractual | Estado |
|---|---|---:|---|---|
| `NPVVOL` | número | m³ | Volumen oficial del bloque | obligatorio |
| `NPVMASS` | número | t | Masa oficial del bloque | obligatorio |
| `NPVPDEST` | texto | categoría | `_DUMP_`, `Mill` o `Leach` | obligatorio |

Reglas de reconciliación:

```text
NPVVOL ≈ XINC × YINC × ZINC
NPVMASS ≈ NPVVOL × DENSITY
```

## Economía observada

| Campo | Tipo | Unidad | Uso contractual | Estado |
|---|---|---:|---|---|
| `NPVREVEN` | número | moneda por confirmar | Ingreso preexistente por bloque | auditoría |
| `NPVPCOST` | número | moneda por confirmar | Costo de proceso preexistente | auditoría |
| `NPVMCOST` | número | moneda por confirmar | Costo de mina preexistente | auditoría |
| `NPVPROFT` | número | moneda por confirmar | Beneficio preexistente | auditoría |
| `MRAU` | número | por confirmar | Campo marginal Au | reservado |
| `MRCU` | número | por confirmar | Campo marginal Cu | reservado |

Regla de reconciliación:

```text
NPVPROFT ≈ NPVREVEN − NPVPCOST − NPVMCOST
```

Los campos económicos del CSV son referencia de control. No sustituyen el escenario económico guardado ni el motor DSRL.

## Fases y secuencias

| Campo | Tipo | Unidad | Uso contractual | Estado |
|---|---|---:|---|---|
| `PSB_PIT` | entero | fase | Pushback incremental del bloque | obligatorio; semántica externa pendiente |
| `PSB_SEQ` | entero | secuencia | Orden interno del pushback | recomendado |
| `SCH_YEAR` | entero | año índice | Año programado | recomendado |
| `SCHDAY` | entero | día índice | Día programado | recomendado |
| `SCH_SEQ` | entero | secuencia | Orden programado | recomendado |
| `UPT_PIT` | entero | índice | Ultimate pit de referencia | reservado |
| `UPT_SEQ` | entero | secuencia | Secuencia UPT | reservado |
| `GRA_PIT` | entero | índice | Campo GRA | reservado |
| `GRA_SEQ` | entero | secuencia | Secuencia GRA | reservado |
| `MFO_YEAR` | texto | por confirmar | Año MFO | reservado |
| `MFO_SEQ` | texto | por confirmar | Secuencia MFO | reservado |

## Clave del bloque

La clave oficial de la Etapa 8 es:

```text
XC | YC | ZC | XINC | YINC | ZINC
```

`IJK` no se utiliza solo porque en `simmodPL.csv` presenta 13,098 repeticiones asociadas a subbloques.

## Alcance de fases

```text
Fases activas: PSB_PIT 1–6
Fases preservadas: PSB_PIT 7–9
```

El inventario incremental usa igualdad de fase. El inventario acumulado usa `PSB_PIT <= fase objetivo`.
