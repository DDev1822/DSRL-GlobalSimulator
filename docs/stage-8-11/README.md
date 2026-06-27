# Etapa 8.11 — Rutas de acarreo y costo logístico preliminar

## Objetivo

Extender la Etapa 8.10 para conectar cada destino observado del modelo de bloques con una ruta logística preliminar y estimar capacidad de acarreo, tiempo de ciclo, horas-camión, combustible, costo unitario y efecto económico por ruta.

La salida seguirá siendo una evaluación preliminar dentro del diseño. No será despacho, simulación OEM, diseño vial definitivo, plan minero ejecutable ni optimización global de flota.

## Principio de trazabilidad

La etapa mantendrá separados:

1. **dato observado**: `NPVPDEST`, masa, ley, fase, banco y geometría del modelo;
2. **supuesto DSRL**: distancia, pendiente media, resistencia a la rodadura, velocidades, payload, flota, disponibilidad, utilización, tiempos fijos, consumo y costos;
3. **resultado calculado**: tiempo de ciclo, capacidad, horas-camión, litros, costo logístico y margen posterior al acarreo.

Ninguna distancia, pendiente, velocidad o composición de flota se presentará como dato real de operación mientras no provenga de una fuente validada.

## Rutas iniciales

La primera implementación reconocerá:

- `Mill` → planta/concentradora;
- `Leach` → lixiviación;
- `_DUMP_` → botadero;
- `Mill stockpile` → stockpile asociado a Mill;
- `Leach stockpile` → stockpile asociado a Leach;
- destinos desconocidos → bloqueados y reportados.

No se permitirá cambiar automáticamente el destino observado.

## Entradas por ruta

Cada ruta logística deberá declarar:

- identificador y destino fuente;
- distancia cargado y retorno vacío;
- pendiente media cargado;
- resistencia a la rodadura;
- velocidad efectiva cargado y vacío;
- tiempo de carguío;
- tiempo de descarga;
- tiempo de posicionamiento;
- demora fija;
- payload nominal;
- número de camiones;
- disponibilidad;
- utilización;
- horas operativas por periodo;
- consumo de combustible por hora-camión;
- precio de combustible;
- costo de mantenimiento por hora-camión;
- costo de neumáticos por hora-camión;
- otros costos por hora-camión;
- base del supuesto.

## Cálculos preliminares

```text
tiempo_viaje_cargado_min
= distancia_cargado_km / velocidad_cargado_kmh × 60
```

```text
tiempo_retorno_vacio_min
= distancia_vacio_km / velocidad_vacio_kmh × 60
```

```text
tiempo_ciclo_min
= viaje_cargado
+ retorno_vacio
+ carguio
+ descarga
+ posicionamiento
+ demora_fija
```

```text
camiones_efectivos
= camiones × disponibilidad × utilización
```

```text
capacidad_t_periodo
= camiones_efectivos
× horas_operativas
× 60 / tiempo_ciclo_min
× payload_t
```

```text
horas_camion
= viajes_requeridos × tiempo_ciclo_min / 60
```

```text
costo_logistico
= combustible
+ mantenimiento
+ neumáticos
+ otros_costos
```

```text
costo_unitario_USD_t
= costo_logistico_USD / toneladas_transportadas
```

## Integración económica

La Etapa 8.11 heredará la economía de la Etapa 8.10 y reportará:

```text
margen_despues_acarreo
= margen_operativo_8_10 - costo_logistico
```

El margen posterior al acarreo seguirá siendo una referencia operativa y no VAN.

## Resultados por ruta y periodo

- masa transportada;
- distancia cargado y vacío;
- pendiente y resistencia total declarada;
- tiempo de viaje cargado;
- tiempo de retorno vacío;
- tiempo de ciclo;
- viajes requeridos;
- capacidad disponible;
- utilización de capacidad;
- déficit o holgura de capacidad;
- horas-camión;
- litros de combustible;
- costo de combustible;
- mantenimiento;
- neumáticos;
- otros costos;
- costo logístico total;
- costo unitario US$/t;
- tonelada-kilómetro;
- margen antes y después del acarreo;
- cuello de botella logístico.

