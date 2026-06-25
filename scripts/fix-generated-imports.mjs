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

const hoverCardOpening = `<div className="datamine-hover-card" style={{
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
}}>`;

function compactHoverCard(input) {
  if (input.includes('className="datamine-hover-card"')) {
    return { source: input, updated: true };
  }

  const markers = [
    '{hoveredTriangle && (',
    '{hoveredGeometry && (',
    '{hoveredTriangle ? (',
  ];

  for (const marker of markers) {
    const markerIndex = input.indexOf(marker);
    if (markerIndex === -1) continue;

    const before = input.slice(0, markerIndex);
    const section = input.slice(markerIndex);
    const updatedSection = section.replace(
      /<div(?:\s+className="[^"]*")?(?:\s+style=\{\{[\s\S]*?\}\})?\s*>/,
      hoverCardOpening,
    );

    if (updatedSection !== section) {
      return { source: before + updatedSection, updated: true };
    }
  }

  return { source: input, updated: false };
}

const hoverResult = compactHoverCard(source);
source = hoverResult.source;

if (
  source.includes("from './components/DataminePhaseViewer';") ||
  source.includes("from './utils/datamineParser';")
) {
  throw new Error('No se pudieron corregir las rutas del archivo generado.');
}

if (!hoverResult.updated) {
  console.warn(
    'Advertencia: no se encontró un bloque de hover Datamine para compactar; la aplicación continuará iniciando.',
  );
}

await writeFile(file, source, 'utf8');
console.log('Generated Datamine imports corrected.');
if (hoverResult.updated) {
  console.log('Datamine hover card constrained to a compact floating panel.');
}
