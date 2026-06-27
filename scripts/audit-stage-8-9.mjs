import { existsSync, readFileSync } from 'node:fs';

const failures = [];
let passed = 0;
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const check = (source, token, label) => {
  if (source.includes(token)) {
    passed += 1;
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL: ${label}`);
  }
};

const engine = read('src/engine/blockBenchRouteRecovery.ts');
const readme = read('docs/stage-8-9/README.md').toLowerCase();
const checklist = read('docs/stage-8-9/manual-checklist.md');

const engineTokens = [
  'ProcessRouteDefinition',
  'RouteRecoveryInputs',
  'RouteMaterialLot',
  'RoutePeriodResult',
  'RouteRecoveryReport',
  'createRouteRecoveryInputs',
  'validateRouteRecoveryInputs',
  'normalizeSourceDestination',
  'buildBlockBenchRouteRecovery',
  'source-destination-preserving-route-allocation',
  'processRouteMassCloses',
  'copperContentCloses',
  'recoveredCopperWithinFeed',
  'valueBalanceCloses',
  'routeIdentityPreserved',
];

for (const token of engineTokens) check(engine, token, `engine: ${token}`);
for (const token of ['etapa 8.9', 'recuperación metalúrgica', 'npvpdest', 'mill', 'leach', 'dump', 'cobre recuperado']) {
  check(readme, token, `readme: ${token}`);
}
for (const token of ['audit-stage-8-9.mjs', 'validate-block-bench-route-recovery.mjs', 'npm run typecheck', 'npm run build']) {
  check(checklist, token, `checklist: ${token}`);
}

console.log('\nSTAGE 8.9 AUDIT SUMMARY');
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', passedChecks: passed, failedChecks: failures.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
