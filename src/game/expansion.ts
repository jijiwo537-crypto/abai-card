/**
 * The expansion set: the cards the redesigned lineup needed and the pool did not have.
 *
 * Two jobs, both in the engine's existing vocabulary so no rules code is involved.
 *
 * The first is `NO_VANILLA`. A creature with no keyword is a body and a number, and a deck
 * full of them plays the same way every game — you attack, they block, the bigger one wins.
 * Every creature *card* in the pool that had nothing written on it gets one keyword here,
 * chosen to say what the creature is rather than to make it bigger: a healer gains lifelink,
 * a wall gains reach, a warchief gains haste.
 *
 * Tokens are deliberately left out. Magic prints its soldiers, zombies, constructs and
 * wolves as plain 1/1s and 2/2s and only writes an ability on a token when the ability is
 * the point of it — a Goblin token has haste, a Spirit token flies. A spell that makes three
 * bodies is costed against what those bodies do, so quietly upgrading every one of them
 * moves the price of every card that mints them.
 *
 * The second is `EXPANSION_CARDS`. The old lineup leaned on twenty-six lists that mostly
 * shared one pool, so several archetypes had no payoff card of their own — no flying token
 * to go wide in the air with, no dragon below the top of the curve, no colourless card
 * draw. Those gaps are filled here, and the two colour pairs that had no signature gold card
 * (white-green and blue-black) finally get one.
 */

import type { CardDef, Keyword } from './types';

/** Cost helper, matching the engine's own: generic first, then coloured pips. */
const C = (g: number, c: Record<string, number> = {}) => ({ g, c });

// ------------------------------------------------------------------ no vanilla --

/**
 * One keyword for every creature that had none, and the line of text that names it.
 *
 * The keyword is prepended to the card's own rules text rather than replacing it — the card
 * face prints the keyword line itself and drops the duplicate, so the text stays right in
 * the places that show it raw (the deck list, the card browser).
 */
export const NO_VANILLA: Record<string, Keyword> = {
  // White — the colour of oaths kept: lifelink on the healers, vigilance on the guards.
  w_acolyte: 'lifelink',
  w_healer: 'lifelink',
  w_cleric: 'lifelink',
  w_high_cleric: 'lifelink',
  sunshield: 'vigilance',
  w_battle_priest: 'vigilance',
  w_purifier: 'vigilance',
  w_ward_knight: 'firststrike',

  // Blue — knowledge arrives unannounced, so its thinkers get flash and its illusions fly.
  u_scholar: 'flash',
  u_seer: 'flash',
  u_archivist: 'flash',
  u_thoughtweaver: 'flying',
  u_mind_render: 'flying',
  u_tide_shaman: 'vigilance',
  u_oracle_of_tides: 'vigilance',

  // Black — what comes back, and what refuses to be blocked alone.
  shadow_ward: 'regenerate',
  b_cursed_priest: 'menace',
  b_soul_harvester: 'lifelink',
  b_zombie_horde_leader: 'menace',
  b_plague_lord: 'flying',

  // Red — everything red does, it does this turn.
  chief: 'haste',
  r_war_drummer: 'haste',
  r_goblin_sapper: 'haste',
  r_flame_juggler: 'firststrike',
  r_war_chanter: 'firststrike',
  r_volcano_shaman: 'firststrike',

  // Green — rooted things reach; the big ones trample.
  g_druid_apprentice: 'vigilance',
  thornmaiden: 'reach',
  g_vine_weaver: 'reach',
  mendingtreant: 'vigilance',
  g_pack_leader: 'vigilance',
  g_wild_growth_sprite: 'vigilance',
  g_verdant_hydra: 'trample',

  // Colourless — a machine does not tire.
  c_assembly_core: 'vigilance',
  c_overseer: 'vigilance',
};

// -------------------------------------------------------------------- new cards --

/** Tokens the new spells mint. Each one carries a keyword of its own. */
const TOKENS: CardDef[] = [
  {
    id: 'tok_spirit', name: '靈魂衍生物', type: 'creature', color: 'W',
    sub: ['精靈'], pow: 1, tou: 1, kw: ['flying'], token: true,
    text: '飛行。靈魂衍生物。', rarity: 'C',
  },
  {
    id: 'tok_wolf', name: '野狼衍生物', type: 'creature', color: 'G',
    sub: ['狼'], pow: 2, tou: 2, token: true,
    text: '野狼衍生物。', rarity: 'C',
  },
  {
    id: 'tok_thopter', name: '撲翼機衍生物', type: 'creature', color: 'C',
    sub: ['構體'], pow: 1, tou: 1, kw: ['flying'], token: true,
    text: '飛行。撲翼機衍生物。', rarity: 'C',
  },
];

