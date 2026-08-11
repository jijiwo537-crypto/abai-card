/**
 * The tutorial, played on the real board.
 *
 * Not four pages of diagrams. A diagram of a battlefield teaches you where things are in
 * the diagram; the only way to learn where the hand is is to look at the hand, and the only
 * way to learn what 飛行 does is to attack with a flyer and watch the ground creature fail
 * to stop it. So this is an actual match, against the actual opponent, with an actual deck
 * — and the teaching is a light.
 *
 * The light is not a hole cut in an overlay. A hole in an overlay is a rectangle, and a
 * rectangle around a twenty-sided die is a rectangle with a lot of table in it. Each step
 * instead names the objects it is about, and the board veils itself and then redraws
 * exactly those at full strength — so what is picked out is the die, in its own outline.
 * The veil is a veil and not a blackout: a player being shown where the hand is still needs
 * to see that there is a table, an opponent and a row of lands around it. See the spotlight
 * pass in `BattleCanvas`.
 *
 * Three things carry the lesson, and the panel is the least of them:
 *
 *  - The light says *which* object. It is the board's own outline, so nothing is covered.
 *  - A line runs from the panel to that object and keeps running to it while the board
 *    moves, because "the button" means nothing until you have seen where the button is.
 *  - For the parts of a card, a box sits on the card itself and travels between them as the
 *    lesson moves on — cost, type, rules, stats. Naming the top-right corner is a sentence;
 *    drawing a box on the top-right corner is the whole explanation.
 *
 * The copy is one sentence a step. The panel used to carry a second paragraph of rules in
 * small type under every step, which on a phone made it half the screen — a tutorial that
 * covers the board it is teaching you to read. Anything that mattered went into the
 * sentence; anything that did not is gone.
 */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import * as E from '../game/engine';
import type { GameState } from '../game/engine';
import type { CardDef } from '../game/types';
import { costPips, getCardDataUrl, getCardThumbUrl, isMulticolour } from '../render/cardFace';
import { useCardFx } from '../render/CardFx';
import { sfx } from '../game/audio';
import { tuning, tuneJump, report, type Tune } from './tuner';

interface Ctx {
  s: GameState;
  /** The blocker the player has picked up, if any — the defending step points with it. */
  sel: string | null;
  /** The turn on which this step came up, so a step can give up waiting. */
  since: number;
}

/** The parts of a card face the anatomy chapter walks through. */
type Spot = 'name' | 'cost' | 'art' | 'type' | 'text' | 'stats';

interface Step {
  key: string;
  /** Which part of the lesson this belongs to, shown above the title. */
  chapter: string;
  title: string;
  /**
   * The instruction. One sentence. A first-timer reading a paragraph has stopped looking at
   * the board, which is the only place the lesson is.
   */
  body: string;
  /**
   * The objects this step is about, by board key — `die-you`, `button`, `deck-you`, or a
   * card's instance id. The board keeps exactly these and veils everything else.
   *
   * An empty list means *nothing in particular*, and nothing in particular is not a reason to
   * dim the room: a step that holds a card up in front of you, or lays six of them out, is
   * already the brightest thing on screen. Only a step that names objects veils the rest, so
   * the board is at full strength whenever the lesson is not pointing at it. `null` is the
   * same thing said explicitly.
   */
  focus: (c: Ctx) => string[] | null;
  /** Present on the steps you have to *do*: true when the board says it happened. */
  wait?: (c: Ctx, base: Snapshot) => boolean;
  /** What you are being asked to do, shown where the continue button would be. */
  task?: string;
  /**
   * How long to stay on a finished task before moving on, in ms. A step you *did* does not
   * need a button underneath it saying you did it — the board already showed you. The pause
   * is for whatever the action set off: a creature landing wants a moment, a whole combat
   * wants longer. Reading steps have no `wait` and no timer; they keep the button, because
   * the only thing that says you have finished reading is you.
   */
  hold?: number;
  /**
   * Whether the board is ready for this step at all.
   *
   * A lesson that says "declare an attacker" while it is the opponent's turn is a lesson
   * asking for something the rules will not allow, and the player has no way to know that
   * the tutorial is simply early. So a step with a `when` stays silent — no panel, no light,
   * no line — until the board is in the state the step is about. The blocking step waits for
   * their attackers to actually be declared; the answering step waits for the board to
   * actually ask the question.
   */
  when?: (c: Ctx) => boolean;
  /**
   * When to give up on this step and move past it without ever showing it.
   *
   * Some steps are about something the opponent has to do — attack, cast a spell — and the
   * opponent is a player, not a script: they may simply never do it. Teaching blocking with
   * nothing attacking would be worse than not teaching it, so after a few of their turns the
   * step steps aside instead of holding the whole lesson up behind it. The same applies to a
   * step whose moment has already passed: a combat that resolved on its own leaves nothing
   * for 結算戰鬥 to be pressed on.
   */
  skip?: (c: Ctx) => boolean;
  /* A gated step that has not opened yet shows nothing at all — no panel, no light, no line.
     It used to put up a 繼續進行 card telling the player to carry on by themselves, which is
     a panel whose content is that it has nothing to say; the board is unveiled and fully
     live at that moment, which says the same thing without a box on top of it. */
  /** Puts a card up, and boxes one part of it if `spot` names one. */
  card?: boolean;
  spot?: Spot;
  gallery?: boolean;
  /**
   * A placement chosen by hand for this step's chapter, overriding the measured pass.
   *
   * Used once, for the chapter that holds a card up: that chapter splits the screen down the
   * middle — panel against the left edge at eye height, card in the space to the right of it —
   * and a "get out of the way" rule scoring corners will never choose that on its own.
   */
  pin?: 'tl' | 'tr' | 'bl' | 'br' | 'top' | 'bottom' | 'left';
  /** The last step: a closing sequence rather than a sentence with a button. */
  finale?: boolean;
}

/** What the board looked like when a waiting step started, so change can be measured. */
interface Snapshot {
  lands: number;
  creatures: number;
  turn: number;
  foeLife: number;
}

const snap = (s: GameState): Snapshot => ({
  lands: s.zones.you.field.filter((i) => E.defOf(s, i)?.type === 'land').length,
  creatures: s.zones.you.field.filter((i) => E.defOf(s, i)?.type === 'creature').length,
  turn: s.turn ?? 0,
  foeLife: s.life.foe,
});

/** Instance ids in a zone whose card passes a test. */
const pick = (c: Ctx, zone: string[], test: (d: any) => boolean) =>
  zone.filter((i) => {
    try { return test(E.defOf(c.s, i)); } catch { return false; }
  });

/** Cards of a kind in hand that you could actually pay for right now. */
const castable = (c: Ctx, type: CardDef['type']) =>
  c.s.zones.you.hand.filter((i) => {
    try { return E.defOf(c.s, i)?.type === type && E.canPlay(c.s, 'you', i); } catch { return false; }
  });

/** Your creatures that could legally attack right now. */
const readyAttackers = (c: Ctx) =>
  c.s.zones.you.field.filter((i) => {
    try { return E.defOf(c.s, i)?.type === 'creature' && E.canAttack(c.s, i); } catch { return false; }
  });

/** Combat is over once the board is out of the three combat phases. */
const outOfCombat = (s: GameState) => !['atk', 'blk', 'blkShow'].includes(s.phase);

/* ------------------------------------------------------------------ script ---- */

const C1 = '認識牌桌';
const C1B = '操作';
const C2 = '一張牌';
/*
 * 六種牌 is its own unit, not the tail of 一張牌. It is about the set rather than about one
 * card, it lays six of them out across the middle of the screen instead of holding one up,
 * and the panel is placed per chapter — so leaving it inside 一張牌 meant a placement chosen
 * against a single upright card and then held over a row six wide, which on a phone is the
 * panel sitting on the very thing it is introducing.
 */
