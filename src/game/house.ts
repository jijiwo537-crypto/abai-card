/**
 * House rules: the keywords and card effects the engine does not know about.
 *
 * The engine is a fixed vocabulary — sixteen keywords and seventeen effect kinds — and it
 * is not ours to rewrite. Everything here is layered around it instead:
 *
 *   - The reducer runs first, exactly as it always did.
 *   - `houseBefore` gets a look at an action on its way in, which is how the target a house
 *     spell was pointed at gets remembered — the engine has resolved and discarded the card
 *     by the time the effect needs to know.
 *   - `houseAfter` gets the state on its way out and finishes the job: it notices what
 *     just happened, applies the effects the engine had no case for, and re-derives the
 *     continuous ones.
 *
 * Statuses are carried on `state.house`, which is ours, and mirrored into the engine's own
 * `temp` list every pass — `temp` is what the engine already consults when it works out a
 * creature's power, toughness and keywords, so a house status changes the numbers the
 * engine itself uses rather than being painted on afterwards.
 *
 * The single exception is damage prevention, which has to be asked *during* the reducer:
 * see `HOUSE` in the engine.
 */

import * as E from './engine';
import type { GameState, Side } from './engine';
import type { CardDef } from './types';
import { HOUSE_CARDS } from './houseCards';
import {
  HOUSE_KEYWORD_NAME, HOUSE_KEYWORD_TEXT, TEMPER, type HouseEffect,
} from './houseKeywords';

export { TEMPER, type HouseEffect };

// -------------------------------------------------------------- house state --

interface HouseState {
  /** Instance id → how much power it has earned by being hurt. */
  temper: Record<string, number>;
  /** The target the player pointed a house spell at, kept until the spell resolves. */
  aim: Record<string, string>;
  /** Ids of house spells already resolved, so nothing fires twice. */
  done: string[];
}

type HouseGameState = GameState & { house?: HouseState };

const blank = (): HouseState => ({ temper: {}, aim: {}, done: [] });

const houseOf = (s: HouseGameState): HouseState => s.house ?? blank();

/** Every house card, by id — the engine's registry once `installHouse` has run. */
const defOf = (s: GameState, iid: string): CardDef | undefined => {
  try { return E.defOf(s, iid) as CardDef; } catch { return undefined; }
};

const isHouse = (def?: CardDef) => !!def && !!HOUSE_CARDS[def.id];

/** What a house card does, over and above whatever the engine made of it. */
const houseSpellOf = (def?: CardDef) =>
  def ? (HOUSE_CARDS[def.id] as CardDef & { house?: HouseEffect })?.house : undefined;

// ------------------------------------------------------------------ install --

let installed = false;

/**
 * Registers the house cards and the damage filter. Safe to call more than once, and it
 * must run before the first match is built so the decks can see the new cards.
 */
export function installHouse() {
  if (installed) return;
  installed = true;

  for (const [id, def] of Object.entries(HOUSE_CARDS)) {
    (E.CARDS as Record<string, CardDef>)[id] = def as CardDef;
  }
  Object.assign(E.KEYWORD_NAME as Record<string, string>, HOUSE_KEYWORD_NAME);
  Object.assign(E.KEYWORD_TEXT as Record<string, string>, HOUSE_KEYWORD_TEXT);

  /*
   * Damage prevention. Every source is reduced by one for each shield its controller has
   * out, and a blow reduced to nothing is prevented outright rather than dealt as zero —
   * which also means no deathtouch and no lifelink off it.
   */
  (E as any).HOUSE.creatureDamage = (s: GameState, target: string, amount: number) => {
    const owner = s.cards[target]?.owner;
    if (!owner) return amount;
    let shields = 0;
    for (const iid of s.zones[owner].field) {
      const def = defOf(s, iid);
      const h = def && (HOUSE_CARDS[def.id] as any)?.shield;
      if (h) shields += h as number;
    }
    return shields ? Math.max(0, amount - shields) : amount;
  };

  /*
   * `permanent` — anything on either battlefield, whatever its type. The engine stops at
   * creatures, and a card that destroys a land or a enchantment has to be able to say so
   * while the cast is still being set up, not after.
   */
  (E as any).HOUSE.targets = (s: GameState, side: Side, cls: string) => {
    if (cls === 'permanent') {
      const iids: string[] = [];
      for (const owner of ['you', 'foe'] as Side[]) {
        for (const iid of s.zones[owner].field) {
          // Hexproof protects against an opponent's spell exactly as it always does.
          if (owner !== side && E.hasKeyword(s, iid, 'hexproof')) continue;
          iids.push(iid);
        }
      }
      return { iids, players: [] };
    }
    /*
     * `oppAny` — the opponent and the opponent's creatures. The engine's `any` includes your
     * own side, which is correct for a spell you might want to point at yourself and wrong
     * for every burn spell in the game: nobody aims a bolt at their own face on purpose, so
     * offering it as a legal target only creates misclicks.
     */
    if (cls === 'oppAny' || cls === 'oppPlayer') {
      const foe = opp(side);
      const iids = cls === 'oppPlayer' ? [] : s.zones[foe].field.filter(
        (iid) => E.defOf(s, iid)?.type === 'creature' && !E.hasKeyword(s, iid, 'hexproof'),
      );
      return { iids, players: [foe] };
    }
    return null;
  };
}