/** White: the wide board, and the anthem that makes it lethal. */
const WHITE: CardDef[] = [
  {
    id: 'w_banner_squire', name: '掌旗侍從', type: 'creature', color: 'W',
    sub: ['人類', '士兵'], cost: C(1, { W: 1 }), pow: 2, tou: 2, kw: ['vigilance'],
    etb: { kind: 'createToken', tokenId: 'tok_soldier', amount: 1, target: 'none' },
    text: '警戒\n進場時，製造一個 1/1 衛兵衍生物。',
    flavor: '旗子舉高一點，後面的人才知道往哪裡跑。', rarity: 'U',
  },
  {
    id: 'w_lightforge_captain', name: '曦鍛隊長', type: 'creature', color: 'W',
    sub: ['人類', '士兵'], cost: C(2, { W: 1 }), pow: 2, tou: 2, kw: ['firststrike'],
    anthem: { p: 1, t: 1, scope: 'tribe', tribe: '衛兵' },
    text: '先攻\n你操控的衛兵得 +1/+1。',
    flavor: '她記得每一個新兵的名字，尤其是還沒回來的那幾個。', rarity: 'R',
  },
  {
    id: 'w_sunspear_lancer', name: '日矛槍騎', type: 'creature', color: 'W',
    sub: ['人類', '騎士'], cost: C(1, { W: 2 }), pow: 3, tou: 2,
    kw: ['firststrike', 'vigilance'],
    text: '先攻、警戒',
    flavor: '矛尖朝著太陽，敵人只看得見光。', rarity: 'U',
  },
  {
    id: 'w_dawn_charge', name: '破曉衝鋒', type: 'instant', color: 'W',
    cost: C(2, { W: 1 }), spell: { kind: 'pump', p: 2, t: 2, kw: ['firststrike'], target: 'creature' },
    text: '目標生物得 +2/+2 且具有先攻，直到回合結束。',
    flavor: '第一道光，也是第一擊。', rarity: 'C',
  },
  {
    id: 'w_oath_of_dawn', name: '破曉誓約', type: 'enchantment', color: 'W',
    cost: C(2, { W: 1 }),
    anthem: { p: 0, t: 1, scope: 'own', grantKw: ['vigilance'] },
    text: '你操控的生物得 +0/+1 且具有警戒。',
    flavor: '誓言不讓人變強，只讓人不肯睡。', rarity: 'U',
  },
  {
    id: 'w_spirit_choir', name: '靈唱聖詠', type: 'sorcery', color: 'W',
    cost: C(3, { W: 1 }),
    spell: { kind: 'createToken', tokenId: 'tok_spirit', amount: 2, target: 'none' },
    text: '製造兩個 1/1 具飛行異能的靈魂衍生物。',
    flavor: '唱到第三段時，唱歌的人已經不只是活人了。', rarity: 'U',
  },
];

/** Blue: the tempo half and the mill half, kept apart on purpose. */
const BLUE: CardDef[] = [
  {
    id: 'u_leyline_thief', name: '靈脈竊者', type: 'creature', color: 'U',
    sub: ['幻精'], cost: C(1, { U: 1 }), pow: 1, tou: 2, kw: ['flying'],
    etb: { kind: 'scry', amount: 1 },
    text: '飛行\n進場時，占卜 1。',
    flavor: '它偷的不是東西，是「接下來會發生什麼」。', rarity: 'C',
  },
  {
    id: 'u_shoal_trickster', name: '淺灘詭術師', type: 'creature', color: 'U',
    sub: ['人魚', '法師'], cost: C(1, { U: 2 }), pow: 2, tou: 3, kw: ['flash'],
    etb: { kind: 'draw', amount: 1 },
    text: '閃現\n進場時，抽一張牌。',
    flavor: '他從不在你看著的時候出現。', rarity: 'U',
  },
  {
    id: 'u_frost_warden', name: '霜牢守望', type: 'creature', color: 'U',
    sub: ['元素'], cost: C(2, { U: 1 }), pow: 1, tou: 5, kw: ['defender', 'reach'],
    text: '守軍、延勢',
    flavor: '它不擋路，它就是路的盡頭。', rarity: 'C',
  },
  {
    id: 'u_mist_stalker', name: '迷霧潛獵者', type: 'creature', color: 'U',
    sub: ['幻精', '浪客'], cost: C(2, { U: 1 }), pow: 2, tou: 2, kw: ['unblockable'],
    etb: { kind: 'mill', amount: 3, target: 'player' },
    text: '不可阻擋\n進場時，目標玩家將牌庫頂三張牌置入墳墓場。',
    flavor: '霧散的時候，少的不只是視線。', rarity: 'U',
  },
  {
    id: 'u_undertow_grip', name: '暗流箝制', type: 'instant', color: 'U',
    cost: C(1, { U: 1 }), spell: { kind: 'pump', p: -3, t: 0, target: 'creature' },
    text: '目標生物得 -3/-0 直到回合結束。',
    flavor: '水不必殺你，只要讓你抬不起手。', rarity: 'C',
  },
  {
    id: 'u_grand_forgetting', name: '大遺忘', type: 'sorcery', color: 'U',
    cost: C(5, { U: 1 }), spell: { kind: 'mill', amount: 12, target: 'player' },
    text: '目標玩家將牌庫頂十二張牌置入墳墓場。',
    flavor: '最後一頁翻過去以後，書就不再是書了。', rarity: 'R',
  },
];

