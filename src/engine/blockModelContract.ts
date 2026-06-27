export const BLOCK_MODEL_CONTRACT_VERSION = '8.1.0';

export const PRIMARY_BLOCK_MODEL_FILE = 'simmodPL.csv';
export const CONTROL_BLOCK_MODEL_FILE = 'OPDemo3PB.csv';

export const SUPPORTED_PHASES = [1, 2, 3, 4, 5, 6] as const;
export const OBSERVED_PUSHBACKS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type SupportedPhase = (typeof SUPPORTED_PHASES)[number];
export type ObservedPushback = (typeof OBSERVED_PUSHBACKS)[number];
export type BlockDestination = '_DUMP_' | 'Mill' | 'Leach';
export type DestinationClass = 'waste' | 'process';
export type FieldRequirement = 'required' | 'recommended' | 'audit-only' | 'reserved';
export type UnitConfidence = 'confirmed-by-reconciliation' | 'inferred' | 'unconfirmed';

export interface BlockModelFieldDefinition {
  field: string;
  label: string;
  role: string;
  requirement: FieldRequirement;
  dataType: 'number' | 'integer' | 'string';
  unit: string;
  unitConfidence: UnitConfidence;
  notes: string;
}

export interface BlockModelRowLike {
  IJK?: number;
  XC: number;
  YC: number;
  ZC: number;
  XINC: number;
  YINC: number;
  ZINC: number;
  DENSITY: number;
  AU: number;
  CU: number;
  NPVMASS: number;
  NPVVOL: number;
  NPVREVEN?: number;
  NPVPCOST?: number;
  NPVMCOST?: number;
  NPVPROFT?: number;
  NPVPDEST: BlockDestination | string;
  ROCKCODE?: number;
  PSB_PIT: number;
  PSB_SEQ?: number;
  SCH_YEAR?: number;
  SCHDAY?: number;
  SCH_SEQ?: number;
  [field: string]: number | string | undefined;
}

export interface HeaderContractResult {
  valid: boolean;
  missingRequired: string[];
  missingRecommended: string[];
  recognized: string[];
  unknown: string[];
}

