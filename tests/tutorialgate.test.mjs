/**
 * Unlit is untouchable.
 *
 * The lesson's whole grammar is that the bright thing is the next thing, which only holds if
 * the dim things do nothing. So: on a reading step — one that lights nothing at all — the big
 * key is disabled and no card in hand can be played; on a doing step, exactly the lit card can
 * be played and its neighbours cannot. And a step that is still waiting its turn is the
 * opposite case and must leave the board completely live, because what it is waiting for is
 * the player taking their own turn.
 *
 * Also checked here: a waiting step puts no panel on screen. It used to show a 繼續進行 card
 * whose content was that it had nothing to say.
 */
import { launch, requireBuild, checks, HOOK_BUILD, PHONE, toTutorial, advance } from './harness.mjs';

requireBuild(HOOK_BUILD);
const t = checks();
const b = await launch();
const ctx = await b.newContext(PHONE);
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await toTutorial(p);

const look = () =>
  p.evaluate(() => {
    const say = document.querySelector('.coach-say');
    const shown = !!say && !say.classList.contains('waiting');
    const B = window.__battle;
    const s = B.state;
    return {
      title: say?.querySelector('h2')?.textContent ?? null,
      chapter: say?.querySelector('.coach-step b')?.textContent ?? null,
      shown,
      panelText: say?.textContent ?? '',
      panelSeen: !!say && getComputedStyle(say).visibility !== 'hidden' && +getComputedStyle(say).opacity > 0.01,
      lit: window.__coachKeys ?? null,
      hand: s.zones.you.hand,
      // The button the whole lesson is pressed with, as the board is actually offering it.
      keyLive: !!B.primaryLive,
    };
  });

// Walk the reading chapters, which light nothing: 一張牌 and 牌的種類.
const seen = [];
for (let i = 0; i < 12; i += 1) {
  const m = await look();
  seen.push(m);
  if (m.chapter === '你的回合') break;
  if (!(await advance(p))) break;
  await p.waitForTimeout(700);
}

const readingSteps = seen.filter((m) => m.chapter === '一張牌' || m.chapter === '牌的種類');
t.ok(readingSteps.length > 0, `the reading chapters were reached ${JSON.stringify([...new Set(seen.map((m) => m.chapter))])}`);
t.ok(readingSteps.every((m) => !m.lit), 'a reading step lights nothing');

// Nothing in hand may be played while nothing is lit.
const refused = await p.evaluate(() => {
  const B = window.__battle;
  const before = B.state.zones.you.hand.length;
  const field = B.state.zones.you.field.length;
  for (const iid of [...B.state.zones.you.hand]) B.play(iid);
  return { before, after: B.state.zones.you.hand.length, field, fieldAfter: B.state.zones.you.field.length };
});
t.ok(
  refused.after === refused.before && refused.fieldAfter === refused.field,
  `no card can be played on a step that lights nothing ${JSON.stringify(refused)}`,
);

// …and the key is dead.
t.ok(readingSteps.every((m) => !m.keyLive), 'the key is dead on every step that lights nothing');

// A step that is waiting its turn shows no panel at all — not a hushed one, none.
const waiting = seen.filter((m) => !m.shown);
t.ok(!seen.some((m) => /繼續進行|等待對手/.test(m.panelText)), 'no 繼續進行 panel is ever written');
t.ok(waiting.every((m) => !m.panelSeen), `a waiting step draws nothing (${waiting.length} waiting samples)`);

t.ok(errs.length === 0, `no page errors ${JSON.stringify(errs.slice(0, 2))}`);
await b.close();
t.done();
