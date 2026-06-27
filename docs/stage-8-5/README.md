# Etapa 8.5 — Clasificación económica por bloque

## Objetivo

Separar claramente la economía observada del archivo y la reclasificación DSRL sobre el inventario real F1–F6.

## Auditoría fuente

Usa `NPVPDEST`, `NPVREVEN`, `NPVPCOST`, `NPVMCOST` y `NPVPROFT`.

Los campos económicos permanecen en moneda nativa no confirmada. `NPVPROFT` se trata como beneficio fuente, no como VAN DSRL.

La auditoría revisa:

- proceso con beneficio no positivo;
- desmonte con beneficio positivo;
- cobertura económica;
- `NPVPROFT = NPVREVEN - NPVPCOST - NPVMCOST`;
- cierre de masa por destino;
- Mill + Leach = proceso.

## Reclasificación DSRL

Permanece bloqueada hasta una confirmación explícita y temporal de:

```text
CU = %
```

DSRL solo clasifica proceso versus desmonte. No decide entre Mill y Leach.

## Ley de corte

```text
precio neto = precio × recuperación planta × factor pagable × (1 - regalía)
costo clasificación = costo proceso + costo mina opcional
cut-off % Cu = costo clasificación / (precio neto × 0.01)
```

Bases disponibles:

- `SOLO PROCESO`;
- `COSTO COMPLETO`.

No se incluyen CAPEX, impuestos ni strip ratio global.

## Margen DSRL

```text
ingreso potencial = masa × (CU / 100) × precio neto
margen potencial = ingreso potencial - costos aplicables
```

Se clasifica a proceso cuando CU supera el cut-off y el margen es positivo.

El resultado es margen no descontado, no VAN. El costo de minado del desmonte no forma parte de esta selección por bloque.

## Trazabilidad

Cada bloque queda en uno de cuatro estados:

- mantiene proceso;
- mantiene desmonte;
- sube a proceso;
- baja a desmonte.

La interfaz muestra ejemplos con fase, CU, destino fuente, destino DSRL y razón.

## Reconciliaciones

- masa fuente = proceso + desmonte + desconocido;
- proceso fuente = Mill + Leach;
- beneficio fuente reconciliado;
- masa DSRL = proceso + desmonte;
- matriz de reclasificación cubre la masa total;
- margen DSRL = ingreso seleccionado - costos seleccionados;
- suma incremental F1–F6 = acumulado F6.

## Terminología

El resultado es `inventario económico preliminar dentro del diseño`, no una declaración de reservas.

## Validación

```bash
npm install
npm run verify:stage8-5
npm run dev
```

## Próxima etapa

La Etapa 8.6 integrará valor por bloque con bancos y fases, sin reemplazar todavía el secuenciamiento de mina.
