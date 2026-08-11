/**
 * The mana base for the full lineup.
 *
 * Every colour combination gets a land that produces exactly its colours: ten duals for
 * the pairs, ten tri-lands for the shards and wedges, and a colourless waste for the
 * artifact deck. They are ordinary land cards in the engine's own vocabulary — a `mana`
 * array is all it takes to be a source — so no rules code is involved.
 *
 * The tri-lands outlived the three-colour decks they were built for. They stay because the
 * deck builder can still use them: a player who wants a third colour needs a land that
 * makes it, and deleting the cards would only make that harder.
 */

import type { CardDef } from './types';

type Pair = [string, string];

const PAIR_LANDS: Record<string, { id: string; name: string; flavor: string }> = {
  WU: { id: 'skyshoal', name: '曦光淺灘', flavor: '潮水退去時，聖印會在沙上留下一整夜。' },
  WB: { id: 'graveglow', name: '燭骨墓原', flavor: '每一盞燈下都躺著一個守約的人。' },
  WR: { id: 'sunforge', name: '烈陽鍛地', flavor: '正午的鎚聲，比任何禱詞都準時。' },
  WG: { id: 'dawn', name: '晨曦林地', flavor: '第一道光落在葉尖，整座林子就醒了。' },
  UB: { id: 'dusk', name: '幽暗礁湖', flavor: '水面之下，另有一座城。' },
  UR: { id: 'stormvault', name: '雷弧穹窖', flavor: 'storm 在這裡被關了三百年，仍在敲門。' },
  UG: { id: 'tidegrove', name: '潮生蔓林', flavor: '漲潮時，樹會走路。' },
  BR: { id: 'emberdeep', name: '燼血裂谷', flavor: '裂縫深處，火與血從未分開過。' },
  BG: { id: 'rotwood', name: '腐土苔原', flavor: '死去的東西在這裡最先發芽。' },
  RG: { id: 'wildforge', name: '焰木荒原', flavor: '野火過後，新芽長得比從前更狂。' },
};

const TRI_LANDS: Record<string, { id: string; name: string; flavor: string }> = {
  WUB: { id: 'tri_wub', name: '冥律聖殿', flavor: '判決寫在石上，執行寫在水裡。' },
  WUR: { id: 'tri_wur', name: '雷霆審庭', flavor: '雷聲落下之前，判決已經生效。' },
  WUG: { id: 'tri_wug', name: '曦潮林澤', flavor: '光、水、根，三者從不爭先。' },
  WBR: { id: 'tri_wbr', name: '血誓戰壇', flavor: '誓言以血為墨，以火為印。' },
  WBG: { id: 'tri_wbg', name: '枯榮祭圈', flavor: '枯與榮，在同一圈裡輪替。' },
  WRG: { id: 'tri_wrg', name: '荒野哨堡', flavor: '牆是後來才蓋的，野性一直都在。' },
  UBR: { id: 'tri_ubr', name: '暗湧術庭', flavor: '三種力量在此互相借債，從不還清。' },
  UBG: { id: 'tri_ubg', name: '潮蝕沼原', flavor: '潮水帶走的，泥土會替它記著。' },
  URG: { id: 'tri_urg', name: '風暴斷崖', flavor: '崖上沒有樹站得直，卻沒有一棵倒下。' },
  BRG: { id: 'tri_brg', name: '焦土噬穴', flavor: '這裡的食物鏈只有一節。' },
};

/** Key for a colour set, in the canonical WUBRG order. */
export const comboKey = (colors: string[]) =>
  ['W', 'U', 'B', 'R', 'G'].filter((c) => colors.includes(c)).join('');

/** The land that taps for exactly this combination, if one exists. */
export function landFor(colors: string[]): string | null {
  const key = comboKey(colors);
  if (key.length === 2) return PAIR_LANDS[key]?.id ?? null;
  if (key.length === 3) return TRI_LANDS[key]?.id ?? null;
  return null;
}

/** The basic land for a single colour. */
export const BASIC: Record<string, string> = {
  W: 'pln', U: 'isl', B: 'swp', R: 'mtn', G: 'fst',
};

/** All the land cards this module introduces. */
export function landCards(): Record<string, CardDef> {
  const out: Record<string, CardDef> = {};
  const colourNames: Record<string, string> = {
    W: '白色', U: '藍色', B: '黑色', R: '紅色', G: '綠色',
  };

  for (const [key, land] of Object.entries(PAIR_LANDS)) {
    const cols = key.split('') as Pair;
    out[land.id] = {
      id: land.id, name: land.name, type: 'land', color: 'L', mana: cols,
      text: `橫置：加一點${colourNames[cols[0]]}或${colourNames[cols[1]]}魔力。`,
      flavor: land.flavor, rarity: 'U',
    } as CardDef;
  }

  for (const [key, land] of Object.entries(TRI_LANDS)) {
    const cols = key.split('');
    out[land.id] = {
      id: land.id, name: land.name, type: 'land', color: 'L', mana: cols,
      text: `橫置：加一點${cols.map((c) => colourNames[c]).join('、')}魔力。`,
      flavor: land.flavor, rarity: 'R',
    } as CardDef;
  }

  out.wastes = {
    id: 'wastes', name: '無色荒原', type: 'land', color: 'L', mana: ['C'],
    text: '橫置：加一點無色魔力。',
    flavor: '這裡沒有顏色可以偏袒任何人。', rarity: 'C',
  } as CardDef;

  return out;
}
