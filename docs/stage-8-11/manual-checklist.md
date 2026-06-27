# Checklist — Etapa 8.11

## Contrato

- [ ] `HaulageDestinationId` tipado;
- [ ] `PreliminaryHaulageRouteDefinition` tipado;
- [ ] `PreliminaryHaulageInputs` tipado;
- [ ] `PreliminaryHaulagePeriodResult` tipado;
- [ ] `PreliminaryHaulageRouteTotals` tipado;
- [ ] `PreliminaryHaulageLogisticsReport` tipado;
- [ ] Mill, Leach, Dump y stockpiles diferenciados;
- [ ] `NPVPDEST` preservado;
- [ ] supuestos DSRL separados de datos observados;
- [ ] destinos desconocidos bloqueados y reportados.

## Motor

- [ ] `createPreliminaryHaulageInputs`;
- [ ] `validatePreliminaryHaulageInputs`;
- [ ] `buildPreliminaryHaulageLogistics`;
- [ ] `buildHaulageSensitivity`;
- [ ] tiempo cargado;
- [ ] tiempo retorno vacío;
- [ ] tiempo de ciclo;
- [ ] camiones efectivos;
- [ ] viajes requeridos;
- [ ] capacidad por periodo;
- [ ] déficit y holgura;
- [ ] horas-camión;
- [ ] combustible;
- [ ] mantenimiento;
- [ ] neumáticos;
- [ ] otros costos;
- [ ] costo total;
- [ ] costo unitario US$/t;
- [ ] tonelada-kilómetro;
- [ ] margen antes y después del acarreo;
- [ ] identidad de destino preservada;
- [ ] sin reasignación automática de masa.

## Resultados

- [ ] masa transportada por ruta;
- [ ] distancia cargado/vacío;
- [ ] pendiente y resistencia declaradas;
- [ ] tiempo de ciclo;
- [ ] capacidad disponible;
- [ ] utilización de capacidad;
- [ ] déficit o holgura;
- [ ] viajes;
- [ ] horas-camión;
- [ ] litros de combustible;
- [ ] costo de combustible;
- [ ] mantenimiento;
- [ ] neumáticos;
- [ ] otros costos;
- [ ] costo logístico total;
- [ ] costo unitario US$/t;
- [ ] t-km;
- [ ] margen previo;
- [ ] margen posterior al acarreo;
- [ ] cuello de botella logístico;
- [ ] sensibilidad logística.

## Reconciliaciones

- [ ] masa asignada cierra;
- [ ] viajes × payload reconcilian con masa;
- [ ] déficit reportado cuando demanda supera capacidad;
- [ ] horas-camión no negativas;
- [ ] combustible no negativo;
- [ ] costos por componente cierran;
- [ ] costo unitario × toneladas cierra;
- [ ] margen posterior = margen previo - costo logístico;
- [ ] identidad de destino preservada;
- [ ] destinos desconocidos reportados;
- [ ] ausencia de balances imposibles.

## Interfaz

- [ ] panel `ACARREO & LOGÍSTICA` creado;
- [ ] F1–F6;
- [ ] incremental / acumulado;
- [ ] alturas 5/10/15/20 m;
- [ ] base de costo;
- [ ] distancias editables;
- [ ] velocidades editables;
- [ ] pendiente y RR editables;
- [ ] payload editable;
- [ ] flota editable;
- [ ] disponibilidad y utilización editables;
- [ ] tiempos fijos editables;
- [ ] combustible y costos horarios editables;
- [ ] confirmación temporal `CU = %`;
- [ ] tarjetas por destino;
- [ ] tabla por periodo;
- [ ] sensibilidad visible;
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