/** Black: the aggressive half, and the cards that pay for it. */
const BLACK: CardDef[] = [
  {
    id: 'b_gloom_stalker', name: '幽域潛獵者', type: 'creature', color: 'B',
    sub: ['幽魂', '浪客'], cost: C(1, { B: 1 }), pow: 2, tou: 1, kw: ['menace', 'haste'],
    text: '威懾、敏捷',
    flavor: '影子先到，牠才到。', rarity: 'U',
  },
  {
    id: 'b_vault_scavenger', name: '墓窖拾荒者', type: 'creature', color: 'B',
    sub: ['殭屍'], cost: C(2, { B: 1 }), pow: 3, tou: 2, kw: ['menace'],
    etb: { kind: 'discardRandom', amount: 1 },
    text: '威懾\n進場時，目標對手隨機棄一張牌。',
    flavor: '牠翻的是墳，帶走的卻是活人的東西。', rarity: 'C',
  },
  {
    id: 'b_bloodpact_fiend', name: '血契妖魔', type: 'creature', color: 'B',
    sub: ['惡魔'], cost: C(2, { B: 2 }), pow: 3, tou: 3, kw: ['flying', 'lifelink'],
    text: '飛行、吸血',
    flavor: '契約寫得很清楚，只是沒人讀到最後一行。', rarity: 'R',
  },
  {
    id: 'b_dark_study', name: '黑暗研習', type: 'sorcery', color: 'B',
    cost: C(2, { B: 1 }), spell: { kind: 'draw', amount: 2 },
    text: '抽兩張牌。',
    flavor: '知識的代價從不寫在封面上。', rarity: 'C',
  },
  {
    id: 'b_final_hour', name: '終末時刻', type: 'instant', color: 'B',
    cost: C(3, { B: 1 }), spell: { kind: 'destroy', target: 'creature' },
    text: '消滅目標生物。',
    flavor: '時間到了，不接受申訴。', rarity: 'C',
  },
  {
    id: 'b_dread_summons', name: '亡者召集', type: 'sorcery', color: 'B',
    cost: C(3, { B: 2 }),
    spell: { kind: 'createToken', tokenId: 'tok_zombie', amount: 3, target: 'none' },
    text: '製造三個 2/2 殭屍衍生物。',
    flavor: '名冊唸完，土就自己鬆了。', rarity: 'U',
  },
];

/** Red: one more one-drop, and a dragon that arrives before turn seven. */
const RED: CardDef[] = [
  {
    id: 'r_ember_sprite', name: '燼火精靈', type: 'creature', color: 'R',
    sub: ['元素'], cost: C(0, { R: 1 }), pow: 1, tou: 1, kw: ['flying', 'haste'],
    text: '飛行、敏捷',
    flavor: '火星落地之前，它已經飛過三條街。', rarity: 'U',
  },
  {
    id: 'r_forge_hound', name: '鍛爐獵犬', type: 'creature', color: 'R',
    sub: ['元素', '獵犬'], cost: C(1, { R: 1 }), pow: 2, tou: 2, kw: ['trample', 'haste'],
    text: '踐踏、敏捷',
    flavor: '牠追的東西，通常已經在燒了。', rarity: 'C',
  },
  {
    id: 'r_scale_herald', name: '鱗甲傳令', type: 'creature', color: 'R',
    sub: ['龍'], cost: C(1, { R: 2 }), pow: 2, tou: 3, kw: ['flying'],
    etb: { kind: 'damage', amount: 1, target: 'any' },
    text: '飛行\n進場時，對任意一個目標造成 1 點傷害。',
    flavor: '牠帶來的口信，只有一個字。', rarity: 'C',
  },
  {
    id: 'r_dragons_roar', name: '巨龍咆哮', type: 'instant', color: 'R',
    cost: C(2, { R: 1 }), spell: { kind: 'pump', p: 3, t: 3, kw: ['flying'], target: 'creature' },
    text: '目標生物得 +3/+3 且具有飛行，直到回合結束。',
    flavor: '聽過的人說，那一刻自己也想飛。', rarity: 'C',
  },
  {
    id: 'r_hoard_dragon', name: '藏寶巨龍', type: 'creature', color: 'R',
    sub: ['龍'], cost: C(3, { R: 2 }), pow: 4, tou: 4, kw: ['flying', 'trample'],
    text: '飛行、踐踏',
    flavor: '牠的財寶清單上，第一項是這座山。', rarity: 'R',
  },
  {
    id: 'r_meteor_shower', name: '隕石驟雨', type: 'sorcery', color: 'R',
    cost: C(4, { R: 1 }), spell: { kind: 'damage', amount: 6, target: 'any' },
    text: '隕石驟雨對任意一個目標造成 6 點傷害。',
    flavor: '天空欠的債，一次還清。', rarity: 'R',
  },
];

