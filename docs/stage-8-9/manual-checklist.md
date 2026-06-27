# Checklist — Etapa 8.9

## Contrato

- [ ] `ProcessRouteDefinition` tipado;
- [ ] `RouteRecoveryInputs` tipado;
- [ ] `RouteMaterialLot` tipado;
- [ ] `RoutePeriodResult` tipado;
- [ ] `RouteRecoveryReport` tipado;
- [ ] rutas `Mill`, `Leach`, `Dump` y desconocida diferenciadas;
- [ ] origen `NPVPDEST` preservado;
- [ ] supuestos DSRL separados de datos observados.

## Motor

- [ ] `createRouteRecoveryInputs`;
- [ ] `validateRouteRecoveryInputs`;
- [ ] `normalizeSourceDestination`;
- [ ] `buildBlockBenchRouteRecovery`;
- [ ] capacidad por ruta respetada;
- [ ] recuperación por ruta aplicada;
- [ ] stockpile conserva identidad de ruta;
- [ ] reclaim conserva identidad de ruta;
- [ ] Mill/Leach no se reclasifican implícitamente;
- [ ] Dump no entra a proceso;
- [ ] destino desconocido queda bloqueado y reportado;
- [ ] precedencia vertical preservada;
- [ ] ausencia de balances negativos.

## Resultados

- [ ] alimentación directa por ruta;
- [ ] reclaim por ruta;
- [ ] feed total por ruta;
- [ ] ley de feed por ruta;
- [ ] cobre contenido por ruta;
- [ ] cobre recuperado por ruta;
- [ ] recuperación efectiva ponderada;
- [ ] stockpile final por ruta;
- [ ] utilización de capacidad por ruta;
- [ ] margen realizado por ruta;
- [ ] margen operativo descontado total;
- [ ] cuello de botella por ruta.

## Reconciliaciones

- [ ] masa mina cierra;
- [ ] proceso + no proceso cierra;
- [ ] alimentación + stockpile + pendiente cierra;
- [ ] cobre contenido cierra;
- [ ] cobre recuperado no supera cobre alimentado;
- [ ] valor cierra contra Etapa 8.8;
- [ ] capacidad Mill respetada;
- [ ] capacidad Leach respetada;
- [ ] reclaim por ruta respetado;
- [ ] identidad de ruta preservada;
- [ ] destinos desconocidos reportados.

## Validación técnica

```bash
npm run verify:stage8-6
node scripts/audit-stage-8-7.mjs
node scripts/validate-block-bench-preliminary-sequence.mjs
node scripts/audit-stage-8-8.mjs
node scripts/validate-block-bench-stockpile-blending.mjs
node scripts/audit-stage-8-9.mjs
node scripts/validate-block-bench-route-recovery.mjs
npm run typecheck
npm run build
```

- [ ] cadena heredada en PASS;
- [ ] auditoría 8.9 en PASS;
- [ ] validador 8.9 en PASS;
- [ ] 48 combinaciones reales;
- [ ] F6 conserva 34,845 bloques y 54.892664 Mt;
- [ ] caso Mill validado;
- [ ] caso Leach validado;
- [ ] caso Dump validado;
- [ ] destino desconocido rechazado/reportado;
- [ ] recuperación 100% validada;
- [ ] recuperación 0% validada;
- [ ] recuperación Mill > Leach validada;
- [ ] TypeScript y build en PASS.

## Validación visual

```bash
npm run dev
```

- [ ] panel abre, cierra y recarga;
- [ ] F1–F6 funcionan;
- [ ] incremental/acumulado funciona;
- [ ] alturas 5/10/15/20 m funcionan;
- [ ] capacidades por ruta editables;
- [ ] recuperaciones por ruta editables;
- [ ] rutas y supuestos claramente identificados;
- [ ] tabla por periodo legible;
- [ ] masa, ley, cobre contenido y cobre recuperado visibles;
- [ ] reconciliaciones visibles;
- [ ] guardas metodológicas visibles;
- [ ] sin superposición con dock inferior;
- [ ] responsive validado.

## Cierre

- [ ] resultados técnicos documentados;
- [ ] evidencia visual revisada;
- [ ] PR marcado como Ready for review;
- [ ] no fusionar todavía a `main` mientras continúe la cadena de PR apilados.
