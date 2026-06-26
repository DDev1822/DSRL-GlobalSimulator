import {
  BLOCK_MODEL_FIELDS,
  OBSERVED_PUSHBACKS,
  RECOMMENDED_BLOCK_MODEL_FIELDS,
  REQUIRED_BLOCK_MODEL_FIELDS,
  SUPPORTED_PHASES,
  classifyDestination,
  createBlockKey,
  derivedBlockMass,
  derivedBlockProfit,
  derivedBlockVolume,
  validateBlockModelHeaders,
  type BlockDestination,
} from '../engine/blockModelContract';

export type BlockModelQualityStatus = 'pass' | 'warning' | 'fail';
export type BlockModelIssueSeverity = 'error' | 'warning' | 'info';

export interface BlockModelIssue {
  code: string;
  severity: BlockModelIssueSeverity;
  message: string;
  rowNumber?: number;
  field?: string;
  value?: string;
}

export interface NormalizedBlockModelRow {
  blockKey: string;
  IJK?: number;
  XC: number;
  YC: number;
  ZC: number;
  XINC: number;
  YINC: number;
  ZINC: number;
  XMORIG?: number;
  YMORIG?: number;
  ZMORIG?: number;
  NX?: number;
  NY?: number;
  NZ?: number;
  DENSITY: number;
  ROCKCODE?: number;
  AU: number;
  CU: number;
  NPVMASS: number;
  NPVVOL: number;
  NPVREVEN?: number;
  NPVPCOST?: number;
  NPVMCOST?: number;
  NPVPROFT?: number;
  NPVPDEST: BlockDestination | string;
  MRAU?: number;
  MRCU?: number;
  UPT_PIT?: number;
  UPT_SEQ?: number;
  GRA_PIT?: number;
  GRA_SEQ?: number;
  PSB_PIT: number;
  PSB_SEQ?: number;
  SCH_YEAR?: number;
  SCHDAY?: number;
  SCH_SEQ?: number;
  MFO_YEAR?: string;
  MFO_SEQ?: string;
}

export interface BlockModelBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface ReconciliationMetric {
  tolerance: number;
  maxAbsoluteError: number;
  rowsOutsideTolerance: number;
}

export interface BlockModelQualityReport {
  sourceName: string;
  sourcePath: string;
  status: BlockModelQualityStatus;
  qualityScore: number;
  headerCount: number;
  recognizedHeaderCount: number;
  unknownHeaders: string[];
  missingRequiredHeaders: string[];
  missingRecommendedHeaders: string[];
  duplicateHeaders: string[];
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  duplicateBlockKeys: number;
  duplicateIjkCount: number;
  nonPositiveDimensionRows: number;
  nonPositiveDensityRows: number;
  unknownDestinationRows: number;
  invalidPushbackRows: number;
  outsideActivePhaseScopeRows: number;
  issueCounts: Record<BlockModelIssueSeverity, number>;
  issues: BlockModelIssue[];
  truncatedIssueCount: number;
  countsByPhase: Record<string, number>;
  countsByDestination: Record<string, number>;
  countsByScheduleYear: Record<string, number>;
  bounds: BlockModelBounds | null;
  volumeReconciliation: ReconciliationMetric;
  massReconciliation: ReconciliationMetric;
  profitReconciliation: ReconciliationMetric;
}

export interface BlockModelDataset {
  sourceName: string;
  sourcePath: string;
  loadedAtIso: string;
  headers: string[];
  rows: NormalizedBlockModelRow[];
  report: BlockModelQualityReport;
}

export interface BlockModelCrossReconciliation {
  status: BlockModelQualityStatus;
  expectedControlRows: number;
  actualControlRows: number;
  matchedRows: number;
  missingFromControl: number;
  extraInControl: number;
  valueMismatchRows: number;
  exactSubset: boolean;
}

export interface BlockModelCatalog {
  contractVersion: string;
  primary: BlockModelDataset;
  control: BlockModelDataset;
  reconciliation: BlockModelCrossReconciliation;
}

