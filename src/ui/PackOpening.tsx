/**
 * Opening a pack.
 *
 * Nothing here changes the game. You do not keep the cards, no deck is unlocked, no
 * currency is spent — this is the part of a card game that is purely a thing to watch, and
 * it earns its place by being worth watching.
 *
 * It is built the way the real thing works. A sealed foil pack you have to tear; a rip
 * that goes where your hand went, not down a preset line; and then the five cards come out
 * *as five cards*, face-down in a fan, because that is what falls into your hand — a pack
 * that feeds you one card at a time is a slideshow, and it throws away the only thing a
 * spread of five backs is for, which is not knowing which of them is the good one.
 *
 * Rarity is the whole drama, so rarity drives everything: a common turns over and that is
 * all, an uncommon gets a silver sweep, a rare throws rays and particles and knocks the
 * frame, and a mythic gets the prismatic wheel, the rosette, a slow hold and a card that
 * keeps floating afterwards. Colour comes from the card, so a red rare burns and a blue
 * one doesn't. The cards themselves are drawn by the shared card-effect layer, so the
 * border effect and the turning hologram are here exactly as they are on the table.
 *
 * Five cards, weighted the way a booster is: three commons, an uncommon, and a rare that
 * is a mythic one time in eight. The best card sits in the last slot of the fan, so the
 * one you have been avoiding looking at is the one that pays off.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as E from '../game/engine';
import type { CardDef } from '../game/types';
import { getCardThumbUrl, cardTheme } from '../render/cardFace';
import { useCardFx } from '../render/CardFx';
import { sfx } from '../game/audio';

type Rarity = 'C' | 'U' | 'R' | 'M';

/** How much show each rarity gets. Everything below reads off this. */
const SHOW: Record<Rarity, { label: string; rays: number; motes: number; rings: number }> = {
  C: { label: '普通', rays: 0, motes: 0, rings: 1 },
  U: { label: '優良', rays: 0, motes: 12, rings: 1 },
  R: { label: '稀有', rays: 14, motes: 24, rings: 2 },
  M: { label: '秘稀', rays: 22, motes: 40, rings: 3 },
};

const rarityOf = (c: CardDef): Rarity => ((c.rarity as Rarity) in SHOW ? (c.rarity as Rarity) : 'C');

/** One pack: three commons, an uncommon, and a rare — mythic one time in eight. */
function rollPack(): CardDef[] {
  const pool = (Object.values(E.CARDS) as CardDef[]).filter((c) => !c.token);
  const by = (r: Rarity) => pool.filter((c) => rarityOf(c) === r);
  const bags: Record<Rarity, CardDef[]> = { C: by('C'), U: by('U'), R: by('R'), M: by('M') };
  const taken = new Set<string>();
  const draw = (r: Rarity): CardDef => {
    const bag = bags[r].length ? bags[r] : pool;
    for (let i = 0; i < 24; i++) {
      const c = bag[Math.floor(Math.random() * bag.length)];
      if (!taken.has(c.id)) { taken.add(c.id); return c; }
    }
    return bag[Math.floor(Math.random() * bag.length)];
  };
  const top: Rarity = Math.random() < 0.125 && bags.M.length ? 'M' : 'R';
  return [draw('C'), draw('C'), draw('C'), draw('U'), draw(top)];
}

type Stage = 'sealed' | 'tearing' | 'fan';

interface Props {
  onClose: () => void;
}

