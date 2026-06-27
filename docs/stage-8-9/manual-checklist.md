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
- [x] revisión visual local.

## Reconciliaciones

- [x] masa mina cierra;
- [x] proceso + no proceso cierra;
- [x] alimentación + stockpile + pendiente cierra por ruta;
- [x] cobre contenido cierra por ruta;
- [x] cobre recuperado no supera cobre alimentado;
- [x] valor cierra por ruta;
- [x] capacidad Mill respetada;
- [x] capacidad Leach respetada;
- [x] reclaim por ruta respetado;
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

- [x] cadena heredada en PASS;
- [x] auditoría 8.9 en PASS;
- [x] validador 8.9 en PASS;
- [x] 48 combinaciones reales;
- [x] F6 conserva 34,845 bloques y 54.892664 Mt;
- [x] caso Mill validado;
- [x] caso Leach validado;
- [x] caso Dump validado;
- [x] destino desconocido rechazado/reportado;
- [x] recuperación 100% validada;
- [x] recuperación 0% validada;
- [x] recuperación Mill > Leach validada;
- [x] TypeScript y build en PASS.

## Validación visual

```bash
npm run dev
```

- [x] panel abre, cierra y recarga;
- [x] F1–F6 funcionan;
- [x] incremental/acumulado funciona;
- [x] alturas 5/10/15/20 m funcionan;
- [x] capacidades por ruta editables;
- [x] recuperaciones por ruta editables;
- [x] rutas y supuestos claramente identificados;
- [x] tabla por periodo legible;
- [x] masa, ley, cobre contenido y cobre recuperado visibles;
- [x] reconciliaciones visibles;
- [x] guardas metodológicas visibles;
- [x] sin superposición con dock inferior;
- [x] responsive validado.

## Cierre

- [x] resultados técnicos documentados;
- [x] evidencia visual revisada;
- [x] PR listo para Ready for review;
- [x] no fusionar todavía a `main` mientras continúe la cadena de PR apilados.

## Resultado

**ETAPA 8.9 — PASS TOTAL**