/** Green: the ramp payoff, and a way to buy the dead ones back. */
const GREEN: CardDef[] = [
  {
    id: 'g_root_shaman', name: '根脈薩滿', type: 'creature', color: 'G',
    sub: ['妖精', '薩滿'], cost: C(1, { G: 1 }), pow: 1, tou: 2, kw: ['reach'],
    etb: { kind: 'ramp' },
    text: '延勢\n進場時，從你的牌庫中搜尋一張基本魔法石牌，橫置放進戰場，然後洗牌。',
    flavor: '他問過每一條根，才決定挖哪一條。', rarity: 'U',
  },
  {
    id: 'g_bloom_warden', name: '綻蕊守望', type: 'creature', color: 'G',
    sub: ['樹妖'], cost: C(1, { G: 2 }), pow: 2, tou: 5, kw: ['reach', 'vigilance'],
    text: '延勢、警戒',
    flavor: '它開花的那天，整片林子都不敢出聲。', rarity: 'C',
  },
  {
    id: 'g_primal_surge', name: '原始湧動', type: 'instant', color: 'G',
    cost: C(2, { G: 1 }), spell: { kind: 'addCounter', amount: 2, target: 'creature' },
    text: '在目標生物上放置兩個 +1/+1 指示物。',
    flavor: '長大這件事，有時只需要一個晚上。', rarity: 'C',
  },
  {
    id: 'g_wild_regrowth', name: '荒野復甦', type: 'sorcery', color: 'G',
    cost: C(3, { G: 1 }), spell: { kind: 'reanimate', target: 'ownGyCreature' },
    text: '將目標由你擁有的生物從墳墓場移回戰場。',
    flavor: '森林不埋東西，只是暫時收起來。', rarity: 'U',
  },
  {
    id: 'g_wolfcall', name: '群狼召集', type: 'sorcery', color: 'G',
    cost: C(3, { G: 1 }),
    spell: { kind: 'createToken', tokenId: 'tok_wolf', amount: 2, target: 'none' },
    text: '製造兩個 2/2 野狼衍生物。',
    flavor: '第一聲是問句，第二聲就不是了。', rarity: 'U',
  },
  {
    id: 'g_thorn_colossus', name: '荊棘巨像', type: 'creature', color: 'G',
    sub: ['元素'], cost: C(4, { G: 2 }), pow: 6, tou: 6, kw: ['trample', 'reach'],
    text: '踐踏、延勢',
    flavor: '它走過的地方，路自己讓開。', rarity: 'R',
  },
];

/** Colourless: enough cards for two machines that work differently. */
const COLOURLESS: CardDef[] = [
  {
    id: 'c_scrap_hauler', name: '廢料搬運工', type: 'creature', color: 'C',
    sub: ['構體'], cost: C(2), pow: 2, tou: 1, kw: ['haste'],
    text: '敏捷', flavor: '它搬的東西比它自己重，也比它自己值錢。', rarity: 'C',
  },
  {
    id: 'c_shield_drone', name: '護盾機組', type: 'creature', color: 'C',
    sub: ['構體'], cost: C(2), pow: 0, tou: 4, kw: ['defender', 'reach'],
    text: '守軍、延勢', flavor: '它唯一的指令是「不要讓任何東西過去」。', rarity: 'C',
  },
  {
    id: 'c_forge_wright', name: '鍛造技師', type: 'creature', color: 'C',
    sub: ['構體'], cost: C(3), pow: 2, tou: 2, kw: ['vigilance'],
    etb: { kind: 'createToken', tokenId: 'tok_thopter', amount: 1, target: 'none' },
    text: '警戒\n進場時，製造一個 1/1 具飛行異能的撲翼機衍生物。',
    flavor: '它一邊修別人，一邊做出下一個自己。', rarity: 'U',
  },
  {
    id: 'c_iron_bulwark', name: '鐵壁壘', type: 'creature', color: 'C',
    sub: ['構體', '城牆'], cost: C(4), pow: 2, tou: 7, kw: ['defender', 'reach'],
    text: '守軍、延勢', flavor: '攻城的一方換過六次，牆沒換過。', rarity: 'U',
  },
  {
    id: 'c_sentinel_prime', name: '哨戍首機', type: 'creature', color: 'C',
    sub: ['構體', '士兵'], cost: C(5), pow: 4, tou: 4, kw: ['vigilance', 'menace'],
    text: '警戒、威懾', flavor: '編號一號，至今仍在服役。', rarity: 'U',
  },
  {
    id: 'c_arc_lance', name: '弧光矛', type: 'artifact', color: 'C',
    cost: C(3), attach: { kind: 'equipment', host: 'ownCreature', p: 2, t: 2, kw: ['firststrike'] },
    text: '裝備\n所裝備的生物得 +2/+2 且具有先攻。',
    flavor: '出手的順序，比出手的力氣重要。', rarity: 'U',
  },
  {
    id: 'c_siege_protocol', name: '攻城協定', type: 'instant', color: 'C',
    cost: C(3), spell: { kind: 'pump', p: 2, t: 0, kw: ['trample', 'haste'], target: 'creature' },
    text: '目標生物得 +2/+0 且具有踐踏與敏捷，直到回合結束。',
    flavor: '協定第一條：不留下完整的牆。', rarity: 'C',
  },
  {
    id: 'c_thopter_foundry', name: '撲翼工坊', type: 'sorcery', color: 'C',
    cost: C(3), spell: { kind: 'createToken', tokenId: 'tok_thopter', amount: 2, target: 'none' },
    text: '製造兩個 1/1 具飛行異能的撲翼機衍生物。',
    flavor: '產線的聲音像蜂群，成品也像。', rarity: 'C',
  },
  {
    id: 'c_data_cache', name: '資料倉儲', type: 'sorcery', color: 'C',
    cost: C(4), spell: { kind: 'draw', amount: 3 },
    text: '抽三張牌。',
    flavor: '沒有人記得誰輸入的，但每一筆都還在。', rarity: 'U',
  },
  {
    id: 'c_purge_protocol', name: '淨除程序', type: 'sorcery', color: 'C',
    cost: C(5), spell: { kind: 'destroy', target: 'creature' },
    text: '消滅目標生物。',
    flavor: '程序不問對象是誰，只問編號還在不在名單上。', rarity: 'U',
  },
];

