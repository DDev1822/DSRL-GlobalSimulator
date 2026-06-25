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

const hoverCardClass =
  'className="absolute top-3 right-3 bg-slate-900/95 border border-emerald-500/50 rounded-lg p-3 shadow-2xl min-w-[210px] pointer-events-none"';

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

if (source.includes(hoverCardClass)) {
  source = source.replace(hoverCardClass, hoverCardInline);
}

if (
  source.includes("from './components/DataminePhaseViewer';") ||
  source.includes("from './utils/datamineParser';")
) {
  throw new Error('No se pudieron corregir las rutas del archivo generado.');
}

if (source.includes(hoverCardClass)) {
  throw new Error('No se pudo compactar la tarjeta flotante de información Datamine.');
}

await writeFile(file, source, 'utf8');
console.log('Generated Datamine imports and hover card corrected.');