export interface BlockModelManifestFile {
  fileName: string;
  expectedPathCandidates: string[];
}

export interface BlockModelManifest {
  contractVersion: string;
  primaryModel: BlockModelManifestFile;
  controlModel: BlockModelManifestFile;
}

interface ParseOptions {
  sourceName: string;
  sourcePath?: string;
  issueLimit?: number;
}

const NUMERIC_FIELDS = new Set(
  BLOCK_MODEL_FIELDS
    .filter((definition) => definition.dataType !== 'string')
    .map((definition) => definition.field),
);

const REQUIRED_NUMERIC_FIELDS = new Set(
  REQUIRED_BLOCK_MODEL_FIELDS.filter((field) => field !== 'NPVPDEST'),
);

const INTEGER_FIELDS = new Set(
  BLOCK_MODEL_FIELDS
    .filter((definition) => definition.dataType === 'integer')
    .map((definition) => definition.field),
);

const VOLUME_TOLERANCE = 0.003;
const MASS_TOLERANCE = 0.000001;
const PROFIT_TOLERANCE = 0.000001;

function parseCsvMatrix(text: string): string[][] {
  const matrix: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === ',' && !quoted) {
      row.push(value);
      value = '';
      continue;
    }
    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(value);
      if (row.some((entry) => entry.length > 0)) matrix.push(row);
      row = [];
      value = '';
      continue;
    }
    value += character;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((entry) => entry.length > 0)) matrix.push(row);
  }
  return matrix;
}

