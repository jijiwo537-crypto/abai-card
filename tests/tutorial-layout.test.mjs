/**
 * The chapter that holds a card up.
 *
 * It is the one chapter whose subject is a single tall object in the middle of the screen, so
 * it splits the screen down the middle rather than across: the card dead centre, the panel down
 * the left-hand edge at eye height, and the two never touching. Also checked here: the board is
 * not dimmed while there is nothing to point at, the pointer line draws above the card and under
 * the panel, and the box drawn around the mana cost is big enough to read at arm's length.
 */
import { launch, requireBuild, checks, HOOK_BUILD, PHONE, DESKTOP, toTutorial, advance } from './harness.mjs';

requireBuild(HOOK_BUILD);
const t = checks();
const b = await launch();

for (const [name, preset] of [['phone', PHONE], ['desktop', DESKTOP]]) {
  console.log(`\n== ${name} ==`);
  const ctx = await b.newContext(preset);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await toTutorial(p);

  for (let i = 0; i < 10; i++) {
    if ((await p.evaluate(() => document.querySelector('.coach-say h2')?.textContent)) === '魔力費用') break;
    await advance(p);
    await p.waitForTimeout(900);
  }

  const m = await p.evaluate(() => {
    const el = document.querySelector('.coach-say');
    const say = el.getBoundingClientRect();
    const anat = document.querySelector('.coach-anat');
    const a = anat.getBoundingClientRect();
    const box = document.querySelector('.coach-box').getBoundingClientRect();
    const z = (e) => +getComputedStyle(e).zIndex;
    const R = (r) => [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)];
    return {
      veiled: !!document.querySelector('.battle-root.coached'),
      panel: R(say),
      card: R(a),
      boxFrac: +((box.width * box.height) / (a.width * a.height)).toFixed(4),
      zLine: z(document.querySelector('.coach-line')),
      zCard: z(anat),
      zPanel: z(el),
      panelOffY: Math.abs((say.top + say.bottom) / 2 - innerHeight / 2),
      cardOff: [Math.abs((a.left + a.right) / 2 - innerWidth / 2), Math.abs((a.top + a.bottom) / 2 - innerHeight / 2)],
    };
  });
  console.log('  ', JSON.stringify(m));

  const clear = m.panel[1] >= m.card[3] || m.panel[3] <= m.card[1] || m.panel[2] <= m.card[0] || m.panel[0] >= m.card[2];
  t.ok(!m.veiled, `${name}: the board is not dimmed while a card is being held up`);
  t.ok(m.cardOff[0] <= 1 && m.cardOff[1] <= 1, `${name}: the example card is dead centre (off by ${m.cardOff})`);
  t.ok(m.panelOffY <= 2, `${name}: the panel is vertically centred (off by ${m.panelOffY})`);
  t.ok(m.panel[0] <= 40, `${name}: the panel is against the left edge (left ${m.panel[0]})`);
  t.ok(clear, `${name}: the panel does not overlap the example card`);
  t.ok(m.zLine > m.zCard, `${name}: the line is above the card (${m.zLine} > ${m.zCard})`);
  t.ok(m.zPanel > m.zLine, `${name}: and the panel above the line (${m.zPanel} > ${m.zLine})`);
  t.ok(m.boxFrac > 0.012, `${name}: the cost box is big enough to see (${(m.boxFrac * 100).toFixed(2)}% of the card)`);
  t.ok(errs.length === 0, `${name}: no page errors ${JSON.stringify(errs.slice(0, 2))}`);
  await ctx.close();
}

await b.close();
t.done();
