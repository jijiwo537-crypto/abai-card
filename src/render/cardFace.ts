/**
 * Card face art — ported from the a-version's canvas renderer (src/data/cardDatabase.ts)
 * and adapted to the s-version (ArcaneDuel) card schema.
 *
 * The frame layout, proportions, palette and typography are the a-version's, unchanged:
 * neon gradient outer frame, dark name box, illustration window, type-line box,
 * rules/flavor box, power/toughness badge and footer.
 *
 * Two departures, both driven by this game's rules: the mana cost occupies the name
 * box's top-right (where the a version showed a decorative star rating — cost is read
 * far more often than rarity), and lands are themed by the mana they produce with a
 * doubled inner frame so they never read as a spell of the same colour.
 */

import type { CardDef } from '../game/types';
import { KEYWORD_NAME, KEYWORD_TEXT } from '../game/engine';
import { NO_BORDER, THUNDER_CAGE } from './borderFx';

/** A card definition, optionally carrying its live in-play power, toughness and keywords. */
export type FaceCard = CardDef & { livePow?: number; liveTou?: number; liveKw?: string[] };

/**
 * What the card has right now.
 *
 * A creature wearing an aura or a piece of equipment really does gain that keyword — the
 * engine's own `keywordsOf` says so, and combat is resolved against it — so the face has to
 * print the live set, not the one that was printed at the printer. In hand and in the
 * browser there is no live set, and the card's own keywords are the answer.
 */
const kwOf = (card: FaceCard): string[] => card.liveKw ?? (card.kw as string[] | undefined) ?? [];

/**
 * Neon gradient per colour, in the a-version's palette language.
 *
 * Three stops rather than two, and the ends are a real journey rather than two tints of
 * one hue: white runs pale gold into copper, blue runs cyan through azure into indigo,
 * black runs lilac into deep violet. A single-colour card is the common case, so it is
 * the case the palette is tuned for — two tones of the same hue read as a flat fill at
 * board distance, which is what a gradient is supposed to avoid.
 */
const COLOR_THEME: Record<string, [string, string, string]> = {
  W: ['#fff4c4', '#fbbf24', '#c2703a'],
  U: ['#67e8f9', '#3b82f6', '#4338ca'],
  B: ['#e9d5ff', '#a855f7', '#5b21b6'],
  R: ['#fde047', '#f97316', '#dc2626'],
  G: ['#bef264', '#4ade80', '#15803d'],
  L: ['#e2e8f0', '#94a3b8', '#475569'],
  M: ['#fbbf24', '#f472b6', '#a855f7'],
  C: ['#f1f5f9', '#cbd5e1', '#64748b'],
};

/**
 * Lands are themed by the mana they tap for, but in deeper, earthier tones than the
 * spells of that colour — so a Plains reads as white-aligned yet never gets confused
 * with a white creature. The doubled inner frame below reinforces the distinction.
 */
const LAND_THEME: Record<string, [string, string, string]> = {
  W: ['#efe0b0', '#c2a866', '#7a6435'],
  U: ['#8fc6da', '#4a86a6', '#234f6b'],
  B: ['#ab95c4', '#6d5590', '#3d2b53'],
  R: ['#dfa27a', '#b06546', '#772f24'],
  G: ['#a6c885', '#628f4f', '#325a30'],
  C: ['#c0c0cc', '#82828f', '#4d4d58'],
};

const MANA_PIP: Record<string, string> = {
  W: '#fef3c7',
  U: '#38bdf8',
  B: '#a855f7',
  R: '#f87171',
  G: '#4ade80',
  C: '#cbd5e1',
};

const TYPE_ZH: Record<string, string> = {
  land: '魔法石',
  creature: '生物',
  artifact: '秘寶',
  enchantment: '結界',
  instant: '瞬間',
  sorcery: '法術',
};