export const PackOpening: React.FC<Props> = ({ onClose }) => {
  const [packNo, setPackNo] = useState(0);
  const [cards, setCards] = useState<CardDef[]>(() => rollPack());
  const [stage, setStage] = useState<Stage>('sealed');
  /** Which of the five have been turned over. */
  const [open, setOpen] = useState<boolean[]>([false, false, false, false, false]);
  /** The one currently blown up in the middle, if any. */
  const [zoom, setZoom] = useState<number | null>(null);
  /** Where on the pack the tear started, 0..1 across its width. */
  const [tearAt, setTearAt] = useState(0.5);
  const timers = useRef<number[]>([]);
  const fx = useCardFx();

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const allOpen = open.every(Boolean);

  const tear = (e: React.MouseEvent) => {
    if (stage !== 'sealed') return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTearAt(Math.min(0.85, Math.max(0.15, (e.clientX - r.left) / r.width)));
    setStage('tearing');
    sfx.shatter();
    sfx.launch(0.18);
    after(1150, () => { setStage('fan'); sfx.draw(); sfx.draw(0.12); sfx.draw(0.24); });
  };

  const turn = (i: number) => {
    if (open[i]) { setZoom(i); sfx.tap(); return; }
    const r = rarityOf(cards[i]);
    setOpen((prev) => prev.map((v, k) => (k === i ? true : v)));
    setZoom(i);
    if (r === 'M') { sfx.victory(); sfx.cast(); }
    else if (r === 'R') { sfx.bannerGood(); sfx.summon(); }
    else if (r === 'U') { sfx.summon(); }
    else sfx.draw();
  };

  const turnAll = () => {
    if (allOpen) return;
    sfx.bannerGood();
    open.forEach((v, i) => {
      if (v) return;
      after(i * 190, () => {
        setOpen((prev) => prev.map((x, k) => (k === i ? true : x)));
        const r = rarityOf(cards[i]);
        if (r === 'M') sfx.victory();
        else if (r === 'R') sfx.summon();
        else sfx.draw();
      });
    });
  };

  const again = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setCards(rollPack());
    setPackNo((n) => n + 1);
    setOpen([false, false, false, false, false]);
    setZoom(null);
    setStage('sealed');
    sfx.tap();
  };

  const opened = open.filter(Boolean).length;

  return (
    <div className={`pk pk-in-${stage}`}>
      <div className="pk-sky" aria-hidden="true"><Motes /></div>

      <header className="pk-head">
        <button className="picker-back" onClick={onClose}>返回</button>
        <h1>開啟卡包</h1>
        <span className="picker-count">
          {stage === 'fan' ? `${opened} / ${cards.length}` : `${cards.length} 張`}
        </span>
      </header>

      {stage !== 'fan' && (
        <div className="pk-stage">
          <Pack key={packNo} tearing={stage === 'tearing'} tearAt={tearAt} onTear={tear} />
          <p className="pk-hint">{stage === 'sealed' ? '點擊卡包撕開' : '　'}</p>
        </div>
      )}

      {stage === 'fan' && (
        <div className="pk-stage">
          {/*
            * All five at once, face-down, fanned the way they fall out. The one on the far
            * right is the rare; nobody is told that, and everybody works it out.
            */}
          <div className="pk-fan" key={packNo}>
            {cards.map((c, i) => {
              const r = rarityOf(c);
              const [c1, c2] = cardTheme(c as any);
              return (
                <div
                  key={`${packNo}-${c.id}`}
                  className={`pk-seat r-${r}${open[i] ? ' shown' : ''}`}
                  style={{
                    ['--i' as string]: i - 2,
                    ['--c1' as string]: c1,
                    ['--c2' as string]: c2,
                    animationDelay: `${i * 80}ms`,
                  }}
                  onClick={() => turn(i)}
                >
                  {open[i] && <Aura show={SHOW[r]} rarity={r} />}
                  <div className="pk-flip">
                    <div className="pk-back"><CardBack /></div>
                    <div className="pk-front">
                      {/* The slot is the rectangle; the FX layer draws the card into it. */}
                      <span className="fx-slot" ref={fx.slot(`${packNo}-${i}`, c as any)}>
                        <img src={getCardThumbUrl(c as any)} alt={c.name} />
                      </span>
                    </div>
                  </div>
                  {open[i] && <span className={`pk-rarity r-${r}`}>{SHOW[r].label}</span>}
                </div>
              );
            })}
          </div>

          <div className="pk-actions">
            {!allOpen && <button className="pl-build" onClick={turnAll}>全部翻開</button>}
            {allOpen && <button className="pl-build" onClick={onClose}>返回</button>}
            <button className="pl-go" onClick={again}>
              再開一包
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
            </button>
          </div>
          <p className="pk-hint">{allOpen ? '點任一張可放大細看' : '點擊卡背翻開'}</p>
        </div>
      )}

      {/* Blown up, over everything, with its own copy in the effect layer. */}
      {zoom !== null && open[zoom] && (
        <div className="pk-zoom" onClick={() => setZoom(null)}>
          <div className={`pk-zoom-card r-${rarityOf(cards[zoom])}`}>
            <span className="fx-slot" ref={fx.slot('zoom', cards[zoom] as any)}>
              <img src={getCardThumbUrl(cards[zoom] as any)} alt={cards[zoom].name} />
            </span>
          </div>
          <b className="pk-zoom-name">{cards[zoom].name}</b>
        </div>
      )}

      <fx.Layer z={44} />
    </div>
  );
};

