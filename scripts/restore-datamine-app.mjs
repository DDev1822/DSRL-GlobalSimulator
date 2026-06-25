import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const sourceDir = new URL('../src/generated-source/', import.meta.url);
const outputDir = new URL('../src/generated/', import.meta.url);
const outputFile = new URL('../src/generated/App.datamine-only.generated.tsx', import.meta.url);

const base64Parts = await Promise.all([
  readFile(new URL('App.datamine-only.tsx.gz.b64.part01', sourceDir), 'utf8'),
  readFile(new URL('App.datamine-only.tsx.gz.b64.part02', sourceDir), 'utf8'),
  readFile(new URL('App.datamine-only.tsx.gz.b64.part03', sourceDir), 'utf8'),
]);

const firstBytes = Buffer.from(base64Parts.join(''), 'base64');
const encodedTail = Buffer.from(
  await readFile(new URL('App.datamine-only.tsx.gz.xor.b64.part04', sourceDir), 'utf8'),
  'base64',
);
const tailBytes = Buffer.from(encodedTail.map((value) => value ^ 0xa5));
const source = gunzipSync(Buffer.concat([firstBytes, tailBytes]));
const sha256 = createHash('sha256').update(source).digest('hex');

if (sha256 !== 'cdd806deeb14aa26033d913b306df36b26804d50a1fb74e045552b5ea31cd087') {
  throw new Error(`Datamine-only source checksum mismatch: ${sha256}`);
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputFile, source);
console.log(`Datamine-only app restored (${source.length} bytes, ${sha256}).`);
