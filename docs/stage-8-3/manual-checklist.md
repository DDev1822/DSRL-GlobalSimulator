# Checklist de cierre — Etapa 8.3

## Validación automática

```bash
npm run verify:stage8-3
```

Debe confirmar:

- [ ] auditorías anteriores en PASS;
- [ ] auditoría 8.3 en PASS;
- [ ] validación de inventario real en PASS;
- [ ] 34,845 bloques activos F1–F6;
- [ ] 15,144 bloques F7–F9 preservados;
- [ ] 54.892664 Mt totales;
- [ ] 39.106397 Mt de proceso;
- [ ] 15.786267 Mt de desmonte;
- [ ] strip ratio 0.403675;
- [ ] acumulado F3 = 18,981 bloques;
- [ ] reconciliaciones de bloques, volumen y masa en PASS;
- [ ] proceso + desmonte en PASS;
- [ ] Mill + Leach en PASS;
- [ ] TypeScript y build en PASS.

## Validación visual

```bash
npm run dev
```

Confirmar:

- [ ] aparece el botón `INVENTARIO REAL`;
- [ ] el panel abre y cierra;
- [ ] el resumen F1–F6 muestra masa total, proceso, desmonte y strip ratio;
- [ ] los botones F1–F6 cambian la fase seleccionada;
- [ ] `INCREMENTAL` y `ACUMULADO` cambian los resultados;
- [ ] la tabla secuencial muestra las seis fases;
- [ ] aparecen los gráficos de masa incremental y acumulada;
- [ ] todas las reconciliaciones indican PASS;
- [ ] F7–F9 figuran como preservados;
- [ ] AU y CU se muestran con advertencia de unidad no confirmada;
- [ ] el panel declara `inventario dentro del diseño` y no reservas.
