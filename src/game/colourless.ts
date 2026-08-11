/**
 * The colourless set.
 *
 * A deck with no colour has to stand on generic mana alone, so every card here costs pure
 * generic and every effect is written in the engine's existing vocabulary — keywords,
 * arrival triggers, anthems, equipment and targeted spells. The result plays like a real
 * artifact deck: cheap constructs that trade up, equipment that turns them into threats,
 * and a top end that closes the game on its own.
 */

import type { CardDef } from './types';

/** Pure generic cost — no colour requirement at all. */
const C = (g: number) => ({ g, c: {} });

export function colourlessCards(): Record<string, CardDef> {
  const defs: CardDef[] = [
    {
      id: 'tok_construct', name: '機兵衍生物', type: 'creature', color: 'C',
      sub: ['構體'], pow: 1, tou: 1, token: true,
      text: '機兵衍生物。', rarity: 'C',
    },
    {
      id: 'c_scrap_servitor', name: '廢鐵僕從', type: 'creature', color: 'C',
      sub: ['構體'], cost: C(1), pow: 1, tou: 3, kw: ['defender'],
      text: '守軍', flavor: '它守的不是門，是命令本身。', rarity: 'C',
    },
    {
      id: 'c_spinner', name: '紡輪機兵', type: 'creature', color: 'C',
      sub: ['構體'], cost: C(2), pow: 2, tou: 2, kw: ['vigilance'],
      text: '警戒', flavor: '齒輪不需要睡覺。', rarity: 'C',
    },
    {
      id: 'c_iron_sentinel', name: '鐵衛哨兵', type: 'creature', color: 'C',
      sub: ['構體', '士兵'], cost: C(3), pow: 3, tou: 3, kw: ['firststrike'],
      text: '先攻', flavor: '它的反應時間是零點零三秒，三百年來沒變過。', rarity: 'C',
    },
    {
      id: 'c_arc_drone', name: '弧光浮空器', type: 'creature', color: 'C',
      sub: ['構體'], cost: C(3), pow: 2, tou: 3, kw: ['flying'],
      text: '飛行', flavor: '沒有翅膀的飛行，只需要足夠的傲慢。', rarity: 'C',
    },
    {
      id: 'c_assembly_core', name: '組裝核心', type: 'creature', color: 'C',
      sub: ['構體'], cost: C(4), pow: 3, tou: 4,
      etb: { kind: 'createToken', tokenId: 'tok_construct', amount: 2, target: 'none' },
      text: '進場時：製造兩個 1/1 機兵衍生物。',
      flavor: '產線從不停工，只是換了個地方。', rarity: 'U',
    },
    {
      id: 'c_overseer', name: '工序監督者', type: 'creature', color: 'C',
      sub: ['構體'], cost: C(4), pow: 2, tou: 3,
      anthem: { p: 1, t: 1, scope: 'own', excludeSelf: true },
      text: '你操控的其他生物得 +1/+1。',
      flavor: '效率不是天賦，是規範。', rarity: 'U',
    },
    {
      id: 'c_siege_engine', name: '攻城機關', type: 'creature', color: 'C',
      sub: ['構體'], cost: C(5), pow: 4, tou: 5, kw: ['menace'],
      text: '威懾', flavor: '城牆看見它就知道今天要塌。', rarity: 'U',
    },
    {
      id: 'c_relic_colossus', name: '遺械巨像', type: 'creature', color: 'C',
      sub: ['構體'], cost: C(6), pow: 5, tou: 5, kw: ['indestructible'],
      text: '不滅', flavor: '把它拆開的方法早就失傳了。', rarity: 'R',
    },
    {
      id: 'c_forge_titan', name: '熔爐泰坦', type: 'creature', color: 'C',
      sub: ['構體', '巨人'], cost: C(7), pow: 7, tou: 7, kw: ['trample'],
      text: '踐踏', flavor: '鍛造它的爐子，如今是它的心臟。', rarity: 'R',
    },
    {
      id: 'c_null_rod', name: '靜滯之杖', type: 'artifact', color: 'C',
      cost: C(2), attach: { kind: 'equipment', host: 'ownCreature', p: 2, t: 0 },
      text: '裝備\n所裝備的生物得 +2/+0。',
      flavor: '它讓一切安靜，除了握著它的人。', rarity: 'C',
    },
    {
      id: 'c_pulse_cannon', name: '脈衝砲塔', type: 'artifact', color: 'C',
      cost: C(4), attach: { kind: 'equipment', host: 'ownCreature', p: 3, t: 1, kw: ['trample'] },
      text: '裝備\n所裝備的生物得 +3/+1 且具有踐踏。',
      flavor: '後座力由使用者承擔。', rarity: 'U',
    },
    {
      id: 'c_disassemble', name: '拆解程序', type: 'instant', color: 'C',
      cost: C(3), spell: { kind: 'damage', amount: 4, target: 'creature' },
      text: '拆解程序對目標生物造成 4 點傷害。',
      flavor: '每一顆螺絲都有它該去的地方。', rarity: 'C',
    },
    {
      /*
       * The tutorial's worked example of a spell: no colour requirement, cheap enough to be
       * cast the turn it is taught, and an effect with nothing to explain — a number of
       * damage, on one creature, now.
       */
      id: 'c_arc_bolt', name: '弧光穿刺', type: 'sorcery', color: 'C',
      cost: C(2), spell: { kind: 'damage', amount: 3, target: 'creature' },
      text: '弧光穿刺對目標生物造成 3 點傷害。',
      flavor: '一道光，剛好夠短。', rarity: 'C',
    },
    {
      id: 'c_power_surge', name: '過載脈衝', type: 'instant', color: 'C',
      cost: C(2), spell: { kind: 'pump', p: 3, t: 2, target: 'creature' },
      text: '目標生物得 +3/+2 直到回合結束。',
      flavor: '規格外的輸出，規格內的代價。', rarity: 'C',
    },
    {
      id: 'c_salvage', name: '殘骸回收', type: 'sorcery', color: 'C',
      cost: C(3), spell: { kind: 'draw', amount: 2 },
      text: '抽兩張牌。',
      flavor: '別人的廢墟，是我們的庫存。', rarity: 'C',
    },
    {
      id: 'c_foundry_call', name: '熔爐徵召', type: 'sorcery', color: 'C',
      cost: C(4), spell: { kind: 'createToken', tokenId: 'tok_construct', amount: 3, target: 'none' },
      text: '製造三個 1/1 機兵衍生物。',
      flavor: '排程已滿，仍在加班。', rarity: 'U',
    },
  ];

  const out: Record<string, CardDef> = {};
  for (const d of defs) out[d.id] = d;
  return out;
}
