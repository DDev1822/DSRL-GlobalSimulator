# Checklist — Etapa 8.10

## Contrato

- [ ] `RouteEconomicDefinition` tipado;
- [ ] `RouteEconomicInputs` tipado;
- [ ] `RouteEconomicPeriod` tipado;
- [ ] `RouteEconomicTotals` tipado;
- [ ] `IntegratedRouteEconomicReport` tipado;
- [ ] rutas Mill y Leach preservadas;
- [ ] `_DUMP_` excluido de proceso;
- [ ] destinos desconocidos bloqueados y reportados;
- [ ] supuestos DSRL separados de datos observados.

## Motor

- [ ] `createIntegratedRouteEconomicInputs`;
- [ ] `validateIntegratedRouteEconomicInputs`;
- [ ] `buildIntegratedRouteEconomics`;
- [ ] `buildRouteEconomicSensitivity`;
- [ ] metal contenido calculado;
- [ ] metal recuperado calculado;
- [ ] metal pagable calculado;
- [ ] ingreso bruto calculado;
- [ ] costos de proceso por ruta;
- [ ] costo de mina aplicable;
- [ ] tratamiento y refinación;
- [ ] comercialización;
- [ ] regalías;
- [ ] margen operativo por ruta;
- [ ] valor operativo descontado;
- [ ] valor pendiente en stockpile;
- [ ] valor in situ pendiente;
- [ ] identidad de ruta preservada;
- [ ] sin reclasificación automática Mill/Leach.

## Resultados

- [ ] masa fuente por ruta;
- [ ] masa procesada por ruta;
- [ ] ley de feed por ruta;
- [ ] metal contenido;
- [ ] metal recuperado;
- [ ] metal pagable;
- [ ] ingreso bruto;
- [ ] costos por componente;
- [ ] margen operativo;
- [ ] valor operativo descontado;
- [ ] margen unitario US$/t;
- [ ] margen unitario US$/lb recuperada;
- [ ] valor pendiente en stockpile;
- [ ] valor pendiente in situ;
- [ ] participación económica por ruta;
- [ ] periodos con margen negativo;
- [ ] sensibilidad de precio, recuperación y costo.

## Reconciliaciones

- [ ] masa por ruta cierra;
- [ ] cobre contenido cierra;
- [ ] cobre recuperado no supera contenido;
- [ ] metal pagable no supera recuperado;
- [ ] ingreso bruto cierra;
- [ ] costos cierran;
- [ ] margen = ingreso - costos;
- [ ] valor realizado + pendiente cierra;
- [ ] valor descontado no supera nominal con tasa positiva;
- [ ] identidad de ruta preservada;
- [ ] destinos desconocidos reportados;
- [ ] ausencia de balances negativos imposibles.

## Interfaz

- [ ] panel `ECONOMÍA POR RUTA` creado;
- [ ] F1–F6;
- [ ] incremental / acumulado;
- [ ] alturas 5/10/15/20 m;
- [ ] base de costo;
- [ ] precio editable;
- [ ] recuperación editable por ruta;
- [ ] pagabilidad editable por ruta;
- [ ] costos y cargos editables;
- [ ] regalía editable;
- [ ] tasa de descuento editable;
- [ ] sensibilidad configurable;
- [ ] confirmación temporal `CU = %`;
- [ ] tarjetas Mill y Leach;
- [ ] tabla por periodo;
- [ ] reconciliaciones visibles;
- [ ] guardas metodológicas visibles;
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
