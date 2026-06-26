# ADR-8.1-001 — Contrato del modelo de bloques

## Estado

Aceptado para implementación de la Etapa 8.1.

## Contexto

El simulador dispone de geometrías F1–F6 y de dos exportaciones de modelo de bloques:

- `simmodPL.csv`, con 49,989 bloques y pushbacks 1–9;
- `OPDemo3PB.csv`, con 18,981 bloques y pushbacks 1–3.

La revisión comprobó que el segundo archivo coincide con el subconjunto del primero donde `PSB_PIT <= 3`.

## Decisiones

### 1. Modelo maestro

`simmodPL.csv` es el modelo maestro porque contiene el inventario completo, la programación y los pushbacks 1–9.

### 2. Modelo de control

`OPDemo3PB.csv` es el modelo de control para reconciliar el acumulado F1–F3.

### 3. Campo de fase

`PSB_PIT` se adopta como fase incremental del bloque.

Esta decisión es operacionalmente suficiente para desarrollar los inventarios iniciales, pero se registra como inferida hasta contar con el diccionario externo de Datamine.

### 4. Alcance de geometría

La primera integración utiliza F1–F6, porque son las geometrías disponibles en el visor. Los pushbacks 7–9 permanecen en los datos y no se descartan.

### 5. Magnitudes oficiales

- volumen oficial: `NPVVOL`;
- masa oficial: `NPVMASS`;
- densidad: `DENSITY`.

Las dimensiones `XINC`, `YINC` y `ZINC` se utilizan para reconciliación y respetan los subbloques.

### 6. Identidad

`IJK` no es único. La identidad contractual se construye con:

```text
XC | YC | ZC | XINC | YINC | ZINC
```

### 7. Destinos

- `_DUMP_` se clasifica como `waste`;
- `Mill` y `Leach` se clasifican como `process`;
- cualquier valor distinto queda como `unknown` y genera advertencia.

### 8. Economía observada

Los campos `NPVREVEN`, `NPVPCOST`, `NPVMCOST` y `NPVPROFT` se conservan para auditoría y reconciliación. No reemplazan el motor económico DSRL.

### 9. Unidades pendientes

No se asume aún la unidad de `AU`, `CU` ni de los campos monetarios. Las conversiones de metal contenido y valor definitivo quedan bloqueadas hasta confirmar esas unidades.

### 10. Terminología

No se declara reserva.

Los resultados de la Etapa 8 se denominarán `inventario dentro del diseño` o `inventario económico preliminar`, según corresponda. La palabra reserva queda prohibida hasta incorporar factores modificadores y demostrar viabilidad.

## Consecuencias

### Positivas

- se elimina la dependencia inicial de sólidos cerrados para asignar fase;
- se preservan subbloques y magnitudes físicas reales;
- existe una reconciliación externa F1–F3;
- se puede avanzar a parser e inventarios sin inventar campos.

### Riesgos controlados

- la semántica de `PSB_PIT` aún requiere confirmación documental;
- las unidades de ley y moneda siguen pendientes;
- el destino programado no equivale automáticamente a reserva;
- la compatibilidad espacial con las triangulaciones se verificará en una etapa posterior.

## Próxima decisión

La Etapa 8.2 definirá la estrategia de carga: CSV local versionado, carga mediante selector de archivo o ambos modos bajo un mismo parser.
