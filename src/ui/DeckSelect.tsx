/**
 * Deck selection, reached by pressing start on the title screen.
 *
 * Twenty-six lists is too many for a wall of equal tiles, so they are banded by colour —
 * pick white and you see every deck that casts a white spell, mono and pair alike, which
 * is how a player looking for "something white" actually looks. The wall itself is in the
 * format's own order: the five colours on their own, then the ten pairs, then the deck
 * that plays no colour at all.
 *
 * The screen keeps the title screen's language: black ground, hairline rules, corner
 * brackets, and colour used for exactly one thing — the mana pips that say what a deck
 * actually casts.
 */

import React, { useMemo, useRef, useState } from 'react';
import * as E from '../game/engine';
import type { CardDef, DeckDef } from '../game/types';
import {
  getCardThumbUrl, cmcOf, costPips, rulesTextOf, remindersEnabled, setRemindersEnabled,
} from '../render/cardFace';
import { useCardFx } from '../render/CardFx';
import { sfx } from '../game/audio';

const COLOR_DOT: Record<string, string> = {
  W: '#fde68a',
  U: '#38bdf8',
  B: '#c084fc',
  R: '#f87171',
  G: '#4ade80',
};

const COLOR_LABEL: Record<string, string> = { W: '白', U: '藍', B: '黑', R: '紅', G: '綠' };

const BANDS: { key: string; label: string; test: (d: DeckDef) => boolean }[] = [
  { key: 'W', label: '白', test: (d) => d.colors.includes('W') },
  { key: 'U', label: '藍', test: (d) => d.colors.includes('U') },
  { key: 'B', label: '黑', test: (d) => d.colors.includes('B') },
  { key: 'R', label: '紅', test: (d) => d.colors.includes('R') },
  { key: 'G', label: '綠', test: (d) => d.colors.includes('G') },
  { key: 'none', label: '無色', test: (d) => d.colors.length === 0 },
];

interface Props {
  youDeck: string;
  onPickYou: (id: string) => void;
  onLaunch: () => void;
  /** The builder lives here rather than on the title screen. */
  onBuild: () => void;
  /** So do the pack opening and the tutorial. */
  onPacks: () => void;
  onTutorial: () => void;
  onBack: () => void;
}

