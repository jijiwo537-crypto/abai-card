/**
 * Visual effects layer.
 *
 * The engine queues effect descriptors on `state.fx`; this component draws each one over
 * the 3D board and then reports it done so the engine can drop it. Kinds, durations and
 * sounds follow the original game exactly — only the coordinates changed, since positions
 * now come from projecting the 3D board rather than reading DOM rectangles.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { Fx, GameState, Side } from '../game/engine';
import { sfx } from '../game/audio';
import * as E from '../game/engine';
import { FX_TIMING } from '../render/fxTiming';
import { getCardBreakUrl, getCardDataUrl } from '../render/cardFace';
import { isTouch } from './device';

type Pt = { x: number; y: number } | null;
export type Projector = (key: string) => Pt;

/**
 * One palette per colour of magic. The board is deliberately colourless, so these are the
 * only saturated things on screen: a spell announces its colour by the light it throws.
 */
const PALETTE: Record<string, [string, string]> = {
  W: ['#fff8e0', '#ffd166'],
  U: ['#d6f2ff', '#3fa9ff'],
  B: ['#e6d8ff', '#8b5cf6'],
  R: ['#ffdcc0', '#ff5f2e'],
  G: ['#dcffd4', '#3fd671'],
  C: ['#ffffff', '#aebbd0'],
};

/** The colour a card throws, falling back to colourless silver. */
function hueOf(state: GameState, iid?: string): [string, string] {
  if (!iid) return PALETTE.C;
  try {
    const def = E.defOf(state, iid);
    const c = def && E.colorOf(def);
    return (c && PALETTE[c]) || PALETTE.C;
  } catch {
    return PALETTE.C;
  }
}

interface Visual {
  id: number;
  kind: string;
  c1?: string;
  c2?: string;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  amt?: number;
  text?: string;
  defId?: string;
  /** On-screen height in pixels of the card an effect is drawn over. */
  size?: number;
  /** A ring at half size: everything that is not a blow landing on a player. */
  small?: boolean;
  until: number;
}

/**
 * Where the opponent's spell is held up. A fixed point rather than a measured one, so the
 * board's effects layer and the screen that draws the card agree without talking.
 */
export const stagePoint = () => ({
  x: window.innerWidth / 2,
  y: window.innerHeight / 2 - Math.min(120, window.innerHeight * 0.14),
});

/**
 * How tall the card held up on stage is, right now.
 *
 * Measured off the card itself rather than assumed, because the two are the same card and
 * anything that cuts it up has to be cut to the size it is being shown at — the phone shows
 * it at two thirds of the desktop's size, and a counterspell was slicing a 300px card in
 * half over a 201px one. The fallbacks match the stylesheet for the case where the effect
 * outlives the card it is drawn over.
 */
export const stageCardHeight = () => {
  const el = document.querySelector('.fx-stage img') as HTMLElement | null;
  const h = el?.getBoundingClientRect().height ?? 0;
  return h > 20 ? h : isTouch() ? 201 : 300;
};

/** Duration each visual stays on screen, in ms — matches the original timings. */
const DUR: Record<string, number> = {
  draw: 560,
  strike: 300,
  dmg: 950,
  heal: 950,
  death: 800,
  burst: 700,
  discard: 620,
  banner: 1100,
  bolt: 420,
  shock: 500,
  /*
   * These are keyed by *engine* fx kind rather than by visual, and exist so the gate that
   * holds the game back knows how long each one really keeps the screen busy.
   */
  cast: 1050,
  die: 1400,
  exiled: 1400,
  counter: 1100,
  /** A spent spell coming apart into pieces. */
  dissolve: 820,
  summon: 700,
  /** The opponent's card, held up in the middle of the screen so it can be read. */
  reveal: 2100,
  /** A card breaking apart where it stands. */
  shatter: 760,
  /** The launch flash under a card that is throwing something. */
  launch: 420,
  /** A card cut in two by a counterspell. */
  halve: 900,
};

/**
 * Combat is staged, not scattered.
 *
 * The engine issues one time slot per attacker and lets the slots run together, which is
 * right for the rules and wrong to watch: swings overlap each other, a blow to the face
 * lands between two of them, and the creatures that died are already gone before anything
 * has visibly hit them.
 *
 * So the batch is re-cut into a queue. Every creature-on-creature exchange plays alone,
 * start to finish, one after another; when the last of them is done the blows aimed at
 * players begin, again one at a time; and a creature's death is pinned to the moment the
 * blow that killed it actually arrives, rather than to the instant the rules resolved.
 *
 * This is presentation only. The engine applied every point of damage the moment it
 * resolved combat — `delay` has always been nothing but a cue sheet, and this rewrites the
 * cue sheet.
 */
export const isCreatureCombat = (f: Fx) =>
  (f.kind === 'strike' && f.tgt !== 'you' && f.tgt !== 'foe') || f.kind === 'hitC';

export const isPlayerBound = (f: Fx) =>
  f.kind === 'hitP' || (f.kind === 'strike' && (f.tgt === 'you' || f.tgt === 'foe'));

export interface Timeline {
  /** When each effect this sequencer owns should start, relative to now. */
  at: Map<number, number>;
  /** Creatures that die in this batch, and the moment their killing blow lands. */
  deaths: { iid: string; at: number }[];
  /** `hitC` ids that came from a spell rather than from a swing, so they draw their own orb. */
  spellDamage: Set<number>;
  /**
   * `die` / `exiled` ids with no blow behind them at all — a spell that removes a creature
   * outright. They throw their own orb and the creature comes apart when it lands.
   */
  spellKills: Set<number>;
  /** When the stage is clear again. */
  end: number;
}

/**
 * Lays the batch out as a queue. Returns null when the batch is not a combat, in which
 * case every effect keeps the delay the engine gave it.
 */
