/**
 * The house cards.
 *
 * Each one carries the ordinary card fields the engine and the card face already
 * understand, plus at most one extra field that only the house layer reads:
 *
 *   `house`  — the effect the engine has no case for, applied once the spell resolves.
 *   `shield` — a permanent that takes a point off every blow aimed at its controller's
 *              creatures, asked about from inside the engine's own damage step.
 *
 * `text` is written the way a player would explain the card out loud, because that is what
 * is printed on it.
 */

import type { CardDef } from './types';
import { TEMPER, type HouseEffect } from './houseKeywords';

/** A card plus whatever the house layer needs to know about it. */
export type HouseCard = CardDef & { house?: HouseEffect; shield?: number };

const C = (g: number, c: Record<string, number> = {}) => ({ g, c });

export const HOUSE_CARDS: Record<string, HouseCard> = {
  // ------------------------------------------------------------- 淬煉 (temper) --
  hx_forge_golem: {
    id: 'hx_forge_golem', name: '淬火魔像', type: 'creature', color: 'C',
    sub: ['魔像'], cost: C(3), pow: 2, tou: 5, kw: [TEMPER as any],
    text: '淬煉',
    flavor: '每一道裂痕都被重新灌滿了鐵水。', rarity: 'R',
  },
  hx_scarred_berserker: {
    id: 'hx_scarred_berserker', name: '傷痕狂徒', type: 'creature', color: 'R',
    sub: ['人類', '狂戰士'], cost: C(1, { R: 1 }), pow: 1, tou: 4, kw: [TEMPER as any],
    text: '淬煉',
    flavor: '他數傷疤的方式，跟別人數戰功一樣。', rarity: 'U',
  },

  // --------------------------------------------------------- 連擊 (doublestrike) --
  hx_twin_blade: {
    id: 'hx_twin_blade', name: '雙鋒劍聖', type: 'creature', color: 'W',
    sub: ['人類', '騎士'], cost: C(2, { W: 2 }), pow: 2, tou: 3, kw: ['doublestrike'],
    text: '連擊',
    flavor: '第一劍問話，第二劍不必。', rarity: 'R',
  },


  // ------------------------------------------------------------------ 結界 --
  hx_aegis_field: {
    id: 'hx_aegis_field', name: '守禦力場', type: 'enchantment', color: 'W',
    cost: C(2, { W: 1 }),
    shield: 1,
    text: '我方所有生物受到的傷害 −1。',
    flavor: '光沒有擋在他們前面，光在他們身上。', rarity: 'R',
  },

  // ------------------------------------------------------------------ 群傷 --
  hx_ember_rain: {
    id: 'hx_ember_rain', name: '餘燼之雨', type: 'sorcery', color: 'R',
    cost: C(1, { R: 1 }),
    spell: { kind: 'sweep', target: 'none' } as any,
    house: { kind: 'sweep', amount: 1 },
    text: '對敵方所有生物各造成 1 點傷害。',
    flavor: '火勢過境不挑人，只挑站著的。', rarity: 'U',
  },

  // -------------------------------------------------------------- 摧毀永久物 --
  hx_unmaking: {
    id: 'hx_unmaking', name: '萬物解離', type: 'sorcery', color: 'W',
    cost: C(2, { W: 1 }),
    spell: { kind: 'unmake', target: 'permanent' } as any,
    house: { kind: 'unmake' },
    text: '摧毀一個永久物。',
    flavor: '它不問那是什麼，只問那還在不在。', rarity: 'R',
  },

  // -------------------------------------------------------------- 牌庫搜尋 --
  hx_knight_muster: {
    id: 'hx_knight_muster', name: '騎士召集', type: 'sorcery', color: 'W',
    cost: C(2, { W: 1 }),
    spell: { kind: 'callTribe', target: 'none' } as any,
    house: { kind: 'callTribe', tribe: '騎士' },
    text: '從你的牌庫選一隻「騎士」，橫置放進戰場。',
    flavor: '號角一響，名冊上的名字都會到齊。', rarity: 'R',
  },
  hx_seek_sorcery: {
    id: 'hx_seek_sorcery', name: '秘典搜尋', type: 'sorcery', color: 'U',
    cost: C(1, { U: 1 }),
    spell: { kind: 'seekType', target: 'none' } as any,
    house: { kind: 'seekType', cardType: 'sorcery' },
    text: '從你的牌庫選一張法術牌，加入手牌。',
    flavor: '書架自己會翻到你要的那一頁。', rarity: 'U',
  },
  hx_seek_instant: {
    id: 'hx_seek_instant', name: '瞬息索引', type: 'instant', color: 'U',
    cost: C(1, { U: 1 }),
    spell: { kind: 'seekType', target: 'none' } as any,
    house: { kind: 'seekType', cardType: 'instant' },
    text: '從你的牌庫選一張瞬間牌，加入手牌。',
    flavor: '要用的時候才想起來，就已經太遲了。', rarity: 'U',
  },
  hx_seek_enchant: {
    id: 'hx_seek_enchant', name: '結界共鳴', type: 'sorcery', color: 'W',
    cost: C(1, { W: 1 }),
    spell: { kind: 'seekType', target: 'none' } as any,
    house: { kind: 'seekType', cardType: 'enchantment' },
    text: '從你的牌庫選一張結界牌，加入手牌。',
    flavor: '結界之間彼此呼喚，只是你聽不見。', rarity: 'U',
  },

};
