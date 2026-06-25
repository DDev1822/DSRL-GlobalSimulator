# Etapa 0 — Congelamiento y auditoría de línea base

## Propósito

Esta etapa congela el estado funcional actual del simulador antes de incorporar el Control Deck parametrizable, bancos, topografía y pits Datamine adicionales.

No modifica cálculos, layout, interacción ni geometría. Solo añade trazabilidad y verificaciones reproducibles.

## Línea base congelada

- Repositorio: `DDev1822/DSRL-GlobalSimulator`
- Rama funcional de origen: `fix/original-figma-datamine-viewer`
- Commit de origen: `d754b885a99699b0a047d9c5ab4a2059c899355d`
- Rama de auditoría: `chore/stage-0-baseline-audit`
- PR funcional relacionada: `#3`

## Arquitectura activa

- `src/App.tsx`: composición general del dashboard.
- `src/engine/economicModel.ts`: motor económico Lane.
- `src/components/EconomicCurve.tsx`: curva interactiva Ton–Grade–VAN.
- `src/components/PitWorkspace.tsx`: controles de evolución, capas y lectura lateral.
- `src/components/DataminePhaseViewer.tsx`: visor Three.js.
- `src/utils/datamineParser.ts`: lectura y validación de CSV Datamine.

## Funciones que no pueden perderse

1. Punto y línea móvil en la curva al pasar el mouse.
2. Marcadores móviles de tonelaje, ley y VAN.
3. Lectura de cut-off, tonelaje, ley, VAN, TIR y LOM.
4. Zoom y órbita del visor Datamine.
5. Wireframe.
6. Barra de evolución F1–F6.
7. Play, pausa, reinicio, anterior, siguiente y velocidad.
8. Capas de componente, fase, elevación, VAN acumulado, VAN incremental, reservas, ley y strip ratio.
9. Lectura del cursor en la columna lateral, sin cubrir el pit.
10. Pantalla completa.

## Funciones expresamente fuera de la línea base

- Modelo conceptual.
- Shells sintéticos.
- Botón Conceptual/Datamine.
- Dependencia de `src/generated` o de restauradores comprimidos.

## Datos geométricos esperados

- Puntos: `7,995`.
- Triángulos válidos: `15,683`.
- Triángulos con PID inexistente: `0`.
- Z mínima: `3620.00 m`.
- Z máxima: `3750.13247037 m`.

## Validación automática

```bash
npm install
npm run verify:baseline
```

`verify:baseline` ejecuta en orden:

1. validación de CSV;
2. auditoría estructural y funcional;
3. TypeScript;
4. build de producción.

## Evidencia visual requerida para cerrar la etapa

Guardar capturas locales en `docs/stage-0/evidence/` con los siguientes nombres:

- `01-dashboard-fullscreen.png`
- `02-curve-hover.png`
- `03-pit-phase-f1.png`
- `04-pit-phase-f6.png`
- `05-economic-layer.png`
- `06-wireframe.png`

Las capturas no deben subirse hasta que la validación automática termine sin errores y la revisión visual sea aprobada.

## Limitaciones documentadas

- Actualmente existe una sola geometría final de pit.
- F1–F6 es una evolución visual sobre esa geometría final.
- Las capas económicas espaciales actuales son proxies analíticos, no economía por bloque.
- La topografía y los pits faltantes se incorporarán en etapas posteriores.