export function combatTimeline(
  fresh: Fx[],
  /**
   * Where a creature stands in the attacking side's row, left to right, or
   * `Number.MAX_SAFE_INTEGER` for anything that is not an attacker. Combat is replayed in
   * this order rather than in the order the engine happens to hand it over — which is the
   * order the attackers were clicked, and for the opponent whatever order its search
   * returned.
   */
  column: (iid?: string) => number = () => Number.MAX_SAFE_INTEGER,
): Timeline | null {
  const byDelay = (a: Fx, b: Fx) => (a.delay ?? 0) - (b.delay ?? 0);
  const duels = fresh.filter((f) => f.kind === 'strike' && f.tgt !== 'you' && f.tgt !== 'foe').sort(byDelay);
  const hitPs = fresh.filter((f) => f.kind === 'hitP').sort(byDelay);
  const playerStrikes = fresh
    .filter((f) => f.kind === 'strike' && (f.tgt === 'you' || f.tgt === 'foe'))
    .sort(byDelay);
  /*
   * Damage to a creature with no swing behind it came from a spell. It gets an orb of its
   * own, and the creature it kills waits for that orb the same way a creature in combat
   * waits for the blade.
   */
  const struck = new Set(duels.map((f) => f.tgt));
  const spellHits = fresh.filter((f) => f.kind === 'hitC' && !struck.has(f.tgt)).sort(byDelay);
  /*
   * A creature removed outright — destroyed or exiled by a spell — has no damage behind it
   * at all, so nothing was ever drawn: it simply stopped existing on the frame the spell
   * resolved. It now takes an orb of its own, thrown the same way a damage spell's is, and
   * comes apart when that orb arrives.
   */
  const damaged = new Set(fresh.filter((f) => f.kind === 'hitC').map((f) => f.tgt));
  const removals = fresh
    .filter((f) => (f.kind === 'die' || f.kind === 'exiled') && typeof f.src === 'string' &&
      !struck.has(f.src) && !damaged.has(f.src))
    .sort(byDelay);
  if (!duels.length && !hitPs.length && !playerStrikes.length && !spellHits.length &&
      !removals.length) return null;

  const at = new Map<number, number>();
  /** For each creature, when the last blow aimed at it arrives. */
  const landsOn = new Map<string, number>();
  /**
   * And when it may come apart: after the blow's own impact has finished drawing, not on
   * the frame it touches. Releasing the card at the moment of contact took it off the
   * board mid-slash — the row re-centred underneath the effect and the strike finished
   * over empty table.
   */
  const killAt = new Map<string, number>();
  let cursor = 120;

  /*
   * Combat, one attacker at a time.
   *
   * The engine gives every attacker its own slot — its swing, then its blockers' answers
   * 120ms later, then the next attacker 320ms on — so the batch already arrives clustered
   * by attacker, and a gap wider than a slot is where one exchange ends and the next
   * begins. Those clusters are what gets reordered and replayed: an attacker's whole
   * exchange, blockers and all, finishes before the creature to its right begins.
   */
  const SLOT_SPAN = 300;
  const combat = [...duels, ...hitPs, ...playerStrikes].sort(byDelay);
  const groups: Fx[][] = [];
  for (const f of combat) {
    const open = groups[groups.length - 1];
    if (open && (f.delay ?? 0) - (open[0].delay ?? 0) <= SLOT_SPAN) open.push(f);
    else groups.push([f]);
  }
  /*
   * Whose exchange each cluster is. Only the attacking side has a column, so the attacker
   * is whichever creature in the cluster has one — which holds even when the attacker
   * itself never swings, and its cluster is nothing but blockers answering.
   */
  const UNPLACED = Number.MAX_SAFE_INTEGER;
  const attackerOf = (g: Fx[]) => {
    for (const f of g) {
      if (column(f.src) !== UNPLACED) return f.src;
      if (typeof f.tgt === 'string' && column(f.tgt) !== UNPLACED) return f.tgt;
    }
    return g[0].src;
  };
  groups.sort((a, b) => {
    const ca = column(attackerOf(a));
    const cb = column(attackerOf(b));
    return ca !== cb ? ca - cb : (a[0].delay ?? 0) - (b[0].delay ?? 0);
  });

  /*
   * Two creatures in combat hit each other at the same instant, so an attacker's swing and
   * its blocker's answer are one beat, not two — both leave together and both land
   * together. First strike is the exception, and the engine already separates it into its
   * own damage step, which arrives here as a distinct clump of delays; pairing only within
   * a short window keeps those apart, so a first-striker still swings alone and the answer
   * comes in the following beat.
   */
  const PAIR_WINDOW = 200;
  const paired = new Set<number>();
  /*
   * A volley at a player is tighter than a single blow: with more than one creature getting
   * through, the next orb leaves while the last one is still breaking. The flight itself is
   * untouched — a projectile crosses the board at the speed it always did.
   */
  const playerStep = FX_TIMING.boltFlight + FX_TIMING.boltImpact + FX_TIMING.gap -
    (hitPs.length > 1 ? FX_TIMING.volleyCut : 0);
  const spent = new Set<number>();

  /*
   * Act one: every creature that met a blocker, in row order.
   *
   * The two acts are kept apart on purpose. Within an act the order is the row, left to
   * right, and a blocked attacker settles with all of its blockers before the creature to
   * its right begins — but nothing reaches a player until every exchange on the table is
   * over. Interleaving the two read as the fight being interrupted.
   */
  for (const g of groups) {
    let traded = false;
    for (const f of g) {
      if (paired.has(f.id) || spent.has(f.id) || isPlayerBound(f)) continue;

      traded = true;
      at.set(f.id, cursor);
      const impact = cursor + FX_TIMING.duelFlight;
      if (typeof f.tgt === 'string') {
        landsOn.set(f.tgt, impact);
        killAt.set(f.tgt, impact + FX_TIMING.duelImpact);
      }

      const answer = duels.find(
        (x) => !paired.has(x.id) && x.id !== f.id && x.src === f.tgt && x.tgt === f.src &&
          Math.abs((x.delay ?? 0) - (f.delay ?? 0)) <= PAIR_WINDOW,
      );
      if (answer) {
        paired.add(answer.id);
        at.set(answer.id, cursor);
        if (typeof answer.tgt === 'string') {
          landsOn.set(answer.tgt, impact);
          killAt.set(answer.tgt, impact + FX_TIMING.duelImpact);
        }
      }
      paired.add(f.id);
      cursor += FX_TIMING.duelFlight + FX_TIMING.duelImpact + FX_TIMING.gap;
    }
    /*
     * Breath between one creature's exchange and the next one's — but only after an
     * exchange. A creature that simply got through has nothing to settle, and several of
     * them in a row should read as a volley, so they follow one another straight on.
     */
    if (traded) cursor += FX_TIMING.actGap;
  }
  const act1End = cursor;

  /*
   * Act two: the creatures that got through, again in row order, one blow at a time. The
   * engine issues two things for each — a flat wind-up line and the damage itself — and
   * they are one event on stage, so whichever comes first claims the other.
   */
  for (const g of groups) {
    for (const f of g) {
      if (spent.has(f.id) || !isPlayerBound(f)) continue;
      at.set(f.id, cursor);
      spent.add(f.id);
      const mate = (f.kind === 'hitP' ? playerStrikes : hitPs)
        .find((x) => !spent.has(x.id) && x.src === f.src);
      if (mate) {
        at.set(mate.id, cursor);
        spent.add(mate.id);
      }
      cursor += playerStep;
    }
  }

  /*
   * A spell's orbs fly before anything else in its batch; nothing else is competing.
   *
   * Blows that carry the same `salvo` tag are one event, not a queue: a spell that hits
   * every creature at once throws every orb on the same beat and they all land together.
   * Without it a board sweep played out as six separate shots, which took six times as long
   * and read as six separate spells.
   */
  const spellDamage = new Set<number>();
  let salvoAt = cursor;
  let salvoTag: unknown;
  for (const f of spellHits) {
    const tag = (f as { salvo?: number }).salvo;
    if (tag === undefined || tag !== salvoTag) {
      salvoAt = cursor;
      salvoTag = tag;
      cursor += FX_TIMING.boltFlight + FX_TIMING.boltImpact + FX_TIMING.gap;
    }
    at.set(f.id, salvoAt);
    spellDamage.add(f.id);
    if (typeof f.tgt === 'string') {
      landsOn.set(f.tgt, salvoAt + FX_TIMING.boltFlight);
      killAt.set(f.tgt, salvoAt + FX_TIMING.boltFlight + FX_TIMING.boltImpact);
    }
  }

  // Outright removals queue behind the damage, one orb at a time, same as everything else.
  const spellKills = new Set<number>();
  for (const f of removals) {
    at.set(f.id, cursor);
    spellKills.add(f.id);
    if (typeof f.src === 'string') {
      killAt.set(f.src, cursor + FX_TIMING.boltFlight + FX_TIMING.boltImpact);
    }
    cursor += FX_TIMING.boltFlight + FX_TIMING.boltImpact + FX_TIMING.gap;
  }

  for (const f of fresh) {
    if (f.kind !== 'hitC' || spellDamage.has(f.id)) continue;
    at.set(f.id, (typeof f.tgt === 'string' ? landsOn.get(f.tgt) : undefined) ?? act1End);
  }

  /*
   * A death waits for its cause — but only if this batch contains the blow that caused it.
   * The engine reports every casualty the instant combat resolves, with no delay at all, so
   * a creature killed in the exchange used to vanish before anything had been seen to reach
   * it. A creature killed by a spell before combat is a different story: no blow in this
   * batch is aimed at it, and holding it back put it on the board for the whole fight and
   * killed it afterwards, as if the spell had never landed.
   *
   * This is only when it comes apart. Giving up its place in the row is a separate matter
   * the board decides, and it waits for the whole combat rather than for this batch.
   */
  const deaths: { iid: string; at: number }[] = [];
  for (const f of fresh) {
    if (f.kind !== 'die' && f.kind !== 'exiled') continue;
    const when = typeof f.src === 'string' ? killAt.get(f.src) : undefined;
    if (when === undefined) continue;
    // A removal already holds the moment its own orb leaves; everything else plays on the
    // blow that caused it.
    if (!spellKills.has(f.id)) at.set(f.id, when);
    if (typeof f.src === 'string') deaths.push({ iid: f.src, at: when });
  }

  // Lifelink healing follows the blow that earned it.
  const anchored = [...at.entries()].map(([id, t]) => ({
    id, t, raw: fresh.find((f) => f.id === id)?.delay ?? 0,
  }));
  for (const f of fresh) {
    if (f.kind !== 'heal') continue;
    const parent = anchored
      .filter((a) => a.raw <= (f.delay ?? 0))
      .sort((a, b) => b.raw - a.raw)[0];
    at.set(f.id, (parent?.t ?? 0) + FX_TIMING.duelFlight + 120);
  }

  return { at, deaths, spellDamage, spellKills, end: cursor };
}

