/**
 * Battle screen.
 *
 * The rules, phases, AI and timings are the s version's, driven straight through its
 * extracted reducer. The board is the a version's 3D scene, so the card art, the hand
 * fan, the hover lift and the drag-to-play gesture are unchanged from that game.
 */

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as E from '../game/engine';
import type { GameState, Side } from '../game/engine';
import { BattleCanvas } from '../components/BattleCanvas';
import { zoneCards, toRenderCard, type RenderCard } from '../render/adapter';
import { slotHeld } from '../render/holdRow';
import { getCardDataUrl, getCardThumbUrl } from '../render/cardFace';
import { houseAfter, houseBefore, houseChoose, housePrompt, isHouseChoice } from '../game/house';
import { FxLayer, stagePoint, type Projector } from './FxLayer';
import { TargetLines, type Link } from './TargetLines';
import { PickStrip, type PickOption } from './PickStrip';
import { CoinFlip } from './CoinFlip';
import { Coach } from './Coach';
import { isTouch } from './device';
import { FX_TIMING } from '../render/fxTiming';
import { useCardFx } from '../render/CardFx';
import { sfx } from '../game/audio';

/** Idle phases advance on their own, at the original game's pace. */
const AUTO_ADVANCE: Record<string, number> = { untap: 420, upkeep: 350, draw: 520, end: 820 };

const PHASE_NAME: Record<string, string> = {
  untap: '重置',
  upkeep: '維持',
  draw: '抽牌',
  main1: '主要階段 1',
  atk: '宣告攻擊',
  blk: '宣告阻擋',
  blkShow: '戰鬥結算',
  main2: '主要階段 2',
  end: '結束步驟',
};

/** The heading shown above a pending choice, per the kind the engine asked for. */
function choicePrompt(choice: { kind: string; remain?: number }): string {
  switch (choice.kind) {
    case 'discard':
      return `選擇要棄掉的手牌${choice.remain ? `（還需 ${choice.remain} 張）` : ''}`;
    case 'scry':
      return `占卜：決定這張牌要留在牌頂還是放到牌底${choice.remain && choice.remain > 1 ? `（還有 ${choice.remain} 張）` : ''}`;
    case 'sacrifice':
      return '選擇要犧牲的生物';
    case 'ramp':
      return '選擇要搜尋的基本魔法石';
    default:
      return housePrompt(choice.kind) ?? '請做出選擇';
  }
}

interface PrimaryAction {
  label: string;
  act: () => void;
  enabled: boolean;
}

/** The board's own effects, published by the canvas once the scene exists. */
interface BoardFx {
  shoot: (from: string, to: string, colour: number) => void;
  duel: (from: string, to: string, colour: number) => void;
  surge: () => void;
  cardPixels: () => number;
  warmFaces: (cards: RenderCard[]) => void;
}

/** While the board is in any of these, no row may re-centre. */
const COMBAT_PHASES = new Set(['atk', 'blk', 'blkShow']);

/** How long a card stays in its slot after it has broken, outside a fight. */
const BREAK_HOLD_MS = 700;

/**
 * How long any card that leaves a row is kept there before the slot closes. Long enough
 * for the effects layer to claim it on the following frame, short enough to be invisible
 * when nothing does.
 */
const LEAVE_GRACE_MS = 280;

/**
 * The longest a slot is held waiting for a break that has been scheduled but has not run.
 * At any normal frame rate the effect arrives on time and this never applies; it exists so
 * a dropped timer cannot wedge a row open for the rest of the game.
 */
const MAX_BREAK_WAIT_MS = 4000;

/** When a held slot may close: on the break having run, or on the backstop. */
const releaseOf = (h: { at: number; broke?: number }) =>
  h.broke !== undefined ? h.broke + BREAK_HOLD_MS : h.at + MAX_BREAK_WAIT_MS;

/** The clear beat after the toss has finished before the game is allowed to start. */
const TOSS_SETTLE_MS = 1000;

/**
 * How much sooner the coin goes up than the beat that would follow the settled hand.
 * At this value it leaves the throw landing on the last card rather than after it.
 */
const TOSS_LEAD_MS = 800;

/** The least time the opponent's spell stays readable once it has left the stack. */
const STAGE_FLOOR_MS = 1500;
/** How long the board's own turn banner is on screen — see `DUR.banner` in the effects layer. */
const BANNER_MS = 1100;
/** ...and the clear beat the lesson leaves after it before it says anything. */
const COACH_QUIET_MS = 1000;

/**
 * A tutorial match the player is on the play in.
 *
 * The toss is fair, and for a lesson that is exactly wrong: the first thing the coach asks
 * for is a 魔法石, and on the draw you cannot play one until the opponent has taken a whole
 * turn — so the tutorial would open by asking for something you are not allowed to do, with
 * nothing on screen to say why. Seeds are cheap, so it takes the first one that deals the
 * player the first turn.
 */
/**
 * The hand the lesson is taught with.
 *
 * Written down rather than shuffled, because a tutorial cannot ask you to do something the
 * cards in your hand do not let you do. One 魔法石 for each of the first three turns; a
 * one-mana flyer, which is what makes the first turn teachable at all — one 魔法石 is one
 * mana, and every other creature in the set costs two, so an earlier hand had the lesson
 * asking for a summon the rules would refuse; a three-mana 結界 for the third turn, chosen
 * because it lifts the whole board rather than one creature, which is what a 結界 is for; a
 * two-mana colourless 法術 for the chapter that shows a spell being aimed and spent; and an
 * instant for the answering chapter.
 */
const TUT_HAND = ['skyshoal', 'skyshoal', 'skyshoal', 'u_wisp', 'seal', 'c_arc_bolt',
  'u_dispel', 'gold_sky_marshal'];

/**
 * The board the lesson opens on: nothing on it.
 *
 * Everything used to be pre-placed — two 魔法石 and a creature a side, already standing when
 * the camera landed. That is a board that was never played, and the first thing a first-timer
 * sees is a table that assembled itself while they were not looking. Now the table starts
 * empty and fills the way it will for the rest of the game: the player plays their own cards
 * with their own arrival animations, and the opponent is given exactly one creature to cast
 * so their side arrives the same way.
 */
function stageTutorial(m: any): GameState {
  let n = 0;
  const make = (defId: string) => {
    const iid = `tut${(n += 1)}`;
    m.cards[iid] = { iid, defId, owner: 'you', tapped: false, sick: false, damage: 0 };
    m.zones.you.hand.push(iid);
    return iid;
  };
  m.zones.you.hand.length = 0;
  for (const id of TUT_HAND) make(id);
  /*
   * Nothing of theirs is cast until the defending chapter is next in line.
   *
   * Every chapter should be the first time the player meets the thing it teaches: the first
   * attack they ever take should be the one the defending chapter is about, and being swung
   * at three turns earlier by a creature nobody explained spends that first time on nothing.
   * There is no exempt creature any more — the whole hand is held, and released as a group
   * when defending comes round, which is several turns before the step itself opens because
   * the step waits for them to actually declare an attack.
   */
  m.tutHold = true;
  m.tutStash = [];
  /*
   * Two switches, not one.
   *
   * `tutHold` keeps their creature spells out of their hand; `tutMute` declines the board's
   * 是否反擊該咒語 window on the player's behalf. They used to be the same switch, which
   * forced a choice between an opponent who never develops — and therefore never attacks, so
   * the defending chapter has nothing to defend against — and a question the player is asked
   * several chapters before the lesson says what it means. Separated: the creatures come back
   * when defending is taught, the question comes back when answering is taught.
   */
  m.tutMute = true;
  m.tutAllow = null;
  return m as GameState;
}

/**
 * While the lesson is holding them back, every creature the opponent draws is lifted out of
 * their hand and put aside. It runs on the way out of the reducer, so it catches the draw
 * step and the opening hand alike, and it is a no-op — the same state object back — for every
 * game that is not the tutorial and for every turn of the tutorial after the release.
 */
function holdFoeCreatures(s: any): any {
  if (!s?.tutHold) return s;
  const hand: string[] = s.zones.foe.hand;
  const lift = hand.filter((i) => {
    try { return E.defOf(s, i)?.type === 'creature'; } catch { return false; }
  });
  if (!lift.length) return s;
  return {
    ...s,
    tutStash: [...(s.tutStash ?? []), ...lift],
    zones: { ...s.zones, foe: { ...s.zones.foe, hand: hand.filter((i) => !lift.includes(i)) } },
  };
}

