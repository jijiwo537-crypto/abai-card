/* eslint-disable */
// ArcaneDuel game engine — extracted VERBATIM from the original build.
// Only change: immer's `produce` (originally the local `i0`) now comes from the npm package.
import { produce as i0 } from 'immer';

let i2 = (e, t = {}) => ({
    g: e,
    c: t
  }),
  i1 = {
    pln: {
      id: "pln",
      name: "平原",
      type: "land",
      color: "L",
      basic: !0,
      mana: ["W"],
      text: "橫置：加一點白色魔力。",
      flavor: "晨光灑落之地，聖印永不熄滅。",
      rarity: "C"
    },
    isl: {
      id: "isl",
      name: "海島",
      type: "land",
      color: "L",
      basic: !0,
      mana: ["U"],
      text: "橫置：加一點藍色魔力。",
      flavor: "潮汐低語著被遺忘的咒文。",
      rarity: "C"
    },
    swp: {
      id: "swp",
      name: "沼澤",
      type: "land",
      color: "L",
      basic: !0,
      mana: ["B"],
      text: "橫置：加一點黑色魔力。",
      flavor: "腐土之下，亡者仍在傾聽。",
      rarity: "C"
    },
    mtn: {
      id: "mtn",
      name: "山脈",
      type: "land",
      color: "L",
      basic: !0,
      mana: ["R"],
      text: "橫置：加一點紅色魔力。",
      flavor: "火脈奔流，一觸即燃。",
      rarity: "C"
    },
    fst: {
      id: "fst",
      name: "樹林",
      type: "land",
      color: "L",
      basic: !0,
      mana: ["G"],
      text: "橫置：加一點綠色魔力。",
      flavor: "古木之根，纏繞著世界的心跳。",
      rarity: "C"
    },
    dawn: {
      id: "dawn",
      name: "晨曦林地",
      type: "land",
      color: "L",
      mana: ["W", "G"],
      text: "橫置：加一點白色或綠色魔力。",
      flavor: "樹冠間漏下的，是祝福的光。",
      rarity: "U"
    },
    dusk: {
      id: "dusk",
      name: "幽暗礁湖",
      type: "land",
      color: "L",
      mana: ["U", "B"],
      text: "橫置：加一點藍色或黑色魔力。",
      flavor: "湖面倒映的，並非天空。",
      rarity: "U"
    },
    vine: {
      id: "vine",
      name: "藤蔓祭師",
      type: "creature",
      sub: ["妖精", "德魯伊"],
      cost: i2(0, {
        G: 1
      }),
      color: "G",
      pow: 1,
      tou: 1,
      kw: ["reach"],
      mana: ["G"],
      text: "延勢（可阻擋具飛行的生物）\n橫置：加一點綠色魔力。",
      flavor: "「大地借我一縷力，我還它一片林。」",
      rarity: "C"
    },
    knight: {
      id: "knight",
      name: "聖殿騎士",
      type: "creature",
      sub: ["人類", "騎士"],
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      pow: 2,
      tou: 2,
      kw: ["vigilance"],
      text: "警戒（攻擊時不需橫置）",
      flavor: "誓約高於性命，聖殿高於王座。",
      rarity: "C"
    },
    wolf: {
      id: "wolf",
      name: "荒野獵狼",
      type: "creature",
      sub: ["野獸", "狼"],
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      pow: 3,
      tou: 1,
      kw: ["hexproof"],
      text: "辟邪（不能成為對手咒語的目標）",
      flavor: "牠的獵物，從沒見過牠的影子。",
      rarity: "U"
    },
    seal: {
      id: "seal",
      name: "光輝聖印",
      type: "enchantment",
      cost: i2(2, {
        W: 1
      }),
      color: "W",
      anthem: {
        p: 1,
        t: 1,
        scope: "own"
      },
      text: "你操控的生物得 +1/+1。",
      flavor: "一道印記，萬軍同輝。",
      rarity: "R"
    },
    verdict: {
      id: "verdict",
      name: "天界裁罰",
      type: "instant",
      cost: i2(1, {
        W: 2
      }),
      color: "W",
      spell: {
        kind: "exile",
        target: "combatCreature"
      },
      text: "放逐目標進行攻擊或阻擋的生物。",
      flavor: "審判不問來歷，只看罪行。",
      rarity: "R"
    },
    behemoth: {
      id: "behemoth",
      name: "蠻角巨獸",
      type: "creature",
      sub: ["野獸"],
      cost: i2(2, {
        G: 2
      }),
      color: "G",
      pow: 5,
      tou: 4,
      kw: ["trample"],
      text: "踐踏（溢出的戰鬥傷害轉移給防守玩家）",
      flavor: "牠不繞路。路會繞牠。",
      rarity: "U"
    },
    surge: {
      id: "surge",
      name: "巨力狂湧",
      type: "instant",
      cost: i2(0, {
        G: 1
      }),
      color: "G",
      spell: {
        kind: "pump",
        p: 3,
        t: 3,
        target: "creature"
      },
      text: "目標生物得 +3/+3 直到回合結束。",
      flavor: "森林的怒吼，透過血脈傳達。",
      rarity: "C"
    },
    angel: {
      id: "angel",
      name: "晨曦天使",
      type: "creature",
      sub: ["天使"],
      cost: i2(3, {
        W: 2
      }),
      color: "W",
      pow: 4,
      tou: 4,
      kw: ["flying", "vigilance", "lifelink"],
      text: "飛行、警戒、吸血",
      flavor: "她展翼之處，黑夜俯首。",
      rarity: "M"
    },
    growth: {
      id: "growth",
      name: "自然滋長",
      type: "sorcery",
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      spell: {
        kind: "ramp"
      },
      text: "從你的牌庫中搜尋一張基本魔法石牌，橫置放進戰場，然後洗牌。",
      flavor: "種一顆晨露，收一座森林。",
      rarity: "C"
    },
    muster: {
      id: "muster",
      name: "集結號角",
      type: "sorcery",
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      spell: {
        kind: "createToken",
        tokenId: "tok_soldier",
        amount: 2,
        target: "none"
      },
      text: "製造兩個 1/1 白色人類衛兵衍生物。",
      flavor: "號角一響，田埂間的農夫都成了誓死的兵。",
      rarity: "C"
    },
    blessedblade: {
      id: "blessedblade",
      name: "聖光之刃",
      type: "artifact",
      sub: ["裝備"],
      cost: i2(2),
      color: "W",
      attach: {
        host: "ownCreature",
        kind: "equipment",
        p: 2,
        t: 1
      },
      text: "裝備\n進場時，選擇一個由你操控的生物來裝備。\n裝備中的生物得 +2/+1。",
      flavor: "刃上的聖光，從不需要出鞘就能震懾敵人。",
      rarity: "U"
    },
    bramblewarden: {
      id: "bramblewarden",
      name: "荊冠護甲",
      type: "enchantment",
      sub: ["靈氣"],
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      attach: {
        host: "ownCreature",
        kind: "aura",
        p: 1,
        t: 3,
        kw: ["reach"]
      },
      text: "光環\n進場時，選擇一個由你操控的生物來附著。\n所附著的生物得 +1/+3 並具有延勢。",
      flavor: "荊棘纏繞之處，再無破綻。",
      rarity: "U"
    },
    guardianoak: {
      id: "guardianoak",
      name: "橡毅衛士",
      type: "creature",
      sub: ["樹妖"],
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      pow: 2,
      tou: 4,
      kw: ["regenerate"],
      text: "再生（每回合一次，本應消滅時改為橫置並移出戰鬥）",
      flavor: "斧砍不斷年輪，年輪記得每一斧。",
      rarity: "U"
    },
    thornmaiden: {
      id: "thornmaiden",
      name: "荊環新芽",
      type: "creature",
      sub: ["妖精", "德魯伊"],
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      pow: 2,
      tou: 2,
      etb: {
        kind: "addCounter",
        amount: 2,
        target: "none"
      },
      text: "進場時，在荊環新芽上放置兩個 +1/+1 指示物。",
      flavor: "她初生之時，便已學會生長。",
      rarity: "U"
    },
    wildclash: {
      id: "wildclash",
      name: "獸群衝撞",
      type: "instant",
      cost: i2(0, {
        G: 2
      }),
      color: "G",
      spell: {
        kind: "fight",
        target: "ownCreature",
        target2: "oppCreature"
      },
      text: "目標由你操控的生物與目標由對手操控的生物互相搏鬥。（兩者對彼此造成等同各自力量的傷害。）",
      flavor: "森林的仲裁，從不需要言語。",
      rarity: "U"
    },
    sunshield: {
      id: "sunshield",
      name: "護日聖騎",
      type: "creature",
      sub: ["人類", "騎士"],
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      pow: 2,
      tou: 3,
      protFrom: "B",
      text: "防護黑色。（不能被黑色來源阻擋、指定為目標或造成傷害。）",
      flavor: "陽光所至，陰影止步。",
      rarity: "U"
    },
    mendingtreant: {
      id: "mendingtreant",
      name: "扶生樹人",
      type: "creature",
      sub: ["樹妖", "德魯伊"],
      cost: i2(2, {
        G: 1
      }),
      color: "G",
      pow: 2,
      tou: 2,
      etb: {
        kind: "addCounter",
        amount: 1,
        target: "ownCreature"
      },
      text: "進場時，在目標由你操控的生物上放置一個 +1/+1 指示物。",
      flavor: "它伸出的不是根，是援手。",
      rarity: "C"
    },
    g_thornling: {
      id: "g_thornling",
      name: "荊棘小獸",
      type: "creature",
      sub: ["野獸"],
      cost: i2(0, {
        G: 1
      }),
      color: "G",
      pow: 0,
      tou: 3,
      kw: ["reach"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    g_forest_scout: {
      id: "g_forest_scout",
      name: "森林斥候",
      type: "creature",
      sub: ["精靈", "斥候"],
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      pow: 2,
      tou: 2,
      kw: ["vigilance"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    g_vine_weaver: {
      id: "g_vine_weaver",
      name: "藤蔓織者",
      type: "creature",
      sub: ["妖精", "德魯伊"],
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      pow: 1,
      tou: 3,
      etb: {
        kind: "addCounter",
        amount: 1,
        target: "ownCreature"
      },
      text: "進場時，在目標由你操控的生物上放置一個 +1/+1 指示物。",
      flavor: "",
      rarity: "U"
    },
    g_beetle_swarm: {
      id: "g_beetle_swarm",
      name: "甲蟲群",
      type: "creature",
      sub: ["蟲"],
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      pow: 2,
      tou: 2,
      kw: ["reach"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    g_druid_apprentice: {
      id: "g_druid_apprentice",
      name: "德魯伊學徒",
      type: "creature",
      sub: ["人類", "德魯伊"],
      cost: i2(0, {
        G: 1
      }),
      color: "G",
      pow: 1,
      tou: 1,
      mana: ["G"],
      text: "橫置：加一點綠色魔力。",
      flavor: "",
      rarity: "C"
    },
    g_giant_spider: {
      id: "g_giant_spider",
      name: "巨型蜘蛛",
      type: "creature",
      sub: ["蜘蛛"],
      cost: i2(1, {
        G: 2
      }),
      color: "G",
      pow: 2,
      tou: 4,
      kw: ["reach"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    g_rootwalker: {
      id: "g_rootwalker",
      name: "根行者",
      type: "creature",
      sub: ["樹妖"],
      cost: i2(1, {
        G: 2
      }),
      color: "G",
      pow: 3,
      tou: 3,
      kw: ["vigilance"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    g_pack_leader: {
      id: "g_pack_leader",
      name: "狼群首領",
      type: "creature",
      sub: ["狼"],
      cost: i2(1, {
        G: 2
      }),
      color: "G",
      pow: 3,
      tou: 3,
      anthem: {
        p: 1,
        t: 1,
        scope: "tribe",
        tribe: "狼",
        excludeSelf: !0
      },
      text: "你操控的其他狼得 +1/+1。",
      flavor: "",
      rarity: "R"
    },
    g_thorn_elemental: {
      id: "g_thorn_elemental",
      name: "荊棘元素",
      type: "creature",
      sub: ["元素"],
      cost: i2(1, {
        G: 2
      }),
      color: "G",
      pow: 3,
      tou: 4,
      kw: ["trample"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    g_wild_growth_sprite: {
      id: "g_wild_growth_sprite",
      name: "野生精靈",
      type: "creature",
      sub: ["妖精"],
      cost: i2(1, {
        G: 2
      }),
      color: "G",
      pow: 2,
      tou: 2,
      etb: {
        kind: "addCounter",
        amount: 2,
        target: "ownCreature"
      },
      text: "進場時，在目標由你操控的生物上放置兩個 +1/+1 指示物。",
      flavor: "",
      rarity: "U"
    },
    g_trample_beast: {
      id: "g_trample_beast",
      name: "踐踏猛獸",
      type: "creature",
      sub: ["野獸"],
      cost: i2(2, {
        G: 2
      }),
      color: "G",
      pow: 4,
      tou: 4,
      kw: ["trample"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    g_hunting_wolf_pack: {
      id: "g_hunting_wolf_pack",
      name: "狩獵狼群",
      type: "creature",
      sub: ["狼"],
      cost: i2(2, {
        G: 2
      }),
      color: "G",
      pow: 4,
      tou: 3,
      kw: ["vigilance"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    g_vine_horror: {
      id: "g_vine_horror",
      name: "藤蔓恐魔",
      type: "creature",
      sub: ["元素"],
      cost: i2(2, {
        G: 2
      }),
      color: "G",
      pow: 3,
      tou: 5,
      kw: ["reach"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    g_regal_stag: {
      id: "g_regal_stag",
      name: "森王巨鹿",
      type: "creature",
      sub: ["鹿"],
      cost: i2(3, {
        G: 2
      }),
      color: "G",
      pow: 4,
      tou: 5,
      kw: ["vigilance", "trample"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    g_verdant_hydra: {
      id: "g_verdant_hydra",
      name: "蒼翠九頭蛇",
      type: "creature",
      sub: ["九頭蛇"],
      cost: i2(3, {
        G: 2
      }),
      color: "G",
      pow: 5,
      tou: 5,
      etb: {
        kind: "addCounter",
        amount: 2,
        target: "ownCreature"
      },
      text: "進場時，在目標由你操控的生物上放置兩個 +1/+1 指示物。",
      flavor: "",
      rarity: "R"
    },
    g_world_tree_avatar: {
      id: "g_world_tree_avatar",
      name: "世界樹化身",
      type: "creature",
      sub: ["樹妖"],
      cost: i2(4, {
        G: 2
      }),
      color: "G",
      pow: 8,
      tou: 8,
      kw: ["trample"],
      text: "",
      flavor: "世界樹的根，早已扎進每一場戰爭的土壤。",
      rarity: "M"
    },
    g_moss_troll: {
      id: "g_moss_troll",
      name: "苔蘚巨魔",
      type: "creature",
      sub: ["巨魔"],
      cost: i2(1, {
        G: 2
      }),
      color: "G",
      pow: 3,
      tou: 3,
      kw: ["regenerate"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    g_stag_beetle: {
      id: "g_stag_beetle",
      name: "鍬形蟲",
      type: "creature",
      sub: ["蟲"],
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      pow: 2,
      tou: 2,
      kw: ["firststrike"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    g_canopy_serpent: {
      id: "g_canopy_serpent",
      name: "樹冠巨蛇",
      type: "creature",
      sub: ["蛇"],
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      pow: 3,
      tou: 2,
      kw: ["reach"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    g_natures_wrath: {
      id: "g_natures_wrath",
      name: "自然之怒",
      type: "instant",
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      spell: {
        kind: "fight",
        target: "ownCreature",
        target2: "oppCreature"
      },
      text: "目標由你操控的生物與目標由對手操控的生物互相搏鬥。",
      flavor: "",
      rarity: "C"
    },
    g_giant_growth: {
      id: "g_giant_growth",
      name: "巨力膨脹",
      type: "instant",
      cost: i2(0, {
        G: 1
      }),
      color: "G",
      spell: {
        kind: "pump",
        p: 4,
        t: 4,
        target: "creature"
      },
      text: "目標生物得 +4/+4，直到回合結束。",
      flavor: "",
      rarity: "C"
    },
    g_deep_roots: {
      id: "g_deep_roots",
      name: "深根術",
      type: "sorcery",
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      spell: {
        kind: "ramp"
      },
      text: "從你的牌庫中搜尋一張基本魔法石牌，橫置放進戰場，然後洗牌。",
      flavor: "",
      rarity: "C"
    },
    g_regrowth_ritual: {
      id: "g_regrowth_ritual",
      name: "復生儀式",
      type: "sorcery",
      cost: i2(2, {
        G: 1
      }),
      color: "G",
      spell: {
        kind: "addCounter",
        amount: 3,
        target: "ownCreature"
      },
      text: "在目標由你操控的生物上放置三個 +1/+1 指示物。",
      flavor: "",
      rarity: "U"
    },
    g_wild_charge: {
      id: "g_wild_charge",
      name: "野性衝鋒",
      type: "instant",
      cost: i2(2, {
        G: 1
      }),
      color: "G",
      spell: {
        kind: "pump",
        p: 3,
        t: 3,
        kw: ["trample"],
        target: "creature"
      },
      text: "目標生物得 +3/+3 並具有踐踏，直到回合結束。",
      flavor: "",
      rarity: "U"
    },
    g_savage_fight: {
      id: "g_savage_fight",
      name: "野蠻搏鬥",
      type: "sorcery",
      cost: i2(2, {
        G: 1
      }),
      color: "G",
      spell: {
        kind: "fight",
        target: "ownCreature",
        target2: "oppCreature"
      },
      text: "目標由你操控的生物與目標由對手操控的生物互相搏鬥。",
      flavor: "",
      rarity: "U"
    },
    g_titanic_growth: {
      id: "g_titanic_growth",
      name: "泰坦巨力",
      type: "instant",
      cost: i2(3, {
        G: 1
      }),
      color: "G",
      spell: {
        kind: "pump",
        p: 6,
        t: 6,
        target: "creature"
      },
      text: "目標生物得 +6/+6，直到回合結束。",
      flavor: "",
      rarity: "R"
    },
    g_verdant_bond: {
      id: "g_verdant_bond",
      name: "蒼翠紐帶",
      type: "enchantment",
      sub: ["靈氣"],
      cost: i2(2, {
        G: 1
      }),
      color: "G",
      attach: {
        host: "ownCreature",
        kind: "aura",
        p: 3,
        t: 3
      },
      text: "光環\n進場時，選擇一個由你操控的生物來附著。\n所附著的生物得 +3/+3。",
      flavor: "",
      rarity: "U"
    },
    g_bark_armor: {
      id: "g_bark_armor",
      name: "樹皮護甲",
      type: "artifact",
      sub: ["裝備"],
      cost: i2(2),
      color: "G",
      attach: {
        host: "ownCreature",
        kind: "equipment",
        p: 0,
        t: 4
      },
      text: "裝備\n進場時，選擇一個由你操控的生物來裝備。\n裝備中的生物得 +0/+4。",
      flavor: "",
      rarity: "U"
    },
    g_might_of_the_wild: {
      id: "g_might_of_the_wild",
      name: "荒野偉力",
      type: "instant",
      cost: i2(0, {
        G: 1
      }),
      color: "G",
      spell: {
        kind: "addCounter",
        amount: 1,
        target: "creature"
      },
      text: "在目標生物上放置一個 +1/+1 指示物。",
      flavor: "",
      rarity: "C"
    },
    g_ironbark_ward: {
      id: "g_ironbark_ward",
      name: "鐵樹護盾",
      type: "instant",
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      spell: {
        kind: "pump",
        p: 0,
        t: 5,
        kw: ["hexproof"],
        target: "creature"
      },
      text: "目標生物得 +0/+5 並具有辟邪，直到回合結束。",
      flavor: "",
      rarity: "U"
    },
    g_natures_blessing: {
      id: "g_natures_blessing",
      name: "自然祝福",
      type: "sorcery",
      cost: i2(1, {
        G: 1
      }),
      color: "G",
      spell: {
        kind: "gainLife",
        amount: 4
      },
      text: "你獲得 4 點生命。",
      flavor: "",
      rarity: "C"
    },
    w_acolyte: {
      id: "w_acolyte",
      name: "聖光見習修女",
      type: "creature",
      sub: ["人類", "教士"],
      cost: i2(0, {
        W: 1
      }),
      color: "W",
      pow: 1,
      tou: 1,
      etb: {
        kind: "gainLife",
        amount: 1
      },
      text: "進場時，你獲得 1 點生命。",
      flavor: "第一堂課，是學會為他人祈禱。",
      rarity: "C"
    },
    w_sentry: {
      id: "w_sentry",
      name: "哨壁守衛",
      type: "creature",
      sub: ["人類", "士兵"],
      cost: i2(0, {
        W: 1
      }),
      color: "W",
      pow: 0,
      tou: 3,
      kw: ["defender"],
      text: "",
      flavor: "牆不會後退，這就是它存在的意義。",
      rarity: "C"
    },
    w_hound: {
      id: "w_hound",
      name: "聖殿獵犬",
      type: "creature",
      sub: ["犬"],
      cost: i2(0, {
        W: 1
      }),
      color: "W",
      pow: 1,
      tou: 1,
      kw: ["vigilance"],
      text: "",
      flavor: "牠巡邏的範圍，比任何人記得的都要廣。",
      rarity: "C"
    },
    w_squire: {
      id: "w_squire",
      name: "見習騎士",
      type: "creature",
      sub: ["人類", "騎士"],
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      pow: 2,
      tou: 2,
      kw: ["vigilance"],
      text: "",
      flavor: "「總有一天，我也要有自己的聖殿劍。」",
      rarity: "C"
    },
    w_healer: {
      id: "w_healer",
      name: "野戰治療師",
      type: "creature",
      sub: ["人類", "教士"],
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      pow: 1,
      tou: 2,
      etb: {
        kind: "gainLife",
        amount: 2
      },
      text: "進場時，你獲得 2 點生命。",
      flavor: "戰場的另一端，總有人在等待包紮。",
      rarity: "C"
    },
    w_griffin_scout: {
      id: "w_griffin_scout",
      name: "獅鷲斥候",
      type: "creature",
      sub: ["獅鷲"],
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      pow: 2,
      tou: 1,
      kw: ["flying"],
      text: "",
      flavor: "牠的雙眼，能看清十里外的旗幟顏色。",
      rarity: "C"
    },
    w_shieldwall: {
      id: "w_shieldwall",
      name: "盾牆步兵",
      type: "creature",
      sub: ["人類", "士兵"],
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      pow: 1,
      tou: 4,
      kw: ["defender"],
      text: "",
      flavor: "一整排盾牌，就是一整座移動的城牆。",
      rarity: "C"
    },
    w_cleric: {
      id: "w_cleric",
      name: "白衣教士",
      type: "creature",
      sub: ["人類", "教士"],
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      pow: 2,
      tou: 2,
      etb: {
        kind: "gainLife",
        amount: 1
      },
      text: "進場時，你獲得 1 點生命。",
      flavor: "",
      rarity: "C"
    },
    w_lightbringer: {
      id: "w_lightbringer",
      name: "持光少女",
      type: "creature",
      sub: ["人類", "教士"],
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      pow: 1,
      tou: 3,
      kw: ["vigilance"],
      text: "",
      flavor: "她舉起的不是武器，是不會熄滅的光。",
      rarity: "U"
    },
    w_paladin: {
      id: "w_paladin",
      name: "聖殿聖騎士",
      type: "creature",
      sub: ["人類", "騎士"],
      cost: i2(1, {
        W: 2
      }),
      color: "W",
      pow: 3,
      tou: 3,
      kw: ["vigilance", "lifelink"],
      text: "",
      flavor: "他每一次揮劍，都是一次禱告。",
      rarity: "U"
    },
    w_seraph_scout: {
      id: "w_seraph_scout",
      name: "熾天使斥候",
      type: "creature",
      sub: ["天使"],
      cost: i2(1, {
        W: 2
      }),
      color: "W",
      pow: 2,
      tou: 3,
      kw: ["flying"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    w_ward_knight: {
      id: "w_ward_knight",
      name: "護誓騎士",
      type: "creature",
      sub: ["人類", "騎士"],
      cost: i2(1, {
        W: 2
      }),
      color: "W",
      pow: 2,
      tou: 2,
      protFrom: "B",
      text: "防護黑色。（不能被黑色來源阻擋、指定為目標或造成傷害。）",
      flavor: "他發誓過，絕不向陰影低頭。",
      rarity: "U"
    },
    w_temple_guard: {
      id: "w_temple_guard",
      name: "聖殿衛戍長",
      type: "creature",
      sub: ["人類", "士兵"],
      cost: i2(1, {
        W: 2
      }),
      color: "W",
      pow: 3,
      tou: 2,
      kw: ["vigilance"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    w_dove_flock: {
      id: "w_dove_flock",
      name: "白鴿群",
      type: "creature",
      sub: ["鳥"],
      cost: i2(1, {
        W: 2
      }),
      color: "W",
      pow: 2,
      tou: 2,
      kw: ["flying"],
      etb: {
        kind: "createToken",
        tokenId: "tok_soldier",
        amount: 1
      },
      text: "進場時，製造一個 1/1 白色人類衛兵衍生物。",
      flavor: "",
      rarity: "U"
    },
    w_battle_priest: {
      id: "w_battle_priest",
      name: "戰場神官",
      type: "creature",
      sub: ["人類", "教士"],
      cost: i2(1, {
        W: 2
      }),
      color: "W",
      pow: 2,
      tou: 3,
      etb: {
        kind: "addCounter",
        amount: 1,
        target: "ownCreature"
      },
      text: "進場時，在目標由你操控的生物上放置一個 +1/+1 指示物。",
      flavor: "",
      rarity: "U"
    },
    w_angel_guard: {
      id: "w_angel_guard",
      name: "護教天使",
      type: "creature",
      sub: ["天使"],
      cost: i2(2, {
        W: 2
      }),
      color: "W",
      pow: 3,
      tou: 4,
      kw: ["flying", "vigilance"],
      text: "",
      flavor: "她的職責不是進攻，是確保有明天可以進攻。",
      rarity: "R"
    },
    w_crusader: {
      id: "w_crusader",
      name: "十字聖戰士",
      type: "creature",
      sub: ["人類", "騎士"],
      cost: i2(2, {
        W: 2
      }),
      color: "W",
      pow: 4,
      tou: 3,
      kw: ["firststrike"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    w_purifier: {
      id: "w_purifier",
      name: "淨化使者",
      type: "creature",
      sub: ["人類", "教士"],
      cost: i2(2, {
        W: 2
      }),
      color: "W",
      pow: 3,
      tou: 3,
      etb: {
        kind: "exile",
        target: "creature"
      },
      text: "進場時，放逐目標生物。",
      flavor: "不留痕跡，是最溫柔的懲罰。",
      rarity: "R"
    },
    w_arbiter: {
      id: "w_arbiter",
      name: "律法仲裁者",
      type: "creature",
      sub: ["人類", "法師"],
      cost: i2(2, {
        W: 2
      }),
      color: "W",
      pow: 3,
      tou: 3,
      kw: ["hexproof"],
      text: "",
      flavor: "她的判決，連時間都無法更改。",
      rarity: "U"
    },
    w_falconer: {
      id: "w_falconer",
      name: "馴獅鷲師",
      type: "creature",
      sub: ["人類", "遊俠"],
      cost: i2(2, {
        W: 2
      }),
      color: "W",
      pow: 3,
      tou: 4,
      kw: ["flying", "reach"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    w_high_cleric: {
      id: "w_high_cleric",
      name: "主座治療聖者",
      type: "creature",
      sub: ["人類", "教士"],
      cost: i2(3, {
        W: 2
      }),
      color: "W",
      pow: 4,
      tou: 5,
      etb: {
        kind: "gainLife",
        amount: 4
      },
      text: "進場時，你獲得 4 點生命。",
      flavor: "",
      rarity: "U"
    },
    w_angel_host: {
      id: "w_angel_host",
      name: "天使儀仗隊",
      type: "creature",
      sub: ["天使"],
      cost: i2(3, {
        W: 2
      }),
      color: "W",
      pow: 4,
      tou: 4,
      kw: ["flying", "vigilance", "lifelink"],
      text: "",
      flavor: "整片天空都為她的隊列讓路。",
      rarity: "R"
    },
    w_bulwark_titan: {
      id: "w_bulwark_titan",
      name: "壁壘巨像",
      type: "creature",
      sub: ["塑像"],
      cost: i2(3, {
        W: 2
      }),
      color: "W",
      pow: 4,
      tou: 6,
      kw: ["vigilance"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    w_dawn_seer: {
      id: "w_dawn_seer",
      name: "破曉占者",
      type: "creature",
      sub: ["人類", "預言師"],
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      pow: 1,
      tou: 2,
      kw: ["flying"],
      etb: {
        kind: "scry",
        amount: 1
      },
      text: "飛行\n進場時，占卜 1。",
      flavor: "",
      rarity: "C"
    },
    w_archangel: {
      id: "w_archangel",
      name: "主天使",
      type: "creature",
      sub: ["天使"],
      cost: i2(4, {
        W: 2
      }),
      color: "W",
      pow: 6,
      tou: 6,
      kw: ["flying", "vigilance", "lifelink"],
      text: "",
      flavor: "她降臨之日，戰爭便已結束。",
      rarity: "M"
    },
    w_smite: {
      id: "w_smite",
      name: "天譴斬",
      type: "instant",
      cost: i2(2, {
        W: 1
      }),
      color: "W",
      spell: {
        kind: "destroy",
        target: "creature"
      },
      text: "消滅目標生物。",
      flavor: "審判無需第二次揮劍。",
      rarity: "U"
    },
    w_rebuke: {
      id: "w_rebuke",
      name: "聖光斥退",
      type: "instant",
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      spell: {
        kind: "pump",
        p: 0,
        t: 4,
        target: "creature"
      },
      text: "目標生物得 +0/+4，直到回合結束。",
      flavor: "",
      rarity: "C"
    },
    w_bless: {
      id: "w_bless",
      name: "祝禱",
      type: "instant",
      cost: i2(0, {
        W: 1
      }),
      color: "W",
      spell: {
        kind: "pump",
        p: 2,
        t: 2,
        target: "creature"
      },
      text: "目標生物得 +2/+2，直到回合結束。",
      flavor: "",
      rarity: "C"
    },
    w_guard_call: {
      id: "w_guard_call",
      name: "緊急防召",
      type: "instant",
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      spell: {
        kind: "createToken",
        tokenId: "tok_soldier",
        amount: 1
      },
      text: "製造一個 1/1 白色人類衛兵衍生物。",
      flavor: "",
      rarity: "C"
    },
    w_absolution: {
      id: "w_absolution",
      name: "赦罪之光",
      type: "instant",
      cost: i2(3, {
        W: 1
      }),
      color: "W",
      spell: {
        kind: "exile",
        target: "creature"
      },
      text: "放逐目標生物。",
      flavor: "連罪孽本身，都被一併帶走。",
      rarity: "R"
    },
    w_mass_muster: {
      id: "w_mass_muster",
      name: "全境徵召",
      type: "sorcery",
      cost: i2(3, {
        W: 1
      }),
      color: "W",
      spell: {
        kind: "createToken",
        tokenId: "tok_soldier",
        amount: 3
      },
      text: "製造三個 1/1 白色人類衛兵衍生物。",
      flavor: "",
      rarity: "U"
    },
    w_holy_verdict: {
      id: "w_holy_verdict",
      name: "聖裁宣告",
      type: "sorcery",
      cost: i2(2, {
        W: 2
      }),
      color: "W",
      spell: {
        kind: "destroy",
        target: "creature"
      },
      text: "消滅目標生物。",
      flavor: "",
      rarity: "R"
    },
    w_healing_light: {
      id: "w_healing_light",
      name: "治癒之光",
      type: "sorcery",
      cost: i2(2, {
        W: 1
      }),
      color: "W",
      spell: {
        kind: "gainLife",
        amount: 6
      },
      text: "你獲得 6 點生命。",
      flavor: "",
      rarity: "C"
    },
    w_conscript: {
      id: "w_conscript",
      name: "民兵徵集令",
      type: "sorcery",
      cost: i2(2, {
        W: 1
      }),
      color: "W",
      spell: {
        kind: "createToken",
        tokenId: "tok_soldier",
        amount: 2
      },
      text: "製造兩個 1/1 白色人類衛兵衍生物。",
      flavor: "",
      rarity: "C"
    },
    w_holy_banner: {
      id: "w_holy_banner",
      name: "聖印旗幟",
      type: "artifact",
      cost: i2(2, {
        W: 1
      }),
      color: "W",
      anthem: {
        p: 1,
        t: 0,
        scope: "own"
      },
      text: "你操控的生物得 +1/+0。",
      flavor: "",
      rarity: "U"
    },
    w_aegis_shield: {
      id: "w_aegis_shield",
      name: "聖盾裝置",
      type: "artifact",
      sub: ["裝備"],
      cost: i2(2),
      color: "W",
      attach: {
        host: "ownCreature",
        kind: "equipment",
        p: 0,
        t: 3
      },
      text: "裝備\n進場時，選擇一個由你操控的生物來裝備。\n裝備中的生物得 +0/+3。",
      flavor: "",
      rarity: "U"
    },
    w_sanctuary: {
      id: "w_sanctuary",
      name: "庇護聖域",
      type: "enchantment",
      cost: i2(1, {
        W: 2
      }),
      color: "W",
      anthem: {
        p: 0,
        t: 2,
        scope: "own"
      },
      text: "你操控的生物得 +0/+2。",
      flavor: "",
      rarity: "U"
    },
    w_binding_light: {
      id: "w_binding_light",
      name: "縛光術",
      type: "enchantment",
      sub: ["靈氣"],
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      attach: {
        host: "creature",
        kind: "aura",
        kw: ["defender"]
      },
      text: "光環\n進場時，選擇一個生物來附著。\n所附著的生物視同具有守軍（不能進行攻擊）。",
      flavor: "光雖溫柔，卻能困住最狂暴的野獸。",
      rarity: "U"
    },
    w_martyrs_cause: {
      id: "w_martyrs_cause",
      name: "殉道者之志",
      type: "enchantment",
      cost: i2(2, {
        W: 2
      }),
      color: "W",
      anthem: {
        p: 1,
        t: 1,
        scope: "own",
        grantKw: ["lifelink"]
      },
      text: "你操控的生物得 +1/+1 並具有吸血。",
      flavor: "",
      rarity: "R"
    },
    w_vow_of_duty: {
      id: "w_vow_of_duty",
      name: "忠誠誓約",
      type: "enchantment",
      sub: ["靈氣"],
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      attach: {
        host: "ownCreature",
        kind: "aura",
        p: 2,
        t: 2,
        kw: ["vigilance"]
      },
      text: "光環\n進場時，選擇一個由你操控的生物來附著。\n所附著的生物得 +2/+2 並具有警戒。",
      flavor: "",
      rarity: "U"
    },
    w_oath_keeper: {
      id: "w_oath_keeper",
      name: "誓約守護者",
      type: "creature",
      sub: ["人類", "騎士"],
      cost: i2(2, {
        W: 1
      }),
      color: "W",
      pow: 3,
      tou: 3,
      kw: ["vigilance"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    w_radiant_ward: {
      id: "w_radiant_ward",
      name: "輝光庇佑",
      type: "instant",
      cost: i2(1, {
        W: 1
      }),
      color: "W",
      spell: {
        kind: "pump",
        p: 1,
        t: 3,
        kw: ["hexproof"],
        target: "creature"
      },
      text: "目標生物得 +1/+3 並具有辟邪，直到回合結束。",
      flavor: "",
      rarity: "U"
    },
    w_final_blessing: {
      id: "w_final_blessing",
      name: "終焉之禱",
      type: "sorcery",
      cost: i2(3, {
        W: 2
      }),
      color: "W",
      spell: {
        kind: "gainLife",
        amount: 8
      },
      text: "你獲得 8 點生命。",
      flavor: "在絕望之前，總還有一次祈禱的機會。",
      rarity: "U"
    },
    imp: {
      id: "imp",
      name: "燼火小鬼",
      type: "creature",
      sub: ["哥布林"],
      cost: i2(0, {
        R: 1
      }),
      color: "R",
      pow: 1,
      tou: 1,
      kw: ["haste"],
      text: "敏捷（進場即可攻擊）",
      flavor: "點火不用理由，逃跑才要。",
      rarity: "C"
    },
    raider: {
      id: "raider",
      name: "雙刃哥布林",
      type: "creature",
      sub: ["哥布林", "戰士"],
      cost: i2(1, {
        R: 1
      }),
      color: "R",
      pow: 2,
      tou: 1,
      kw: ["menace"],
      text: "威懾（至少需兩個生物才能阻擋）",
      flavor: "兩把刀的意思是：一把給你，一把也給你。",
      rarity: "C"
    },
    chief: {
      id: "chief",
      name: "哥布林戰酋長",
      type: "creature",
      sub: ["哥布林"],
      cost: i2(1, {
        R: 2
      }),
      color: "R",
      pow: 2,
      tou: 2,
      anthem: {
        p: 1,
        t: 1,
        scope: "tribe",
        tribe: "哥布林",
        excludeSelf: !0,
        grantKw: ["haste"]
      },
      text: "你操控的其他哥布林得 +1/+1 並具有敏捷。",
      flavor: "「衝啊——方向等下再說！」",
      rarity: "R"
    },
    bolt: {
      id: "bolt",
      name: "裂空閃電",
      type: "instant",
      cost: i2(0, {
        R: 1
      }),
      color: "R",
      spell: {
        kind: "damage",
        amount: 3,
        target: "any"
      },
      text: "裂空閃電對任意一個目標造成 3 點傷害。",
      flavor: "天空裂開的那一瞬，勝負已定。",
      rarity: "U"
    },
    lava: {
      id: "lava",
      name: "熔岩崩落",
      type: "sorcery",
      cost: i2(2, {
        R: 1
      }),
      color: "R",
      spell: {
        kind: "damage",
        amount: 4,
        target: "any"
      },
      text: "熔岩崩落對任意一個目標造成 4 點傷害。",
      flavor: "山不會憤怒。山只會傾瀉。",
      rarity: "U"
    },
    fury: {
      id: "fury",
      name: "狂戰之魂",
      type: "instant",
      cost: i2(0, {
        R: 1
      }),
      color: "R",
      spell: {
        kind: "pump",
        p: 2,
        t: 0,
        kw: ["firststrike"],
        target: "creature"
      },
      text: "目標生物得 +2/+0 並獲得先攻，直到回合結束。",
      flavor: "先出手的，才有資格談公平。",
      rarity: "C"
    },
    drakeling: {
      id: "drakeling",
      name: "火峰幼龍",
      type: "creature",
      sub: ["龍"],
      cost: i2(2, {
        R: 2
      }),
      color: "R",
      pow: 3,
      tou: 3,
      kw: ["flying"],
      text: "飛行",
      flavor: "牠還不會噴火，但已經會挑釁。",
      rarity: "U"
    },
    dancer: {
      id: "dancer",
      name: "炎髮舞者",
      type: "creature",
      sub: ["人類", "狂戰士"],
      cost: i2(2, {
        R: 1
      }),
      color: "R",
      pow: 3,
      tou: 2,
      kw: ["firststrike"],
      text: "先攻（先於一般傷害造成戰鬥傷害）",
      flavor: "她的舞步之間，只留下灰燼。",
      rarity: "C"
    },
    dragon: {
      id: "dragon",
      name: "焚天巨龍",
      type: "creature",
      sub: ["龍"],
      cost: i2(4, {
        R: 2
      }),
      color: "R",
      pow: 5,
      tou: 5,
      kw: ["flying", "haste"],
      etb: {
        kind: "damage",
        amount: 2,
        target: "any"
      },
      text: "飛行、敏捷\n當焚天巨龍進場時，它對任意一個目標造成 2 點傷害。",
      flavor: "牠的名字，是用整片天空的火寫成的。",
      rarity: "M"
    },
    berserker_unbound: {
      id: "berserker_unbound",
      name: "脫韁狂戰士",
      type: "creature",
      sub: ["人類", "狂戰士"],
      cost: i2(2, {
        R: 1
      }),
      color: "R",
      pow: 3,
      tou: 2,
      kw: ["unblockable"],
      text: "不可阻擋。",
      flavor: "沒有人擋得住不打算停下的憤怒。",
      rarity: "U"
    },
    warhammer: {
      id: "warhammer",
      name: "戰爭巨錘",
      type: "artifact",
      sub: ["裝備"],
      cost: i2(2),
      color: "R",
      attach: {
        host: "ownCreature",
        kind: "equipment",
        p: 3,
        t: 0
      },
      text: "裝備\n進場時，選擇一個由你操控的生物來裝備。\n裝備中的生物得 +3/+0。",
      flavor: "揮動一次，城牆記住教訓。",
      rarity: "U"
    },
    frenzyrite: {
      id: "frenzyrite",
      name: "狂怒儀式",
      type: "instant",
      cost: i2(0, {
        R: 1
      }),
      color: "R",
      spell: {
        kind: "addCounter",
        amount: 1,
        target: "creature"
      },
      text: "在目標生物上放置一個 +1/+1 指示物。",
      flavor: "血在燒，力量便留下了。",
      rarity: "C"
    },
    ambush_wyrm: {
      id: "ambush_wyrm",
      name: "伏擊焰蜥",
      type: "creature",
      sub: ["蜥蜴"],
      cost: i2(2, {
        R: 1
      }),
      color: "R",
      pow: 3,
      tou: 3,
      kw: ["flash", "haste"],
      text: "瞬現、敏捷。",
      flavor: "你以為是空地，其實是牠的埋伏。",
      rarity: "U"
    },
    goblin_horde: {
      id: "goblin_horde",
      name: "哥布林狂潮",
      type: "sorcery",
      cost: i2(2, {
        R: 1
      }),
      color: "R",
      spell: {
        kind: "createToken",
        tokenId: "tok_goblin",
        amount: 2,
        target: "none"
      },
      text: "製造兩個 1/1 敏捷紅色哥布林衍生物。",
      flavor: "一個哥布林是麻煩，一群哥布林是天災。",
      rarity: "U"
    },
    reckless_charge: {
      id: "reckless_charge",
      name: "捨身衝鋒",
      type: "instant",
      cost: i2(0, {
        R: 1
      }),
      color: "R",
      spell: {
        kind: "pump",
        p: 3,
        t: 0,
        kw: ["unblockable"],
        target: "creature"
      },
      text: "目標生物得 +3/+0，且本回合不能被阻擋。",
      flavor: "不留退路，也不留給對手選擇。",
      rarity: "U"
    },
    r_firebrand: {
      id: "r_firebrand",
      name: "火印新兵",
      type: "creature",
      sub: ["人類", "戰士"],
      cost: i2(0, {
        R: 1
      }),
      color: "R",
      pow: 1,
      tou: 1,
      kw: ["haste"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    r_marauder: {
      id: "r_marauder",
      name: "掠奪戰士",
      type: "creature",
      sub: ["人類", "戰士"],
      cost: i2(1, {
        R: 1
      }),
      color: "R",
      pow: 2,
      tou: 2,
      kw: ["haste"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    r_flame_juggler: {
      id: "r_flame_juggler",
      name: "火焰雜耍人",
      type: "creature",
      sub: ["人類", "雜耍藝人"],
      cost: i2(1, {
        R: 1
      }),
      color: "R",
      pow: 1,
      tou: 3,
      etb: {
        kind: "damage",
        amount: 1,
        target: "any"
      },
      text: "進場時，對任意一個目標造成 1 點傷害。",
      flavor: "",
      rarity: "U"
    },
    r_war_drummer: {
      id: "r_war_drummer",
      name: "戰鼓手",
      type: "creature",
      sub: ["人類", "戰士"],
      cost: i2(1, {
        R: 1
      }),
      color: "R",
      pow: 2,
      tou: 2,
      anthem: {
        p: 1,
        t: 0,
        scope: "own",
        excludeSelf: !0
      },
      text: "你操控的其他生物得 +1/+0。",
      flavor: "鼓聲一響，膽怯的人也會往前衝。",
      rarity: "R"
    },
    r_young_wyrm: {
      id: "r_young_wyrm",
      name: "幼龍仔",
      type: "creature",
      sub: ["龍"],
      cost: i2(1, {
        R: 1
      }),
      color: "R",
      pow: 2,
      tou: 2,
      kw: ["flying"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    r_torch_bearer: {
      id: "r_torch_bearer",
      name: "持炬者",
      type: "creature",
      sub: ["人類", "戰士"],
      cost: i2(1, {
        R: 1
      }),
      color: "R",
      pow: 1,
      tou: 1,
      kw: ["haste"],
      etb: {
        kind: "damage",
        amount: 1,
        target: "any"
      },
      text: "敏捷\n進場時，對任意一個目標造成 1 點傷害。",
      flavor: "",
      rarity: "U"
    },
    r_berserk_champion: {
      id: "r_berserk_champion",
      name: "狂戰冠軍",
      type: "creature",
      sub: ["人類", "狂戰士"],
      cost: i2(1, {
        R: 2
      }),
      color: "R",
      pow: 3,
      tou: 3,
      kw: ["firststrike"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    r_goblin_sapper: {
      id: "r_goblin_sapper",
      name: "哥布林爆破手",
      type: "creature",
      sub: ["哥布林"],
      cost: i2(1, {
        R: 2
      }),
      color: "R",
      pow: 2,
      tou: 2,
      etb: {
        kind: "damage",
        amount: 2,
        target: "creature"
      },
      text: "進場時，對目標生物造成 2 點傷害。",
      flavor: "",
      rarity: "U"
    },
    r_flame_drake: {
      id: "r_flame_drake",
      name: "烈焰幼龍",
      type: "creature",
      sub: ["龍"],
      cost: i2(1, {
        R: 2
      }),
      color: "R",
      pow: 3,
      tou: 2,
      kw: ["flying", "haste"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    r_war_chanter: {
      id: "r_war_chanter",
      name: "戰爭頌者",
      type: "creature",
      sub: ["人類", "戰士"],
      cost: i2(1, {
        R: 2
      }),
      color: "R",
      pow: 2,
      tou: 3,
      anthem: {
        p: 1,
        t: 0,
        scope: "own"
      },
      text: "你操控的生物得 +1/+0。",
      flavor: "",
      rarity: "R"
    },
    r_cinder_wolf: {
      id: "r_cinder_wolf",
      name: "灰燼狼",
      type: "creature",
      sub: ["狼"],
      cost: i2(1, {
        R: 2
      }),
      color: "R",
      pow: 3,
      tou: 3,
      kw: ["haste"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    r_flame_giant: {
      id: "r_flame_giant",
      name: "烈焰巨人",
      type: "creature",
      sub: ["巨人"],
      cost: i2(2, {
        R: 2
      }),
      color: "R",
      pow: 4,
      tou: 4,
      kw: ["haste"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    r_dragon_whelp: {
      id: "r_dragon_whelp",
      name: "龍族幼獸",
      type: "creature",
      sub: ["龍"],
      cost: i2(2, {
        R: 2
      }),
      color: "R",
      pow: 3,
      tou: 4,
      kw: ["flying", "firststrike"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    r_pit_fighter: {
      id: "r_pit_fighter",
      name: "鬥獸場戰士",
      type: "creature",
      sub: ["人類", "戰士"],
      cost: i2(2, {
        R: 2
      }),
      color: "R",
      pow: 4,
      tou: 3,
      kw: ["firststrike"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    r_volcano_shaman: {
      id: "r_volcano_shaman",
      name: "火山薩滿",
      type: "creature",
      sub: ["人類", "薩滿"],
      cost: i2(2, {
        R: 2
      }),
      color: "R",
      pow: 3,
      tou: 3,
      etb: {
        kind: "damage",
        amount: 3,
        target: "any"
      },
      text: "進場時，對任意一個目標造成 3 點傷害。",
      flavor: "",
      rarity: "R"
    },
    r_inferno_wyrm: {
      id: "r_inferno_wyrm",
      name: "業火巨蜥",
      type: "creature",
      sub: ["蜥蜴"],
      cost: i2(3, {
        R: 2
      }),
      color: "R",
      pow: 5,
      tou: 5,
      kw: ["haste"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    r_dragon_rider: {
      id: "r_dragon_rider",
      name: "馭龍騎士",
      type: "creature",
      sub: ["人類", "騎士"],
      cost: i2(3, {
        R: 2
      }),
      color: "R",
      pow: 4,
      tou: 4,
      kw: ["flying"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    r_ashen_titan: {
      id: "r_ashen_titan",
      name: "灰燼泰坦",
      type: "creature",
      sub: ["巨人"],
      cost: i2(3, {
        R: 2
      }),
      color: "R",
      pow: 6,
      tou: 4,
      kw: ["trample"],
      text: "",
      flavor: "",
      rarity: "R"
    },
    r_elder_dragon: {
      id: "r_elder_dragon",
      name: "尊者巨龍",
      type: "creature",
      sub: ["龍"],
      cost: i2(4, {
        R: 2
      }),
      color: "R",
      pow: 7,
      tou: 6,
      kw: ["flying", "haste"],
      text: "",
      flavor: "牠盤旋之處，連戰旗都會燃燒。",
      rarity: "M"
    },
    r_goblin_scrapper: {
      id: "r_goblin_scrapper",
      name: "哥布林小混混",
      type: "creature",
      sub: ["哥布林"],
      cost: i2(0, {
        R: 1
      }),
      color: "R",
      pow: 1,
      tou: 1,
      kw: ["haste"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    r_axe_fanatic: {
      id: "r_axe_fanatic",
      name: "戰斧狂信徒",
      type: "creature",
      sub: ["人類", "狂戰士"],
      cost: i2(1, {
        R: 2
      }),
      color: "R",
      pow: 3,
      tou: 1,
      kw: ["haste"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    r_charhound: {
      id: "r_charhound",
      name: "焦炭獵犬",
      type: "creature",
      sub: ["犬"],
      cost: i2(1, {
        R: 1
      }),
      color: "R",
      pow: 2,
      tou: 2,
      kw: ["firststrike"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    r_flame_burst: {
      id: "r_flame_burst",
      name: "烈焰迸發",
      type: "instant",
      cost: i2(0, {
        R: 1
      }),
      color: "R",
      spell: {
        kind: "damage",
        amount: 2,
        target: "any"
      },
      text: "烈焰迸發對任意一個目標造成 2 點傷害。",
      flavor: "",
      rarity: "C"
    },
    r_wildfire: {
      id: "r_wildfire",
      name: "野火蔓延",
      type: "sorcery",
      cost: i2(3, {
        R: 1
      }),
      color: "R",
      spell: {
        kind: "damage",
        amount: 5,
        target: "any"
      },
      text: "野火蔓延對任意一個目標造成 5 點傷害。",
      flavor: "",
      rarity: "R"
    },
    r_rally_cry: {
      id: "r_rally_cry",
      name: "集結怒吼",
      type: "instant",
      cost: i2(1, {
        R: 1
      }),
      color: "R",
      spell: {
        kind: "pump",
        p: 2,
        t: 0,
        kw: ["haste"],
        target: "creature"
      },
      text: "目標生物得 +2/+0 並具有敏捷，直到回合結束。",
      flavor: "",
      rarity: "C"
    },
    r_incinerate: {
      id: "r_incinerate",
      name: "焚燒",
      type: "instant",
      cost: i2(2, {
        R: 1
      }),
      color: "R",
      spell: {
        kind: "damage",
        amount: 4,
        target: "creature"
      },
      text: "焚燒對目標生物造成 4 點傷害。",
      flavor: "",
      rarity: "U"
    },
    r_goblin_rally: {
      id: "r_goblin_rally",
      name: "哥布林集結",
      type: "sorcery",
      cost: i2(3, {
        R: 1
      }),
      color: "R",
      spell: {
        kind: "createToken",
        tokenId: "tok_goblin",
        amount: 3
      },
      text: "製造三個 1/1 敏捷紅色哥布林衍生物。",
      flavor: "",
      rarity: "U"
    },
    r_flame_axe: {
      id: "r_flame_axe",
      name: "烈焰戰斧",
      type: "artifact",
      sub: ["裝備"],
      cost: i2(2),
      color: "R",
      attach: {
        host: "ownCreature",
        kind: "equipment",
        p: 2,
        t: 0,
        kw: ["firststrike"]
      },
      text: "裝備\n進場時，選擇一個由你操控的生物來裝備。\n裝備中的生物得 +2/+0 並具有先攻。",
      flavor: "",
      rarity: "U"
    },
    r_berserkers_charm: {
      id: "r_berserkers_charm",
      name: "狂戰士護符",
      type: "enchantment",
      cost: i2(2, {
        R: 1
      }),
      color: "R",
      anthem: {
        p: 1,
        t: 0,
        scope: "own"
      },
      text: "你操控的生物得 +1/+0。",
      flavor: "",
      rarity: "U"
    },
    ray: {
      id: "ray",
      name: "幻影魟",
      type: "creature",
      sub: ["元素"],
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      pow: 2,
      tou: 1,
      kw: ["flying"],
      text: "飛行",
      flavor: "牠游過的不是水，是夢的邊界。",
      rarity: "C"
    },
    counter: {
      id: "counter",
      name: "魔力反制",
      type: "instant",
      cost: i2(0, {
        U: 2
      }),
      color: "U",
      spell: {
        kind: "counter"
      },
      text: "反擊目標咒語。（將該咒語置入其擁有者的墳墓場。）",
      flavor: "「我拒絕。」——這句話便是完整的咒文。",
      rarity: "R"
    },
    insight: {
      id: "insight",
      name: "靈感湧現",
      type: "instant",
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      spell: {
        kind: "draw",
        amount: 2
      },
      text: "抽兩張牌。",
      flavor: "知識如潮，退去時帶走無知。",
      rarity: "C"
    },
    ghoul: {
      id: "ghoul",
      name: "墓穴屍鬼",
      type: "creature",
      sub: ["殭屍"],
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      pow: 2,
      tou: 1,
      kw: ["deathtouch"],
      text: "死觸（造成任何傷害即可消滅該生物）",
      flavor: "它的指甲縫裡，藏著上一個名字。",
      rarity: "C"
    },
    vamp: {
      id: "vamp",
      name: "血夜伯爵",
      type: "creature",
      sub: ["吸血鬼", "貴族"],
      cost: i2(1, {
        B: 2
      }),
      color: "B",
      pow: 2,
      tou: 2,
      kw: ["flying", "lifelink"],
      text: "飛行、吸血",
      flavor: "他舉杯敬月色，杯中並非葡萄酒。",
      rarity: "U"
    },
    whisper: {
      id: "whisper",
      name: "致命低語",
      type: "instant",
      cost: i2(1, {
        B: 2
      }),
      color: "B",
      spell: {
        kind: "destroy",
        target: "creature"
      },
      text: "消滅目標生物。",
      flavor: "有些名字，唸出來就是死刑。",
      rarity: "U"
    },
    mindrend: {
      id: "mindrend",
      name: "心智撕裂",
      type: "sorcery",
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      spell: {
        kind: "discardRandom",
        amount: 2
      },
      text: "目標對手隨機棄兩張牌。",
      flavor: "最鋒利的刃，割的是記憶。",
      rarity: "C"
    },
    recall: {
      id: "recall",
      name: "深淵召還",
      type: "sorcery",
      cost: i2(3, {
        B: 1
      }),
      color: "B",
      spell: {
        kind: "reanimate",
        target: "ownGyCreature"
      },
      text: "將你墳墓場中的目標生物牌移回戰場。",
      flavor: "深淵不收留亡者，只出借他們。",
      rarity: "R"
    },
    devourer: {
      id: "devourer",
      name: "幽淵吞噬者",
      type: "creature",
      sub: ["惡魔"],
      cost: i2(4, {
        B: 2
      }),
      color: "B",
      pow: 6,
      tou: 6,
      kw: ["menace"],
      etb: {
        kind: "loseLifeSelf",
        amount: 2
      },
      text: "威懾\n當幽淵吞噬者進場時，你失去 2 點生命。",
      flavor: "召喚它的代價寫得很清楚。只是沒人讀完。",
      rarity: "M"
    },
    tidal_seer: {
      id: "tidal_seer",
      name: "潮汐占者",
      type: "creature",
      sub: ["人魚", "預言師"],
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      pow: 1,
      tou: 2,
      kw: ["flying"],
      etb: {
        kind: "scry",
        amount: 1,
        target: "none"
      },
      text: "飛行\n進場時，占卜 1。（查看你牌庫頂的牌，可選擇將它放到牌庫底。）",
      flavor: "她只看一眼未來，便已知道該不該提起。",
      rarity: "C"
    },
    mind_sieve: {
      id: "mind_sieve",
      name: "心智篩濾",
      type: "sorcery",
      cost: i2(2, {
        U: 1
      }),
      color: "U",
      spell: {
        kind: "mill",
        amount: 6,
        target: "player"
      },
      text: "目標玩家將其牌庫頂六張牌置入其墳墓場。",
      flavor: "記憶被篩去，只留下最深的沉澱。",
      rarity: "U"
    },
    edict_of_shadows: {
      id: "edict_of_shadows",
      name: "暗影通牒",
      type: "instant",
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      spell: {
        kind: "sacrifice",
        target: "player"
      },
      text: "目標玩家犧牲一個生物。",
      flavor: "它不挑選對象。它只是要求一個名字。",
      rarity: "U"
    },
    phantom_assassin: {
      id: "phantom_assassin",
      name: "魅影刺客",
      type: "creature",
      sub: ["人類", "刺客"],
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      pow: 2,
      tou: 2,
      kw: ["unblockable"],
      text: "不可阻擋。",
      flavor: "它的獵物從未看清它的臉，因為那就是最後一面。",
      rarity: "U"
    },
    grave_warden: {
      id: "grave_warden",
      name: "墓園看守者",
      type: "creature",
      sub: ["殭屍", "戰士"],
      cost: i2(2, {
        B: 1
      }),
      color: "B",
      pow: 3,
      tou: 3,
      kw: ["regenerate"],
      text: "再生（每回合一次，本應消滅時改為橫置並移出戰鬥）",
      flavor: "土已經埋過它一次，它不打算再躺下。",
      rarity: "U"
    },
    shadow_ward: {
      id: "shadow_ward",
      name: "暗影庇佑者",
      type: "creature",
      sub: ["幽魂"],
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      pow: 2,
      tou: 2,
      protFrom: "W",
      text: "防護白色。（不能被白色來源阻擋、指定為目標或造成傷害。）",
      flavor: "聖光照不進它藏身的縫隙。",
      rarity: "U"
    },
    farsight_ritual: {
      id: "farsight_ritual",
      name: "預知儀式",
      type: "sorcery",
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      spell: {
        kind: "scry",
        amount: 2,
        target: "none"
      },
      text: "占卜 2。",
      flavor: "未來分成兩半，她只留下順眼的那半。",
      rarity: "C"
    },
    bone_horde: {
      id: "bone_horde",
      name: "白骨大軍",
      type: "sorcery",
      cost: i2(3, {
        B: 1
      }),
      color: "B",
      spell: {
        kind: "createToken",
        tokenId: "tok_zombie",
        amount: 2,
        target: "none"
      },
      text: "製造兩個 2/2 黑色殭屍衍生物。",
      flavor: "墳場從不缺乏兵源，只缺乏一聲號令。",
      rarity: "U"
    },
    u_wisp: {
      id: "u_wisp",
      name: "拂風幻精",
      type: "creature",
      sub: ["幻精"],
      cost: i2(0, {
        U: 1
      }),
      color: "U",
      pow: 1,
      tou: 1,
      kw: ["flying"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    u_scholar: {
      id: "u_scholar",
      name: "藏書塔學者",
      type: "creature",
      sub: ["人類", "法師"],
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      pow: 1,
      tou: 3,
      etb: {
        kind: "scry",
        amount: 1
      },
      text: "進場時，占卜 1。",
      flavor: "",
      rarity: "C"
    },
    u_wave_skimmer: {
      id: "u_wave_skimmer",
      name: "逐浪掠影者",
      type: "creature",
      sub: ["幻精"],
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      pow: 2,
      tou: 1,
      kw: ["flying"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    u_illusionist: {
      id: "u_illusionist",
      name: "幻術師學徒",
      type: "creature",
      sub: ["人類", "法師"],
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      pow: 1,
      tou: 1,
      kw: ["flash"],
      text: "",
      flavor: "她的第一個幻象，是自己不存在的樣子。",
      rarity: "C"
    },
    u_seer: {
      id: "u_seer",
      name: "深潮預言家",
      type: "creature",
      sub: ["人魚", "預言師"],
      cost: i2(1, {
        U: 2
      }),
      color: "U",
      pow: 2,
      tou: 2,
      etb: {
        kind: "scry",
        amount: 2
      },
      text: "進場時，占卜 2。",
      flavor: "",
      rarity: "U"
    },
    u_phantom_scout: {
      id: "u_phantom_scout",
      name: "幻影潛行者",
      type: "creature",
      sub: ["幻精", "斥候"],
      cost: i2(1, {
        U: 2
      }),
      color: "U",
      pow: 2,
      tou: 2,
      kw: ["unblockable"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    u_wind_drake: {
      id: "u_wind_drake",
      name: "疾風海龍幼獸",
      type: "creature",
      sub: ["龍"],
      cost: i2(1, {
        U: 2
      }),
      color: "U",
      pow: 3,
      tou: 2,
      kw: ["flying"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    u_tide_shaman: {
      id: "u_tide_shaman",
      name: "潮汐薩滿",
      type: "creature",
      sub: ["人魚", "薩滿"],
      cost: i2(1, {
        U: 2
      }),
      color: "U",
      pow: 2,
      tou: 3,
      etb: {
        kind: "addCounter",
        amount: 1,
        target: "ownCreature"
      },
      text: "進場時，在目標由你操控的生物上放置一個 +1/+1 指示物。",
      flavor: "",
      rarity: "U"
    },
    u_mnemonic_wraith: {
      id: "u_mnemonic_wraith",
      name: "記憶亡魂",
      type: "creature",
      sub: ["幽魂"],
      cost: i2(1, {
        U: 2
      }),
      color: "U",
      pow: 2,
      tou: 2,
      kw: ["flash", "flying"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    u_archivist: {
      id: "u_archivist",
      name: "大書塔典藏官",
      type: "creature",
      sub: ["人類", "法師"],
      cost: i2(2, {
        U: 2
      }),
      color: "U",
      pow: 3,
      tou: 3,
      etb: {
        kind: "draw",
        amount: 1
      },
      text: "進場時，抽一張牌。",
      flavor: "",
      rarity: "U"
    },
    u_storm_drake: {
      id: "u_storm_drake",
      name: "風暴海龍",
      type: "creature",
      sub: ["龍"],
      cost: i2(2, {
        U: 2
      }),
      color: "U",
      pow: 3,
      tou: 3,
      kw: ["flying"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    u_mind_render: {
      id: "u_mind_render",
      name: "記憶蝕奪者",
      type: "creature",
      sub: ["幻精"],
      cost: i2(2, {
        U: 2
      }),
      color: "U",
      pow: 3,
      tou: 3,
      etb: {
        kind: "mill",
        amount: 3,
        target: "player"
      },
      text: "進場時，目標玩家將牌庫頂三張牌置入墳墓場。",
      flavor: "",
      rarity: "U"
    },
    u_conjurer: {
      id: "u_conjurer",
      name: "咒紋召喚師",
      type: "creature",
      sub: ["人類", "法師"],
      cost: i2(2, {
        U: 2
      }),
      color: "U",
      pow: 3,
      tou: 3,
      kw: ["flash"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    u_oracle_of_tides: {
      id: "u_oracle_of_tides",
      name: "潮汐神諭者",
      type: "creature",
      sub: ["人魚", "預言師"],
      cost: i2(3, {
        U: 2
      }),
      color: "U",
      pow: 3,
      tou: 5,
      etb: {
        kind: "scry",
        amount: 3
      },
      text: "進場時，占卜 3。",
      flavor: "",
      rarity: "U"
    },
    u_ghost_armada: {
      id: "u_ghost_armada",
      name: "幽靈艦隊魅影",
      type: "creature",
      sub: ["幽魂"],
      cost: i2(3, {
        U: 2
      }),
      color: "U",
      pow: 4,
      tou: 4,
      kw: ["flying"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    u_mind_sovereign: {
      id: "u_mind_sovereign",
      name: "心靈至尊",
      type: "creature",
      sub: ["幻精"],
      cost: i2(4, {
        U: 2
      }),
      color: "U",
      pow: 5,
      tou: 6,
      kw: ["flying"],
      etb: {
        kind: "draw",
        amount: 2
      },
      text: "飛行\n進場時，抽兩張牌。",
      flavor: "",
      rarity: "M"
    },
    u_moon_sprite: {
      id: "u_moon_sprite",
      name: "月華精靈",
      type: "creature",
      sub: ["幻精"],
      cost: i2(0, {
        U: 1
      }),
      color: "U",
      pow: 1,
      tou: 1,
      kw: ["flying", "flash"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    u_current_rider: {
      id: "u_current_rider",
      name: "逐流騎士",
      type: "creature",
      sub: ["人魚", "騎士"],
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      pow: 2,
      tou: 2,
      kw: ["unblockable"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    u_glimmer_eel: {
      id: "u_glimmer_eel",
      name: "微光鰻",
      type: "creature",
      sub: ["鰻"],
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      pow: 2,
      tou: 2,
      kw: ["flash"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    u_riftwing: {
      id: "u_riftwing",
      name: "裂界之翼",
      type: "creature",
      sub: ["幻精"],
      cost: i2(2, {
        U: 2
      }),
      color: "U",
      pow: 4,
      tou: 3,
      kw: ["flying"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    u_depth_guardian: {
      id: "u_depth_guardian",
      name: "深淵守衛者",
      type: "creature",
      sub: ["海怪"],
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      pow: 0,
      tou: 6,
      kw: ["defender", "reach"],
      text: "",
      flavor: "觸手伸得比城牆還高。",
      rarity: "C"
    },
    u_dispel: {
      id: "u_dispel",
      name: "迅捷否決",
      type: "instant",
      cost: i2(0, {
        U: 1
      }),
      color: "U",
      spell: {
        kind: "counter"
      },
      text: "反擊目標咒語。（將該咒語置入其擁有者的墳墓場。）",
      flavor: "",
      rarity: "U"
    },
    u_mind_probe: {
      id: "u_mind_probe",
      name: "心靈探査",
      type: "instant",
      cost: i2(0, {
        U: 1
      }),
      color: "U",
      spell: {
        kind: "draw",
        amount: 1
      },
      text: "抽一張牌。",
      flavor: "",
      rarity: "C"
    },
    u_frost_bolt: {
      id: "u_frost_bolt",
      name: "凍波衝擊",
      type: "instant",
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      spell: {
        kind: "damage",
        amount: 2,
        target: "creature"
      },
      text: "凍波衝擊對目標生物造成 2 點傷害。",
      flavor: "",
      rarity: "C"
    },
    u_vision: {
      id: "u_vision",
      name: "靈視",
      type: "instant",
      cost: i2(2, {
        U: 1
      }),
      color: "U",
      spell: {
        kind: "draw",
        amount: 2
      },
      text: "抽兩張牌。",
      flavor: "",
      rarity: "C"
    },
    u_temporal_shield: {
      id: "u_temporal_shield",
      name: "時流護盾",
      type: "instant",
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      spell: {
        kind: "pump",
        p: 0,
        t: 5,
        kw: ["hexproof"],
        target: "creature"
      },
      text: "目標生物得 +0/+5 並具有辟邪，直到回合結束。",
      flavor: "",
      rarity: "U"
    },
    u_deep_analysis: {
      id: "u_deep_analysis",
      name: "深潮解析",
      type: "sorcery",
      cost: i2(3, {
        U: 1
      }),
      color: "U",
      spell: {
        kind: "draw",
        amount: 3
      },
      text: "抽三張牌。",
      flavor: "",
      rarity: "U"
    },
    u_mind_sieve_lesser: {
      id: "u_mind_sieve_lesser",
      name: "心智淺篩",
      type: "sorcery",
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      spell: {
        kind: "mill",
        amount: 4,
        target: "player"
      },
      text: "目標玩家將牌庫頂四張牌置入墳墓場。",
      flavor: "",
      rarity: "C"
    },
    u_farsight: {
      id: "u_farsight",
      name: "遠見術",
      type: "sorcery",
      cost: i2(2, {
        U: 1
      }),
      color: "U",
      spell: {
        kind: "scry",
        amount: 3
      },
      text: "占卜 3。",
      flavor: "",
      rarity: "C"
    },
    u_tide_surge: {
      id: "u_tide_surge",
      name: "潮湧術",
      type: "sorcery",
      cost: i2(2, {
        U: 1
      }),
      color: "U",
      spell: {
        kind: "addCounter",
        amount: 2,
        target: "ownCreature"
      },
      text: "在目標由你操控的生物上放置兩個 +1/+1 指示物。",
      flavor: "",
      rarity: "C"
    },
    u_mind_circlet: {
      id: "u_mind_circlet",
      name: "心靈頭環",
      type: "artifact",
      sub: ["裝備"],
      cost: i2(2),
      color: "U",
      attach: {
        host: "ownCreature",
        kind: "equipment",
        p: 2,
        t: 1
      },
      text: "裝備\n進場時，選擇一個由你操控的生物來裝備。\n裝備中的生物得 +2/+1。",
      flavor: "",
      rarity: "U"
    },
    u_scrying_orb: {
      id: "u_scrying_orb",
      name: "占卜寶珠",
      type: "artifact",
      cost: i2(2),
      color: "U",
      etb: {
        kind: "scry",
        amount: 2
      },
      text: "進場時，占卜 2。",
      flavor: "",
      rarity: "C"
    },
    u_veil_of_secrets: {
      id: "u_veil_of_secrets",
      name: "秘密面紗",
      type: "enchantment",
      sub: ["靈氣"],
      cost: i2(1, {
        U: 1
      }),
      color: "U",
      attach: {
        host: "ownCreature",
        kind: "aura",
        kw: ["hexproof"]
      },
      text: "光環\n進場時，選擇一個由你操控的生物來附著。\n所附著的生物具有辟邪。",
      flavor: "",
      rarity: "U"
    },
    u_typhoon_caller: {
      id: "u_typhoon_caller",
      name: "颱風喚使者",
      type: "creature",
      sub: ["人魚", "薩滿"],
      cost: i2(2, {
        U: 2
      }),
      color: "U",
      pow: 3,
      tou: 4,
      kw: ["flying"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    u_thoughtweaver: {
      id: "u_thoughtweaver",
      name: "思緒編織者",
      type: "creature",
      sub: ["幻精"],
      cost: i2(1, {
        U: 2
      }),
      color: "U",
      pow: 2,
      tou: 2,
      etb: {
        kind: "draw",
        amount: 1
      },
      text: "進場時，抽一張牌。",
      flavor: "",
      rarity: "U"
    },
    u_channel_spirit: {
      id: "u_channel_spirit",
      name: "導流靈使",
      type: "creature",
      sub: ["幽魂"],
      cost: i2(0, {
        U: 1
      }),
      color: "U",
      pow: 1,
      tou: 2,
      kw: ["flash"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    u_abyssal_chart: {
      id: "u_abyssal_chart",
      name: "深淵海圖",
      type: "enchantment",
      cost: i2(2, {
        U: 1
      }),
      color: "U",
      anthem: {
        p: 0,
        t: 1,
        scope: "own"
      },
      text: "你操控的生物得 +0/+1。",
      flavor: "",
      rarity: "C"
    },
    u_grand_illusion: {
      id: "u_grand_illusion",
      name: "宏大幻象",
      type: "sorcery",
      cost: i2(4, {
        U: 2
      }),
      color: "U",
      spell: {
        kind: "mill",
        amount: 8,
        target: "player"
      },
      text: "目標玩家將牌庫頂八張牌置入墳墓場。",
      flavor: "",
      rarity: "R"
    },
    b_rat_swarm: {
      id: "b_rat_swarm",
      name: "瘟疫鼠群",
      type: "creature",
      sub: ["鼠"],
      cost: i2(0, {
        B: 1
      }),
      color: "B",
      pow: 1,
      tou: 1,
      kw: ["deathtouch"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    b_wraith_whelp: {
      id: "b_wraith_whelp",
      name: "幼年亡魂",
      type: "creature",
      sub: ["幽魂"],
      cost: i2(0, {
        B: 1
      }),
      color: "B",
      pow: 1,
      tou: 1,
      kw: ["flying"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    b_bat_swarm: {
      id: "b_bat_swarm",
      name: "吸血蝠群",
      type: "creature",
      sub: ["蝙蝠"],
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      pow: 1,
      tou: 1,
      kw: ["flying", "lifelink"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    b_grave_robber: {
      id: "b_grave_robber",
      name: "盜墓賊",
      type: "creature",
      sub: ["人類", "盜賊"],
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      pow: 2,
      tou: 1,
      kw: ["menace"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    b_plague_bearer: {
      id: "b_plague_bearer",
      name: "瘟疫帶原者",
      type: "creature",
      sub: ["殭屍"],
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      pow: 1,
      tou: 3,
      kw: ["deathtouch"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    b_shade: {
      id: "b_shade",
      name: "暗影亡魂",
      type: "creature",
      sub: ["幽魂"],
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      pow: 2,
      tou: 2,
      kw: ["flying"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    b_cursed_priest: {
      id: "b_cursed_priest",
      name: "受詛咒祭司",
      type: "creature",
      sub: ["人類", "信徒"],
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      pow: 1,
      tou: 2,
      etb: {
        kind: "discardRandom",
        amount: 1
      },
      text: "進場時，目標對手隨機棄一張牌。",
      flavor: "",
      rarity: "U"
    },
    b_night_blade: {
      id: "b_night_blade",
      name: "夜刃刺客",
      type: "creature",
      sub: ["人類", "刺客"],
      cost: i2(1, {
        B: 2
      }),
      color: "B",
      pow: 2,
      tou: 2,
      kw: ["menace"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    b_soul_harvester: {
      id: "b_soul_harvester",
      name: "靈魂收割者",
      type: "creature",
      sub: ["幽魂"],
      cost: i2(1, {
        B: 2
      }),
      color: "B",
      pow: 2,
      tou: 2,
      etb: {
        kind: "damage",
        amount: 2,
        target: "player"
      },
      text: "進場時，對目標玩家造成 2 點傷害。",
      flavor: "",
      rarity: "U"
    },
    b_crypt_guard: {
      id: "b_crypt_guard",
      name: "墓穴守衛",
      type: "creature",
      sub: ["殭屍", "戰士"],
      cost: i2(1, {
        B: 2
      }),
      color: "B",
      pow: 2,
      tou: 4,
      kw: ["regenerate"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    b_venom_spider: {
      id: "b_venom_spider",
      name: "劇毒蜘蛛",
      type: "creature",
      sub: ["蜘蛛"],
      cost: i2(1, {
        B: 2
      }),
      color: "B",
      pow: 2,
      tou: 3,
      kw: ["deathtouch", "reach"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    b_death_knight: {
      id: "b_death_knight",
      name: "死亡騎士",
      type: "creature",
      sub: ["骷髏", "騎士"],
      cost: i2(2, {
        B: 2
      }),
      color: "B",
      pow: 3,
      tou: 3,
      kw: ["menace", "lifelink"],
      text: "",
      flavor: "",
      rarity: "R"
    },
    b_zombie_horde_leader: {
      id: "b_zombie_horde_leader",
      name: "殭屍統領",
      type: "creature",
      sub: ["殭屍"],
      cost: i2(2, {
        B: 2
      }),
      color: "B",
      pow: 3,
      tou: 4,
      anthem: {
        p: 1,
        t: 1,
        scope: "tribe",
        tribe: "殭屍",
        excludeSelf: !0
      },
      text: "你操控的其他殭屍得 +1/+1。",
      flavor: "",
      rarity: "R"
    },
    b_soul_flayer: {
      id: "b_soul_flayer",
      name: "噬魂者",
      type: "creature",
      sub: ["惡魔"],
      cost: i2(2, {
        B: 2
      }),
      color: "B",
      pow: 4,
      tou: 3,
      kw: ["deathtouch"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    b_grave_titan_whelp: {
      id: "b_grave_titan_whelp",
      name: "墓園巨人幼體",
      type: "creature",
      sub: ["殭屍", "巨人"],
      cost: i2(2, {
        B: 2
      }),
      color: "B",
      pow: 4,
      tou: 4,
      kw: ["menace"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    b_plague_lord: {
      id: "b_plague_lord",
      name: "瘟疫領主",
      type: "creature",
      sub: ["惡魔"],
      cost: i2(2, {
        B: 2
      }),
      color: "B",
      pow: 3,
      tou: 4,
      etb: {
        kind: "discardRandom",
        amount: 2
      },
      text: "進場時，目標對手隨機棄兩張牌。",
      flavor: "",
      rarity: "U"
    },
    b_death_priest: {
      id: "b_death_priest",
      name: "亡靈教主",
      type: "creature",
      sub: ["人類", "信徒"],
      cost: i2(3, {
        B: 2
      }),
      color: "B",
      pow: 4,
      tou: 5,
      kw: ["lifelink"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    b_abyssal_horror: {
      id: "b_abyssal_horror",
      name: "深淵恐魔",
      type: "creature",
      sub: ["惡魔"],
      cost: i2(3, {
        B: 2
      }),
      color: "B",
      pow: 5,
      tou: 5,
      kw: ["menace"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    b_reaper_of_souls: {
      id: "b_reaper_of_souls",
      name: "索魂者",
      type: "creature",
      sub: ["惡魔"],
      cost: i2(3, {
        B: 2
      }),
      color: "B",
      pow: 4,
      tou: 4,
      kw: ["flying", "deathtouch"],
      text: "",
      flavor: "",
      rarity: "R"
    },
    b_lich_king: {
      id: "b_lich_king",
      name: "巫妖王",
      type: "creature",
      sub: ["骷髏", "法師"],
      cost: i2(4, {
        B: 2
      }),
      color: "B",
      pow: 6,
      tou: 6,
      kw: ["regenerate", "deathtouch"],
      text: "",
      flavor: "死亡對他而言，只是換一種姿勢站立。",
      rarity: "M"
    },
    b_skeleton_archer: {
      id: "b_skeleton_archer",
      name: "骷髏弓兵",
      type: "creature",
      sub: ["骷髏", "弓箭手"],
      cost: i2(0, {
        B: 1
      }),
      color: "B",
      pow: 1,
      tou: 1,
      kw: ["menace"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    b_carrion_bat: {
      id: "b_carrion_bat",
      name: "腐屍蝙蝠",
      type: "creature",
      sub: ["蝙蝠"],
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      pow: 2,
      tou: 1,
      kw: ["flying"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    b_swamp_stalker: {
      id: "b_swamp_stalker",
      name: "沼澤潛伏者",
      type: "creature",
      sub: ["蜥蜴"],
      cost: i2(1, {
        B: 2
      }),
      color: "B",
      pow: 3,
      tou: 2,
      kw: ["menace"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    b_soul_siphon_imp: {
      id: "b_soul_siphon_imp",
      name: "攝魂小鬼",
      type: "creature",
      sub: ["小鬼"],
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      pow: 2,
      tou: 2,
      kw: ["flying", "lifelink"],
      text: "",
      flavor: "",
      rarity: "U"
    },
    b_wight_guard: {
      id: "b_wight_guard",
      name: "亡靈守衛",
      type: "creature",
      sub: ["殭屍", "戰士"],
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      pow: 2,
      tou: 3,
      kw: ["regenerate"],
      text: "",
      flavor: "",
      rarity: "C"
    },
    b_terror: {
      id: "b_terror",
      name: "恐懼術",
      type: "instant",
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      spell: {
        kind: "destroy",
        target: "creature"
      },
      text: "消滅目標生物。",
      flavor: "",
      rarity: "U"
    },
    b_night_bolt: {
      id: "b_night_bolt",
      name: "夜刃衝擊",
      type: "instant",
      cost: i2(2, {
        B: 1
      }),
      color: "B",
      spell: {
        kind: "damage",
        amount: 3,
        target: "any"
      },
      text: "夜刃衝擊對任意一個目標造成 3 點傷害。",
      flavor: "",
      rarity: "C"
    },
    b_cruel_edict: {
      id: "b_cruel_edict",
      name: "無情通牒",
      type: "instant",
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      spell: {
        kind: "sacrifice",
        target: "player"
      },
      text: "目標玩家犧牲一個生物。",
      flavor: "",
      rarity: "U"
    },
    b_soul_shatter: {
      id: "b_soul_shatter",
      name: "靈魂震碎",
      type: "sorcery",
      cost: i2(2, {
        B: 1
      }),
      color: "B",
      spell: {
        kind: "discardRandom",
        amount: 2
      },
      text: "目標對手隨機棄兩張牌。",
      flavor: "",
      rarity: "C"
    },
    b_reap: {
      id: "b_reap",
      name: "收割",
      type: "sorcery",
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      spell: {
        kind: "mill",
        amount: 5,
        target: "player"
      },
      text: "目標玩家將牌庫頂五張牌置入墳墓場。",
      flavor: "",
      rarity: "C"
    },
    b_animate_dead: {
      id: "b_animate_dead",
      name: "屍體復生",
      type: "sorcery",
      cost: i2(2, {
        B: 1
      }),
      color: "B",
      spell: {
        kind: "reanimate",
        target: "ownGyCreature"
      },
      text: "將你墳墓場中的目標生物牌移回戰場。",
      flavor: "",
      rarity: "U"
    },
    b_wither_touch: {
      id: "b_wither_touch",
      name: "凋萎之觸",
      type: "instant",
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      spell: {
        kind: "pump",
        p: -3,
        t: -3,
        target: "creature"
      },
      text: "目標生物得 -3/-3，直到回合結束。",
      flavor: "",
      rarity: "U"
    },
    b_soul_exchange: {
      id: "b_soul_exchange",
      name: "靈魂交換",
      type: "sorcery",
      cost: i2(2, {
        B: 2
      }),
      color: "B",
      spell: {
        kind: "sacrifice",
        target: "player"
      },
      text: "目標玩家犧牲一個生物。",
      flavor: "",
      rarity: "R"
    },
    b_bone_ward: {
      id: "b_bone_ward",
      name: "屍骨庇護",
      type: "artifact",
      sub: ["裝備"],
      cost: i2(2),
      color: "B",
      attach: {
        host: "ownCreature",
        kind: "equipment",
        kw: ["regenerate"]
      },
      text: "裝備\n進場時，選擇一個由你操控的生物來裝備。\n裝備中的生物具有再生。",
      flavor: "",
      rarity: "U"
    },
    b_shroud_of_night: {
      id: "b_shroud_of_night",
      name: "夜幕裹屍布",
      type: "enchantment",
      sub: ["靈氣"],
      cost: i2(1, {
        B: 1
      }),
      color: "B",
      attach: {
        host: "creature",
        kind: "aura",
        p: -2,
        t: -2
      },
      text: "光環\n進場時，選擇一個生物來附著。\n所附著的生物得 -2/-2。",
      flavor: "",
      rarity: "U"
    },
    tok_soldier: {
      id: "tok_soldier",
      name: "衛兵衍生物",
      type: "creature",
      sub: ["人類", "衛兵"],
      color: "W",
      pow: 1,
      tou: 1,
      token: !0,
      text: "衛兵衍生物。",
      rarity: "C"
    },
    tok_goblin: {
      id: "tok_goblin",
      name: "哥布林衍生物",
      type: "creature",
      sub: ["哥布林"],
      color: "R",
      pow: 1,
      tou: 1,
      kw: ["haste"],
      token: !0,
      text: "敏捷。哥布林衍生物。",
      rarity: "C"
    },
    tok_zombie: {
      id: "tok_zombie",
      name: "殭屍衍生物",
      type: "creature",
      sub: ["殭屍"],
      color: "B",
      pow: 2,
      tou: 2,
      token: !0,
      text: "殭屍衍生物。",
      rarity: "C"
    }
  },
  i4 = {
    gw: {
      id: "gw",
      name: "聖輝荒野",
      colors: ["G", "W"],
      hero: "angel",
      heroName: "星燈祭司．伊蕾",
      strategy: "中速",
      blurb: "白綠中速：光環裝備強化核心生物，指示物與衍生物鋪展戰場，天使終結戰局。",
      list: [
        ["pln", 10],
        ["fst", 10],
        ["dawn", 4],
        ["vine", 3],
        ["knight", 3],
        ["wolf", 2],
        ["growth", 2],
        ["surge", 2],
        ["seal", 2],
        ["verdict", 2],
        ["behemoth", 2],
        ["angel", 2],
        ["muster", 2],
        ["blessedblade", 2],
        ["bramblewarden", 2],
        ["guardianoak", 2],
        ["thornmaiden", 2],
        ["wildclash", 2],
        ["sunshield", 2],
        ["mendingtreant", 2]
      ]
    },
    rr: {
      id: "rr",
      name: "烈焰狂襲",
      colors: ["R"],
      hero: "dragon",
      heroName: "焰紋鬥士．卡爾德",
      strategy: "快攻",
      blurb: "紅色快攻：哥布林浪潮與不可阻擋的狂戰士撕開防線，瞬現伏兵防不勝防，巨龍破空收尾。",
      list: [
        ["mtn", 24],
        ["imp", 3],
        ["raider", 3],
        ["bolt", 3],
        ["lava", 3],
        ["ambush_wyrm", 3],
        ["reckless_charge", 3],
        ["chief", 2],
        ["fury", 2],
        ["dancer", 2],
        ["drakeling", 2],
        ["dragon", 2],
        ["berserker_unbound", 2],
        ["warhammer", 2],
        ["frenzyrite", 2],
        ["goblin_horde", 2]
      ]
    },
    ub: {
      id: "ub",
      name: "深淵祕法",
      colors: ["U", "B"],
      hero: "devourer",
      heroName: "月影術士．榭菈",
      strategy: "控制",
      blurb: "藍黑控制：占卜與碾磨掌控節奏，通牒與除去拆解威脅，不可阻擋的刺客與深淵巨魔終結對局。",
      list: [
        ["isl", 10],
        ["swp", 10],
        ["dusk", 4],
        ["ray", 2],
        ["counter", 3],
        ["insight", 2],
        ["ghoul", 2],
        ["whisper", 3],
        ["vamp", 2],
        ["mindrend", 2],
        ["recall", 2],
        ["devourer", 2],
        ["tidal_seer", 2],
        ["mind_sieve", 2],
        ["edict_of_shadows", 2],
        ["phantom_assassin", 2],
        ["grave_warden", 2],
        ["shadow_ward", 2],
        ["farsight_ritual", 2],
        ["bone_horde", 2]
      ]
    },
    gwt: {
      id: "gwt",
      name: "衛兵洪流",
      colors: ["G", "W"],
      hero: "angel",
      heroName: "星燈祭司．伊蕾",
      strategy: "衍生物",
      blurb: "白綠衍生物流：集結號角與扶生樹人鋪出兵海，光輝聖印與聖光之刃將整片衛兵化為致命洪流。",
      list: [
        ["pln", 10],
        ["fst", 10],
        ["dawn", 4],
        ["muster", 4],
        ["seal", 4],
        ["blessedblade", 4],
        ["mendingtreant", 3],
        ["thornmaiden", 3],
        ["knight", 2],
        ["vine", 2],
        ["wolf", 1],
        ["bramblewarden", 2],
        ["sunshield", 2],
        ["guardianoak", 1],
        ["wildclash", 2],
        ["growth", 1],
        ["surge", 2],
        ["verdict", 1],
        ["behemoth", 1],
        ["angel", 1]
      ]
    },
    ubm: {
      id: "ubm",
      name: "深淵碾磨",
      colors: ["U", "B"],
      hero: "devourer",
      heroName: "月影術士．榭菈",
      strategy: "碾磨",
      blurb: "藍黑碾磨控制：以心智篩濾與預知儀式反覆削減對手牌庫，魔力反制與致命低語掩護節奏，穩紮穩打耗盡對手資源。",
      list: [
        ["isl", 10],
        ["swp", 10],
        ["dusk", 4],
        ["mind_sieve", 4],
        ["counter", 4],
        ["farsight_ritual", 3],
        ["tidal_seer", 3],
        ["whisper", 3],
        ["insight", 3],
        ["edict_of_shadows", 2],
        ["recall", 2],
        ["devourer", 2],
        ["ghoul", 2],
        ["grave_warden", 2],
        ["shadow_ward", 2],
        ["mindrend", 2],
        ["vamp", 1],
        ["phantom_assassin", 1]
      ]
    }
  },
  i6 = {};

function i3(e) {
  return i4[e] ?? i6[e]
}

function i5() {
  return [...Object.values(i4), ...Object.values(i6)]
}
let i8 = e => i1[e],
  i7 = ["W", "U", "B", "R", "G"],
  i9 = e => "you" === e ? "foe" : "you",
  se = {
    you: "你",
    foe: "對手"
  },
  st = {
    W: "白色",
    U: "藍色",
    B: "黑色",
    R: "紅色",
    G: "綠色"
  },
  sr = e => "W" === e.color || "U" === e.color || "B" === e.color || "R" === e.color || "G" === e.color ? e.color : void 0,
  sn = 0,
  /*
   * The next instance id. The counter belongs to the match, not to this module: two games
   * alive in one page would otherwise hand out ids from a single pool, and two machines
   * playing the same game would mint different ids for the same token. The module counter
   * is kept only as the fallback for the initial deal, before a state exists.
   */
  sa = (e) => (e && typeof e.iidSeq === 'number' ? `c${++e.iidSeq}` : `c${++sn}`),
  si = (e, t) => i8(e.cards[t].defId);

function ss(e, t) {
  let r = e.cards[t].owner;
  for (let n of ["lib", "hand", "field", "gy", "exile"]) {
    let a = e.zones[r][n],
      i = a.indexOf(t);
    i >= 0 && a.splice(i, 1)
  }
}

function so(e, t, r, n = !0) {
  let a, i = e.cards[t],
    s = e.zones[i.owner].field.includes(t) && "field" !== r;
  if (i.isToken && "field" !== r) {
    ss(e, t), s && sS(e, t);
    return
  }
  if (s) {
    let l = i8(i.defId);
    if (l.anthem && l.anthemPersists) {
      e.legacyAnthems || (e.legacyAnthems = { you: [], foe: [] });
      e.legacyAnthems[i.owner].push({
        p: l.anthem.p ?? 0,
        t: l.anthem.t ?? 0,
        scope: l.anthem.scope,
        tribe: l.anthem.tribe
      })
    }
  }
  ss(e, t), i.tapped = !1, i.damage = 0, i.dtHit = !1, i.attacking = !1, i.counters = 0, i.attachedTo = void 0, i.regenUsed = !1, "field" === r && (i.sick = !0, i.entered = ++e.fxId);
  let o = (a = i.owner, e.zones[a][r]);
  n ? o.push(t) : o.unshift(t), s && sS(e, t)
}
let sl = (e, t) => e.zones[t].field.filter(t => "creature" === si(e, t).type);

function su(e, t) {
  e.fx.push({
    ...t,
    id: ++e.fxId
  })
}

function sc(e, t, r) {
  e.log.push({
    s: t,
    c: r
  }), e.log.length > 120 && e.log.shift()
}

function sd(e, t) {
  let r = 0,
    n = 0,
    a = [];
  for (let i of ["you", "foe"])
    for (let s of e.zones[i].field) {
      let i = e.cards[s];
      if (i.attachedTo !== t) continue;
      let o = i8(i.defId).attach;
      o && (r += o.p ?? 0, n += o.t ?? 0, o.kw && a.push(...o.kw))
    }
  return {
    p: r,
    t: n,
    kw: a
  }
}

function sf(e, t) {
  let r = si(e, t),
    n = new Set(r.kw ?? []),
    a = e.cards[t];
  for (let i of e.zones[a.owner].field) {
    let a = i8(e.cards[i].defId).anthem;
    a && a.grantKw && (i !== t || !a.excludeSelf) && ("tribe" !== a.scope || (r.sub ?? []).includes(a.tribe)) && "creature" === si(e, t).type && a.grantKw.forEach(e => n.add(e))
  }
  for (let r of e.temp) r.iid === t && r.kw.forEach(e => n.add(e));
  return sd(e, t).kw.forEach(e => n.add(e)), [...n]
}

function sh(e, t) {
  let r = e.cards[t],
    n = si(e, t);
  if ("creature" !== n.type) return [0, 0];
  let a = 0,
    i = 0;
  for (let s of e.zones[r.owner].field) {
    let r = i8(e.cards[s].defId).anthem;
    r && (s !== t || !r.excludeSelf) && ("tribe" !== r.scope || (n.sub ?? []).includes(r.tribe)) && (a += r.p, i += r.t)
  }
  // Anthems marked as persisting keep applying after their source has left play.
  for (let s of (e.legacyAnthems?.[r.owner] ?? [])) {
    ("tribe" !== s.scope || (n.sub ?? []).includes(s.tribe)) && (a += s.p, i += s.t)
  }
  return [a, i]
}

function sp(e, t) {
  let [r] = sh(e, t), n = sd(e, t), a = e.cards[t];
  return (si(e, t).pow ?? 0) + r + n.p + (a.counters ?? 0) + e.temp.filter(e => e.iid === t).reduce((e, t) => e + t.p, 0)
}

function sm(e, t) {
  let [, r] = sh(e, t), n = sd(e, t), a = e.cards[t];
  return (si(e, t).tou ?? 0) + r + n.t + (a.counters ?? 0) + e.temp.filter(e => e.iid === t).reduce((e, t) => e + t.t, 0)
}
let sy = (e, t, r) => sf(e, t).includes(r);

function sg(e, t) {
  return e.zones[t].field.filter(t => {
    let r = si(e, t),
      n = e.cards[t];
    return r.mana && !n.tapped && !("creature" === r.type && n.sick)
  })
}

function sv(e, t) {
  let r = {
    W: 0,
    U: 0,
    B: 0,
    R: 0,
    G: 0,
    total: 0
  };
  for (let n of sg(e, t)) {
    for (let t of si(e, n).mana) r[t]++;
    r.total++
  }
  return r
}

function sx(e, t, r) {
  if (!r) return [];
  let n = sg(e, t).map(t => ({
      i: t,
      m: si(e, t).mana,
      cre: "creature" === si(e, t).type
    })),
    a = [];
  for (let e of i7) {
    let t = r.c[e] ?? 0;
    for (; t-- > 0;) {
      n.sort((e, t) => e.m.length - t.m.length || Number(e.cre) - Number(t.cre));
      let t = n.findIndex(t => t.m.includes(e));
      if (t < 0) return null;
      a.push(n[t].i), n.splice(t, 1)
    }
  }
  let i = r.g;
  for (n.sort((e, t) => Number(e.cre) - Number(t.cre) || e.m.length - t.m.length); i-- > 0;) {
    if (!n.length) return null;
    a.push(n.shift().i)
  }
  return a
}
let sb = e => e ? e.g + i7.reduce((t, r) => t + (e.c[r] ?? 0), 0) : 0;

function sk(e, t, r, n) {
  let a = r => {
      if (e.cards[r].owner !== t && sy(e, r, "hexproof")) return !1;
      let a = si(e, r).protFrom;
      return !a || !n || a !== n
    },
    i = [...sl(e, "you"), ...sl(e, "foe")];
  switch (r) {
    case "any":
      return {
        iids: i.filter(a), players: ["you", "foe"]
      };
    case "creature":
      return {
        iids: i.filter(a), players: []
      };
    case "ownCreature":
      return {
        iids: sl(e, t).filter(a), players: []
      };
    case "oppCreature":
      return {
        iids: sl(e, i9(t)).filter(a), players: []
      };
    case "player":
      return {
        iids: [], players: ["you", "foe"]
      };
    case "combatCreature": {
      let t = new Set(e.attackers);
      for (let r of Object.values(e.blocks)) r.forEach(e => t.add(e));
      return {
        iids: [...t].filter(t => e.cards[t] && e.zones[e.cards[t].owner].field.includes(t) && a(t)),
        players: []
      }
    }
    case "ownGyCreature":
      return {
        iids: e.zones[t].gy.filter(t => "creature" === si(e, t).type), players: []
      };
    default: {
      // A target class the engine has no case for. The house layer may answer for it;
      // when nothing is installed this is the empty set it always was.
      let h = HOUSE.targets && HOUSE.targets(e, t, r);
      return h || { iids: [], players: [] }
    }
  }
}

function sw(e, t, r) {
  let n = si(e, r);
  if (!e.zones[t].hand.includes(r) || ! function(e, t, r) {
      if (e.winner || e.pending || e.choice) return !1;
      let n = "main1" === e.phase || "main2" === e.phase;
      return "land" === r.type ? e.active === t && n && !e.stack && !e.awaitResp && e.landPlayed[t] < 1 : "instant" === r.type || r.kw?.includes("flash") ? e.awaitResp === t || !e.stack && (e.active === t ? ["main1", "atk", "blkShow", "main2"].includes(e.phase) : "blk" === e.phase) : e.active === t && n && !e.stack && !e.awaitResp
    }(e, t, n)) return !1;
  if ("land" === n.type) return !0;
  if (!sx(e, t, n.cost)) return !1;
  let a = n.spell;
  if (a?.kind === "counter") return !!e.stack && e.stack.caster !== t;
  if (a?.target && "none" !== a.target) {
    let {
      iids: r,
      players: i
    } = sk(e, t, a.target, sr(n));
    if (!r.length && !i.length || "fight" === a.kind && !sk(e, t, a.target2 ?? "oppCreature", sr(n)).iids.length) return !1
  }
  if (n.attach) {
    let {
      iids: r
    } = sk(e, t, n.attach.host, sr(n));
    if (!r.length) return !1
  }
  return !0
}

function sj(e) {
  !e.winner && (e.life.foe <= 0 ? (e.winner = "you", e.winReason = "對手的生命值歸零") : e.life.you <= 0 && (e.winner = "foe", e.winReason = "你的生命值歸零"), e.winner && (su(e, {
    kind: "banner",
    text: "you" === e.winner ? "勝利" : "敗北"
  }), sc(e, "you" === e.winner ? "★ 你獲得勝利！" : "✦ 對手獲得勝利", "sys")))
}

function s_(e, t, r) {
  for (let n = 0; n < r; n++) {
    if (e.winner) return;
    let r = e.zones[t].lib;
    if (!r.length) {
      e.winner = i9(t), e.winReason = `${se[t]}\u{7684}\u{724C}\u{5EAB}\u{5DF2}\u{7A7A}\u{FF0C}\u{7121}\u{6CD5}\u{62BD}\u{724C}\u{FF08}\u{724C}\u{5EAB}\u{8017}\u{7AED}\u{FF09}`, sc(e, `${se[t]}\u{7121}\u{724C}\u{53EF}\u{62BD}\u{FF0C}\u{6557}\u{5317}\u{FF01}`, "sys"), su(e, {
        kind: "banner",
        text: "you" === e.winner ? "勝利" : "敗北"
      });
      return
    }
    let a = r.pop();
    e.zones[t].hand.push(a), su(e, {
      kind: "draw",
      pid: t,
      defId: e.cards[a].defId,
      delay: 160 * n
    })
  }
}

function sS(e, t) {
  for (let r of ["you", "foe"])
    for (let n of [...e.zones[r].field]) {
      let r = e.cards[n];
      if (r.attachedTo !== t) continue;
      let a = si(e, n),
        i = a.attach?.kind === "equipment" ? "裝備" : "光環";
      r.attachedTo = void 0, sC(e, n, `${i}\u{5931}\u{53BB}\u{6240}\u{4F9D}\u{9644}\u{7684}\u{6C38}\u{4E45}\u{7269}`)
    }
}

function sC(e, t, r, n = !1) {
  let a = e.cards[t];
  if (e.zones[a.owner].field.includes(t)) {
    if (!n && sy(e, t, "indestructible")) return void sc(e, `${si(e,t).name} \u{4E0D}\u{6EC5}\u{FF0C}\u{672A}\u{88AB}\u{6D88}\u{6EC5}`);
    if (!n && sy(e, t, "regenerate") && !a.regenUsed) {
      for (let r of (a.regenUsed = !0, a.damage = 0, a.dtHit = !1, a.tapped = !0, a.attacking = !1, e.attackers = e.attackers.filter(e => e !== t), Object.keys(e.blocks))) e.blocks[r] = e.blocks[r].filter(e => e !== t), r === t && delete e.blocks[r];
      su(e, {
        kind: "regen",
        src: t,
        pid: a.owner,
        defId: a.defId
      }), sc(e, `${si(e,t).name} \u{518D}\u{751F}\u{FF1A}\u{6539}\u{70BA}\u{6A6B}\u{7F6E}\u{4E26}\u{79FB}\u{51FA}\u{6230}\u{9B25}`, "you" === a.owner ? "good" : "bad");
      return
    }
    for (let i of (su(e, {
        kind: n ? "exiled" : "die",
        src: t,
        pid: a.owner,
        defId: a.defId
      }), sc(e, `${si(e,t).name} ${n?"被放逐":`\u{6B7B}\u{53BB}\u{FF08}${r}\u{FF09}`}`, "you" === a.owner ? "bad" : "good"), so(e, t, n ? "exile" : "gy"), e.temp = e.temp.filter(e => e.iid !== t), e.attackers = e.attackers.filter(e => e !== t), Object.keys(e.blocks))) e.blocks[i] = e.blocks[i].filter(e => e !== t), i === t && delete e.blocks[i]
  }
}

function sL(e, t = "傷害") {
  for (let r of ["you", "foe"])
    for (let n of [...e.zones[r].field]) {
      if ("creature" !== si(e, n).type) continue;
      let r = e.cards[n];
      if (0 >= sm(e, n)) {
        sC(e, n, "防禦力歸零");
        continue
      }
      if (r.dtHit && r.damage > 0) {
        sC(e, n, "死觸");
        continue
      }
      r.damage >= sm(e, n) && sC(e, n, t)
    }
  sj(e)
}

function sE(e, t, r, n, a = 0) {
  if (e.life[t] -= r, su(e, {
      kind: "hitP",
      pid: t,
      amt: r,
      delay: a,
      src: n
    }), n && sy(e, n, "lifelink")) {
    let t = e.cards[n].owner;
    e.life[t] += r, su(e, {
      kind: "heal",
      pid: t,
      amt: r,
      delay: a + 120
    }), sc(e, `${si(e,n).name} \u{7E6B}\u{547D}\u{FF1A}${se[t]}\u{7372}\u{5F97} ${r} \u{9EDE}\u{751F}\u{547D}`, "you" === t ? "good" : "bad")
  }
}

/**
 * House rules hook.
 *
 * Everything the content layer adds is expressed in the engine's own vocabulary and
 * applied around the reducer — with one exception. Damage prevention cannot be corrected
 * after the fact, because by the time the reducer returns the creature is already dead and
 * in the graveyard, so the one thing the engine has to ask about is how much damage is
 * actually being dealt. When nothing is installed here the engine behaves exactly as it
 * always did.
 */
/**
 * The deal, made repeatable.
 *
 * Two people playing on two machines run the same reducer over the same list of moves, and
 * that only lands on the same game if every shuffle and every coin toss lands the same way.
 * So the four places the *rules* reach for chance draw from a seeded stream instead, and
 * `createMatch` restarts that stream from the seed it is given.
 *
 * The AI's own coin-flips deliberately do not: it is not playing in a networked game, and
 * letting it draw from this stream would pull the two machines apart.
 */
/*
 * The cursor lives on the game state, not in this module. Two games in one page — a replay
 * beside a live match, or the two ends of a networked game being checked against each other
 * — would otherwise draw from one another's stream and drift apart.
 */
function step32(v) {
  v = (v + 0x6d2b79f5) >>> 0;
  let t = v;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [v, ((t ^ (t >>> 14)) >>> 0) / 4294967296];
}

/** Mulberry32, drawn from and written back to the draft. */
function rnd(e) {
  let [next, value] = step32((e.rng ?? 0x2f6e2b1) >>> 0);
  e.rng = next;
  return value;
}

export const HOUSE = {
  /** (state, targetIid, amount, sourceIid) => amount actually dealt. */
  creatureDamage: null,
  /** (state, side, targetClass) => {iids, players} | null, for classes the engine lacks. */
  targets: null,
};

function sM(e, t, r, n, a = 0) {
  let i = e.cards[t];
  if (e.zones[i.owner].field.includes(t)) {
    if (HOUSE.creatureDamage) {
      r = HOUSE.creatureDamage(e, t, r, n);
      if (!(r > 0)) return;
    }
    if (n) {
      let r = si(e, n),
        a = si(e, t),
        i = sr(r);
      if (a.protFrom && i && a.protFrom === i) return void sc(e, `${a.name} \u{9632}\u{8B77}${st[a.protFrom]}\u{FF0C}\u{50B7}\u{5BB3}\u{88AB}\u{9632}\u{6B62}`)
    }
    if (i.damage += r, n && sy(e, n, "deathtouch") && r > 0 && (i.dtHit = !0), su(e, {
        kind: "hitC",
        tgt: t,
        amt: r,
        delay: a
      }), n && sy(e, n, "lifelink")) {
      let t = e.cards[n].owner;
      e.life[t] += r, su(e, {
        kind: "heal",
        pid: t,
        amt: r,
        delay: a + 120
      })
    }
  }
}

function sP(e, t, r) {
  let n = e.zones[t].lib;
  if (!n.length || r <= 0) return;
  let a = n[n.length - 1];
  e.choice = {
    kind: "scry",
    pid: t,
    options: [{
      key: "top",
      label: "留在牌頂",
      defId: e.cards[a].defId
    }, {
      key: "bottom",
      label: "放到牌底",
      defId: e.cards[a].defId
    }],
    scryCard: e.cards[a].defId,
    scryIid: a,
    remain: r
  }
}

function sT(e, t, r, n, a, i, s) {
  switch (t.kind) {
    case "damage":
      "you" === a || "foe" === a ? (sE(e, a, t.amount), sc(e, `${n} \u{5C0D}${se[a]}\u{9020}\u{6210} ${t.amount} \u{9EDE}\u{50B7}\u{5BB3}`, "you" === a ? "bad" : "good")) : a && (sM(e, a, t.amount, i ?? null), sc(e, `${n} \u{5C0D} ${si(e,a).name} \u{9020}\u{6210} ${t.amount} \u{9EDE}\u{50B7}\u{5BB3}`));
      break;
    case "draw":
      s_(e, r, t.amount), sc(e, `${se[r]}\u{62BD}\u{4E86} ${t.amount} \u{5F35}\u{724C}`);
      break;
    case "gainLife":
      e.life[r] += t.amount, su(e, {
        kind: "heal",
        pid: r,
        amt: t.amount
      });
      break;
    case "loseLifeSelf":
      e.life[r] -= t.amount, su(e, {
        kind: "hitP",
        pid: r,
        amt: t.amount
      }), sc(e, `${se[r]}\u{5931}\u{53BB} ${t.amount} \u{9EDE}\u{751F}\u{547D}`);
      break;
    case "pump":
      a && "you" !== a && "foe" !== a && (e.temp.push({
        iid: a,
        p: t.p ?? 0,
        t: t.t ?? 0,
        kw: t.kw ?? []
      }), su(e, {
        kind: "burst",
        tgt: a
      }), sc(e, `${si(e,a).name} \u{5F97}\u{5230} +${t.p}/+${t.t}${t.kw?.length?" 與 "+t.kw.map(e=>e).join("、"):""}`));
      break;
    case "addCounter": {
      let r = a;
      if ((!r || "none" === r) && i && (r = i), r && "you" !== r && "foe" !== r) {
        let n = e.cards[r];
        n.counters = (n.counters ?? 0) + (t.amount ?? 1), su(e, {
          kind: "burst",
          tgt: r
        }), sc(e, `${si(e,r).name} \u{7372}\u{5F97} ${t.amount??1} \u{500B} +1/+1 \u{6307}\u{793A}\u{7269}`, "you" === e.cards[r].owner ? "good" : "bad")
      }
      break
    }
    case "createToken": {
      let n = t.amount ?? 1;
      for (let a = 0; a < n; a++) {
        let n = sa(e);
        e.cards[n] = {
          iid: n,
          defId: t.tokenId,
          owner: r,
          tapped: !1,
          sick: !0,
          damage: 0,
          isToken: !0,
          entered: ++e.fxId
        }, e.zones[r].field.push(n), su(e, {
          kind: "summon",
          tgt: n,
          delay: 170 * a
        })
      }
      sc(e, `${se[r]}\u{88FD}\u{9020}\u{4E86} ${n} \u{500B} ${i1[t.tokenId].name}`, "you" === r ? "good" : "bad");
      break
    }
    case "sacrifice": {
      let t = sl(e, a);
      if (!t.length) {
        sc(e, `${se[a]}\u{6C92}\u{6709}\u{751F}\u{7269}\u{53EF}\u{4EE5}\u{72A7}\u{7272}`);
        break
      }
      if ("you" === a) {
        e.choice = {
          kind: "sacrifice",
          pid: "you",
          options: t.map(t => ({
            key: t,
            label: si(e, t).name,
            defId: e.cards[t].defId
          }))
        };
        return
      }
      let r = t.sort((t, r) => sp(e, t) + sm(e, t) - (sp(e, r) + sm(e, r)))[0];
      sc(e, `${se[a]}\u{72A7}\u{7272}\u{4E86} ${si(e,r).name}`, "good"), sC(e, r, "獻祭");
      break
    }
    case "scry": {
      let n = t.amount ?? 1;
      if ("you" === r) return void sP(e, "you", n);
      ! function(e, t, r) {
        for (let n = 0; n < r; n++) {
          let r = e.zones[t].lib;
          if (!r.length) break;
          let n = r[r.length - 1],
            a = si(e, n),
            i = e.zones[t].field.filter(t => "land" === si(e, t).type).length;
          "land" !== a.type || i < 5 || (r.pop(), r.unshift(n))
        }
        sc(e, `${se[t]}\u{5360}\u{535C}\u{4E86} ${r}`)
      }(e, r, n);
      break
    }
    case "fight":
      a && s && "string" == typeof a && function(e, t, r) {
        if (!e.zones[e.cards[t].owner].field.includes(t) || !e.zones[e.cards[r].owner].field.includes(r)) return;
        let n = sp(e, t),
          a = sp(e, r);
        su(e, {
          kind: "strike",
          src: t,
          tgt: r
        }), su(e, {
          kind: "strike",
          src: r,
          tgt: t,
          delay: 90
        }), sc(e, `${si(e,t).name}\u{FF08}${n}\u{FF09}\u{8207} ${si(e,r).name}\u{FF08}${a}\u{FF09}\u{4E92}\u{76F8}\u{640F}\u{9B25}\u{FF01}`, "sys"), sM(e, r, n, t, 180), sM(e, t, a, r, 180), sL(e, "搏鬥")
      }(e, a, s);
      break;
    case "mill": {
      let r = t.amount ?? 1,
        n = e.zones[a].lib,
        i = [];
      for (let e = 0; e < r && n.length; e++) i.push(n.pop());
      i.forEach((t, r) => {
        su(e, {
          kind: "mill",
          pid: a,
          defId: e.cards[t].defId,
          delay: 140 * r
        }), so(e, t, "gy")
      }), sc(e, `${se[a]}\u{7684}\u{724C}\u{5EAB}\u{9802} ${i.length} \u{5F35}\u{724C}\u{88AB}\u{9001}\u{5165}\u{58B3}\u{5893}\u{5834}`, "you" === a ? "bad" : "good");
      break
    }
    case "destroy":
      a && "you" !== a && "foe" !== a && sC(e, a, n);
      break;
    case "exile":
      a && "you" !== a && "foe" !== a && sC(e, a, n, !0);
      break;
    case "discardRandom": {
      let n = i9(r),
        a = e.zones[n].hand;
      for (let r = 0; r < (t.amount ?? 1) && a.length; r++) {
        let t = Math.floor(rnd(e) * a.length),
          i = a[t];
        su(e, {
          kind: "discard",
          pid: n,
          defId: e.cards[i].defId,
          delay: 220 * r
        }), sc(e, `${se[n]}\u{68C4}\u{6389}\u{4E86} ${si(e,i).name}`, "you" === n ? "bad" : "good"), so(e, i, "gy")
      }
      break
    }
    case "reanimate":
      a && "you" !== a && "foe" !== a && (so(e, a, "field"), su(e, {
        kind: "summon",
        tgt: a
      }), sc(e, `${si(e,a).name} \u{81EA}\u{58B3}\u{5893}\u{5834}\u{6B78}\u{4F86}\u{FF01}`, "you" === r ? "good" : "bad"));
      break;
    case "ramp": {
      let t = [...new Set(e.zones[r].lib.filter(t => si(e, t).basic).map(t => e.cards[t].defId))];
      if (!t.length) {
        sc(e, "牌庫中沒有基本魔法石牌");
        break
      }
      if ("you" === r && t.length > 1) {
        e.choice = {
          kind: "ramp",
          pid: "you",
          options: t.map(e => ({
            key: e,
            label: i1[e].name,
            defId: e
          }))
        };
        return
      }
      sN(e, r, function(e, t, r) {
        let n = {};
        for (let r of e.zones[t].field) {
          let t = si(e, r);
          t.mana && t.mana.forEach(e => n[e] = (n[e] ?? 0) + 1)
        }
        return [...r].sort((e, t) => (n[i1[e].mana[0]] ?? 0) - (n[i1[t].mana[0]] ?? 0))[0]
      }(e, r, t))
    }
  }
  sL(e, n)
}

function sN(e, t, r) {
  let n = e.zones[t].lib,
    a = n.find(t => e.cards[t].defId === r);
  if (a) {
    so(e, a, "field"), e.cards[a].tapped = !0, su(e, {
      kind: "summon",
      tgt: a
    }), sc(e, `${se[t]}\u{641C}\u{5C0B}\u{51FA} ${i1[r].name}\u{FF08}\u{6A6B}\u{7F6E}\u{FF09}\u{4E26}\u{6D17}\u{724C}`);
    for (let r = n.length - 1; r > 0; r--) {
      let t = Math.floor(rnd(e) * (r + 1));
      [n[r], n[t]] = [n[t], n[r]]
    }
  }
}

function sF(e, t, r) {
  let {
    iids: n,
    players: a
  } = sk(e, "foe", t.target, r);
  if ("damage" === t.kind) {
    let r = n.filter(r => "you" === e.cards[r].owner && sm(e, r) - e.cards[r].damage <= (t.amount ?? 0)).sort((t, r) => sp(e, r) - sp(e, t))[0];
    return r || (a.includes("you") ? "you" : n[0] ?? null)
  }
  return "destroy" === t.kind || "exile" === t.kind ? n.filter(t => "you" === e.cards[t].owner).sort((t, r) => sp(e, r) + sm(e, r) - sp(e, t) - sm(e, t))[0] ?? null : "pump" === t.kind || "addCounter" === t.kind ? n.filter(t => "foe" === e.cards[t].owner).sort((t, r) => sp(e, r) - sp(e, t))[0] ?? null : "reanimate" === t.kind ? n.sort((t, r) => sb(si(e, r).cost) - sb(si(e, t).cost))[0] ?? null : "sacrifice" === t.kind || "mill" === t.kind ? a.includes("you") ? "you" : a[0] ?? null : n[0] ?? a[0] ?? null
}

function sR(e, t, r) {
  let n = si(e, r),
    a = sx(e, t, n.cost);
  return a ? (a.forEach(t => {
    e.cards[t].tapped = !0
  }), a) : null
}

function sA(e, t, r, n, a) {
  let i = si(e, t);
  "creature" === i.type || "artifact" === i.type || "enchantment" === i.type ? (so(e, t, "field"), su(e, {
    kind: "summon",
    tgt: t
  }), sc(e, `${se[r]}\u{53EC}\u{559A}\u{4E86} ${i.name}`, "you" === r ? "good" : "bad"), function(e, t) {
    let r = si(e, t);
    if (!r.etb) return;
    let n = e.cards[t].owner;
    if (sc(e, `${r.name} \u{7684}\u{9032}\u{5834}\u{7570}\u{80FD}\u{89F8}\u{767C}`, "you" === n ? "good" : "bad"), r.etb.target && "none" !== r.etb.target) {
      let a = sk(e, n, r.etb.target, sr(r));
      if (!a.iids.length && !a.players.length) return sc(e, "（沒有合法目標，異能失效）");
      if ("you" === n) {
        e.pending = {
          card: t,
          eff: r.etb,
          legal: a.iids,
          legalP: a.players,
          paid: [],
          etbOf: t
        };
        return
      }
      let i = sF(e, r.etb, sr(r));
      return i && sT(e, r.etb, n, r.name, i, t)
    }
    sT(e, r.etb, n, r.name, void 0, t)
  }(e, t)) : (sc(e, `${se[r]}\u{65BD}\u{653E} ${i.name}`, "you" === r ? "good" : "bad"), so(e, t, "gy"), i.spell && sT(e, i.spell, r, i.name, n, void 0, a)), sj(e)
}

function sD(e, t, r, n, a, i) {
  let s = i9(r);
  (e.stack = {
    card: t,
    caster: r,
    paid: n,
    target: a,
    target2: i
  }, ss(e, t), su(e, {
    kind: "cast",
    pid: r,
    defId: e.cards[t].defId,
    src: t
  }), "foe" === r && su(e, {
    kind: "reveal",
    defId: e.cards[t].defId,
    pid: "foe"
  }), e.zones[s].hand.some(t => {
    let r = si(e, t);
    if ("instant" !== r.type && !r.kw?.includes("flash") || !sx(e, s, r.cost)) return !1;
    if (r.spell?.kind === "counter") return !0;
    if (r.spell?.target && "none" !== r.spell.target) {
      let {
        iids: t,
        players: n
      } = sk(e, s, r.spell.target, sr(r));
      return (!!t.length || !!n.length) && ("fight" !== r.spell.kind || !!sk(e, s, r.spell.target2 ?? "oppCreature", sr(r)).iids.length) && !0
    }
    if (r.attach) {
      let {
        iids: t
      } = sk(e, s, r.attach.host, sr(r));
      return t.length > 0
    }
    return !0
  })) ? (e.awaitResp = s, sc(e, `${se[r]}\u{65BD}\u{653E} ${si(e,t).name} \u{2014} ${se[s]}\u{53EF}\u{4EE5}\u{56DE}\u{61C9}`, "sys")) : sz(e)
}

function sz(e) {
  if (!e.stack) return;
  let {
    card: t,
    caster: r,
    target: n,
    target2: a
  } = e.stack;
  e.stack = null, e.awaitResp = null, sA(e, t, r, n, a)
}

function sB(e, t, r, n) {
  let a = si(e, r);
  if (!sw(e, t, r)) return;
  if ("land" === a.type) {
    e.landPlayed[t]++, so(e, r, "field"), su(e, {
      kind: "summon",
      tgt: r
    }), sc(e, `${se[t]}\u{653E}\u{7F6E}\u{4E86} ${a.name}`);
    return
  }
  if (a.attach) {
    let i = a.attach.host;
    if ("you" === t && void 0 === n) {
      let n = sk(e, t, i, sr(a)),
        s = sR(e, t, r);
      if (!s) return;
      ss(e, r), e.pending = {
        card: r,
        legal: n.iids,
        legalP: [],
        paid: s,
        isAttach: !0
      };
      return
    }
    let s = sk(e, t, i, sr(a)),
      o = ("string" == typeof n ? n : void 0) ?? s.iids.sort((t, r) => sp(e, r) + sm(e, r) - sp(e, t) - sm(e, t))[0];
    if (!o || !sR(e, t, r)) return;
    so(e, r, "field"), e.cards[r].attachedTo = o, su(e, {
      kind: "summon",
      tgt: r
    }), sc(e, `${se[t]}\u{7684} ${a.name} \u{9644}\u{8457}\u{65BC} ${si(e,o).name}`, "you" === t ? "good" : "bad"), sj(e);
    return
  }
  let i = a.spell;
  if (i?.kind === "counter") {
    if (!sR(e, t, r)) return;
    sc(e, `${se[t]}\u{65BD}\u{653E} ${a.name}`, "you" === t ? "good" : "bad"), "foe" === t && su(e, {
        kind: "reveal",
        defId: a.id,
        pid: "foe"
      }), so(e, r, "gy"),
      function(e, t) {
        if (!e.stack) return;
        let {
          card: r,
          caster: n
        } = e.stack;
        su(e, {
          kind: "counter",
          src: r,
          defId: e.cards[r].defId
        }), sc(e, `${t} \u{53CD}\u{64CA}\u{4E86} ${si(e,r).name}\u{FF01}`, "you" === n ? "bad" : "good"), so(e, r, "gy"), e.stack = null, e.awaitResp = null
      }(e, a.name);
    return
  }
  if (i?.kind === "fight") {
    let s = i.target ?? "ownCreature",
      o = i.target2 ?? "oppCreature";
    if ("you" === t && void 0 === n) {
      let n = sk(e, t, s, sr(a)),
        l = sR(e, t, r);
      if (!l) return;
      ss(e, r), e.pending = {
        card: r,
        eff: i,
        legal: n.iids,
        legalP: [],
        paid: l,
        needSecond: o,
        isResponse: "you" === e.awaitResp
      };
      return
    }
    let l = sk(e, t, s, sr(a)).iids.sort((t, r) => sp(e, r) - sp(e, t))[0];
    if (!l) return;
    let u = sk(e, t, o, sr(a)),
      c = u.iids.filter(t => sm(e, t) - e.cards[t].damage <= sp(e, l)),
      d = (c.length ? c : u.iids).sort((t, r) => sp(e, r) - sp(e, t))[0];
    if (!d) return;
    let f = sR(e, t, r);
    return f ? e.awaitResp === t ? void sA(e, r, t, l, d) : void sD(e, r, t, f, l, d) : void 0
  }
  if (i?.target && "none" !== i.target) {
    let s = sk(e, t, i.target, sr(a));
    if ("you" === t && void 0 === n) {
      let n = sR(e, t, r);
      if (!n) return;
      ss(e, r), e.pending = {
        card: r,
        eff: i,
        legal: s.iids,
        legalP: s.players,
        paid: n,
        isResponse: "you" === e.awaitResp
      };
      return
    }
    let o = n ?? sF(e, i, sr(a)),
      l = sR(e, t, r);
    if (!l) return;
    if (e.awaitResp === t) {
      "foe" === t && su(e, {
        kind: "reveal",
        defId: a.id,
        pid: "foe"
      }), sA(e, r, t, o ?? void 0);
      return
    }
    sD(e, r, t, l, o ?? void 0);
    return
  }
  let s = sR(e, t, r);
  if (s) {
    if (e.awaitResp === t) {
      "foe" === t && su(e, {
        kind: "reveal",
        defId: a.id,
        pid: "foe"
      }), sc(e, `${se[t]}\u{56DE}\u{61C9}\u{65BD}\u{653E} ${a.name}`, "you" === t ? "good" : "bad"), sA(e, r, t);
      return
    }
    sD(e, r, t, s)
  }
}

function s$(e, t) {
  let r = e.cards[t];
  return "creature" === si(e, t).type && !r.tapped && (!r.sick || sy(e, t, "haste")) && !sy(e, t, "defender")
}

function sW(e, t, r) {
  if (e.cards[t].tapped) return {
    ok: !1,
    why: "橫置中的生物無法阻擋"
  };
  if (sy(e, r, "flying") && !sy(e, t, "flying") && !sy(e, t, "reach")) return {
    ok: !1,
    why: "需要飛行或延勢才能阻擋飛行生物"
  };
  if (sy(e, r, "unblockable")) return {
    ok: !1,
    why: `${si(e,r).name} \u{4E0D}\u{53EF}\u{88AB}\u{963B}\u{64CB}`
  };
  let n = si(e, r).protFrom,
    a = sr(si(e, t));
  return n && a && n === a ? {
    ok: !1,
    why: `${si(e,r).name} \u{9632}\u{8B77}${st[n]}\u{FF0C}\u{7121}\u{6CD5}\u{88AB}\u{6B64}\u{751F}\u{7269}\u{963B}\u{64CB}`
  } : {
    ok: !0
  }
}

function sU(e, t, r) {
  return t.filter(t => {
    if (!e.zones[e.cards[t].owner].field.includes(t)) return !1;
    let n = sy(e, t, "firststrike"),
      a = sy(e, t, "doublestrike");
    return "fs" === r ? n || a : !n || a
  })
}

function sO(e, t, r) {
  let n = r,
    a = i9(e.active);
  for (let r of [...e.attackers]) {
    if (!e.zones[e.active].field.includes(r)) continue;
    let i = (e.blocks[r] ?? []).filter(t => e.zones[a].field.includes(t)),
      s = sU(e, [r], t).length > 0,
      o = n;
    if (n += 320, s) {
      let t = sp(e, r);
      if (i.length) {
        su(e, {
          kind: "strike",
          src: r,
          tgt: i[0],
          delay: o
        });
        let n = t,
          s = sy(e, r, "deathtouch"),
          l = sy(e, r, "trample");
        i.forEach((t, a) => {
          let u = s ? 1 : Math.max(1, sm(e, t) - e.cards[t].damage),
            c = a !== i.length - 1 || l ? Math.min(n, u) : n;
          c > 0 && sM(e, t, c, r, o + 190), n -= c
        }), l && n > 0 && (sE(e, a, n, r, o + 260), sc(e, `${si(e,r).name} \u{8E10}\u{8E0F}\u{6EA2}\u{51FA} ${n} \u{9EDE}\u{50B7}\u{5BB3}\u{7D66}${se[a]}`, "you" === a ? "bad" : "good"))
      } else e.origBlocked[r] ? sy(e, r, "trample") && (su(e, {
        kind: "strike",
        src: r,
        tgt: a,
        delay: o
      }), sE(e, a, t, r, o + 190), sc(e, `${si(e,r).name} \u{8E10}\u{8E0F}\u{800C}\u{904E}\u{FF0C}\u{5C0D}${se[a]}\u{9020}\u{6210} ${t} \u{9EDE}\u{50B7}\u{5BB3}`, "you" === a ? "bad" : "good")) : (su(e, {
        kind: "strike",
        src: r,
        tgt: a,
        delay: o
      }), sE(e, a, t, r, o + 190), sc(e, `${si(e,r).name} \u{5C0D}${se[a]}\u{9020}\u{6210} ${t} \u{9EDE}\u{50B7}\u{5BB3}`, "you" === a ? "bad" : "good"))
    }
    for (let n of sU(e, i, t)) su(e, {
      kind: "strike",
      src: n,
      tgt: r,
      delay: o + 120
    }), sM(e, r, sp(e, n), n, o + 300)
  }
  return n
}

function sQ(e) {
  let t = [...e.attackers, ...Object.values(e.blocks).flat()].some(t => e.cards[t] && (sy(e, t, "firststrike") || sy(e, t, "doublestrike")));
  su(e, {
    kind: "shake",
    delay: 150
  });
  let r = 100;
  for (let n of (t && (sc(e, "— 先攻傷害 —", "sys"), r = sO(e, "fs", r), sL(e, "先攻傷害"), r += 250), r = sO(e, "normal", r), sL(e, "戰鬥傷害"), e.attackers)) e.cards[n] && (e.cards[n].attacking = !1);
  e.attackers = [], e.blocks = {}, e.origBlocked = {}, e.combatDone = !0, sj(e)
}

function sI(e, t) {
  if (e.phase = t, "untap" === t) {
    for (let t of e.zones[e.active].field) e.cards[t].tapped = !1, e.cards[t].sick = !1, e.cards[t].regenUsed = !1;
    sc(e, `\u{2501}\u{2501} \u{56DE}\u{5408} ${e.turn}\u{FF1A}${se[e.active]}\u{7684}\u{56DE}\u{5408} \u{2501}\u{2501}`, "sys"), su(e, {
      kind: "banner",
      pid: e.active,
      text: "you" === e.active ? "你的回合" : "對手的回合"
    })
  }
  "draw" === t && (1 !== e.turn || e.active !== e.first ? s_(e, e.active, 1) : sc(e, `${se[e.active]}\u{5148}\u{653B}\u{FF0C}\u{8DF3}\u{904E}\u{9996}\u{56DE}\u{5408}\u{62BD}\u{724C}`, "sys"))
}

function sV(e) {
  for (let t of (e.temp = [], ["you", "foe"]))
    for (let r of e.zones[t].field) e.cards[r].damage = 0, e.cards[r].dtHit = !1;
  e.active = i9(e.active), e.turn++, e.landPlayed[e.active] = 0, e.combatDone = !1, sI(e, "untap")
}
let sq = (e, t) => i0(e, e => {
  if (e.seq++, !e.winner || "fxDone" === t.t) switch (t.t) {
    case "fxDone":
      e.fx = e.fx.filter(e => !t.ids.includes(e.id));
      return;
    case "advance":
      "untap" === e.phase ? sI(e, "upkeep") : "upkeep" === e.phase ? sI(e, "draw") : "draw" === e.phase ? sI(e, "main1") : "end" === e.phase && function(e) {
        let t = e.active,
          r = e.zones[t].hand;
        if (r.length > 7) {
          if ("you" === t) {
            e.choice = {
              kind: "discard",
              pid: "you",
              options: r.map(t => ({
                key: t,
                label: si(e, t).name,
                defId: e.cards[t].defId
              })),
              remain: r.length - 7
            };
            return
          }
          for (; e.zones.foe.hand.length > 7;) {
            let t = [...e.zones.foe.hand].sort((t, r) => sb(si(e, t).cost) - sb(si(e, r).cost)),
              r = t.find(t => "land" === si(e, t).type) ?? t[0];
            su(e, {
              kind: "discard",
              pid: "foe",
              defId: e.cards[r].defId
            }), sc(e, `\u{5C0D}\u{624B}\u{68C4}\u{6389}\u{4E86} ${si(e,r).name}\u{FF08}\u{624B}\u{724C}\u{4E0A}\u{9650}\u{FF09}`), so(e, r, "gy")
          }
        }
        sV(e)
      }(e);
      return;
    case "playLand":
    case "cast":
      sB(e, "you", t.iid);
      return;
    case "chooseTarget": {
      let r = e.pending;
      if (!r || !("string" == typeof t.tid && r.legal.includes(t.tid) || r.legalP.includes(t.tid))) return;
      if (r.isAttach) {
        e.pending = null, so(e, r.card, "field"), e.cards[r.card].attachedTo = t.tid, su(e, {
          kind: "summon",
          tgt: r.card
        }), sc(e, `\u{4F60}\u{7684} ${si(e,r.card).name} \u{9644}\u{8457}\u{65BC} ${si(e,t.tid).name}`, "good"), sj(e);
        return
      }
      if (r.needSecond && !r.first) {
        let n = sk(e, "you", r.needSecond, sr(si(e, r.card)));
        e.pending = {
          ...r,
          first: t.tid,
          legal: n.iids,
          legalP: n.players
        };
        return
      }
      if (r.needSecond && r.first) {
        if (e.pending = null, r.isResponse) return void sA(e, r.card, "you", r.first, t.tid);
        sD(e, r.card, "you", r.paid, r.first, t.tid);
        return
      }
      let {
        card: n,
        eff: a,
        etbOf: i,
        isResponse: s
      } = r;
      if (e.pending = null, i) return void sT(e, a, "you", si(e, i).name, t.tid, i);
      if (s) return void sA(e, n, "you", t.tid);
      sD(e, n, "you", r.paid, t.tid);
      return
    }
    case "cancelPending": {
      let t = e.pending;
      if (!t) return;
      if (t.etbOf) {
        e.pending = null, sc(e, "（放棄選擇目標，異能失效）");
        return
      }
      t.paid.forEach(t => {
        e.cards[t].tapped = !1
      }), e.zones.you.hand.push(t.card), e.pending = null, sc(e, "取消施放");
      return
    }
    case "skipResponse":
      "you" === e.awaitResp && sz(e);
      return;
    case "toCombat":
      if ("you" !== e.active || "main1" !== e.phase || e.stack || e.pending) return;
      if (!sl(e, "you").some(t => s$(e, t))) {
        e.combatDone = !0, sI(e, "main2");
        return
      }
      sI(e, "atk");
      return;
    case "toggleAttacker": {
      if ("atk" !== e.phase) return;
      let r = e.cards[t.iid];
      if (!s$(e, t.iid)) return;
      r.attacking = !r.attacking;
      return
    }
    case "confirmAttackers": {
      if ("atk" !== e.phase) return;
      if (e.attackers = sl(e, "you").filter(t => e.cards[t].attacking), !e.attackers.length) {
        e.combatDone = !0, sI(e, "main2");
        return
      }
      for (let t of e.attackers) sy(e, t, "vigilance") || (e.cards[t].tapped = !0);
      if (sc(e, `\u{4F60}\u{4EE5} ${e.attackers.length} \u{500B}\u{751F}\u{7269}\u{767C}\u{52D5}\u{653B}\u{64CA}\u{FF01}`, "good"), ! function(e) {
          let t = e.zones.foe.hand,
            r = [...e.attackers].sort((t, r) => sp(e, r) - sp(e, t))[0];
          if (e.attackers.reduce((t, r) => t + sp(e, r), 0) >= e.life.foe - 2) {
            let r = t.find(t => {
              let r = si(e, t);
              return "creature" === r.type && r.kw?.includes("flash") && sx(e, "foe", r.cost)
            });
            r && sR(e, "foe", r) && (so(e, r, "field"), su(e, {
              kind: "summon",
              tgt: r
            }), sc(e, `\u{5C0D}\u{624B}\u{77AC}\u{73FE}\u{4E86} ${si(e,r).name} \u{6E96}\u{5099}\u{9632}\u{5B88}\u{FF01}`, "bad"))
          }
          if (r)
            for (let n of t) {
              let t = si(e, n);
              if ("instant" === t.type && t.spell && ("destroy" === t.spell.kind && sp(e, r) >= 4 && !sy(e, r, "hexproof") && sx(e, "foe", t.cost) || "damage" === t.spell.kind && sp(e, r) >= 3 && sm(e, r) - e.cards[r].damage <= (t.spell.amount ?? 0) && !sy(e, r, "hexproof") && sx(e, "foe", t.cost))) {
                sR(e, "foe", n), so(e, n, "gy"), su(e, {
                  kind: "reveal",
                  defId: t.id,
                  pid: "foe"
                }), sc(e, `\u{5C0D}\u{624B}\u{56DE}\u{61C9}\u{653B}\u{64CA}\u{FF0C}\u{65BD}\u{653E} ${t.name}\u{FF01}`, "bad"), sT(e, t.spell, "foe", t.name, r);
                return
              }
            }
        }(e), sL(e, "瞬間"), e.attackers = e.attackers.filter(t => e.zones.you.field.includes(t)), !e.attackers.length) {
        e.combatDone = !0, sI(e, "main2");
        return
      }
      if (!sl(e, "foe").length) {
        sc(e, "對手沒有生物可阻擋，攻擊直接命中！", "good"), sQ(e), e.winner || sI(e, "main2");
        return
      }! function(e) {
        let t = {},
          r = new Set,
          n = sl(e, "foe").filter(t => !e.cards[t].tapped),
          a = [...e.attackers].sort((t, r) => sp(e, r) - sp(e, t)),
          i = a.reduce((t, r) => t + sp(e, r), 0) >= e.life.foe;
        for (let s of a) {
          let a = n.filter(t => !r.has(t) && sW(e, t, s).ok);
          if (!a.length) continue;
          let o = sp(e, s),
            l = sm(e, s),
            u = a.filter(t => (sp(e, t) >= l || sy(e, t, "deathtouch")) && (sm(e, t) > o || !1 === sy(e, s, "deathtouch") && sm(e, t) > o)),
            c = a.filter(t => sp(e, t) >= l || sy(e, t, "deathtouch")),
            d = sy(e, s, "menace"),
            f = e => {
              if (!d) return e.length ? [e[0]] : [];
              if (e.length >= 2) return e.slice(0, 2);
              let t = a.filter(t => !e.includes(t));
              return e.length && t.length ? [e[0], t[0]] : []
            },
            h = [],
            p = u.sort((t, r) => sp(e, t) - sp(e, r)),
            m = c.sort((t, r) => sp(e, t) + sm(e, t) - sp(e, r) - sm(e, r));
          p.length ? h = f(p) : m.length && o >= 3 ? h = f(m) : i && (h = f(a.sort((t, r) => sp(e, t) + sm(e, t) - sp(e, r) - sm(e, r)))), h.length && (t[s] = h, h.forEach(e => r.add(e)))
        }
        for (let r of (e.blocks = t, Object.keys(t))) e.origBlocked[r] = !0
      }(e);
      let t = Object.values(e.blocks).reduce((e, t) => e + t.length, 0);
      sc(e, t ? `\u{5C0D}\u{624B}\u{4EE5} ${t} \u{500B}\u{751F}\u{7269}\u{9032}\u{884C}\u{963B}\u{64CB}` : "對手沒有阻擋"), sI(e, "blkShow");
      return
    }
    case "resolveYourCombat":
      if ("blkShow" !== e.phase) return;
      sQ(e), e.winner || sI(e, "main2");
      return;
    case "toggleBlock": {
      if ("blk" !== e.phase) return;
      let r = sW(e, t.blocker, t.attacker);
      if (!r.ok) return void su(e, {
        kind: "banner",
        text: r.why,
        pid: "you"
      });
      for (let r of Object.keys(e.blocks)) {
        let n = e.blocks[r].indexOf(t.blocker);
        if (n >= 0 && (e.blocks[r].splice(n, 1), e.blocks[r].length || delete e.blocks[r], r === t.attacker)) return
      }(e.blocks[t.attacker] ??= []).push(t.blocker);
      return
    }
    case "unassignBlocker":
      for (let r of Object.keys(e.blocks)) e.blocks[r] = e.blocks[r].filter(e => e !== t.blocker), e.blocks[r].length || delete e.blocks[r];
      return;
    case "confirmBlocks": {
      if ("blk" !== e.phase) return;
      for (let t of e.attackers)
        if (1 === (e.blocks[t] ?? []).length && sy(e, t, "menace")) return void su(e, {
          kind: "banner",
          text: `${si(e,t).name} \u{5177}\u{5A01}\u{61FE}\u{FF0C}\u{9700}\u{81F3}\u{5C11}\u{5169}\u{500B}\u{963B}\u{64CB}\u{8005}`,
          pid: "you"
        });
      for (let t of Object.keys(e.blocks)) e.origBlocked[t] = !0;
      let t = Object.values(e.blocks).reduce((e, t) => e + t.length, 0);
      sc(e, t ? `\u{4F60}\u{4EE5} ${t} \u{500B}\u{751F}\u{7269}\u{9032}\u{884C}\u{963B}\u{64CB}` : "你沒有阻擋"), sQ(e), e.winner || sI(e, "main2");
      return
    }
    case "endTurn":
      if ("you" !== e.active || e.stack || e.pending || e.choice || !["main1", "main2"].includes(e.phase)) return;
      sI(e, "end");
      return;
    case "choose": {
      let r = e.choice;
      if (!r) return;
      if ("ramp" === r.kind) {
        e.choice = null, sN(e, "you", t.key), sL(e);
        return
      }
      if ("sacrifice" === r.kind) {
        let r = t.key;
        e.choice = null, sc(e, `\u{4F60}\u{72A7}\u{7272}\u{4E86} ${si(e,r).name}`, "bad"), sC(e, r, "獻祭"), sL(e);
        return
      }
      if ("scry" === r.kind) {
        let n = e.zones.you.lib,
          a = r.scryIid,
          i = n.indexOf(a);
        i >= 0 && (n.splice(i, 1), "bottom" === t.key ? n.unshift(a) : n.push(a)), sc(e, "bottom" === t.key ? `\u{4F60}\u{5C07} ${si(e,a).name} \u{653E}\u{5230}\u{724C}\u{5EAB}\u{5E95}` : `\u{4F60}\u{5C07} ${si(e,a).name} \u{7559}\u{5728}\u{724C}\u{9802}`);
        let s = (r.remain ?? 1) - 1;
        e.choice = null, s > 0 && sP(e, "you", s);
        return
      }
      if ("discard" === r.kind) {
        let r = t.key;
        su(e, {
          kind: "discard",
          pid: "you",
          defId: e.cards[r].defId
        }), sc(e, `\u{4F60}\u{68C4}\u{6389}\u{4E86} ${si(e,r).name}\u{FF08}\u{624B}\u{724C}\u{4E0A}\u{9650}\u{FF09}`), so(e, r, "gy");
        let n = e.zones.you.hand.length - 7;
        n > 0 ? e.choice = {
          kind: "discard",
          pid: "you",
          options: e.zones.you.hand.map(t => ({
            key: t,
            label: si(e, t).name,
            defId: e.cards[t].defId
          })),
          remain: n
        } : (e.choice = null, sV(e))
      }
      return
    }
    case "aiAct": {
      let r = t.act;
      if ("land" === r.k || "cast" === r.k) sB(e, "foe", r.iid, "cast" === r.k ? r.target : void 0);
      else if ("respond" === r.k) {
        if ("foe" !== e.awaitResp) return;
        r.iid && sw(e, "foe", r.iid) && sB(e, "foe", r.iid), "foe" === e.awaitResp && sz(e)
      } else "attack" === r.k ? (e.attackers = r.iids.filter(t => s$(e, t)), e.attackers.forEach(t => {
        e.cards[t].attacking = !0, sy(e, t, "vigilance") || (e.cards[t].tapped = !0)
      }), sc(e, `\u{5C0D}\u{624B}\u{4EE5} ${e.attackers.length} \u{500B}\u{751F}\u{7269}\u{767C}\u{52D5}\u{653B}\u{64CA}\u{FF01}`, "bad"), su(e, {
        kind: "banner",
        pid: "foe",
        text: "對手宣告攻擊"
      }), sI(e, "blk")) : "noCombat" === r.k ? (e.combatDone = !0, sI(e, "main2")) : "end" === r.k && sI(e, "end");
      return
    }
  }
});

function sZ(e) {
  if (e.winner || e.pending || e.choice) return null;
  if ("foe" === e.awaitResp) {
    let t = e.stack;
    if (t) {
      let r = si(e, t.card),
        n = sb(r.cost) >= 3 || "creature" === r.type && (r.pow ?? 0) >= 3 || r.spell?.kind === "reanimate",
        a = e.zones.foe.hand.find(t => si(e, t).spell?.kind === "counter" && sw(e, "foe", t));
      if (a && n && .75 > Math.random()) return {
        act: {
          k: "respond",
          iid: a
        },
        delay: 950
      }
    }
    return {
      act: {
        k: "respond"
      },
      delay: 700
    }
  }
  if ("foe" !== e.active || e.stack || e.awaitResp || !["main1", "main2"].includes(e.phase)) return null;
  let t = e.zones.foe.hand;
  if (e.landPlayed.foe < 1) {
    let r = t.filter(t => "land" === si(e, t).type);
    if (r.length) return {
      act: {
        k: "land",
        iid: r.find(t => (si(e, t).mana ?? []).length > 1) ?? r[0]
      },
      delay: 620
    }
  }
  let r = t.filter(t => "land" !== si(e, t).type && sw(e, "foe", t));
  if (r.length) {
    let n = sl(e, "you").sort((t, r) => sp(e, r) + sm(e, r) - sp(e, t) - sm(e, t))[0],
      a = sv(e, "foe"),
      i = r.map(r => ({
        i: r,
        sc: (r => {
          let i = si(e, r),
            s = sb(i.cost);
          if (i.spell?.kind === "counter") return -99;
          if (i.spell?.kind === "destroy") return n && sp(e, n) + sm(e, n) >= 6 && !sy(e, n, "hexproof") ? 90 : -50;
          if (i.spell?.kind === "pump") return -80;
          if (i.spell?.kind === "damage") return sl(e, "you").find(t => !sy(e, t, "hexproof") && sm(e, t) - e.cards[t].damage <= (i.spell.amount ?? 0) && sp(e, t) >= 2) ? 70 + s : e.life.you <= (i.spell.amount ?? 0) + 2 ? 95 : -40;
          if (i.spell?.kind === "discardRandom") return e.zones.you.hand.length >= 2 ? 40 : -30;
          if (i.spell?.kind === "draw") return t.length <= 4 && a.total - s >= 1 ? 35 : -20;
          if (i.spell?.kind === "reanimate") {
            let t = e.zones.foe.gy.filter(t => "creature" === si(e, t).type).sort((t, r) => sb(si(e, r).cost) - sb(si(e, t).cost))[0];
            return t && sb(si(e, t).cost) >= 4 ? 85 : -30
          }
          return i.spell?.kind === "sacrifice" ? sl(e, "you").length > 0 && sl(e, "you").length <= 2 ? 75 : 10 : i.spell?.kind === "fight" ? sl(e, "foe").some(t => sl(e, "you").some(r => !sy(e, r, "hexproof") && sp(e, t) >= sm(e, r) && sm(e, t) > sp(e, r))) ? 82 : -30 : i.spell?.kind === "addCounter" ? sl(e, "foe").length ? 55 + s : -20 : i.spell?.kind === "createToken" ? 60 : i.spell?.kind === "scry" ? 30 + s : i.spell?.kind === "mill" ? 15 : i.attach ? sl(e, "foe").length ? 58 + s : -20 : "creature" === i.type ? 50 + 4 * s : i.anthem ? sl(e, "foe").length >= 2 ? 55 : 10 : 5
        })(r)
      })).sort((e, t) => t.sc - e.sc)[0];
    if (i && i.sc > 0) {
      let r = t.some(t => si(e, t).spell?.kind === "counter"),
        n = si(e, i.i);
      if (!(r && a.U >= 2 && "creature" !== n.type && i.sc < 60 && sb(n.cost) <= a.total - 2)) return {
        act: {
          k: "cast",
          iid: i.i
        },
        delay: 980
      }
    }
  }
  if ("main1" === e.phase) {
    let t = function(e) {
      let t = sl(e, "foe").filter(t => s$(e, t));
      if (!t.length) return [];
      let r = sl(e, "you").filter(t => !e.cards[t].tapped),
        n = t.reduce((t, r) => t + sp(e, r), 0) >= e.life.you || t.length >= r.length + 2,
        a = t => sy(e, t, "unblockable") || sy(e, t, "flying") && !r.some(t => sy(e, t, "flying") || sy(e, t, "reach")) || sy(e, t, "menace") && r.length < 2,
        i = t => {
          let n = sp(e, t),
            a = sm(e, t);
          return !r.some(r => {
            if (!sW(e, r, t).ok) return !1;
            let i = sp(e, r) >= a || sy(e, r, "deathtouch"),
              s = n >= sm(e, r) || sy(e, t, "deathtouch");
            return i && !s
          })
        },
        s = t.filter(e => n || a(e) || i(e));
      return s.reduce((t, r) => t + sp(e, r), 0) >= e.life.you ? t.filter(t => n || a(t) || i(t) || sp(e, t) > 0) : s
    }(e);
    return t.length ? {
      act: {
        k: "attack",
        iids: t
      },
      delay: 1050
    } : {
      act: {
        k: "noCombat"
      },
      delay: 420
    }
  }
  return {
    act: {
      k: "end"
    },
    delay: 780
  }
}
let sH = {
    flying: "飛行",
    reach: "延勢",
    haste: "敏捷",
    vigilance: "警戒",
    firststrike: "先攻",
    doublestrike: "連擊",
    deathtouch: "死觸",
    lifelink: "吸血",
    trample: "踐踏",
    defender: "守軍",
    hexproof: "辟邪",
    menace: "威懾",
    indestructible: "不滅",
    flash: "瞬現",
    unblockable: "不可阻擋",
    regenerate: "再生"
  },
  sG = {
    flying: "只能被具飛行或延勢的生物阻擋",
    reach: "可以阻擋具飛行異能的生物",
    haste: "不受召喚失調影響，進場即可攻擊",
    vigilance: "攻擊時不需橫置",
    firststrike: "先於一般傷害造成戰鬥傷害",
    doublestrike: "造成先攻與一般兩次戰鬥傷害",
    deathtouch: "造成任何傷害即可消滅該生物",
    lifelink: "造成傷害時，你獲得等量生命",
    trample: "溢出的戰鬥傷害將轉移給防守玩家",
    defender: "不能進行攻擊",
    hexproof: "不能成為對手咒語的目標",
    menace: "至少需要兩個生物才能阻擋它",
    indestructible: "不會被消滅",
    flash: "可在任何有優先權的時機施放",
    unblockable: "不能被阻擋",
    regenerate: "每回合一次，本應消滅時改為橫置並移出戰鬥"
  };

// Match initialisation — extracted verbatim from the original useReducer initialiser.
export function createMatch(e, t, seed) {
    sn = 0;
    // A local cursor while the state is still being built, handed to it at the end.
    let cur = { rng: (seed === undefined ? (Math.random() * 4294967296) >>> 0 : seed >>> 0) || 0x2f6e2b1 };
    rnd(cur); rnd(cur);
    let r = .5 > rnd(cur) ? "you" : "foe",
      n = {},
      a = (e, t) => {
        let r = [],
          a = i3(t);
        if (!a) throw Error(`\u{627E}\u{4E0D}\u{5230}\u{724C}\u{7D44}\u{5B9A}\u{7FA9}\u{FF1A}${t}`);
        for (let [t, i] of a.list)
          for (let a = 0; a < i; a++) {
            let a = sa();
            n[a] = {
              iid: a,
              defId: t,
              owner: e,
              tapped: !1,
              sick: !1,
              damage: 0
            }, r.push(a)
          }
        for (let e = r.length - 1; e > 0; e--) {
          let t = Math.floor(rnd(cur) * (e + 1));
          [r[e], r[t]] = [r[t], r[e]]
        }
        return {
          lib: r,
          hand: [],
          field: [],
          gy: [],
          exile: []
        }
      },
      i = {
        seq: 0,
        turn: 1,
        active: r,
        first: r,
        phase: "untap",
        cards: n,
        zones: {
          you: a("you", e),
          foe: a("foe", t)
        },
        life: {
          you: 20,
          foe: 20
        },
        landPlayed: {
          you: 0,
          foe: 0
        },
        attackers: [],
        blocks: {},
        origBlocked: {},
        temp: [],
        pending: null,
        stack: null,
        awaitResp: null,
        choice: null,
        winner: null,
        winReason: "",
        log: [{
          s: `\u{5C0D}\u{5C40}\u{958B}\u{59CB} \u{2014} ${"you"===r?"你":"對手"}\u{5148}\u{653B}\u{FF08}\u{5148}\u{653B}\u{9996}\u{56DE}\u{5408}\u{4E0D}\u{62BD}\u{724C}\u{FF09}`,
          c: "sys"
        }],
        fx: [],
        fxId: 0,
        legacyAnthems: {
          you: [],
          foe: []
        },
        decks: {
          you: e,
          foe: t
        }
      };
    for (let e of ["you", "foe"])
      for (let t = 0; t < 7; t++) i.zones[e].hand.push(i.zones[e].lib.pop());
    /*
     * The opening hand holds between two and four lands, one of them multicoloured where the
     * deck has any.
     *
     * A seven-card hand off a shuffled sixty is short of a second land about a fifth of the
     * time, and a hand that cannot cast anything is not a game — it is a spectator watching
     * the opponent take a free turn or three. Fixing the hand rather than offering a mulligan
     * keeps the opening decision-free, which is what this game wants: there is no mulligan
     * step in it to offer.
     *
     * The ceiling is the same complaint from the other end: five lands and up leaves two or
     * fewer spells to play with, which is a hand with plenty of mana and nothing to spend it
     * on. Four is as many as an opening hand can use in the turns an opening hand lasts.
     *
     * The multicoloured clause is the same argument one level up. A two-colour deck holding
     * two plains opens on one colour and stalls just as surely, so if the deck brought a land
     * that answers to more than one colour, one of the two is that.
     *
     * Both sides get it, because a rule that fixed only one player's hand would be a rule
     * about who wins rather than about how a game starts.
     *
     * Done by swapping with the library rather than by redealing: a redeal would burn an
     * unbounded amount of the seeded stream and two clients stepping the same match have to
     * agree on every number drawn from it. The card pulled out of the library is chosen with
     * that same stream, and the card it displaces takes its place, so nothing biases which
     * cards end up near the top.
     */
    let isLand = iid => "land" === i8(i.cards[iid].defId)?.type,
      isMultiLand = iid => isLand(iid) && (i8(i.cards[iid].defId)?.mana?.length ?? 0) > 1,
      /** Indices in `side`'s library whose card satisfies `want`. */
      libSlots = (side, want) => {
        let out = [];
        i.zones[side].lib.forEach((iid, at) => { want(iid) && out.push(at) });
        return out;
      },
      pick = list => list[Math.floor(rnd(cur) * list.length)],
      /** Swap `give` out of the hand for whatever the library holds at `at`. */
      trade = (side, give, at) => {
        let hand = i.zones[side].hand, lib = i.zones[side].lib, seat = hand.indexOf(give);
        hand[seat] = lib[at], lib[at] = give
      },
      /**
       * A card the hand can afford to lose: anything that is not a land, chosen at random so
       * the fix does not always eat the same slot. `orPlainLand` lets a hand made entirely of
       * lands give up an ordinary one, which is how a multicoloured land gets in without
       * changing how many lands are held.
       */
      spare = (side, orPlainLand) => {
        let hand = i.zones[side].hand, spells = hand.filter(iid => !isLand(iid));
        if (spells.length) return pick(spells);
        return orPlainLand ? hand.find(iid => isLand(iid) && !isMultiLand(iid)) : void 0
      };
    for (let side of ["you", "foe"]) {
      // The multicoloured land first: it counts towards the two, so taking it can be enough
      // on its own.
      if (!i.zones[side].hand.some(isMultiLand)) {
        let slots = libSlots(side, isMultiLand);
        if (slots.length) {
          let give = spare(side, !0);
          void 0 !== give && trade(side, give, pick(slots))
        }
      }
      // ...then top the hand up to two lands, while the library still has any to give.
      while (i.zones[side].hand.filter(isLand).length < 2) {
        let slots = libSlots(side, isLand);
        if (!slots.length) break;
        let give = spare(side, !1);
        if (void 0 === give) break;
        trade(side, give, pick(slots))
      }
      // ...and last, no more than four, giving up an ordinary land before a multicoloured
      // one so the clause above survives. The loop only runs at five lands or more, so
      // whatever it gives away it leaves four behind — the multicoloured one among them.
      while (i.zones[side].hand.filter(isLand).length > 4) {
        let slots = libSlots(side, iid => !isLand(iid));
        if (!slots.length) break;
        let hand = i.zones[side].hand,
          plain = hand.filter(iid => isLand(iid) && !isMultiLand(iid));
        trade(side, pick(plain.length ? plain : hand.filter(isLand)), pick(slots))
      }
    }
    i.rng = cur.rng;
    i.iidSeq = sn;
    return i
}

// ---------------------------------------------------------------------------
// Public surface. Left column is the original (mangled) name, right column is
// the readable alias the rest of the app uses.
// ---------------------------------------------------------------------------
export {
  // data
  i1 as CARDS,              // Record<id, CardDef> - all 235 card definitions
  i4 as DECKS,              // Record<id, DeckDef> - the 5 preset decks
  i6 as CUSTOM_DECKS,       // registry custom-built decks are added to
  i8 as cardDefById,        // (defId) => CardDef
  i3 as deckById,           // (deckId) => DeckDef
  i5 as allDecks,           // () => DeckDef[]  (presets + custom)
  i7 as COLORS,             // ['W','U','B','R','G']
  i2 as makeCost,           // (generic, colored) => ManaCost
  se as SIDE_NAME,          // {you:'你', foe:'對手'}
  st as COLOR_NAME,         // colour letter => Chinese name
  sH as KEYWORD_NAME,       // keyword id => Chinese name
  sG as KEYWORD_TEXT,       // keyword id => reminder text

  // reducer + AI
  sq as reducer,            // (state, action) => state
  sZ as aiPlan,             // (state) => {act, delay} | null

  // selectors
  si as defOf,              // (state, iid) => CardDef of that in-play card
  sl as creaturesOf,        // (state, side) => iid[] of creatures on the field
  sg as manaSourcesOf,      // (state, side) => iid[] of untapped mana sources
  sv as availableMana,      // (state, side) => mana pool available this moment
  sb as cmc,                // (cost) => converted mana cost
  sp as powerOf,            // (state, iid) => current power
  sm as toughnessOf,        // (state, iid) => current toughness
  sf as keywordsOf,         // (state, iid) => keyword id[]
  sy as hasKeyword,         // (state, iid, kw) => boolean
  sh as anthemBonus,        // (state, iid) => [pow, tou] from anthems
  sd as attachBonus,        // (state, iid) => {p, t, kw} from auras/equipment
  sw as canPlay,            // (state, side, iid) => can this card be played now
  s$ as canAttack,          // (state, iid) => can this creature attack
  sW as canBlock,           // (state, blockerIid, attackerIid) => {ok, why}
  sr as colorOf,            // (cardDef) => its colour letter or undefined

  // mutators (operate on an immer draft)
  so as moveTo,             // (draft, iid, zone) => move a card between zones
  sc as pushLog,            // (draft, text, cls) => append a battle-log line
  su as pushFx,             // (draft, fx) => queue a visual effect
  sI as setPhase,           // (draft, phase) => advance to a phase
  sV as nextTurn,           // (draft) => hand the turn over
  sB as playCard,           // (draft, side, iid, target) => play/cast a card
  sz as resolveStack,       // (draft) => resolve the top of the stack
};
