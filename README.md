# DSRL Global Simulator

Repositorio maestro para el desarrollo auditable del simulador geoeconómico global DSRL.

## Estado actual

La rama `fix/original-figma-datamine-viewer` contiene una restauración funcional completa en código fuente directo:

- curva Ton-Grade-VAN interactiva con seguimiento del cursor;
- motor económico Lane auditable;
- visor Three.js conectado a geometría Datamine real;
- secuencia visual F1–F6 sobre el pit final disponible;
- reproducción, avance, retroceso y control de velocidad;
- capas de componente, fase, elevación, VAN, reservas, ley y strip ratio;
- lectura de triángulo y coordenadas en el panel lateral, sin cubrir la geometría;
- paneles laterales para parámetros, KPIs, costos y estado del sistema;
- modelo conceptual y shells sintéticos fuera del flujo activo.

> La secuencia F1–F6 y las capas económicas espaciales son lecturas analíticas sobre la geometría final disponible. No representan seis superficies Datamine independientes ni sustituyen un modelo económico por bloque.

## Validación

```bash
npm install
npm run validate:data
npm run typecheck
npm run build
npm run dev
```

## Flujo de trabajo

- `main`: versión estable.
- ramas `feat/*`, `fix/*` y `docs/*`: desarrollo controlado.
- Pull Requests: revisión antes de integrar cambios.
- Figma Make: interfaz de prototipado conectada al repositorio.
- Repositorio local: ejecución, pruebas y validación técnica.

> DSRL Global Simulator es una herramienta de análisis y simulación. No sustituye el diseño ni la optimización minera especializada.