export const DeckSelect: React.FC<Props> = ({
  youDeck, onPickYou, onLaunch, onBuild, onPacks, onTutorial, onBack,
}) => {
  // The tutorial's own two decks are registered so `createMatch` can take them by id;
  // they are not decks anyone chooses, so they never appear on the wall.
  const decks = E.allDecks().filter((d) => !d.id.startsWith('tut_'));
  const [band, setBand] = useState<string>('all');
  /** The deck whose sixty cards are being read, if any. */
  const [listing, setListing] = useState<DeckDef | null>(null);
  /** Keyword glosses on the card faces. Off by default; see `setRemindersEnabled`. */
  const [glosses, setGlosses] = useState(remindersEnabled);
  const selected = decks.find((d) => d.id === youDeck) ?? decks[0];

  const shown = useMemo(() => {
    if (band === 'all') return decks;
    const b = BANDS.find((x) => x.key === band);
    return b ? decks.filter(b.test) : decks;
  }, [decks, band]);

  const counts = useMemo(
    () => Object.fromEntries(BANDS.map((b) => [b.key, decks.filter(b.test).length])),
    [decks],
  );

  return (
    <div className="picker">
      <div className="picker-frame" aria-hidden="true">
        <span className="tf-corner tl-c" />
        <span className="tf-corner tr-c" />
        <span className="tf-corner bl-c" />
        <span className="tf-corner br-c" />
      </div>

      <header className="picker-head">
        <button className="picker-back" onClick={onBack}>返回</button>
        <h1>選擇牌組</h1>
        {/*
          * The gloss switch lives here because it changes every card face in the game, and
          * this is the last screen before there are card faces to change.
          */}
        <button
          className={`picker-gloss${glosses ? ' on' : ''}`}
          role="switch"
          aria-checked={glosses}
          onClick={() => { sfx.tap(); setRemindersEnabled(!glosses); setGlosses(!glosses); }}
        >
          <i /> 關鍵字說明
        </button>
        <span className="picker-count">{decks.length} 套</span>
      </header>

      <nav className="picker-bands">
        <button className={band === 'all' ? 'on' : ''} onClick={() => setBand('all')}>
          全部
        </button>
        {BANDS.map((b) => (
          <button key={b.key} className={band === b.key ? 'on' : ''} onClick={() => setBand(b.key)}>
            {b.label}
            <i>{counts[b.key]}</i>
          </button>
        ))}
      </nav>

      {/*
        * Every tile carries its own 卡表 key. Reading a list is a question about *that*
        * deck, and a single button at the bottom of the screen made it a question about
        * whichever deck happened to be selected — so checking one meant picking it first,
        * which is backwards. The tile is a row of two buttons rather than one button with
        * another inside it, because a button inside a button is not a thing a browser
        * agrees to render.
        */}
      <div className="picker-wall">
        {shown.map((d) => (
          <div key={d.id} className={`dtile${d.id === youDeck ? ' on' : ''}`}>
            <button
              className="dtile-pick"
              onClick={() => { sfx.tap(); onPickYou(d.id); }}
              onMouseEnter={() => sfx.hover()}
            >
              <span className="dtile-sigil"><Sigil colors={d.colors} /></span>
              <span className="dtile-body">
                <span className="dtile-name">{d.name}</span>
                <span className="dtile-strat">{d.strategy}</span>
              </span>
              <span className="dtile-pips">
                {d.colors.length
                  ? d.colors.map((c) => <i key={c} style={{ background: COLOR_DOT[c] }} />)
                  : <i className="pip-none" />}
              </span>
            </button>
            <button
              className="dtile-list"
              title={`查看「${d.name}」的卡表`}
              aria-label={`查看「${d.name}」的卡表`}
              onClick={() => { sfx.tap(); setListing(d); }}
            >
              卡表
            </button>
          </div>
        ))}
      </div>

      <footer className="picker-foot">
        <div className="picker-dossier" key={selected.id}>
          <div className="pd-line">
            <span className="pd-name">{selected.name}</span>
            {selected.colors.length ? (
              selected.colors.map((c) => (
                <span key={c} className="pd-chip" style={{ borderColor: COLOR_DOT[c], color: COLOR_DOT[c] }}>
                  {COLOR_LABEL[c] ?? c}
                </span>
              ))
            ) : (
              <span className="pd-chip">無色</span>
            )}
            <span className="pd-chip dim">{selected.strategy}</span>
          </div>
          <p className="pd-blurb">{selected.blurb}</p>
        </div>

        {/*
          * Two keys, and neither of them names the opponent. You are queued against
          * somebody, not handed a menu of who — the deck across the table is drawn when
          * the match is made, the same as it would be in any queue worth the name.
          */}
        <div className="picker-launch">
          <button className="pl-build" onClick={() => { sfx.tap(); onTutorial(); }}>
            教學
          </button>
          <button className="pl-build" onClick={() => { sfx.tap(); onPacks(); }}>
            開卡包
          </button>
          <button className="pl-build" onClick={() => { sfx.tap(); onBuild(); }}>
            牌組編輯器
          </button>
          <button className="pl-go" onClick={() => { sfx.tap(); onLaunch(); }}>
            開始對戰
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
          </button>
        </div>
      </footer>

      {listing && <DeckList deck={listing} onClose={() => setListing(null)} />}
    </div>
  );
};

/**
 * A deck's sixty cards, laid out the way a player counts them: creatures first, then the
 * spells, then the mana. Every row carries its own count, so a list reads as a decklist
 * rather than as a pile — and the art is there because the whole point of looking is to
 * see what you would be holding.
 */
