# Etapa 5 — Comparación entre fases

La aplicación incorpora el botón `COMPARAR FASES`.

## Controles

- fase base;
- fase destino;
- altura de banco: 5, 10, 15 o 20 m.

## Comparación geométrica real

Se calcula desde las superficies Datamine:

- variación de área superficial;
- variación de cantidad de bancos;
- variación de triángulos;
- cambio de cota mínima.

## Comparación económica analítica

Los campos con asterisco son proxies del escenario guardado:

- variación de recurso;
- variación de VAN;
- variación de ley;
- variación de strip ratio.

## Secuencia

El panel muestra F1–F6 en una tabla con área, bancos, recurso y VAN. Cada fila puede seleccionarse como fase destino.

## Restricción

No se reporta volumen incremental entre fases porque las triangulaciones son superficies abiertas. La validación volumétrica requiere sólidos cerrados, superficies cerradas entre fases o modelo de bloques.

## Validación

```bash
npm install
npm run verify:stage5
npm run dev
```
