# Flujo de trabajo Figma Make ↔ GitHub

## Fuente maestra

GitHub es la fuente maestra del código. Figma Make se utiliza como entorno de prototipado y edición asistida, pero cada cambio importante debe quedar trazado mediante una rama y un commit.

## Regla de ramas

- `main`: versión estable.
- `feat/*`: nuevas funciones.
- `fix/*`: correcciones.
- `docs/*`: documentación.
- `refactor/*`: reorganización sin cambio funcional esperado.

## Flujo recomendado

1. Crear o seleccionar una rama de trabajo.
2. Conectar Figma Make a esa rama.
3. Pedir un único cambio de alcance cerrado.
4. Revisar la vista previa en Make.
5. Sincronizar el código al repositorio.
6. Clonar o actualizar el repositorio local.
7. Ejecutar:

```bash
npm install
npm run typecheck
npm run build
```

8. Cuando existan los CSV Datamine, ejecutar además:

```bash
npm run validate:data
```

9. Revisar el diff antes de integrar a `main`.

## Archivos que Make no debe reemplazar sin revisión

- `src/lib/economics.ts`
- `src/utils/datamineParser.ts`
- `src/types/datamine.ts`
- `scripts/validate-datamine.mjs`
- `public/data/README.md`

## Reglas para prompts en Make

- Un objetivo por iteración.
- No rediseñar áreas fuera del alcance.
- No generar datos mineros ficticios.
- No sustituir CSV reales por geometría sintética.
- No instalar dependencias sin justificarlo.
- Informar archivos modificados al final.
- Conservar la compatibilidad con ejecución local.

## Datos Datamine

Los archivos deben ubicarse en:

```text
public/data/Design Pit_pt.csv
public/data/Design Pit_tr.csv
```

El repositorio contiene un contrato de datos y un validador local para verificar conteos, PID y bounds.
