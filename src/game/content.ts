/**
 * Content layer: the card additions and the deck lineup.
 *
 * The engine itself is untouched — it reads its card and deck registries by reference,
 * so this module installs new cards and replaces the deck list before the first match.
 * Everything here is expressed in the engine's existing vocabulary (17 keywords,
 * 17 effect kinds, anthems, attachments, mana abilities), so no rules code changes.
 *
 * The lineup is built the way a constructed format is: every colour and every pair of
 * colours gets a deck, plus one that plays no colour at all. Three-colour lists were
 * dropped — a third colour in a sixty-card deck costs more castability than it buys, and
 * the decks that had one were all playing the same good cards as their two-colour
 * neighbours rather than a strategy of their own.
 *
 * What replaced them is a second deck wherever a colour or a pair genuinely supports two
 * ways to play: white goes wide or goes tall, blue wins on cards or on the opponent's
 * library, red burns or flies, and so on. Twenty-six lists, arranged in colour order —
 * mono in WUBRG, then the pairs, then colourless.
 *
 * Each list is exactly 60 cards, with a mana base sized to its curve (22 for the decks
 * that want to be attacking on turn two, 25–26 for the ones that want to reach turn ten)
 * and four copies of whatever it actually wants to draw.
 */

import * as E from './engine';
import type { CardDef, DeckDef, Keyword } from './types';
import { landCards, landFor, BASIC } from './lands';
import { colourlessCards } from './colourless';
import { expansionCards, NO_VANILLA } from './expansion';
import { HOUSE_CARDS } from './houseCards';
import { LORE_NAMES, LORE_SUBS, LORE_TEXT, LORE_TRIBES } from './lore';

/** Cost helper, matching the engine's own. */
const C = (g: number, c: Record<string, number> = {}) => ({ g, c });

/**
 * A signature gold creature for each colour pair. Dual-colour cards carry `colors`
 * so the frame renders as a gradient between the two.
 */
const GOLD_CARDS: Record<string, CardDef> = {
  gold_sky_marshal: {
    id: 'gold_sky_marshal', name: '天穹執律', type: 'creature', color: 'W',
    colors: ['W', 'U'], sub: ['天使', '執法者'], cost: C(2, { W: 1, U: 1 }),
    pow: 3, tou: 4, kw: ['flying', 'vigilance'],
    text: '飛行、警戒',
    flavor: '她不追捕逃犯，她只是先一步抵達。', rarity: 'R',
  },
  gold_dusk_confessor: {
    id: 'gold_dusk_confessor', name: '暮鐘告解者', type: 'creature', color: 'W',
    colors: ['W', 'B'], sub: ['人類', '教士'], cost: C(1, { W: 1, B: 1 }),
    pow: 3, tou: 3, kw: ['flying', 'lifelink'],
    text: '飛行、吸血',
    flavor: '她收下每一句懺悔，也收下說話的人。', rarity: 'R',
  },
  gold_sun_champion: {
    id: 'gold_sun_champion', name: '烈陽鬥士', type: 'creature', color: 'R',
    colors: ['W', 'R'], sub: ['人類', '戰士'], cost: C(1, { W: 1, R: 1 }),
    pow: 4, tou: 3, kw: ['firststrike', 'haste'],
    text: '先攻、敏捷',
    flavor: '正午出鞘，正午收鞘，中間不留餘地。', rarity: 'R',
  },
  gold_storm_djinn: {
    id: 'gold_storm_djinn', name: '雷弧精怪', type: 'creature', color: 'U',
    colors: ['U', 'R'], sub: ['精怪'], cost: C(1, { U: 1, R: 1 }),
    pow: 3, tou: 2, kw: ['flying', 'haste'],
    text: '飛行、敏捷',
    flavor: '它不是被召喚出來的，是被激怒出來的。', rarity: 'R',
  },
  gold_tide_hydra: {
    id: 'gold_tide_hydra', name: '潮生九頭蛇', type: 'creature', color: 'G',
    colors: ['U', 'G'], sub: ['九頭蛇'], cost: C(2, { U: 1, G: 1 }),
    pow: 4, tou: 4, kw: ['trample'],
    etb: { kind: 'addCounter', amount: 1, target: 'ownCreature' },
    text: '踐踏\n進場時：在目標由你操控的生物上放置一個 +1/+1 指示物。',
    flavor: '砍下一顆頭，退潮時會長回兩顆。', rarity: 'R',
  },
  gold_blood_reaver: {
    id: 'gold_blood_reaver', name: '焰血劫掠者', type: 'creature', color: 'B',
    colors: ['B', 'R'], sub: ['惡魔', '戰士'], cost: C(2, { R: 1, B: 1 }),
    pow: 4, tou: 3, kw: ['menace', 'lifelink'],
    text: '威懾、吸血',
    flavor: '牠收割的不是性命，是還沒燒完的那口氣。', rarity: 'R',
  },
  gold_rot_shaman: {
    id: 'gold_rot_shaman', name: '腐土薩滿', type: 'creature', color: 'G',
    colors: ['B', 'G'], sub: ['地精', '薩滿'], cost: C(2, { B: 1, G: 1 }),
    pow: 3, tou: 3, kw: ['deathtouch', 'trample'],
    text: '死觸、踐踏',
    flavor: '他不種東西，他只是決定什麼時候該爛。', rarity: 'R',
  },
  gold_wild_flame: {
    id: 'gold_wild_flame', name: '野火蠻獸', type: 'creature', color: 'G',
    colors: ['R', 'G'], sub: ['野獸'], cost: C(2, { R: 1, G: 1 }),
    pow: 5, tou: 4, kw: ['trample', 'haste'],
    text: '踐踏、敏捷',
    flavor: '牠衝過的地方，連灰燼都來不及落地。', rarity: 'R',
  },
};

