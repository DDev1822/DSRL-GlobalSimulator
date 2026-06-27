# Checklist — Etapa 8.8

## Técnica

```bash
npm run verify:stage8-6
node scripts/audit-stage-8-7.mjs
node scripts/validate-block-bench-preliminary-sequence.mjs
node scripts/audit-stage-8-8.mjs
node scripts/validate-block-bench-stockpile-blending.mjs
npm run typecheck
npm run build
```

Confirmar:

- [ ] cadena heredada hasta 8.6 en PASS;
- [ ] auditoría 8.7 en PASS;
- [ ] validación 8.7 en PASS;
- [ ] auditoría 8.8 en PASS;
- [ ] validación de stockpile y blending en PASS;
- [ ] 48 combinaciones reales;
- [ ] F6 conserva 34,845 bloques y 54.892664 Mt;
- [ ] balances de masa, cobre y valor;
- [ ] capacidades mina, planta, stockpile y reclaim respetadas;
- [ ] precedencia vertical respetada;
- [ ] mezcla sintética 0.20% + 0.40% = 0.30% Cu;
- [ ] TypeScript y build en PASS.

## Visual

```bash
npm run dev
```

### Layout inferior

Confirmado por el usuario después de actualizar la rama `feat/stage-8-8-stockpile-blending`:

- [x] los botones inferiores ya no se superponen;
- [x] el dock reserva espacio y no cubre los controles de fases;
- [ ] los paneles abiertos permanecen por encima del dock en todos los anchos;
- [ ] responsive validado en escritorio, ancho medio y móvil.

### STOCKPILE & BLENDING

Confirmar:

- [ ] panel abre, cierra y recarga;
- [ ] F1–F6, alcance, altura y base de costo funcionan;
- [ ] periodos y capacidades son editables;
- [ ] ley objetivo admite AUTO y valor manual;
- [ ] tolerancia de blending es editable;
- [ ] CU está bloqueada inicialmente;
- [ ] `CONFIRMAR CU = %` activa resultados;
- [ ] tabla muestra directo, reclaim y feed de planta;
- [ ] ley de feed y desviación son visibles;
- [ ] stockpile final, ley y cobre contenido son visibles;
- [ ] margen realizado y descontado son visibles;
- [ ] reconciliaciones aparecen en PASS;
- [ ] se declara simulación preliminar, no VAN, no plan minero ni reservas.

## Cierre de etapa

- [ ] resultados técnicos documentados en el PR 21;
- [ ] evidencia visual adjunta o descrita;
- [ ] PR 21 marcado como Ready for review;
- [ ] no fusionar todavía a `main` mientras continúe la cadena de PR apilados.
