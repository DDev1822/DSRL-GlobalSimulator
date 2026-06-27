# Checklist — Etapa 8.12

## Implementación

- [x] contrato tipado de condición de vía;
- [x] condición objetivo y actual separadas;
- [x] presets Buena, Regular, Mala y Crítica;
- [x] RR actual y objetivo editables;
- [x] factores de velocidad, combustible y costos editables;
- [x] confianza y base del dato explícitas;
- [x] comparación objetivo vs. actual;
- [x] costo adicional y erosión de margen;
- [x] pérdida de capacidad y déficit adicional;
- [x] combustible y costos adicionales por componente;
- [x] potencial recuperable y ranking por ruta;
- [x] panel `VÍAS & EXPOSICIÓN`;
- [x] reconciliaciones visibles;
- [x] guardas metodológicas visibles.

## Validación técnica

```bash
npm run audit:stage8-11
npm run validate:haulage-logistics
npm run audit:stage8-12
npm run validate:road-condition
npm run typecheck
npm run build
```

- [ ] cadena 8.11 en PASS;
- [ ] auditoría 8.12 en PASS;
- [ ] validador 8.12 en PASS;
- [ ] condición objetivo produce exposición cero;
- [ ] condición crítica aumenta ciclo, combustible y costo;
- [ ] condición crítica reduce capacidad;
- [ ] masa y destino permanecen iguales;
- [ ] F6 conserva 34,845 bloques y 54.892664 Mt;
- [ ] 48 combinaciones reales en PASS;
- [ ] TypeScript en PASS;
- [ ] build en PASS.

## Validación visual

- [ ] panel abre, cierra y recarga;
- [ ] controles recalculan;
- [ ] presets actualizan los factores;
- [ ] ranking responde a la exposición;
- [ ] costo, margen y capacidad son legibles;
- [ ] sin superposición con el dock inferior;
- [ ] responsive aprobado.

## Estado

**IMPLEMENTACIÓN COMPLETA · VALIDACIÓN LOCAL Y VISUAL PENDIENTE**
