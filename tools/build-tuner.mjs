/**
 * Bake the game into the tuning page.
 *
 * `tutorial-tuner.html` in the repo is a template with a `__GAME_B64__` placeholder; the file
 * that gets delivered has the whole built game sitting inside it, base64. One file, opened
 * from wherever it was saved: nothing to keep beside it, nothing to rename, and no local file
 * framing another — which is what Safari refuses and what a browser's "(1)" suffix quietly
 * breaks the moment the same download happens twice.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const game = readFileSync(`${root}dist-single/index.html`);
const tpl = readFileSync(`${root}tools/tutorial-tuner.html`, 'utf8');

if (!tpl.includes('__GAME_B64__')) {
  throw new Error('tools/tutorial-tuner.html has no __GAME_B64__ placeholder — is it already built?');
}

// `unescape(encodeURIComponent(...))` on the way back out, so the page decodes UTF-8 correctly.
const b64 = Buffer.from(game).toString('base64');
const out = tpl.replace('__GAME_B64__', b64);
writeFileSync(`${root}dist-single/tutorial-tuner.html`, out);

const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
console.log(`game ${mb(game.length)} -> tuner ${mb(Buffer.byteLength(out))}`);