function normalizeHeader(value: string): string {
  return value.trim().toUpperCase();
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function finiteNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stableValue(value: number | string | undefined): string {
  if (typeof value === 'number') return Number(value.toFixed(10)).toString();
  return value ?? '';
}

function rowFingerprint(row: NormalizedBlockModelRow): string {
  return BLOCK_MODEL_FIELDS
    .map((definition) =>
      stableValue(row[definition.field as keyof NormalizedBlockModelRow] as number | string | undefined),
    )
    .join('\u001f');
}

function calculateStatus(
  missingRequiredHeaders: string[],
  invalidRowCount: number,
  duplicateBlockKeys: number,
  warningCount: number,
): BlockModelQualityStatus {
  if (missingRequiredHeaders.length > 0 || invalidRowCount > 0 || duplicateBlockKeys > 0) {
    return 'fail';
  }
  return warningCount > 0 ? 'warning' : 'pass';
}

function calculateQualityScore(
  status: BlockModelQualityStatus,
  rowCount: number,
  invalidRowCount: number,
  warningCount: number,
): number {
  if (rowCount === 0) return 0;
  const invalidPenalty = (invalidRowCount / rowCount) * 70;
  const warningPenalty = Math.min(20, (warningCount / rowCount) * 100);
  const statusPenalty = status === 'fail' ? 10 : 0;
  return Math.max(0, Math.min(100, 100 - invalidPenalty - warningPenalty - statusPenalty));
}

function blankMetric(tolerance: number): ReconciliationMetric {
  return { tolerance, maxAbsoluteError: 0, rowsOutsideTolerance: 0 };
}

export function parseBlockModelCsv(text: string, options: ParseOptions): BlockModelDataset {
  const matrix = parseCsvMatrix(text);
  const rawHeaders = matrix[0] ?? [];
  const headers = rawHeaders.map(normalizeHeader);
  const issueLimit = options.issueLimit ?? 250;
  const issues: BlockModelIssue[] = [];
  const issueCounts: Record<BlockModelIssueSeverity, number> = {
    error: 0,
    warning: 0,
    info: 0,
  };

  const addIssue = (issue: BlockModelIssue): void => {
    issueCounts[issue.severity] += 1;
    if (issues.length < issueLimit) issues.push(issue);
  };

  const duplicateHeaders = headers.filter(
    (header, index) => headers.indexOf(header) !== index,
  );
  for (const header of [...new Set(duplicateHeaders)]) {
    addIssue({
      code: 'DUPLICATE_HEADER',
      severity: 'error',
      message: `El encabezado ${header} aparece más de una vez.`,
      field: header,
    });
  }

  const headerResult = validateBlockModelHeaders(headers);
  for (const field of headerResult.missingRequired) {
    addIssue({
      code: 'MISSING_REQUIRED_HEADER',
      severity: 'error',
      message: `Falta el campo obligatorio ${field}.`,
      field,
    });
  }
  for (const field of headerResult.missingRecommended) {
    addIssue({
      code: 'MISSING_RECOMMENDED_HEADER',
      severity: 'warning',
      message: `Falta el campo recomendado ${field}.`,
      field,
    });
  }
  for (const field of headerResult.unknown) {
    addIssue({
      code: 'UNKNOWN_HEADER',
      severity: 'info',
      message: `El campo ${field} se conserva fuera del contrato 8.1.`,
      field,
    });
  }

  const rows: NormalizedBlockModelRow[] = [];
  const blockKeys = new Set<string>();
  const ijkValues = new Set<number>();
  const countsByPhase: Record<string, number> = {};
  const countsByDestination: Record<string, number> = {};
  const countsByScheduleYear: Record<string, number> = {};
  let duplicateBlockKeys = 0;
  let duplicateIjkCount = 0;
  let invalidRowCount = 0;
  let nonPositiveDimensionRows = 0;
  let nonPositiveDensityRows = 0;
  let unknownDestinationRows = 0;
  let invalidPushbackRows = 0;
  let outsideActivePhaseScopeRows = 0;
  let bounds: BlockModelBounds | null = null;
  const volumeReconciliation = blankMetric(VOLUME_TOLERANCE);
  const massReconciliation = blankMetric(MASS_TOLERANCE);
  const profitReconciliation = blankMetric(PROFIT_TOLERANCE);

  if (headerResult.missingRequired.length === 0 && duplicateHeaders.length === 0) {
    for (let sourceIndex = 1; sourceIndex < matrix.length; sourceIndex += 1) {
      const rawValues = matrix[sourceIndex];
      const rowNumber = sourceIndex + 1;
      const raw: Record<string, string> = {};
      headers.forEach((header, index) => {
        raw[header] = (rawValues[index] ?? '').trim();
      });

      let invalid = false;
      const numeric: Record<string, number | undefined> = {};
      for (const field of NUMERIC_FIELDS) {
        const value = finiteNumber(raw[field] ?? '');
        if (value === null) {
          if (REQUIRED_NUMERIC_FIELDS.has(field)) {
            invalid = true;
            addIssue({
              code: 'INVALID_REQUIRED_NUMBER',
              severity: 'error',
              message: `Valor numérico obligatorio inválido en ${field}.`,
              rowNumber,
              field,
              value: raw[field],
            });
          } else if ((raw[field] ?? '') !== '') {
            addIssue({
              code: 'INVALID_OPTIONAL_NUMBER',
              severity: 'warning',
              message: `Valor numérico opcional inválido en ${field}.`,
              rowNumber,
              field,
              value: raw[field],
            });
          }
          numeric[field] = undefined;
        } else {
          numeric[field] = value;
          if (INTEGER_FIELDS.has(field) && !Number.isInteger(value)) {
            addIssue({
              code: 'NON_INTEGER_VALUE',
              severity: 'warning',
              message: `${field} esperaba un entero.`,
              rowNumber,
              field,
              value: raw[field],
            });
          }
        }
      }

      const destination = raw.NPVPDEST ?? '';
      if (destination === '') {
        invalid = true;
        addIssue({
          code: 'MISSING_DESTINATION',
          severity: 'error',
          message: 'NPVPDEST no puede estar vacío.',
          rowNumber,
          field: 'NPVPDEST',
        });
      }

      const dimensions = [numeric.XINC, numeric.YINC, numeric.ZINC];
      if (dimensions.some((value) => value !== undefined && value <= 0)) {
        invalid = true;
        nonPositiveDimensionRows += 1;
        addIssue({
          code: 'NON_POSITIVE_DIMENSION',
          severity: 'error',
          message: 'Las dimensiones del bloque deben ser positivas.',
          rowNumber,
        });
      }
      if (numeric.DENSITY !== undefined && numeric.DENSITY <= 0) {
        invalid = true;
        nonPositiveDensityRows += 1;
        addIssue({
          code: 'NON_POSITIVE_DENSITY',
          severity: 'error',
          message: 'La densidad debe ser positiva.',
          rowNumber,
          field: 'DENSITY',
          value: raw.DENSITY,
        });
      }
      if (numeric.NPVVOL !== undefined && numeric.NPVVOL <= 0) invalid = true;
      if (numeric.NPVMASS !== undefined && numeric.NPVMASS <= 0) invalid = true;

      const pushback = numeric.PSB_PIT;
      if (
        pushback === undefined ||
        !Number.isInteger(pushback) ||
        !OBSERVED_PUSHBACKS.includes(pushback as (typeof OBSERVED_PUSHBACKS)[number])
      ) {
        invalid = true;
        invalidPushbackRows += 1;
        addIssue({
          code: 'INVALID_PUSHBACK',
          severity: 'error',
          message: 'PSB_PIT debe ser un pushback entero entre 1 y 9.',
          rowNumber,
          field: 'PSB_PIT',
          value: raw.PSB_PIT,
        });
      } else if (!SUPPORTED_PHASES.includes(pushback as (typeof SUPPORTED_PHASES)[number])) {
        outsideActivePhaseScopeRows += 1;
      }

      if (classifyDestination(destination) === 'unknown') {
        unknownDestinationRows += 1;
        addIssue({
          code: 'UNKNOWN_DESTINATION',
          severity: 'warning',
          message: `Destino no reconocido: ${destination}.`,
          rowNumber,
          field: 'NPVPDEST',
          value: destination,
        });
      }

      if (invalid) {
        invalidRowCount += 1;
        continue;
      }

      const row: NormalizedBlockModelRow = {
        blockKey: '',
        IJK: numeric.IJK,
        XC: numeric.XC!,
        YC: numeric.YC!,
        ZC: numeric.ZC!,
        XINC: numeric.XINC!,
        YINC: numeric.YINC!,
        ZINC: numeric.ZINC!,
        XMORIG: numeric.XMORIG,
        YMORIG: numeric.YMORIG,
        ZMORIG: numeric.ZMORIG,
        NX: numeric.NX,
        NY: numeric.NY,
        NZ: numeric.NZ,
        DENSITY: numeric.DENSITY!,
        ROCKCODE: numeric.ROCKCODE,
        AU: numeric.AU!,
        CU: numeric.CU!,
        NPVMASS: numeric.NPVMASS!,
        NPVVOL: numeric.NPVVOL!,
        NPVREVEN: numeric.NPVREVEN,
        NPVPCOST: numeric.NPVPCOST,
        NPVMCOST: numeric.NPVMCOST,
        NPVPROFT: numeric.NPVPROFT,
        NPVPDEST: destination,
        MRAU: numeric.MRAU,
        MRCU: numeric.MRCU,
        UPT_PIT: numeric.UPT_PIT,
        UPT_SEQ: numeric.UPT_SEQ,
        GRA_PIT: numeric.GRA_PIT,
        GRA_SEQ: numeric.GRA_SEQ,
        PSB_PIT: pushback!,
        PSB_SEQ: numeric.PSB_SEQ,
        SCH_YEAR: numeric.SCH_YEAR,
        SCHDAY: numeric.SCHDAY,
        SCH_SEQ: numeric.SCH_SEQ,
        MFO_YEAR: raw.MFO_YEAR || undefined,
        MFO_SEQ: raw.MFO_SEQ || undefined,
      };
      row.blockKey = createBlockKey(row);

      if (blockKeys.has(row.blockKey)) {
        duplicateBlockKeys += 1;
        invalidRowCount += 1;
        addIssue({
          code: 'DUPLICATE_BLOCK_KEY',
          severity: 'error',
          message: `Clave de bloque duplicada: ${row.blockKey}.`,
          rowNumber,
        });
        continue;
      }
      blockKeys.add(row.blockKey);

      if (row.IJK !== undefined) {
        if (ijkValues.has(row.IJK)) duplicateIjkCount += 1;
        ijkValues.add(row.IJK);
      }

      const volumeError = Math.abs(row.NPVVOL - derivedBlockVolume(row));
      volumeReconciliation.maxAbsoluteError = Math.max(
        volumeReconciliation.maxAbsoluteError,
        volumeError,
      );
      if (volumeError > VOLUME_TOLERANCE) volumeReconciliation.rowsOutsideTolerance += 1;

      const massError = Math.abs(row.NPVMASS - derivedBlockMass(row));
      massReconciliation.maxAbsoluteError = Math.max(
        massReconciliation.maxAbsoluteError,
        massError,
      );
      if (massError > MASS_TOLERANCE) massReconciliation.rowsOutsideTolerance += 1;

      const derivedProfit = derivedBlockProfit(row);
      if (derivedProfit !== null && row.NPVPROFT !== undefined) {
        const profitError = Math.abs(row.NPVPROFT - derivedProfit);
        profitReconciliation.maxAbsoluteError = Math.max(
          profitReconciliation.maxAbsoluteError,
          profitError,
        );
        if (profitError > PROFIT_TOLERANCE) profitReconciliation.rowsOutsideTolerance += 1;
      }

      increment(countsByPhase, String(row.PSB_PIT));
      increment(countsByDestination, row.NPVPDEST);
      if (row.SCH_YEAR !== undefined) increment(countsByScheduleYear, String(row.SCH_YEAR));

      if (!bounds) {
        bounds = {
          minX: row.XC,
          maxX: row.XC,
          minY: row.YC,
          maxY: row.YC,
          minZ: row.ZC,
          maxZ: row.ZC,
        };
      } else {
        bounds.minX = Math.min(bounds.minX, row.XC);
        bounds.maxX = Math.max(bounds.maxX, row.XC);
        bounds.minY = Math.min(bounds.minY, row.YC);
        bounds.maxY = Math.max(bounds.maxY, row.YC);
        bounds.minZ = Math.min(bounds.minZ, row.ZC);
        bounds.maxZ = Math.max(bounds.maxZ, row.ZC);
      }

      rows.push(row);
    }
  } else {
    invalidRowCount = Math.max(0, matrix.length - 1);
  }

  for (const [metric, label] of [
    [volumeReconciliation, 'volumen'],
    [massReconciliation, 'masa'],
    [profitReconciliation, 'beneficio'],
  ] as const) {
    if (metric.rowsOutsideTolerance > 0) {
      addIssue({
        code: 'RECONCILIATION_OUTSIDE_TOLERANCE',
        severity: 'warning',
        message: `${metric.rowsOutsideTolerance} filas exceden la tolerancia de ${label}.`,
      });
    }
  }

  const rowCount = Math.max(0, matrix.length - 1);
  const status = calculateStatus(
    headerResult.missingRequired,
    invalidRowCount,
    duplicateBlockKeys,
    issueCounts.warning,
  );

  const report: BlockModelQualityReport = {
    sourceName: options.sourceName,
    sourcePath: options.sourcePath ?? options.sourceName,
    status,
    qualityScore: calculateQualityScore(
      status,
      rowCount,
      invalidRowCount,
      issueCounts.warning,
    ),
    headerCount: headers.length,
    recognizedHeaderCount: headerResult.recognized.length,
    unknownHeaders: headerResult.unknown,
    missingRequiredHeaders: headerResult.missingRequired,
    missingRecommendedHeaders: RECOMMENDED_BLOCK_MODEL_FIELDS.filter(
      (field) => !headers.includes(field),
    ),
    duplicateHeaders: [...new Set(duplicateHeaders)],
    rowCount,
    validRowCount: rows.length,
    invalidRowCount,
    duplicateBlockKeys,
    duplicateIjkCount,
    nonPositiveDimensionRows,
    nonPositiveDensityRows,
    unknownDestinationRows,
    invalidPushbackRows,
    outsideActivePhaseScopeRows,
    issueCounts,
    issues,
    truncatedIssueCount: Math.max(
      0,
      issueCounts.error + issueCounts.warning + issueCounts.info - issues.length,
    ),
    countsByPhase,
    countsByDestination,
    countsByScheduleYear,
    bounds,
    volumeReconciliation,
    massReconciliation,
    profitReconciliation,
  };

  return {
    sourceName: options.sourceName,
    sourcePath: options.sourcePath ?? options.sourceName,
    loadedAtIso: new Date().toISOString(),
    headers,
    rows,
    report,
  };
}

export async function loadBlockModelFromUrl(
  url: string,
  sourceName = url.split('/').pop() ?? url,
): Promise<BlockModelDataset> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${url}: HTTP ${response.status}.`);
  }
  return parseBlockModelCsv(await response.text(), {
    sourceName,
    sourcePath: url,
  });
}

export async function loadBlockModelFromFile(file: File): Promise<BlockModelDataset> {
  return parseBlockModelCsv(await file.text(), {
    sourceName: file.name,
    sourcePath: `file://${file.name}`,
  });
}

