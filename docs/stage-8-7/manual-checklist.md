# Checklist — Etapa 8.7

## Técnica

```bash
npm run verify:stage8-6
node scripts/audit-stage-8-7.mjs
node scripts/validate-block-bench-preliminary-sequence.mjs
npm run typecheck
npm run build
```

Confirmar:

- [ ] auditoría 8.7 en PASS;
- [ ] validación de secuencia en PASS;
- [ ] 48 combinaciones reales;
- [ ] F6 conserva 34,845 bloques y 54.892664 Mt;
- [ ] cierres de masa, proceso y valor;
- [ ] capacidades mina/planta respetadas;
- [ ] precedencia vertical respetada;
- [ ] horizonte corto y cuellos mina/planta detectados;
- [ ] banco parcial probado;
- [ ] TypeScript y build en PASS.

## Visual

```bash
npm run dev
```

En `SECUENCIA PRELIMINAR` confirmar:

- [ ] F1–F6, alcance y altura funcionan;
- [ ] periodos, capacidades y utilizaciones son editables;
- [ ] CU bloqueada inicialmente y activable por sesión;
- [ ] tabla muestra bancos, movimiento, proceso y cuello;
- [ ] margen nominal y descontado visibles;
- [ ] tramos parciales visibles;
- [ ] reconciliaciones en PASS;
- [ ] se declara asignación preliminar, no plan definitivo ni reservas.
