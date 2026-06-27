# Checklist de cierre — Etapa 8.4

## Validación técnica

```bash
npm run verify:stage8-4
```

Debe confirmar:

- [ ] auditorías anteriores en PASS;
- [ ] `STAGE 8.4 AUDIT SUMMARY`: PASS;
- [ ] `BLOCK BENCH INVENTORY VALIDATION`: PASS;
- [ ] 48 combinaciones reales evaluadas;
- [ ] F6 acumulado conserva 34,845 bloques;
- [ ] F6 acumulado conserva 54.892664 Mt;
- [ ] F3 acumulado conserva 18,981 bloques;
- [ ] bancos ordenados desde techo hacia fondo;
- [ ] bloques, volumen y masa cierran contra 8.3;
- [ ] proceso + desmonte cierra;
- [ ] Mill + Leach cierra;
- [ ] acumulado vertical cierra;
- [ ] intervalos sin solape;
- [ ] caso sintético de límites aprobado;
- [ ] TypeScript y build en PASS.

## Validación visual

```bash
npm run dev
```

Confirmar en `BANCOS REALES`:

- [ ] el panel abre, cierra y recarga;
- [ ] aparecen F1–F6;
- [ ] Incremental y Acumulado cambian resultados;
- [ ] 5, 10, 15 y 20 m cambian la agrupación;
- [ ] el banco seleccionado muestra intervalo, masa, proceso y desmonte;
- [ ] la secuencia está ordenada desde techo hacia fondo;
- [ ] el acumulado desde techo crece hacia el fondo;
- [ ] AU/CU tienen asterisco de unidad no confirmada;
- [ ] todas las reconciliaciones están en PASS;
- [ ] se declara asignación por `ZC` y bloque completo;
- [ ] se usa `inventario dentro del diseño`, no reservas.