function teachableMatch(youDeck: string, foeDeck: string): GameState {
  for (let seed = 1; seed <= 40; seed += 1) {
    const m = E.createMatch(youDeck, foeDeck, seed) as GameState;
    if (m.first === 'you') return holdFoeCreatures(stageTutorial(m));
  }
  return holdFoeCreatures(stageTutorial(E.createMatch(youDeck, foeDeck)));
}

interface Props {
  youDeck: string;
  foeDeck: string;
  onExit: () => void;
  /** The guided first game: the same board, with the coach's light over it. */
  coach?: boolean;
  /** Called when the coach is dismissed; the match carries on without it. */
  onCoachDone?: () => void;
}

export const Battle: React.FC<Props> = ({ youDeck, foeDeck, onExit, coach, onCoachDone }) => {
  const [state, dispatch] = useReducer(
    ((prev: GameState, action: any) => {
      /*
       * One picker belongs to the house layer rather than to the engine, so it answers it
       * itself; everything else is the engine's, with the house layer looking at the action
       * on the way in and at the state on the way out.
       */
      /*
       * The lesson's other private action: handing the opponent their creatures back.
       *
       * Until this fires, every creature that reaches their hand is lifted straight back out
       * of it (see the sweep below), which is what stops them casting one. Refusing the cast
       * instead would have been the obvious way and is the wrong one — the opponent would
       * simply plan the same cast again on the next state and the turn would never move.
       * Taking the cards out of the hand means there is nothing to plan, so the turn plays
       * on by itself.
       */
      if (action?.t === 'tutorialRelease') {
        const s = prev as any;
        if (!s.tutHold) return prev;
        return {
          ...s,
          tutHold: false,
          tutStash: [],
          zones: { ...s.zones, foe: { ...s.zones.foe, hand: [...s.zones.foe.hand, ...(s.tutStash ?? [])] } },
        } as GameState;
      }
      if (action?.t === 'tutorialUnmute') {
        const s = prev as any;
        return s.tutMute ? ({ ...s, tutMute: false } as GameState) : prev;
      }
      if (action?.t === 'choose' && isHouseChoice((prev as any).choice?.kind)) {
        return houseChoose(prev, action.key);
      }
      const screened = houseBefore(prev, action);
      if (screened.verdict === 'refuse') return prev;
      const input = screened.verdict === 'amend' ? screened.state : prev;
      return holdFoeCreatures(houseAfter(input, (E.reducer as any)(input, action), action));
    }) as any,
    null,
    () => (coach ? teachableMatch(youDeck, foeDeck) : E.createMatch(youDeck, foeDeck)) as GameState,
  ) as [GameState, (a: any) => void];

  const latest = useRef(state);
  latest.current = state;

  const [preview, setPreview] = useState<RenderCard | null>(null);
  const fx = useCardFx();
  /*
   * Shift turns the big preview off while it is held. It covers the left of the board, and
   * during a fight that is sometimes exactly where you need to look — so rather than a
   * setting to go and find, it is a key you lean on for as long as you want it gone.
   */
  const [peekOff, setPeekOff] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredHero, setHoveredHero] = useState<Side | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [shownLife, setShownLife] = useState({ you: 20, foe: 20 });
  /*
   * Seeded to the middle of the screen rather than (0,0): the aiming arrow is drawn to the
   * last known pointer, and before the very first pointermove that was the top-left corner
   * — which is why the line sometimes failed to appear on the first block of a game.
   */
  const lastPointer = useRef<{ x: number; y: number }>({
    x: typeof window === 'undefined' ? 640 : window.innerWidth / 2,
    y: typeof window === 'undefined' ? 400 : window.innerHeight / 2,
  });
  const aimingRef = useRef(false);
  const [selectedBlocker, setSelectedBlocker] = useState<string | null>(null);
  /** A one-line reason shown in the block bar when a click could not do what was asked. */
  const [blockNote, setBlockNote] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [shake, setShake] = useState(0);
  const [drawTick, setDrawTick] = useState({ you: 0, foe: 0 });
  const seenDrawFx = useRef<Set<number>>(new Set());
  const projectorRef = useRef<Projector | null>(null);
  /**
   * What the tutorial is pointing at, as board keys. Null renders normally; the board
   * darkens itself and redraws exactly these, so the light is the object's own outline.
   */
  const [coachSpot, setCoachSpot] = useState<string[] | null>(null);
  /** The board's 3D effects API, once the canvas has published it. */
  const fxApiRef = useRef<BoardFx | null>(null);
  const onFxApi = useCallback((api: BoardFx) => {
    fxApiRef.current = api;
    /*
     * Draw every face in both decks now, while the coin is still in the air. A card's face
     * has to be rasterised and uploaded before it can be shown, and paying for that at the
     * moment the card hits the table is the stutter — so it is paid here instead, in idle
     * slots, before the game has started.
     */
    const s = latest.current;
    const seen = new Set<string>();
    const warm: RenderCard[] = [];
    /*
     * On a phone, only the hand.
     *
     * Warming both libraries means rasterising every distinct card in a hundred and twenty
     * — forty or fifty faces — and holding a texture for each. At half a megapixel apiece
     * that is the better part of a hundred megabytes and a second or two of drawing, and on
     * a phone it lands as exactly what it looks like: the opening is molten and the device
     * gets hot. The cards that are about to be *seen* are the seven in hand; everything else
     * is made when it is drawn, which now costs a quarter of what it did.
     */
    const zones = isTouch() ? (['hand'] as const) : (['lib', 'hand', 'field'] as const);
    const sides: Side[] = isTouch() ? ['you'] : ['you', 'foe'];
    for (const side of sides) {
      for (const zone of zones) {
        for (const iid of s.zones[side][zone]) {
          const defId = s.cards[iid]?.defId;
          if (!defId || seen.has(defId)) continue;
          seen.add(defId);
          try { warm.push(toRenderCard(s, iid, side)); } catch { /* not renderable */ }
        }
      }
    }
    api.warmFaces(warm);
  }, []);
  const surge = useCallback(() => fxApiRef.current?.surge(), []);
  const cardPixels = useCallback(() => fxApiRef.current?.cardPixels() ?? 120, []);
  const [projectorReady, setProjectorReady] = useState(0);
  const winSoundPlayed = useRef(false);
  const [overReady, setOverReady] = useState(false);
  /** The opening toss, shown once, before anybody may act. */
  /*
   * The lesson skips the toss. It is a fixed match on a written hand — there is nothing to
   * decide — and four seconds of a coin before the first sentence is four seconds of a
   * first-timer looking at a coin.
   */
  const [tossDone, setTossDone] = useState(!!coach);
  /** True once the opening camera move has landed — the flat chrome rides in on this. */
  const [introDone, setIntroDone] = useState(false);
  /** True once the opening hand has finished being dealt, which is what the toss waits for. */
  const [dealtIn, setDealtIn] = useState(false);
  /*
   * The lesson holds its tongue while the board announces a turn.
   *
   * 「你的回合」 is thrown across the middle of the screen for just over a second, and a
   * tutorial sentence arriving underneath it is two things asking to be read at once. So a
   * turn change opens a quiet window — the banner, plus a clear second after it — and the
   * coach says nothing until it closes. It is re-armed on every turn, not only the first.
   */
  const [quiet, setQuiet] = useState(true);
  /**
   * The opponent's spell, held up in the middle of the screen where it can be read.
   *
   * It is bound to the stack rather than to a timer: while their spell is waiting on it —
   * which is exactly as long as my window to answer stays open — the card stays up. It
   * comes down when the spell resolves, or on the frame a counterspell's orb breaks it.
   */
  const [staged, setStaged] = useState<{ defId: string; at: number } | null>(null);
  const onStageBreak = useCallback(() => setStaged(null), []);
  const onStaged = useCallback((defId: string) => {
    setStaged((prev) => (prev?.defId === defId ? prev : { defId, at: performance.now() }));
  }, []);

  /*
   * Nothing on the board answers the pointer until the coin has finished.
   *
   * The hand exists in the rules from the moment the match is created, so the reader would
   * open over a fan that had not been dealt yet — you could hold a card that was still on
   * the library and read it, while the coin was still in the air. A ref rather than the
   * state itself, so the handlers below are not rebuilt on every turn of the toss.
   */
  const liveRef = useRef(false);

  const onHover = useCallback((c: RenderCard | null) => {
    if (!liveRef.current) return;
    setPreview(c);
    setHovered(c ? c.instanceId : null);
  }, []);

  const onProjector = useCallback((p: Projector) => {
    projectorRef.current = p;
    setProjectorReady((n) => n + 1);
  }, []);

  /*
   * Where a board object is on screen, as one function that never changes identity.
   *
   * It used to be written inline at the call site, which made it a new function on every
   * render of this screen — and the tutorial's pointer keys its reach animation on the
   * function it was given, so every render restarted the line. Picking a card up is a
   * render; so the line replayed its arrival every time the hand was touched.
   */
  const project = useCallback((key: string) => projectorRef.current?.(key) ?? null, []);

  // ---- drivers -------------------------------------------------------------

  /*
   * How long the board will keep talking, as `performance.now()` stamps.
   *
   * `busyUntil` covers every effect and holds the result screen back, so a lethal last
   * swing is still seen. `combatUntil` covers only combats, and holds the *turn* back:
   * nothing advances a phase and the opponent takes no new action until the last swing has
   * landed. Without that, a combat with four blows in it was still playing when "your
   * turn" appeared over the top of it. The two are separate because gating the turn on
   * every effect would stall the game behind every banner and reveal as well.
   */
  const busyUntil = useRef(0);
  const combatUntil = useRef(0);
  const noteBusy = useCallback((stamp: number) => {
    busyUntil.current = Math.max(busyUntil.current, stamp);
  }, []);
  const noteCombat = useCallback((stamp: number) => {
    combatUntil.current = Math.max(combatUntil.current, stamp);
  }, []);

  /*
   * Nothing moves while the coin is in the air, and nothing moves for a beat after it.
   *
   * This used to stamp the gate once, three and a half seconds ahead, at the moment the
   * screen mounted — but the coin is not thrown then. It waits for the opening camera and
   * then for the whole hand to be dealt, by which time the stamp had long expired and the
   * opponent was free to play a card over the top of the toss. So the gate is now re-stamped
   * for as long as the coin is actually on screen, and given one clear second afterwards.
   */
  useEffect(() => {
    if (tossDone) {
      combatUntil.current = Math.max(combatUntil.current, performance.now() + TOSS_SETTLE_MS);
      return;
    }
    const hold = () => {
      combatUntil.current = Math.max(combatUntil.current, performance.now() + 400);
    };
    hold();
    const id = window.setInterval(hold, 200);
    return () => window.clearInterval(id);
  }, [tossDone]);

  /**
   * Waits `ms`, then keeps waiting while the board is still busy — re-checking rather than
   * computing a deadline once, because a batch of effects can be queued after the timer is
   * already set and would otherwise be cut off.
   */
  const afterBoardSettles = useCallback((ms: number, fn: () => void) => {
    let cancelled = false;
    let timer = 0;
    const tick = () => {
      if (cancelled) return;
      const left = combatUntil.current - performance.now();
      if (left > 0) {
        timer = window.setTimeout(tick, Math.min(200, left + 25));
        return;
      }
      fn();
    };
    timer = window.setTimeout(tick, ms);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!coach) return;
    setQuiet(true);
    return afterBoardSettles(BANNER_MS + COACH_QUIET_MS, () => setQuiet(false));
    // The active player changing is what puts a banner up, so that is what re-arms this.
  }, [coach, state.turn, state.active, afterBoardSettles]);

  /*
   * And it is not asked whether to answer a spell before it has been told what that is.
   *
   * The opponent puts a creature on the table on their first turn, and the board — correctly,
   * for a real game — stops and asks whether I want to respond, because there is an instant
   * in my hand I could pay for. In the lesson that question arrives several chapters early,
   * with nothing on screen to say what it means and no way to get on with it. So while the
   * lesson is still holding their creature spells back, the window is declined for you.
   */
  useEffect(() => {
    if (!coach || !(state as any).tutMute) return;
    if (state.awaitResp !== 'you') return;
    return afterBoardSettles(120, () => dispatch({ t: 'skipResponse' }));
  }, [coach, state.awaitResp, (state as any).tutMute, state.seq, afterBoardSettles]);

  // Idle phases tick forward by themselves, once the board has nothing left to say.
  useEffect(() => {
    if (state.winner || state.choice) return;
    const ms = AUTO_ADVANCE[state.phase];
    if (ms === undefined) return;
    return afterBoardSettles(ms, () => dispatch({ t: 'advance' }));
  }, [state.seq, state.winner, !!state.choice, afterBoardSettles]);

  // The opponent plans, waits its own beat, then acts on the freshest state.
  useEffect(() => {
    if (state.winner) return;
    const plan = E.aiPlan(state);
    if (!plan) return;
    return afterBoardSettles(plan.delay, () => {
      const next = E.aiPlan(latest.current);
      if (next) dispatch({ t: 'aiAct', act: next.act });
    });
  }, [state.seq, state.winner, afterBoardSettles]);

  useEffect(() => {
    if (!state.winner) {
      setOverReady(false);
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const left = busyUntil.current - performance.now();
      if (left > 0) {
        window.setTimeout(tick, Math.min(320, left + 40));
        return;
      }
      setOverReady(true);
    };
    // One beat first, so the killing blow's own effects get queued before we measure.
    const t = window.setTimeout(tick, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [state.winner]);

  useEffect(() => {
    if (!overReady || winSoundPlayed.current) return;
    winSoundPlayed.current = true;
    latest.current.winner === 'you' ? sfx.victory() : sfx.defeat();
  }, [overReady]);

  /*
   * A refusal clears itself. The standing instruction row is gone, but a click that cannot
   * do what was asked still has to say so — silently ignoring it is what made the board
   * feel broken — so it speaks once, briefly, and disappears.
   */
  useEffect(() => {
    if (!blockNote) return;
    const t = window.setTimeout(() => setBlockNote(null), 1700);
    return () => window.clearTimeout(t);
  }, [blockNote]);

  // Blocker selection is only meaningful during the block step.
  useEffect(() => {
    if (state.phase !== 'blk') setSelectedBlocker(null);
    setBlockNote(null);
  }, [state.phase]);

  // While a spell is waiting for a target the arrow follows the pointer, so there is
  // always something to aim with rather than only when you are over a legal target.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      lastPointer.current = { x: e.clientX, y: e.clientY };
      if (aimingRef.current) setCursor(lastPointer.current);
    };
    // A press updates it too, so the arrow is anchored correctly even if the click that
    // started the aim was the first pointer event of the match.
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
    };
  }, []);

  // Seed the arc from the last known pointer the moment aiming begins.
  useEffect(() => {
    const aiming = !!state.pending || (state.phase === 'blk' && !!selectedBlocker);
    aimingRef.current = aiming;
    setCursor(aiming ? lastPointer.current : null);
  }, [state.pending, state.phase, selectedBlocker]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Shift') { setPeekOff(true); return; }
      if (e.key !== 'Escape') return;
      if (latest.current.pending) dispatch({ t: 'cancelPending' });
      else setSelectedBlocker(null);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setPeekOff(false);
    };
    /*
     * Alt-tabbing away with shift down never delivers the keyup, and the preview would stay
     * off with nothing to explain why. Losing the window puts it back.
     */
    const onBlur = () => setPeekOff(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  /**
   * What the life dice show.
   *
   * The rules apply every point of a combat's damage the instant it resolves, so the true
   * total is already final before the first projectile has left the board. Left to follow
   * it, the dice spent the whole of the first blow tumbling down to the number four
   * creatures would eventually leave you on, and then sat still through the other three.
   *
   * So while a run of blows is being drawn the panels are driven by the blows rather than
   * by the rules: one step, and one roll of the die, each time something actually lands.
   * The gate is reconciled against the real totals when the run ends, so nothing can drift.
   */
  const lifeGated = useRef(false);
  /**
   * How many blows the gate is still waiting for. It closes on the last one having landed
   * rather than on a stopwatch: a stalled frame can push a projectile's arrival past any
   * deadline computed in advance, and closing early snapped the panels to the true total
   * and then let the straggler subtract its damage a second time.
   */
  const lifeLeft = useRef(0);
  const closeLifeGate = useCallback(() => {
    if (!lifeGated.current) return;
    lifeGated.current = false;
    lifeLeft.current = 0;
    setShownLife({ ...latest.current.life });
  }, []);
  const setLifeGate = useCallback((pending: number) => {
    if (import.meta.env.VITE_TEST_HOOK) {
      ((window as any).__lifeSteps ??= []).push({ gate: pending, t: Math.round(performance.now()) });
    }
    if (pending > 0) {
      lifeGated.current = true;
      lifeLeft.current = pending;
      return;
    }
    closeLifeGate();
  }, [closeLifeGate]);
  const armLife = useCallback((pid: Side, delta: number) => {
    if (import.meta.env.VITE_TEST_HOOK) {
      ((window as any).__lifeSteps ??= []).push({ pid, delta, t: Math.round(performance.now()) });
    }
    setShownLife((prev) => ({ ...prev, [pid]: Math.max(0, prev[pid] - delta) }));
    if (lifeGated.current && --lifeLeft.current <= 0) closeLifeGate();
  }, [closeLifeGate]);

  useEffect(() => {
    if (lifeGated.current) return;
    setShownLife((prev) =>
      prev.you === state.life.you && prev.foe === state.life.foe ? prev : { ...state.life });
  }, [state.life.you, state.life.foe]);

  /*
   * Test hook. Only builds made with VITE_TEST_HOOK expose the match, so a harness can
   * set up an exact board position instead of clicking blindly through a shuffled game.
   * The shipped file compiles this to a constant `false` branch, so there is no back door
   * into the state in the released HTML.
   */
  useEffect(() => {
    if (!import.meta.env.VITE_TEST_HOOK) return;
    (window as any).__battle = {
      state,
      dispatch,
      project: projectorRef.current,
      // Card definitions, so a harness can tell a creature from a land without guessing.
      defOf: (iid: string) => {
        try { return E.defOf(latest.current, iid); } catch { return null; }
      },
      // The whole set, so a harness can name the card it wants to stage.
      pool: E.CARDS,
      // Raise a card onto the stage by hand: the opponent will not cast one on demand.
      stage: (defId: string | null) =>
        setStaged(defId ? { defId, at: performance.now() } : null),
      // Pick a blocker up without a raycast, so the defending step can be checked.
      hold: (iid: string | null) => setSelectedBlocker(iid),
      // Whether the rules would let a card be played right now, so a harness can tell a
      // refusal apart from a bug in itself.
      canPlay: (iid: string) => {
        try { return E.canPlay(latest.current, 'you', iid); } catch (e) { return String(e); }
      },
    };
  }, [state]);

  liveRef.current = tossDone;
  if (import.meta.env.VITE_TEST_HOOK) {
    // What the life panels are actually showing, as opposed to what the rules say.
    (window as any).__shownLife = shownLife;
    (window as any).__handLive = tossDone;
    // What the lesson has asked the board to keep lit.
    (window as any).__coachKeys = coachSpot;
  }

  const triggerShake = useCallback(() => {
    setShake((n) => n + 1);
    window.setTimeout(() => setShake((n) => Math.max(0, n - 1)), 420);
  }, []);

  const fxDone = useCallback((ids: number[]) => dispatch({ t: 'fxDone', ids }), []);

  // The board plays its own card-flight animation on a draw; drive it from the
  // engine's draw effects rather than from hand size, which also changes on casts.
  useEffect(() => {
    let you = 0;
    let foe = 0;
    for (const f of state.fx) {
      if (f.kind !== 'draw' || seenDrawFx.current.has(f.id)) continue;
      seenDrawFx.current.add(f.id);
      if (f.pid === 'you') you++;
      else if (f.pid === 'foe') foe++;
    }
    if (you || foe) setDrawTick((prev) => ({ you: prev.you + you, foe: prev.foe + foe }));
  }, [state.fx]);

  // ---- derived view data ---------------------------------------------------

  /*
   * A spell that needs a target is pulled out of every zone by the engine while it waits,
   * so it would simply vanish mid-cast — and the aiming arrow, which starts at the card,
   * would have nothing to start from. Put it back in the fan at the slot it came from
   * until the target is chosen; the board raises it and the arrow leaves its top edge.
   */
  const castSlot = useRef(0);
  const hand = useMemo(() => {
    const cards = zoneCards(state, 'you', 'hand');
    const aiming = state.pending?.card;
    // Only a card the engine has taken out of play entirely needs putting back. An
    // entering creature aiming its own arrival trigger is already on the battlefield.
    const homeless =
      !!aiming &&
      (['lib', 'hand', 'field', 'gy', 'exile'] as const).every(
        (z) => !state.zones.you[z].includes(aiming) && !state.zones.foe[z].includes(aiming),
      );
    if (aiming && homeless) {
      const at = Math.min(Math.max(0, castSlot.current), cards.length);
      cards.splice(at, 0, toRenderCard(state, aiming, 'you'));
    }
    return cards;
  }, [state]);
  /*
   * A creature that dies in combat is gone from the engine the instant the rules resolve,
   * which meant it dissolved off the board before anything had visibly hit it. The effects
   * layer now says when each killing blow actually lands, and until that moment the
   * creature is kept in the list the board is drawing — so it stands there and takes the
   * hit, and only then comes apart.
   */
  const cardCache = useRef<Map<string, RenderCard>>(new Map());
  /**
   * The order each row was last drawn in while nothing was dying. Held casualties are
   * slotted back into it, so a card that dies in the middle of a row leaves a gap where it
   * stood instead of being appended to the end and shunting everything after it along.
   */
  const orderRef = useRef<Record<Side, string[]>>({ you: [], foe: [] });
  /** When each card dropped out of its row, so a late hold can still claim it. */
  const leftAt = useRef<Record<string, number>>({});
  /**
   * Each casualty the board is still drawing: `at` is when it comes apart, `broke` the
   * moment the effect that broke it actually ran. The two are not the same thing — a
   * stalled frame pushes the effect past its schedule — and releasing the slot on the
   * schedule took the card away while its pieces were still to come.
   */
  const [heldDeaths, setHeldDeaths] = useState<Record<string, { at: number; broke?: number }>>({});
  /** Bumped whenever a hold crosses one of its two moments, so the rows redraw. */
  const [holdTick, setHoldTick] = useState(0);

  const onDeaths = useCallback((list: { iid: string; at: number; broke?: boolean }[]) => {
    if (!list.length) return;
    setHeldDeaths((prev) => {
      const next = { ...prev };
      for (const d of list) {
        next[d.iid] = d.broke
          ? { at: prev[d.iid]?.at ?? d.at, broke: d.at }
          : { at: d.at };
      }
      return next;
    });
  }, []);

  /*
   * The rows are frozen for the whole of a combat, not for the length of one batch of
   * effects. Declaring attackers, declaring blockers and resolving damage are three
   * separate steps, and a creature can leave the board during any of them — an instant in
   * the block step, first strike killing something a step before ordinary damage. Closing
   * the gap between steps still slid every other card sideways while the fight was going
   * on, so the layout is now held from the moment combat begins until the phase is over
   * *and* the last animation has finished.
   */
  const [frozen, setFrozen] = useState(false);
  useEffect(() => {
    if (COMBAT_PHASES.has(state.phase)) {
      setFrozen(true);
      return;
    }
    let cancelled = false;
    let timer = 0;
    const tick = () => {
      if (cancelled) return;
      const left = combatUntil.current - performance.now();
      if (left > 0) {
        timer = window.setTimeout(tick, Math.min(200, left + 25));
        return;
      }
      setFrozen(false);
    };
    tick();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [state.phase, holdTick]);

  /*
   * A casualty is held whether or not there is a fight on. Outside combat the hold is
   * short — just long enough for the orb a spell threw to arrive — but it has to exist:
   * without it the card was gone from the table on the frame the target was clicked, and
   * the effect that was supposed to break it played over an empty slot.
   */
  useEffect(() => {
    if (frozen) return;
    const holds = Object.values(heldDeaths) as { at: number; broke?: number }[];
    if (!holds.length) return;
    const now = performance.now();
    const ends = holds.map(releaseOf);
    if (ends.every((t) => t <= now)) {
      setHeldDeaths({});
      return;
    }
    const next = Math.min(...ends.filter((t) => t > now));
    const timer = window.setTimeout(() => setHoldTick((n) => n + 1), Math.max(16, next - now));
    return () => window.clearTimeout(timer);
  }, [frozen, heldDeaths, holdTick]);

  /*
   * And a casualty still has to come apart on the frame its own killing blow lands. Wake
   * for each of those moments.
   */
  useEffect(() => {
    const pending = (Object.values(heldDeaths) as { at: number }[])
      .map((h) => h.at)
      .filter((t) => t > performance.now());
    if (!pending.length) return;
    const timer = window.setTimeout(
      () => setHoldTick((n) => n + 1),
      Math.max(16, Math.min(...pending) - performance.now()),
    );
    return () => window.clearTimeout(timer);
  }, [heldDeaths, holdTick]);

  const withHeld = useCallback((live: RenderCard[], side: Side) => {
    for (const c of live) cardCache.current.set(c.instanceId, c);
    const now = performance.now();
    // `holdTick` is what re-runs this once a blow has landed; the flag itself reads the clock.
    void holdTick;

    /*
     * Every card that leaves a row is kept for a moment.
     *
     * The reason is an ordering one, and it bit: the rules remove a card, React renders the
     * row without it, and only *then* does the effects layer get to say "hold that one, its
     * orb is still in the air". By that point the slot was already closed and there was
     * nothing left to break — the card vanished on the click and the effect played over an
     * empty table. So the row holds anything that disappears for a short grace, and the
     * effects layer extends that hold for the ones it is about to break.
     */
    const order = orderRef.current[side];
    for (const iid of order) {
      if (!live.some((c) => c.instanceId === iid) && leftAt.current[iid] === undefined) {
        leftAt.current[iid] = now;
      }
    }
    for (const c of live) delete leftAt.current[c.instanceId];

    const holdUntil = (iid: string) => Math.max(
      (leftAt.current[iid] ?? -Infinity) + LEAVE_GRACE_MS,
      heldDeaths[iid] ? releaseOf(heldDeaths[iid]) : -Infinity,
    );
    const waiting = (iid: string) => frozen || holdUntil(iid) > now;

    /*
     * A creature that regenerated is still in the row — the rules kept it, tapped and out
     * of the fight — but what happened to it was that it was destroyed, so it comes apart
     * where it stands and reassembles in the same slot when the hold runs out. It is the
     * same flag a casualty uses; the difference is that this one is still on the board to
     * come back to. Nothing else reaches this branch: a card the rules have removed is not
     * in `live` by the time the effects layer names it.
     */
    const downed = (iid: string) => {
      const h = heldDeaths[iid];
      return !!h && h.at <= now && releaseOf(h) > now;
    };
    const shown = live.some((c) => downed(c.instanceId))
      ? live.map((c) => (downed(c.instanceId) ? { ...c, fallen: true } : c))
      : live;

    const ghosts = [...new Set([...order, ...Object.keys(heldDeaths)])]
      .filter((iid) => !live.some((c) => c.instanceId === iid) &&
        cardCache.current.get(iid)?.side === side && waiting(iid))
      /*
       * A casualty the effects layer named waits for its blow. Anything else — sacrificed,
       * bounced — has nothing to wait for, so it collapses at once. Either way the slot
       * stays until the hold runs out.
       */
      .map((iid) => ({
        ...cardCache.current.get(iid)!,
        fallen: (heldDeaths[iid]?.at ?? 0) <= now,
      }));

    if (!ghosts.length) {
      orderRef.current[side] = live.map((c) => c.instanceId);
      return shown;
    }
    // Keep the pre-death order so a ghost sits where it stood, not at the end of the row.
    const kept = [...order, ...live.map((c) => c.instanceId).filter((i) => !order.includes(i))];
    orderRef.current[side] = kept;
    return slotHeld(shown, ghosts, kept);
  }, [frozen, heldDeaths, holdTick]);

  /* Wake when the shortest grace runs out, so a released slot actually closes. */
  useEffect(() => {
    const now = performance.now();
    const next = (Object.values(leftAt.current) as number[])
      .map((t) => t + LEAVE_GRACE_MS)
      .filter((t) => t > now)
      .sort((a, b) => a - b)[0];
    if (next === undefined) return;
    const timer = window.setTimeout(() => setHoldTick((n) => n + 1), Math.max(16, next - now));
    return () => window.clearTimeout(timer);
  });

  const youField = useMemo(
    () => withHeld(zoneCards(state, 'you', 'field'), 'you'), [state, withHeld]);
  const foeField = useMemo(
    () => withHeld(zoneCards(state, 'foe', 'field'), 'foe'), [state, withHeld]);
  const youGy = useMemo(() => zoneCards(state, 'you', 'gy'), [state]);
  const foeGy = useMemo(() => zoneCards(state, 'foe', 'gy'), [state]);
  const mana = useMemo(() => E.availableMana(state, 'you'), [state]);
  const foeMana = useMemo(() => E.availableMana(state, 'foe'), [state]);

  /*
   * Raise the opponent's card while their spell sits on the stack, and take it down a
   * moment after it leaves — a spell that nobody could answer is on and off the stack
   * inside one reducer call, so a short floor keeps it readable either way.
   */
  const onStack = state.stack && state.stack.caster === 'foe' ? state.stack.card : null;

  /*
   * Anything of mine that is mid-flight: aiming a spell, or one of my own on the stack.
   *
   * The response window is not only answered with counterspells. With their spell up and the
   * board asking whether I want to answer it, I can play any instant I can pay for — save
   * the creature they are about to burn, say — and while that spell of mine is being aimed
   * and resolved, their card is still hanging in the middle of the screen with 是否反擊該咒語
   * under it: a question about a spell, printed over the top of the spell I am casting to
   * answer it. So their card steps aside for the length of my own action.
   */
  const mineInFlight = !!state.pending || state.stack?.caster === 'you';
  const [answered, setAnswered] = useState(false);
  const [holdStage, setHoldStage] = useState(false);

  useEffect(() => {
    if (mineInFlight) { setAnswered(true); setHoldStage(true); return; }
    if (!holdStage) return;
    // A beat after my spell has finished, so its own effects are not cut off by their card
    // coming back over the top of them.
    return afterBoardSettles(360, () => setHoldStage(false));
  }, [mineInFlight, holdStage, afterBoardSettles]);

  // A new spell of theirs is a new question, so the window is unspent again. Keyed on the
  // card rather than on the moment it went up: the same spell re-stamped is the same question.
  useEffect(() => { setAnswered(false); }, [staged?.defId]);

  useEffect(() => {
    // Frozen while my own spell is in flight: the foe's card leaves the stack the moment
    // mine goes on it, and clearing it here would take their card away for good.
    if (mineInFlight || holdStage) return;
    if (onStack) {
      const defId = state.cards[onStack]?.defId;
      if (defId) onStaged(defId);
      return;
    }
    if (!staged) return;
    const left = Math.max(0, staged.at + STAGE_FLOOR_MS - performance.now());
    const timer = window.setTimeout(() => setStaged(null), left);
    return () => window.clearTimeout(timer);
  }, [onStack, staged, state.cards, onStaged, mineInFlight, holdStage]);

  /*
   * ...and comes back only if there is still an answer to give. Having spent the mana on
   * something else, the question 是否反擊該咒語 may no longer have a yes in it — and a
   * question you cannot answer is not a question, it is a card in the way. So once I have
   * used the window, their card returns only while something in my hand is still playable.
   */
  const canStillAnswer = useMemo(
    () => state.zones.you.hand.some((i) => E.canPlay(state, 'you', i)),
    [state],
  );
  const showStaged = !!staged && !mineInFlight && !holdStage && (!answered || canStillAnswer);

  const legalTargets = useMemo(
    () => new Set([...(state.pending?.legal ?? []), ...(state.pending?.legalP ?? [])]),
    [state.pending],
  );

  /*
   * Some targets are not on the table. A reanimation spell reaches into a graveyard, and a
   * graveyard is a stack of face-down cards on the edge of the board — there is nothing
   * there to aim an arrow at, so the spell simply could not be pointed anywhere and the
   * cast stalled. When every legal target is off the battlefield the picker opens instead.
   */
  const offBoardTargets = useMemo(() => {
    const legal = state.pending?.legal ?? [];
    if (!legal.length || (state.pending?.legalP?.length ?? 0)) return null;
    const onBoard = new Set([...state.zones.you.field, ...state.zones.foe.field]);
    if (legal.some((iid) => onBoard.has(iid))) return null;
    return legal;
  }, [state.pending, state.zones.you.field, state.zones.foe.field]);

  const busy = !!state.stack || !!state.pending || !!state.choice;

  /** Which cards the current step invites you to click. */
  const highlightIds = useMemo(() => {
    if (state.pending) return [...legalTargets];
    if (state.phase === 'atk') {
      return E.creaturesOf(state, 'you').filter((i) => E.canAttack(state, i));
    }
    // Only while *you* are the defender: during your own attack the block step belongs
    // to the opponent and nothing of yours is clickable.
    if (state.phase === 'blk' && state.active !== 'you') {
      // Once a blocker is chosen, only the attackers it may legally stop light up — a
      // ground creature never points at a flyer.
      if (selectedBlocker) {
        return state.attackers.filter((a) => E.canBlock(state, selectedBlocker, a).ok);
      }
      return E.creaturesOf(state, 'you').filter((i) => !state.cards[i].tapped);
    }
    if (state.active === 'you' && !busy && ['main1', 'main2'].includes(state.phase)) {
      return state.zones.you.hand.filter((i) => E.canPlay(state, 'you', i));
    }
    if (state.awaitResp === 'you') {
      return state.zones.you.hand.filter((i) => E.canPlay(state, 'you', i));
    }
    return [];
  }, [state, selectedBlocker, legalTargets, busy]);

  /**
   * Dashed connectors: every legal target for a pending spell, brightened for the one
   * under the cursor, plus each blocker linked to the attacker it is stopping.
   */
  const links: Link[] = useMemo(() => {
    const out: Link[] = [];
    /*
     * No arrow chasing a finger.
     *
     * The aiming line was written for a cursor: it leaves the card and follows the pointer
     * until a click lands, which is exactly the right feedback when the pointer is always
     * on screen. A finger is not — it is on the glass only while you are touching, and the
     * rest of the time the line hangs off the last place you happened to press. So on touch
     * the live arrows are dropped entirely: pick a creature and the legal targets light up,
     * pick a target and the settled line is drawn between the two. Only the committed
     * lines, the ones that mean something happened, are ever shown.
     */
    const aiming = !isTouch();
    // The arrow always ends at the pointer, never jumping to a target on its own: the
    // dashed marquee says what is under the cursor, and the click is what commits.
    if (state.pending && !offBoardTargets) {
      /*
       * A two-target effect such as a fight draws twice: a settled line from the spell to
       * the creature already chosen, and the live arrow leaving *that* creature for
       * whatever it is being pointed at. Clicking the second one resolves it immediately.
       */
      const first = state.pending.first;
      if (first) {
        out.push({ from: `top:${state.pending.card}`, to: first, kind: 'target' });
        if (aiming) out.push({ from: `top:${first}`, to: cursor ?? lastPointer.current, kind: 'aim' });
      } else if (aiming) {
        out.push({ from: `top:${state.pending.card}`, to: cursor ?? lastPointer.current, kind: 'aim' });
      }
    }
    if (state.phase === 'blk' || state.phase === 'blkShow') {
      /*
       * The committed line starts where the aiming arrow started — the blocker's top edge,
       * not its centre. Leaving from the middle of the card put the line's first third
       * underneath the card that owns it, so locking a block looked like the arrow had
       * simply gone out.
       */
      for (const [attacker, blockers] of Object.entries(state.blocks)) {
        // Blockers on the same attacker fan to alternating sides so they never overlap.
        blockers.forEach((b, k) =>
          out.push({
            from: `top:${b}`,
            to: attacker,
            kind: 'block',
            // A single blocker draws straight up the middle; extra ones step aside.
            bow: k === 0 ? 0 : (k % 2 ? -1 : 1) * Math.ceil(k / 2),
          }),
        );
      }
      // Same rule for blockers: it trails the cursor until an attacker is clicked, and
      // that click is what turns it into one of the fixed lines above.
      if (aiming && state.phase === 'blk' && selectedBlocker) {
        out.push({ from: `top:${selectedBlocker}`, to: cursor ?? lastPointer.current, kind: 'aim' });
      }
    }
    return out;
  }, [state.pending, state.phase, state.blocks, state.attackers, legalTargets, selectedBlocker,
      hovered, hoveredHero, cursor, offBoardTargets]);

  /**
   * The halo is a demand for a click, so it is limited to the steps that make one:
   * choosing targets, declaring attackers, assigning blockers. An affordable hand card
   * is just information and keeps its quieter treatment.
   */
  const glowIds = useMemo(
    () => (state.pending || state.phase === 'atk' || state.phase === 'blk' ? highlightIds : []),
    [highlightIds, state.pending, state.phase],
  );

  /** What the glow means right now: your card to act with, or a target to hit. */
  const highlightRole: 'source' | 'target' =
    state.pending || (state.phase === 'blk' && selectedBlocker) ? 'target' : 'source';

  /** The card the dashed arrow leaves from, if any. */
  const aimSourceId = offBoardTargets
    ? null
    : state.pending?.first ??
      state.pending?.card ??
      (state.phase === 'blk' && state.active !== 'you' ? selectedBlocker : null);

  // ---- primary action ------------------------------------------------------

  const primary: PrimaryAction = useMemo(() => {
    if (state.winner) return { label: '對局結束', act: () => {}, enabled: false };
    if (state.awaitResp === 'you') {
      return { label: '不回應（結算）', act: () => dispatch({ t: 'skipResponse' }), enabled: true };
    }
    if (state.active === 'you') {
      if (state.phase === 'main1' && !busy) {
        const canFight = E.creaturesOf(state, 'you').some((i) => E.canAttack(state, i));
        // No second button hanging in the corner: entering combat and then declaring
        // nothing ends the turn just as well, on the one control that is already there.
        if (canFight) {
          return { label: '進入戰鬥', act: () => dispatch({ t: 'toCombat' }), enabled: true };
        }
        return { label: '結束回合', act: () => dispatch({ t: 'endTurn' }), enabled: true };
      }
      if (state.phase === 'atk') {
        const n = E.creaturesOf(state, 'you').filter((i) => state.cards[i].attacking).length;
        /*
         * One button, two meanings: with nothing declared it offers to skip combat, and
         * the moment a creature is chosen it becomes the confirmation. Passing on combat
         * used to hide in a separate button off in the corner.
         */
        return {
          label: n > 0 ? `確認攻擊（${n}）` : '不發動攻擊',
          act: () => dispatch({ t: 'confirmAttackers' }),
          enabled: true,
        };
      }
      if (state.phase === 'blkShow') {
        return { label: '結算戰鬥', act: () => dispatch({ t: 'resolveYourCombat' }), enabled: true };
      }
      if (state.phase === 'main2' && !busy) {
        return { label: '結束回合', act: () => dispatch({ t: 'endTurn' }), enabled: true };
      }
      return { label: '結算中…', act: () => {}, enabled: false };
    }
    if (state.phase === 'blk') {
      const n = Object.values(state.blocks).reduce((a, b) => a + b.length, 0);
      return {
        label: n ? `確認阻擋（${n}）` : '不阻擋（承受傷害）',
        act: () => dispatch({ t: 'confirmBlocks' }),
        enabled: true,
      };
    }
    return { label: '對手回合…', act: () => {}, enabled: false };
  }, [state, busy]);

  // ---- interactions --------------------------------------------------------

  const click = () => sfx.tap();

  const onBoardCardClick = useCallback(
    (card: RenderCard, isOpponent: boolean, byTouch?: boolean) => {
      if (!liveRef.current) return;
      const iid = card.instanceId;
      const s = latest.current;
      // On touch the reader is already open from the press and already closed by the
      // release; the fall-through previews below would put it straight back up.
      const peek = (c: RenderCard) => { if (!byTouch) setPreview(c); };

      if (s.pending) {
        if (legalTargets.has(iid)) {
          dispatch({ t: 'chooseTarget', tid: iid });
          click();
        }
        return;
      }

      if (!isOpponent) {
        if (s.phase === 'atk') {
          dispatch({ t: 'toggleAttacker', iid });
          click();
          return;
        }
        // Blockers are only yours to assign when the opponent is the one attacking — and
        // only creatures block. Lands, artifacts and auras sit on the same shelf and were
        // being picked up as "blockers" here, which then reported that they could not
        // block anything.
        if (s.phase === 'blk' && s.active !== 'you') {
          // Already committed to a block? Clicking it takes the assignment back.
          const assigned = Object.values(s.blocks).some((list) => ((list as string[]) ?? []).includes(iid));
          if (assigned) {
            dispatch({ t: 'unassignBlocker', blocker: iid });
            setSelectedBlocker(null);
            setBlockNote(null);
            click();
            return;
          }
          // Say why, rather than doing nothing: a click that goes nowhere with no sound and
          // no message is indistinguishable from a broken board.
          if (!E.creaturesOf(s, 'you').includes(iid)) {
            setBlockNote('只有生物可以阻擋');
            sfx.error();
            return;
          }
          if (s.cards[iid].tapped) {
            setBlockNote('橫置中的生物無法阻擋');
            sfx.error();
            return;
          }
          setBlockNote(null);
          setSelectedBlocker((prev) => (prev === iid ? null : iid));
          click();
          return;
        }
        peek(card);
        return;
      }

      // Clicking an attacker that is already blocked releases the creatures holding it,
      // so a mistaken assignment is undone from either end.
      if (
        s.phase === 'blk' && s.active !== 'you' && !selectedBlocker &&
        (s.blocks[iid]?.length ?? 0) > 0
      ) {
        for (const b of s.blocks[iid]) dispatch({ t: 'unassignBlocker', blocker: b });
        setBlockNote(null);
        click();
        return;
      }

      // Clicking one of theirs that is not attacking is the other easy way to think the
      // board has stopped responding, so name that too.
      if (s.phase === 'blk' && s.active !== 'you' && selectedBlocker && !s.attackers.includes(iid)) {
        setBlockNote('那隻生物沒有進攻，不需要阻擋');
        sfx.error();
        return;
      }

      if (s.phase === 'blk' && s.attackers.includes(iid) && selectedBlocker) {
        const legal = E.canBlock(s, selectedBlocker, iid);
        if (!legal.ok) {
          setBlockNote(legal.why ?? '這隻生物擋不住那個攻擊者');
          sfx.error();
          return;
        }
        setBlockNote(null);
        dispatch({ t: 'toggleBlock', blocker: selectedBlocker, attacker: iid });
        setSelectedBlocker(null);
        click();
        return;
      }
      peek(card);
    },
    [legalTargets, selectedBlocker],
  );

  const onHandCardClick = useCallback((card: RenderCard) => {
    if (!liveRef.current) return;
    setPreview(card);
  }, []);

  const onPlayCard = useCallback((card: RenderCard) => {
    if (!liveRef.current) return;
    const s = latest.current;
    const iid = card.instanceId;
    // While one spell is already aiming, dropping another does nothing — the arrow owns
    // the pointer until a target is picked or the cast is cancelled.
    if (s.pending) return;
    if (!E.canPlay(s, 'you', iid)) {
      sfx.error();
      return;
    }
    castSlot.current = Math.max(0, s.zones.you.hand.indexOf(iid));
    dispatch({ t: card.type === 'land' ? 'playLand' : 'cast', iid });
  }, []);

  const targetablePlayers = state.pending?.legalP ?? [];

  /** What the off-board picker is asking for, named after the spell that asked. */
  const pickTitle = state.pending
    ? `${E.defOf(state, state.pending.card)?.name ?? '咒語'}：選擇目標`
    : '';

  // ---- render --------------------------------------------------------------

  const hud = {
    you: { life: shownLife.you, maxLife: 20, manaPool: mana as any },
    foe: { life: shownLife.foe, maxLife: 20, manaPool: foeMana as any },
  };

  const unblocked =
    state.phase === 'blk'
      ? state.attackers
          .filter((a) => !state.blocks[a]?.length)
          .reduce((sum, a) => sum + E.powerOf(state, a), 0)
      : 0;

  return (
    <div className={`battle-root${shake > 0 ? ' shaken' : ''}${coachSpot ? ' coached' : ''}${introDone ? ' arrived' : ' arriving'}`}>
      <div className="battle-canvas">
        <BattleCanvas
          player={hud.you}
          opponent={hud.foe}
          playerHand={hand}
          playerBattlefield={youField}
          opponentBattlefield={foeField}
          playerDeckCount={state.zones.you.lib.length}
          opponentDeckCount={state.zones.foe.lib.length}
          playerGraveyard={youGy}
          opponentGraveyard={foeGy}
          gamePhase={state.phase}
          isPlayerTurn={state.active === 'you'}
          hasTappedAttackers={state.attackers.length > 0}
          onBoardCardClick={onBoardCardClick}
          onHandCardClick={onHandCardClick}
          onPlayCard={onPlayCard}
          onHoverCard={onHover}
          primaryLabel={primary.label}
          primaryEnabled={primary.enabled}
          onPrimaryAction={primary.act}
          highlightIds={highlightIds}
          glowIds={glowIds}
          highlightRole={highlightRole}
          aimSourceId={aimSourceId}
          targetableHeroes={targetablePlayers as Side[]}
          onHeroClick={(side) => {
            if (!latest.current.pending) return;
            dispatch({ t: 'chooseTarget', tid: side });
            click();
          }}
          onHeroHover={setHoveredHero}
          onEmptyTap={() => { if (latest.current.pending) dispatch({ t: 'cancelPending' }); }}
          /*
           * Three beats, in the order they actually happen: the camera lands, the chrome
           * comes in behind it, the hand is dealt — and only when the last card is down does
           * the coin go up. Overlapping the toss with the deal put two things worth watching
           * on screen at once and made both of them scenery.
           *
           * The deal's length is the board's own: one card every `drawStep`, plus the time
           * the last one takes to fly from the library and settle into the fan. The board
           * starts dealing DEAL_LEAD_MS before this fires, so the hand is complete that much
           * sooner; TOSS_LEAD_MS takes the coin in tighter still, until it goes up as the
           * last card settles rather than a beat after it.
           */
          onIntroDone={() => {
            window.setTimeout(() => setIntroDone(true), 320);
            const n = Math.max(1, latest.current.zones.you.hand.length);
            const deal = 320 + (n - 1) * FX_TIMING.drawStep + 1000;
            window.setTimeout(() => setDealtIn(true), Math.max(0, deal - TOSS_LEAD_MS));
          }}
          onFxApi={onFxApi}
          onProjector={onProjector}
          spotlight={coach && tossDone ? coachSpot : null}
        />
      </div>

      <TargetLines links={links} project={projectorRef.current} tick={projectorReady} />

      <FxLayer
        key={projectorReady}
        state={state}
        project={projectorRef.current}
        onDone={fxDone}
        onShake={triggerShake}
        onImpact={armLife}
        onLifeGate={setLifeGate}
        cardPixels={cardPixels}
        onStageBreak={onStageBreak}
        onStaged={onStaged}
        onBusyUntil={noteBusy}
        onCombatUntil={noteCombat}
        onDeaths={onDeaths}
        shoot={(from, to, colour) => fxApiRef.current?.shoot(from, to, colour)}
        duel={(from, to, colour) => fxApiRef.current?.duel(from, to, colour)}
        surge={surge}
      />

      {/* Turn / phase readout */}
      <div className="hud-phase">
        <b>{state.active === 'you' ? '我方回合' : '對手回合'}</b>
        <span>
          第 {state.turn} 回合 · {PHASE_NAME[state.phase] ?? state.phase}
        </span>
      </div>

      {/* Step hints, verbatim from the original */}

      {blockNote && <div className="toast">{blockNote}</div>}

      {/*
        * The instruction row that used to sit under the phase readout is gone; the glowing
        * cards say what to click. Only the target picker remains, and only as controls —
        * the two player targets and the cancel — with no prose.
        */}
      {/*
        * Only the cancel. A spell that can hit a player lights the die itself and makes it
        * clickable, so a pair of word buttons beside the cancel was a second way of saying
        * the same thing.
        */}
      {state.pending && !offBoardTargets && (
        <div className="pending-bar">
          {/*
            * On a phone the whole board is the cancel: tapping anywhere that is not a legal
            * target puts the spell back. A key would only be a second, smaller way of doing
            * what the empty table already does, so what is left here is the sentence that
            * says so — breathing, so it reads as live rather than as furniture.
            */}
          {isTouch() ? (
            <span className="tgt-hint">點任意空白處取消施放</span>
          ) : (
            <button className="tgt-cancel" onClick={() => dispatch({ t: 'cancelPending' })}>
              取消施放（ESC）
            </button>
          )}
        </div>
      )}

      {/* Targets that are not on the board — a creature in a graveyard — are picked here. */}
      {state.pending && offBoardTargets && (
        <PickStrip
          title={pickTitle}
          options={offBoardTargets.map((iid) => ({
            key: iid,
            label: E.defOf(state, iid)?.name ?? iid,
            card: E.defOf(state, iid) ?? null,
          }))}
          onPick={(key) => dispatch({ t: 'chooseTarget', tid: key })}
          onCancel={() => dispatch({ t: 'cancelPending' })}
          cancelLabel="取消施放"
        />
      )}

      {/* Discard / search choice — the same row of cards, never a grid. */}
      {state.choice && (
        <PickStrip
          title={choicePrompt(state.choice)}
          note={
            state.choice.remain && state.choice.remain > 1
              ? `還有 ${state.choice.remain} 次`
              : undefined
          }
          options={state.choice.options.map((o) => ({
            key: o.key,
            label: o.label,
            card: o.defId ? E.cardDefById(o.defId) : null,
          }))}
          onPick={(key) => dispatch({ t: 'choose', key })}
        />
      )}

      {/*
        * The way out. A match had no exit of its own — you left through the result screen or
        * not at all — which is fine until you want to change deck and are three turns into a
        * game you no longer want. Small, in the corner, and it arrives with the rest of the
        * chrome after the camera has landed.
        */}
      <button className="btn-quit" onClick={() => { sfx.tap(); onExit(); }}>退出對戰</button>

      {/* Battle log */}
      <button className="btn-log" onClick={() => setShowLog((v) => !v)}>
        戰鬥紀錄
      </button>
      {showLog && (
        <div className="logpanel">
          <header>
            戰鬥紀錄
            <button onClick={() => setShowLog(false)}>✕</button>
          </header>
          <ul>
            {state.log.map((l, i) => (
              <li key={i} className={`lg-${l.c ?? 'sys'}`}>
                {l.s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hovered card preview, in the a version's floating style */}
      {preview && !peekOff && (
        <div className="card-preview">
          {/*
            * The preview is drawn by the shared card-effect layer, not as a flat PNG: it
            * gets the border effect and the turning hologram, and because the layer is a
            * canvas stacked above this box the emblem is the topmost thing on the card
            * rather than something the frame can paint over.
            */}
          <span className="cp-card fx-slot" ref={fx.slot('preview', preview, true)}>
            <img src={getCardDataUrl(preview)} alt={preview.name} />
          </span>
        </div>
      )}

      {/* Above the preview box (z 9) and below the effects layer (z 12). */}
      <fx.Layer z={10} />

      {/*
        * Not while the coin is still in the air — two things asking to be read at once —
        * and not while the board is still arriving. The first sentence points at the dice
        * with a line, and during the opening move the dice are sliding across the screen
        * under a camera that is still travelling: the line chases them, the panel is placed
        * against positions that are about to change, and the lesson opens on a board that
        * has not finished being a board. So it waits for the shot to land and the hand to
        * be dealt, and starts on a still table.
        */}
      {coach && tossDone && introDone && dealtIn && (
        <Coach
          state={state}
          onFocus={setCoachSpot}
          onExit={() => onCoachDone?.()}
          // Where things are on screen, so the tutorial's pointer can reach them.
          project={project}
          // Which of your creatures is picked up, so the defending step can point at what
          // it may legally block once you have chosen it.
          selected={selectedBlocker}
          // Silent while the board is announcing a turn of its own.
          quiet={quiet}
          // The blocking chapter is where the parked creature is needed, so that is where
          // it stands up. See stageTutorial.
          onEnter={(key) => {
            /* Defending needs something to defend against, so their creatures come back the
               moment that chapter is next in line — the step itself then waits for them to
               actually declare an attack. */
            if (key === 'block') dispatch({ t: 'tutorialRelease' });
            // ...and the board may ask 是否反擊該咒語 from the chapter that explains it.
            if (key === 'counter') { dispatch({ t: 'tutorialRelease' }); dispatch({ t: 'tutorialUnmute' }); }
          }}
        />
      )}

      {/*
        * The result screen. The board's own language, played out large: a struck rosette
        * turning behind the word, rays thrown out from it, a ring closing in, and the two
        * corner brackets snapping into place. A win throws light; a loss keeps the same
        * geometry and drains it.
        */}
      {/* The opponent's spell, up where it can be read for as long as it is unanswered. */}
      {showStaged && staged && (() => {
        const def = E.cardDefById(staged.defId);
        const p = stagePoint();
        return def ? (
          <span className="fx fx-stage" style={{ left: p.x, top: p.y }}>
            <i className="st-glow" />
            <img src={getCardDataUrl(def as any)} alt={def.name} />
            {/* The card names itself; what belongs under it is the question being asked. */}
            {state.awaitResp === 'you' && <b className="ask">是否反擊該咒語</b>}
          </span>
        ) : null;
      })()}

      {/* Thrown once the hand is down, not over the top of the deal. */}
      {dealtIn && !tossDone && <CoinFlip first={state.first} onDone={() => setTossDone(true)} />}

      {state.winner && overReady && (
        <div className={`over-back ${state.winner === 'you' ? 'win' : 'lose'}`}>
          <div className="over-field" aria-hidden="true">
            <svg viewBox="-50 -50 100 100" className="over-rays">
              {Array.from({ length: 48 }, (_, i) => {
                const a = (i / 48) * Math.PI * 2;
                const r1 = i % 4 ? 26 : 22;
                const r2 = i % 4 ? 44 : 60;
                return (
                  <line
                    key={i}
                    x1={Math.cos(a) * r1} y1={Math.sin(a) * r1}
                    x2={Math.cos(a) * r2} y2={Math.sin(a) * r2}
                    stroke="currentColor"
                    strokeWidth={i % 4 ? 0.3 : 0.7}
                    opacity={i % 4 ? 0.3 : 0.65}
                  />
                );
              })}
            </svg>
            <svg viewBox="-50 -50 100 100" className="over-ring">
              <circle cx="0" cy="0" r="34" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
              <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" strokeWidth="1.6" />
              {Array.from({ length: 4 }, (_, i) => {
                const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
                return (
                  <circle key={i} cx={Math.cos(a) * 32} cy={Math.sin(a) * 32} r="1.5" fill="currentColor" />
                );
              })}
            </svg>
            <span className="over-flash" />
          </div>

          <div className="over-card">
            <span className="over-corner tl" />
            <span className="over-corner tr" />
            <span className="over-corner bl" />
            <span className="over-corner br" />
            <h1>
              {(state.winner === 'you' ? '勝利' : '敗北').split('').map((ch, i) => (
                <span key={i} style={{ animationDelay: `${0.12 + i * 0.13}s` }}>{ch}</span>
              ))}
            </h1>
            <span className="over-rule" />
            <p className="over-why">{state.winReason}</p>
            <p className="over-stat">
              共 {state.turn} 回合 · 你 {state.life.you} / 對手 {state.life.foe}
            </p>
            <button className="over-go" onClick={onExit}>再戰一場</button>
          </div>
        </div>
      )}
    </div>
  );
};
