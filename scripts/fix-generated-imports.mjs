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

const hoverCardInline = `className="datamine-hover-card" style={{
  position: 'absolute',
  top: 12,
  right: 12,
  width: 190,
  maxWidth: 'calc(100% - 24px)',
  zIndex: 20,
  pointerEvents: 'none',
  background: 'rgba(2, 6, 23, 0.92)',
  border: '1px solid rgba(16, 185, 129, 0.55)',
  borderRadius: 8,
  padding: 10,
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)'
}}`;

let hoverCardUpdated = source.includes('className="datamine-hover-card"');
source = source.replace(
  /className="absolute top-3 right-3[^"]*pointer-events-none"/,
  () => {
    hoverCardUpdated = true;
    return hoverCardInline;
  },
);

if (
  source.includes("from './components/DataminePhaseViewer';") ||
  source.includes("from './utils/datamineParser';")
) {
  throw new Error('No se pudieron corregir las rutas del archivo generado.');
}

if (!hoverCardUpdated) {
  throw new Error('No se encontró la tarjeta flotante de información Datamine para compactarla.');
}

await writeFile(file, source, 'utf8');
console.log('Generated Datamine imports and hover card corrected.');
