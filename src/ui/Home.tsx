/**
 * Title screen.
 *
 * Two planes that never mix. Behind is deep space seen from the station: a starfield, the
 * lit limb of the world the arena orbits, a docking grid receding to the horizon, and dust
 * drifting close to the glass. It is the only thing the pointer moves. In front is the
 * stage: the mark and the one button, locked to the centre line and dead still — the two
 * things a title screen exists for are reading the name and pressing the button, and
 * neither may shift under the cursor.
 *
 * The mark is drawn rather than typeset. Nothing here may reach the network, so a webfont
 * is out and a system font would be whatever the machine happened to have; the letters are
 * built from the same square corners and chamfers as the frame around them, which is a
 * thing no installed font was going to do.
 *
 * The pointer writes two CSS variables on the root and the background layers position
 * themselves from those, so moving the mouse never re-renders React.
 */

import React, { useEffect, useRef } from 'react';
import { sfx } from '../game/audio';

interface Props {
  onStart: () => void;
}

export const Home: React.FC<Props> = ({ onStart }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const shown = useRef({ x: 0, y: 0 });

  // The pointer sets a target in -1..1; a spring eases towards it every frame, so the
  // field keeps drifting for a moment after the mouse stops.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      shown.current.x += (target.current.x - shown.current.x) * 0.07;
      shown.current.y += (target.current.y - shown.current.y) * 0.07;
      const el = rootRef.current;
      if (el) {
        el.style.setProperty('--px', shown.current.x.toFixed(4));
        el.style.setProperty('--py', shown.current.y.toFixed(4));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onMove = (e: React.PointerEvent) => {
    target.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: (e.clientY / window.innerHeight) * 2 - 1,
    };
  };
  const onLeave = () => { target.current = { x: 0, y: 0 }; };

  return (
    <div className="title" ref={rootRef} onPointerMove={onMove} onPointerLeave={onLeave}>
      {/* ---- the moving plane ---------------------------------------------------- */}
      <div className="title-field" aria-hidden="true">
        <div className="tl tl-stars"><Stars /></div>
        <div className="tl tl-limb"><Limb /></div>
        <div className="tl tl-grid"><Grid /></div>
        <div className="tl tl-dust"><Dust /></div>
      </div>
      <div className="title-vignette" aria-hidden="true" />

      {/*
        * No frame here. The deck picker still carries the double rule and its corner
        * brackets, because it is a panel and a panel has edges; the title screen is meant
        * to read as a window onto the place rather than as a plate hung on the wall, and
        * a border drawn around the whole viewport was doing the opposite.
        */}

      <main className="title-stage">
        <h1 className="title-mark" aria-label="ABAI"><Wordmark /></h1>

        {/*
          * One button, and nothing beside it. Everything that used to be strung along the
          * bottom — the catalogue, the builder, the designer, the sound switch — was a menu
          * of side doors on a screen whose whole job is to open the front one. The builder
          * moved to the deck picker, where the decks are.
          */}
        <button className="title-go" onClick={() => { sfx.tap(); onStart(); }}>
          <span>開始遊戲</span>
        </button>
      </main>
    </div>
  );
};

/** A fixed integer hash, so the scatter looks random and is identical on every load. */
const hash = (i: number) => (i * 2654435761) >>> 0;

/** The starfield. Far enough away that the pointer barely moves it. */
const Stars: React.FC = () => (
  <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
    {Array.from({ length: 190 }, (_, i) => {
      const h = hash(i + 7);
      const r = 0.05 + ((h >>> 20) % 100) / 900;
      return (
        <circle
          key={i}
          cx={((h % 1000) / 1000) * 100}
          cy={(((h >>> 10) % 1000) / 1000) * 100}
          r={r}
          fill="#ffffff"
          opacity={0.16 + r * 2.4}
        />
      );
    })}
  </svg>
);

/**
 * The lit limb of the world the station orbits: one enormous circle, mostly off-screen
 * below, showing only the thin bright edge of its atmosphere along the bottom.
 */
const Limb: React.FC = () => (
  <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="limbGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0.86" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="0.965" stopColor="#8fa6c8" stopOpacity="0.22" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="188" r="120" fill="#000000" />
    <circle cx="50" cy="188" r="122" fill="url(#limbGlow)" />
    <circle cx="50" cy="188" r="120" fill="none" stroke="#cfe0ff" strokeWidth="0.22" opacity="0.5" />
    <circle cx="50" cy="188" r="114" fill="none" stroke="#ffffff" strokeWidth="0.08" opacity="0.12" />
  </svg>
);

/**
 * The docking grid, running away to the horizon. Verticals converge on a vanishing point;
 * horizontals crowd together as they recede.
 */
const Grid: React.FC = () => {
  const vy = 62;   // the horizon
  const lines: React.ReactElement[] = [];
  for (let i = -14; i <= 14; i++) {
    lines.push(
      <line
        key={`v${i}`}
        x1={50 + i * 3.4} y1={vy} x2={50 + i * 26} y2={128}
        stroke="#ffffff" strokeWidth="0.14" opacity={0.2 - Math.abs(i) * 0.011}
      />,
    );
  }
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    const y = vy + Math.pow(t, 2.3) * 66;
    lines.push(
      <line key={`h${i}`} x1="-40" y1={y} x2="140" y2={y}
        stroke="#ffffff" strokeWidth="0.12" opacity={0.055 + t * 0.16} />,
    );
  }
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <line x1="-40" y1={vy} x2="140" y2={vy} stroke="#b9c8e6" strokeWidth="0.16" opacity="0.34" />
      {lines}
    </svg>
  );
};

