# Datos Datamine

Coloca en esta carpeta los archivos reales:

- `Design Pit_pt.csv`
- `Design Pit_tr.csv`

El parser de la aplicación los solicita desde:

- `/data/Design%20Pit_pt.csv`
- `/data/Design%20Pit_tr.csv`

## Contrato esperado

### Puntos

Columnas mínimas:

```text
XP,YP,ZP,PID
```

Validación conocida del caso actual:

- 7,995 puntos.
- PID únicos.
- Sin coordenadas vacías.

### Triángulos

Columnas mínimas:

```text
PID1,PID2,PID3,TRIANGLE
```

Columnas descriptivas aprovechadas cuando existen:

```text
LAYERS,Pit
```

Validación conocida del caso actual:

- 15,683 triángulos.
- 0 referencias PID inválidas.
- Geometría clasificada como `road_ramp`.
- Pit identificado como `Ezperanza` en la fuente original.

Los CSV deben conservarse como datos fuente. No deben sustituirse por geometría sintética.