/** Everything this module adds to the card registry. */
const NEW_CARDS: Record<string, CardDef> = {
  ...landCards(),
  ...colourlessCards(),
  ...expansionCards(),
  ...GOLD_CARDS,
};

type List = [string, number][];

const deck = (
  id: string, name: string, colors: string[], hero: string, heroName: string,
  strategy: string, blurb: string, list: List,
): DeckDef => ({ id, name, colors, hero, heroName, strategy, blurb, list } as DeckDef);

/**
 * Mana base for a two-colour deck: an even split of the two basics plus the pair's dual.
 * The dual is the whole reason the deck can cast its gold cards on curve, so it gets the
 * largest share the format allows.
 */
const duo = (a: string, b: string, total = 24): List => {
  const dual = landFor([a, b])!;
  const each = Math.floor((total - 8) / 2);
  return [[BASIC[a], each], [BASIC[b], total - 8 - each], [dual, 8]];
};

/**
 * The twenty-six decks, in colour order. Each entry's comment names the archetype it is
 * there to teach, and where a colour or a pair appears twice the two lists are built to
 * play differently rather than to share a core.
 */
const LINEUP: DeckDef[] = [
  // Go wide: a one-drop in every hand, three anthems, and spells that mint bodies.
  deck('mono_w_tokens', '聖光軍團', ['W'], 'w_lightforge_captain', '晨曦統帥．瑟蕾娜', '白單群體',
    '白色群體壓制：一費衛兵與旗手先鋪滿戰場，輝耀領域、聖印之冠與曦鍛隊長三層加成同時生效，衛兵召集一次把咒語轉成致命攻勢。',
    [['pln', 23],
     ['w_hound', 2], ['w_squire', 2], ['knight', 1], ['w_banner_squire', 4],
     ['w_temple_guard', 1], ['w_lightforge_captain', 4], ['w_dove_flock', 1], ['muster', 4],
     ['w_guard_call', 1], ['w_conscript', 1], ['w_mass_muster', 1], ['seal', 4],
     ['w_holy_banner', 1], ['w_sanctuary', 1], ['hx_knight_muster', 1], ['w_smite', 3],
     ['w_ward_knight', 2], ['blessedblade', 2], ['hx_seek_enchant', 1]]),

  // Go tall: every body gains life, every answer is unconditional, and the top end flies.
  deck('mono_w_lifegain', '曦光守誓', ['W'], 'w_archangel', '守誓主教．奧黛', '白單吸血',
    '白色吸血消耗：見習聖光師與牧師把每一次交鋒換成生命，殉道領域讓全隊一起吸血，四種無條件解答清掉對手的答案，主天使收局。',
    [['pln', 25],
     ['w_acolyte', 4], ['x_dawn_scribe', 1], ['w_cleric', 1], ['w_healer', 1],
     ['w_lightbringer', 1], ['w_paladin', 3], ['x_lantern_saint', 1], ['w_angel_guard', 1],
     ['w_high_cleric', 1], ['angel', 1], ['w_archangel', 1], ['w_martyrs_cause', 1],
     ['w_smite', 3], ['verdict', 1], ['w_healing_light', 1], ['w_final_blessing', 1],
     ['sunshield', 2], ['w_purifier', 2], ['w_angel_host', 2], ['w_absolution', 1],
     ['w_bless', 1], ['w_radiant_ward', 1], ['x_dawn_sovereign', 2], ['x_judgment_seraph', 1]]),

  // Draw-go: counter it, kill it, draw two, win with one flyer.
  deck('mono_u_control', '深藍議會', ['U'], 'u_mind_sovereign', '潮汐議長．奈瑞德', '藍單控制',
    '藍色純控制：反制與凍波掌握節奏，守望者把地面堵死，抽牌不斷累積牌差，最後由心靈至尊單騎收局。',
    [['isl', 25],
     ['counter', 4], ['u_dispel', 4], ['insight', 1], ['u_vision', 1], ['u_deep_analysis', 1],
     ['u_frost_bolt', 4], ['u_undertow_grip', 1], ['u_frost_warden', 1], ['u_depth_guardian', 1],
     ['u_shoal_trickster', 1], ['x_rune_reader', 1], ['u_typhoon_caller', 1],
     ['u_mind_sovereign', 1], ['u_ghost_armada', 1], ['u_scholar', 2], ['u_seer', 2],
     ['u_oracle_of_tides', 2], ['x_tide_archmage', 2], ['u_abyssal_chart', 1],
     ['x_deep_sovereign', 2], ['x_dream_architect', 1]]),

  // Mill: the opponent library is the life total, and the walls buy the turns.
  deck('mono_u_mill', '記憶潮汐', ['U'], 'u_grand_forgetting', '記憶潮汐．伊絮', '藍單碾磨',
    '藍色碾磨：記憶蝕刻與遺忘之潮反覆削減對手牌庫，潛行者一邊繞過阻擋一邊碾磨，守軍與反制負責活到牌庫見底。',
    [['isl', 24],
     ['u_mind_sieve_lesser', 4], ['mind_sieve', 4], ['u_grand_illusion', 2],
     ['u_grand_forgetting', 1], ['u_mist_stalker', 4], ['u_mind_render', 1],
     ['u_phantom_scout', 1], ['counter', 1], ['u_dispel', 1], ['u_frost_bolt', 3],
     ['u_depth_guardian', 1], ['insight', 1], ['u_farsight', 1], ['u_mind_probe', 1],
     ['u_channel_spirit', 2], ['ray', 2], ['u_thoughtweaver', 2], ['u_veil_of_secrets', 1],
     ['x_deep_sovereign', 1], ['x_storm_leviathan', 2]]),

  // Aristocrats: cheap deathtouch bodies, edicts, and the graveyard as a second hand.
  deck('mono_b_sacrifice', '亡者獻祭', ['B'], 'b_lich_king', '墓匠．瓦爾席', '黑單獻祭',
    '黑色獻祭復甦：低費死觸生物換掉對手的關鍵威脅，逼獻與消滅清場，再用死者甦生把巨獸從墳場一再拉回來。',
    [['swp', 24],
     ['b_rat_swarm', 4], ['x_ash_witch', 1], ['ghoul', 4], ['b_plague_bearer', 1],
     ['edict_of_shadows', 1], ['b_cruel_edict', 1], ['b_soul_exchange', 1],
     ['b_animate_dead', 3], ['recall', 1], ['b_terror', 1], ['b_soul_flayer', 1],
     ['b_lich_king', 1], ['devourer', 1], ['b_abyssal_horror', 1], ['bone_horde', 1],
     ['b_wraith_whelp', 2], ['b_cursed_priest', 2], ['b_crypt_guard', 2], ['b_plague_lord', 2],
     ['b_dread_summons', 1], ['x_grave_sovereign', 2], ['x_soul_tyrant', 1],
     ['x_night_eternal', 1]]),

  // Menace aggro: nothing blocks alone, and what does block gets killed.
  deck('mono_b_aggro', '夜刃突襲', ['B'], 'b_grave_titan_whelp', '夜刃首領．凱恩', '黑單威懾',
    '黑色威懾快攻：全隊威懾讓單一阻擋者形同虛設，恐懼術與夜刃衝擊清掉唯一能擋的那隻，血契妖魔在空中補上最後幾點。',
    [['swp', 22],
     ['b_skeleton_archer', 4], ['b_gloom_stalker', 4], ['b_grave_robber', 2],
     ['b_swamp_stalker', 2], ['b_night_blade', 2], ['b_vault_scavenger', 2],
     ['x_grave_courtier', 2], ['b_death_knight', 2], ['b_grave_titan_whelp', 1],
     ['b_bloodpact_fiend', 1], ['x_bone_marshal', 1], ['b_terror', 4], ['b_night_bolt', 1],
     ['b_final_hour', 1], ['phantom_assassin', 2], ['b_shade', 2], ['b_carrion_bat', 2],
     ['vamp', 2], ['b_wither_touch', 1]]),

  // Burn: nothing above three mana, and half the deck can go to the face.
  deck('mono_r_burn', '烈焰速攻', ['R'], 'r_axe_fanatic', '焰紋鬥士．卡爾德', '紅單快攻',
    '紅色極限快攻：零費敏捷生物首回合就開打，鍛爐劍士帶著踐踏繞過小生物，燒牌不打生物也能打臉，四回合結束比賽。',
    [['mtn', 22],
     ['imp', 4], ['r_firebrand', 4], ['x_spark_apprentice', 4], ['r_goblin_scrapper', 2],
     ['r_ember_sprite', 2], ['x_ember_dancer', 2], ['r_forge_hound', 2], ['r_marauder', 2],
     ['r_axe_fanatic', 1], ['bolt', 4], ['r_flame_burst', 1], ['lava', 1], ['fury', 1],
     ['r_rally_cry', 1], ['r_torch_bearer', 2], ['r_flame_juggler', 2], ['r_war_drummer', 2],
     ['goblin_horde', 1]]),

  // Dragons: a flying curve from two mana up, and burn to clear the way.
  deck('mono_r_dragons', '龍炎霸權', ['R'], 'r_elder_dragon', '龍脊霸主．瓦倫', '紅單巨龍',
    '紅色巨龍霸權：幼龍從第二回合就開始飛，鱗甲傳令與藏寶巨龍讓每一費都有翅膀，尊者巨龍與焚天巨龍負責關門。',
    [['mtn', 26],
     ['r_young_wyrm', 4], ['r_scale_herald', 4], ['r_flame_drake', 1], ['drakeling', 1],
     ['ambush_wyrm', 1], ['r_dragon_whelp', 1], ['r_hoard_dragon', 1], ['r_dragon_rider', 1],
     ['r_inferno_wyrm', 1], ['dragon', 1], ['r_elder_dragon', 1], ['bolt', 4],
     ['r_dragons_roar', 1], ['r_incinerate', 1], ['r_flame_burst', 3], ['r_volcano_shaman', 2],
     ['r_meteor_shower', 1], ['r_wildfire', 1], ['x_flame_sovereign', 2], ['x_magma_titan', 1],
     ['x_worldfire_wyrm', 1]]),

  // Ramp stompy: mana acceleration into oversized trample threats.
  deck('mono_g_ramp', '蠻荒巨獸', ['G'], 'g_world_tree_avatar', '林祖．歐格瑪', '綠單斜坡',
    '綠色加速巨獸：森語魔法師與根脈薩滿搶先鋪出魔力，第三回合就落下五費巨獸，互鬥咒語代替除去，世界樹化身終結一切。',
    [['fst', 24],
     ['g_druid_apprentice', 4], ['g_root_shaman', 2], ['growth', 4], ['g_deep_roots', 2],
     ['x_grove_elder', 2], ['g_giant_spider', 1], ['g_thorn_elemental', 1], ['behemoth', 1],
     ['g_trample_beast', 1], ['g_regal_stag', 1], ['g_thorn_colossus', 1],
     ['g_world_tree_avatar', 1], ['g_natures_wrath', 3], ['g_savage_fight', 1],
     ['x_forest_sovereign', 4], ['g_thornling', 2], ['g_natures_blessing', 1],
     ['x_ancient_ent', 2], ['x_gaia_avatar', 2]]),

  // Counters: every creature arrives with a counter, every spell adds more.
  deck('mono_g_counters', '蒼翠增生', ['G'], 'g_verdant_hydra', '增生祭主．娜緹', '綠單指示物',
    '綠色指示物增生：藤蔓織者與扶生樹人一進場就餵大隊友，原始湧動與繁茂儀典讓一隻生物滾成無法阻擋的體型，延勢守住空中。',
    [['fst', 23],
     ['vine', 3], ['x_seed_speaker', 3], ['g_vine_weaver', 4], ['thornmaiden', 2],
     ['mendingtreant', 2], ['g_wild_growth_sprite', 2], ['x_thorn_ranger', 2],
     ['g_bloom_warden', 2], ['g_verdant_hydra', 2], ['g_might_of_the_wild', 2],
     ['g_primal_surge', 4], ['g_regrowth_ritual', 2], ['surge', 1], ['g_titanic_growth', 1],
     ['g_ironbark_ward', 2], ['g_natures_wrath', 2], ['x_ancient_ent', 1]]),

  // WU skies: cheap evasion backed by counters and removal.
  deck('wu_skies', '天穹封鎖', ['W', 'U'], 'gold_sky_marshal', '雲階執政．伊菲', '白藍空優',
    '白藍空中壓制：全隊飛行繞過地面對峙，反制與除去處理對手的解答，執律與天使在空中把血線一路壓到底。',
    [...duo('W', 'U', 23),
     ['w_griffin_scout', 4], ['u_wisp', 2], ['u_leyline_thief', 2], ['u_wave_skimmer', 2],
     ['x_mirror_twin', 2], ['u_wind_drake', 2], ['w_seraph_scout', 2], ['gold_sky_marshal', 4],
     ['u_storm_drake', 2], ['angel', 2], ['counter', 2], ['u_dispel', 2], ['w_smite', 2],
     ['w_falconer', 2], ['hx_twin_blade', 2], ['u_illusionist', 2], ['hx_seek_instant', 1]]),

  // WU walls: the same two colours playing the other side of the board.
  deck('wu_control', '曦光壁壘', ['W', 'U'], 'w_archangel', '壁壘執律．蘭恩', '白藍守勢',
    '白藍守勢控制：守軍把地面完全封死，反制與消滅處理飛行威脅，抽牌把資源差拉開，主天使與心靈至尊在對手空手時才登場。',
    [...duo('W', 'U', 25),
     ['u_depth_guardian', 2], ['u_frost_warden', 2], ['w_shieldwall', 2], ['w_sentry', 2],
     ['counter', 4], ['u_dispel', 1], ['insight', 1], ['u_deep_analysis', 1], ['w_smite', 4],
     ['w_holy_verdict', 1], ['verdict', 1], ['w_binding_light', 1], ['hx_aegis_field', 1],
     ['w_archangel', 1], ['u_mind_sovereign', 1], ['w_bulwark_titan', 2], ['w_aegis_shield', 1],
     ['hx_unmaking', 2], ['w_rebuke', 1], ['w_dawn_seer', 2], ['x_judgment_seraph', 1],
     ['x_dawn_titan', 1]]),

  // WB lifelink: every threat gains life, every answer is unconditional removal.
  deck('wb_lifelink', '誓血聖堂', ['W', 'B'], 'gold_dusk_confessor', '守誓主教．奧黛', '白黑吸血',
    '白黑吸血消耗：全隊吸血把每一次交鋒都換成生命，殉道領域讓整支部隊一起吸血，五種無條件除去負責清掉對手的答案。',
    [...duo('W', 'B'),
     ['b_bat_swarm', 4], ['w_acolyte', 2], ['b_soul_siphon_imp', 2], ['w_paladin', 2],
     ['gold_dusk_confessor', 4], ['b_death_knight', 2], ['b_bloodpact_fiend', 2],
     ['b_death_priest', 2], ['b_soul_harvester', 2], ['angel', 2], ['w_martyrs_cause', 2],
     ['b_terror', 2], ['whisper', 1], ['b_shroud_of_night', 1], ['b_wight_guard', 2],
     ['shadow_ward', 2], ['b_bone_ward', 1], ['x_soul_tyrant', 1]]),

  // WR aggro: a one-drop in every opening hand, anthems, and burn for the last points.
  deck('wr_aggro', '烈陽突襲', ['W', 'R'], 'gold_sun_champion', '燄冠團長．蓋倫', '白紅快攻',
    '白紅極速突襲：一費生物首回合就站上場，聖印之冠讓每隻小兵都超規格，烈陽鬥士補上先攻敏捷，燒牌收掉最後幾點。',
    [['pln', 7], ['mtn', 7], ['sunforge', 9],
     ['r_firebrand', 4], ['imp', 2], ['w_hound', 2], ['w_squire', 2], ['r_charhound', 2],
     ['gold_sun_champion', 4], ['w_sunspear_lancer', 2], ['x_shield_maiden', 2],
     ['w_crusader', 2], ['w_holy_banner', 2], ['bolt', 4], ['r_flame_burst', 2],
     ['w_dawn_charge', 1], ['dancer', 2], ['r_berserk_champion', 2], ['hx_scarred_berserker', 1],
     ['x_dawnflame_champion', 1]]),

  // WG counters: a growing board, and the tricks that make attacking into it a mistake.
  deck('wg_counters', '聖輝荒野', ['W', 'G'], 'gold_verdant_paladin', '星燈祭司．伊蕾', '白綠指示物',
    '白綠指示物中速：藤蔓織者與戰場神官一路餵大核心生物，翠光聖騎帶著警戒踐踏壓場，瞬間增益讓每一次阻擋都虧本。',
    [...duo('W', 'G'),
     ['vine', 2], ['g_vine_weaver', 2], ['w_battle_priest', 2], ['thornmaiden', 2],
     ['gold_verdant_paladin', 4], ['mendingtreant', 2], ['guardianoak', 2],
     ['x_thorn_ranger', 2], ['g_regal_stag', 2], ['angel', 1], ['behemoth', 1],
     ['g_primal_surge', 4], ['surge', 1], ['g_natures_wrath', 3], ['seal', 1],
     ['w_vow_of_duty', 1], ['w_oath_keeper', 2], ['w_arbiter', 2]]),

  // WG tokens: the same two colours, but the board is made of spells.
  deck('wg_tokens', '衛兵洪流', ['W', 'G'], 'w_lightforge_captain', '洪流祭司．伊蕾', '白綠衍生物',
    '白綠衍生物洪流：衛兵召集與群狼召集把咒語變成戰場，四種加成同時作用在整片兵海上，一次攻擊就送出十幾點傷害。',
    [...duo('W', 'G', 23),
     ['muster', 4], ['w_banner_squire', 3], ['w_guard_call', 2], ['w_conscript', 2],
     ['w_mass_muster', 2], ['w_spirit_choir', 2], ['g_wolfcall', 3], ['g_hunting_wolf_pack', 2],
     ['w_lightforge_captain', 2], ['seal', 4], ['w_holy_banner', 2], ['w_oath_of_dawn', 2],
     ['g_pack_leader', 2], ['mendingtreant', 1], ['w_smite', 2], ['bramblewarden', 2]]),

  // UB control: answer everything, then win with two cards.
  deck('ub_control', '深淵祕法', ['U', 'B'], 'devourer', '月影術士．榭菈', '藍黑控制',
    '藍黑控制：反制與兩種無條件消滅覆蓋所有威脅，抽牌把資源差拉開，索魂者與幽淵吞噬者在對手空手時才登場收局。',
    [...duo('U', 'B', 25),
     ['counter', 4], ['u_dispel', 2], ['b_terror', 4], ['whisper', 3], ['edict_of_shadows', 2],
     ['insight', 3], ['u_deep_analysis', 2], ['b_dark_study', 2], ['x_rune_reader', 2],
     ['gold_mind_reaver', 3], ['u_archivist', 2], ['b_reaper_of_souls', 2],
     ['u_mind_sovereign', 2], ['devourer', 2]]),

  // UB mill: the same colours, aimed at the library instead of the life total.
  deck('ub_mill', '深淵碾磨', ['U', 'B'], 'gold_mind_reaver', '碾磨術士．榭菈', '藍黑碾磨',
    '藍黑碾磨控制：記憶蝕刻、靈魂收割與心智劫奪者輪番削減對手牌庫，反制與致命低語掩護節奏，穩紮穩打耗盡對手資源。',
    [...duo('U', 'B'),
     ['u_mind_sieve_lesser', 3], ['mind_sieve', 4], ['b_reap', 3], ['u_grand_illusion', 2],
     ['gold_mind_reaver', 4], ['u_mist_stalker', 3], ['u_mind_render', 2],
     ['u_mnemonic_wraith', 2], ['counter', 3], ['b_terror', 2], ['whisper', 2], ['mindrend', 1],
     ['b_soul_shatter', 1], ['farsight_ritual', 2], ['hx_seek_sorcery', 1], ['u_scrying_orb', 1]]),

  // UR skies: every creature flies, every spell either burns or answers.
  deck('ur_skies', '雷弧咒法', ['U', 'R'], 'gold_storm_djinn', '弧光執匠．瑟凡', '藍紅空襲',
    '藍紅空中咒法：飛行生物一路壓制血線，燒牌同時能打生物與玩家，反制守住關鍵回合，巨龍在第六回合直接關門。',
    [...duo('U', 'R', 23),
     ['u_moon_sprite', 2], ['u_wave_skimmer', 3], ['r_young_wyrm', 3], ['u_wind_drake', 3],
     ['gold_storm_djinn', 4], ['r_flame_drake', 3], ['x_mirror_twin', 2], ['u_riftwing', 2],
     ['u_storm_drake', 2], ['dragon', 2], ['bolt', 4], ['r_incinerate', 2], ['counter', 2],
     ['u_dispel', 2], ['u_temporal_shield', 1]]),

  // UG ramp: mana dorks into card advantage into an unanswerable top end.
  deck('ug_ramp', '潮生共鳴', ['U', 'G'], 'gold_tide_hydra', '潮林賢者．奈薇', '藍綠斜坡',
    '藍綠加速共鳴：森語魔法師與自然滋長把魔力推到六點，中盤用抽牌補手，九頭蛇與世界樹化身在對手站穩之前就結束比賽。',
    [...duo('U', 'G'),
     ['g_druid_apprentice', 4], ['g_root_shaman', 1], ['growth', 3], ['g_deep_roots', 1],
     ['u_scholar', 1], ['g_giant_spider', 1], ['gold_tide_hydra', 3], ['u_riftwing', 1],
     ['g_thorn_elemental', 1], ['behemoth', 1], ['x_grove_elder', 1], ['g_thorn_colossus', 1],
     ['g_world_tree_avatar', 1], ['u_tide_surge', 1], ['insight', 1], ['g_natures_wrath', 2],
     ['g_savage_fight', 2], ['tidal_seer', 2], ['u_tide_shaman', 2], ['u_current_rider', 2],
     ['u_glimmer_eel', 1], ['u_conjurer', 1], ['u_mind_circlet', 1], ['x_gaia_avatar', 1]]),

  // BR sacrifice: red speed with black removal and recursion.
  deck('br_sacrifice', '焰血獻祭', ['B', 'R'], 'gold_blood_reaver', '血焰督軍．卡茲', '黑紅犧牲',
    '黑紅犧牲快攻：敏捷小兵與死觸擋路者互相掩護，逼獻與燒牌清掉阻礙，劫掠者靠威懾吸血一邊打臉一邊回血。',
    [...duo('B', 'R', 22),
     ['imp', 2], ['b_rat_swarm', 2], ['b_gloom_stalker', 4], ['ghoul', 2], ['r_marauder', 2],
     ['raider', 2], ['x_ash_witch', 2], ['gold_blood_reaver', 4], ['r_flame_giant', 2],
     ['bolt', 4], ['b_terror', 2], ['edict_of_shadows', 2], ['b_animate_dead', 1],
     ['frenzyrite', 1], ['hx_ember_rain', 1], ['r_goblin_sapper', 2], ['chief', 2],
     ['r_goblin_rally', 1]]),

  // BG graveyard: deathtouch blockers, and the yard as a second hand.
  deck('bg_graveyard', '腐土輪迴', ['B', 'G'], 'gold_rot_shaman', '腐根長老．瑪爾格', '黑綠輪迴',
    '黑綠墓地輪迴：死觸生物讓對手不敢攻擊，消滅與互鬥換掉關鍵威脅，死者甦生與荒野復甦把巨獸一再拉回戰場。',
    [...duo('B', 'G'),
     ['b_rat_swarm', 2], ['g_druid_apprentice', 2], ['b_plague_bearer', 2],
     ['b_venom_spider', 2], ['gold_rot_shaman', 4], ['g_moss_troll', 2], ['b_soul_flayer', 2],
     ['g_trample_beast', 2], ['g_vine_horror', 2], ['b_lich_king', 2],
     ['g_world_tree_avatar', 1], ['b_animate_dead', 4], ['g_wild_regrowth', 1], ['b_terror', 1],
     ['g_natures_wrath', 1], ['wildclash', 1], ['grave_warden', 2], ['b_zombie_horde_leader', 2],
     ['x_night_eternal', 1]]),

  // RG stompy: the biggest bodies in the format, arriving two turns early.
  deck('rg_stompy', '蠻獸烈焰', ['R', 'G'], 'gold_wild_flame', '烈鬃族長．托爾加', '紅綠猛攻',
    '紅綠踐踏猛攻：森語魔法師把五費巨獸提前到第三回合，野火蠻獸與灰燼泰坦帶著踐踏輾過阻擋者，燒牌清掉最後一道防線。',
    [...duo('R', 'G', 23),
     ['g_druid_apprentice', 2], ['g_stag_beetle', 2], ['g_canopy_serpent', 2],
     ['r_cinder_wolf', 2], ['g_thorn_elemental', 2], ['gold_wild_flame', 4], ['behemoth', 4],
     ['r_ashen_titan', 2], ['g_regal_stag', 2], ['r_hoard_dragon', 2], ['bolt', 2], ['surge', 2],
     ['g_wild_charge', 1], ['g_beetle_swarm', 1], ['berserker_unbound', 2],
     ['x_forge_marshal', 2], ['r_pit_fighter', 2], ['x_magma_titan', 1]]),

  // RG voltron: few threats, all of them wearing everything the deck owns.
  deck('rg_voltron', '烈鬃武裝', ['R', 'G'], 'wolf', '武裝獵長．凱拉', '紅綠武裝',
    '紅綠武裝猛攻：辟邪巨狼吃滿四種秘寶與法陣，對手的除去牌指不到它，一次瞬間增益就能在戰鬥中翻盤並直接決勝。',
    [...duo('R', 'G', 22),
     ['wolf', 4], ['g_druid_apprentice', 3], ['g_forest_scout', 2], ['g_rootwalker', 2],
     ['gold_wild_flame', 3], ['warhammer', 4], ['r_flame_axe', 2], ['g_bark_armor', 2],
     ['c_arc_lance', 2], ['c_pulse_cannon', 1], ['g_verdant_bond', 2], ['g_giant_growth', 2],
     ['reckless_charge', 2], ['bolt', 2], ['r_berserkers_charm', 2], ['c_siege_protocol', 1],
     ['r_war_chanter', 2]]),

  // Constructs: no colour requirement at all, so every stone casts every spell.
  deck('c_swarm', '傀儡工廠', [], 'c_overseer', '總工程師．無名', '無色構體',
    '無色構體工廠：全牌不需要任何有色魔力，任何一顆魔法石都能施放任何一張牌，傀儡與撲翼機鋪滿戰場，監督者一次拉高全隊。',
    [['wastes', 23],
     ['c_scrap_hauler', 4], ['c_spinner', 4], ['c_forge_wright', 4], ['c_arc_drone', 3],
     ['c_iron_sentinel', 2], ['c_assembly_core', 3], ['c_overseer', 4], ['c_thopter_foundry', 3],
     ['c_foundry_call', 2], ['c_null_rod', 2], ['c_arc_lance', 2], ['c_siege_engine', 2],
     ['c_disassemble', 2]]),

  // Fortress: the same colourlessness, played as a wall the opponent cannot get through.
  deck('c_bulwark', '鋼鐵壁壘', [], 'c_relic_colossus', '壁壘總管．零號', '無色壁壘',
    '無色壁壘：守軍把地面完全堵死，拆解程序與淨除之光處理任何體型的生物，記憶迴廊補滿手牌，遺械巨像與熔爐泰坦負責結束。',
    [['wastes', 26],
     ['c_scrap_servitor', 4], ['c_shield_drone', 4], ['c_power_surge', 2], ['hx_forge_golem', 3],
     ['c_disassemble', 3], ['c_salvage', 3], ['c_iron_bulwark', 2], ['c_data_cache', 2],
     ['c_purge_protocol', 2], ['c_sentinel_prime', 2], ['c_relic_colossus', 2],
     ['c_forge_titan', 2], ['c_pulse_cannon', 1], ['x_void_colossus', 2]]),
];