/** Dust close to the glass — the layer the pointer moves most. */
const Dust: React.FC = () => (
  <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
    {Array.from({ length: 34 }, (_, i) => {
      const h = hash(i + 101);
      const r = 0.14 + ((h >>> 20) % 100) / 420;
      return (
        <circle
          key={i}
          cx={((h % 1000) / 1000) * 100}
          cy={(((h >>> 10) % 1000) / 1000) * 100}
          r={r}
          fill="#ffffff"
          opacity={0.06 + r * 0.5}
        />
      );
    })}
  </svg>
);

/**
 * ABAI, drawn as blackletter.
 *
 * Nothing here may reach the network, so the letters are built rather than typeset. This
 * is a textura hand: broad strokes laid down with a flat pen, lozenge terminals where the
 * pen lifts, tight spacing, and a spur hung on each stem.
 *
 * Solids and counters are composed through a mask rather than by fill rule. Overlapping
 * subpaths in one path fight each other — `evenodd` turns every overlap into a hole and
 * `nonzero` cannot punch one at all — so the mask paints the strokes white, the counters
 * black, and a single rectangle of colour is shown through the result.
 */

/** A stroke's lozenge terminal: the diamond a flat pen leaves when it lifts. */
const nib = (x: number, y: number, w = 30, h = 15) =>
  `M${x} ${y} L${x + w / 2} ${y - h} L${x + w} ${y} L${x + w / 2} ${y + h} Z`;

const TOP = 26;
const BOT = 196;

/** Strokes, then the counters cut out of them. */
interface Glyph { w: number; solid: string[]; holes?: string[] }

const A_GLYPH: Glyph = {
  w: 106,
  solid: [
    // The two broad strokes of the arch, meeting under a lozenge apex.
    `M46 ${TOP} L72 ${TOP + 6} L38 ${BOT} L10 ${BOT} Z`,
    `M56 ${TOP} L80 ${TOP} L102 ${BOT} L74 ${BOT} Z`,
    nib(38, TOP + 2, 34, 14),
    // The bar, cut on the slant a flat pen leaves.
    `M26 ${TOP + 98} L88 ${TOP + 90} L90 ${TOP + 112} L28 ${TOP + 120} Z`,
    // Spurs, overlapping the strokes they hang from — detached ones read as punctuation.
    nib(12, TOP + 58, 26, 12),
    nib(72, BOT - 52, 26, 12),
  ],
};

const GLYPHS: Glyph[] = [
  A_GLYPH,
  {
    w: 100,
    solid: [
      `M14 ${TOP} H44 V${BOT} H14 Z`,
      nib(6, TOP, 32, 14),
      nib(6, BOT, 32, 14),
      // Both bowls start inside the stem, so there is no seam down the middle.
      `M32 ${TOP} H74 L96 ${TOP + 22} V${TOP + 44} L76 ${TOP + 66} H32 Z`,
      `M32 ${TOP + 70} H78 L100 ${TOP + 94} V${TOP + 128} L78 ${BOT} H32 Z`,
      nib(30, TOP + 52, 26, 12),
    ],
    holes: [
      `M56 ${TOP + 16} H72 L84 ${TOP + 28} V${TOP + 40} L72 ${TOP + 52} H56 Z`,
      `M56 ${TOP + 86} H76 L88 ${TOP + 100} V${TOP + 126} L76 ${TOP + 144} H56 Z`,
    ],
  },
  A_GLYPH,
  {
    w: 58,
    solid: [
      `M16 ${TOP} H46 V${BOT} H16 Z`,
      nib(8, TOP, 32, 15),
      nib(8, BOT, 32, 15),
      nib(30, TOP + 56, 26, 12),
      nib(4, BOT - 62, 26, 12),
    ],
  },
];

const Wordmark: React.FC = () => {
  const H = 214;
  const gap = 10;
  let x = 0;
  const solids: React.ReactElement[] = [];
  const holes: React.ReactElement[] = [];
  GLYPHS.forEach((g, i) => {
    const at = x;
    x += g.w + gap;
    g.solid.forEach((d, j) =>
      solids.push(<path key={`s${i}-${j}`} d={d} transform={`translate(${at} 0)`} />));
    (g.holes ?? []).forEach((d, j) =>
      holes.push(<path key={`h${i}-${j}`} d={d} transform={`translate(${at} 0)`} />));
  });
  const total = x - gap;
  return (
    <svg
      viewBox={`-8 -14 ${total + 16} ${H + 16}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
    >
      <defs>
        <mask id="abai-mark" maskUnits="userSpaceOnUse" x="-8" y="-14" width={total + 16} height={H + 16}>
          <g fill="#fff">{solids}</g>
          <g fill="#000">{holes}</g>
        </mask>
      </defs>
      <rect
        x="-8" y="-14" width={total + 16} height={H + 16}
        fill="currentColor"
        mask="url(#abai-mark)"
      />
    </svg>
  );
};
