/**
 * What every check in here shares.
 *
 * The board is WebGL. Under a software renderer it draws at roughly a third of a frame a
 * second, so nothing in these tests may assert on timing or on pixels — everything is read
 * from the DOM, from measured rectangles, or from the game's own state through the windows
 * that `npm run build:hook` compiles in. That is also why the waits look generous: they are
 * sized for a machine with no GPU, which is what CI is.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The build with the test windows in it. Never the one that ships. */
export const HOOK_BUILD = `file://${ROOT}dist-hook/index.html`;
/** The build that ships: no windows, nothing to drive it with but the mouse. */
export const SHIPPED_BUILD = `file://${ROOT}dist-single/index.html`;

/** An iPhone on its side — the shape the phone layout is written for. */
export const PHONE = {
  viewport: { width: 852, height: 393 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
};

export const DESKTOP = { viewport: { width: 1500, height: 940 } };

export function requireBuild(url) {
  const path = url.replace('file://', '');
  if (!existsSync(path)) {
    console.error(`missing build: ${path}\nrun \`npm run build:hook\` (tests) or \`npm run build\` (shipped) first.`);
    process.exit(2);
  }
}

export function launch() {
  return chromium.launch({
    // Set CHROMIUM_PATH when the browser lives somewhere Playwright did not put it.
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
}

/** Title screen → deck list. Everything starts here. */
export async function toDeckList(page, url = HOOK_BUILD) {
  await page.goto(url);
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.querySelector('.title-go').click());
  await page.waitForSelector('.dtile');
  await page.waitForTimeout(500);
}

/** …and on into the lesson, waiting for the first panel to settle. */
export async function toTutorial(page, url = HOOK_BUILD) {
  await toDeckList(page, url);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => /教學/.test(x.textContent)).click());
  await page.waitForSelector('.coach-say', { timeout: 120000 });
  await page.waitForTimeout(2500);
}

/** Step the lesson on by its own button. False when there is no button to press. */
export function advance(page) {
  return page.evaluate(() => {
    const b = document.querySelector('.coach-next');
    if (!b) return false;
    b.click();
    return true;
  });
}

/** A collector, so a file can state several things and fail once at the end. */
export function checks() {
  const failed = [];
  return {
    ok(cond, msg) {
      console.log((cond ? 'PASS ' : 'FAIL ') + msg);
      if (!cond) failed.push(msg);
    },
    done() {
      console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL PASS');
      process.exitCode = failed.length ? 1 : 0;
    },
  };
}