interface Props {
  state: GameState;
  project: Projector | null;
  onDone: (ids: number[]) => void;
  onShake: () => void;
  /**
   * Fired on the frame a blow reaches a player, with that blow's own amount — positive for
   * damage, negative for the life a lifelinker just gave back. The life panels move by this
   * and nothing else while the gate below is open.
   */
  onImpact?: (pid: 'you' | 'foe', delta: number) => void;
  /**
   * Reports when the effects queued so far will have finished playing, as a
   * `performance.now()` stamp. The battle screen holds the result screen back until then,
   * so a lethal last swing is still seen.
   */
  onBusyUntil?: (stamp: number) => void;
  /**
   * The same stamp, but only for batches that are a combat. The turn is held on this one
   * rather than on `onBusyUntil`, so a banner or a card being revealed does not stall the
   * game while a four-swing combat still does.
   */
  onCombatUntil?: (stamp: number) => void;
  /** Fires a spell inside the 3D scene: from anchor, to anchor, in this colour. */
  shoot?: (from: string, to: string, colour: number) => void;
  /** One creature swinging at another — the same journey, drawn as a swing. */
  duel?: (from: string, to: string, colour: number) => void;
  /**
   * Creatures that are about to die, and when the killing blow lands, so the board can keep
   * them standing until then instead of removing them the instant the rules say so.
   */
  onDeaths?: (deaths: { iid: string; at: number; broke?: boolean }[]) => void;
  /** The arena reacts to a player being hit. */
  surge?: () => void;
  /** How tall a card on the table is, in screen pixels — an effect drawn over one matches it. */
  cardPixels?: () => number;
  /** Fired when a counterspell's orb lands, so the staged card can be taken down. */
  onStageBreak?: () => void;
  /** The opponent has cast something: raise it where it can be read. */
  onStaged?: (defId: string) => void;
  /**
   * Opens the life gate for a run of blows, giving the number of landings to expect; zero
   * closes it. While it is open the panels follow the blows being drawn rather than the
   * rules, which have already applied all of the damage.
   */
  onLifeGate?: (pending: number) => void;
}