/** Halfway between two hex colours, used when a two-colour frame needs a middle stop. */
function blend(a: string, b: string): string {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${hex((ar + br) / 2)}${hex((ag + bg) / 2)}${hex((ab + bb) / 2)}`;
}

/**
 * The frame gradient, as three stops running top-left to bottom-right.
 *
 * A single-colour card travels the length of its own colour — pale to saturated to deep —
 * so the frame reads as lit rather than painted. A multicolour card spends its first half
 * in the first colour and its second in the second, meeting in a blend at the middle.
 * Lands are themed by the mana they tap for, in earthier tones than the spells.
 */
export function themeStops(card: FaceCard): [string, string, string] {
  // An explicit choice in the card designer wins over everything derived below.
  if (card.art?.c1) {
    const a = card.art.c1;
    const b = card.art.c2 || card.art.c1;
    return [a, blend(a, b), b];
  }
  if (card.type === 'land') {
    const produced = card.mana && card.mana.length ? card.mana : ['C'];
    if (produced.length >= 2) {
      const a = LAND_THEME[produced[0]] || LAND_THEME.C;
      const b = LAND_THEME[produced[1]] || LAND_THEME.C;
      return [a[0], blend(a[1], b[1]), b[2]];
    }
    return LAND_THEME[produced[0]] || LAND_THEME.C;
  }
  if (card.colors && card.colors.length >= 2) {
    const a = COLOR_THEME[card.colors[0]] || COLOR_THEME.C;
    const b = COLOR_THEME[card.colors[1]] || COLOR_THEME.C;
    return [a[0], blend(a[1], b[1]), b[2]];
  }
  /*
   * Generic mana in the cost buys the card nothing here. An artifact is paid for with
   * generic and used to be painted grey because of it, which made a white 秘寶 look like a
   * colourless one — so the frame follows the card's own colour, and only the artifacts that
   * really have none stay grey.
   */
  return COLOR_THEME[card.color] || COLOR_THEME.C;
}

/** The two ends of the frame gradient, for the callers that only want a pair. */
export function cardTheme(card: FaceCard): [string, string] {
  const [a, , c] = themeStops(card);
  return [a, c];
}

/** True when the card's frame spans two colours. */
export const isMulticolour = (card: FaceCard) =>
  (card.type === 'land' && (card.mana?.length ?? 0) >= 2) || (card.colors?.length ?? 0) >= 2;

export function typeLineOf(card: FaceCard): string {
  const base = TYPE_ZH[card.type] || card.type;
  const subs = card.sub && card.sub.length ? ` — ${card.sub.join('・')}` : '';
  return base + subs;
}

/** Total converted mana cost — used for sorting and for the deterministic visual seed. */
export function cmcOf(card: FaceCard): number {
  if (!card.cost) return 0;
  const colored = Object.values(card.cost.c || {}).reduce((a, b) => a + (b || 0), 0);
  return (card.cost.g || 0) + colored;
}

/** Cost as an ordered pip list: generic first, then coloured pips. */
export function costPips(card: FaceCard): { label: string; color: string }[] {
  const pips: { label: string; color: string }[] = [];
  if (!card.cost) return pips;
  if (card.cost.g) pips.push({ label: String(card.cost.g), color: MANA_PIP.C });
  const order = ['W', 'U', 'B', 'R', 'G'];
  for (const col of order) {
    const n = card.cost.c?.[col] || 0;
    for (let i = 0; i < n; i++) pips.push({ label: '', color: MANA_PIP[col] });
  }
  return pips;
}

/**
 * Deterministic per-card visual seed, so a given card always gets the same
 * hologram geometry and border animation across sessions.
 */
export function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * The emblems still in service. Six of the original twenty were retired for being dull
 * shapes — a cone, a dodecahedron, a plain cylinder, a double tetrahedron, a low-poly
 * sphere and a flat disc — so the hash picks from what is left, which quietly moves every
 * card that used to land on one of them onto something better.
 */
export const HOLO_IDS = [0, 1, 2, 3, 5, 6, 7, 9, 11, 12, 14, 16, 18, 19];

export const holoTypeOf = (card: FaceCard) => {
  const chosen = card.art?.holo;
  if (chosen !== undefined && HOLO_IDS.includes(chosen)) return chosen;
  return HOLO_IDS[seedOf(card.id) % HOLO_IDS.length];
};

/**
 * The border effect a card wears on the battlefield.
 *
 * This used to be a hash, which gave every card a different one and meant the border said
 * nothing at all. It is now the card's type, so the effect around a permanent tells you
 * what kind of thing it is before you have read a word of it: a shield around the
 * artifacts and enchantments, void shards around the lands, falling matrix over an
 * instant, a thunder cage over a sorcery. Creatures wear nothing — they are the things you
 * look at most, and the board reads better when the common ones are quiet — except the
 * rare and mythic ones, which get the quantum lattice.
 *
 * An explicit `art.border` still wins, so the card designer can override any of it.
 */
export const borderTypeOf = (card: FaceCard): number => {
  if (card.art?.border !== undefined) return card.art.border;
  switch (card.type) {
    case 'artifact':
    case 'enchantment':
      return 8;  // 力場護盾
    case 'land':
      return 9;  // 虛空碎片
    case 'instant':
      return 16; // 矩陣落雨
    case 'sorcery':
      return THUNDER_CAGE; // 雷霆囚籠
    case 'creature':
      // 量子絃網 for anything rare or better; nothing at all for the rest.
      return card.rarity === 'R' || card.rarity === 'M' ? 11 : NO_BORDER;
    default:
      return NO_BORDER;
  }
};

/**
 * Reminder text: off by default, and all or nothing.
 *
 * A card's abilities live in two places: keywords in `kw`, and prose in `text`. The prose
 * was written by hand over a long time, so some cards spelled a keyword out in brackets
 * and some did not, and the face printed a keyword's reminder only when the card had no
 * other rules text — which meant 警戒 explained itself on a vanilla knight and said nothing
 * at all on a knight that also drew a card. Whether you get told what a word means should
 * not depend on how busy the card is.
 *
 * So it is a switch. Off, no card explains anything: every bracketed aside is stripped,
 * including the ones baked into the prose, and the face is just the rules. On, every
 * keyword on every card carries its reminder, generated from one table rather than from
 * whatever each card happened to have written down. Only keywords are explained — the
 * brackets are a glossary, not a commentary.
 */
let remindersOn = false;

export const remindersEnabled = () => remindersOn;

export function setRemindersEnabled(on: boolean) {
  if (on === remindersOn) return;
  remindersOn = on;
  // Every face carries the setting baked into its pixels, so the cache cannot survive it.
  dataUrlCache.clear();
  try {
    localStorage.setItem('ad_reminders', on ? '1' : '0');
  } catch {
    /* storage unavailable — the preference just won't persist */
  }
}

export function loadReminderPref() {
  try {
    remindersOn = localStorage.getItem('ad_reminders') === '1';
  } catch {
    remindersOn = false;
  }
  return remindersOn;
}

/**
 * The keywords, in canonical order, as one line. It is drawn as one line too — squeezed to
 * the box width if it has to be — because a keyword list that wraps reads as two abilities.
 */
export function keywordLineOf(card: FaceCard): string {
  return kwOf(card).map((k) => KEYWORD_NAME[k] ?? k).filter(Boolean).join('、');
}

/** One bracketed gloss per keyword, or nothing at all. Named, or a list of three is a riddle. */
export function reminderLinesOf(card: FaceCard): string[] {
  if (!remindersOn) return [];
  return kwOf(card)
    .map((k) => (KEYWORD_TEXT[k] ? `（${KEYWORD_NAME[k] ?? k}：${KEYWORD_TEXT[k]}）` : ''))
    .filter(Boolean);
}

/**
 * The card's own rules text, with the keywords taken out of it.
 *
 * Most of the set writes its keywords into the prose as well — sometimes bare
 * (`飛行、警戒、吸血`), sometimes with reminder text (`警戒（攻擊時不需橫置）`), sometimes
 * with a full stop (`瞬現、敏捷。`) — so printing the keyword line *and* the prose said
 * everything twice on thirty-nine of the hundred and twenty-four cards that have keywords.
 *
 * So the prose is read first and any line that is nothing but a restatement of this card's
 * own keywords is dropped, whatever punctuation it wears. What is left is real rules text,
 * with its brackets removed: reminders come from the table above or not at all.
 */
export function proseOf(card: FaceCard): string {
  const kws = kwOf(card);
  const known = new Set(kws.map((k) => KEYWORD_NAME[k] ?? k).filter(Boolean));

  /** Eats keyword names off the front of a line: `敏捷。哥布林衍生物。` → `哥布林衍生物。` */
  const trimLeadingKeywords = (line: string) => {
    let s = line;
    for (;;) {
      const m = s.match(/^([^、，,・。．.（(\n]+)\s*(?:（[^）]*）|\([^)]*\))?\s*[、，,・。．.]\s*/);
      if (!m || !known.has(m[1].trim())) return s.trim();
      s = s.slice(m[0].length);
    }
  };

  return (card.text || '')
    .split('\n')
    .filter((raw) => {
      if (!raw.trim()) return false;
      const bare = raw
        .replace(/（[^）]*）/g, '')     // reminder text in full-width brackets
        .replace(/\([^)]*\)/g, '')
        .replace(/[。．.]\s*$/, '')     // a trailing full stop
        .trim();
      if (!bare) return false;
      const parts = bare.split(/[、，,・]/).map((s) => s.trim()).filter(Boolean);
      // Every token is one of this card's own keywords: the line adds nothing.
      return !parts.every((t) => known.has(t));
    })
    .map(trimLeadingKeywords)
    // Whatever a card wrote in its own brackets is somebody else's job now.
    .map((line) => line.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function rulesTextOf(card: FaceCard): string {
  return [keywordLineOf(card), ...reminderLinesOf(card), proseOf(card)]
    .filter(Boolean)
    .join('\n');
}

/** Breaks text into lines of at most `perLine` characters, honouring newlines. */
function layoutLines(text: string, perLine: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const ch of text) {
    if (ch === '\n') {
      out.push(line.trim());
      line = '';
      continue;
    }
    line += ch;
    if (line.length >= perLine) {
      out.push(line.trim());
      line = '';
    }
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  perLine: number,
  lineHeight: number,
): number {
  let line = '';
  let y = startY;
  for (const ch of text) {
    if (ch === '\n') {
      ctx.fillText(line.trim(), x, y);
      line = '';
      y += lineHeight;
      continue;
    }
    line += ch;
    if (line.length >= perLine) {
      ctx.fillText(line.trim(), x, y);
      line = '';
      y += lineHeight;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), x, y);
    y += lineHeight;
  }
  return y;
}


/**
 * A procedural wireframe emblem for the illustration window.
 *
 * On the 3D board a rotating hologram floats in front of this window; in flat contexts
 * (catalogue grids, previews) the window would otherwise read as empty. The emblem is a
 * still echo of that hologram, seeded from the card so it is stable, and kept low
 * contrast so the 3D mesh still dominates when both are visible.
 */
function drawHoloEmblem(
  ctx: CanvasRenderingContext2D, card: FaceCard, c1: string, cm: string, c2: string,
) {
  const cx = 1024;
  const cy = 1035;
  const variant = holoTypeOf(card);
  const seed = seedOf(card.id);
  const rnd = (n: number) => ((seed >> (n % 24)) & 0xff) / 255;

  ctx.save();
  ctx.beginPath();
  ctx.rect(160, 390, 1728, 1290);
  ctx.clip();

  const grad = ctx.createLinearGradient(cx - 420, cy - 420, cx + 420, cy + 420);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.5, cm);
  grad.addColorStop(1, c2);
  ctx.strokeStyle = grad;
  ctx.fillStyle = grad;
  ctx.lineWidth = 7;
  ctx.globalAlpha = 0.55;
  ctx.shadowColor = c1;
  ctx.shadowBlur = 40;

  const ring = (r: number, sides: number, rot: number) => {
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.92;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  };

  const spokes = (r0: number, r1: number, n: number, rot: number) => {
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.92);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.92);
      ctx.stroke();
    }
  };

  const family = variant % 5;
  const sides = 3 + (variant % 6);
  const tilt = rnd(variant) * Math.PI;

  if (family === 0) {
    // concentric polygons
    for (let i = 0; i < 4; i++) ring(180 + i * 100, sides, tilt + i * 0.22);
  } else if (family === 1) {
    // radial burst inside a ring pair
    ring(420, 48, 0);
    ring(200, 48, 0);
    spokes(200, 420, 6 + (variant % 8), tilt);
  } else if (family === 2) {
    // stacked lattice, like a wireframe sphere
    for (let i = -3; i <= 3; i++) {
      const r = Math.sqrt(Math.max(0, 1 - (i / 3.6) ** 2)) * 400;
      ctx.beginPath();
      ctx.ellipse(cx, cy + i * 105, r, r * 0.24, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ring(400, 48, 0);
  } else if (family === 3) {
    // interlocking triangles
    for (let i = 0; i < 3; i++) ring(400 - i * 70, 3, tilt + (i * Math.PI * 2) / 3);
    ring(150, 3, tilt + Math.PI);
  } else {
    // spiral
    ctx.beginPath();
    for (let t = 0; t < 1; t += 0.004) {
      const a = tilt + t * Math.PI * 7;
      const r = 60 + t * 380;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.92;
      t ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ring(420, 48, 0);
  }

  // a bright core, so the window has a focal point
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the mana cost as pips at the top-right of the name box — the slot the star
 * rating used to occupy. Cost is what a player reads constantly, so it earns the
 * most legible position on the card.
 */
function drawCost(ctx: CanvasRenderingContext2D, card: FaceCard) {
  const pips = costPips(card);
  if (!pips.length) return;
  const r = 54;
  const gap = 14;
  const cy = 255;
  const rightEdge = 1848;
  let cx = rightEdge - r - (pips.length - 1) * (r * 2 + gap);
  for (const pip of pips) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0b0b0f';
    ctx.fill();
    ctx.strokeStyle = pip.color;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.shadowColor = pip.color;
    ctx.shadowBlur = 30;
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (pip.label) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 62px "Orbitron", "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pip.label, cx, cy + 3);
      ctx.textBaseline = 'alphabetic';
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, r - 20, 0, Math.PI * 2);
      ctx.fillStyle = pip.color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    cx += r * 2 + gap;
  }
  ctx.textAlign = 'left';
}

/**
 * Draws a card face. The layout is authored at 2048x3072; `scale` renders the same
 * drawing smaller, which matters for the card grids where hundreds of faces are drawn
 * at once and full resolution would stall the page.
 */
export function renderCardCanvas(card: FaceCard, scale = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.round(2048 * scale);
  c.height = Math.round(3072 * scale);
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  if (scale !== 1) ctx.scale(scale, scale);

  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, 2048, 3072);

  // Background diagonal lines
  ctx.strokeStyle = '#fff';
  ctx.globalAlpha = 0.04;
  ctx.lineWidth = 8;
  for (let i = -4000; i < 4000; i += 160) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 4000, 4000);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  const [c1, cm, c2] = themeStops(card);
  const themeGrad = ctx.createLinearGradient(70, 70, 1978, 3002);
  themeGrad.addColorStop(0, c1);
  themeGrad.addColorStop(0.5, cm);
  themeGrad.addColorStop(1, c2);

  // Outer frames
  ctx.strokeStyle = themeGrad;
  ctx.lineWidth = 36;
  ctx.strokeRect(70, 70, 1908, 2932);
  ctx.strokeStyle = '#1a1a20';
  ctx.lineWidth = 12;
  ctx.strokeRect(100, 100, 1848, 2872);

  if (card.type === 'land') {
    ctx.strokeStyle = themeGrad;
    ctx.lineWidth = 6;
    ctx.strokeRect(126, 126, 1796, 2820);
  }

  // Name box
  ctx.fillStyle = '#141418';
  ctx.fillRect(150, 150, 1748, 210);
  ctx.strokeStyle = themeGrad;
  ctx.lineWidth = 8;
  ctx.strokeRect(150, 150, 1748, 210);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 96px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(card.name || '', 190, 285, Math.max(300, 1560 - costPips(card).length * 122));

  drawCost(ctx, card);

  // Illustration window
  ctx.fillStyle = '#0c0c0f';
  ctx.fillRect(150, 380, 1748, 1310);
  ctx.strokeStyle = '#2a2a32';
  ctx.lineWidth = 8;
  ctx.strokeRect(150, 380, 1748, 1310);
  drawHoloEmblem(ctx, card, c1, cm, c2);

  // Type line — sized up; this and the rules text are read at board distance.
  ctx.fillStyle = '#18181d';
  ctx.fillRect(150, 1700, 1748, 190);
  ctx.strokeStyle = themeGrad;
  ctx.lineWidth = 6;
  ctx.strokeRect(150, 1700, 1748, 190);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 92px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(typeLineOf(card), 190, 1826, 1660);

  // Rules text and flavor
  ctx.fillStyle = '#111115';
  ctx.fillRect(150, 1910, 1748, 780);
  ctx.strokeStyle = '#26262e';
  ctx.lineWidth = 6;
  ctx.strokeRect(150, 1910, 1748, 780);
  // Fit the rules text (and flavour, if any) inside the box. Start at the largest
  // comfortable size and step down until everything fits, so no card is ever clipped.
  const BOX_TOP = 1910;
  const BOX_H = 780;
  const flavor = card.flavor || '';
  // The keyword line is laid out apart from everything else so that it can be forced onto
  // one row; the rest — glosses, then rules — wraps as usual.
  const kwLine = keywordLineOf(card);
  const bodyText = [...reminderLinesOf(card), proseOf(card)].filter(Boolean).join('\n');

  let size = 76;
  let lineH = 100;
  let perLine = 19;
  let plan = { lines: [] as string[], flavorLines: [] as string[], total: 0 };

  for (; size >= 34; size -= 4) {
    lineH = Math.round(size * 1.32);
    perLine = Math.max(12, Math.floor(1660 / (size * 1.02)));
    const lines = layoutLines(bodyText, perLine);
    const flavorSize = Math.round(size * 0.8);
    const flavorLines = flavor ? layoutLines(flavor, Math.floor(1660 / (flavorSize * 1.02))) : [];
    const flavorH = flavorLines.length ? 58 + flavorLines.length * Math.round(flavorSize * 1.3) : 0;
    const total = (kwLine ? lineH : 0) + lines.length * lineH + flavorH;
    plan = { lines, flavorLines, total };
    if (total <= BOX_H - 78) break;
  }

  ctx.fillStyle = '#f1f5f9';
  ctx.font = `bold ${size}px "Noto Sans TC", sans-serif`;
  let curY = BOX_TOP + 46 + size;
  if (kwLine) {
    // The width cap condenses rather than wraps, so five keywords still occupy one row.
    ctx.fillText(kwLine, 190, curY, 1660);
    curY += lineH;
  }
  for (const line of plan.lines) {
    ctx.fillText(line, 190, curY);
    curY += lineH;
  }

  if (plan.flavorLines.length) {
    const flavorSize = Math.round(size * 0.8);
    curY += 12;
    ctx.strokeStyle = '#33333e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(220, curY);
    ctx.lineTo(1820, curY);
    ctx.stroke();
    curY += 46 + flavorSize;
    ctx.fillStyle = '#94a3b8';
    ctx.font = `italic ${flavorSize}px "Noto Sans TC", sans-serif`;
    for (const line of plan.flavorLines) {
      ctx.fillText(line, 190, curY);
      curY += Math.round(flavorSize * 1.3);
    }
  }

  // Power / toughness badge — creatures only. Shows live values so counters,
  // anthems and attached auras read straight off the card in play.
  if (card.type === 'creature') {
    const live = card as FaceCard;
    const pow = live.livePow ?? card.pow ?? 0;
    const tou = live.liveTou ?? card.tou ?? 0;
    const buffed = pow !== (card.pow ?? 0) || tou !== (card.tou ?? 0);
    ctx.fillStyle = '#1c1c24';
    ctx.fillRect(1340, 2710, 558, 150);
    ctx.strokeStyle = buffed ? '#22c55e' : themeGrad;
    ctx.lineWidth = 8;
    ctx.strokeRect(1340, 2710, 558, 150);
    ctx.fillStyle = buffed ? '#86efac' : '#ffffff';
    ctx.font = 'bold 84px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${pow} / ${tou}`, 1619, 2812);
  }

  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 48px "Orbitron", "Noto Sans TC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${card.id.toUpperCase()} · ${card.rarity} · ARCANE DUEL`, 170, 2820);

  return c;
}