const C2B = '牌的種類';
const C3 = '你的回合';
const C4 = '第二回合';
const C5 = '進攻';
const C6 = '第三回合';
const C7 = '防守';
const C8 = '法術';
const C9 = '反擊';
const C10 = '完成';

/**
 * The card the anatomy chapter is taught on, and the last card of the opening hand.
 *
 * Two pips and no generic number, one keyword, a printed 2/1: every part the chapter puts a
 * box around is on it once and is legible at the size the card is shown. The chapter used to
 * use the deck's four-mana commander, whose rules text ran to two lines and whose cost the
 * player could not have paid for another three turns.
 */
const SHOWCARD = 'gold_shoal_sentinel';

/** It is my main phase, with nothing in the air. */
const myMain = (s: GameState) =>
  s.active === 'you' && ['main1', 'main2'].includes(s.phase) && !s.stack && !s.pending;

/** How many 魔法石 I have on the table. */
const myLands = (s: GameState) =>
  s.zones.you.field.filter((i) => {
    try { return E.defOf(s, i)?.type === 'land'; } catch { return false; }
  }).length;

/**
 * The phone's layout.
 *
 * The panel is *not* in here, and that is the point. A hand-set corner plus a nudge is a
 * position that was true of one screenshot: the corner it counts from is chosen by looking at
 * where the lit objects actually are, so the same pair of numbers lands somewhere else the
 * moment the board differs — and pinning the corner to stop that only trades a moving panel
 * for one that sits on the very cards its step is asking you to drag. The placement pass
 * already knows how to avoid the subject and the board's own chrome; what it needed was to
 * know about the notch, which it now does on both sides. So it decides, per chapter, and this
 * carries only the two things that are genuinely a matter of taste: how big the example card
 * is, and where the six-card row sits.
 */
const PHONE_LAYOUT: Tune = {
  gallery: { y: 42, scale: 1.11 },
};

