# Checklist — Etapa 8.10

## Contrato

- [x] `RouteEconomicDefinition` tipado;
- [x] `IntegratedRouteEconomicInputs` tipado;
- [x] `RouteEconomicPeriod` tipado;
- [x] `RouteEconomicTotals` tipado;
- [x] `IntegratedRouteEconomicReport` tipado;
- [x] rutas Mill y Leach preservadas;
- [x] `_DUMP_` excluido de proceso por herencia de 8.9;
- [x] destinos desconocidos bloqueados y reportados;
- [x] supuestos DSRL separados de datos observados.

## Motor

- [x] `createIntegratedRouteEconomicInputs`;
- [x] `validateIntegratedRouteEconomicInputs`;
- [x] `buildIntegratedRouteEconomics`;
- [x] `buildRouteEconomicSensitivity`;
- [x] metal contenido calculado;
- [x] metal recuperado calculado;
- [x] metal pagable calculado;
- [x] ingreso bruto calculado;
- [x] costos de proceso por ruta;
- [x] costo de mina aplicable;
- [x] tratamiento y refinación;
- [x] comercialización;
- [x] regalías;
- [x] margen operativo por ruta;
- [x] valor operativo descontado;
- [x] valor pendiente en stockpile;
- [x] valor in situ pendiente;
- [x] identidad de ruta preservada;
- [x] sin reclasificación automática Mill/Leach.

## Resultados

- [x] masa fuente por ruta;
- [x] masa procesada por ruta;
- [x] ley de feed por ruta;
- [x] metal contenido;
- [x] metal recuperado;
- [x] metal pagable;
- [x] ingreso bruto;
- [x] costos por componente;
- [x] margen operativo;
- [x] valor operativo descontado;
- [x] margen unitario US$/t;
- [x] margen unitario US$/lb recuperada;
- [x] valor pendiente en stockpile;
- [x] valor pendiente in situ;
- [x] participación económica por ruta;
- [x] periodos con margen negativo;
- [x] sensibilidad de precio y costo.

## Reconciliaciones implementadas

- [x] masa por ruta;
- [x] cobre contenido;
- [x] cobre recuperado no supera contenido;
- [x] metal pagable no supera recuperado;
- [x] ingreso bruto;
- [x] costos;
- [x] margen = ingreso - costos;
- [x] valor realizado + pendiente;
- [x] valor descontado no supera nominal con tasa positiva;
- [x] identidad de ruta preservada;
- [x] destinos desconocidos reportados;
- [x] ausencia de balances negativos imposibles.

## Interfaz

- [x] panel `ECONOMÍA POR RUTA` creado;
- [x] F1–F6;
- [x] incremental / acumulado;
- [x] alturas 5/10/15/20 m;
- [x] base de costo;
- [x] precio editable;
- [x] recuperación editable por ruta;
- [x] pagabilidad editable por ruta;
- [x] costos y cargos editables;
- [x] regalía editable;
- [x] tasa de descuento editable;
- [x] sensibilidad visible;
- [x] confirmación temporal `CU = %`;
- [x] tarjetas Mill y Leach;
- [x] tabla por periodo;
- [x] reconciliaciones visibles;
- [x] guardas metodológicas visibles;
- [ ] sin superposición con dock inferior;
- [ ] responsive validado.

## Validación técnica

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
```

- [ ] cadena heredada en PASS;
- [ ] auditoría 8.10 en PASS;
- [ ] validador 8.10 en PASS;
- [ ] 48 combinaciones reales;
- [ ] F6 conserva 34,845 bloques y 54.892664 Mt;
- [ ] Mill validado;
- [ ] Leach validado;
- [ ] recuperación 0% y 100%;
- [ ] pagabilidad 0% y 100%;
- [ ] precio 0;
- [ ] costo alto con margen negativo;
- [ ] tasa de descuento 0%;
- [ ] tasa de descuento positiva;
- [ ] cierre realizado + pendiente;
- [ ] TypeScript y build en PASS.

## Validación visual

```bash
npm run dev
```

- [ ] panel abre, cierra y recarga;
- [ ] controles recalculan sin congelar la app;
- [ ] Mill y Leach se distinguen claramente;
- [ ] valor realizado y pendiente visibles;
- [ ] ingresos, costos y margen legibles;
- [ ] sensibilidad visible;
- [ ] reconciliaciones en PASS;
- [ ] guardas visibles;
- [ ] dock inferior limpio;
- [ ] responsive aprobado.

## Cierre

- [ ] resultados técnicos documentados;
- [ ] evidencia visual revisada;
- [ ] PR marcado como Ready for review;
- [ ] no fusionar todavía a `main` mientras continúe la cadena de PR apilados.
