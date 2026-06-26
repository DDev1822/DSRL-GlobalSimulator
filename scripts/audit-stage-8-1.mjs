import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const passes = [];
const read = (path) => {
  if (!existsSync(path)) {
    failures.push(`Falta ${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
};
const requireToken = (source, token, label) => {
  if (source.includes(token)) {
    passes.push(label);
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL: ${label}`);
  }
};

const contract = read('src/engine/blockModelContract.ts');
const manifest = read('public/data/block-model/block-model-manifest.json');
const readme = read('docs/stage-8-1/README.md');
const dictionary = read('docs/stage-8-1/data-dictionary.md');
const decisions = read('docs/stage-8-1/decision-record.md');

for (const token of [
  'BLOCK_MODEL_CONTRACT_VERSION',
  'PRIMARY_BLOCK_MODEL_FILE',
  'CONTROL_BLOCK_MODEL_FILE',
  'SUPPORTED_PHASES',
  'OBSERVED_PUSHBACKS',
  'BLOCK_MODEL_FIELDS',
  'REQUIRED_BLOCK_MODEL_FIELDS',
  'createBlockKey',
  'classifyDestination',
  'cumulativePhasesForPushback',
  'derivedBlockVolume',
  'derivedBlockMass',
  'derivedBlockProfit',
  'validateBlockModelHeaders',
  'prohibitedReserveClaim',
  'gradeUnitsConfirmed: false',
  "blockIdentity: 'XC|YC|ZC|XINC|YINC|ZINC'",
]) requireToken(contract, token, `block contract: ${token}`);

for (const token of [
  'simmodPL.csv',
  'OPDemo3PB.csv',
  '49989',
  '18981',
  '34845',
  'PSB_PIT',
  'NPVVOL',
  'NPVMASS',
  'reserveClaimAllowed',
  'unconfirmed',
]) requireToken(manifest, token, `block manifest: ${token}`);

for (const token of [
  'Etapa 8.1',
  'contrato de datos',
  'inventario dentro del diseño',
  'F1–F6',
  'Etapa 8.2',
]) requireToken(readme, token, `readme 8.1: ${token}`);

for (const token of [
  'XC',
  'DENSITY',
  'AU',
  'CU',
  'NPVMASS',
  'NPVVOL',
  'NPVPDEST',
  'PSB_PIT',
  'IJK',
]) requireToken(dictionary, token, `data dictionary: ${token}`);

for (const token of [
  'ADR-8.1-001',
  'modelo maestro',
  'modelo de control',
  'fase incremental',
  'No se declara reserva',
]) requireToken(decisions, token, `decision record: ${token}`);

console.log('\nSTAGE 8.1 AUDIT SUMMARY');
console.log(
  JSON.stringify(
    {
      status: failures.length === 0 ? 'PASS' : 'FAIL',
      passedChecks: passes.length,
      failedChecks: failures.length,
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exitCode = 1;
