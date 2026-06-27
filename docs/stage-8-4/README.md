# Etapa 8.4 — Inventario real por bancos

## Objetivo

Transformar el catálogo tipado del modelo de bloques en inventarios físicos reales por banco para F1–F6, manteniendo las lecturas incremental y acumulada de la Etapa 8.3.

## Regla de asignación

Cada bloque completo se asigna a un banco usando su elevación central `ZC`.

```text
banco = [cota inferior, cota superior)
```

Un bloque ubicado exactamente en la cota superior pertenece al banco siguiente. No se divide el volumen de un subbloque entre dos bancos.

Esta regla evita inventar una partición volumétrica que no existe en el archivo fuente. La división proporcional de subbloques que cruzan límites requeriría geometría adicional o una transformación explícita del modelo.

## Alcance

- fases activas F1–F6;
- lectura incremental: `PSB_PIT = fase`;
- lectura acumulada: `PSB_PIT <= fase`;
- alturas de banco: 5, 10, 15 y 20 m;
- bancos ordenados desde techo hacia fondo;
- acumulado vertical calculado desde el banco superior.

## Métricas por banco

- bloques;
- volumen `NPVVOL`;
- masa `NPVMASS`;
- proceso;
- desmonte;
- Mill;
- Leach;
- strip ratio por destino;
- AU y CU ponderados por masa;
- acumulado desde techo.

AU y CU permanecen en la unidad nativa del archivo porque su unidad todavía no ha sido confirmada.

## Reconciliaciones

Cada combinación de fase, alcance y altura debe cerrar contra la Etapa 8.3:

- suma de bloques por banco = bloques de fase;
- suma de volumen por banco = volumen de fase;
- suma de masa por banco = masa de fase;
- proceso + desmonte = masa total;
- Mill + Leach = proceso;
- último acumulado desde techo = total seleccionado;
- intervalos de bancos sin solape;
- total por bancos = inventario físico 8.3.

## Interfaz

El botón `BANCOS REALES` abre un panel con:

- selector F1–F6;
- lectura incremental/acumulada;
- altura de banco;
- banco seleccionado;
- secuencia vertical completa;
- masa por banco;
- acumulado desde techo;
- reconciliaciones.

## Terminología

Los resultados son `inventario dentro del diseño`. No constituyen una declaración de reservas.

## Validación

```bash
npm install
npm run verify:stage8-4
npm run dev
```

El validador recorre 48 combinaciones reales: seis fases, dos alcances y cuatro alturas de banco. También incluye un caso sintético de límites `[floor, ceiling)`.

## Próxima etapa

La Etapa 8.5 conectará el inventario físico real con la clasificación económica por bloque, ley de corte calculada y destino económico trazable, manteniendo separados los datos observados de los supuestos DSRL.