let installed = false;

/** Installs the new cards and swaps in the deck lineup. Safe to call more than once. */
export function installContent() {
  if (installed) return;
  installed = true;

  for (const [id, def] of Object.entries(NEW_CARDS)) {
    (E.CARDS as Record<string, CardDef>)[id] = def;
  }

  applyNoVanilla();
  applyLore();
  applyHostileTargeting();

  for (const key of Object.keys(E.DECKS)) delete (E.DECKS as Record<string, DeckDef>)[key];
  for (const d of LINEUP) (E.DECKS as Record<string, DeckDef>)[d.id] = d;
}

/**
 * Gives a keyword to every creature that shipped without one.
 *
 * The keyword is also written into the card's text, because the places that print `text`
 * raw — the deck list, the card browser — would otherwise describe a creature the player
 * is not holding. The card face composes its own keyword line and drops the duplicate,
 * so nothing is said twice where it matters.
 */
function applyNoVanilla() {
  const registry = E.CARDS as Record<string, CardDef>;
  const name = E.KEYWORD_NAME as Record<string, string>;
  for (const [id, kw] of Object.entries(NO_VANILLA) as [string, Keyword][]) {
    const def = registry[id];
    if (!def || def.kw?.length) continue;
    const label = name[kw] ?? kw;
    registry[id] = {
      ...def,
      kw: [kw],
      text: def.text?.startsWith(label) ? def.text : `${label}\n${def.text ?? ''}`.trim(),
    };
  }
}

