# Etapa 8.3 — Inventario físico incremental y acumulado F1–F6

## Objetivo

Convertir el catálogo tipado de la Etapa 8.2 en inventarios físicos reales por fase, sin volver a interpretar el CSV y sin usar proxies geométricos.

## Regla de fase

```text
Inventario incremental F4 = bloques con PSB_PIT = 4
Inventario acumulado F4   = bloques con PSB_PIT <= 4
```

La etapa activa F1–F6 y preserva F7–F9 fuera del alcance visible.

## Magnitudes calculadas

Por fase incremental y acumulada:

- número de bloques;
- volumen mediante `NPVVOL`;
- masa mediante `NPVMASS`;
- masa de proceso: `Mill + Leach`;
- masa de desmonte: `_DUMP_`;
- masa separada de `Mill` y `Leach`;
- strip ratio por destino: desmonte / proceso;
- ley AU ponderada por masa;
- ley CU ponderada por masa;
- leyes ponderadas del material enviado a proceso;
- rango de elevación de centros de bloque.

Las unidades de AU y CU siguen sin confirmarse. Por ello se muestran como unidades nativas y no se calcula metal contenido.

## Resultados de control F1–F6

- 34,845 bloques;
- 54.892664 Mt totales;
- 39.106397 Mt enviadas a proceso;
- 15.786267 Mt enviadas a desmonte;
- strip ratio por destino: 0.403675;
- 15,144 bloques F7–F9 preservados.

El acumulado F3 debe cerrar en 18,981 bloques, coincidiendo con `OPDemo3PB.csv`.

## Reconciliaciones

El motor comprueba:

- suma de bloques incrementales = acumulado F6;
- suma de volúmenes incrementales = volumen acumulado F6;
- suma de masas incrementales = masa acumulada F6;
- proceso + desmonte = masa total;
- Mill + Leach = masa de proceso;
- bloques, volumen y masa acumulados son monótonos.

## Interfaz

El botón `INVENTARIO REAL` abre un panel con:

- resumen F1–F6;
- selección de fase;
- lectura incremental o acumulada;
- detalle de bloques, volumen, masa, proceso y desmonte;
- tabla de secuencia F1–F6;
- gráficos de masa incremental y acumulada;
- reconciliación del inventario;
- advertencias de terminología y unidades.

## Terminología

Los resultados se denominan `inventario dentro del diseño`.

No constituyen una declaración de reservas. Proceso y desmonte reflejan el destino observado en `NPVPDEST`, no una nueva clasificación económica DSRL.

## Validación

```bash
npm install
npm run verify:stage8-3
npm run dev
```

## Próxima etapa

La Etapa 8.4 construirá el inventario real por banco y fase usando elevación de bloques, altura de banco y reconciliación con la secuencia física F1–F6.
