# Estado técnico inicial

Fecha de corte: 2026-06-25.

## Fuente migrada

El repositorio parte del simulador desarrollado en Figma Make y conserva dos líneas funcionales:

1. Motor conceptual de ley de corte y evaluación económica.
2. Visor de geometría triangulada para datos provenientes de Datamine.

## Implementado en esta rama

- React + TypeScript + Vite.
- Tailwind CSS.
- Motor conceptual modularizado.
- Gráfico de sensibilidad.
- Pit conceptual demostrativo.
- Parser CSV sin dependencias externas.
- Validación PID punto-triángulo.
- Visor Three.js con órbita, zoom, wireframe y color por elevación.
- Estados explícitos de carga y error.
- Scroll vertical habilitado para evitar recortes del dashboard.
- Contrato documentado para los CSV reales.
- Script local de validación de geometría.

## Datos reales disponibles fuera del repositorio

- `Design Pit_pt.csv`: 7,995 puntos.
- `Design Pit_tr.csv`: 15,683 triángulos.
- Referencias PID inválidas: 0.
- Bounds aproximados:
  - X: 762885.03 a 763707.11.
  - Y: 9251792.78 a 9252615.27.
  - Z: 3620.00 a 3750.13.

Los archivos deben copiarse a `public/data/` antes de ejecutar el modo Datamine.

## Limitaciones conscientes

- Solo existe una geometría disponible; todavía no hay fases 1 a 5.
- No existe topografía separada.
- No existen strings separados.
- No existen datos económicos por fase.
- El pit conceptual no sustituye optimización minera especializada.
- La interfaz actual es una base modular; el prototipo visual completo de Figma Make se integrará de manera controlada.

## Siguiente hito

Clonar el repositorio localmente, copiar los dos CSV a `public/data/`, ejecutar la validación y cerrar la conexión bidireccional con Figma Make.