/** The two colour pairs that had no signature card of their own. */
const GOLD: CardDef[] = [
  {
    id: 'gold_verdant_paladin', name: '翠光聖騎', type: 'creature', color: 'G',
    colors: ['W', 'G'], sub: ['人類', '騎士'], cost: C(1, { W: 1, G: 1 }),
    pow: 3, tou: 3, kw: ['vigilance', 'trample'],
    text: '警戒、踐踏',
    flavor: '她的盾上刻著葉脈，不是紋章。', rarity: 'R',
  },
  {
    id: 'gold_mind_reaver', name: '心智劫奪者', type: 'creature', color: 'U',
    colors: ['U', 'B'], sub: ['幽魂', '法師'], cost: C(2, { U: 1, B: 1 }),
    pow: 2, tou: 3, kw: ['flying'],
    etb: { kind: 'mill', amount: 4, target: 'player' },
    text: '飛行\n進場時，目標玩家將牌庫頂四張牌置入墳墓場。',
    flavor: '它讀完就撕，因為讀過的頁沒有第二個用處。', rarity: 'R',
  },
];


/**
 * The cast.
 *
 * The board was filling up with swarms and beasts, which is a board you cannot make a plan
 * on: a 2/2 with reach plays the same as any other 2/2 with reach, whatever animal it is.
 * These are people, and each one gives its colour a decision it did not have — a caster who
 * pays you for holding a spell, a ranger who trades up, a knight who makes the second attack
 * better than the first.
 *
 * Every colour gets a 法師 and a 精靈 of its own, and the curve is filled where the pool was
 * thin: two-drops that do something on arrival, and four-drops worth building a deck around.
 */
