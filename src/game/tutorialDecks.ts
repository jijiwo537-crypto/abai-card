/**
 * The two decks the tutorial is played with.
 *
 * Neither is a real deck, and neither can be. The lesson attacks with a flyer and has to be
 * able to say "it goes over the top", which is only true against a board that is all ground
 * creatures — so the opponent's is nothing but green ground creatures. And the lesson deals
 * the player's opening hand itself, so their deck must not put a creature nobody has
 * explained into the hand on the next draw — so the player's holds no creatures at all.
 *
 * It is registered like any other deck and then hidden from the picker by its `tut_`
 * prefix. Registering it is what lets `createMatch` take it by id, which is the whole
 * reason it is here rather than inline in the tutorial screen.
 */

import * as E from './engine';
import type { DeckDef } from './types';

/*
 * Both sides are staged now.
 *
 * The opening hand is written down card by card in the battle screen, so the player's deck
 * only decides what they *draw* — and every creature drawn after the opening hand is a
 * creature nobody has explained yet, sitting in the hand next to the one the lesson is
 * asking about. The summoning chapter teaches one creature, and it is the one already in
 * hand; so this deck holds none at all. What it does hold is more of the three things the
 * lesson does keep asking for — a 魔法石 every turn, a 結界, a 法術, a 瞬間 — so a player who
 * plays on past the script still has something to do with their mana.
 */
export const TUTORIAL_YOU = 'tut_you';
export const TUTORIAL_FOE = 'tut_foe';

/** Hidden from the deck wall: these are scenery for the tutorial, not decks to choose. */
export const isTutorialDeck = (id: string) => id.startsWith('tut_');

const YOU: DeckDef = {
  id: TUTORIAL_YOU,
  name: '教學：曦潮之學',
  colors: ['W', 'U'],
  hero: 'gold_shoal_sentinel',
  heroName: '教學',
  strategy: '教學',
  blurb: '教學專用的白藍牌組，沒有生物——生物由教學親自發到手上。',
  list: [
    ['skyshoal', 30],
    ['seal', 10],
    ['c_arc_bolt', 10],
    ['u_dispel', 10],
  ],
};

const FOE: DeckDef = {
  id: TUTORIAL_FOE,
  name: '教學：林地守望',
  colors: ['G'],
  hero: 'g_rootwalker',
  heroName: '教學',
  strategy: '教學',
  blurb: '教學專用的綠色地面生物牌組。',
  list: [
    ['fst', 24],
    ['g_druid_apprentice', 8],
    ['g_forest_scout', 10],
    ['guardianoak', 8],
    ['g_rootwalker', 10],
  ],
};

let installed = false;

export function installTutorialDecks() {
  if (installed) return;
  installed = true;
  const reg = E.DECKS as Record<string, DeckDef>;
  for (const d of [YOU, FOE]) {
    // A tutorial deck that names a card the set no longer has would fail at draw time
    // rather than here, so it is checked here.
    const missing = d.list.filter(([id]) => !E.CARDS[id]).map(([id]) => id);
    if (missing.length) throw new Error(`tutorial deck ${d.id} names unknown cards: ${missing.join(', ')}`);
    const total = d.list.reduce((n, [, k]) => n + k, 0);
    if (total !== 60) throw new Error(`tutorial deck ${d.id} has ${total} cards, not 60`);
    reg[d.id] = d;
  }
}
