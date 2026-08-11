/**
 * The opponent the tutorial is played against.
 *
 * The player's side is a real deck — see TUTORIAL_YOU. The opponent's is not, and cannot
 * be: the lesson attacks with a flyer and has to be able to say "it goes over the top",
 * which is only true against a board that is all ground creatures. So this one is nothing
 * but green ground creatures.
 *
 * It is registered like any other deck and then hidden from the picker by its `tut_`
 * prefix. Registering it is what lets `createMatch` take it by id, which is the whole
 * reason it is here rather than inline in the tutorial screen.
 */

import * as E from './engine';
import type { DeckDef } from './types';

/*
 * The lesson is played with a real deck now, not a rigged one: 天穹封鎖, whose commander
 * 天穹執律 is the card the anatomy chapter is taught on. Every deck in the set already
 * guarantees a 魔法石 in the opening hand, and this one carries flyers for the attacking
 * chapter and instants for the counter step, which is everything the script asks of it.
 */
export const TUTORIAL_YOU = 'wu_skies';
export const TUTORIAL_FOE = 'tut_foe';

/** Hidden from the deck wall: these are scenery for the tutorial, not decks to choose. */
export const isTutorialDeck = (id: string) => id.startsWith('tut_');

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
  for (const d of [FOE]) {
    // A tutorial deck that names a card the set no longer has would fail at draw time
    // rather than here, so it is checked here.
    const missing = d.list.filter(([id]) => !E.CARDS[id]).map(([id]) => id);
    if (missing.length) throw new Error(`tutorial deck ${d.id} names unknown cards: ${missing.join(', ')}`);
    const total = d.list.reduce((n, [, k]) => n + k, 0);
    if (total !== 60) throw new Error(`tutorial deck ${d.id} has ${total} cards, not 60`);
    reg[d.id] = d;
  }
}