function candidateToPublicUrl(candidate: string): string {
  const normalized = candidate.replace(/\\/g, '/').replace(/^\.\//, '');
  if (normalized.startsWith('public/')) return `/${normalized.slice('public/'.length)}`;
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

async function loadFirstAvailable(
  definition: BlockModelManifestFile,
): Promise<BlockModelDataset> {
  const attempted: string[] = [];
  for (const candidate of definition.expectedPathCandidates) {
    const url = candidateToPublicUrl(candidate);
    if (attempted.includes(url)) continue;
    attempted.push(url);
    try {
      return await loadBlockModelFromUrl(url, definition.fileName);
    } catch {
      // Continúa con la siguiente ruta declarada por el manifiesto.
    }
  }
  throw new Error(
    `No se encontró ${definition.fileName}. Rutas intentadas: ${attempted.join(', ')}.`,
  );
}

export function reconcileBlockModelCatalog(
  primary: BlockModelDataset,
  control: BlockModelDataset,
): BlockModelCrossReconciliation {
  const expectedRows = primary.rows.filter((row) => row.PSB_PIT <= 3);
  const expected = new Map(
    expectedRows.map((row) => [row.blockKey, rowFingerprint(row)]),
  );
  const actual = new Map(
    control.rows.map((row) => [row.blockKey, rowFingerprint(row)]),
  );

  let matchedRows = 0;
  let missingFromControl = 0;
  let valueMismatchRows = 0;
  for (const [key, fingerprint] of expected) {
    const controlFingerprint = actual.get(key);
    if (controlFingerprint === undefined) missingFromControl += 1;
    else if (controlFingerprint !== fingerprint) valueMismatchRows += 1;
    else matchedRows += 1;
  }

  let extraInControl = 0;
  for (const key of actual.keys()) {
    if (!expected.has(key)) extraInControl += 1;
  }

  const exactSubset =
    expected.size === actual.size &&
    missingFromControl === 0 &&
    extraInControl === 0 &&
    valueMismatchRows === 0;

  return {
    status: exactSubset ? 'pass' : 'fail',
    expectedControlRows: expected.size,
    actualControlRows: actual.size,
    matchedRows,
    missingFromControl,
    extraInControl,
    valueMismatchRows,
    exactSubset,
  };
}

export async function loadBlockModelCatalog(
  manifestUrl = '/data/block-model/block-model-manifest.json',
): Promise<BlockModelCatalog> {
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error(`No se pudo cargar el manifiesto del modelo: HTTP ${response.status}.`);
  }
  const manifest = (await response.json()) as BlockModelManifest;
  const [primary, control] = await Promise.all([
    loadFirstAvailable(manifest.primaryModel),
    loadFirstAvailable(manifest.controlModel),
  ]);
  return {
    contractVersion: manifest.contractVersion,
    primary,
    control,
    reconciliation: reconcileBlockModelCatalog(primary, control),
  };
}