/* ------------------------------------------------------------------ the pack ---- */

/**
 * The sealed pack, and the tear.
 *
 * The rip is cut with a `clip-path` polygon whose vertices are jittered from a fixed hash,
 * so it looks torn rather than sliced, and it is centred on wherever the pointer went in —
 * the top peels away from *your* hand. Two halves, because one moving piece is a card
 * sliding out of a sleeve and two is a wrapper coming apart.
 */
const Pack: React.FC<{ tearing: boolean; tearAt: number; onTear: (e: React.MouseEvent) => void }> = (
  { tearing, tearAt, onTear },
) => {
  const seam = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 22; i++) {
      const x = (i / 22) * 100;
      const near = 1 - Math.min(1, Math.abs(x / 100 - tearAt) * 2.6);
      const jag = ((i * 2654435761) >>> 0) % 100 / 100;
      pts.push(`${x.toFixed(1)}% ${(26 - near * 7 + jag * 3.4).toFixed(1)}%`);
    }
    return pts;
  }, [tearAt]);

  const topClip = `polygon(0% 0%, 100% 0%, 100% 26%, ${[...seam].reverse().join(', ')}, 0% 26%)`;
  const bodyClip = `polygon(${seam.join(', ')}, 100% 100%, 0% 100%)`;

  return (
    <div className={`pk-pack${tearing ? ' tearing' : ''}`} onClick={onTear}>
      <div className="pk-piece pk-lid" style={{ clipPath: topClip }}><Foil /></div>
      <div className="pk-piece pk-body" style={{ clipPath: bodyClip }}><Foil /></div>
      {/*
        * The light out of the rip, in four parts, because one shape cannot do all of it: a
        * hard blade that says the foil has split, a soft core that swells out of the tear,
        * a corona of rays raking outward, and a shower of sparks torn off the edge.
        */}
      <span className="pk-beam" style={{ left: `${tearAt * 100}%` }} aria-hidden="true" />
      <svg className="pk-corona" style={{ left: `${tearAt * 100}%` }} viewBox="-50 -50 100 100" aria-hidden="true">
        {Array.from({ length: 20 }, (_, i) => {
          const a = (i / 20) * 360;
          const w = i % 2 ? 0.8 : 2.1;
          return <polygon key={i} points={`0,0 ${-w},-64 ${w},-64`} transform={`rotate(${a})`} fill="#dcecff" opacity={i % 2 ? 0.4 : 0.75} />;
        })}
      </svg>
      <span className="pk-sparks" style={{ left: `${tearAt * 100}%` }} aria-hidden="true">
        {Array.from({ length: 26 }, (_, i) => {
          const h = ((i * 2654435761) >>> 0);
          const a = ((h % 360) * Math.PI) / 180;
          const d = 90 + ((h >>> 9) % 190);
          return (
            <i
              key={i}
              style={{
                ['--dx' as string]: `${(Math.cos(a) * d).toFixed(0)}px`,
                ['--dy' as string]: `${(Math.sin(a) * d * 0.85).toFixed(0)}px`,
                animationDelay: `${140 + ((h >>> 3) % 260)}ms`,
              }}
            />
          );
        })}
      </span>
    </div>
  );
};

