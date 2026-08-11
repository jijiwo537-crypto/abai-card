/**
 * Finding an opponent.
 *
 * There is no opponent to find — the other side is the AI, and it is ready the instant the
 * button is pressed. The screen exists anyway, because pressing 開始對戰 and being dropped
 * straight onto a board makes the match feel like a menu option rather than a game that was
 * arranged for you.
 *
 * It has one state, not a checklist. Every queue worth copying — Arena, Hearthstone, Runeterra
 * — shows the player exactly one thing: we are looking, and then, we found them. A five-step
 * progress list is a loading screen pretending to be informative; nobody reads 登錄牌組指紋
 * and learns anything. There is no progress bar either, because a bar promises a known
 * duration and a queue does not have one — the clock counts up instead, which is honest.
 *
 * So: two plates, the opponent's one blank and scanning, a real elapsed timer, and a way out.
 * The reveal lands at three quarters of the wait and holds long enough to be read, so the
 * last thing that happens is a result rather than a spinner stopping.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DeckDef } from '../game/types';
import { sfx } from '../game/audio';

const COLOR_DOT: Record<string, string> = {
  W: '#fde68a',
  U: '#38bdf8',
  B: '#c084fc',
  R: '#f87171',
  G: '#4ade80',
};

interface Props {
  you: DeckDef;
  foe: DeckDef;
  onReady: () => void;
  onCancel: () => void;
}

export const Matchmaking: React.FC<Props> = ({ you, foe, onReady, onCancel }) => {
  /*
   * One wait per mount, drawn once. Re-rolling it on a re-render would make the clock and
   * the reveal jump as the component updates.
   */
  const total = useMemo(() => 4000 + Math.random() * 4000, []);
  const [elapsed, setElapsed] = useState(0);
  const fired = useRef(false);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const t = performance.now() - start;
      setElapsed(t);
      if (t >= total) {
        if (!fired.current) { fired.current = true; onReady(); }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total, onReady]);

  // Three quarters in, so the last quarter of the wait is spent looking at the opponent.
  const found = elapsed >= total * 0.75;
  const rang = useRef(false);
  useEffect(() => {
    if (found && !rang.current) { rang.current = true; sfx.tap(); }
  }, [found]);

  return (
    <div className={`mm${found ? ' found' : ''}`}>
      <div className="picker-frame" aria-hidden="true">
        <span className="tf-corner tl-c" />
        <span className="tf-corner tr-c" />
        <span className="tf-corner bl-c" />
        <span className="tf-corner br-c" />
      </div>

      <header className="mm-head">
        <h1>{found ? '對手已就位' : '搜尋對手'}</h1>
        <span className="mm-clock">{(elapsed / 1000).toFixed(1)}s</span>
      </header>

      <div className="mm-stage">
        <Plate deck={you} label="你" revealed />
        <span className="mm-vs" aria-hidden="true">VS</span>
        <Plate deck={foe} label="對手" revealed={found} />
      </div>

      <button className="mm-cancel" onClick={() => { sfx.tap(); onCancel(); }}>取消</button>
    </div>
  );
};

/** One side. Before the opponent resolves this is a blank plate with a scan running over it. */
const Plate: React.FC<{ deck: DeckDef; label: string; revealed: boolean }> = (
  { deck, label, revealed },
) => (
  <div className={`mm-plate${revealed ? ' on' : ''}`}>
    {!revealed && <span className="mm-scan" aria-hidden="true" />}
    <span className="mm-label">{label}</span>
    <span className="mm-sigil"><Sigil colors={revealed ? deck.colors : []} /></span>
    <span className="mm-name">{revealed ? deck.name : '———'}</span>
    <span className="mm-strat">{revealed ? deck.strategy : ''}</span>
  </div>
);

/** The same hexagonal emblem the deck tiles wear, so the two screens read as one place. */
const Sigil: React.FC<{ colors: string[] }> = ({ colors }) => {
  const a = COLOR_DOT[colors[0]] ?? '#334155';
  const b = COLOR_DOT[colors[colors.length - 1]] ?? a;
  const id = `mm-sig-${colors.join('') || 'none'}`;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="none" stroke={`url(#${id})`} strokeWidth="2.4" />
      <polygon points="50,22 74,36 74,64 50,78 26,64 26,36" fill={`url(#${id})`} opacity="0.14" />
      <circle cx="50" cy="50" r="13" fill="none" stroke={`url(#${id})`} strokeWidth="2" />
      <circle cx="50" cy="50" r="4" fill={`url(#${id})`} />
    </svg>
  );
};
