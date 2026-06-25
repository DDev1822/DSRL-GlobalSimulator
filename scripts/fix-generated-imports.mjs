import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../src/generated/App.datamine-only.generated.tsx', import.meta.url);
let source = await readFile(file, 'utf8');

source = source
  .replace(
    "from './components/DataminePhaseViewer';",
    "from '../components/DataminePhaseViewer';",
  )
  .replace(
    "from './utils/datamineParser';",
    "from '../utils/datamineParser';",
  )
  .replace(
    'onTriangleHover={setHoveredTriangle}',
    'onTriangleHover={undefined}',
  );

if (
  source.includes("from './components/DataminePhaseViewer';") ||
  source.includes("from './utils/datamineParser';")
) {
  throw new Error('No se pudieron corregir las rutas del archivo generado.');
}

if (source.includes('onTriangleHover={setHoveredTriangle}')) {
  throw new Error('No se pudo desactivar el tooltip superpuesto del pit Datamine.');
}

await writeFile(file, source, 'utf8');
console.log('Generated Datamine imports corrected.');
console.log('Datamine triangle overlay disabled; the pit viewer remains unobstructed.');
