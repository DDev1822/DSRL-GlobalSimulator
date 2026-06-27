# Etapa 8.7 — Secuencia preliminar y capacidad

## Objetivo

Transformar el screening económico por banco de la Etapa 8.6 en una asignación preliminar por periodos, respetando precedencia vertical y capacidades configuradas.

El resultado no es un plan minero ejecutable. Es una capa intermedia para estudiar ritmo, horizonte y cuellos de botella antes de incorporar equipos, rutas, blending y restricciones operacionales.

## Base de secuencia

La política es:

```text
strict-top-down
```

Los bancos se recorren desde techo hacia fondo según su orden de elevación. Un banco puede dividirse proporcionalmente entre periodos cuando la capacidad disponible no permite completarlo.

No se permite adelantar un banco inferior mientras quede masa pendiente en un banco superior.

## Capacidades

La configuración incluye:

- número de periodos;
- capacidad mina en Mt por periodo;
- capacidad planta en Mt por periodo;
- utilización mina;
- utilización planta.

Los valores iniciales se derivan del escenario económico:

```text
capacidad planta = producción anual configurada
capacidad mina = capacidad planta × (1 + strip ratio configurado)
```

La capacidad mina controla movimiento total. La capacidad planta controla material clasificado a proceso.

## Base económica

Mientras `CU` permanezca sin confirmar, la asignación usa destinos fuente y no publica margen DSRL.

Después de confirmar temporalmente:

```text
CU = %
```

la secuencia usa proceso/desmonte DSRL y muestra:

- margen por periodo;
- margen operativo descontado;
- acumulado de masa y proceso;
- masa y valor pendientes.

El margen operativo descontado no es VAN. No incluye CAPEX, impuestos, valor terminal ni cierre.

## Sin stockpile implícito

La Etapa 8.7 no modela stockpile. La masa total y la fracción de proceso de cada banco avanzan conjuntamente.

Cuando la planta agota su capacidad y el banco accesible todavía contiene proceso, el periodo termina aunque exista capacidad mina remanente.

## Cuellos de botella

Cada periodo se clasifica como:

- mina;
- planta;
- doble;
- inventario agotado;
- ninguno.

También se calcula el número de periodos requerido para completar el inventario con la capacidad configurada y se compara con el horizonte disponible.

## Reconciliaciones

- masa programada + pendiente = masa total de 8.6;
- proceso programado + pendiente = proceso total;
- margen programado + pendiente = margen de 8.6 cuando DSRL está activo;
- suma de tramos = total del periodo;
- capacidad mina respetada;
- capacidad planta respetada;
- precedencia vertical respetada;
- asignaciones sin valores negativos.

## Limitaciones explícitas

No se modelan:

- stockpiles;
- blending;
- equipos y disponibilidad;
- rutas y tiempos de acarreo;
- restricciones geotécnicas;
- accesos simultáneos;
- precedencias espaciales dentro del banco;
- recuperación variable por periodo.

El resultado se denomina:

> asignación preliminar de capacidad por banco dentro del diseño

No constituye reserva, VAN ni plan de producción aprobado.

## Validación

```bash
npm install
npm run verify:stage8-7
npm run dev
```

El validador recorre 48 combinaciones reales y prueba horizonte corto, cuello mina, cuello planta, menor utilización, banco parcial y configuración inválida.

## Próxima etapa

La Etapa 8.8 incorporará stockpile y blending controlado, manteniendo separadas las restricciones operacionales de los supuestos económicos.