/**
 * The wrapper's face.
 *
 * A booster wrapper is a printed object, and a flat gradient with a word on it does not
 * read as one. So it is built the way one is made: a dark foil ground with a brushed grain,
 * a guilloche rosette struck into the middle, a hairline rule boxing the panel, gold type,
 * a hologram patch in the corner, and a barcode along the foot — the small honest details
 * that say "this came off a press" rather than "this is a rectangle".
 *
 * Over all of it, two sheens at different speeds and angles, because one moving highlight
 * reads as a CSS animation and two crossing ones read as light on foil.
 */
const Foil: React.FC = () => (
  <div className="pk-foil">
    <span className="pk-grain" aria-hidden="true" />
    <span className="pk-sheen" aria-hidden="true" />
    <span className="pk-sheen pk-sheen-2" aria-hidden="true" />

    <svg className="pk-guilloche" viewBox="-60 -60 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="pk-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff6d6" />
          <stop offset="0.32" stopColor="#e2b866" />
          <stop offset="0.6" stopColor="#8a6a2f" />
          <stop offset="0.85" stopColor="#f4dfa8" />
          <stop offset="1" stopColor="#c79a4a" />
        </linearGradient>
      </defs>
      {/* The engine-turned rosette a banknote wears: one closed curve, many lobes. */}
      {[0, 1, 2].map((ring) => {
        const lobes = 22 + ring * 9;
        const r0 = 46 - ring * 11;
        const amp = 5.4 - ring * 1.2;
        const pts: string[] = [];
        for (let i = 0; i <= 360; i += 2) {
          const a = (i * Math.PI) / 180;
          const r = r0 + Math.sin(a * lobes) * amp;
          pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
        }
        return (
          <polyline
            key={ring}
            points={pts.join(' ')}
            fill="none"
            stroke="url(#pk-gold)"
            strokeWidth={0.5 - ring * 0.08}
            opacity={0.5 - ring * 0.08}
          />
        );
      })}
      <polygon points="0,-27 23,-13.5 23,13.5 0,27 -23,13.5 -23,-13.5" fill="none" stroke="url(#pk-gold)" strokeWidth="1.5" />
      <polygon points="0,-16 14,-8 14,8 0,16 -14,8 -14,-8" fill="url(#pk-gold)" opacity="0.16" />
      <circle r="7.5" fill="none" stroke="url(#pk-gold)" strokeWidth="1.1" />
      <circle r="2.4" fill="url(#pk-gold)" />
    </svg>

    <span className="pk-rule" aria-hidden="true" />
    <b className="pk-word">祕法卡包</b>
    <i className="pk-sub">ARCANE DUEL · BOOSTER PACK</i>

    {/* A hologram patch, the way a sealed product is authenticated. */}
    <span className="pk-patch" aria-hidden="true" />

    {/* And a barcode, because printed things carry one. */}
    <svg className="pk-code" viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true">
      {Array.from({ length: 42 }, (_, i) => {
        const h = ((i * 2654435761) >>> 0) % 100;
        return (
          <rect
            key={i}
            x={i * 2.35}
            y="0"
            width={h > 62 ? 1.5 : 0.7}
            height="14"
            fill="#cbb98f"
            opacity={0.42}
          />
        );
      })}
    </svg>
  </div>
);

/**
 * The back of a face-down card.
 *
 * Quiet, because five of these sit side by side and the whole point of the moment is that
 * they tell you nothing. But printed rather than blank: the same struck rosette and hexagon
 * as the wrapper, in cold silver instead of gold, with a foil sweep crossing it.
 */
