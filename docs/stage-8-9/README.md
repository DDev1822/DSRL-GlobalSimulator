# Etapa 8.9 — Recuperación metalúrgica y rutas de proceso diferenciadas

## Objetivo

Extender la simulación preliminar de stockpile y blending de la Etapa 8.8 para distinguir rutas de proceso y aplicar recuperaciones metalúrgicas específicas por ruta, conservando trazabilidad de masa, ley, cobre contenido, metal recuperado y valor.

La salida sigue siendo una simulación preliminar dentro del diseño. No es un plan minero ejecutable, una optimización global de planta ni una declaración de reservas.

## Estado de implementación

La primera versión funcional ya incorpora:

- motor `blockBenchRouteRecovery.ts`;
- contratos TypeScript de rutas, lotes, periodos y reporte;
- normalización de destinos `Mill`, `Leach`, `_DUMP_` y desconocidos;
- capacidades, utilización, recuperación, costos, stockpile y reclaim por ruta;
- preservación de identidad de ruta;
- reconciliaciones de masa, cobre contenido, cobre recuperado y valor;
- panel `RECUPERACIÓN & RUTAS` integrado al dashboard;
- auditoría estática y validador sintético.

La validación real sobre las 48 combinaciones y el cierre visual siguen pendientes de ejecución local.

## Principio de trazabilidad

La Etapa 8.9 mantiene separados:

1. **dato observado de origen**: destino registrado en `NPVPDEST`;
2. **supuesto DSRL**: recuperación, capacidad, costos y reglas operacionales configuradas por ruta;
3. **resultado calculado**: masa alimentada, ley, cobre contenido, cobre recuperado y margen por ruta.

Ningún supuesto DSRL se presenta como dato confirmado del modelo de bloques.

## Rutas iniciales

El contrato reconoce:

- `Mill` → concentración / planta convencional;
- `Leach` → lixiviación;
- `_DUMP_` → material no procesado en esta etapa;
- destinos desconocidos → bloqueados y reportados, nunca forzados.

La nomenclatura de origen se conserva para auditoría. Las rutas normalizadas se usan únicamente dentro del motor DSRL.

## Entradas por ruta

Cada ruta declara:

- identificador y nombre;
- destino de origen asociado;
- capacidad máxima por periodo;
- utilización de capacidad;
- recuperación metalúrgica;
- costo de procesamiento;
- disponibilidad de la ruta;
- aceptación o rechazo de alimentación desde stockpile;
- capacidad máxima de stockpile;
- capacidad de reclaim por periodo;
- condición de unidad confirmada para `CU = %`.

Valores iniciales:

| Ruta | Recuperación inicial | Capacidad inicial | Naturaleza |
|---|---:|---:|---|
| Mill | recuperación del escenario económico | producción anual configurada | supuesto DSRL |
| Leach | 72% de la recuperación Mill | 35% de la producción anual | supuesto DSRL |

Los valores son editables y se identifican visualmente como supuestos.

## Flujo de material

Por periodo, el motor:

1. respeta precedencia vertical de techo a fondo;
2. separa material de proceso, no proceso y destinos desconocidos;
3. preserva el destino observado del bloque o lote;
4. asigna alimentación directa por ruta dentro de sus capacidades;
5. envía excedentes elegibles al stockpile conservando identidad de ruta;
6. ejecuta reclaim FIFO por ruta dentro de su capacidad;
7. evita mezclar implícitamente rutas incompatibles;
8. calcula ley, cobre contenido y cobre recuperado por ruta;
9. calcula margen operativo por ruta;
10. reconcilia masa, cobre y valor.

## Política de rutas

La implementación es determinista y auditable:

```text
source-destination-preserving-route-allocation
```

Reglas:

- `Mill` alimenta exclusivamente la ruta Mill;
- `Leach` alimenta exclusivamente la ruta Leach;
- `_DUMP_` no entra a proceso;
- una reclasificación entre Mill y Leach está bloqueada;
- los destinos desconocidos se reportan sin asignación automática;
- no se realiza optimización global entre rutas.

