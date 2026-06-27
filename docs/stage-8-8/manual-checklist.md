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

Confirmado:

- [x] cadena heredada hasta 8.6 en PASS;
- [x] auditoría 8.7 en PASS;
- [x] validación 8.7 en PASS;
- [x] auditoría 8.8 en PASS;
- [x] validación de stockpile y blending en PASS;
- [x] 48 combinaciones reales;
- [x] F6 conserva 34,845 bloques y 54.892664 Mt;
- [x] balances de masa, cobre y valor;
- [x] capacidades mina, planta, stockpile y reclaim respetadas;
- [x] precedencia vertical respetada;
- [x] mezcla sintética 0.20% + 0.40% = 0.30% Cu;
- [x] TypeScript y build en PASS.

## Visual

```bash
npm run dev
```

### Layout inferior

Confirmado por el usuario después de actualizar la rama `feat/stage-8-8-stockpile-blending`:

- [x] los botones inferiores ya no se superponen;
- [x] el dock reserva espacio y no cubre los controles de fases;
- [x] el Economic Control Deck permanece por encima del dock;
- [x] los paneles abiertos permanecen accesibles;
- [x] responsive validado visualmente;
- [x] el pit presenta mayor definición de bancos;
- [x] la topografía resulta visible sin ocultar el pit.

### STOCKPILE & BLENDING

Confirmado:

- [x] panel abre, cierra y recarga;
- [x] F1–F6, alcance, altura y base de costo funcionan;
- [x] periodos y capacidades son editables;
- [x] ley objetivo admite AUTO y valor manual;
- [x] tolerancia de blending es editable;
- [x] CU está bloqueada inicialmente;
- [x] `CONFIRMAR CU = %` activa resultados;
- [x] tabla muestra directo, reclaim y feed de planta;
- [x] ley de feed y desviación son visibles;
- [x] stockpile final, ley y cobre contenido son visibles;
- [x] margen realizado y descontado son visibles;
- [x] reconciliaciones aparecen en PASS;
- [x] se declara simulación preliminar, no VAN, no plan minero ni reservas.

## Cierre de etapa

- [x] resultados técnicos documentados en el PR 21;
- [x] evidencia visual revisada por el usuario;
- [x] PR 21 listo para Ready for review;
- [x] no fusionar todavía a `main` mientras continúe la cadena de PR apilados.

## Resultado

**ETAPA 8.8 — PASS TOTAL**
