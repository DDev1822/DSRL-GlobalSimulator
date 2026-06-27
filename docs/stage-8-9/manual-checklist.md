# Checklist — Etapa 8.9

## Contrato

- [x] `ProcessRouteDefinition` tipado;
- [x] `RouteRecoveryInputs` tipado;
- [x] `RouteMaterialLot` tipado;
- [x] `RoutePeriodResult` tipado;
- [x] `RouteRecoveryReport` tipado;
- [x] rutas `Mill`, `Leach`, `Dump` y desconocida diferenciadas;
- [x] origen `NPVPDEST` preservado;
- [x] supuestos DSRL separados de datos observados.

## Motor

- [x] `createRouteRecoveryInputs`;
- [x] `validateRouteRecoveryInputs`;
- [x] `normalizeSourceDestination`;
- [x] `buildBlockBenchRouteRecovery`;
- [x] capacidad por ruta respetada en contrato;
- [x] recuperación por ruta aplicada;
- [x] stockpile conserva identidad de ruta;
- [x] reclaim conserva identidad de ruta;
- [x] Mill/Leach no se reclasifican implícitamente;
- [x] Dump no entra a proceso;
- [x] destino desconocido queda bloqueado y reportado;
- [x] precedencia vertical preservada;
- [x] ausencia de balances negativos incluida en reconciliación.

## Resultados

- [x] alimentación directa por ruta;
- [x] reclaim por ruta;
- [x] feed total por ruta;
- [x] ley de feed por ruta;
- [x] cobre contenido por ruta;
- [x] cobre recuperado por ruta;
- [x] recuperación efectiva ponderada;
- [x] stockpile final por ruta;
- [x] utilización de capacidad por ruta;
- [x] margen realizado por ruta;
- [x] margen operativo descontado total;
- [x] cuello de botella por ruta.

## Interfaz

- [x] panel `RECUPERACIÓN & RUTAS` creado;
- [x] controles F1–F6, alcance, altura y base de costo;
- [x] capacidades, utilización, recuperación, costos, stockpile y reclaim editables;
- [x] guardia temporal `CU = %`;
- [x] tarjetas Mill y Leach;
- [x] balance por periodo;
- [x] reconciliaciones visibles;
- [x] módulo montado en `src/main.tsx`;
- [ ] revisión visual local.

## Reconciliaciones

- [x] masa mina cierra en contrato;
- [x] proceso + no proceso cierra en contrato;
- [x] alimentación + stockpile + pendiente cierra por ruta;
- [x] cobre contenido cierra por ruta;
- [x] cobre recuperado no supera cobre alimentado;
- [x] valor cierra por ruta;
- [x] capacidad Mill controlada;
- [x] capacidad Leach controlada;
- [x] reclaim por ruta controlado;
- [x] identidad de ruta preservada;
- [x] destinos desconocidos reportados.

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
- [ ] validador sintético 8.9 en PASS;
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