/**
 * Re-skins the pool into the mage's world: see `lore.ts` for what changes and why.
 *
 * Runs after the new cards are installed, so it can rename them too, and it rewrites the
 * tribe a rule names in the same pass as the tribe a creature wears — an anthem that says
 * 衛兵 while every soldier now says 衛兵 is an anthem that buffs nothing.
 */
function applyLore() {
  const registry = E.CARDS as Record<string, CardDef>;
  for (const [id, def] of Object.entries(registry)) {
    let next = def;
    const sub = LORE_SUBS[id];
    const name = LORE_NAMES[id];
    if (sub) next = { ...next, sub };
    if (name) next = { ...next, name };

    // A tribe named by a rule has to move with the creatures that wear it.
    const tribe = next.anthem?.tribe && LORE_TRIBES[next.anthem.tribe];
    if (tribe) next = { ...next, anthem: { ...next.anthem!, tribe } };
    const houseTribe = (next as { house?: { tribe?: string } }).house?.tribe;
    if (houseTribe && LORE_TRIBES[houseTribe]) {
      const house = { ...(next as { house?: Record<string, unknown> }).house, tribe: LORE_TRIBES[houseTribe] };
      next = { ...next, house } as CardDef;
    }

    let text = next.text ?? '';
    for (const [from, to] of LORE_TEXT) text = text.split(from).join(to);
    if (text !== next.text) next = { ...next, text };

    if (next !== def) registry[id] = next;
  }
}

