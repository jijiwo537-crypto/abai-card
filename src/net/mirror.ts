/**
 * The same game, seen from the other chair.
 *
 * The engine is symmetric in its data but not in its vocabulary: one side is always called
 * `you` and that is the side it lets the local player move. Rather than teach it to be
 * seat-agnostic — surgery across every action handler — each machine simply holds the game
 * from its own point of view. The host keeps the canonical deal; the guest holds its mirror,
 * with the two sides swapped everywhere they appear.
 *
 * Card instance ids are deliberately *not* touched. `c26` is the same physical card on both
 * machines; only which chair owns it differs. That is what makes a move sent across the
 * wire mean the same thing at the other end without any translation.
 *
 * Mirroring is its own inverse: apply it twice and you are back where you started.
 */

import type { GameState, Side } from '../game/engine';

const other = (s: Side): Side => (s === 'you' ? 'foe' : 'you');

/** Swap the two members of a `{you, foe}` record. */
function swap<T>(r: Record<Side, T>): Record<Side, T> {
  return { you: r.foe, foe: r.you } as Record<Side, T>;
}

/**
 * The whole state, from the other side of the table.
 *
 * Everything keyed by side is exchanged; everything keyed by card is left alone. The
 * `owner` stamped on each card instance is a side, so it flips with the rest — which is
 * precisely what makes the guest's own cards read as `you` to its engine.
 */
export function mirrorState(s: GameState): GameState {
  const cards: GameState['cards'] = {};
  for (const [iid, c] of Object.entries(s.cards)) {
    cards[iid] = { ...c, owner: other(c.owner) };
  }

  const out: GameState = {
    ...s,
    active: other(s.active),
    first: other(s.first),
    cards,
    zones: swap(s.zones),
    life: swap(s.life),
    landPlayed: swap(s.landPlayed),
    awaitResp: s.awaitResp ? other(s.awaitResp) : null,
    winner: s.winner ? other(s.winner) : null,
    decks: swap(s.decks),
    log: s.log.map((l) => ({
      ...l,
      c: l.c === 'you' ? 'foe' : l.c === 'foe' ? 'you' : l.c,
    })),
    fx: s.fx.map((f) => (f.pid ? { ...f, pid: other(f.pid) } : f)),
  };

  if (s.stack) out.stack = { ...s.stack, caster: other(s.stack.caster) };
  if (s.choice) out.choice = { ...s.choice, pid: other(s.choice.pid) };
  if (s.pending) {
    out.pending = {
      ...s.pending,
      legalP: s.pending.legalP.map(other),
    };
  }
  if (s.legacyAnthems) out.legacyAnthems = swap(s.legacyAnthems);

  /*
   * The house layer's own book-keeping is keyed by card, not by side, so it crosses over
   * untouched — but it has to cross over, or a mirrored state would arrive with none of it.
   */
  const house = (s as GameState & { house?: unknown }).house;
  if (house !== undefined) (out as GameState & { house?: unknown }).house = house;

  return out;
}

/**
 * A move, from the other side of the table.
 *
 * Almost every action names a card, and cards mean the same thing on both machines. The
 * few that name a side or a player are the ones that have to be turned round.
 */
export function mirrorAction<A extends { t: string; [k: string]: unknown }>(a: A): A {
  const flip = (v: unknown) => (v === 'you' ? 'foe' : v === 'foe' ? 'you' : v);
  switch (a.t) {
    // Targeting a player rather than a creature.
    case 'chooseTarget':
      return { ...a, tid: flip(a.tid) };
    // The training ground's levers all name a side.
    case 'sbPut':
    case 'sbScene':
    case 'sbLife':
    case 'sbUntap':
    case 'sbReady':
    case 'sbClear':
    case 'sbDraw':
    case 'sbMana':
      return { ...a, side: flip(a.side) };
    default:
      return a;
  }
}