// ------------------------------------------------------------------- before --

/** What `houseBefore` decided about an action. */
export type Screened =
  /** Refused outright: the state stands as it was. */
  | { verdict: 'refuse' }
  /** Let through, but against this amended state rather than the one handed in. */
  | { verdict: 'amend'; state: HouseGameState }
  /** Nothing to say. */
  | { verdict: 'pass' };

/** An action on its way in. */
export function houseBefore(prev: HouseGameState, action: any): Screened {
  /*
   * Remember what a house spell was pointed at. The engine will resolve the card and drop
   * it in the graveyard, and by then its pending — and the target with it — is gone.
   */
  if (action?.t === 'chooseTarget' && prev.pending) {
    const def = defOf(prev, prev.pending.card);
    if (isHouse(def) && typeof action.tid === 'string') {
      const amended = clone(prev);
      const ah = houseOf(amended);
      ah.aim[prev.pending.card] = action.tid;
      amended.house = ah;
      return { verdict: 'amend', state: amended };
    }
  }
  return { verdict: 'pass' };
}

// -------------------------------------------------------------------- after --

/** The state on its way out: finish what the engine had no case for. */
export function houseAfter(prev: HouseGameState, next: HouseGameState, action: any): HouseGameState {
  const s = clone(next);
  const h: HouseState = {
    temper: { ...houseOf(prev).temper },
    aim: { ...houseOf(prev).aim, ...houseOf(next).aim },
    done: [...houseOf(prev).done],
  };

  earnTemper(prev, s, h);
  resolveHouseSpells(prev, s, h, action);
  forget(s, h);
  s.house = h;
  mirror(s, h);
  return s;
}

/** A creature with 淬煉 grows a little every time something gets through to it. */
function earnTemper(prev: GameState, s: GameState, h: HouseState) {
  for (const side of ['you', 'foe'] as Side[]) {
    for (const iid of s.zones[side].field) {
      const def = defOf(s, iid);
      if (!def || !(def.kw ?? []).includes(TEMPER as any)) continue;
      const before = prev.cards[iid]?.damage ?? 0;
      const after = s.cards[iid]?.damage ?? 0;
      if (after > before) h.temper[iid] = (h.temper[iid] ?? 0) + 1;
    }
  }
}

/** Statuses on cards that are no longer anywhere stop taking up room. */
function forget(s: GameState, h: HouseState) {
  const alive = new Set<string>();
  for (const side of ['you', 'foe'] as Side[]) s.zones[side].field.forEach((i) => alive.add(i));
  for (const iid of Object.keys(h.temper)) if (!alive.has(iid)) delete h.temper[iid];
}

/**
 * The engine's own view of a creature.
 *
 * `temp` is the list the engine already consults for power, toughness and keywords, so
 * writing house statuses into it means the engine's own arithmetic — including what the
 * opponent's search sees — accounts for them. Ours are tagged and rewritten every pass, so
 * they survive the engine clearing the list at end of turn and never accumulate.
 */