export const FxLayer: React.FC<Props> = ({
  state, project, onDone, onShake, onImpact, onBusyUntil, onCombatUntil, shoot, duel, onDeaths,
  surge, onLifeGate, cardPixels, onStageBreak, onStaged,
}) => {
  const seen = useRef<Set<number>>(new Set());
  const timers = useRef<number[]>([]);
  /**
   * Where every creature stands in its row, left to right — remembered, not looked up.
   * Combat is replayed in this order, and by the time the engine reports the exchange the
   * casualties have already left the field, so the row cannot be read off the state that
   * carries the news. Entries are never removed: a creature that dies keeps the place it
   * held when it swung.
   */
  const column = useRef<Map<string, { side: Side; col: number }>>(new Map());
  /*
   * The card most recently cast. A spell's damage arrives in a later batch than its cast,
   * and the engine does not name the spell as the source of that damage — so this is what
   * lets the orb that flies at the target carry the colour of the magic that threw it.
   */
  const lastSpell = useRef<string | null>(null);
  /** The opponent's card on stage, while it is up. */
  const stageAt = useRef<{ x: number; y: number } | null>(null);
  const [visuals, setVisuals] = useState<Visual[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  /*
   * Test hook: draw one visual on demand. Some effects — a counterspell above all — need
   * the opponent to make a particular decision before the engine will ever emit them, which
   * makes them awkward to reach from a harness even though the drawing itself is ordinary.
   * Compiled away entirely in the shipped file.
   */
  useEffect(() => {
    if (!import.meta.env.VITE_TEST_HOOK) return;
    (window as any).__showFx = (kind: string, defId?: string, dur = 1800) => {
      setVisuals((prev) => [...prev, {
        id: -Math.round(performance.now()),
        kind,
        defId,
        size: 150,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2 - 120,
        x2: window.innerWidth / 2 + 240,
        y2: window.innerHeight / 2 + 120,
        c1: '#d6f2ff',
        c2: '#3fa9ff',
        until: performance.now() + dur,
      }]);
    };
  }, []);

  useEffect(() => {
    const fresh = state.fx.filter((f) => !seen.current.has(f.id));
    if (!fresh.length) return;

    const centre = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const at = (key?: string): { x: number; y: number } =>
      (key && project?.(key)) || centre();

    /** The printed card behind an instance id, so an effect can break the real thing. */
    const defIdOf = (iid?: string): string | undefined => {
      if (!iid) return undefined;
      try { return E.defOf(state, iid)?.id; } catch { return undefined; }
    };

    const push = (v: Omit<Visual, 'until'> & { dur: number }) =>
      setVisuals((prev) => [...prev, { ...v, until: performance.now() + v.dur }]);

    const later = (delay: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, delay));
    };

    /**
     * A spell reaching across the board is drawn exactly the way a creature reaching a
     * player is: the same projectile through the board's own space and light, the same
     * flash under the card it leaves, the same shock where it lands, the same sounds on
     * the same frames. There is no second kind of orb any more.
     */
    let orbSeq = 0;
    /**
     * A spell's projectile.
     *
     * It leaves from the caster's own die. A spell has no card on the table to throw from —
     * it is in the graveyard by the time its damage lands — and throwing from the graveyard
     * pile meant every spell in the game came out of the bottom-right corner of the board,
     * which said nothing about who cast it. The die is the player, and the player is what
     * cast the spell.
     */
    const throwOrb = (
      fromKey: string,
      toKey: string,
      to: { x: number; y: number },
      [c1, c2]: [string, string],
      onLand: () => void,
    ) => {
      // A blow that lands on a player is the loud one; everything else gets a smaller ring.
      const atPlayer = toKey === 'you' || toKey === 'foe' || toKey.startsWith('hero-');
      const from = at(fromKey);
      shoot?.(fromKey, toKey, parseInt(c2.slice(1), 16));
      push({
        id: -(++orbSeq) - performance.now() / 1e6,
        kind: 'launch', x: from.x, y: from.y, c1, c2, dur: DUR.launch,
      });
      sfx.slash();
      later(FX_TIMING.boltFlight, () => {
        push({
          id: -(++orbSeq) - performance.now() / 1e6,
          kind: 'shock', x: to.x, y: to.y, c1, c2, dur: DUR.shock, small: !atPlayer,
        });
        onLand();
      });
    };

    // Only the side taking the turn is attacking, so only its row places anything.
    const columnOf = (iid?: string) => {
      const rec = iid ? column.current.get(iid) : undefined;
      return rec && rec.side === state.active ? rec.col : Number.MAX_SAFE_INTEGER;
    };
    const timeline = combatTimeline(fresh, columnOf);
    if (import.meta.env.VITE_TEST_HOOK && timeline) {
      // The order combat was actually laid out in, so a harness can read the row off it.
      (window as any).__combatOrder = fresh
        .filter((f) => f.kind === 'strike')
        .map((f) => ({
          src: f.src, tgt: f.tgt, at: timeline.at.get(f.id) ?? -1,
          col: f.src ? columnOf(f.src) : null,
        }))
        .sort((a, b) => a.at - b.at);
    }
    const startOf = (f: Fx) => timeline?.at.get(f.id) ?? f.delay ?? 0;
    if (timeline?.deaths.length) {
      const now = performance.now();
      onDeaths?.(timeline.deaths.map((d) => ({ iid: d.iid, at: now + d.at })));
    }
    /*
     * If this batch has blows aimed at a player, the life panels stop following the rules
     * and start following the blows — one step per landing — until the last of them is
     * over. Without it the dice showed the end of a four-creature attack during its first
     * swing, and then had nothing left to do.
     */
    const lifeEvents = fresh.filter((f) => f.kind === 'hitP' || f.kind === 'heal').length;
    /*
     * Any batch that moves a life total takes the gate — not just one with damage in it.
     *
     * Each of these effects steps the panel itself when it lands, and the gate is what
     * stops the panel from having already been set to the finished total by the rules
     * before the effect gets there. Healing was counted for the length of the gate but
     * never armed it, so a card that read "gain 1 life" put the panel at 21 from the rules
     * and then the heal landed and added another: 20 became 22, and the die showed +2 for
     * a point of life. It closes on its last landing either way.
     */
    if (lifeEvents > 0) {
      onLifeGate?.(lifeEvents);
      // A backstop only. The gate normally closes on its last blow having landed. There is
      // no combat timeline outside a fight, so the last of this batch's own delays stands in.
      const last = timeline?.end ?? fresh.reduce((m, f) => Math.max(m, startOf(f)), 0);
      later(last + 2500, () => onLifeGate?.(0));
    }

    for (const f of fresh) {
      seen.current.add(f.id);
      const delay = startOf(f);
      const src = at(f.src);

      switch (f.kind) {
        // The 3D board flies the drawn card itself; here we only voice it.
        case 'draw':
          later(delay, () => sfx.draw());
          break;
        /*
         * A spell that has done its work does not vanish inside a ring — the card itself
         * comes apart. The silhouette flares, cracks, and the pieces are carried off in the
         * colour of the magic that was on it.
         */
        case 'cast':
          if (typeof f.src === 'string') lastSpell.current = f.src;
          later(delay, () => {
            const [c1, c2] = hueOf(state, f.src);
            push({ id: f.id, kind: 'dissolve', x: src.x, y: src.y, c1, c2, dur: DUR.dissolve });
            sfx.cast();
            later(180, () => sfx.dissolve());
          });
          break;
        /*
         * Arrival is carried by the board itself — the card flying into its slot — plus the
         * sound. A creature coming back out of a graveyard is not an arrival, though: it is
         * the whole point of the card that did it, so it gets the grave-light.
         */
        // Arrival is carried by the board itself — the card flying into its slot — plus the
        // sound. Nothing is drawn over it, a creature returning from a graveyard included.
        case 'summon':
          later(delay, () => sfx.summon());
          break;
        /*
         * The opponent's card is held up where it can be read: centre of the screen, a
         * little above the middle, at about half the size of the hover preview. It is also
         * the stage everything that spell then does is thrown from, and the thing a
         * counterspell breaks.
         */
        case 'reveal':
          later(delay, () => {
            /*
             * The card itself is drawn by the battle screen, which keeps it up for as long
             * as the spell is on the stack — so it stays there until the response window is
             * answered rather than expiring on a timer. All that is recorded here is where
             * it is, because that is what a counterspell is aimed at.
             */
            stageAt.current = stagePoint();
            if (f.defId) onStaged?.(f.defId);
            sfx.cast();
          });
          break;
        /*
         * A swing is the projectile and nothing else. There used to be a flat white line
         * drawn between the two cards as well, which meant every attack arrived twice: a
         * bar snapping across the board and then the thing that actually hit. The bar is
         * gone. A blow aimed at a player is drawn by its own `hitP`, so a strike that
         * points at one draws nothing here at all.
         */
        case 'strike':
          if (f.tgt === 'you' || f.tgt === 'foe') break;
          later(delay, () => {
            if (!f.src || !f.tgt || !duel) return;
            const [, c2] = hueOf(state, f.src);
            duel(f.src, f.tgt, parseInt(c2.slice(1), 16));
            sfx.slash();
            // The impact lands on the frame the blades arrive, not on a guessed beat.
            later(FX_TIMING.duelFlight, () => sfx.impact());
          });
          break;
        /*
         * Damage to a creature that came from combat is already drawn by the swing that
         * caused it, and the stat plate shows the result. Damage from a spell had nothing
         * at all — the creature simply lost points and sometimes died. It now takes an orb
         * thrown from the caster's own side, in the colour of the magic that threw it, and
         * the hit lands on the frame the orb arrives.
         */
        case 'hitC':
          if (!timeline?.spellDamage.has(f.id)) break;
          later(delay, () => {
            if (!f.tgt) return;
            const spell = lastSpell.current;
            const owner = spell && state.cards[spell] ? state.cards[spell].owner : 'you';
            // No shake for a creature taking a hit. The board is full of them, and a room
            // that lurches every time one is scratched stops meaning anything when the blow
            // is aimed at a player.
            throwOrb(`hero-${owner}`, f.tgt, at(f.tgt), hueOf(state, spell ?? undefined), () => {
              sfx.hit();
              sfx.impact();
            });
          });
          break;
        case 'hitP':
          later(delay, () => {
            // The die *is* the player, so the bolt is aimed at it. The flight itself now
            // belongs to the 3D scene — it passes through the board's own space and light
            // instead of being drawn flat on top of it.
            /*
             * A creature naming itself as the source throws from where it stands. A spell
             * does not name one — the rules do not treat the card as the source of its own
             * damage — so it throws from the graveyard the spell just went to, and the
             * blow reaches the die the same way either way. Without this a burn spell took
             * the life off instantly and silently.
             */
            const spell = lastSpell.current;
            const from = f.src ?? (spell ? `hero-${state.cards[spell]?.owner ?? 'you'}` : null);
            const [c1, c2] = hueOf(state, f.src ?? spell ?? undefined);
            const hex = parseInt(c2.slice(1), 16);
            const flight = FX_TIMING.boltFlight;
            if (from && shoot) {
              const origin = at(from);
              shoot(from, `hero-${f.pid}`, hex);
              push({ id: f.id + 0.65, kind: 'launch', x: origin.x, y: origin.y, c1, c2, dur: DUR.launch });
              sfx.slash();
            }
            const impactIn = from && shoot ? flight : 0;
            later(impactIn, () => {
              const hero = at(`hero-${f.pid}`);
              push({ id: f.id + 0.8, kind: 'shock', x: hero.x, y: hero.y, c1, c2, dur: DUR.shock });
              sfx.hit();
              sfx.impact();
              onShake();
              // A blow that reaches either player is felt by the station itself: every mast
              // on the outer ring is thrown into a hard double turn.
              surge?.();
              // Sound, shake and this blow's own step of the life total, all on this frame.
              if (f.pid) onImpact?.(f.pid, f.amt ?? 0);
            });
          });
          break;
        case 'heal':
          later(delay, () => {
            const p = at(`hero-${f.pid}`);
            push({ id: f.id + 0.3, kind: 'heal', x: p.x, y: p.y, amt: f.amt, dur: DUR.heal });
            sfx.heal();
            if (f.pid) onImpact?.(f.pid, -(f.amt ?? 0));
          });
          break;
        case 'die':
        case 'exiled':
          later(delay, () => {
            const fall = () => {
              const p = at(f.src);
              push({
                id: f.id + 0.4,
                kind: f.kind === 'exiled' ? 'exile' : 'death',
                x: p.x,
                y: p.y,
                // The real card, at the size it is on the table, so what breaks is it.
                defId: defIdOf(f.src),
                size: cardPixels?.() ?? 120,
                dur: DUR.death,
              });
              // The shape breaking is a card, so the sound is a card breaking — the old
              // collapsing note belonged to a body.
              sfx.shatter();
              /*
               * Re-stamp the hold from the moment this actually ran rather than the moment
               * it was scheduled for. A stalled frame pushes the effect late, and the board
               * was releasing the slot on the schedule while the pieces were still to come.
               */
              if (f.src) onDeaths?.([{ iid: f.src, at: performance.now(), broke: true }]);
            };
            /*
             * Destroyed or exiled by a spell: the orb flies first, and the creature only
             * comes apart when it arrives — the same contract combat has.
             */
            if (timeline?.spellKills.has(f.id) && f.src) {
              const spell = lastSpell.current;
              const owner = spell && state.cards[spell] ? state.cards[spell].owner : 'you';
              throwOrb(`hero-${owner}`, f.src, at(f.src), hueOf(state, spell ?? undefined), () => {
                sfx.hit();
                sfx.impact();
                onShake();
                fall();
              });
              return;
            }
            fall();
          });
          break;
        /*
         * Regeneration. The creature is not going anywhere — the rules keep it on the
         * field, tapped and out of the fight — but what happened to it is that it was
         * destroyed, so it is drawn that way: the card comes apart exactly as a casualty
         * does, and the board holds the slot. It reassembles in the same slot when the
         * hold runs out, because the card was never taken out of the row.
         */
        case 'regen':
          later(delay, () => {
            if (!f.src) return;
            const p = at(f.src);
            push({
              id: f.id + 0.4,
              kind: 'death',
              x: p.x,
              y: p.y,
              defId: defIdOf(f.src),
              size: cardPixels?.() ?? 120,
              dur: DUR.death,
            });
            sfx.shatter();
            onDeaths?.([{ iid: f.src, at: performance.now(), broke: true }]);
          });
          break;
        /*
         * A counterspell is the one thing in the game that stops another card from ever
         * happening, and it used to be a cyan ring. It now seals the spell inside a struck
         * hexagram, cracks it, and throws the pieces outward.
         */
        /*
         * A counterspell. The spell being answered is already on stage in the middle of the
         * screen; the answer is thrown at it from the card that cast it, and the card on
         * stage breaks apart from the centre outward when it arrives.
         */
        case 'counter':
          later(delay, () => {
            /*
             * No projectile, no seal, no flash. The card being answered is up in the middle
             * of the screen and it is simply cut in half — which is what a counterspell
             * does to a card, and the only thing worth drawing.
             */
            const target = stageAt.current ?? { x: src.x, y: src.y };
            push({
              id: f.id + 0.2, kind: 'halve', x: target.x, y: target.y,
              defId: f.defId, size: stageCardHeight(), dur: DUR.halve,
            });
            sfx.counter();
            sfx.shatter(0.02);
            onStageBreak?.();
            stageAt.current = null;
          });
          break;
        case 'burst':
          later(delay, () => {
            const p = at(f.tgt);
            push({ id: f.id + 0.6, kind: 'burst', x: p.x, y: p.y, dur: DUR.burst });
            sfx.heal();
          });
          break;
        case 'discard':
        case 'mill':
          later(delay, () => {
            const p = at(`deck-${f.pid}`);
            push({ id: f.id, kind: 'discard', x: p.x, y: p.y, defId: f.defId, dur: DUR.discard });
            sfx.draw();
          });
          break;
        case 'banner':
          // The result screen is the announcement. A banner sweeping "victory" across the
          // board first meant the game was won twice.
          if (f.text === '勝利' || f.text === '敗北') break;
          later(delay, () => {
            const c = centre();
            push({ id: f.id, kind: 'banner', x: c.x, y: c.y, text: f.text, dur: DUR.banner });
            if (f.pid === 'you') sfx.bannerGood();
            else sfx.bannerBad();
          });
          break;
        case 'shake':
          later(delay, () => {
            sfx.bannerBad();
            onShake();
          });
          break;
        default:
          break;
      }
    }

    // How long this batch will keep the screen busy: the latest scheduled start plus the
    // length of the visual that starts then.
    let latest = timeline?.end ?? 0;
    for (const f of fresh) {
      const start = startOf(f);
      const own = DUR[f.kind] ?? 500;
      latest = Math.max(latest, start + own + (f.kind === 'hitP' ? 300 : 0));
    }
    onBusyUntil?.(performance.now() + latest);
    /*
     * The turn waits for combats — and now for spells too. A card held up in the middle of
     * the screen, an orb crossing to its target and the card it breaks are all things the
     * next phase used to start on top of.
     */
    const holdsTheTurn = !!timeline ||
      fresh.some((f) => ['cast', 'reveal', 'counter', 'die', 'exiled', 'summon'].includes(f.kind));
    if (holdsTheTurn) onCombatUntil?.(performance.now() + Math.max(timeline?.end ?? 0, latest));

    onDone(fresh.map((f) => f.id));
  }, [state.fx, project, onDone, onShake, onImpact, onBusyUntil, onCombatUntil, shoot, duel,
    onDeaths, surge, onLifeGate, cardPixels, onStageBreak, onStaged]);

  /*
   * Keep the row order up to date — after the sequencer, never before. Effects run in the
   * order they are written, so on the render that carries a combat the sequencer above
   * still sees the board as it stood when the attack was declared, casualties included.
   */
  useEffect(() => {
    for (const side of ['you', 'foe'] as const) {
      let i = 0;
      for (const iid of state.zones[side].field) {
        let creature = false;
        try { creature = E.defOf(state, iid)?.type === 'creature'; } catch { /* gone already */ }
        if (creature) column.current.set(iid, { side, col: i++ });
      }
    }
    if (import.meta.env.VITE_TEST_HOOK) {
      (window as any).__columns = () => Object.fromEntries(column.current);
    }
  }, [state]);

  // Retire visuals whose time is up.
  useEffect(() => {
    if (!visuals.length) return;
    const id = window.setInterval(() => {
      const now = performance.now();
      setVisuals((prev) => (prev.some((v) => v.until <= now) ? prev.filter((v) => v.until > now) : prev));
    }, 80);
    return () => window.clearInterval(id);
  }, [visuals.length]);

  return (
    <div className="fx-layer">
      {visuals.map((v) => (
        <FxVisual key={`${v.id}-${v.kind}`} v={v} />
      ))}
    </div>
  );
};

