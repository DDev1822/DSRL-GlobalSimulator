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
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  values.push(current);
  return values;
}

function loadCsv(path) {
  const lines = readFileSync(path, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
  const headers = parseCsvLine(lines[0]).map((value) => value.trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
  return { headers, rows };
}

function locate(candidates) {
  return candidates.find((path) => existsSync(path)) ?? null;
}

function number(row, field) {
  return Number(row[field]);
}

function summarizeModel(path, contract) {
  const { headers, rows } = loadCsv(path);
  const headerResult = contract.validateBlockModelHeaders(headers);
  const keys = new Set();
  const duplicateKeys = [];
  const ijkSeen = new Set();
  let duplicateIjk = 0;
  let maxVolumeError = 0;
  let maxMassError = 0;
  let maxProfitError = 0;
  const pushbacks = new Set();
  const destinations = new Map();

  for (const row of rows) {
    const typed = {
      XC: number(row, 'XC'),
      YC: number(row, 'YC'),
      ZC: number(row, 'ZC'),
      XINC: number(row, 'XINC'),
      YINC: number(row, 'YINC'),
      ZINC: number(row, 'ZINC'),
      DENSITY: number(row, 'DENSITY'),
      AU: number(row, 'AU'),
      CU: number(row, 'CU'),
      NPVMASS: number(row, 'NPVMASS'),
      NPVVOL: number(row, 'NPVVOL'),
      NPVREVEN: number(row, 'NPVREVEN'),
      NPVPCOST: number(row, 'NPVPCOST'),
      NPVMCOST: number(row, 'NPVMCOST'),
      NPVPROFT: number(row, 'NPVPROFT'),
      NPVPDEST: row.NPVPDEST,
      PSB_PIT: number(row, 'PSB_PIT'),
    };
    const key = contract.createBlockKey(typed);
    if (keys.has(key)) duplicateKeys.push(key);
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
    maxProfitError = Math.max(
      maxProfitError,
      Math.abs(typed.NPVPROFT - contract.derivedBlockProfit(typed)),
    );
    pushbacks.add(typed.PSB_PIT);
    destinations.set(
      typed.NPVPDEST,
      (destinations.get(typed.NPVPDEST) ?? 0) + 1,
    );
  }

  return {
    headers,
    rows,
    headerResult,
    duplicateKeys,
    duplicateIjk,
    maxVolumeError,
    maxMassError,
    maxProfitError,
    pushbacks: [...pushbacks].sort((left, right) => left - right),
    destinations: Object.fromEntries([...destinations.entries()].sort()),
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
  pass(contract.REQUIRED_BLOCK_MODEL_FIELDS.length >= 15, 'contrato físico mínimo definido');
  pass(
    contract.SUPPORTED_PHASES.join(',') === '1,2,3,4,5,6',
    'alcance inicial limitado a F1–F6',
  );
  pass(
    contract.OBSERVED_PUSHBACKS.join(',') === '1,2,3,4,5,6,7,8,9',
    'pushbacks 7–9 preservados para expansión',
  );
  pass(contract.classifyDestination('_DUMP_') === 'waste', 'destino dump clasificado como waste');
  pass(contract.classifyDestination('Mill') === 'process', 'destino Mill clasificado como process');
  pass(contract.classifyDestination('Leach') === 'process', 'destino Leach clasificado como process');
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
    contract.createBlockKey(sample) !== contract.createBlockKey({ ...sample, ZINC: 3 }),
    'clave compuesta distingue subbloques con dimensiones diferentes',
  );
  pass(
    contract.BLOCK_MODEL_SEMANTIC_GUARDRAILS.prohibitedReserveClaim,
    'contrato prohíbe declarar reserva',
  );
  pass(
    !contract.BLOCK_MODEL_SEMANTIC_GUARDRAILS.gradeUnitsConfirmed,
    'unidades de ley permanecen explícitamente sin confirmar',
  );
  pass(manifest.primaryModel.observedRows === 49989, 'manifiesto registra 49,989 bloques maestros');
  pass(manifest.controlModel.observedRows === 18981, 'manifiesto registra 18,981 bloques de control');
  pass(manifest.observedF1ToF6.rows === 34845, 'manifiesto registra 34,845 bloques F1–F6');

  const primaryPath = locate(manifest.primaryModel.expectedPathCandidates);
  const controlPath = locate(manifest.controlModel.expectedPathCandidates);

  if (!primaryPath) {
    warn('simmodPL.csv no está versionado en una ruta candidata; la ingesta física corresponde a Etapa 8.2.');
  } else {
    const primary = summarizeModel(primaryPath, contract);
    pass(primary.headerResult.valid, 'modelo maestro cumple encabezados requeridos');
    pass(primary.rows.length === 49989, 'modelo maestro conserva 49,989 filas');
    pass(primary.duplicateKeys.length === 0, 'clave compuesta única en modelo maestro');
    pass(primary.duplicateIjk === 13098, 'IJK se reconoce como referencia no única con 13,098 repeticiones');
    pass(primary.maxVolumeError < 0.003, 'NPVVOL reconciliado con dimensiones');
    pass(primary.maxMassError < 0.000001, 'NPVMASS reconciliado con volumen y densidad');
    pass(primary.maxProfitError < 0.000001, 'NPVPROFT reconciliado con ingreso y costos');
    pass(primary.pushbacks.join(',') === '1,2,3,4,5,6,7,8,9', 'modelo maestro contiene pushbacks 1–9');
  }

  if (!controlPath) {
    warn('OPDemo3PB.csv no está versionado en una ruta candidata; la reconciliación externa se ejecutará al incorporarlo.');
  } else {
    const control = summarizeModel(controlPath, contract);
    pass(control.headerResult.valid, 'modelo de control cumple encabezados requeridos');
    pass(control.rows.length === 18981, 'modelo de control conserva 18,981 filas');
    pass(control.pushbacks.join(',') === '1,2,3', 'modelo de control contiene pushbacks 1–3');

    if (primaryPath) {
      const primary = summarizeModel(primaryPath, contract);
      const expectedKeys = new Set(
        primary.rows
          .filter((row) => Number(row.PSB_PIT) <= 3)
          .map((row) =>
            contract.createBlockKey({
              XC: number(row, 'XC'),
              YC: number(row, 'YC'),
              ZC: number(row, 'ZC'),
              XINC: number(row, 'XINC'),
              YINC: number(row, 'YINC'),
              ZINC: number(row, 'ZINC'),
            }),
          ),
      );
      const controlKeys = new Set(
        control.rows.map((row) =>
          contract.createBlockKey({
            XC: number(row, 'XC'),
            YC: number(row, 'YC'),
            ZC: number(row, 'ZC'),
            XINC: number(row, 'XINC'),
            YINC: number(row, 'YINC'),
            ZINC: number(row, 'ZINC'),
          }),
        ),
      );
      pass(
        expectedKeys.size === controlKeys.size &&
          [...expectedKeys].every((key) => controlKeys.has(key)),
        'OPDemo3PB coincide con el subconjunto PSB_PIT <= 3 de simmodPL',
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
