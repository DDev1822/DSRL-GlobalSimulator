import { spawnSync } from 'node:child_process';

const commands = [
  ['npm', ['run', 'validate:data']],
  ['npm', ['run', 'audit:baseline']],
  ['npm', ['run', 'audit:stage1']],
  ['npm', ['run', 'audit:stage2']],
  ['npm', ['run', 'audit:stage3']],
  ['node', ['scripts/audit-stage-4.mjs']],
  ['npm', ['run', 'validate:economics']],
  ['node', ['scripts/validate-bench-analysis.mjs']],
  ['npm', ['run', 'typecheck']],
  ['npm', ['run', 'build']],
];

for (const [command, args] of commands) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('\nSTAGE 4 VERIFICATION: PASS');