export const BLOCK_MODEL_FIELDS: readonly BlockModelFieldDefinition[] = [
  { field: 'IJK', label: 'Índice de celda padre', role: 'Referencia Datamine; no usar como ID único', requirement: 'recommended', dataType: 'integer', unit: 'index', unitConfidence: 'inferred', notes: 'Se repite cuando existen subbloques.' },
  { field: 'XC', label: 'Centro X', role: 'Coordenada del centro del bloque', requirement: 'required', dataType: 'number', unit: 'm', unitConfidence: 'inferred', notes: 'Parte de la clave compuesta.' },
  { field: 'YC', label: 'Centro Y', role: 'Coordenada del centro del bloque', requirement: 'required', dataType: 'number', unit: 'm', unitConfidence: 'inferred', notes: 'Parte de la clave compuesta.' },
  { field: 'ZC', label: 'Centro Z', role: 'Elevación del centro del bloque', requirement: 'required', dataType: 'number', unit: 'm', unitConfidence: 'inferred', notes: 'Base para asignación posterior a banco.' },
  { field: 'XINC', label: 'Dimensión X', role: 'Longitud real del bloque o subbloque', requirement: 'required', dataType: 'number', unit: 'm', unitConfidence: 'confirmed-by-reconciliation', notes: 'Debe ser positiva.' },
  { field: 'YINC', label: 'Dimensión Y', role: 'Ancho real del bloque o subbloque', requirement: 'required', dataType: 'number', unit: 'm', unitConfidence: 'confirmed-by-reconciliation', notes: 'Debe ser positiva.' },
  { field: 'ZINC', label: 'Dimensión Z', role: 'Altura real del bloque o subbloque', requirement: 'required', dataType: 'number', unit: 'm', unitConfidence: 'confirmed-by-reconciliation', notes: 'Debe ser positiva y no se sustituye por la altura nominal.' },
  { field: 'XMORIG', label: 'Origen X', role: 'Metadato de la malla madre', requirement: 'recommended', dataType: 'number', unit: 'm', unitConfidence: 'inferred', notes: 'Útil para reconciliación de grilla.' },
  { field: 'YMORIG', label: 'Origen Y', role: 'Metadato de la malla madre', requirement: 'recommended', dataType: 'number', unit: 'm', unitConfidence: 'inferred', notes: 'Útil para reconciliación de grilla.' },
  { field: 'ZMORIG', label: 'Origen Z', role: 'Metadato de la malla madre', requirement: 'recommended', dataType: 'number', unit: 'm', unitConfidence: 'inferred', notes: 'Útil para reconciliación de grilla.' },
  { field: 'NX', label: 'Número de celdas X', role: 'Metadato de la malla madre', requirement: 'recommended', dataType: 'integer', unit: 'count', unitConfidence: 'inferred', notes: 'No es dimensión de bloque.' },
  { field: 'NY', label: 'Número de celdas Y', role: 'Metadato de la malla madre', requirement: 'recommended', dataType: 'integer', unit: 'count', unitConfidence: 'inferred', notes: 'No es dimensión de bloque.' },
  { field: 'NZ', label: 'Número de celdas Z', role: 'Metadato de la malla madre', requirement: 'recommended', dataType: 'integer', unit: 'count', unitConfidence: 'inferred', notes: 'No es dimensión de bloque.' },
  { field: 'DENSITY', label: 'Densidad', role: 'Conversión de volumen a masa', requirement: 'required', dataType: 'number', unit: 't/m³', unitConfidence: 'confirmed-by-reconciliation', notes: 'Debe ser positiva.' },
  { field: 'ROCKCODE', label: 'Código litológico', role: 'Dominio geológico o material', requirement: 'recommended', dataType: 'integer', unit: 'code', unitConfidence: 'inferred', notes: 'Requiere diccionario externo para interpretación.' },
  { field: 'AU', label: 'Ley de oro', role: 'Variable de ley', requirement: 'required', dataType: 'number', unit: 'unidad por confirmar', unitConfidence: 'unconfirmed', notes: 'No convertir metal contenido hasta confirmar unidad.' },
  { field: 'CU', label: 'Ley de cobre', role: 'Variable de ley', requirement: 'required', dataType: 'number', unit: 'unidad por confirmar', unitConfidence: 'unconfirmed', notes: 'No asumir porcentaje sin diccionario.' },
  { field: 'NPVMASS', label: 'Masa del bloque', role: 'Tonelaje oficial del inventario', requirement: 'required', dataType: 'number', unit: 't', unitConfidence: 'confirmed-by-reconciliation', notes: 'Se audita contra NPVVOL × DENSITY.' },
  { field: 'NPVVOL', label: 'Volumen del bloque', role: 'Volumen oficial del inventario', requirement: 'required', dataType: 'number', unit: 'm³', unitConfidence: 'confirmed-by-reconciliation', notes: 'Se audita contra XINC × YINC × ZINC.' },
  { field: 'NPVREVEN', label: 'Ingreso del bloque', role: 'Referencia económica preexistente', requirement: 'audit-only', dataType: 'number', unit: 'moneda por confirmar', unitConfidence: 'unconfirmed', notes: 'No reemplaza el motor económico DSRL.' },
  { field: 'NPVPCOST', label: 'Costo de proceso', role: 'Referencia económica preexistente', requirement: 'audit-only', dataType: 'number', unit: 'moneda por confirmar', unitConfidence: 'unconfirmed', notes: 'Se usa para reconciliación, no como supuesto oficial.' },
  { field: 'NPVMCOST', label: 'Costo de mina', role: 'Referencia económica preexistente', requirement: 'audit-only', dataType: 'number', unit: 'moneda por confirmar', unitConfidence: 'unconfirmed', notes: 'Se usa para reconciliación, no como supuesto oficial.' },
  { field: 'NPVPROFT', label: 'Beneficio del bloque', role: 'Referencia económica preexistente', requirement: 'audit-only', dataType: 'number', unit: 'moneda por confirmar', unitConfidence: 'unconfirmed', notes: 'Se audita como ingreso menos costos.' },
  { field: 'NPVPDEST', label: 'Destino del bloque', role: 'Clasificación física de material programado', requirement: 'required', dataType: 'string', unit: 'category', unitConfidence: 'confirmed-by-reconciliation', notes: '_DUMP_=waste; Mill y Leach=process.' },
  { field: 'MRAU', label: 'Marginal revenue Au', role: 'Campo económico reservado', requirement: 'reserved', dataType: 'number', unit: 'por confirmar', unitConfidence: 'unconfirmed', notes: 'No usar hasta contar con diccionario.' },
  { field: 'MRCU', label: 'Marginal revenue Cu', role: 'Campo económico reservado', requirement: 'reserved', dataType: 'number', unit: 'por confirmar', unitConfidence: 'unconfirmed', notes: 'No usar hasta contar con diccionario.' },
  { field: 'UPT_PIT', label: 'Ultimate pit', role: 'Campo de optimización reservado', requirement: 'reserved', dataType: 'integer', unit: 'index', unitConfidence: 'unconfirmed', notes: 'No confundir con PSB_PIT.' },
  { field: 'UPT_SEQ', label: 'Ultimate pit sequence', role: 'Secuencia reservada', requirement: 'reserved', dataType: 'integer', unit: 'sequence', unitConfidence: 'unconfirmed', notes: 'No usar en 8.1.' },
  { field: 'GRA_PIT', label: 'Gráfico/pit de referencia', role: 'Campo de optimización reservado', requirement: 'reserved', dataType: 'integer', unit: 'index', unitConfidence: 'unconfirmed', notes: 'Semántica pendiente.' },
  { field: 'GRA_SEQ', label: 'Secuencia GRA', role: 'Secuencia reservada', requirement: 'reserved', dataType: 'integer', unit: 'sequence', unitConfidence: 'unconfirmed', notes: 'Semántica pendiente.' },
  { field: 'PSB_PIT', label: 'Pushback incremental', role: 'Asignación de fase del bloque', requirement: 'required', dataType: 'integer', unit: 'phase', unitConfidence: 'inferred', notes: 'Se tratará como fase incremental; confirmación semántica Datamine pendiente.' },
  { field: 'PSB_SEQ', label: 'Secuencia dentro del pushback', role: 'Orden interno de fase', requirement: 'recommended', dataType: 'integer', unit: 'sequence', unitConfidence: 'inferred', notes: 'No define por sí sola el año de minado.' },
  { field: 'SCH_YEAR', label: 'Año programado', role: 'Secuenciamiento temporal existente', requirement: 'recommended', dataType: 'integer', unit: 'year index', unitConfidence: 'inferred', notes: 'Observado de 1 a 11.' },
  { field: 'SCHDAY', label: 'Día programado', role: 'Secuenciamiento temporal existente', requirement: 'recommended', dataType: 'integer', unit: 'day index', unitConfidence: 'inferred', notes: 'Referencia del calendario del modelo.' },
  { field: 'SCH_SEQ', label: 'Secuencia programada', role: 'Orden temporal existente', requirement: 'recommended', dataType: 'integer', unit: 'sequence', unitConfidence: 'inferred', notes: 'Útil en etapa de secuenciamiento.' },
  { field: 'MFO_YEAR', label: 'Año MFO', role: 'Campo reservado', requirement: 'reserved', dataType: 'string', unit: 'por confirmar', unitConfidence: 'unconfirmed', notes: 'Contiene guiones en el archivo observado.' },
  { field: 'MFO_SEQ', label: 'Secuencia MFO', role: 'Campo reservado', requirement: 'reserved', dataType: 'string', unit: 'por confirmar', unitConfidence: 'unconfirmed', notes: 'Contiene guiones en el archivo observado.' },
] as const;

