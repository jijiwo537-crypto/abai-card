/**
 * The keywords and effect shapes the house layer adds.
 *
 * Kept apart from both the rules and the cards so that neither has to import the other:
 * the cards name these keywords, and the rules act on them.
 */

import type { CardDef } from './types';

/** Keyword ids the engine has never heard of. */
export const TEMPER = 'temper';

export const HOUSE_KEYWORD_NAME: Record<string, string> = {
  [TEMPER]: '淬煉',
};

export const HOUSE_KEYWORD_TEXT: Record<string, string> = {
  [TEMPER]: '每受到一次傷害，攻擊力永久 +1',
};

/** What a house card does, over and above whatever the engine made of it. */
export interface HouseEffect {
  kind:
    | 'sweep'         // damage to every creature the opponent controls, all at once
    | 'unmake'        // destroy one permanent of any kind
    | 'callTribe'     // library → battlefield tapped, creature of `tribe`
    | 'seekType';     // library → hand, a card of `cardType`
  amount?: number;
  tribe?: string;
  cardType?: CardDef['type'];
}
