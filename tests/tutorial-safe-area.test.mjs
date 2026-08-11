/**
 * Every chapter's panel, on a phone with a notch on both short edges.
 *
 * iOS puts the sensor housing on one short edge in landscape and the home indicator on the
 * other, and which is which depends on the way the phone was turned — so the lesson has to clear
 * both. The real insets come from `env(safe-area-inset-*)`, which a desktop browser never
 * reports; the same rules also read `--coach-left/right`, which is what is set here to stand in
 * for them, exactly as the tuning page does.
 *
 * Three things are asserted: the panel never reaches into either inset, it never sits on the
 * thing its own step is pointing at, and it does not move within a chapter.
 */
import { launch, requireBuild, checks, HOOK_BUILD, PHONE, toTutorial, advance } from './harness.mjs';

const LEFT = 44; // an iPhone 15 Pro on its side: sensor housing
const RIGHT = 21; // …and the home indicator on the other edge

requireBuild(HOOK_BUILD);
const t = checks();
const b = await launch();
const ctx = await b.newContext(PHONE);
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));

await toTutorial(p);
await p.addStyleTag({ content: `html[data-touch] .coach-say { --coach-left: ${LEFT}px; --coach-right: ${RIGHT}px; }` });
await p.waitForTimeout(400);

const rows = [];
for (let i = 0; i < 14; i++) {
  rows.push(
    await p.evaluate(() => {
      const c = document.querySelector('.coach-say');
      const r = c.getBoundingClientRect();
      // Whatever the step is showing: the held-up card, the row of six, or the far end of a
      // pointer line, which is a place the eye is being sent and must not be covered either.
      const subj = [];
      const anat = document.querySelector('.coach-anat');
      if (anat) subj.push(anat.getBoundingClientRect());
      for (const f of document.querySelectorAll('.coach-gallery figure')) subj.push(f.getBoundingClientRect());
      for (const d of document.querySelectorAll('.coach-line circle')) {
        const cx = +d.getAttribute('cx');
        const cy = +d.getAttribute('cy');
        if (+d.getAttribute('r') > 0) subj.push(new DOMRect(cx - 46, cy - 46, 92, 92));
      }
      const over = (q) =>
        Math.max(0, Math.min(r.right, q.right) - Math.max(r.left, q.left)) *
        Math.max(0, Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top));
      return {
        chapter: c.querySelector('.coach-step b')?.textContent,
        title: c.querySelector('h2')?.textContent,
        place: (c.className.match(/at-[a-z]+/) ?? [''])[0],
        box: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)],
        hitSubject: Math.round(Math.max(0, ...subj.map(over), 0)),
        vw: innerWidth,
      };
    }),
  );
  if (!(await advance(p))) break;
  await p.waitForTimeout(900);
}
for (const r of rows) console.log(`   ${r.chapter} · ${r.title}  ${r.place}  [${r.box}]  subject ${r.hitSubject}px²`);

const W = rows[0].vw;
const intoLeft = rows.filter((r) => r.box[0] < LEFT);
const intoRight = rows.filter((r) => r.box[2] > W - RIGHT);
const onSubject = rows.filter((r) => r.hitSubject > 0);
const perChapter = new Map();
for (const r of rows) {
  if (!perChapter.has(r.chapter)) perChapter.set(r.chapter, new Set());
  perChapter.get(r.chapter).add(r.place);
}

t.ok(intoLeft.length === 0, `no panel reaches into the left inset ${JSON.stringify(intoLeft.map((r) => `${r.title} ${r.box[0]}`))}`);
t.ok(intoRight.length === 0, `no panel reaches into the right inset ${JSON.stringify(intoRight.map((r) => `${r.title} ${r.box[2]}`))}`);
t.ok(onSubject.length === 0, `no panel sits on what its step is showing ${JSON.stringify(onSubject.map((r) => `${r.title} ${r.hitSubject}`))}`);
t.ok(
  [...perChapter.values()].every((v) => v.size === 1),
  `one position per chapter ${JSON.stringify([...perChapter].map(([k, v]) => `${k}:${[...v]}`))}`,
);
t.ok(errs.length === 0, `no page errors ${JSON.stringify(errs.slice(0, 2))}`);

await b.close();
t.done();
