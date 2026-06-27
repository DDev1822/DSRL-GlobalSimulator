# Etapa 8.10 — Economía integrada por ruta y valor recuperable

## Objetivo

Extender la Etapa 8.9 para convertir masa, ley, recuperación y rutas de proceso en una lectura económica trazable por periodo, ruta y estado del material.

La Etapa 8.10 calculará valor metálico, ingreso pagable, costos operativos, margen por ruta, valor pendiente en stockpile e inventario in situ, y valor operativo descontado.

La salida seguirá siendo una evaluación económica preliminar dentro del diseño. No será VAN, plan minero ejecutable, optimización global de rutas ni declaración de reservas.

## Principio de trazabilidad

Se mantendrán separados:

1. **dato observado**: `NPVPDEST`, masa, ley y geometría del modelo de bloques;
2. **supuesto DSRL**: recuperación, pagabilidad, costos, cargos y capacidades por ruta;
3. **resultado calculado**: ingreso, costo, margen, valor pendiente y valor descontado por ruta.

Ningún supuesto económico DSRL deberá presentarse como dato confirmado del modelo de bloques.

## Rutas iniciales

La etapa conservará las rutas heredadas:

- `Mill`;
- `Leach`;
- `_DUMP_` como material no procesado;
- destinos desconocidos bloqueados y reportados.

No se permitirá reclasificación implícita entre Mill y Leach.

## Contrato económico por ruta

Cada ruta deberá declarar como mínimo:

- recuperación metalúrgica;
- factor pagable;
- precio del metal;
- costo de procesamiento;
- costo de venta y comercialización;
- cargo de tratamiento;
- cargo de refinación;
- costo de mina aplicable;
- regalía aplicable;
- disponibilidad y capacidad;
- base temporal y tasa de descuento;
- origen del supuesto.

## Componentes de valor

Para cada ruta y periodo se calcularán:

```text
metal_contenido_kt
= masa_Mt × ley_Cu_% × 10
```

```text
metal_recuperado_kt
= metal_contenido_kt × recuperación
```

```text
metal_pagable_kt
= metal_recuperado_kt × factor_pagable
```

```text
ingreso_bruto_USD_M
= metal_pagable_kt × precio_USD_t ÷ 1000
```

```text
margen_operativo_USD_M
= ingreso_bruto
- costo_proceso
- costo_mina_aplicable
- tratamiento
- refinación
- comercialización
- regalías
```

```text
valor_operativo_descontado
= margen_operativo ÷ (1 + tasa_descuento)^periodo
```

## Estados económicos del material

El motor deberá distinguir:

- material procesado y realizado;
- material en stockpile;
- material in situ pendiente;
- material no proceso;
- material con destino desconocido.

El valor total de referencia deberá reconciliar:

```text
valor total de ruta
= valor realizado
+ valor pendiente en stockpile
+ valor in situ pendiente
```

## Resultados por ruta

El reporte deberá mostrar:

- masa fuente;
- masa procesada;
- ley de alimentación;
- metal contenido;
- metal recuperado;
- metal pagable;
- ingreso bruto;
- costo de proceso;
- costo de mina;
- cargos de tratamiento y refinación;
- costo de comercialización;
- regalías;
- margen operativo;
- valor operativo descontado;
- valor pendiente en stockpile;
- valor in situ pendiente;
- margen unitario US$/t;
- margen unitario US$/lb recuperada;
- utilización de capacidad;
- cuello de botella económico.

## Resultados consolidados

La etapa deberá entregar:

- margen total realizado;
- margen total pendiente;
- valor operativo descontado total;
- participación económica por ruta;
- diferencia de margen Mill vs Leach;
- sensibilidad del margen a precio, recuperación y costo;
- periodos con margen negativo;
- exposición económica por stockpile;
- exposición económica por inventario in situ.

## Comparación económica controlada

La Etapa 8.10 podrá comparar escenarios económicos sin cambiar la ruta observada:

- escenario base;
- precio alto y bajo;
- recuperación alta y baja;
- costo de proceso alto y bajo;
- disponibilidad de ruta reducida;
- incremento de cargos comerciales.

La comparación será informativa. No reasignará automáticamente material entre Mill y Leach.

## Reconciliaciones

La validación deberá verificar:

- masa por ruta cierra;
- cobre contenido cierra;
- cobre recuperado no supera cobre contenido;
- metal pagable no supera metal recuperado;
- ingreso bruto cierra contra metal pagable y precio;
- costos por ruta cierran;
- margen cierra como ingreso menos costos;
- valor realizado + pendiente cierra contra valor total de referencia;
- valor descontado no supera valor nominal cuando la tasa es positiva;
- no existen balances negativos imposibles;
- identidad de ruta preservada;
- destinos desconocidos reportados.

## Guardas metodológicas

No se modelarán todavía:

- CAPEX por ruta;
- impuestos de proyecto completos;
- depreciación;
- capital de trabajo;
- cierre de mina;
- cronograma contractual de ventas;
- concentrado físico y penalidades por impurezas;
- cinética de lixiviación;
- variabilidad geometalúrgica;
- equipos y acarreo;
- costos logísticos por distancia;
- optimización global de rutas;
- VAN de proyecto.

El valor operativo descontado no es VAN.

## Contratos propuestos

La implementación deberá incorporar contratos equivalentes a:

```ts
RouteEconomicDefinition
RouteEconomicInputs
RouteEconomicPeriod
RouteEconomicTotals
IntegratedRouteEconomicReport
```

Funciones esperadas:

```ts
createIntegratedRouteEconomicInputs
validateIntegratedRouteEconomicInputs
buildIntegratedRouteEconomics
buildRouteEconomicSensitivity
```

## Panel propuesto

El nuevo módulo se presentará como:

```text
ECONOMÍA POR RUTA
```

Controles mínimos:

- F1–F6;
- incremental / acumulado;
- altura de banco;
- base de costo;
- precio del cobre;
- recuperación por ruta;
- pagabilidad por ruta;
- costos y cargos por ruta;
- regalías;
- tasa de descuento;
- escenarios de sensibilidad;
- confirmación temporal `CU = %`.

## Validación mínima

La etapa deberá incluir:

- auditoría estática;
- validador independiente sobre `simmodPL.csv`;
- 48 combinaciones reales;
- F6 conserva 34,845 bloques y 54.892664 Mt;
- caso recuperación 0%;
- caso recuperación 100%;
- pagabilidad 0% y 100%;
- precio 0 como caso límite;
- costo alto con margen negativo;
- tasa de descuento 0%;
- tasa de descuento positiva;
- cierre Mill, Leach y consolidado;
- TypeScript y build en PASS;
- revisión visual del panel.

## Criterio de cierre

La Etapa 8.10 cerrará cuando:

- la economía por ruta sea trazable;
- el valor realizado y pendiente cierre;
- ingreso, costos y margen reconcilien;
- los supuestos DSRL estén separados de los datos observados;
- no exista reclasificación automática entre rutas;
- el panel declare sus limitaciones;
- las 48 combinaciones reales estén en PASS;
- TypeScript y build estén en PASS;
- la validación visual esté aprobada;
- toda la cadena heredada permanezca en PASS.
