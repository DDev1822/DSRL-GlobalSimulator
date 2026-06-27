# Checklist de cierre — Etapa 8.6

## Validación técnica

```bash
npm run verify:stage8-6
```

Debe confirmar:

- [ ] auditorías anteriores en PASS;
- [ ] `STAGE 8.6 AUDIT SUMMARY`: PASS;
- [ ] `BLOCK BENCH ECONOMIC VALUE VALIDATION`: PASS;
- [ ] 48 combinaciones reales evaluadas;
- [ ] F6 conserva 34,845 bloques y 54.892664 Mt;
- [ ] modo bloqueado sin CU confirmada;
- [ ] cierre físico contra 8.4;
- [ ] cierre económico contra 8.5;
- [ ] margen acumulado desde techo monótono;
- [ ] costo completo eleva el cut-off;
- [ ] mayor precio reduce el cut-off y aumenta el margen;
- [ ] mayores costos elevan el cut-off y reducen el margen;
- [ ] caso sintético identifica alto valor, marginal y negativo;
- [ ] TypeScript y build en PASS.

## Validación visual

```bash
npm run dev
```

Confirmar en `VALOR POR BANCO`:

- [ ] panel abre, cierra y recarga;
- [ ] caché del catálogo muestra estado, cargas y reutilizaciones;
- [ ] F1–F6 cambian resultados;
- [ ] Incremental/Acumulado cambian resultados;
- [ ] 5/10/15/20 m cambian la agrupación;
- [ ] Solo proceso/Costo completo cambian el cut-off;
- [ ] valor DSRL aparece bloqueado inicialmente;
- [ ] `CONFIRMAR CU = %` activa margen y USD/t;
- [ ] banco seleccionado muestra valor fuente y DSRL;
- [ ] mapa vertical está ordenado desde techo hacia fondo;
- [ ] bandas alto valor, marginal y negativo son visibles;
- [ ] Top 5 y bancos en riesgo son visibles;
- [ ] todas las reconciliaciones aparecen en PASS;
- [ ] se declara screening, no secuencia minera ni reservas.