const dataUrlCache = new Map<string, string>();

/** Full-resolution face, for the 3D card textures and the large previews. */
export function getCardDataUrl(card: FaceCard): string {
  return cachedUrl(card, 1);
}

/** Quarter-scale face, for the card grids in the catalogue and deck builder. */
export function getCardThumbUrl(card: FaceCard): string {
  return cachedUrl(card, 0.25);
}

/**
 * The face a card wears while it is coming apart — small, because that is all it needs.
 *
 * A card breaking on the table is about a hundred and twenty pixels tall, and each of the
 * six pieces is a third of that. Feeding it the same 819x1229 render the hover preview uses
 * meant drawing and then PNG-encoding ten times the pixels anyone can see: measured at
 * roughly 250ms per card, taken on the frame the creature died. In a fight where four
 * creatures die that is a second of the main thread gone, in four visible lumps.
 *
 * This is a seventh of those pixels, which still covers a card two hundred pixels tall on
 * a double-density display — more than the pieces can show while they are tumbling apart.
 */
export function getCardBreakUrl(card: FaceCard): string {
  return cachedUrl(card, 0.15);
}

/**
 * Uncached face, for the card designer. The cache keys on card id, which stays put
 * while every other field is being edited — the designer needs a fresh draw on every
 * keystroke so the preview tracks what you type.
 */
export function previewCardUrl(card: FaceCard): string {
  return renderCardCanvas(card, 0.5).toDataURL('image/png');
}

function cachedUrl(card: FaceCard, scale: number): string {
  // Live keywords belong in the key too: an aura can grant 守軍 without touching power or
  // toughness, and the face has to say so.
  const key = `${scale}|${card.id}|${card.livePow ?? ''}|${card.liveTou ?? ''}|${(card.liveKw ?? []).join(',')}`;
  const hit = dataUrlCache.get(key);
  if (hit) return hit;
  const url = renderCardCanvas(card, scale).toDataURL('image/png');
  dataUrlCache.set(key, url);
  return url;
}