## Recuperación metalúrgica

Para una ruta `r`:

```text
cobre_recuperado_kt(r)
= masa_alimentada_Mt(r) × ley_Cu_%(r) × 10 × recuperación(r)
```

La recuperación se aplica al cobre contenido alimentado a cada ruta. El cobre contenido y el cobre recuperado se muestran por separado.

## Margen por ruta

La primera versión calcula margen operativo por ruta como:

```text
margen = ingreso por cobre recuperado - costo de proceso - costo de mina aplicable
```

La base de costo puede ser:

- solo proceso;
- costo completo.

El margen descontado es una referencia operativa y no es VAN.

## Stockpile por ruta

Los lotes conservan:

- ruta de origen;
- destino fuente;
- masa;
- ley de Cu;
- cobre contenido;
- cobre recuperable;
- margen;
- periodo de ingreso;
- banco de origen.

No se combina material Mill y Leach en un lote agregado sin trazabilidad interna.

## Resultados por periodo

El reporte muestra:

- masa minada;
- proceso observado;
- no proceso;
- destino desconocido;
- alimentación directa por ruta;
- reclaim por ruta;
- alimentación total por ruta;
- ley de alimentación por ruta;
- cobre contenido por ruta;
- cobre recuperado por ruta;
- recuperación efectiva ponderada;
- stockpile final por ruta;
- utilización de capacidad por ruta;
- margen realizado por ruta;
- margen operativo descontado total;
- cuello de botella.

## Reconciliaciones

La implementación verifica:

```text
masa minada programada + masa in situ pendiente = masa total seleccionada
```

```text
masa de ruta = feed + stockpile final + masa in situ pendiente
```

```text
cobre contenido total de ruta
= cobre alimentado + cobre en stockpile + cobre in situ pendiente
```

```text
cobre recuperado por ruta <= cobre contenido alimentado por ruta
```

Además:

- capacidades Mill y Leach respetadas;
- reclaim por ruta respetado;
- identidad de ruta preservada;
- destinos desconocidos reportados;
- ausencia de balances negativos;
- precedencia vertical respetada;
- cierre de valor por ruta.

## Guardas metodológicas

No se modelan todavía:

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

## Contratos implementados

```ts
ProcessRouteDefinition
RouteRecoveryInputs
RouteMaterialLot
RoutePeriodResult
RouteRecoveryReport
```

Funciones principales:

```ts
createRouteRecoveryInputs
validateRouteRecoveryInputs
normalizeSourceDestination
buildBlockBenchRouteRecovery
```

## Validación

```bash
npm run verify:stage8-6
node scripts/audit-stage-8-7.mjs
node scripts/validate-block-bench-preliminary-sequence.mjs
node scripts/audit-stage-8-8.mjs
node scripts/validate-block-bench-stockpile-blending.mjs
node scripts/audit-stage-8-9.mjs
node scripts/validate-block-bench-route-recovery.mjs
npm run typecheck
npm run build
npm run dev
```

El validador sintético comprueba Mill, Leach, Dump, destino desconocido, recuperación 100%, recuperación 0%, preservación de ruta, precedencia y cierres principales.

La siguiente ampliación del validador incorporará las 48 combinaciones reales desde `simmodPL.csv`.

## Criterio de cierre

La Etapa 8.9 cerrará cuando:

- las rutas se mantengan trazables desde `NPVPDEST`;
- la recuperación se aplique por ruta;
- masa, cobre contenido, cobre recuperado y valor cierren;
- no se mezclen datos confirmados con supuestos DSRL;
- la interfaz declare explícitamente sus limitaciones;
- las 48 combinaciones reales estén validadas;
- TypeScript y build estén en PASS;
- la revisión visual esté aprobada;
- toda la cadena heredada permanezca en PASS.
