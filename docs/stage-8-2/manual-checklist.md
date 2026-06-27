# Checklist de cierre — Etapa 8.2

## Validación automática

```bash
npm run verify:stage8-2
```

Debe confirmar:

- [ ] auditorías anteriores en PASS;
- [ ] auditoría 8.2 en PASS;
- [ ] validación de ingesta real en PASS;
- [ ] 49,989 bloques maestros tipados;
- [ ] 18,981 bloques de control tipados;
- [ ] 37 campos reconocidos;
- [ ] 0 filas inválidas;
- [ ] 0 claves compuestas duplicadas;
- [ ] volumen, masa y beneficio reconciliados;
- [ ] control exacto F1–F3;
- [ ] TypeScript y build en PASS.

## Validación visual

```bash
npm run dev
```

Confirmar:

- [ ] aparece el botón `MODELO DE BLOQUES`;
- [ ] el panel abre y cierra;
- [ ] el estado general es `APROBADO`;
- [ ] maestro y control muestran sus rutas reales;
- [ ] se muestran filas válidas e inválidas;
- [ ] se muestran las tres reconciliaciones físicas;
- [ ] el control cruzado indica subconjunto exacto;
- [ ] aparecen F1–F9 y F7–F9 como preservados;
- [ ] aparecen `_DUMP_`, `Mill` y `Leach`;
- [ ] el botón recargar funciona;
- [ ] el panel declara que aún no calcula inventarios.
