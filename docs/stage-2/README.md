# Etapa 2 — Economic Control Deck

## Objetivo

Conectar una interfaz compacta y desplegable al motor económico parametrizable de la Etapa 1, sin reducir permanentemente el espacio del gráfico ni del visor Datamine.

## Diseño adoptado

El Control Deck funciona como un drawer inferior:

- cerrado: no ocupa espacio ni cubre el pit;
- abierto: se superpone temporalmente para editar escenarios;
- se abre desde el header o desde el rail derecho;
- se cierra con el botón de flecha del drawer.

## Parámetros principales editables

1. Precio del metal — US$/t metal.
2. Recurso máximo — Mt de mineral.
3. WACC — porcentaje.
4. Producción anual — Mt/año.
5. Strip ratio — t estéril/t mineral.
6. Costo de mina — US$/t total movida.
7. Costo de planta — US$/t de mineral procesado.
8. Ley base — porcentaje de metal.

Las recuperaciones minera y metalúrgica continúan disponibles en el rail izquierdo.

## Comportamiento

Cada cambio actualiza inmediatamente:

- ley de corte de equilibrio;
- ley de corte óptima;
- curva Ton–Grade–VAN;
- VAN y TIR;
- tonelaje y ley media;
- vida de mina;
- capas económicas vinculadas al pit;
- resumen económico del rail derecho.

La ley de corte no tiene slider ni entrada directa: permanece como resultado del motor.

## Persistencia

`SAVE SCENARIO` guarda los parámetros en `localStorage` con una clave versionada:

```text
dsrl-global-simulator:economic-scenario:v1
```

Al recargar el navegador:

- se intenta recuperar el escenario guardado;
- se completa cualquier campo faltante con los valores base;
- se valida el escenario;
- si es inválido, se descarta y se usa el escenario base.

`RESET DEFAULT` restaura `DEFAULT_ECONOMIC_INPUTS` y elimina el escenario guardado.

## Curva dinámica

La curva dejó de utilizar límites fijos de:

- 1,500 Mt;
- 1.5 % de ley;
- 1.2 % de cut-off.

Sus escalas ahora se ajustan a:

- recurso máximo y recuperación minera;
- ley base y respuesta de la curva;
- rango máximo de cut-off evaluado;
- VAN máximo del escenario.

## Validación automática

```bash
npm install
npm run verify:stage2
```

La validación ejecuta:

1. datos Datamine;
2. auditoría de línea base;
3. auditoría del motor Stage 1;
4. auditoría del Control Deck Stage 2;
5. sensibilidad económica;
6. TypeScript;
7. build de producción.

## Fuera del alcance

- rediseño de los márgenes izquierdos de curva y visor;
- información por bancos;
- topografía;
- pits F1–F6 reales;
- exportación final del reporte;
- comparación visual entre dos escenarios.