export const STEPS: Step[] = [
  {
    key: 'life', chapter: C1, title: '生命',
    body: '雙方各有20點血量，將敵方生命值歸零即可獲勝',
    focus: () => ['die-you', 'die-foe'],
  },
  {
    key: 'hand', chapter: C1, title: '手牌',
    body: '這是你的手牌，只有你看得見',
    focus: (c) => c.s.zones.you.hand,
  },
  {
    key: 'side', chapter: C1B, title: '推進鍵',
    body: '右邊這顆是唯一要按的鍵。上面永遠寫著你現在該做的事：抽牌、進入戰鬥、結束回合，都是它。',
    // The button alone. Lighting the library and the graveyard beside it put the line
    // between the three of them, pointing at nothing the sentence mentions.
    focus: () => ['button'],
  },
  {
    /*
     * The chapter used to open on 牌名, which is the least of what a card is. A first-timer
     * being shown a card for the first time needs to know what the object is for before
     * being told what the top line of it is called — so the card comes up whole, with no
     * box on it, and the boxes start on the step after.
     */
    key: 'card-what', chapter: C2, title: '卡牌',
    pin: 'left',
    body: '卡牌是這個遊戲的核心元素，所有事件都跟他有關',
    focus: () => [],
    card: true,
  },
  {
    key: 'card-name', chapter: C2, title: '牌名',
    pin: 'left',
    body: '這裡是卡牌的名稱',
    focus: () => [],
    card: true,
    spot: 'name',
  },
  {
    key: 'card-cost', chapter: C2, title: '魔力費用',
    pin: 'left',
    body: '這裡會顯示施放這張卡牌所需的費用，實心圓點代表相對顏色的魔力，數字則代表任意能量',
    focus: () => [],
    card: true,
    spot: 'cost',
  },
  {
    key: 'card-type', chapter: C2, title: '種類',
    pin: 'left',
    body: '這裡顯示卡牌的種類',
    focus: () => [],
    card: true,
    spot: 'type',
  },
  {
    key: 'card-text', chapter: C2, title: '敘述',
    pin: 'left',
    body: '這裡顯示卡牌的效果敘述以及關鍵字',
    focus: () => [],
    card: true,
    spot: 'text',
  },
  {
    key: 'card-stats', chapter: C2, title: '攻防值',
    pin: 'left',
    body: '這裡會顯示生物的攻防值（攻擊力/防禦力）',
    focus: () => [],
    card: true,
    spot: 'stats',
  },
  {
    key: 'types', chapter: C2B, title: '六種牌',
    body: '每一種牌戴著自己的邊框特效，不用讀字就分得出來。',
    focus: () => [],
    gallery: true,
  },

  /* ---- turn one: land, creature, pass ------------------------------------------- */

  {
    key: 'land', chapter: C3, title: '鋪一張魔法石',
    body: '將魔法石放入戰場，它是你的魔力來源（每回合只能打出一張）',
    task: '打出一張魔法石',
    when: (c) => myMain(c.s),
    focus: (c) => pick(c, c.s.zones.you.hand, (d) => d?.type === 'land'),
    wait: (c, b) => snap(c.s).lands > b.lands,
    hold: 900,
  },
  {
    key: 'board', chapter: C3, title: '戰場',
    body: '成功施放的卡牌時會出現在這裡，施放卡牌時系統會自動橫置所需的魔法石',
    focus: (c) => c.s.zones.you.field,
  },
  {
    key: 'creature', chapter: C3, title: '召喚生物',
    /*
     * The ones you can actually pay for. Lighting every creature in hand lights the ones
     * the board will refuse, which is a tutorial asking you to do something and then saying
     * no — so the lesson's hand opens with a one-mana flyer, payable off the first 魔法石.
     */
    body: '把生物牌拖動至戰場，他將為你戰鬥',
    task: '召喚一隻生物',
    when: (c) => myMain(c.s) && castable(c, 'creature').length > 0,
    focus: (c) => castable(c, 'creature'),
    wait: (c, b) => snap(c.s).creatures > b.creatures,
    hold: 1100,
  },
  {
    key: 'sick', chapter: C3, title: '召喚失調',
    body: '剛進場的生物要等你下一個回合才能發動攻擊，但可以直接進行防禦',
    /*
     * The one you just summoned, where it now stands — not the whole row. "It" is a single
     * creature, and pointing at the field pointed at everything on it, which past the line
     * limit collapses into one line into the middle of them: a line at the row rather than
     * at the card the sentence is about. Summoning sickness is exactly the mark of the
     * creature that just arrived.
     */
    focus: (c) => {
      const fresh = c.s.zones.you.field.filter((i) => {
        try { return E.defOf(c.s, i)?.type === 'creature' && !!c.s.cards[i]?.sick; } catch { return false; }
      });
      return fresh.length ? fresh : c.s.zones.you.field.filter((i) => {
        try { return E.defOf(c.s, i)?.type === 'creature'; } catch { return false; }
      });
    },
  },
  {
    key: 'end', chapter: C3, title: '結束回合',
    body: '這回合已經沒有事可以做了，按推進鍵把回合交給對手',
    task: '按下「結束回合」',
    when: (c) => c.s.active === 'you',
    focus: () => ['button'],
    wait: (c, b) => (c.s.turn ?? 0) > b.turn,
    hold: 900,
  },

  /* ---- turn two: the same shape again, with something to cast --------------------- */

  {
    key: 'again', chapter: C4, title: '輪到你了',
    body: '上回合橫置的卡牌已經重置狀態了！思考如何分配這回合的魔力並決定是否發動攻擊',
    when: (c) => myMain(c.s) && myLands(c.s) >= 1,
    /*
     * Nothing. This step is not asking for anything to be pressed — it is the beat where you
     * look at your own board again — and lighting the key put a line across the screen to a
     * button whose job this turn has not been said yet. The next step is 記得放魔法石, so
     * 繼續 runs straight into it.
     */
    focus: () => [],
  },
  {
    key: 'land2', chapter: C4, title: '記得放魔法石',
    body: '每回合都可以打出一張魔法石，別忘了喔',
    task: '再次打出魔法石',
    when: (c) => myMain(c.s),
    focus: (c) => pick(c, c.s.zones.you.hand, (d) => d?.type === 'land'),
    wait: (c, b) => snap(c.s).lands > b.lands,
    hold: 900,
  },
  /* ---- attacking ------------------------------------------------------------------ */

  {
    key: 'combat', chapter: C5, title: '再次進入戰鬥',
    body: '',
    task: '按下「進入戰鬥」',
    when: (c) => c.s.active === 'you' && myLands(c.s) >= 2,
    focus: () => ['button'],
    wait: (c) => c.s.phase === 'atk' && c.s.active === 'you',
    hold: 700,
  },
  {
    key: 'declare', chapter: C5, title: '發動攻擊',
    body: '點擊要發動攻擊的生物',
    task: '點擊生物宣告攻擊',
    when: (c) => c.s.phase === 'atk' && c.s.active === 'you',
    focus: (c) => readyAttackers(c),
    /*
     * `state.attackers` is not the field to ask. Declaring marks the creature —
     * `cards[iid].attacking` — and the attackers list is only filled in when the
     * declaration is confirmed, so waiting on the list means waiting for the step after
     * this one and this step never unlocks at all.
     */
    wait: (c) => c.s.zones.you.field.some((i) => !!c.s.cards[i]?.attacking) || outOfCombat(c.s),
    hold: 900,
  },
  {
    key: 'confirm', chapter: C5, title: '確認攻擊',
    body: '按下確認攻擊，對手將進行阻擋',
    task: '按下「確認攻擊」',
    when: (c) => c.s.phase === 'atk' && c.s.active === 'you',
    focus: () => ['button'],
    wait: (c) => c.s.phase !== 'atk',
    hold: 900,
  },
  {
    key: 'resolve', chapter: C5, title: '結算傷害',
    body: '',
    task: '按下「結算戰鬥」',
    when: (c) => c.s.phase === 'blkShow' && c.s.active === 'you',
    /*
     * An unblocked attack settles itself the moment it is confirmed — the board says
     * 對手沒有生物可阻擋，攻擊直接命中 and lands in 主要階段 2 with the damage already
     * dealt. There is no 結算戰鬥 to press then, so this step is not shown at all.
     */
    skip: (c) => c.s.active === 'you' && outOfCombat(c.s),
    focus: () => ['button', 'die-foe'],
    /*
     * Out of combat is enough on its own. Confirming with nothing declared — the button
     * offers exactly that, as 不發動攻擊 — skips the whole fight and lands on 主要階段 2
     * with no damage and no 結算戰鬥 button anywhere; waiting for damage there would
     * leave the player staring at a task the board can no longer let them do.
     */
    wait: (c, b) => c.s.life.foe < b.foeLife || outOfCombat(c.s),
    // Long, because what this step set off is a whole combat.
    hold: 1800,
  },
  {
    key: 'pass', chapter: C5, title: '結束回合',
    body: '',
    task: '按下「結束回合」',
    when: (c) => c.s.active === 'you' && outOfCombat(c.s),
    focus: () => ['button'],
    wait: (c, b) => (c.s.turn ?? 0) > b.turn,
    hold: 900,
  },

  /* ---- turn three: the mana is there for something that changes the whole board ---- */

  {
    key: 'land3', chapter: C6, title: '第三張魔法石',
    body: '每一回合都鋪一張，能打出來的東西就越來越大。',
    task: '再打出一張魔法石',
    when: (c) => myMain(c.s),
    focus: (c) => pick(c, c.s.zones.you.hand, (d) => d?.type === 'land'),
    wait: (c, b) => snap(c.s).lands > b.lands,
    hold: 900,
  },
  {
    key: 'aura', chapter: C6, title: '打出一張結界',
    body: '結界會一直留在戰場上：這張讓你所有的生物都得到 +1/+1，包括之後才召喚的。',
    task: '打出那張結界',
    when: (c) => myMain(c.s) && castable(c, 'enchantment').length > 0,
    focus: (c) => castable(c, 'enchantment'),
    wait: (c) => c.s.zones.you.field.some((i) => {
      try { return E.defOf(c.s, i)?.type === 'enchantment'; } catch { return false; }
    }),
    hold: 1600,
  },
  {
    key: 'pass3', chapter: C6, title: '再把回合交出去',
    body: '換對手了——這次留意他要做什麼。',
    task: '按下「結束回合」',
    when: (c) => c.s.active === 'you' && outOfCombat(c.s),
    focus: () => ['button'],
    wait: (c, b) => (c.s.turn ?? 0) > b.turn,
    hold: 900,
  },

  /* ---- defending, when there is actually something to defend against -------------- */

  {
    key: 'block', chapter: C7, title: '防守',
    body: '對手攻擊了。先點自己一隻沒橫置的生物，再點它要擋的攻擊者。',
    task: '指派一次阻擋',
    /*
     * Only once they have actually declared. The step used to open the moment the chapter
     * came round and then sit there telling you to block an attack that had not happened —
     * so it waits for their attackers to be on the table before it says anything.
     */
    when: (c) => c.s.phase === 'blk' && c.s.active !== 'you' && c.s.attackers.length > 0,
    // If they never swing, the lesson does not stand there waiting for them.
    skip: (c) => (c.s.turn ?? 0) > c.since + 4,
    /*
     * And it moves with you. Once you have picked a blocker up, the question is no longer
     * "which of mine" but "which of theirs" — so the light leaves your row and lands on the
     * attackers that blocker may legally stop, which is the same set the board itself is
     * lighting.
     */
    focus: (c) => {
      if (c.sel) {
        return c.s.attackers.filter((a) => {
          try { return E.canBlock(c.s, c.sel!, a).ok; } catch { return false; }
        });
      }
      return c.s.zones.you.field.filter((i) => {
        try { return E.defOf(c.s, i)?.type === 'creature' && !c.s.cards[i].tapped; } catch { return false; }
      });
    },
    wait: (c, b) =>
      Object.values(c.s.blocks ?? {}).some((a: any) => a?.length) || (c.s.turn ?? 0) > b.turn + 1,
    hold: 1600,
  },

  /* ---- a spell of your own, aimed at something of theirs -------------------------- */

  {
    key: 'spell', chapter: C8, title: '施放法術',
    body: '法術是一次性的：打出去、生效、進墳墓場。這張對一隻敵方生物造成 3 點傷害。',
    task: '打出弧光穿刺並選一隻敵方生物',
    // Only once they have something to aim at, and only when you can pay for it.
    when: (c) => myMain(c.s) && castable(c, 'sorcery').length > 0
      && c.s.zones.foe.field.some((i) => {
        try { return E.defOf(c.s, i)?.type === 'creature'; } catch { return false; }
      }),
    focus: (c) => castable(c, 'sorcery'),
    wait: (c) => c.s.zones.you.gy.some((i) => {
      try { return E.defOf(c.s, i)?.type === 'sorcery'; } catch { return false; }
    }),
    skip: (c) => (c.s.turn ?? 0) > c.since + 4,
    hold: 1600,
  },

  /* ---- answering a spell, when there is actually a spell to answer ---------------- */

  {
    key: 'counter', chapter: C9, title: '反擊對手的咒語',
    body: '對手正在施放咒語，上方在問你要不要反擊——打出手上的瞬間就能擋下它。',
    task: '用瞬間反擊對手的咒語',
    // The board asks this question itself, and only when it is real. The step waits for the
    // question rather than announcing it in advance.
    when: (c) => c.s.awaitResp === 'you',
    // Likewise: if nothing worth answering is ever cast, move on to the closing sequence.
    skip: (c) => (c.s.turn ?? 0) > c.since + 4,
    focus: (c) => pick(c, c.s.zones.you.hand, (d) => d?.type === 'instant'),
    // Escape hatch: the spell may resolve while you look at it.
    wait: (c, b) =>
      c.s.zones.you.gy.some((i) => {
        try { return E.defOf(c.s, i)?.type === 'instant'; } catch { return false; }
      }) || (c.s.turn ?? 0) > b.turn + 3,
    hold: 1400,
  },
  {
    key: 'done', chapter: C10, title: '你已經會玩了',
    body: '剩下的就是重複剛才那一輪，把對手的生命打完。',
    // Nothing. The lesson is over and this step is about the loop, not about any one
    // object on the table — so the light goes out and you get the whole board back.
    focus: () => null,
    finale: true,
  },
];

