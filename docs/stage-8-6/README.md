# Etapa 8.6 — Valor económico real por banco

## Objetivo

Unir el inventario físico real por banco de la Etapa 8.4 con la clasificación económica por bloque de la Etapa 8.5.

La salida es un screening vertical de valor para F1–F6. No es una secuencia minera ni reemplaza la programación operacional.

## Caché compartido

`blockModelCatalogLoader.ts` mantiene un caché compartido de sesión para reutilizar el catálogo tipado de 49,989 bloques.

El caché registra:

- estado;
- número de cargas reales;
- reutilizaciones;
- fecha de carga;
- error más reciente.

La recarga explícita invalida el caché y vuelve a leer los CSV.

## Construcción por banco

Cada bloque se asigna mediante `ZC` al intervalo:

```text
[cota inferior, cota superior)
```

Se conservan las alturas de 5, 10, 15 y 20 m y las lecturas incremental y acumulada.

No se divide un subbloque entre dos bancos.

## Economía fuente

Por banco se calcula:

- beneficio `NPVPROFT` en moneda nativa no confirmada;
- beneficio fuente por tonelada;
- cobertura económica;
- masa de proceso y desmonte observada;
- CU ponderado del material observado de proceso.

## Valor DSRL

Permanece bloqueado hasta confirmar temporalmente:

```text
CU = %
```

Cuando se activa, cada banco reporta:

- proceso y desmonte DSRL;
- ingreso seleccionado;
- costos de proceso y mina;
- margen seleccionado no descontado;
- USD/t de proceso seleccionado;
- upgrades y downgrades;
- acumulado económico desde techo.

## Bandas de screening

- `ALTO VALOR`: al menos US$5/t de margen sobre proceso seleccionado;
- `MARGINAL`: margen positivo menor a US$5/t o sin proceso seleccionado;
- `NEGATIVO`: margen potencial del banco menor que cero si todo el material fuera procesado;
- `BLOQUEADO`: unidad CU no confirmada.

Las bandas alto valor, marginal y negativo son indicadores de screening, no precedencias de minado.

## Ranking y riesgo

La interfaz incluye:

- mapa vertical de valor;
- Top 5 bancos;
- bancos marginales o negativos;
- beneficio fuente;
- margen DSRL;
- valor por tonelada;
- reconciliación 8.4 + 8.5.

## Reconciliaciones

Cada combinación debe cerrar:

- bloques, volumen, masa, proceso y desmonte contra 8.4;
- beneficio fuente, proceso DSRL, desmonte DSRL y margen contra 8.5;
- acumulado desde techo contra el total seleccionado;
- intervalos sin solape;
- beneficio fuente por fila;
- ingreso seleccionado menos costos igual a margen seleccionado.

## Terminología

El resultado es:

> screening económico real por banco dentro del diseño

No constituye reserva, VAN, secuencia minera ni plan de producción.

## Validación

```bash
npm install
npm run verify:stage8-6
npm run dev
```

El validador recorre 48 combinaciones reales y un caso sintético con bancos de alto valor, marginal y negativo.

## Próxima etapa

La Etapa 8.7 incorporará una secuencia preliminar con capacidades y restricciones explícitas, manteniendo separados el ranking económico y la factibilidad operacional.