export const REQUIRED_BLOCK_MODEL_FIELDS = BLOCK_MODEL_FIELDS
  .filter((field) => field.requirement === 'required')
  .map((field) => field.field);

export const RECOMMENDED_BLOCK_MODEL_FIELDS = BLOCK_MODEL_FIELDS
  .filter((field) => field.requirement === 'recommended')
  .map((field) => field.field);

export const DESTINATION_CLASS_BY_VALUE: Readonly<Record<BlockDestination, DestinationClass>> = {
  _DUMP_: 'waste',
  Mill: 'process',
  Leach: 'process',
};

function stableNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return Number(value.toFixed(6)).toString();
}

export function createBlockKey(row: Pick<BlockModelRowLike, 'XC' | 'YC' | 'ZC' | 'XINC' | 'YINC' | 'ZINC'>): string {
  return [row.XC, row.YC, row.ZC, row.XINC, row.YINC, row.ZINC]
    .map(stableNumber)
    .join('|');
}

export function classifyDestination(destination: string): DestinationClass | 'unknown' {
  return DESTINATION_CLASS_BY_VALUE[destination as BlockDestination] ?? 'unknown';
}

export function isSupportedPhase(value: number): value is SupportedPhase {
  return SUPPORTED_PHASES.includes(value as SupportedPhase);
}

