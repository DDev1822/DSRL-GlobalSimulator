# Checklist de cierre — Etapa 8.1

## Contrato

- [ ] `simmodPL.csv` se reconoce como modelo maestro.
- [ ] `OPDemo3PB.csv` se reconoce como modelo de control F1–F3.
- [ ] El alcance inicial está limitado a F1–F6.
- [ ] Los pushbacks 7–9 se preservan para expansión futura.
- [ ] `PSB_PIT` se documenta como fase incremental con confirmación externa pendiente.
- [ ] `NPVVOL` se define como volumen oficial.
- [ ] `NPVMASS` se define como masa oficial.
- [ ] `IJK` no se usa como identificador único.
- [ ] La clave compuesta incluye centro y dimensiones del subbloque.
- [ ] `_DUMP_`, `Mill` y `Leach` están clasificados explícitamente.

## Guardas técnicas

- [ ] Las unidades de `AU` y `CU` figuran como no confirmadas.
- [ ] La unidad monetaria de los campos `NPV*` figura como no confirmada.
- [ ] Los campos reservados no se utilizan para decisiones.
- [ ] La terminología oficial es `inventario dentro del diseño`.
- [ ] El contrato prohíbe declarar reserva.

## Validación automática

```bash
npm install
npm run verify:stage8-1
```

Criterio de cierre:

- [ ] auditorías de etapas anteriores: PASS;
- [ ] `STAGE 8.1 AUDIT SUMMARY`: PASS;
- [ ] `BLOCK MODEL CONTRACT VALIDATION`: PASS;
- [ ] TypeScript: PASS;
- [ ] build: PASS.

## Validación opcional con CSV presentes

El comando debe detectar automáticamente los archivos en alguna de estas ubicaciones:

```text
public/data/block-model/
public/data/
data/block-model/
data/
```

Cuando ambos estén presentes también debe validar:

- [ ] 49,989 filas en `simmodPL.csv`;
- [ ] 18,981 filas en `OPDemo3PB.csv`;
- [ ] clave compuesta sin duplicados;
- [ ] 13,098 repeticiones esperadas de `IJK`;
- [ ] reconciliación de volumen, masa y beneficio;
- [ ] pushbacks 1–9 en el maestro;
- [ ] pushbacks 1–3 en el control;
- [ ] equivalencia del control con `PSB_PIT <= 3`.