const SECTIONS: { key: string; label: string; test: (c: CardDef) => boolean }[] = [
  { key: 'creature', label: '生物', test: (c) => c.type === 'creature' },
  { key: 'spell', label: '咒語', test: (c) => c.type === 'instant' || c.type === 'sorcery' },
  { key: 'permanent', label: '秘寶與結界', test: (c) => c.type === 'artifact' || c.type === 'enchantment' },
  { key: 'land', label: '魔法石', test: (c) => c.type === 'land' },
];

const DeckList: React.FC<{ deck: DeckDef; onClose: () => void }> = ({ deck, onClose }) => {
  const fx = useCardFx();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(
    () => deck.list
      .map(([id, n]) => ({ def: E.CARDS[id] as CardDef | undefined, n }))
      .filter((r): r is { def: CardDef; n: number } => !!r.def),
    [deck],
  );
  const total = rows.reduce((sum, r) => sum + r.n, 0);
  const sections = SECTIONS
    .map((s) => ({
      ...s,
      cards: rows.filter((r) => s.test(r.def))
        .sort((a, b) => cmcOf(a.def) - cmcOf(b.def) || a.def.name.localeCompare(b.def.name, 'zh-Hant')),
    }))
    .filter((s) => s.cards.length);

  return (
    <div className="dlist" onClick={onClose}>
      <div className="dlist-panel" onClick={(e) => e.stopPropagation()}>
        <header className="dlist-head">
          <b>{deck.name}</b>
          <span>{total} 張</span>
          <button onClick={onClose}>關閉</button>
        </header>
        <div className="dlist-body" ref={scrollRef}>
          {sections.map((s) => (
            <section key={s.key}>
              <h3>
                {s.label}
                <i>{s.cards.reduce((sum, r) => sum + r.n, 0)}</i>
              </h3>
              <ul>
                {s.cards.map((r) => (
                  <li key={r.def.id}>
                    {/* The card as it really looks: border effect, turning emblem and all.
                        The img underneath is what shows if WebGL is unavailable. */}
                    <span className="fx-slot dl-thumb" ref={fx.slot(`${deck.id}:${r.def.id}`, r.def)}>
                      <img src={getCardThumbUrl(r.def)} alt="" loading="lazy" />
                    </span>
                    <b>{r.n}</b>
                    <span className="dl-name">{r.def.name}</span>
                    <span className="dl-cost">
                      {/* Generic mana is an outlined number; a coloured pip is a solid disc. */}
                      {costPips(r.def).map((p, i) => (
                        <i
                          key={i}
                          style={{
                            color: p.label ? p.color : '#05050a',
                            borderColor: p.color,
                            background: p.label ? 'transparent' : p.color,
                          }}
                        >
                          {p.label}
                        </i>
                      ))}
                    </span>
                    {/* The composed line, not the raw field: a card whose only ability is a
                        keyword carries it in `kw` and leaves `text` empty. */}
                    <span className="dl-text">
                      {rulesTextOf(r.def).replace(/\n/g, '　') || (r.def.type === 'land' ? '基本魔法石' : '')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      {/* Scissored to the scrolling body, so a half-scrolled card is cut at its edge. */}
      <fx.Layer clip={scrollRef} z={61} />
    </div>
  );
};

/**
 * Deck sigil: a hexagonal emblem lit in the deck's colours, echoing the holograms
 * that float on the cards themselves. A colourless deck gets it in plain white.
 */
const Sigil: React.FC<{ colors: string[] }> = ({ colors }) => {
  const a = COLOR_DOT[colors[0]] ?? '#e2e8f0';
  const b = COLOR_DOT[colors[colors.length - 1]] ?? a;
  const id = `sig-${colors.join('') || 'c'}`;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="none" stroke={`url(#${id})`} strokeWidth="2.6" />
      <polygon points="50,22 74,36 74,64 50,78 26,64 26,36" fill={`url(#${id})`} opacity="0.16" />
      <circle cx="50" cy="50" r="13" fill="none" stroke={`url(#${id})`} strokeWidth="2.2" />
      <circle cx="50" cy="50" r="4.2" fill={`url(#${id})`} />
    </svg>
  );
};