/**
 * Harmful effects point at the opponent, and say so.
 *
 * Every spell that only ever hurts what it touches — damage, destroy, exile, a shrink, a
 * mill, an edict — used to offer your own board as a legal target, because the engine's
 * `creature` and `any` classes cover both sides. Nobody destroys their own creature on
 * purpose in this game; all that breadth bought was a misclick that cannot be taken back.
 *
 * `oppCreature` is the engine's own class. `oppAny` and `oppPlayer` are the house layer's,
 * which is why this runs after `installHouse`. The rules text is rewritten in the same pass:
 * a card that can only be aimed one way should not say 目標生物.
 */
function applyHostileTargeting() {
  const registry = E.CARDS as Record<string, CardDef>;
  const hostile = (e?: { kind?: string; target?: string; p?: number; t?: number }) => {
    if (!e?.target) return false;
    if (['destroy', 'exile', 'damage', 'mill', 'sacrifice', 'discardRandom'].includes(e.kind ?? '')) return true;
    return e.kind === 'pump' && ((e.p ?? 0) < 0 || (e.t ?? 0) < 0);
  };
  const redirect: Record<string, string> = {
    creature: 'oppCreature', any: 'oppAny', player: 'oppPlayer',
  };
  const say: [RegExp, string][] = [
    [/目標生物/g, '目標對手的生物'],
    [/目標玩家/g, '目標對手'],
    [/任意一個目標/g, '對手或對手的生物'],
    [/所附著的生物/g, '所附著的敵方生物'],
    [/選擇一個生物來附著/g, '選擇一個敵方生物來附著'],
  ];

  for (const [id, def] of Object.entries(registry)) {
    let next = def;
    let touched = false;
    for (const slot of ['spell', 'etb'] as const) {
      const eff = next[slot] as { kind?: string; target?: string; p?: number; t?: number } | undefined;
      if (!hostile(eff) || !redirect[eff!.target!]) continue;
      next = { ...next, [slot]: { ...eff, target: redirect[eff!.target!] } };
      touched = true;
    }
    // A hostile aura is a hostile spell that stays on the board.
    const att = next.attach;
    if (att?.kind === 'aura' && ((att.p ?? 0) < 0 || (att.t ?? 0) < 0 || (att.kw ?? []).includes('defender'))) {
      next = { ...next, attach: { ...att, host: 'oppCreature' } };
      touched = true;
    }
    if (!touched) continue;
    let text = next.text ?? '';
    for (const [re, to] of say) text = text.replace(re, to);
    registry[id] = { ...next, text };
  }
}