const CAST: CardDef[] = [
  // ── 白 ───────────────────────────────────────────────────────────────────────
  {
    id: 'x_dawn_scribe', name: '曦光書記', type: 'creature', color: 'W',
    sub: ['法師'], cost: C(1, { W: 1 }), pow: 1, tou: 3, kw: ['lifelink'],
    etb: { kind: 'scry', amount: 1 },
    text: '吸血\n進場時，占卜 1。',
    flavor: '她抄的不是經文，是明天要用的東西。', rarity: 'C',
  },
  {
    id: 'x_shield_maiden', name: '持盾少女', type: 'creature', color: 'W',
    sub: ['騎士'], cost: C(2, { W: 1 }), pow: 2, tou: 4, kw: ['vigilance', 'firststrike'],
    text: '警戒、先攻',
    flavor: '第一排站的人，從來不是最壯的那個。', rarity: 'U',
  },
  {
    id: 'x_lantern_saint', name: '提燈聖者', type: 'creature', color: 'W',
    sub: ['牧師'], cost: C(3, { W: 1 }), pow: 3, tou: 3, kw: ['flying', 'lifelink'],
    etb: { kind: 'gainLife', amount: 3 },
    text: '飛行、吸血\n進場時，你獲得 3 點生命。',
    flavor: '燈不是給她自己照路的。', rarity: 'R',
  },

  // ── 藍 ───────────────────────────────────────────────────────────────────────
  {
    id: 'x_rune_reader', name: '符文讀者', type: 'creature', color: 'U',
    sub: ['法師'], cost: C(1, { U: 1 }), pow: 1, tou: 2, kw: ['flash'],
    etb: { kind: 'scry', amount: 2 },
    text: '閃現\n進場時，占卜 2。',
    flavor: '她讀的那一行，還沒有人寫下來。', rarity: 'C',
  },
  {
    id: 'x_mirror_twin', name: '鏡影雙生', type: 'creature', color: 'U',
    sub: ['精靈'], cost: C(2, { U: 1 }), pow: 2, tou: 3, kw: ['flying', 'flash'],
    text: '飛行、閃現',
    flavor: '你打中的永遠是另外一個。', rarity: 'U',
  },
  {
    id: 'x_tide_archmage', name: '潮汐大法師', type: 'creature', color: 'U',
    sub: ['法師'], cost: C(3, { U: 2 }), pow: 3, tou: 4, kw: ['flying'],
    etb: { kind: 'draw', amount: 2 },
    text: '飛行\n進場時，抽兩張牌。',
    flavor: '整座學院的水位，由她決定。', rarity: 'R',
  },

  // ── 黑 ───────────────────────────────────────────────────────────────────────
  {
    id: 'x_ash_witch', name: '灰燼巫女', type: 'creature', color: 'B',
    sub: ['法師'], cost: C(1, { B: 1 }), pow: 2, tou: 2, kw: ['deathtouch'],
    text: '死觸',
    flavor: '她碰過的東西，沒有一樣活著離開。', rarity: 'U',
  },
  {
    id: 'x_grave_courtier', name: '墓廷侍臣', type: 'creature', color: 'B',
    sub: ['吸血鬼'], cost: C(2, { B: 1 }), pow: 3, tou: 2, kw: ['flying', 'lifelink'],
    text: '飛行、吸血',
    flavor: '他鞠躬的角度，跟三百年前一模一樣。', rarity: 'U',
  },
  {
    id: 'x_bone_marshal', name: '白骨統帥', type: 'creature', color: 'B',
    sub: ['骷髏'], cost: C(3, { B: 2 }), pow: 3, tou: 3, kw: ['menace'],
    etb: { kind: 'createToken', tokenId: 'tok_zombie', amount: 1, target: 'none' },
    text: '威懾\n進場時，製造一個 2/2 殭屍衍生物。',
    flavor: '點名的時候，缺席的也會答有。', rarity: 'R',
  },

  // ── 紅 ───────────────────────────────────────────────────────────────────────
  {
    id: 'x_spark_apprentice', name: '火花學徒', type: 'creature', color: 'R',
    sub: ['法師'], cost: C(0, { R: 1 }), pow: 1, tou: 2, kw: ['haste'],
    etb: { kind: 'damage', amount: 1, target: 'any' },
    text: '敏捷\n進場時，對任意一個目標造成 1 點傷害。',
    flavor: '第一課就學會了怎麼點火，第二課還沒排。', rarity: 'C',
  },
  {
    id: 'x_ember_dancer', name: '燼焰舞者', type: 'creature', color: 'R',
    sub: ['精靈'], cost: C(1, { R: 1 }), pow: 2, tou: 2, kw: ['haste', 'firststrike'],
    text: '敏捷、先攻',
    flavor: '她跳完之後，地板還會亮很久。', rarity: 'U',
  },
  {
    id: 'x_forge_marshal', name: '熔爐統領', type: 'creature', color: 'R',
    sub: ['矮人'], cost: C(2, { R: 2 }), pow: 4, tou: 3, kw: ['haste', 'trample'],
    text: '敏捷、踐踏',
    flavor: '他把命令喊完，鎚子已經落下去了。', rarity: 'R',
  },

  // ── 綠 ───────────────────────────────────────────────────────────────────────
  {
    id: 'x_seed_speaker', name: '種語者', type: 'creature', color: 'G',
    sub: ['法師'], cost: C(1, { G: 1 }), pow: 1, tou: 3, kw: ['reach'],
    etb: { kind: 'addCounter', amount: 1, target: 'ownCreature' },
    text: '延勢\n進場時，在目標由你操控的生物上放置一個 +1/+1 指示物。',
    flavor: '她問了種子想長成什麼，然後照做。', rarity: 'C',
  },
  {
    id: 'x_thorn_ranger', name: '荊棘遊俠', type: 'creature', color: 'G',
    sub: ['遊俠'], cost: C(2, { G: 1 }), pow: 3, tou: 3, kw: ['reach', 'vigilance'],
    text: '延勢、警戒',
    flavor: '林子裡沒有她不知道的路。', rarity: 'U',
  },
  {
    id: 'x_grove_elder', name: '林祖長老', type: 'creature', color: 'G',
    sub: ['德魯伊'], cost: C(2, { G: 2 }), pow: 4, tou: 4, kw: ['trample', 'vigilance'],
    etb: { kind: 'ramp' },
    text: '踐踏、警戒\n進場時，從你的牌庫中搜尋一張基本魔法石牌，橫置放進戰場，然後洗牌。',
    flavor: '他走過的地方，路自己讓開，樹自己站直。', rarity: 'R',
  },
];