function mirror(s: GameState, h: HouseState) {
  const kept = (s.temp ?? []).filter((t) => !(t as any).house);
  const mine: any[] = [];
  for (const [iid, n] of Object.entries(h.temper)) {
    if (n) mine.push({ iid, p: n, t: 0, kw: [TEMPER], house: true });
  }
  s.temp = [...kept, ...mine];
}

/** A house spell that has just finished resolving, and what it does. */
function resolveHouseSpells(prev: GameState, s: HouseGameState, h: HouseState, action: any) {
  void action;
  const countered = new Set(
    s.fx.filter((f) => f.kind === 'counter' && f.src).map((f) => f.src as string),
  );
  for (const side of ['you', 'foe'] as Side[]) {
    const before = new Set(prev.zones[side].gy);
    for (const iid of s.zones[side].gy) {
      if (before.has(iid) || h.done.includes(iid) || countered.has(iid)) continue;
      const def = defOf(s, iid);
      const eff = houseSpellOf(def);
      if (!eff) continue;
      h.done.push(iid);
      if (h.done.length > 200) h.done.splice(0, h.done.length - 200);
      apply(s, h, eff, side, h.aim[iid] ?? prev.stack?.target);
      delete h.aim[iid];
    }
  }
}

const opp = (side: Side): Side => (side === 'you' ? 'foe' : 'you');

function say(s: GameState, line: string, c?: 'good' | 'bad' | 'sys') {
  s.log = [...s.log, { s: line, c: c as any }];
}

function fx(s: GameState, f: Record<string, unknown>) {
  s.fxId = (s.fxId ?? 0) + 1;
  s.fx = [...s.fx, { id: s.fxId, ...f } as any];
}

function apply(s: HouseGameState, h: HouseState, eff: HouseEffect, caster: Side, target?: string) {
  switch (eff.kind) {
    case 'sweep': {
      /*
       * One volley, not a queue. Every creature is hit on the same beat — the effects layer
       * lays a batch of `hitC` out by the delay each one carries, so giving them all the
       * same delay is what makes the whole row go up at once.
       */
      const amount = eff.amount ?? 1;
      const victims = [...s.zones[opp(caster)].field].filter(
        (i) => E.defOf(s, i)?.type === 'creature',
      );
      if (!victims.length) { say(s, '（對方沒有生物）'); return; }
      // One tag for the whole volley: the effects layer throws every orb on the same beat.
      const salvo = s.fxId + 1;
      for (const iid of victims) damage(s, iid, amount, caster, salvo);
      say(s, `對手的所有生物各受到 ${amount} 點傷害`, caster === 'you' ? 'good' : 'bad');
      return;
    }
    case 'unmake': {
      if (!target || !s.cards[target]) return;
      const def = E.defOf(s, target);
      const owner = s.cards[target].owner;
      if (E.hasKeyword(s, target, 'indestructible')) {
        say(s, `${def.name} 不滅，無法被摧毀`);
        return;
      }
      move(s, target, 'gy');
      fx(s, { kind: 'die', src: target, delay: 0 });
      say(s, `${def.name} 被摧毀`, owner === 'you' ? 'bad' : 'good');
      return;
    }
    case 'callTribe':
    case 'seekType': {
      openSearch(s, h, caster, eff);
      return;
    }
  }
}

/** Damage from a house effect, run through the same prevention the engine asks about. */
function damage(s: GameState, iid: string, amount: number, caster: Side, salvo?: number) {
  const filter = (E as any).HOUSE?.creatureDamage;
  const dealt = filter ? filter(s, iid, amount, null) : amount;
  if (!(dealt > 0)) return;
  const card = s.cards[iid];
  card.damage = (card.damage ?? 0) + dealt;
  fx(s, { kind: 'hitC', tgt: iid, amt: dealt, delay: 0, salvo });
  const tou = E.toughnessOf(s, iid) - card.damage;
  if (tou <= 0) {
    move(s, iid, 'gy');
    fx(s, { kind: 'die', src: iid, delay: 0 });
    say(s, `${E.defOf(s, iid).name} 死去`, card.owner === 'you' ? 'bad' : 'good');
  }
  void caster;
}

