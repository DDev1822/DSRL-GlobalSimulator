import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const failures = [];
let passedChecks = 0;
function check(condition, message) {
  if (condition) {
    passedChecks += 1;
    console.log(`PASS: ${message}`);
  } else {
    failures.push(message);
    console.error(`FAIL: ${message}`);
  }
}

function locate(candidates) {
  return candidates.find((path) => existsSync(path)) ?? null;
}

function transpile(sourcePath, destinationPath, rewriteImport = false) {
  let output = ts.transpileModule(readFileSync(sourcePath, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  if (rewriteImport) {
    output = output.replace(
      "'../engine/blockModelContract'",
      "'../engine/blockModelContract.mjs'",
    );
  }
  mkdirSync(dirname(destinationPath), { recursive: true });
  writeFileSync(destinationPath, output, 'utf8');
}

function firstRowVariant(text, field, value) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',');
  const row = lines[1].split(',');
  row[headers.indexOf(field)] = value;
  return `${headers.join(',')}\n${row.join(',')}\n`;
}

const manifest = JSON.parse(readFileSync('public/data/block-model/block-model-manifest.json', 'utf8'));
const primaryPath = locate(manifest.primaryModel.expectedPathCandidates);
const controlPath = locate(manifest.controlModel.expectedPathCandidates);
check(Boolean(primaryPath), 'simmodPL.csv disponible');
check(Boolean(controlPath), 'OPDemo3PB.csv disponible');

const temp = mkdtempSync(join(tmpdir(), 'dsrl-stage8-2-'));
try {
  const contractTarget = join(temp, 'engine', 'blockModelContract.mjs');
  const parserTarget = join(temp, 'utils', 'blockModelParser.mjs');
  transpile('src/engine/blockModelContract.ts', contractTarget);
  transpile('src/utils/blockModelParser.ts', parserTarget, true);
  const parser = await import(pathToFileURL(parserTarget).href);

  if (primaryPath && controlPath) {
    const primaryText = readFileSync(primaryPath, 'utf8');
    const controlText = readFileSync(controlPath, 'utf8');
    const primary = parser.parseBlockModelCsv(primaryText, {
      sourceName: 'simmodPL.csv',
      sourcePath: primaryPath,
    });
    const control = parser.parseBlockModelCsv(controlText, {
      sourceName: 'OPDemo3PB.csv',
      sourcePath: controlPath,
    });
    const cross = parser.reconcileBlockModelCatalog(primary, control);

    check(primary.report.status === 'pass', 'modelo maestro obtiene PASS');
    check(primary.report.qualityScore === 100, 'calidad maestra 100%');
    check(primary.report.rowCount === 49989, 'lee 49,989 filas maestras');
    check(primary.report.validRowCount === 49989, 'tipa 49,989 bloques');
    check(primary.report.invalidRowCount === 0, 'sin filas maestras inválidas');
    check(primary.report.headerCount === 37, 'lee 37 encabezados');
    check(primary.report.recognizedHeaderCount === 37, 'reconoce los 37 campos');
    check(primary.report.duplicateBlockKeys === 0, 'sin claves de bloque duplicadas');
    check(primary.report.duplicateIjkCount === 13098, 'registra 13,098 IJK repetidos');
    check(primary.report.unknownDestinationRows === 0, 'sin destinos desconocidos');
    check(primary.report.invalidPushbackRows === 0, 'sin pushbacks inválidos');
    check(primary.report.outsideActivePhaseScopeRows === 15144, 'preserva 15,144 bloques F7–F9');
    check(primary.report.countsByPhase['1'] === 8389, 'conteo F1 correcto');
    check(primary.report.countsByPhase['6'] === 5202, 'conteo F6 correcto');
    check(primary.report.countsByPhase['9'] === 2720, 'conteo F9 correcto');
    check(primary.report.countsByDestination._DUMP_ === 25257, 'conteo Dump correcto');
    check(primary.report.countsByDestination.Mill === 16140, 'conteo Mill correcto');
    check(primary.report.countsByDestination.Leach === 8592, 'conteo Leach correcto');
    check(primary.report.volumeReconciliation.rowsOutsideTolerance === 0, 'volumen reconciliado');
    check(primary.report.massReconciliation.rowsOutsideTolerance === 0, 'masa reconciliada');
    check(primary.report.profitReconciliation.rowsOutsideTolerance === 0, 'beneficio reconciliado');
    check(primary.report.bounds?.minX === 4742.5, 'mínimo X correcto');
    check(primary.report.bounds?.maxY === 11177.5, 'máximo Y correcto');
    check(primary.report.bounds?.minZ === 1905, 'mínimo Z correcto');
    check(primary.report.bounds?.maxZ === 2265, 'máximo Z correcto');

    check(control.report.status === 'pass', 'modelo de control obtiene PASS');
    check(control.report.rowCount === 18981, 'lee 18,981 filas de control');
    check(control.report.validRowCount === 18981, 'tipa 18,981 bloques de control');
    check(Object.keys(control.report.countsByPhase).join(',') === '1,2,3', 'control limitado a F1–F3');

    check(cross.status === 'pass', 'reconciliación cruzada obtiene PASS');
    check(cross.exactSubset, 'control es subconjunto exacto');
    check(cross.matchedRows === 18981, 'coinciden 18,981 bloques');
    check(cross.missingFromControl === 0, 'sin faltantes de control');
    check(cross.extraInControl === 0, 'sin extras de control');
    check(cross.valueMismatchRows === 0, 'sin valores distintos');

    const invalidDimension = parser.parseBlockModelCsv(
      firstRowVariant(primaryText, 'XINC', '0'),
      { sourceName: 'invalid-dimension.csv' },
    );
    check(invalidDimension.report.status === 'fail', 'rechaza dimensión cero');
    check(invalidDimension.report.invalidRowCount === 1, 'marca fila físicamente inválida');
    check(invalidDimension.rows.length === 0, 'excluye fila físicamente inválida');

    const lines = primaryText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
    const duplicate = parser.parseBlockModelCsv(
      `${lines[0]}\n${lines[1]}\n${lines[1]}\n`,
      { sourceName: 'duplicate.csv' },
    );
    check(duplicate.report.status === 'fail', 'rechaza bloque duplicado');
    check(duplicate.report.duplicateBlockKeys === 1, 'cuenta una clave duplicada');
    check(duplicate.rows.length === 1, 'conserva una sola instancia');
  }

  console.log('\nBLOCK MODEL INGESTION VALIDATION');
  console.log(JSON.stringify({
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    passedChecks,
    failedChecks: failures.length,
    primaryFileDetected: primaryPath,
    controlFileDetected: controlPath,
    failures,
  }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
