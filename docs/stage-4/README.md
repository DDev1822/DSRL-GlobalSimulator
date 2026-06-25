# Etapa 4 — Análisis por bancos

La aplicación incorpora un panel flotante `ANÁLISIS POR BANCOS`.

## Controles

- fase real F1–F6;
- altura de banco de 5, 10, 15 o 20 m;
- banco seleccionado por intervalo de elevación.

## Datos geométricos reales

Se calculan directamente desde la malla Datamine:

- cotas inferior y superior;
- cantidad de triángulos;
- área superficial 3D en m² y hectáreas;
- cantidad total de bancos.

## Proxies analíticos

Los campos con asterisco distribuyen el escenario económico guardado entre bancos:

- recurso del banco y acumulado;
- ley;
- strip ratio;
- VAN incremental y acumulado.

No representan reservas reportables. La validación necesita sólidos cerrados o modelo de bloques.

## Volumen

Una superficie de pit abierta no permite calcular volumen validado por banco. El motor registra:

```text
requires-closed-solids-or-block-model
```

## Escenario

El panel relee al abrirse el escenario guardado en:

```text
dsrl-global-simulator:economic-scenario:v1
```

## Validación

```bash
npm install
npm run verify:stage4
```

El comando ejecuta datos Datamine, auditorías 0–4, economía, prueba sintética de bancos, TypeScript y build.
