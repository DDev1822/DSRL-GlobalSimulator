# Checklist — Etapa 8.11

## Contrato

- [x] `HaulageDestinationId` tipado;
- [x] `PreliminaryHaulageRouteDefinition` tipado;
- [x] `PreliminaryHaulageInputs` tipado;
- [x] `PreliminaryHaulagePeriodResult` tipado;
- [x] `PreliminaryHaulageRouteTotals` tipado;
- [x] `PreliminaryHaulageLogisticsReport` tipado;
- [x] Mill, Leach, Dump, stockpiles y reclaim diferenciados;
- [x] `NPVPDEST` preservado;
- [x] supuestos DSRL separados de datos observados;
- [x] destinos desconocidos bloqueados y reportados.

## Motor

- [x] `createPreliminaryHaulageInputs`;
- [x] `validatePreliminaryHaulageInputs`;
- [x] `buildPreliminaryHaulageLogistics`;
- [x] `buildHaulageSensitivity`;
- [x] tiempo cargado;
- [x] tiempo retorno vacío;
- [x] tiempo de ciclo;
- [x] camiones efectivos;
- [x] viajes requeridos;
- [x] capacidad por periodo;
- [x] déficit y holgura;
- [x] horas-camión;
- [x] combustible;
- [x] mantenimiento;
- [x] neumáticos;
- [x] otros costos;
- [x] costo total;
- [x] costo unitario US$/t;
- [x] tonelada-kilómetro;
- [x] margen antes y después del acarreo;
- [x] identidad de destino preservada;
- [x] sin reasignación automática de masa.

## Resultados

- [x] masa transportada por ruta;
- [x] distancia cargado/vacío;
- [x] pendiente y resistencia declaradas;
- [x] tiempo de ciclo;
- [x] capacidad disponible;
- [x] utilización de capacidad;
- [x] déficit o holgura;
- [x] viajes;
- [x] horas-camión;
- [x] litros de combustible;
- [x] costo de combustible;
- [x] mantenimiento;
- [x] neumáticos;
- [x] otros costos;
- [x] costo logístico total;
- [x] costo unitario US$/t;
- [x] t-km;
- [x] margen previo;
- [x] margen posterior al acarreo;
- [x] cuello de botella logístico;
- [x] sensibilidad logística.

## Reconciliaciones implementadas

- [x] masa asignada cierra;
- [x] viajes × payload reconcilian con masa;
- [x] déficit reportado cuando demanda supera capacidad;
- [x] horas-camión no negativas;
- [x] combustible no negativo;
- [x] costos por componente cierran;
- [x] costo unitario × toneladas cierra;
- [x] margen posterior = margen previo - costo logístico;
- [x] identidad de destino preservada;
- [x] destinos desconocidos reportados;
- [x] ausencia de balances imposibles.

## Interfaz

- [x] panel `ACARREO & LOGÍSTICA` creado;
- [x] F1–F6;
- [x] incremental / acumulado;
- [x] alturas 5/10/15/20 m;
- [x] base de costo;
- [x] distancias editables;
- [x] velocidades editables;
- [x] pendiente y RR editables;
- [x] payload editable;
- [x] flota editable;
- [x] disponibilidad y utilización editables;
- [x] tiempos fijos editables;
- [x] combustible y costos horarios editables;
- [x] confirmación temporal `CU = %`;
- [x] tarjetas por destino;
- [x] tabla por periodo;
- [x] sensibilidad visible;
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
node scripts/audit-stage-8-11.mjs
node scripts/validate-preliminary-haulage-logistics.mjs
npm run typecheck
npm run build
```

- [ ] cadena heredada en PASS;
- [ ] auditoría 8.11 en PASS;
- [ ] validador 8.11 en PASS;
- [ ] 48 combinaciones reales;
- [ ] F6 conserva 34,845 bloques y 54.892664 Mt;
- [ ] Mill validado;
- [ ] Leach validado;
- [ ] Dump validado;
- [ ] stockpiles Mill y Leach validados;
- [ ] reclaim Mill y Leach validado;
- [ ] destino desconocido reportado;
- [ ] distancia 0;
- [ ] velocidad inválida rechazada;
- [ ] payload inválido rechazado;
- [ ] disponibilidad 0% y 100%;
- [ ] utilización 0% y 100%;
- [ ] combustible 0;
- [ ] costo horario 0;
- [ ] déficit de capacidad;
- [ ] holgura de capacidad;
- [ ] cierre económico antes/después;
- [ ] TypeScript y build en PASS.

## Validación visual

```bash
npm run dev
```

- [ ] panel abre, cierra y recarga;
- [ ] controles recalculan sin congelar la app;
- [ ] rutas se distinguen claramente;
- [ ] capacidad, déficit y holgura visibles;
- [ ] combustible y costos legibles;
- [ ] margen antes/después visible;
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

## Estado

**IMPLEMENTACIÓN COMPLETA · VALIDACIÓN LOCAL PENDIENTE**