/* ------------------------------------------------------- the card's anatomy ---- */

/**
 * Where each part of a card sits, in the 2048 x 3072 the face is drawn at.
 *
 * Taken from the face renderer's own rectangles rather than eyeballed, so the box lands on
 * the part it names at any size the card is shown. The cost is the one that has to be
 * computed: its pips are laid out from the right edge inwards, so how far left it starts
 * depends on how many there are.
 */
const FACE_W = 2048;
const FACE_H = 3072;
const PIP_R = 54;
const PIP_GAP = 14;
const PIP_RIGHT = 1848;

const regionOf = (spot: Spot, pips: number): [number, number, number, number] => {
  switch (spot) {
    case 'cost': {
      /* A touch more room than the pips strictly occupy: the box is there to be seen from
         across a phone screen, and one drawn tight to the ink reads as part of the artwork.
         And a floor under the width, because how far left the pips start depends on how many
         there are — a two-pip cost drew a box small enough to be missed on a phone. */
      const left = PIP_RIGHT - PIP_R * 2 - (pips - 1) * (PIP_R * 2 + PIP_GAP);
      const right = PIP_RIGHT + 44;
      const x = Math.min(left - 44, right - 430);
      return [x, 160, right - x, 190];
    }
    case 'name': return [150, 150, 1100, 210];
    case 'art': return [150, 380, 1748, 1310];
    case 'type': return [150, 1700, 1748, 190];
    case 'text': return [150, 1910, 1748, 780];
    case 'stats': return [1340, 2710, 558, 150];
  }
};

