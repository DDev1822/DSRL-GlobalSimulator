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
  );

if (
  source.includes("from './components/DataminePhaseViewer';") ||
  source.includes("from './utils/datamineParser';")
) {
  throw new Error('No se pudieron corregir las rutas del archivo generado.');
}

await writeFile(file, source, 'utf8');
console.log('Generated Datamine imports corrected.');
