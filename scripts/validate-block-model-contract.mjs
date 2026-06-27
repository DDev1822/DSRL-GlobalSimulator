import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const failures = [];
const passes = [];
const warnings = [];
const pass = (condition, message) => {
  if (condition) {
    passes.push(message);
    console.log(`PASS: ${message}`);
  } else {
    failures.push(message);
    console.error(`FAIL: ${message}`);
  }
};
const warn = (message) => {
  warnings.push(message);
  console.warn(`WARN: ${message}`);
};

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(current);
      current = '';
    } else current += character;
  }
  values.push(current);
  return values;
}

function loadCsv(path) {
  const lines = readFileSync(path, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(Boolean);
  const headers = parseCsvLine(lines[0]).map((value) => value.trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? '']),
    );
  });
  return { headers, rows };
}

const locate = (candidates) =>
  candidates.find((path) => existsSync(path)) ?? null;
const numeric = (row, field) => Number(row[field]);

function toTypedRow(row) {
  return {
    XC: numeric(row, 'XC'),
    YC: numeric(row, 'YC'),
    ZC: numeric(row, 'ZC'),
    XINC: numeric(row, 'XINC'),
    YINC: numeric(row, 'YINC'),
    ZINC: numeric(row, 'ZINC'),
    DENSITY: numeric(row, 'DENSITY'),
    AU: numeric(row, 'AU'),
    CU: numeric(row, 'CU'),
    NPVMASS: numeric(row, 'NPVMASS'),
    NPVVOL: numeric(row, 'NPVVOL'),
    NPVREVEN: numeric(row, 'NPVREVEN'),
    NPVPCOST: numeric(row, 'NPVPCOST'),
    NPVMCOST: numeric(row, 'NPVMCOST'),
    NPVPROFT: numeric(row, 'NPVPROFT'),
    NPVPDEST: row.NPVPDEST,
    PSB_PIT: numeric(row, 'PSB_PIT'),
  };
}

