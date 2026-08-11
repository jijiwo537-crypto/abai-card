/**
 * Nothing may leave the page.
 *
 * The whole point of the shipped file is that it is the whole game. Open it, walk through the
 * parts that would most plausibly reach for something — a pack opening with its card art, a
 * match with its fonts and its board — and count every request that is not `file:`, `data:` or
 * `blob:`. The count has to be nought. This runs against `dist-single`, the build that ships,
 * and it also asserts the test windows are not in it.
 */
import { launch, requireBuild, SHIPPED_BUILD, DESKTOP } from './harness.mjs';
import { readFileSync } from 'node:fs';
import { checks } from './harness.mjs';

requireBuild(SHIPPED_BUILD);
const t = checks();
const b = await launch();
const p = await b.newPage(DESKTOP);

const external = [];
p.on('request', (r) => {
  const u = r.url();
  if (!u.startsWith('file://') && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
});
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));

await p.addInitScript(() => localStorage.setItem('ad_tutorial_seen', '1'));
await p.goto(SHIPPED_BUILD);
await p.waitForTimeout(1500);
await p.click('.title-go');
await p.waitForSelector('.dtile');
await p.waitForTimeout(800);

// A pack: the heaviest art path in the app.
await p.evaluate(() => [...document.querySelectorAll('.pl-build')].find((x) => x.textContent.includes('開卡包')).click());
await p.waitForSelector('.pk-pack');
await p.click('.pk-pack', { position: { x: 130, y: 200 }, force: true });
await p.waitForSelector('.pk-fan:not(.dropping)', { timeout: 12000 });
await p.evaluate(() => [...document.querySelectorAll('.pl-build')].find((x) => x.textContent.includes('全部翻開'))?.click());
await p.waitForTimeout(1600);
await p.evaluate(() => document.querySelector('.pk-zoom')?.click());
await p.evaluate(() => [...document.querySelectorAll('.picker-back')].find((x) => x.textContent.includes('返回')).click());
await p.waitForSelector('.dtile');
await p.waitForTimeout(500);

// And a match: the board, the fonts, the whole scene.
await p.click('.dtile');
await p.waitForTimeout(600);
await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /開始|對戰/.test(x.textContent))?.click());
await p.waitForTimeout(6000);

const html = readFileSync(SHIPPED_BUILD.replace('file://', ''), 'utf8');
t.ok(external.length === 0, `no external requests ${JSON.stringify(external.slice(0, 5))}`);
t.ok(errs.length === 0, `no page errors ${JSON.stringify(errs.slice(0, 3))}`);
t.ok(!html.includes('__battle'), 'the shipped build carries no test windows');

await b.close();
t.done();
