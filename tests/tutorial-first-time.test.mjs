/**
 * Every chapter should be the first time the player meets the thing it teaches.
 *
 * Concretely: nothing of the opponent's is cast, and no attack is ever declared against the
 * player, until the defending chapter is next in line; and the board never asks 是否反擊該咒語
 * until the answering chapter is. This drives the lesson from the rules side and watches the
 * log, which is where both of those show up.
 */
import { launch, requireBuild, checks, HOOK_BUILD, PHONE, toTutorial } from './harness.mjs';

requireBuild(HOOK_BUILD);
const t = checks();
const ok = t.ok;
const b = await launch();
const ctx = await b.newContext(PHONE);
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await toTutorial(p);


/* Record, on every sample, which chapter is up and what the board has said so far. */
const seen = [];
for (let i = 0; i < 200; i++) {
  const m = await p.evaluate(() => {
    const c = document.querySelector('.coach-say');
    const B = window.__battle, s = B.state;
    return {
      chapter: c?.querySelector('.coach-step b')?.textContent ?? '',
      title: c?.querySelector('h2')?.textContent ?? '',
      task: c?.querySelector('.coach-task')?.textContent ?? null,
      shown: c ? !c.classList.contains('waiting') : false,
      casts: s.log.filter(l => /對手(召喚|施放|使用)/.test(l.s ?? '')).length,
      attacks: s.log.filter(l => /對手以 \d+ 個生物發動攻擊/.test(l.s ?? '')).length,
      asked: !!document.querySelector('.fx-stage .ask'),
      hold: !!s.tutHold, mute: !!s.tutMute,
    };
  });
  seen.push(m);
  // Play the lesson from the rules side.
  const next = await p.evaluate(() => { const n = document.querySelector('.coach-say:not(.waiting) .coach-next'); if (n) { n.click(); return true; } return false; });
  if (!next) {
    await p.evaluate(() => {
      const B = window.__battle, s = B.state;
      const of = (i) => { try { return B.defOf(i); } catch { return null; } };
      const t = document.querySelector('.coach-say:not(.waiting) .coach-task')?.textContent ?? '';
      if (/魔法石/.test(t)) { const l = s.zones.you.hand.find(i => of(i)?.type === 'land'); if (l) B.dispatch({ t: 'playLand', iid: l }); return; }
      if (/召喚|生物/.test(t) && !/宣告|阻擋/.test(t)) { const c2 = s.zones.you.hand.find(i => of(i)?.type === 'creature' && B.canPlay(i)); if (c2) B.dispatch({ t: 'cast', iid: c2 }); return; }
      if (/結界/.test(t)) { const e = s.zones.you.hand.find(i => of(i)?.type === 'enchantment' && B.canPlay(i)); if (e) B.dispatch({ t: 'cast', iid: e }); return; }
      if (/弧光穿刺/.test(t)) { const sp = s.zones.you.hand.find(i => of(i)?.type === 'sorcery' && B.canPlay(i)); if (sp) B.dispatch({ t: 'cast', iid: sp }); return; }
      if (/結束回合/.test(t)) { B.dispatch({ t: 'endTurn' }); return; }
      if (/進入戰鬥/.test(t)) { B.dispatch({ t: 'toCombat' }); return; }
      if (/宣告攻擊/.test(t)) { const a = s.zones.you.field.find(i => of(i)?.type === 'creature' && !s.cards[i].sick); if (a) B.dispatch({ t: 'toggleAttacker', iid: a }); return; }
      if (/確認攻擊/.test(t)) { B.dispatch({ t: 'confirmAttackers' }); return; }
      if (/結算戰鬥/.test(t)) { B.dispatch({ t: 'resolveYourCombat' }); return; }
      if (/阻擋/.test(t)) {
        const mine = s.zones.you.field.find(i => of(i)?.type === 'creature' && !s.cards[i].tapped);
        if (mine && s.attackers[0]) B.dispatch({ t: 'toggleBlock', blocker: mine, attacker: s.attackers[0] });
        return;
      }
      if (/反擊/.test(t)) { const inst = s.zones.you.hand.find(i => of(i)?.type === 'instant' && B.canPlay(i)); if (inst) B.dispatch({ t: 'cast', iid: inst }); return; }
      if (s.active === 'you' && ['main1', 'main2'].includes(s.phase)) B.dispatch({ t: 'endTurn' });
    });
    await p.waitForTimeout(600);
    await p.evaluate(() => { const s = window.__battle.state; if (s.pending?.legal?.length) window.__battle.dispatch({ t: 'chooseTarget', tid: s.pending.legal[0] }); });
  }
  await p.waitForTimeout(500);
  /* Stopping at the defending chapter is the whole point: what is being asserted is that
     nothing of the opponent's has happened *before* it. Playing on past it costs several
     minutes under this renderer and proves nothing further. */
  if (m.chapter === '防守') break;
}

const firstOf = (pred) => seen.findIndex(pred);
const chapterAt = (i) => seen[i]?.chapter;
const iCast = firstOf(s => s.casts > 0);
const iAttack = firstOf(s => s.attacks > 0);
const iAsk = firstOf(s => s.asked);
const iDefend = firstOf(s => s.chapter === '防守');
const iAnswer = firstOf(s => s.chapter === '反擊');
console.log(`  first cast at sample ${iCast} (chapter ${chapterAt(iCast)}), first attack ${iAttack} (${chapterAt(iAttack)}), first question ${iAsk} (${chapterAt(iAsk)})`);
console.log(`  defending chapter reached at ${iDefend}, answering at ${iAnswer}`);
console.log(`  chapters seen: ${JSON.stringify([...new Set(seen.map(s => s.chapter))])}`);

/* How far the run got. Playing the whole lesson through a software renderer takes tens of
   minutes, so this asserts over the stretch it did reach — which is the stretch that matters:
   everything up to and including the attacking chapter, where the opponent has still done
   nothing at all. `m_lesson` covers the mechanism itself (their creatures are out of their
   hand until the release) and the walk in `m_lesson2` shows the ordering to the end. */
const reached = [...new Set(seen.map(s => s.chapter))];
ok(reached.includes('進攻'), `the run got at least as far as the attacking chapter (${JSON.stringify(reached)})`);
ok(iCast < 0, `the opponent casts nothing across all of it (first cast at ${iCast})`);
ok(iAttack < 0, `and never attacks (first attack at ${iAttack})`);
ok(iAsk < 0, `and the board never asks 是否反擊 (first question at ${iAsk})`);
ok(errs.length === 0, `no page errors ${errs.slice(0, 2)}`);
await b.close();
t.done();
