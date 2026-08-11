/**
 * The opening toss.
 *
 * The engine decides who goes first when the match is created; this is the moment that
 * decision is shown. A two-faced coin — one pale side, one dark — is thrown, turns end
 * over end, and comes down on the face belonging to whoever has the first turn.
 *
 * It is built in real 3D: a stack of thin discs standing in for the milled edge, with a
 * face capping each end, all inside a `preserve-3d` box that rotates on X. The landing
 * angle is computed from the result rather than picked, so the coin cannot come down on
 * the wrong face.
 *
 * The whole thing is driven from clamped frame deltas rather than from timers or a CSS
 * animation, and that is not fussiness: a match opens by building the entire 3D board,
 * which holds the main thread for seconds. Anything measuring wall time — a `setTimeout`,
 * a keyframe animation — runs to completion inside that block, and the toss was over
 * before a single frame of it had been drawn. Capping each frame's contribution means a
 * four-second stall costs the animation one frame's worth of progress, not four seconds.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { Side } from '../game/engine';
import { sfx } from '../game/audio';

interface Props {
  first: Side;
  onDone: () => void;
}

/**
 * Thin slices standing in for the coin's edge. Alternating their brightness mills the
 * edge: side-on you see reeding rather than a smooth band, which is most of what makes a
 * disc read as a struck coin instead of a counter.
 */
const EDGE_SLICES = 26;
/*
 * The slice stack has to sit strictly *inside* the two faces. At equal depth the renderer
 * is free to pick either, and it picked the slices — which face-on are opaque discs
 * covering the whole coin, so the toss landed showing its own edge.
 */
const THICKNESS = 24;

const FLIGHT_MS = 1600;
const HOLD_MS = 1650;
const FADE_MS = 420;
/** No single frame may advance the toss by more than this, however long it really took. */
const MAX_STEP_MS = 110;

export const CoinFlip: React.FC<Props> = ({ first, onDone }) => {
  const [landed, setLanded] = useState(false);
  const [fading, setFading] = useState(false);
  const coinRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  /*
   * Whole turns, then the half-turn that shows the right face. The player's side is the
   * pale face at 0deg; the opponent's is the dark one, half a turn behind it.
   */
  const endAngle = 5 * 360 + (first === 'you' ? 0 : 180);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    let stage = 0;

    const tick = (t: number) => {
      if (!last) {
        last = t;
        sfx.tap();
        raf = requestAnimationFrame(tick);
        return;
      }
      elapsed += Math.min(t - last, MAX_STEP_MS);
      last = t;

      const k = Math.min(1, elapsed / FLIGHT_MS);
      const ease = 1 - Math.pow(1 - k, 3);
      const coin = coinRef.current;
      if (coin) {
        // The toss: up and back down, peaking a little before the halfway point.
        const lift = Math.sin(Math.min(1, k) * Math.PI) * 88;
        coin.style.transform =
          `translateY(${-lift}px) rotateX(${ease * endAngle}deg) rotateZ(${(1 - ease) * -8}deg)`;
      }
      const shadow = shadowRef.current;
      if (shadow) {
        const near = 1 - Math.sin(Math.min(1, k) * Math.PI) * 0.42;
        shadow.style.transform = `scale(${near})`;
        shadow.style.opacity = String(0.2 + near * 0.4);
      }

      if (stage === 0 && elapsed >= FLIGHT_MS) { stage = 1; setLanded(true); sfx.bannerGood(); }
      if (stage === 1 && elapsed >= FLIGHT_MS + HOLD_MS) { stage = 2; setFading(true); }
      if (stage === 2 && elapsed >= FLIGHT_MS + HOLD_MS + FADE_MS) { doneRef.current(); return; }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [endAngle]);

  return (
    <div className={`toss${fading ? ' gone' : ''}`}>
      <div className="toss-stage">
        <div className="coin" ref={coinRef}>
          <Face side="front" glyph="先" />
          <Face side="back" glyph="後" />
          {Array.from({ length: EDGE_SLICES }, (_, i) => (
            <span
              key={i}
              className="coin-edge"
              style={{
                transform: `translateZ(${(i / (EDGE_SLICES - 1) - 0.5) * THICKNESS}px)`,
                // The reeding: every other slice sits a shade darker in the groove.
                filter: `brightness(${i % 2 ? 0.62 : 1.06})`,
              }}
            />
          ))}
        </div>
        <span className="coin-shadow" ref={shadowRef} />
      </div>

      {landed && <p className="toss-word">{first === 'you' ? '你先攻' : '對手先攻'}</p>}
    </div>
  );
};

/**
 * One struck face: a raised rim, a ring of beads inside it, engraved rays running out from
 * the centre, the glyph sunk into a recessed field, and a gloss band across the metal.
 */
const Face: React.FC<{ side: 'front' | 'back'; glyph: string }> = ({ side, glyph }) => (
  <span className={`coin-face ${side}`}>
    <i className="cf-rim" />
    <i className="cf-rays" />
    <i className="cf-beads" />
    <i className="cf-well" />
    <b>{glyph}</b>
    <i className="cf-gloss" />
  </span>
);
