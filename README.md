# DSRL Global Simulator

Repositorio maestro para el desarrollo auditable del simulador geoeconómico global DSRL.

## Estado inicial

Este repositorio se inicializa a partir del prototipo desarrollado en Figma Make. La primera línea de trabajo preserva el motor conceptual existente y prepara la integración de geometría triangulada proveniente de Datamine.

## Flujo de trabajo

- `main`: versión estable.
- ramas `feat/*`, `fix/*` y `docs/*`: desarrollo controlado.
- Pull Requests: revisión antes de integrar cambios.
- Figma Make: interfaz de prototipado conectada al repositorio.
- Repositorio local: ejecución, pruebas y validación técnica.

## Próximos hitos

1. Importar el simulador conceptual actual.
2. Configurar React + TypeScript + Vite + Tailwind.
3. Integrar el visor Three.js.
4. Conectar la geometría real `Design Pit_pt.csv` y `Design Pit_tr.csv`.
5. Validar puntos, triángulos y límites espaciales.
6. Corregir scroll y responsive sin alterar el motor económico.

> DSRL Global Simulator es una herramienta de análisis y simulación. No sustituye el diseño ni la optimización minera especializada.
