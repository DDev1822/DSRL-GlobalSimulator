# Checklist de cierre — Etapa 8.5

## Validación técnica

```bash
npm run verify:stage8-5
```

Debe confirmar:

- [ ] auditorías anteriores en PASS;
- [ ] `STAGE 8.5 AUDIT SUMMARY`: PASS;
- [ ] `BLOCK ECONOMIC CLASSIFICATION VALIDATION`: PASS;
- [ ] 34,845 bloques F1–F6 auditados;
- [ ] 15,144 bloques F7–F9 preservados;
- [ ] F6 conserva 54.892664 Mt;
- [ ] F3 conserva 18,981 bloques;
- [ ] reclasificación bloqueada con CU sin confirmar;
- [ ] confirmación CU = % activa cut-off DSRL;
- [ ] costo completo genera mayor cut-off que solo proceso;
- [ ] mayor precio reduce cut-off;
- [ ] mayores costos elevan cut-off;
- [ ] cierres de masa, beneficio fuente y valor DSRL;
- [ ] caso sintético cubre cuatro estados de reclasificación;
- [ ] TypeScript y build en PASS.

## Validación visual

```bash
npm run dev
```

Confirmar en `ECONOMÍA POR BLOQUE`:

- [ ] panel abre, cierra y recarga;
- [ ] auditoría fuente visible sin confirmar CU;
- [ ] ley de corte permanece bloqueada inicialmente;
- [ ] botón `CONFIRMAR CU = %` activa DSRL;
- [ ] revocar confirmación vuelve a bloquearla;
- [ ] F1–F6 e Incremental/Acumulado cambian resultados;
- [ ] Solo proceso/Costo completo cambian cut-off;
- [ ] proceso y desmonte fuente son visibles;
- [ ] proceso y desmonte DSRL son visibles;
- [ ] upgrade y downgrade son visibles;
- [ ] ejemplos de bloques reclasificados son visibles;
- [ ] reconciliaciones aparecen en PASS;
- [ ] se declara moneda nativa, margen no descontado y no reservas.