/** Validation used by the test suite: every list is legal and playable. */
export function validateLineup(): string[] {
  const problems: string[] = [];
  /*
   * The house cards are consulted directly rather than through the registry. `installHouse`
   * normally runs first and puts them there, but a validator that only works when something
   * else ran first is a validator that reports a missing card when the real fault is an
   * import order.
   */
  const cardOf = (id: string): CardDef | undefined =>
    (E.CARDS as Record<string, CardDef>)[id] ?? NEW_CARDS[id] ?? (HOUSE_CARDS[id] as CardDef);

  for (const d of LINEUP) {
    const total = d.list.reduce((a, [, n]) => a + n, 0);
    if (total !== 60) problems.push(`${d.name}: ${total} 張（應為 60）`);

    const seen = new Set<string>();
    for (const [id, n] of d.list) {
      if (seen.has(id)) problems.push(`${d.name}: ${id} 出現兩次`);
      seen.add(id);
      const card = cardOf(id);
      if (!card) {
        problems.push(`${d.name}: 找不到卡牌 ${id}`);
        continue;
      }
      if (card.type !== 'land' && n > 4) problems.push(`${d.name}: ${card.name} ×${n} 超過 4 張上限`);
      // No vanilla creatures: a body with nothing written on it plays the same every game.
      if (card.type === 'creature' && !card.kw?.length) {
        problems.push(`${d.name}: ${card.name} 沒有任何關鍵字`);
      }
    }

    // every coloured pip in the deck must be producible by its mana base
    const produced = new Set<string>();
    for (const [id] of d.list) {
      const card = cardOf(id);
      if (card?.type === 'land') (card.mana ?? []).forEach((m) => produced.add(m));
    }
    for (const [id] of d.list) {
      const card = cardOf(id);
      for (const col of Object.keys(card?.cost?.c ?? {})) {
        if (!produced.has(col)) problems.push(`${d.name}: ${card!.name} 需要 ${col} 魔力，但魔法石牌產不出來`);
      }
    }

    // the deck's declared colours must match the pips it actually plays
    const pips = new Set<string>();
    for (const [id] of d.list) {
      const card = cardOf(id);
      Object.keys(card?.cost?.c ?? {}).forEach((c) => pips.add(c));
    }
    for (const c of pips) {
      if (!d.colors.includes(c as never)) problems.push(`${d.name}: 使用了未宣告的 ${c} 費用`);
    }
    for (const c of d.colors) {
      if (!pips.has(c)) problems.push(`${d.name}: 宣告了 ${c} 卻沒有任何 ${c} 費用`);
    }

    const lands = d.list
      .filter(([id]) => cardOf(id)?.type === 'land')
      .reduce((a, [, n]) => a + n, 0);
    if (lands < 20 || lands > 27) problems.push(`${d.name}: 魔法石牌 ${lands} 張，超出合理範圍`);
  }

  // Every colour, every pair, and colourless: the lineup is a format, not a sampler.
  const key = (cols: string[]) => ['W', 'U', 'B', 'R', 'G'].filter((c) => cols.includes(c)).join('') || 'C';
  const covered = new Set(LINEUP.map((d) => key(d.colors)));
  const wanted = ['W', 'U', 'B', 'R', 'G', 'WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG', 'C'];
  for (const k of wanted) if (!covered.has(k)) problems.push(`缺少 ${k} 牌組`);
  for (const d of LINEUP) {
    if (d.colors.length > 2) problems.push(`${d.name}: 三色以上的牌組已不在陣容中`);
  }
  return problems;
}

export const LINEUP_IDS = LINEUP.map((d) => d.id);