## Resultados consolidados

- costo logístico total;
- costo logístico por destino;
- costo promedio ponderado US$/t;
- horas-camión totales;
- combustible total;
- rutas con déficit de capacidad;
- participación de combustible, mantenimiento y neumáticos;
- margen total antes y después del acarreo;
- diferencia económica por ruta;
- exposición logística de stockpiles;
- exposición logística de botadero.

## Política de capacidad

La primera versión será determinista:

- la masa conserva su destino observado;
- la ruta calcula capacidad disponible;
- el exceso no se reasigna automáticamente;
- la masa por encima de capacidad se reporta como déficit logístico;
- no se crean camiones adicionales;
- no se optimiza la flota global;
- no se calcula dispatch dinámico.

## Reconciliaciones

La etapa deberá verificar:

- masa de transporte cierra con la masa asignada;
- viajes × payload reconcilian con masa transportada dentro de tolerancia;
- capacidad utilizada no supera capacidad disponible sin reportar déficit;
- horas-camión no negativas;
- combustible no negativo;
- costos por componente cierran;
- costo total = combustible + mantenimiento + neumáticos + otros;
- costo unitario × toneladas cierra contra costo total;
- margen posterior al acarreo = margen previo - costo logístico;
- identidad de destino preservada;
- destinos desconocidos reportados;
- ausencia de balances imposibles.

## Guardas metodológicas

No se modelarán todavía:

- curvas rimpull/retarding OEM;
- aceleración y frenado por tramo;
- geometría vial 3D real;
- colas estocásticas;
- interacción pala-camión;
- Dispatch/FMS;
- tráfico bidireccional;
- cierres de vía;
- clima;
- degradación dinámica de caminos;
- consumo dependiente de TKPH o carga real;
- emisiones;
- mantenimiento de vías;
- optimización global de flota;
- plan minero ejecutable;
- VAN de proyecto.

## Contratos propuestos

```ts
HaulageDestinationId
PreliminaryHaulageRouteDefinition
PreliminaryHaulageInputs
PreliminaryHaulagePeriodResult
PreliminaryHaulageRouteTotals
PreliminaryHaulageLogisticsReport
```

Funciones esperadas:

```ts
createPreliminaryHaulageInputs
validatePreliminaryHaulageInputs
buildPreliminaryHaulageLogistics
buildHaulageSensitivity
```

## Panel propuesto

```text
ACARREO & LOGÍSTICA
```

Controles mínimos:

- F1–F6;
- incremental / acumulado;
- altura de banco;
- base de costo;
- distancias por destino;
- velocidades cargado/vacío;
- payload;
- flota;
- disponibilidad y utilización;
- tiempos fijos;
- combustible y costos horarios;
- tasa de descuento heredada;
- confirmación temporal `CU = %`;
- sensibilidad logística.

## Validación mínima

- auditoría estática;
- validador independiente;
- 48 combinaciones reales;
- F6 conserva 34,845 bloques y 54.892664 Mt;
- ruta Mill;
- ruta Leach;
- ruta Dump;
- stockpiles Mill y Leach;
- destino desconocido reportado;
- distancia 0;
- velocidad inválida rechazada;
- payload inválido rechazado;
- disponibilidad 0% y 100%;
- utilización 0% y 100%;
- combustible 0;
- costo horario 0;
- ruta con déficit de capacidad;
- ruta con holgura;
- cierre económico antes/después del acarreo;
- TypeScript y build en PASS;
- revisión visual del panel.

## Criterio de cierre

La Etapa 8.11 cerrará cuando:

- cada destino conserve trazabilidad;
- tiempo de ciclo, capacidad y costo cierren;
- el costo logístico se integre sin alterar la economía base;
- los supuestos DSRL estén separados de los datos observados;
- las 48 combinaciones reales estén en PASS;
- TypeScript y build estén en PASS;
- la validación visual esté aprobada;
- toda la cadena heredada permanezca en PASS.
