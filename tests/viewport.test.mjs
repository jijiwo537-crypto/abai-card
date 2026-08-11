/**
 * The board must cover the window, whatever the window does.
 *
 * three.js writes the canvas's size into its own style in pixels — the size of the container on
 * the frame it last measured. The container is `100dvh`, and on iOS that grows the moment the
 * address bar retracts. If the canvas keeps the old number, the strip it no longer covers shows
 * the black behind it: a slab along the bottom of the screen that nothing in the game explains.
 *
 * A desktop browser has no address bar to retract, so the viewport is grown directly, which is
 * the same event as far as the layout is concerned.
 */
import { launch, requireBuild, checks, HOOK_BUILD, PHONE, toDeckList } from './harness.mjs';

requireBuild(HOOK_BUILD);
const t = checks();
const b = await launch();
const ctx = await b.newContext(PHONE);
const p = await ctx.newPage();

await toDeckList(p);
await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /對戰|開始|快速/.test(x.textContent))?.click());
await p.waitForSelector('.battle-root', { timeout: 120000 });
await p.waitForTimeout(6000);

const measure = () =>
  p.evaluate(() => {
    const host = document.querySelector('.battle-canvas').getBoundingClientRect();
    const cv = document.querySelector('.battle-canvas canvas')?.getBoundingClientRect();
    return { host: [host.width, host.height], cv: cv ? [Math.round(cv.width), Math.round(cv.height)] : null };
  });
const covers = (m) => !!m.cv && Math.abs(m.cv[0] - m.host[0]) < 1 && Math.abs(m.cv[1] - m.host[1]) < 1;

const before = await measure();
t.ok(covers(before), `the canvas covers the board to start with ${JSON.stringify(before)}`);

await p.setViewportSize({ width: 852, height: 430 });
const grown = await measure();
t.ok(covers(grown), `and still covers it the instant the window grows ${JSON.stringify(grown)}`);

await p.waitForTimeout(800);
const settled = await measure();
t.ok(covers(settled), `and once the resize has been taken ${JSON.stringify(settled)}`);

await b.close();
t.done();