/**
 * The top of the curve.
 *
 * Every colour needed a six, a seven and an eight — a deck that ramps or controls has to
 * have something to ramp or control *towards*, and a format whose most expensive card is a
 * six is a format that ends the same way every time.
 *
 * The sixes are deliberately costed in pure colour: six green pips, six black pips. Magic
 * prints these as the reward for staying in one colour, and they are the reason a mono deck
 * is a real choice rather than a worse two-colour deck — no two-colour mana base can cast
 * them on time. The sevens and eights take generic, because by then the argument is about
 * how much mana you have, not which.
 *
 * None of these go into a deck that cannot cast them. Their homes are the ramp and control
 * lists; an aggro deck with twenty-two stones has no business holding an eight-drop.
 */
const TOP_END: CardDef[] = [
  // ── 白 ───────────────────────────────────────────────────────────────────────
  {
    id: 'x_dawn_sovereign', name: '曦光君主', type: 'creature', color: 'W',
    sub: ['天使'], cost: C(0, { W: 6 }), pow: 5, tou: 6,
    kw: ['flying', 'vigilance', 'lifelink'],
    etb: { kind: 'gainLife', amount: 5 },
    text: '飛行、警戒、吸血\n進場時，你獲得 5 點生命。',
    flavor: '她登基那天，整座城的燈一起亮起來，之後就沒有滅過。', rarity: 'M',
  },
  {
    id: 'x_judgment_seraph', name: '裁決熾天使', type: 'creature', color: 'W',
    sub: ['天使'], cost: C(5, { W: 2 }), pow: 6, tou: 6, kw: ['flying', 'vigilance'],
    etb: { kind: 'exile', target: 'creature' },
    text: '飛行、警戒\n進場時，放逐目標生物。',
    flavor: '判決不需要唸出來，被判的人自己會知道。', rarity: 'R',
  },
  {
    id: 'x_dawn_titan', name: '曙光泰坦', type: 'creature', color: 'W',
    sub: ['天使'], cost: C(6, { W: 2 }), pow: 8, tou: 8,
    kw: ['flying', 'vigilance', 'lifelink'],
    text: '飛行、警戒、吸血',
    flavor: '它落地的時候，影子先到，然後光才追上來。', rarity: 'M',
  },

  // ── 藍 ───────────────────────────────────────────────────────────────────────
  {
    id: 'x_deep_sovereign', name: '深海君主', type: 'creature', color: 'U',
    sub: ['人魚'], cost: C(0, { U: 6 }), pow: 5, tou: 7, kw: ['flying'],
    etb: { kind: 'draw', amount: 3 },
    text: '飛行\n進場時，抽三張牌。',
    flavor: '海面下的每一件事，她都是先知道的那一個。', rarity: 'M',
  },
  {
    id: 'x_storm_leviathan', name: '風暴利維坦', type: 'creature', color: 'U',
    sub: ['海獸'], cost: C(5, { U: 2 }), pow: 6, tou: 7, kw: ['flying'],
    etb: { kind: 'mill', amount: 6, target: 'player' },
    text: '飛行\n進場時，目標玩家將牌庫頂六張牌置入墳墓場。',
    flavor: '它翻身一次，海圖就要重畫一次。', rarity: 'R',
  },
  {
    id: 'x_dream_architect', name: '織夢者', type: 'creature', color: 'U',
    sub: ['法師'], cost: C(6, { U: 2 }), pow: 7, tou: 8, kw: ['flying'],
    etb: { kind: 'draw', amount: 4 },
    text: '飛行\n進場時，抽四張牌。',
    flavor: '她不預言未來，她只是把它寫下來。', rarity: 'M',
  },

  // ── 黑 ───────────────────────────────────────────────────────────────────────
  {
    id: 'x_grave_sovereign', name: '墓域君主', type: 'creature', color: 'B',
    sub: ['巫妖'], cost: C(0, { B: 6 }), pow: 6, tou: 6, kw: ['menace', 'deathtouch'],
    etb: { kind: 'discardRandom', amount: 2 },
    text: '威懾、死觸\n進場時，目標對手隨機棄兩張牌。',
    flavor: '他統治的地方沒有活人，也沒有人抱怨。', rarity: 'M',
  },
  {
    id: 'x_soul_tyrant', name: '噬魂魔王', type: 'creature', color: 'B',
    sub: ['惡魔'], cost: C(5, { B: 2 }), pow: 7, tou: 6, kw: ['flying', 'lifelink'],
    text: '飛行、吸血',
    flavor: '牠收的不是靈魂，是還沒還完的那部分。', rarity: 'R',
  },
  {
    id: 'x_night_eternal', name: '永夜之主', type: 'creature', color: 'B',
    sub: ['惡魔'], cost: C(6, { B: 2 }), pow: 8, tou: 8, kw: ['menace', 'deathtouch'],
    etb: { kind: 'reanimate', target: 'ownGyCreature' },
    text: '威懾、死觸\n進場時，將目標由你擁有的生物從墳墓場移回戰場。',
    flavor: '夜不是降臨的，是他把白天收走的。', rarity: 'M',
  },

  // ── 紅 ───────────────────────────────────────────────────────────────────────
  {
    id: 'x_flame_sovereign', name: '熔火君主', type: 'creature', color: 'R',
    sub: ['巨人'], cost: C(0, { R: 6 }), pow: 6, tou: 5, kw: ['haste', 'trample'],
    etb: { kind: 'damage', amount: 4, target: 'any' },
    text: '敏捷、踐踏\n進場時，對任意一個目標造成 4 點傷害。',
    flavor: '他從山裡走出來的那天，山就沒有再回去過。', rarity: 'M',
  },
  {
    id: 'x_magma_titan', name: '熔岩泰坦', type: 'creature', color: 'R',
    sub: ['巨人'], cost: C(5, { R: 2 }), pow: 7, tou: 6, kw: ['trample', 'haste'],
    text: '踐踏、敏捷',
    flavor: '它不繞路，路是它走出來的。', rarity: 'R',
  },
  {
    id: 'x_worldfire_wyrm', name: '焚世巨龍', type: 'creature', color: 'R',
    sub: ['龍'], cost: C(6, { R: 2 }), pow: 8, tou: 8,
    kw: ['flying', 'haste', 'trample'],
    text: '飛行、敏捷、踐踏',
    flavor: '牠一次只燒一個地方，因為牠只需要一次。', rarity: 'M',
  },

  // ── 綠 ───────────────────────────────────────────────────────────────────────
  {
    id: 'x_forest_sovereign', name: '森域君主', type: 'creature', color: 'G',
    sub: ['精靈'], cost: C(0, { G: 6 }), pow: 7, tou: 7, kw: ['trample', 'reach'],
    text: '踐踏、延勢',
    flavor: '整座林子替她站著，所以她從不需要說話。', rarity: 'M',
  },
  {
    id: 'x_ancient_ent', name: '遠古樹皇', type: 'creature', color: 'G',
    sub: ['樹人'], cost: C(5, { G: 2 }), pow: 6, tou: 9, kw: ['reach', 'vigilance'],
    etb: { kind: 'addCounter', amount: 3, target: 'ownCreature' },
    text: '延勢、警戒\n進場時，在目標由你操控的生物上放置三個 +1/+1 指示物。',
    flavor: '它記得這片林子還是一顆種子的樣子。', rarity: 'R',
  },
  {
    id: 'x_gaia_avatar', name: '大地化身', type: 'creature', color: 'G',
    sub: ['元素'], cost: C(6, { G: 2 }), pow: 9, tou: 9, kw: ['trample', 'vigilance'],
    text: '踐踏、警戒',
    flavor: '它站起來的時候，地圖上少了一座山。', rarity: 'M',
  },

  // ── 無色 ─────────────────────────────────────────────────────────────────────
  {
    id: 'x_void_colossus', name: '虛空巨像', type: 'creature', color: 'C',
    sub: ['泰坦'], cost: C(8), pow: 8, tou: 8, kw: ['trample', 'indestructible'],
    text: '踐踏、不滅',
    flavor: '造它的人早就不在了，圖紙也是。', rarity: 'M',
  },

  // ── 雙色，同樣沒有任意費用 ───────────────────────────────────────────────────
  {
    id: 'x_dawnflame_champion', name: '曦焰勇者', type: 'creature', color: 'R',
    colors: ['W', 'R'], sub: ['騎士'], cost: C(0, { W: 2, R: 4 }), pow: 6, tou: 5,
    kw: ['firststrike', 'haste', 'trample'],
    text: '先攻、敏捷、踐踏',
    flavor: '她的劍是白的，火是紅的，中間沒有分界。', rarity: 'M',
  },
];

/** Everything this module adds, by id. */
export function expansionCards(): Record<string, CardDef> {
  const out: Record<string, CardDef> = {};
  const all = [
    ...TOKENS, ...WHITE, ...BLUE, ...BLACK, ...RED, ...GREEN, ...COLOURLESS, ...GOLD, ...CAST,
    ...TOP_END,
  ];
  for (const d of all) out[d.id] = d;
  return out;
}
