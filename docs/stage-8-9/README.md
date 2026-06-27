# Etapa 8.9 — Recuperación metalúrgica y rutas de proceso diferenciadas

## Objetivo

Extender la simulación preliminar de stockpile y blending de la Etapa 8.8 para distinguir rutas de proceso y aplicar recuperaciones metalúrgicas específicas por ruta, conservando trazabilidad de masa, ley, cobre contenido, metal recuperado y valor.

La salida seguirá siendo una simulación preliminar dentro del diseño. No será un plan minero ejecutable, una optimización global de planta ni una declaración de reservas.

## Principio de trazabilidad

La Etapa 8.9 mantendrá separados:

1. **dato observado de origen**: destino registrado en `NPVPDEST`;
2. **supuesto DSRL**: recuperación, capacidad y reglas operacionales configuradas por ruta;
3. **resultado calculado**: masa alimentada, ley, cobre contenido, cobre recuperado y margen por ruta.

Ningún supuesto DSRL deberá presentarse como dato confirmado del modelo de bloques.

## Rutas iniciales

El contrato inicial reconocerá:

- `Mill` → concentración / planta convencional;
- `Leach` → lixiviación;
- `Dump` → material no procesado en esta etapa;
- destinos desconocidos → bloqueados y reportados, nunca forzados.

La nomenclatura de origen se conservará para auditoría. Las rutas normalizadas se usarán únicamente en el motor DSRL.

## Entradas por ruta

Cada ruta de proceso deberá declarar como mínimo:

- identificador y nombre;
- destino de origen asociado;
- capacidad máxima por periodo;
- utilización de capacidad;
- recuperación metalúrgica;
- disponibilidad de la ruta;
- aceptación o rechazo de alimentación desde stockpile;
- prioridad de alimentación;
- condición de unidad confirmada para `CU = %`.

Valores iniciales propuestos para validación controlada:

| Ruta | Recuperación inicial | Capacidad inicial | Naturaleza |
|---|---:|---:|---|
| Mill | escenario económico vigente | configurable | supuesto DSRL |
| Leach | configurable, inferior a Mill | configurable | supuesto DSRL |

Los valores serán editables y deberán identificarse visualmente como supuestos, no como datos de operación confirmados.

## Flujo de material

Por periodo, el motor deberá:

1. respetar precedencia vertical de techo a fondo;
2. separar material de proceso y no proceso;
3. preservar el destino observado del bloque o lote;
4. asignar alimentación directa por ruta dentro de sus capacidades;
5. enviar excedentes elegibles al stockpile conservando identidad de ruta;
6. ejecutar reclaim por ruta dentro de su capacidad;
7. aplicar blending sin mezclar de forma implícita rutas incompatibles;
8. calcular ley, cobre contenido y metal recuperado por ruta;
9. reconciliar masa, cobre contenido, metal recuperado y valor.

## Política de rutas

La primera implementación será determinista y auditable:

```text
source-destination-preserving-route-allocation
```

Reglas iniciales:

- `Mill` alimenta la ruta Mill;
- `Leach` alimenta la ruta Leach;
- `Dump` no se procesa;
- una reclasificación entre Mill y Leach estará bloqueada inicialmente;
- toda excepción deberá quedar registrada como supuesto DSRL explícito;
- no se realizará optimización global entre rutas.

## Recuperación metalúrgica

Para una ruta `r`:

```text
cobre_recuperado_kt(r)
= masa_alimentada_Mt(r) × ley_Cu_%(r) × 10 × recuperación(r)
```

La recuperación se aplicará al cobre contenido alimentado a cada ruta. El cobre contenido y el cobre recuperado deberán mostrarse por separado.

## Stockpile por ruta

Los lotes de stockpile deberán conservar:

- ruta de origen;
- masa;
- ley de Cu;
- cobre contenido;
- margen unitario;
- periodo de ingreso;
- identificador de banco/lote.

No se permitirá combinar implícitamente material Mill y Leach en un mismo lote agregado sin mantener trazabilidad interna.

## Resultados por periodo

El reporte deberá mostrar como mínimo:

- masa minada;
- alimentación directa por ruta;
- reclaim por ruta;
- alimentación total por ruta;
- ley de alimentación por ruta;
- cobre contenido por ruta;
- cobre recuperado por ruta;
- recuperación efectiva ponderada;
- stockpile final por ruta;
- capacidad y utilización por ruta;
- margen realizado por ruta;
- margen operativo descontado total;
- cuello de botella por ruta.

## Reconciliaciones

La validación deberá verificar:

```text
masa minada = proceso + no proceso
```

```text
proceso = alimentación + stockpile final + proceso in situ pendiente
```

```text
cobre contenido total
= cobre alimentado + cobre en stockpile + cobre in situ pendiente
```

```text
cobre recuperado por ruta
<= cobre contenido alimentado por ruta
```

Además:

- capacidades Mill y Leach respetadas;
- reclaim por ruta respetado;
- identidad de ruta preservada;
- destinos desconocidos reportados;
- ausencia de balances negativos;
- precedencia vertical respetada;
- cierre de valor contra la Etapa 8.8.

## Guardas metodológicas

No se modelarán todavía:

- recuperación variable por mineralogía;
- cinética de lixiviación;
- tiempo de residencia;
- recuperación dependiente de granulometría;
- humedad;
- pérdidas por manipulación;
- equipos;
- acarreo;
- costos logísticos por ruta;
- geometría física de stockpiles;
- restricciones geometalúrgicas avanzadas;
- optimización global de rutas.

El margen operativo descontado no es VAN.

## Contratos propuestos

La implementación deberá incorporar contratos equivalentes a:

```ts
ProcessRouteDefinition
RouteRecoveryInputs
RouteMaterialLot
RoutePeriodResult
RouteRecoveryReport
```

Funciones principales esperadas:

```ts
createRouteRecoveryInputs
validateRouteRecoveryInputs
normalizeSourceDestination
buildBlockBenchRouteRecovery
```

## Validación mínima

La etapa deberá incluir:

- auditoría estática del contrato;
- validador independiente sobre `simmodPL.csv`;
- casos Mill, Leach y Dump;
- rechazo de destino desconocido;
- recuperación 100% como caso de identidad;
- recuperación 0% como caso límite válido;
- recuperación Mill mayor que Leach;
- cierre de 48 combinaciones F1–F6 × incremental/acumulado × 5/10/15/20 m;
- TypeScript y build en PASS;
- revisión visual del panel.

## Criterio de cierre

La Etapa 8.9 cerrará cuando:

- las rutas se mantengan trazables desde `NPVPDEST`;
- la recuperación se aplique por ruta;
- masa, cobre contenido, cobre recuperado y valor cierren;
- no se mezclen datos confirmados con supuestos DSRL;
- la interfaz declare explícitamente sus limitaciones;
- toda la cadena heredada permanezca en PASS.
