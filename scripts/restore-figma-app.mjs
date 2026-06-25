import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = join(root, 'src', 'baseline');
const outputFile = join(root, 'src', 'generated', 'App.generated.tsx');

const partNames = (await readdir(sourceDirectory))
  .filter((name) => /^App\.figma\.tsx\.gz\.part\d+$/.test(name))
  .sort();

if (partNames.length === 0) throw new Error('Figma baseline parts not found.');

const parts = await Promise.all(
  partNames.map((name) => readFile(join(sourceDirectory, name))),
);

const source = gunzipSync(Buffer.concat(parts));
await mkdir(dirname(outputFile), { recursive: true });
await writeFile(outputFile, source);
console.log(`Figma baseline restored: ${outputFile}`);