function summarizeModel(path, contract) {
  const { headers, rows } = loadCsv(path);
  const keys = new Set();
  const ijkSeen = new Set();
  let duplicateKeys = 0;
  let duplicateIjk = 0;
  let maxVolumeError = 0;
  let maxMassError = 0;
  let maxProfitError = 0;
  const pushbacks = new Set();

  for (const row of rows) {
    const typed = toTypedRow(row);
    const key = contract.createBlockKey(typed);
    if (keys.has(key)) duplicateKeys += 1;
    keys.add(key);
    if (ijkSeen.has(row.IJK)) duplicateIjk += 1;
    ijkSeen.add(row.IJK);
    maxVolumeError = Math.max(
      maxVolumeError,
      Math.abs(typed.NPVVOL - contract.derivedBlockVolume(typed)),
    );
    maxMassError = Math.max(
      maxMassError,
      Math.abs(typed.NPVMASS - contract.derivedBlockMass(typed)),
    );
    const derivedProfit = contract.derivedBlockProfit(typed);
    maxProfitError = Math.max(
      maxProfitError,
      Math.abs(typed.NPVPROFT - (derivedProfit ?? Number.NaN)),
    );
    pushbacks.add(typed.PSB_PIT);
  }

  return {
    headers,
    rows,
    headerResult: contract.validateBlockModelHeaders(headers),
    duplicateKeys,
    duplicateIjk,
    maxVolumeError,
    maxMassError,
    maxProfitError,
    pushbacks: [...pushbacks].sort((left, right) => left - right),
  };
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'dsrl-stage8-1-'));
try {
  const source = readFileSync('src/engine/blockModelContract.ts', 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  const modulePath = join(temporaryDirectory, 'blockModelContract.mjs');
  writeFileSync(modulePath, output, 'utf8');
  const contract = await import(pathToFileURL(modulePath).href);
  const manifest = JSON.parse(
    readFileSync('public/data/block-model/block-model-manifest.json', 'utf8'),
  );

  pass(contract.BLOCK_MODEL_CONTRACT_VERSION === '8.1.0', 'versión de contrato 8.1.0');
  pass(contract.BLOCK_MODEL_FIELDS.length === 37, 'diccionario contiene los 37 campos observados');
  pass(
    new Set(contract.BLOCK_MODEL_FIELDS.map((field) => field.field)).size === 37,
    'nombres de campo únicos',
  );
  pass(
    contract.REQUIRED_BLOCK_MODEL_FIELDS.length === 13,
    'contrato físico mínimo contiene 13 campos obligatorios',
  );
  pass(
    contract.SUPPORTED_PHASES.join(',') === '1,2,3,4,5,6',
    'alcance inicial limitado a F1–F6',
  );
  pass(
    contract.OBSERVED_PUSHBACKS.join(',') === '1,2,3,4,5,6,7,8,9',
    'pushbacks 7–9 preservados para expansión',
  );
  pass(contract.classifyDestination('_DUMP_') === 'waste', 'dump clasificado como waste');
  pass(contract.classifyDestination('Mill') === 'process', 'Mill clasificado como process');
  pass(contract.classifyDestination('Leach') === 'process', 'Leach clasificado como process');
  pass(contract.classifyDestination('UNKNOWN') === 'unknown', 'destino desconocido no se fuerza');
  pass(contract.isSupportedPhase(6) && !contract.isSupportedPhase(7), 'guardia de fases activas');
  pass(
    contract.cumulativePhasesForPushback(4).join(',') === '1,2,3,4',
    'membresía acumulada de pushback correcta',
  );

  const sample = {
    XC: 10,
    YC: 20,
    ZC: 30,
    XINC: 5,
    YINC: 5,
    ZINC: 2,
    DENSITY: 2.5,
    AU: 0,
    CU: 0,
    NPVVOL: 50,
    NPVMASS: 125,
    NPVREVEN: 400,
    NPVPCOST: 100,
    NPVMCOST: 80,
    NPVPDEST: 'Mill',
    PSB_PIT: 1,
  };
  pass(contract.derivedBlockVolume(sample) === 50, 'volumen derivado consistente');
  pass(contract.derivedBlockMass(sample) === 125, 'masa derivada consistente');
  pass(contract.derivedBlockProfit(sample) === 220, 'beneficio derivado consistente');
  pass(
    contract.createBlockKey(sample) !==
      contract.createBlockKey({ ...sample, ZINC: 3 }),
    'clave compuesta distingue dimensiones diferentes',
  );
  pass(
    contract.BLOCK_MODEL_SEMANTIC_GUARDRAILS.prohibitedReserveClaim,
    'contrato prohíbe declarar reserva',
  );
  pass(
    !contract.BLOCK_MODEL_SEMANTIC_GUARDRAILS.gradeUnitsConfirmed,
    'unidades de ley permanecen sin confirmar',
  );
  pass(manifest.primaryModel.observedRows === 49989, 'manifiesto registra 49,989 bloques maestros');
  pass(manifest.controlModel.observedRows === 18981, 'manifiesto registra 18,981 bloques de control');
  pass(manifest.observedF1ToF6.rows === 34845, 'manifiesto registra 34,845 bloques F1–F6');

  const primaryPath = locate(manifest.primaryModel.expectedPathCandidates);
  const controlPath = locate(manifest.controlModel.expectedPathCandidates);
  let primary = null;

  if (!primaryPath) {
    warn('simmodPL.csv no está en una ruta candidata; su ingesta corresponde a Etapa 8.2.');
  } else {
    primary = summarizeModel(primaryPath, contract);
    pass(primary.headerResult.valid, 'modelo maestro cumple encabezados requeridos');
    pass(primary.rows.length === 49989, 'modelo maestro conserva 49,989 filas');
    pass(primary.duplicateKeys === 0, 'clave compuesta única en modelo maestro');
    pass(primary.duplicateIjk === 13098, 'IJK conserva 13,098 repeticiones esperadas');
    pass(primary.maxVolumeError < 0.003, 'NPVVOL reconciliado con dimensiones');
    pass(primary.maxMassError < 0.000001, 'NPVMASS reconciliado con volumen y densidad');
    pass(primary.maxProfitError < 0.000001, 'NPVPROFT reconciliado con ingreso y costos');
    pass(
      primary.pushbacks.join(',') === '1,2,3,4,5,6,7,8,9',
      'modelo maestro contiene pushbacks 1–9',
    );
  }

  if (!controlPath) {
    warn('OPDemo3PB.csv no está en una ruta candidata; se reconciliará en Etapa 8.2.');
  } else {
    const control = summarizeModel(controlPath, contract);
    pass(control.headerResult.valid, 'modelo de control cumple encabezados requeridos');
    pass(control.rows.length === 18981, 'modelo de control conserva 18,981 filas');
    pass(control.pushbacks.join(',') === '1,2,3', 'modelo de control contiene pushbacks 1–3');

    if (primary) {
      const expectedKeys = new Set(
        primary.rows
          .filter((row) => Number(row.PSB_PIT) <= 3)
          .map((row) => contract.createBlockKey(toTypedRow(row))),
      );
      const controlKeys = new Set(
        control.rows.map((row) => contract.createBlockKey(toTypedRow(row))),
      );
      pass(
        expectedKeys.size === controlKeys.size &&
          [...expectedKeys].every((key) => controlKeys.has(key)),
        'OPDemo3PB coincide con PSB_PIT <= 3 de simmodPL',
      );
    }
  }

  console.log('\nBLOCK MODEL CONTRACT VALIDATION');
  console.log(
    JSON.stringify(
      {
        status: failures.length === 0 ? 'PASS' : 'FAIL',
        passedChecks: passes.length,
        failedChecks: failures.length,
        warnings,
        primaryFileDetected: primaryPath,
        controlFileDetected: controlPath,
        failures,
      },
      null,
      2,
    ),
  );
  if (failures.length > 0) process.exitCode = 1;
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