export function cumulativePhasesForPushback(pushback: number): SupportedPhase[] {
  return SUPPORTED_PHASES.filter((phase) => phase <= pushback);
}

export function derivedBlockVolume(row: Pick<BlockModelRowLike, 'XINC' | 'YINC' | 'ZINC'>): number {
  return row.XINC * row.YINC * row.ZINC;
}

export function derivedBlockMass(row: Pick<BlockModelRowLike, 'NPVVOL' | 'DENSITY'>): number {
  return row.NPVVOL * row.DENSITY;
}

export function derivedBlockProfit(row: Pick<BlockModelRowLike, 'NPVREVEN' | 'NPVPCOST' | 'NPVMCOST'>): number | null {
  if (
    row.NPVREVEN === undefined ||
    row.NPVPCOST === undefined ||
    row.NPVMCOST === undefined
  ) return null;
  return row.NPVREVEN - row.NPVPCOST - row.NPVMCOST;
}

export function validateBlockModelHeaders(headers: readonly string[]): HeaderContractResult {
  const normalized = new Set(headers.map((header) => header.trim().toUpperCase()));
  const recognizedFields = new Set(BLOCK_MODEL_FIELDS.map((field) => field.field));
  const missingRequired = REQUIRED_BLOCK_MODEL_FIELDS.filter((field) => !normalized.has(field));
  const missingRecommended = RECOMMENDED_BLOCK_MODEL_FIELDS.filter((field) => !normalized.has(field));
  const recognized = [...normalized].filter((field) => recognizedFields.has(field));
  const unknown = [...normalized].filter((field) => !recognizedFields.has(field));

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    missingRecommended,
    recognized,
    unknown,
  };
}

export const BLOCK_MODEL_SEMANTIC_GUARDRAILS = {
  inventoryTerm: 'inventario dentro del diseño',
  prohibitedReserveClaim: true,
  gradeUnitsConfirmed: false,
  currencyUnitsConfirmed: false,
  pushbackSemanticsConfirmedByExternalDictionary: false,
  useOfficialVolumeField: 'NPVVOL',
  useOfficialMassField: 'NPVMASS',
  blockIdentity: 'XC|YC|ZC|XINC|YINC|ZINC',
  parentGridReference: 'IJK',
  activePhaseScope: SUPPORTED_PHASES,
} as const;