const Anatomy: React.FC<{ spot?: Spot; tune?: Tune }> = ({ spot, tune }) => {
  const card = useMemo(() => {
    try { return (E as any).cardDefById(SHOWCARD) as CardDef; } catch { return null; }
  }, []);
  if (!card) return null;
  const t = tune?.card;
  const style: React.CSSProperties = {};
  if (t?.x !== undefined) style.left = `${t.x}%`;
  if (t?.y !== undefined) style.top = `${t.y}%`;
  if (t?.w !== undefined) style.width = `${t.w}px`;
  const region = spot ? regionOf(spot, costPips(card as any).length) : null;
  const pc = (v: number, of: number) => `${(v / of) * 100}%`;
  return (
    <div className="coach-anat" style={style}>
      <img src={getCardDataUrl(card as any)} alt={card.name} />
      {/* One box, moved rather than replaced, so the eye is carried from part to part. The
          step that introduces the card has none: it is about the whole object. */}
      {region && (
        <i
          className="coach-box"
          style={{
            left: pc(region[0], FACE_W), top: pc(region[1], FACE_H),
            width: pc(region[2], FACE_W), height: pc(region[3], FACE_H),
          }}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------- the pointer ---- */

/** The tutorial names the dice its own way; the board's anchor for them is the hero. */
const ANCHOR_ALIAS: Record<string, string> = { 'die-you': 'hero-you', 'die-foe': 'hero-foe' };

/**
 * Lines from the panel to whatever the step is about.
 *
 * One line per lit object, not one line to the middle of them. The middle of two dice on
 * opposite sides of the table is the middle of the table, and that is what the pointer used
 * to point at: an empty rectangle between the two things it meant. Past a handful — a hand
 * of seven — the lines would be a cage rather than a pointer, so those fall back to a single
 * line into the group, where the objects are close enough together that the middle of them
 * is one of them.
 *
 * Redrawn every frame from the projector, because the board is never still: cards ease into
 * their slots and the camera breathes, and a line that was right when the step opened is
 * worse than none. Written straight to the DOM rather than through state, so following the
 * board costs no renders.
 */
const MAX_LINES = 4;

/**
 * How long the line takes to reach out, in ms.
 *
 * The line used to simply exist: a step opened and a finished line was already lying across
 * the screen, so there was nothing to say which end was the panel and which end was the
 * thing. Drawing it — from the panel outwards, once, at the moment the step opens — is what
 * makes it a gesture rather than a diagram. Afterwards the dashes march, which is the
 * standing state; the reach is the arrival.
 */
const REACH_MS = 480;

/**
 * The one point on the panel every line of a chapter leaves from.
 *
 * Taken from the edges the panel is *pinned* by, never from the edges its own text decides.
 * A panel parked top-right is held by its top and right; its bottom edge moves with how long
 * the sentence is, so anchoring there gave a different departure point on every step of the
 * same chapter — which is the thing this is here to stop. The point sits a little inside the
 * panel, and the panel is drawn above the line, so what you see is a line coming out from
 * underneath it on whichever side the target is.
 */
const INSET = 40;
const anchorOf = (place: string, box: DOMRect): { x: number; y: number } => {
  const mx = box.left + box.width / 2;
  const top = box.top + INSET;
  const bottom = box.bottom - INSET;
  switch (place) {
    case 'tl': return { x: box.left + INSET, y: top };
    case 'tr': return { x: box.right - INSET, y: top };
    case 'bl': return { x: box.left + INSET, y: bottom };
    case 'br': return { x: box.right - INSET, y: bottom };
    case 'top': return { x: mx, y: top };
    // Held by its left edge and its own middle: the lines leave from the right-hand side,
    // which is the only side anything it can point at is on.
    case 'left': return { x: box.right - INSET, y: box.top + box.height / 2 };
    default: return { x: mx, y: bottom };
  }
};

const Pointer: React.FC<{
  anchor: React.RefObject<HTMLDivElement | null>;
  /** Which corner the panel is parked in, so every line in a chapter leaves the same point. */
  place: string;
  keys: string[];
  project?: (key: string) => { x: number; y: number } | null;
  /**
   * The anatomy chapter points at a box on a card rather than at an object on the board.
   *
   * That line is drawn differently on purpose: corner to corner, straight, and with nothing
   * at the far end. A ring around the corner of a rectangle that is already outlined is a
   * second outline saying the same thing, and a bowed line into a corner reads as pointing
   * past it. The panel's corner and the box's nearest corner, joined — that is the whole
   * gesture, and it still draws itself on the way in.
   */
  toBox?: boolean;
}> = ({ anchor, place, keys, project, toBox }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const reveals = useRef<(SVGPathElement | null)[]>([]);
  const rings = useRef<(SVGCircleElement | null)[]>([]);
  const sig = toBox ? 'box' : keys.join('|');
  const single = keys.length > MAX_LINES;
  const lanes = toBox ? 1 : single ? 1 : keys.length;
  /*
   * The keys as a ref as well as a prop. The effect below must not be torn down and rebuilt
   * on every render — rebuilding it restarts the reach, and picking a card up is a render, so
   * the line replayed its arrival every time the hand was touched. `sig` is what actually
   * changes when the step changes; the array itself is new every time regardless.
   */
  const keysRef = useRef(keys);
  keysRef.current = keys;

  useEffect(() => {
    if (!toBox && (!project || !sig)) return;
    let raf = 0;
    /*
     * The clock starts on the first frame that has somewhere to point, not on mount. A step
     * can open while the board still has no projection for what it names — a card that has
     * not been dealt yet — and starting the reach then would spend it on nothing.
     */
    let t0 = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const box = anchor.current?.getBoundingClientRect();
      if (!box) return;
      const list = keysRef.current;
      const points: { x: number; y: number }[] = [];
      const from0 = anchorOf(place, box);
      if (toBox) {
        const el = document.querySelector('.coach-box');
        const q = el?.getBoundingClientRect();
        if (q && q.width > 0) {
          // The corner of the box nearest the panel's own corner.
          points.push({
            x: Math.abs(q.left - from0.x) < Math.abs(q.right - from0.x) ? q.left : q.right,
            y: Math.abs(q.top - from0.y) < Math.abs(q.bottom - from0.y) ? q.top : q.bottom,
          });
        }
      } else if (single) {
        let sx = 0;
        let sy = 0;
        let n = 0;
        for (const k of list) {
          const at = project!(ANCHOR_ALIAS[k] ?? k);
          if (at) { sx += at.x; sy += at.y; n += 1; }
        }
        if (n) points.push({ x: sx / n, y: sy / n });
      } else {
        for (const k of list) {
          const at = project!(ANCHOR_ALIAS[k] ?? k);
          points.push(at ?? { x: NaN, y: NaN });
        }
      }
      /*
       * One point of departure for the whole chapter.
       *
       * Lines used to leave from whichever point of the panel's edge was nearest their own
       * target, which meant that within a single chapter the pointer set off from a different
       * place on every step — and, on a step with two targets, from two places at once. The
       * panel does not move inside a chapter, so neither should the hand it points with: the
       * corner it is parked in decides one departure point, and everything leaves from there.
       */
      const from = from0;
      for (let i = 0; i < lanes; i += 1) {
        const p = paths.current[i];
        const rev = reveals.current[i];
        const r = rings.current[i];
        if (!p || !rev || !r) continue;
        const to = points[i];
        const off = () => {
          p.setAttribute('d', '');
          rev.setAttribute('d', '');
          r.setAttribute('r', '0');
        };
        if (!to || Number.isNaN(to.x)) { off(); continue; }
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy);
        if (len < 26) { off(); continue; }
        // A shallow bow, so it reads as drawn rather than as a ruler laid on the screen —
        // except corner to corner, which is a straight line or it is not corner to corner.
        const bow = toBox ? 0 : Math.min(54, len * 0.16);
        const cx = (from.x + to.x) / 2 - (dy / len) * bow;
        const cy = (from.y + to.y) / 2 + (dx / len) * bow;
        const d = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
        p.setAttribute('d', d);
        rev.setAttribute('d', d);
        r.setAttribute('cx', String(to.x));
        r.setAttribute('cy', String(to.y));

        /*
         * The reach, done as a mask rather than as a stroke of its own.
         *
         * The first version drew a solid line to the target and then swapped it for the
         * dashed one, which is two lines along one path — you saw the solid arrive and the
         * dashes appear over it. There is only ever one line here now: the dashed stroke,
         * marching from the moment it exists, with a mask that opens along the path so the
         * dashes are uncovered one after another. Nothing swaps, and nothing overlaps.
         */
        if (t0 === 0) t0 = now;
        // Clamped at both ends: the first frame is seeded with `performance.now()` and the
        // callback after it is stamped with the *start* of its frame, which can be earlier —
        // so without the floor the opening frame asks for a line more than fully hidden.
        const reach = Math.max(0, Math.min(1, (now - t0) / REACH_MS));
        const total = rev.getTotalLength();
        const eased = 1 - (1 - reach) ** 3;
        rev.style.strokeDasharray = String(total);
        rev.style.strokeDashoffset = String(total * (1 - eased));
        r.setAttribute('r', toBox || reach < 1 ? '0' : '8');
      }
    };
    tick(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [sig, project, anchor, single, lanes, place, toBox]);

  if (toBox ? false : !project || !keys.length) return null;
  return (
    <svg className="coach-line" aria-hidden="true">
      <defs>
        {Array.from({ length: lanes }, (_, i) => (
          <mask key={i} id={`${uid}r${i}`} maskUnits="userSpaceOnUse">
            <path
              className="coach-reach"
              ref={(el) => { reveals.current[i] = el; }}
              stroke="#fff"
              strokeWidth="18"
              strokeLinecap="round"
              fill="none"
            />
          </mask>
        ))}
      </defs>
      {Array.from({ length: lanes }, (_, i) => (
        <g key={i}>
          <path ref={(el) => { paths.current[i] = el; }} mask={`url(#${uid}r${i})`} />
          <circle ref={(el) => { rings.current[i] = el; }} r="0" />
        </g>
      ))}
    </svg>
  );
};

/* -------------------------------------------------------------- the gallery ---- */

const TYPES: { type: CardDef['type']; label: string }[] = [
  { type: 'land', label: '魔法石' },
  { type: 'creature', label: '生物' },
  { type: 'artifact', label: '秘寶' },
  { type: 'enchantment', label: '結界' },
  { type: 'sorcery', label: '法術' },
  { type: 'instant', label: '瞬間' },
];

const Gallery: React.FC<{ tune?: Tune }> = ({ tune }) => {
  const fx = useCardFx();
  const g = tune?.gallery;
  const style: React.CSSProperties = {};
  if (g?.y !== undefined) style.top = `${g.y}%`;
  if (g?.scale !== undefined) style.setProperty?.call(style, '--coach-gal', String(g.scale));
  const picks = useMemo(() => {
    const pool = (Object.values(E.CARDS) as CardDef[]).filter((c) => !c.token);
    return TYPES.map((t) => {
      const of = pool.filter((c) => c.type === t.type);
      /*
       * Two-colour first, because a gold frame shows the gradient at its clearest and this
       * step is about telling frames apart. The set has multicoloured 魔法石 and 生物 and
       * nothing else, so the other four fall back to the highest rarity available — those
       * still carry a two-stop gradient of their own colour, which is what there is.
       */
      /*
       * ...and, off a creature, one with no subtype. The step is "these are the six kinds",
       * and the artifact it had been picking printed 秘寶 — 裝備, which reads as a seventh
       * kind rather than as an example of the third. A creature keeps its subtype: 生物 —
       * 騎士 is what a creature's type line looks like, and hiding it would teach the wrong
       * shape.
       */
      const plain = t.type === 'creature' ? of : of.filter((c) => !(c.sub?.length));
      const from = plain.length ? plain : of;
      const card = from.find((c) => isMulticolour(c as any))
        ?? from.find((c) => c.rarity === 'M')
        ?? from.find((c) => c.rarity === 'R')
        ?? from.find((c) => c.rarity === 'U')
        ?? from[0];
      return { ...t, card };
    }).filter((t) => t.card);
  }, []);

  return (
    <>
      <div className="coach-gallery" style={{ ...style, ...(g?.scale !== undefined ? ({ ['--coach-gal' as any]: String(g.scale) } as any) : null) }}>
        {picks.map((t) => (
          <figure key={t.type}>
            <span className="fx-slot" ref={fx.slot(`coach:${t.type}`, t.card as any)}>
              <img src={getCardThumbUrl(t.card as any)} alt={t.card!.name} />
            </span>
            <figcaption><b>{t.label}</b></figcaption>
          </figure>
        ))}
      </div>
      {/* Outside the centred container: a transformed ancestor would become the containing
          block for a fixed-position canvas, and the layer measures itself against it. */}
      <fx.Layer z={52} />
    </>
  );
};

/* ------------------------------------------------------------------- coach ---- */

interface Props {
  state: GameState;
  /** Publishes the objects the board should keep lit. Null when nothing is lit. */
  onFocus: (keys: string[] | null) => void;
  /**
   * Publishes what the board should let the player touch, which is a different question.
   *
   * A reading step lights nothing, and the board must not be dimmed for it — but nothing
   * being lit is still an instruction, and the instruction is "not yet": no card may be
   * played and the key does nothing. A step that is waiting on the opponent means the
   * opposite, and has to leave the board completely live, because what it is waiting for is
   * the player carrying on with their own turn. An empty array is the first; null is the
   * second.
   */
  onGate: (keys: string[] | null) => void;
  onExit: () => void;
  /** Where a board object is on screen, so the pointer can reach it. */
  project?: (key: string) => { x: number; y: number } | null;
  /** Which step is open, for the one or two the board has to set up for. */
  onStep?: (key: string) => void;
  /**
   * Which step has come up in the queue — which is not the same thing.
   *
   * A gated step can sit unopened for several turns waiting for the board to be ready for it,
   * and some of that readiness is the board's job to arrange: the defending chapter waits for
   * the opponent to attack, and the opponent cannot attack until the lesson hands their
   * creatures back. Handing them back when the step *opens* would be a circle.
   */
  onEnter?: (key: string) => void;
  /** The blocker the player is holding, if any — the defending step follows it. */
  selected?: string | null;
  /**
   * True while the board is announcing something of its own — a turn banner and the beat
   * after it. The lesson does not talk over the board: a sentence that arrives on top of
   * 「你的回合」 is two things asking to be read at once, and the one that matters at that
   * moment is the board's.
   */
  quiet?: boolean;
}

export const Coach: React.FC<Props> = ({ state, onFocus, onGate, onExit, project, onStep, onEnter, selected, quiet }) => {
  const [at, setAt] = useState(0);
  const [ready, setReady] = useState(false);
  const baseRef = useRef<Snapshot>(snap(state));
  const panelRef = useRef<HTMLDivElement>(null);

  const step = STEPS[at];
  const lastStep = at === STEPS.length - 1;
  /*
   * The tuning overrides, when the page was opened by the tuner. `tune` is an empty object
   * in every other case, so every read below falls through to the stylesheet.
   */
  const [live, setLive] = useState<Tune>(tuning.value);
  useEffect(() => tuning.subscribe(() => setLive({ ...tuning.value })), []);
  /*
   * The baked phone layout underneath, the tuner's live one on top. On a desktop there is
   * nothing baked, so this is the empty object and the stylesheet decides everything.
   */
  const tune: Tune = useMemo(() => {
    const base = typeof document !== 'undefined' && document.documentElement.hasAttribute('data-touch')
      ? PHONE_LAYOUT : {};
    return {
      ...base,
      ...live,
      panel: { ...base.panel, ...live.panel },
      card: { ...base.card, ...live.card },
      gallery: { ...base.gallery, ...live.gallery },
    };
  }, [live]);
  useEffect(() => tuneJump.subscribe((n) => setAt(Math.max(0, Math.min(STEPS.length - 1, n)))), []);

  /** The turn the current step came up on, for the steps that are allowed to give up. */
  const sinceRef = useRef(state.turn ?? 0);
  const sinceAtRef = useRef(-1);
  if (sinceAtRef.current !== at) { sinceAtRef.current = at; sinceRef.current = state.turn ?? 0; }
  const ctx: Ctx = { s: state, sel: selected ?? null, since: sinceRef.current };

  /*
   * Whether this step may speak yet.
   *
   * Once a step has opened it stays open — `held` is only consulted on the way in. A step
   * that asked for an attack and then fell silent halfway through because the phase moved on
   * would be worse than one that arrived early.
   */
  const gate = step.when ? step.when(ctx) : true;
  const openedRef = useRef(-1);
  if (gate && openedRef.current !== at) openedRef.current = at;
  /* In the tuner every step is live: it is a layout tool, and a step that hides itself until
     the opponent attacks cannot be laid out. In a real game this is always false. */
  const held = tuning.on ? false : openedRef.current !== at || !!quiet;
  const giveUp = held && openedRef.current !== at && !!step.skip?.(ctx);

  /* A waiting step measures against the board as it was when the step opened — and "opened"
     means the moment it was allowed to speak, not the moment it came up in the list. A step
     queued behind `when` may wait out a whole turn of the opponent's; measuring from then
     would count their turn as progress towards your task. */
  const liveAt = openedRef.current === at ? at : -1;
  /*
   * The moment the step index changes, whatever the last step achieved stops counting.
   *
   * `ready` used to be reset only when a step actually opened — but a step queued behind
   * `when` does not open for a while, and until it did it inherited the previous step's
   * `ready === true`. The hand-over timer saw a finished task and moved on, so every gated
   * step in a row skipped itself the instant it came up.
   */
  useEffect(() => {
    setReady(!STEPS[at].wait);
    onEnter?.(STEPS[at].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);

  // A step that has given up waiting steps aside without ever having been on screen.
  useEffect(() => {
    if (!giveUp || lastStep) return;
    setAt((n) => (n === at ? n + 1 : n));
  }, [giveUp, lastStep, at]);
  useEffect(() => {
    if (liveAt < 0) return;
    baseRef.current = snap(state);
    setReady(!step.wait);
    onStep?.(step.key);
    // `state` deliberately absent: the baseline is taken once, when the step opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveAt]);

  /*
   * A held step is the lesson standing back: it says nothing, lights nothing, and — the part
   * that is not the same — restricts nothing. What it is waiting for is the player playing
   * their own turn, so the board has to be entirely theirs while it waits.
   */
  const keys = useMemo(() => (held ? null : step.focus(ctx)), [step, state, selected, held]);
  const keySig = keys === null ? 'off' : keys.join('|');
  useEffect(() => {
    // No named objects, no veil — see `focus` above.
    onFocus(keys && keys.length ? keys : null);
    onGate(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keySig, onFocus, onGate]);
  useEffect(() => () => { onFocus(null); onGate(null); }, [onFocus, onGate]);

  // The board is what says a task is done, so the check rides the state it produces.
  useEffect(() => {
    if (!step.wait || ready || liveAt < 0) return;
    if (step.wait(ctx, baseRef.current)) {
      setReady(true);
      sfx.bannerGood();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, step, ready]);

  /*
   * Test hook. Builds made without VITE_TEST_HOOK compile this to a dead branch, so the
   * shipped file has no way to jump the lesson about — it exists because walking the whole
   * lesson through a software renderer takes a quarter of an hour, and the closing sequence
   * is at the end of it.
   */
  useEffect(() => {
    if (!import.meta.env.VITE_TEST_HOOK) return;
    (window as any).__coachGo = (n: number) => setAt(Math.max(0, Math.min(STEPS.length - 1, n)));
    (window as any).__coachAt = at;
    (window as any).__coachSteps = STEPS.map((x) => x.key);
  }, [at]);

  const advance = useCallback(() => {
    sfx.tap();
    if (lastStep) { onExit(); return; }
    setAt((n) => n + 1);
  }, [lastStep, onExit]);

  /*
   * A step you *did* moves on by itself.
   *
   * Asking someone to play a 魔法石, watching them play it, and then asking them to press
   * 繼續 to acknowledge that they played it is a button for nothing: the board already told
   * them, twice — the card is on the table and the chime went off. So the doing-steps carry
   * their own pause instead, long enough for whatever the action set off to be seen, and
   * then hand over. The reading-steps keep the button, because nothing on the board can know
   * when a sentence has been read.
   */
  useEffect(() => {
    if (!ready || !step.wait || lastStep) return;
    const id = window.setTimeout(() => setAt((n) => (n === at ? n + 1 : n)), step.hold ?? 900);
    return () => window.clearTimeout(id);
  }, [ready, step, lastStep, at]);

  /*
   * Where the panel sits: measured, and settled once per chapter.
   *
   * Two rules pull against each other. The panel must not cover what the step is about —
   * which argues for moving it as often as the subject moves — and it must not jump around
   * under the reader, which argues for never moving it at all. A step is a sentence; a
   * chapter is a subject. So the placement is decided when the chapter opens, against
   * everything that chapter is going to point at, and then held: within 認識牌桌 or 一張牌
   * the panel is furniture, and it only ever moves when the lesson does.
   *
   * "Everything that chapter is going to point at" is computable, because a step's focus is
   * a function of the board — so the later steps of the chapter are asked where they will be
   * pointing, and their answers are projected and folded into one rectangle. The steps that
   * hold a card up or lay the six kinds out contribute the middle of the screen, measured
   * from the real element when it is on screen and predicted from its own layout rules when
   * it is not.
   *
   * Placements are then scored rather than short-circuited: the first one that clears the
   * subject wins, and when nothing can clear it — a card held up in the middle of a phone —
   * the least-covering one wins instead of an arbitrary corner.
   */
  const chapter = step.chapter;
  const [place, setPlace] = useState('tl');
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    /*
     * A pinned corner is not a hint, it is the answer.
     *
     * This pass writes the class straight onto the element, so it used to run after the
     * render and quietly overwrite whatever the tuning had asked for — the panel would come
     * up in the tuned corner and then move. If the corner is given, take it and measure
     * nothing.
     */
    const pinned = tune.panel?.[chapter]?.place ?? STEPS.find((x) => x.chapter === chapter && x.pin)?.pin;
    if (pinned) {
      el.className = `${el.className.replace(/\s*at-[a-z]+/g, '')} at-${pinned}`;
      setPlace(pinned);
      return;
    }
    const W = window.innerWidth;
    const H = window.innerHeight;

    const union = (a: DOMRect | null, b: DOMRect | null): DOMRect | null => {
      if (!a) return b;
      if (!b) return a;
      const l = Math.min(a.left, b.left);
      const t = Math.min(a.top, b.top);
      return new DOMRect(l, t, Math.max(a.right, b.right) - l, Math.max(a.bottom, b.bottom) - t);
    };

    /** What a step points at on the board, as a rectangle. */
    const boardBox = (list: string[] | null): DOMRect | null => {
      if (!project || !list?.length) return null;
      // A board object is a point; what it covers is roughly a card around that point.
      const pad = Math.max(52, Math.min(96, H * 0.19));
      let l = Infinity;
      let t = Infinity;
      let r = -Infinity;
      let b = -Infinity;
      for (const k of list) {
        const at2 = project(ANCHOR_ALIAS[k] ?? k);
        if (!at2) continue;
        l = Math.min(l, at2.x - pad); r = Math.max(r, at2.x + pad);
        t = Math.min(t, at2.y - pad); b = Math.max(b, at2.y + pad);
      }
      return l === Infinity ? null : new DOMRect(l, t, r - l, b - t);
    };

    /** The card or the gallery: measured when it is on screen, predicted when it is not. */
    const centreBox = (kind: 'card' | 'gallery'): DOMRect => {
      /* The gallery is measured by its cards, not by its container. The container runs the
         full width of the screen so that the row can centre itself in it; taking its
         rectangle would tell the panel that the whole width of the screen is occupied, when
         what is actually there is six cards in the middle of it. */
      if (kind === 'gallery') {
        const figs = [...document.querySelectorAll('.coach-gallery figure')];
        if (figs.length) {
          const rs = figs.map((f) => f.getBoundingClientRect());
          const l = Math.min(...rs.map((r) => r.left));
          const t = Math.min(...rs.map((r) => r.top));
          return new DOMRect(l, t, Math.max(...rs.map((r) => r.right)) - l, Math.max(...rs.map((r) => r.bottom)) - t);
        }
      }
      const want = kind === 'card' ? '.coach-anat' : '.coach-gallery';
      const live = document.querySelector(want) ?? document.querySelector(
        kind === 'card' ? '.coach-gallery' : '.coach-anat',
      );
      if (live) return live.getBoundingClientRect();
      const w = Math.min(W * (kind === 'card' ? 0.5 : 0.9), 560);
      const h = Math.min(H * 0.8, 420);
      return new DOMRect((W - w) / 2, (H - h) / 2, w, h);
    };

    /*
     * One rectangle per step of the chapter, not one rectangle over all of them.
     *
     * Folding them together first was the tidier idea and the worse one: the union of the two
     * dice, the hand and the button is very nearly the whole screen, most of which is table
     * that nothing is standing on — so every placement "overlapped the subject" and the panel
     * settled for the least-bad corner even when a corner existed that cleared all three.
     * Scored step by step, a placement that clears every step of the chapter can be found.
     */
    const boxes: DOMRect[] = [];
    for (const s of STEPS) {
      if (s.chapter !== chapter) continue;
      const box = s.gallery ? centreBox('gallery')
        : s.card ? centreBox('card')
          : boardBox(s.focus(ctx));
      if (box) boxes.push(box);
    }

    const overlap = (a: DOMRect, c: DOMRect) =>
      Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left)) *
      Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top));

    const centre = boxes.length
      ? boxes.reduce((acc, r) => union(acc, r), null as DOMRect | null)!
      : null;

    // Furthest from the lesson first, so a tie between two clear placements goes to the one
    // that reads as furthest out of the way.
    const order = centre
      ? (['top', 'bottom', 'tl', 'tr', 'bl', 'br'] as const)
        .map((k) => {
          const cx = k === 'top' || k === 'bottom' ? W / 2 : k.endsWith('l') ? 0 : W;
          const cy = k === 'top' || k.startsWith('t') ? 0 : H;
          return { k, d: Math.hypot(cx - (centre.left + centre.width / 2), cy - (centre.top + centre.height / 2)) };
        })
        .sort((a2, b2) => b2.d - a2.d)
        .map((v) => v.k)
      : (['tl'] as const);

    const base = el.className.replace(/\s*at-[a-z]+/g, '');
    let best = order[0];
    let bestHits = Infinity;
    let bestArea = Infinity;
    for (const k of order) {
      el.className = `${base} at-${k}`;
      const me = el.getBoundingClientRect();
      let hits = 0;
      let area = 0;
      for (const q of boxes) {
        const a = overlap(me, q);
        if (a > 0) { hits += 1; area += a; }
      }
      if (hits === 0) { best = k; bestHits = 0; break; }
      if (hits < bestHits || (hits === bestHits && area < bestArea)) {
        bestHits = hits; bestArea = area; best = k;
      }
    }
    el.className = `${base} at-${best}`;
    setPlace(best);
    // Measured when the chapter opens. `ctx` is rebuilt every render and is deliberately not
    // a dependency: re-measuring on every board change is the jumping this exists to stop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, project, tune]);

  /*
   * And never over the three keys along the top of the board.
   *
   * 退出對戰, the turn plate and 戰鬥紀錄 are the board's own chrome, and a lesson that hides
   * the way out of the match while it explains the match is a lesson covering something the
   * player may want more than the lesson. Their bottom edge is measured — it moves with the
   * notch inset on a phone, and 戰鬥紀錄 is not there at all on a small screen — and the top
   * placements start below whatever that comes to.
   */
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    let low = 0;
    for (const sel of ['.btn-quit', '.hud-phase', '.btn-log']) {
      const r = document.querySelector(sel)?.getBoundingClientRect();
      if (r && r.height > 0) low = Math.max(low, r.bottom);
    }
    /* The tuner can add an inset the browser it is running in does not have, so a phone's
       notch can be seen on a desktop screen. Zero in a real game. */
    el.style.setProperty('--coach-top', `${Math.round(low > 0 ? low + 12 : 34)}px`);
    /*
     * Both short edges. A phone held sideways puts the sensor housing on one of them and the
     * home indicator on the other, and which is which depends on the way it was turned — so
     * the panel keeps clear of both rather than guessing which.
     *
     * Written only when the tuning page is standing in for a notch the browser does not have.
     * In a real game these are left unset, so the rules fall through to `env(safe-area-inset-*)`
     * — an inline `0px` here would beat the stylesheet and quietly cancel the real inset.
     */
    if (tuning.on) {
      const extra = tune.inset ?? 0;
      el.style.setProperty('--coach-left', `${Math.round(extra)}px`);
      el.style.setProperty('--coach-right', `${Math.round(extra ? 21 : 0)}px`);
    } else {
      el.style.removeProperty('--coach-left');
      el.style.removeProperty('--coach-right');
    }
  }, [place, at, tune]);

  /*
   * The tuner's version of the panel: its corner, a nudge from it, its width and its text
   * size. Everything here is undefined in a normal game, so the stylesheet is untouched.
   */
  const pt = tune.panel?.[chapter];
  const shownPlace = pt?.place ?? step.pin ?? place;
  const panelStyle = useMemo(() => {
    const st: React.CSSProperties = {};
    if (!pt) return st;
    if (pt.w !== undefined) st.width = `${pt.w}px`;
    if (pt.scale !== undefined) (st as any).fontSize = `${pt.scale * 100}%`;
    const dx = pt.dx ?? 0;
    const dy = pt.dy ?? 0;
    if (dx || dy) {
      const centred = shownPlace === 'top' || shownPlace === 'bottom';
      st.transform = centred ? `translate(calc(-50% + ${dx}px), ${dy}px)` : `translate(${dx}px, ${dy}px)`;
    }
    return st;
  }, [pt, shownPlace]);

  /* The whole script, once, so the tuner can list every step before any of them is visited. */
  useEffect(() => {
    if (!tuning.on) return;
    report({ kind: 'script', steps: STEPS.map((x) => ({ key: x.key, chapter: x.chapter, title: x.title, body: x.body, task: x.task ?? null })) });
  }, []);

  /* What the tuner is looking at, sent up on every step so its own controls can follow. */
  useEffect(() => {
    if (!tuning.on) return;
    const el = panelRef.current;
    const r = el?.getBoundingClientRect();
    const anat = document.querySelector('.coach-anat')?.getBoundingClientRect();
    const figs = [...document.querySelectorAll('.coach-gallery figure')].map((f) => f.getBoundingClientRect());
    report({
      kind: 'step',
      at,
      total: STEPS.length,
      step: step.key,
      chapter: step.chapter,
      title: step.title,
      body: step.body,
      task: step.task ?? null,
      place: shownPlace,
      held,
      viewport: [window.innerWidth, window.innerHeight],
      panel: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null,
      card: anat ? [Math.round(anat.left), Math.round(anat.top), Math.round(anat.width), Math.round(anat.height)] : null,
      gallery: figs.length
        ? [Math.round(Math.min(...figs.map((f) => f.left))), Math.round(Math.min(...figs.map((f) => f.top))),
           Math.round(Math.max(...figs.map((f) => f.right)) - Math.min(...figs.map((f) => f.left))),
           Math.round(Math.max(...figs.map((f) => f.bottom)) - Math.min(...figs.map((f) => f.top)))]
        : null,
    });
  }, [at, shownPlace, held, tune, step]);

  /*
   * The closing sequence.
   *
   * The first version was a struck rosette that arrived all at once — thirty-six rays and two
   * rings, popped on in a fifth of a second. Borrowed from the win screen, where a burst is
   * right because you have just won something; here nobody has won anything, they have
   * finished learning, and a burst at the end of a lesson is applause for sitting still.
   *
   * This one is drawn instead of thrown, in the lesson's own hand: the dashed line that has
   * been pointing at things for eleven chapters comes back as a ring that draws itself all the
   * way round and closes. Twelve marks light one after another around it — the chapters,
   * counted off — a second ring turns slowly the other way, and the sigil in the middle draws
   * last. Everything is a stroke being laid down, nothing is a flash.
   */
  if (step.finale) {
    return (
      <div className="coach-fin">
        <div className="coach-fin-art" aria-hidden="true">
          <svg viewBox="-50 -50 100 100">
            {/* Two hairlines writing themselves round, against each other, well outside the
                words. The dash has to be the circle's own circumference, handed to the
                stylesheet: `pathLength` is the tidy way to normalise it and Chromium does not
                apply it to a `<circle>`, which drew a 1px dot and nothing else. */}
            <circle className="fin-arc" r="44" style={{ ['--len' as string]: 2 * Math.PI * 44 }} />
            <circle className="fin-arc slow" r="48" style={{ ['--len' as string]: 2 * Math.PI * 48 }} />
            {/* Twelve marks between them, lit one after another from the top: the chapters,
                counted off. */}
            <g className="fin-ticks">
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
                return (
                  <line
                    key={i}
                    x1={Math.cos(a) * 44} y1={Math.sin(a) * 44}
                    x2={Math.cos(a) * 48} y2={Math.sin(a) * 48}
                    style={{ animationDelay: `${0.55 + i * 0.06}s` }}
                  />
                );
              })}
            </g>
          </svg>
        </div>
        {/* Two rules that open outwards from the middle, one above the tag and one under the
            title — the stamp closing around the words rather than a burst behind them. */}
        <i className="coach-fin-rule" aria-hidden="true" />
        <span className="coach-fin-tag">{C10}</span>
        <h2>教學完成</h2>
        <i className="coach-fin-rule late" aria-hidden="true" />
        <p>{step.body}</p>
        <button className="coach-next" onClick={() => { sfx.tap(); onExit(); }}>
          回到牌組選擇
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
        </button>
      </div>
    );
  }

  return (
    <>
      {step.gallery && <Gallery tune={tune} />}
      {step.card && <Anatomy spot={step.spot} tune={tune} />}
      {/* Nothing is drawn while the step is waiting its turn: no panel, no light, no line. */}
      {!held && <Pointer anchor={panelRef} place={shownPlace} keys={keys ?? []} project={project} toBox={!!step.spot} />}
      <div
        className={`coach-say at-${shownPlace}${step.card ? ' on-card' : ''}${held ? ' waiting' : ''}`}
        ref={panelRef}
        aria-hidden={held}
        style={panelStyle}
      >
        <span className="coach-step">
          <b>{step.chapter}</b>
          {at + 1} / {STEPS.length}
        </span>
        <h2>{tune.text?.[step.key]?.title ?? step.title}</h2>
        {/* An empty body is a step whose title says the whole thing; it gets no paragraph
            rather than an empty one, which would leave a gap under the heading. */}
        {(() => {
          const text = tune.text?.[step.key]?.body ?? step.body;
          return text ? <p>{text}</p> : null;
        })()}
        <div className="coach-act">
          {/* A step you had to *do* never shows a button. Doing it is the button: the task
              line stays up until the board says it happened, and then the lesson moves on by
              itself. Only the reading steps have anything to press. */}
          {step.wait ? (
            <span className={`coach-task${ready ? ' done' : ''}`}><i />{ready ? '完成' : (tune.text?.[step.key]?.task ?? step.task)}</span>
          ) : (
            <button className="coach-next" onClick={advance}>
              繼續
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