/** Moves a card between zones, the way the engine does. */
function move(s: GameState, iid: string, to: 'gy' | 'field' | 'hand') {
  const owner = s.cards[iid].owner;
  for (const z of ['lib', 'hand', 'field', 'gy', 'exile'] as const) {
    const i = s.zones[owner][z].indexOf(iid);
    if (i >= 0) s.zones[owner][z] = s.zones[owner][z].filter((x) => x !== iid);
  }
  s.zones[owner][to] = [...s.zones[owner][to], iid];
  if (to === 'field') {
    s.cards[iid].attacking = false;
  }
  if (to === 'gy') {
    s.cards[iid].damage = 0;
    s.cards[iid].attacking = false;
    s.attackers = s.attackers.filter((x) => x !== iid);
  }
}

// ------------------------------------------------------------------ tutors --

/** The choice kinds this layer owns. */
export const HOUSE_CHOICE = {
  callTribe: 'houseCallTribe',
  seekType: 'houseSeekType',
} as const;

const matches = (def: CardDef, eff: HouseEffect) => {
  if (eff.kind === 'callTribe') {
    return def.type === 'creature' && (def.sub ?? []).includes(eff.tribe ?? '');
  }
  return def.type === eff.cardType;
};

/** Opens the picker over what the caster's library actually holds. */
function openSearch(s: GameState, h: HouseState, caster: Side, eff: HouseEffect) {
  const hits = s.zones[caster].lib.filter((iid) => {
    const def = defOf(s, iid);
    return !!def && matches(def, eff);
  });
  if (!hits.length) { say(s, '（牌庫裡沒有符合的牌）'); return; }
  /*
   * The opponent does not get a picker. It takes the first thing that fits, which for a
   * library in random order is a random legal choice.
   */
  if (caster === 'foe') { land(s, caster, eff, hits[0]); return; }
  s.choice = {
    kind: HOUSE_CHOICE[eff.kind as keyof typeof HOUSE_CHOICE],
    pid: caster,
    options: hits.slice(0, 40).map((iid) => ({
      key: iid,
      label: E.defOf(s, iid).name,
      defId: s.cards[iid].defId,
    })),
  } as any;
  // Remembered on the state the caller is still assembling, so it survives to the pick.
  h.aim.__search = JSON.stringify(eff);
}

/** Puts the searched card where the spell said it goes. */
function land(s: GameState, caster: Side, eff: HouseEffect, iid: string) {
  const def = E.defOf(s, iid);
  if (eff.kind === 'seekType') {
    move(s, iid, 'hand');
    say(s, `${E.SIDE_NAME[caster]}從牌庫找出 ${def.name} 加入手牌`, caster === 'you' ? 'good' : 'bad');
    return;
  }
  move(s, iid, 'field');
  s.cards[iid].tapped = true;
  s.cards[iid].sick = true;
  fx(s, { kind: 'summon', tgt: iid, delay: 0 });
  say(s, `${E.SIDE_NAME[caster]}從牌庫找出 ${def.name}，橫置進戰場`, caster === 'you' ? 'good' : 'bad');
}

/** Is this a picker we opened? */
export const isHouseChoice = (kind?: string) =>
  !!kind && Object.values(HOUSE_CHOICE).includes(kind as any);

/** Resolves one of our pickers. */
export function houseChoose(prev: HouseGameState, key: string): HouseGameState {
  const s = clone(prev);
  const h = houseOf(s);
  const raw = h.aim.__search;
  const eff: HouseEffect = raw ? JSON.parse(raw) : { kind: 'seekType' };
  delete h.aim.__search;
  s.choice = null;
  if (s.cards[key]) land(s, s.cards[key].owner, eff, key);
  s.house = h;
  mirror(s, h);
  return s;
}

/** The engine's state is frozen; everything here works on a copy, as the sandbox does. */
function clone<T>(s: T): T {
  return structuredClone(s);
}

/** Human-readable prompt for one of our pickers. */
export function housePrompt(kind: string): string | null {
  switch (kind) {
    case HOUSE_CHOICE.callTribe: return '從牌庫選一隻該種族的生物，橫置放進戰場';
    case HOUSE_CHOICE.seekType: return '從牌庫選一張牌加入手牌';
    default: return null;
  }
}
