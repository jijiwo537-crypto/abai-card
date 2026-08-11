/**
 * Run every `*.test.mjs` in here, one at a time, and fail the lot if any of them failed.
 *
 * One at a time on purpose. Each check drives a real WebGL board through a software renderer;
 * two of them at once starve each other and the lesson stops advancing, which reads as a
 * failure and is not one.
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const only = process.argv.slice(2);
const files = readdirSync(here)
  .filter((f) => f.endsWith('.test.mjs'))
  .filter((f) => only.length === 0 || only.some((o) => f.includes(o)))
  .sort();

const failed = [];
for (const f of files) {
  console.log(`\n──────── ${f} ────────`);
  const r = spawnSync(process.execPath, [here + f], { stdio: 'inherit' });
  if (r.status !== 0) failed.push(f);
}

console.log(`\n${files.length - failed.length}/${files.length} suites passed`);
if (failed.length) {
  console.log(`failed: ${failed.join(', ')}`);
  process.exit(1);
}
