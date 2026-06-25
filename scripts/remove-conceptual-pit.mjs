import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/App.loading-fixed.tsx';
let source = await readFile(path, 'utf8');

function requireIncludes(token, label = token) {
  if (!source.includes(token)) {
    throw new Error(`No se encontró el bloque requerido: ${label}`);
  }
}

requireIncludes('interface PitShell {', 'PitShell');
requireIncludes('// Pit visualization states - Conceptual', 'estado conceptual');
requireIncludes('// Generate conceptual pit shells', 'lógica de shells');
requireIncludes("{pitMode === 'conceptual' ? (", 'rama JSX conceptual');
requireIncludes('{/* DATAMINE PHASE MODE */}', 'rama JSX Datamine');

source = source.replace(/\ninterface PitShell \{[\s\S]*?\n\}\n/, '\n');
source = source.replace("type PitMode = 'conceptual' | 'datamine';\n", '');

const stateStart = source.indexOf('  // Pit visualization states - Conceptual');
const stateEnd = source.indexOf('  // Datamine Mode States', stateStart);
source = source.slice(0, stateStart) + source.slice(stateEnd);
source = source.replace(
  "  const [pitMode, setPitMode] = useState<PitMode>('conceptual');\n",
  '',
);

const oldGuard = `    if (\n      pitMode !== 'datamine' ||\n      phase6Geometry ||\n      geometryError\n    ) {`;
const newGuard = `    if (phase6Geometry || geometryError) {`;
if (!source.includes(oldGuard)) {
  throw new Error('No se encontró el guard de carga Datamine.');
}
source = source.replace(oldGuard, newGuard);
source = source.replace(
  '  }, [pitMode, phase6Geometry, geometryError]);',
  '  }, [phase6Geometry, geometryError]);',
);

const logicStart = source.indexOf('  // Generate conceptual pit shells');
const logicEnd = source.indexOf('  // Chart dimensions', logicStart);
source = source.slice(0, logicStart) + source.slice(logicEnd);

const panelStart = source.indexOf('          {/* PANEL 2: PIT CONCEPTUAL / DATAMINE PHASES */}');
const contentStart = source.indexOf('            <div className="panel-content">', panelStart);
const fixedHeader = `          {/* PANEL 2: DATAMINE PHASE VIEWER */}\n          <div className="panel">\n            <div className="panel-header">\n              <div className="flex items-center gap-2">\n                <Layers className="w-4 h-4 text-emerald-400" />\n                <span className="text-[11px] font-bold text-slate-300 uppercase">\n                  Pit Datamine — Geometría Real\n                </span>\n              </div>\n            </div>\n\n`;
source = source.slice(0, panelStart) + fixedHeader + source.slice(contentStart);

const ternaryStart = source.indexOf("              {pitMode === 'conceptual' ? (");
const datamineComment = source.indexOf('                  {/* DATAMINE PHASE MODE */}', ternaryStart);
source = source.slice(0, ternaryStart) + source.slice(datamineComment);

const oldClosing = `                </>\n              )}\n            </div>\n          </div>\n\n          {/* BOTTOM METRICS ROW */}`;
const newClosing = `            </div>\n          </div>\n\n          {/* BOTTOM METRICS ROW */}`;
if (!source.includes(oldClosing)) {
  throw new Error('No se encontró el cierre de la rama dual.');
}
source = source.replace(oldClosing, newClosing);

const forbidden = [
  'pitMode',
  'PitShell',
  'generatePitShells',
  'renderPitShell',
  'Pit Conceptual',
  'Cambiar a Datamine',
  'Volver a Conceptual',
  'SHELLS VISIBLES',
];
const remaining = forbidden.filter((token) => source.includes(token));
if (remaining.length > 0) {
  throw new Error(`Persisten referencias conceptuales: ${remaining.join(', ')}`);
}

source = source.replace(
  '// Load Phase 6 geometry when entering Datamine mode.',
  '// Load the real Datamine geometry on application start.',
);

await writeFile(path, source, 'utf8');
console.log('Modelo conceptual eliminado; Datamine queda como único visor.');