/** A hexagon's points, for the counterspell seal. */
const hexPoints = (r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');

/**
 * Deterministic scatter for the particle effects: each piece gets a direction, a distance,
 * a spin and a stagger, all derived from the effect's id so a given effect always breaks
 * apart the same way — and so nothing has to be stored between frames.
 *
 * `upward` biases every piece towards the top, which is what a creature rising out of a
 * graveyard needs and what a shattering card does not.
 */
/**
 * A card coming apart into particles. Used both by a spent spell and as the stand-in when a
 * break has no face to break — it needs no art, so it can never draw the wrong card.
 */
function dissolveInto(v: Visual, base: React.CSSProperties) {
  return (
    <span className="fx fx-dissolve" style={base}>
      {scatter(v.id, 26).map((s, i) => (
        <i key={i} className="dv-bit" style={s} />
      ))}
    </span>
  );
}

function scatter(id: number, n: number, upward = false): React.CSSProperties[] {
  return Array.from({ length: n }, (_, i) => {
    const h = ((Math.round(id * 1000) * 2654435761) ^ ((i + 1) * 40503)) >>> 0;
    const a = upward
      ? -Math.PI / 2 + (((h % 1000) / 1000) - 0.5) * 1.5
      : ((h % 1000) / 1000) * Math.PI * 2;
    const d = (upward ? 46 : 30) + ((h >>> 10) % 62);
    const spin = (((h >>> 18) % 200) - 100) * 3;
    return {
      '--dx': `${(Math.cos(a) * d).toFixed(1)}px`,
      '--dy': `${(Math.sin(a) * d).toFixed(1)}px`,
      '--spin': `${spin}deg`,
      '--sz': `${2 + ((h >>> 26) % 4)}px`,
      animationDelay: `${(h >>> 22) % 190}ms`,
    } as React.CSSProperties;
  });
}

const FxVisual: React.FC<{ v: Visual }> = ({ v }) => {
  // Every coloured visual reads its palette off these two custom properties.
  const base: React.CSSProperties = {
    left: v.x,
    top: v.y,
    ['--c1' as any]: v.c1 ?? '#ffffff',
    ['--c2' as any]: v.c2 ?? '#aebbd0',
  };
  switch (v.kind) {
    case 'draw':
    case 'discard':
      return <span className="fx fx-card" style={{ ...base, ['--x2' as any]: `${(v.x2 ?? v.x) - v.x}px`, ['--y2' as any]: `${(v.y2 ?? v.y) - v.y}px` }} />;
    case 'launch':
      return (
        <span className="fx fx-launch" style={base}>
          <i />
          <i />
        </span>
      );
    case 'burst':
      return <span className="fx fx-burst" style={base} />;
    /*
     * A spent spell coming apart. Only the pieces: the card-shaped ghost that used to flare
     * behind them read as a second, smaller card appearing on the table.
     */
    case 'dissolve':
      return dissolveInto(v, base);
    /*
     * A card leaving the board breaks like a card: six pieces of its own printed face,
     * two across and three down, thrown outward at the size it is on the table.
     */
    case 'death':
    case 'exile': {
      /*
       * The card that broke, or nothing at all.
       *
       * The six pieces are six windows onto one card face, so a face that cannot be found
       * leaves six blank rectangles tumbling off the table — which reads as the wrong
       * effect having played rather than as a missing texture. A token, or anything the
       * rules dropped from the card table before the effect got its turn, lands here. When
       * there is no face to break, it comes apart into particles instead, which needs no
       * art and is the same beat.
       */
      const def = (() => {
        if (!v.defId) return null;
        try { return E.cardDefById(v.defId) ?? null; } catch { return null; }
      })();
      if (!def) return dissolveInto(v, base);
      const h = v.size ?? 120;
      const w = h * (1.8 / 2.7);
      const face = def ? getCardBreakUrl(def as any) : null;
      // Six pieces, two across and three down. Each shows its own part of the same card
      // face, so what comes apart is the card that was there and not a stand-in for it.
      const cols = 2;
      const rows = 3;
      return (
        <span
          className={`fx fx-break${v.kind === 'exile' ? ' exiled' : ''}`}
          style={{ ...base, '--bw': `${w}px`, '--bh': `${h}px` } as React.CSSProperties}
        >
          <i className="bk-flash" />
          {Array.from({ length: cols * rows }, (_, i) => {
            const cx = i % cols;
            const cy = Math.floor(i / cols);
            const away = ((cx - (cols - 1) / 2) / cols) * 2;
            const up = ((cy - (rows - 1) / 2) / rows) * 2;
            return (
              <b
                key={i}
                className="bk-piece"
                style={{
                  left: `${-w / 2 + (cx * w) / cols}px`,
                  top: `${-h / 2 + (cy * h) / rows}px`,
                  width: `${w / cols}px`,
                  height: `${h / rows}px`,
                  backgroundImage: face ? `url(${face})` : undefined,
                  backgroundSize: `${w}px ${h}px`,
                  backgroundPosition: `${(-cx * w) / cols}px ${(-cy * h) / rows}px`,
                  '--px': `${away * 46}px`,
                  '--py': `${up * 40 + 12}px`,
                  '--pr': `${away * 34 + (i % 2 ? 8 : -8)}deg`,
                  animationDelay: `${(i % 3) * 26}ms`,
                } as React.CSSProperties}
              />
            );
          })}
          {scatter(v.id, 14).map((sp, i) => (
            <i key={`d${i}`} className="bk-dust" style={sp} />
          ))}
        </span>
      );
    }
    case 'dmg':
      return (
        <span className="fx fx-num fx-dmg" style={base}>
          -{v.amt}
        </span>
      );
    case 'heal':
      return (
        <span className="fx fx-num fx-heal" style={base}>
          +{v.amt}
        </span>
      );
    case 'bolt': {
      const dx = (v.x2 ?? v.x) - v.x;
      const dy = (v.y2 ?? v.y) - v.y;
      const len = Math.hypot(dx, dy);
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      return (
        <span
          className="fx fx-bolt"
          style={{ ...base, width: len, transform: `rotate(${ang}deg)` }}
        />
      );
    }
    case 'shock':
      return (
        <span className={`fx fx-shock${v.small ? ' small' : ''}`} style={base}>
          <i />
          <i />
          <i />
        </span>
      );
    case 'strike': {
      const dx = (v.x2 ?? v.x) - v.x;
      const dy = (v.y2 ?? v.y) - v.y;
      const len = Math.hypot(dx, dy);
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      return (
        <span
          className="fx fx-strike"
          style={{ ...base, width: len, transform: `rotate(${ang}deg)` }}
        />
      );
    }
    /*
     * The opponent's card, held up so it can be read: the real card face at about half the
     * size of the hover preview, on a plate that snaps in and holds.
     */
    case 'reveal': {
      const def = v.defId ? E.cardDefById(v.defId) : null;
      if (!def) return null;
      return (
        <span className="fx fx-stage" style={base}>
          <i className="st-glow" />
          <img src={getCardDataUrl(def as any)} alt={def.name} />
          <b>{def.name}</b>
        </span>
      );
    }
    /*
     * A counterspell: the card up on stage is cut down the middle and the two halves fall
     * away from each other. Both carry their own half of the printed face.
     */
    case 'halve': {
      const def = v.defId ? E.cardDefById(v.defId) : null;
      const h = v.size ?? 300;
      const w = h * (1.8 / 2.7);
      const face = def ? getCardDataUrl(def as any) : null;
      return (
        <span className="fx fx-halve" style={base}>
          <i className="hv-cut" style={{ height: `${h + 26}px` }} />
          {[0, 1].map((side) => (
            <b
              key={side}
              className={`hv-half ${side ? 'right' : 'left'}`}
              style={{
                left: `${-w / 2 + side * (w / 2)}px`,
                top: `${-h / 2}px`,
                width: `${w / 2}px`,
                height: `${h}px`,
                backgroundImage: face ? `url(${face})` : undefined,
                backgroundSize: `${w}px ${h}px`,
                backgroundPosition: `${(-side * w) / 2}px 0`,
              }}
            />
          ))}
        </span>
      );
    }
    // The banner centres itself with layout, so it must not take the inline
    // left/top — those would override its `inset: 0` box and push it off centre.
    case 'banner':
      return <span className="fx-banner">{v.text}</span>;
    default:
      return null;
  }
};
