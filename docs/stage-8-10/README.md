# Etapa 8.10 — Economía integrada por ruta y valor recuperable

## Objetivo

Extender la Etapa 8.9 para convertir masa, ley, recuperación y rutas de proceso en una lectura económica trazable por periodo, ruta y estado del material.

La salida sigue siendo una evaluación económica preliminar dentro del diseño. No es VAN, plan minero ejecutable, optimización global de rutas ni declaración de reservas.

## Estado actual

La primera implementación funcional incorpora:

- motor `src/engine/integratedRouteEconomics.ts`;
- panel `ECONOMÍA POR RUTA`;
- CSS responsive del panel;
- módulo montado en `src/main.tsx`;
- dock ajustado para 13 módulos;
- auditoría `scripts/audit-stage-8-10.mjs`;
- validador `scripts/validate-integrated-route-economics.mjs`;
- pruebas sintéticas y 48 combinaciones reales preparadas.

La ejecución local de auditoría, validador, TypeScript, build y revisión visual sigue pendiente.

## Trazabilidad

Se mantienen separados:

1. dato observado: `NPVPDEST`, masa y ley;
2. supuesto DSRL: recuperación, pagabilidad, precio, costos, cargos, regalías y capacidades;
3. resultado calculado: ingreso, costo, margen, valor pendiente y valor descontado.

No existe reclasificación automática entre Mill y Leach.

## Componentes económicos

```text
metal contenido = masa × ley
metal recuperado = metal contenido × recuperación
metal pagable = metal recuperado × pagabilidad
ingreso bruto = metal pagable × precio
margen operativo = ingreso - costos - cargos - regalías
valor descontado = margen ÷ (1 + tasa)^periodo
```

## Estados del material

El reporte distingue:

- valor realizado;
- valor pendiente en stockpile;
- valor pendiente in situ;
- material no proceso;
- destinos desconocidos.

## Resultados

Se reportan por Mill, Leach, periodo y total:

- masa y ley;
- cobre contenido, recuperado y pagable;
- ingreso bruto;
- costos de proceso y mina;
- tratamiento y refinación;
- comercialización y regalías;
- margen operativo;
- margen unitario US$/t;
- margen unitario US$/lb recuperada;
- valor operativo descontado;
- valor pendiente;
- participación económica;
- periodos con margen negativo.

## Sensibilidad

La primera versión presenta:

- base;
- precio -15%;
- precio +15%;
- costos -10%;
- costos +15%.

La sensibilidad no modifica rutas ni capacidades.

## Reconciliaciones

El motor verifica masa, cobre contenido, recuperado, pagable, ingreso, costos, margen, valor realizado más pendiente, descuento, identidad de ruta, destinos desconocidos y ausencia de balances imposibles.

## Guardas

No se modelan todavía CAPEX por ruta, impuestos completos, depreciación, capital de trabajo, contratos de venta, penalidades de concentrado, cinética de lixiviación, geometalurgia avanzada, equipos, acarreo, costos logísticos por distancia, optimización global ni VAN de proyecto.

El valor operativo descontado no es VAN.

## Validación

```bash
npm run verify:stage8-6
node scripts/audit-stage-8-7.mjs
node scripts/validate-block-bench-preliminary-sequence.mjs
node scripts/audit-stage-8-8.mjs
node scripts/validate-block-bench-stockpile-blending.mjs
node scripts/audit-stage-8-9.mjs
node scripts/validate-block-bench-route-recovery.mjs
node scripts/audit-stage-8-10.mjs
node scripts/validate-integrated-route-economics.mjs
npm run typecheck
npm run build
npm run dev
```

El validador incluye Mill, Leach, pagabilidad 0% y 100%, precio 0, costos altos con margen negativo, tasa de descuento 0% y positiva, cierre realizado más pendiente, 48 combinaciones reales y F6 con 34,845 bloques y 54.892664 Mt.

## Criterio de cierre

La Etapa 8.10 cerrará cuando toda la cadena técnica esté en PASS y el panel haya sido aprobado visualmente.