const CardBack: React.FC = () => (
  <div className="pk-backface">
    <span className="pk-back-sheen" aria-hidden="true" />
    <svg viewBox="-50 -75 100 150" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="pk-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8f9ec4" />
          <stop offset="0.4" stopColor="#4d5878" />
          <stop offset="0.7" stopColor="#aab8dc" />
          <stop offset="1" stopColor="#3d4763" />
        </linearGradient>
      </defs>
      <rect x="-46" y="-71" width="92" height="142" rx="5" fill="none" stroke="url(#pk-silver)" strokeWidth="1.1" opacity="0.85" />
      <rect x="-41" y="-66" width="82" height="132" rx="3" fill="none" stroke="url(#pk-silver)" strokeWidth="0.4" opacity="0.5" />
      {[0, 1].map((ring) => {
        const lobes = 20 + ring * 10;
        const r0 = 30 - ring * 9;
        const amp = 3.4 - ring * 0.9;
        const pts: string[] = [];
        for (let i = 0; i <= 360; i += 3) {
          const a = (i * Math.PI) / 180;
          const r = r0 + Math.sin(a * lobes) * amp;
          pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
        }
        return <polyline key={ring} points={pts.join(' ')} fill="none" stroke="url(#pk-silver)" strokeWidth="0.5" opacity={0.6 - ring * 0.15} />;
      })}
      <polygon points="0,-19 16.5,-9.5 16.5,9.5 0,19 -16.5,9.5 -16.5,-9.5" fill="none" stroke="url(#pk-silver)" strokeWidth="1.2" />
      <polygon points="0,-11 9.5,-5.5 9.5,5.5 0,11 -9.5,5.5 -9.5,-5.5" fill="url(#pk-silver)" opacity="0.28" />
      <circle r="4.6" fill="none" stroke="url(#pk-silver)" strokeWidth="0.9" />
      <circle r="1.6" fill="url(#pk-silver)" />
    </svg>
  </div>
);

/* ------------------------------------------------------------------ the show ---- */

/** Everything that happens behind a card when it turns over. Scaled by rarity. */
const Aura: React.FC<{ show: typeof SHOW['C']; rarity: Rarity }> = ({ show, rarity }) => (
  <div className={`pk-aura r-${rarity}`} aria-hidden="true">
    {rarity === 'M' && <span className="pk-prism" />}
    {show.rays > 0 && (
      <svg className="pk-rays" viewBox="-50 -50 100 100">
        {Array.from({ length: show.rays }, (_, i) => {
          const a = (i / show.rays) * 360;
          const w = i % 2 ? 1.1 : 2.4;
          return (
            <polygon
              key={i}
              points={`0,0 ${-w},-70 ${w},-70`}
              transform={`rotate(${a})`}
              fill={i % 2 ? 'var(--c2)' : 'var(--c1)'}
              opacity={i % 2 ? 0.35 : 0.55}
            />
          );
        })}
      </svg>
    )}
    {Array.from({ length: show.rings }, (_, i) => (
      <span key={i} className="pk-ring" style={{ animationDelay: `${i * 130}ms` }} />
    ))}
    <span className="pk-flash" />
    {show.motes > 0 && (
      <div className="pk-motes">
        {Array.from({ length: show.motes }, (_, i) => {
          const h = ((i * 2654435761) >>> 0);
          const a = ((h % 360) * Math.PI) / 180;
          const d = 110 + ((h >>> 9) % 170);
          return (
            <i
              key={i}
              style={{
                ['--dx' as string]: `${(Math.cos(a) * d).toFixed(0)}px`,
                ['--dy' as string]: `${(Math.sin(a) * d * 0.8).toFixed(0)}px`,
                animationDelay: `${(h >>> 3) % 220}ms`,
                background: i % 3 ? 'var(--c1)' : 'var(--c2)',
              }}
            />
          );
        })}
      </div>
    )}
  </div>
);

/** Dust in the room, so the black behind the pack is a place rather than a hole. */
const Motes: React.FC = () => (
  <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
    {Array.from({ length: 46 }, (_, i) => {
      const h = ((i * 2654435761) >>> 0);
      return (
        <circle
          key={i}
          cx={((h % 1000) / 1000) * 100}
          cy={(((h >>> 10) % 1000) / 1000) * 100}
          r={0.08 + ((h >>> 20) % 100) / 700}
          fill="#ffffff"
          opacity={0.08 + ((h >>> 16) % 100) / 600}
        />
      );
    })}
  </svg>
);
