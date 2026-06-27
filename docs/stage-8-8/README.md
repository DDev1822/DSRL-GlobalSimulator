# Etapa 8.8 — Stockpile y blending controlado

## Objetivo

Extender la secuencia preliminar de la Etapa 8.7 con inventario de stockpile, reclaim y blending por periodo, conservando masa, ley de cobre y valor económico por lote.

La salida sigue siendo una simulación preliminar dentro del diseño. No es un plan minero ejecutable ni una optimización global.

## Requisito de unidad

La etapa permanece bloqueada hasta confirmar temporalmente:

```text
CU = %
```

Sin esta confirmación no se calcula cobre contenido ni ley de alimentación.

## Flujo de material

Cada periodo aplica la siguiente lógica:

1. minado desde techo hacia fondo;
2. separación entre material de proceso y no proceso;
3. alimentación directa a planta;
4. envío del proceso fresco no utilizado al stockpile;
5. reclaim limitado por capacidad;
6. blending contra una ley objetivo;
7. cierre de stockpile, cobre contenido y valor.

Los bancos y lotes pueden dividirse proporcionalmente. La identidad económica y metalúrgica de cada lote se conserva.

## Ley objetivo

La ley objetivo puede ser:

- automática: ley ponderada del proceso DSRL seleccionado;
- manual: valor ingresado por el usuario.

La tolerancia se expresa en puntos porcentuales de Cu.

## Política de blending

La política es determinista:

```text
target-seeking-complementary-lots
```

Primero combina lotes complementarios de alta y baja ley para aproximarse a la ley objetivo. Después completa la capacidad con el lote disponible que genere menor desviación.

Esta política no es optimización global ni reemplaza un algoritmo formal de blending.

## Capacidades

Se configuran:

- capacidad mina;
- capacidad planta;
- capacidad máxima de stockpile;
- capacidad de reclaim por periodo;
- utilización mina y planta;
- número de periodos.

El minado se detiene cuando no existe capacidad suficiente para alimentar planta o almacenar el proceso fresco.

## Resultados por periodo

- movimiento total;
- proceso fresco;
- alimentación directa;
- reclaim;
- alimentación total a planta;
- ley de alimentación;
- desviación contra objetivo;
- stockpile agregado y final;
- ley y cobre contenido en stockpile;
- margen realizado;
- margen operativo descontado;
- cuello de botella.

## Balance de cobre

La reconciliación verifica:

```text
cobre alimentado + cobre en stockpile + cobre in situ pendiente
= cobre total del proceso DSRL
```

También se controlan masa minada, ruteo de proceso, stockpile, alimentación de planta y valor económico.

## Limitaciones explícitas

No se modelan:

- pérdidas físicas de stockpile;
- oxidación o degradación por permanencia;
- recuperaciones variables por ruta;
- humedad;
- equipos;
- acarreo;
- costos de manipulación secundaria;
- geometría del stockpile.

El margen operativo descontado no es VAN.

## Terminología

El resultado se denomina:

> simulación preliminar de stockpile y blending dentro del diseño

No constituye reserva ni plan de producción aprobado.

## Validación

```bash
npm run verify:stage8-6
node scripts/audit-stage-8-7.mjs
node scripts/validate-block-bench-preliminary-sequence.mjs
node scripts/audit-stage-8-8.mjs
node scripts/validate-block-bench-stockpile-blending.mjs
npm run typecheck
npm run build
npm run dev
```

El validador independiente recalcula 48 combinaciones reales directamente desde `simmodPL.csv` y prueba una mezcla sintética de 0.20% y 0.40% para obtener 0.30% Cu.

## Próxima etapa

La Etapa 8.9 incorporará recuperación metalúrgica y rutas de proceso diferenciadas, manteniendo separados los datos confirmados de los supuestos DSRL.
