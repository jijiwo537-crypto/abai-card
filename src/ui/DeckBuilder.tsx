/**
 * 牌庫編輯器 — build a 60-card deck from scratch or from a preset.
 * Rules and copy follow the original exactly: 4 copies of any non-land card,
 * lands unrestricted, exactly 60 to save. Saved decks join the deck registry and
 * appear on the home screen.
 */

import React, { useMemo, useRef, useState } from 'react';
import * as E from '../game/engine';
import type { CardDef } from '../game/types';
import { getCardThumbUrl, cmcOf } from '../render/cardFace';
import { useCardFx } from '../render/CardFx';

const COLOR_TABS = [
  { key: 'all', label: '全部顏色' },
  { key: 'W', label: '白' },
  { key: 'U', label: '藍' },
  { key: 'B', label: '黑' },
  { key: 'R', label: '紅' },
  { key: 'G', label: '綠' },
  { key: 'L', label: '魔法石' },
];

const TYPE_TABS = [
  { key: 'all', label: '全部種類' },
  { key: 'creature', label: '生物' },
  { key: 'instant', label: '瞬間' },
  { key: 'sorcery', label: '法術' },
  { key: 'artifact', label: '秘寶' },
  { key: 'enchantment', label: '結界' },
  { key: 'land', label: '魔法石' },
];

interface Props {
  onClose: () => void;
}

export const DeckBuilder: React.FC<Props> = ({ onClose }) => {
  const fx = useCardFx();
  const poolRef = useRef<HTMLDivElement>(null);
  const [version, bump] = useState(0);
  const [name, setName] = useState('我的自創牌組');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [color, setColor] = useState('all');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');

  const bases = useMemo(() => E.allDecks(), [version]);

  const pool = useMemo(() => {
    const needle = q.trim();
    return Object.values(E.CARDS)
      .filter((c) => !c.token)
      .filter((c) => color === 'all' || c.color === color)
      .filter((c) => type === 'all' || c.type === type)
      .filter((c) => !needle || c.name.includes(needle) || (c.text || '').includes(needle))
      .sort((a, b) => cmcOf(a) - cmcOf(b) || a.name.localeCompare(b.name, 'zh-Hant'));
  }, [color, type, q]);

  const countValues = Object.keys(counts).map((k) => counts[k]);
  const total: number = countValues.reduce((a, b) => a + b, 0);
  const landCount: number = Object.keys(counts)
    .filter((id) => E.CARDS[id]?.type === 'land')
    .reduce((a, id) => a + counts[id], 0);
  const spellCount = total - landCount;

  const colors = useMemo(() => {
    const set = new Set<string>();
    for (const id of Object.keys(counts)) {
      const c = E.CARDS[id]?.color;
      if (c && 'WUBRG'.includes(c)) set.add(c);
    }
    return [...set];
  }, [counts]);

  const say = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 2600);
  };

  const add = (id: string) => {
    const def = E.CARDS[id];
    const have = counts[id] ?? 0;
    if (def.type !== 'land' && have >= 4) {
      say(`「${def.name}」最多只能收錄 4 張（魔法石牌不受此限）。`);
      return;
    }
    setCounts({ ...counts, [id]: have + 1 });
  };

  const remove = (id: string) => {
    const have = counts[id] ?? 0;
    if (have <= 1) {
      const next = { ...counts };
      delete next[id];
      setCounts(next);
    } else {
      setCounts({ ...counts, [id]: have - 1 });
    }
  };

  const loadBase = (deck: any) => {
    const next: Record<string, number> = {};
    for (const [id, n] of deck.list) next[id] = n;
    setCounts(next);
    setName(deck.custom ? deck.name : `${deck.name}．改造版`);
    say(`已載入「${deck.name}」作為起點。`);
  };

  const save = () => {
    if (total !== 60) {
      say(`牌組必須恰好 60 張，目前為 ${total} 張。`);
      return;
    }
    if (!name.trim()) {
      say('請先為牌組命名。');
      return;
    }
    const hero =
      Object.keys(counts)
        .filter((id) => E.CARDS[id]?.type === 'creature')
        .sort(
          (a, b) =>
            (E.CARDS[b].pow ?? 0) + (E.CARDS[b].tou ?? 0) - ((E.CARDS[a].pow ?? 0) + (E.CARDS[a].tou ?? 0)),
        )[0] ?? 'angel';
    const deck = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      // An all-artifact build really has no colours, and the picker draws that case.
      colors,
      hero,
      heroName: name.trim(),
      strategy: '自創',
      blurb: `玩家自建牌組，共 ${spellCount} 張非魔法石牌與 ${landCount} 張魔法石牌。`,
      list: Object.entries(counts),
      custom: true,
    };
    (E.CUSTOM_DECKS as any)[deck.id] = deck;
    say(`已儲存牌組「${deck.name}」！回到選單即可在套牌列表中選用。`);
    bump((n) => n + 1);
  };

  const deleteCustom = (id: string, label: string) => {
    delete (E.CUSTOM_DECKS as any)[id];
    say(`已刪除牌組「${label}」。`);
    bump((n) => n + 1);
  };

  const entries = Object.entries(counts).sort(
    ([a], [b]) => cmcOf(E.CARDS[a]) - cmcOf(E.CARDS[b]) || E.CARDS[a].name.localeCompare(E.CARDS[b].name, 'zh-Hant'),
  );

  return (
    <div className="tool deckeditor">
      <header className="tool-head">
        <div>
          <h1>牌庫編輯器</h1>
          <p>從空白或既有牌組出發，自由增減卡牌，恰好 60 張即可儲存為自訂套牌</p>
        </div>
        <button className="tool-back" onClick={onClose}>
          ← 返回選單
        </button>
      </header>

      <div className="editor-toolbar">
        <input
          className="deckname"
          placeholder="牌組名稱"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="editor-baserow">
          <span>從此出發：</span>
          {bases.map((d: any) => (
            <span key={d.id} className="editor-base-item">
              <button className="chip" onClick={() => loadBase(d)}>
                {d.name}
                {d.custom ? '（自建）' : ''}
              </button>
              {d.custom && (
                <button className="editor-del" title="刪除此自建牌組" onClick={() => deleteCustom(d.id, d.name)}>
                  移除
                </button>
              )}
            </span>
          ))}
          <button className="chip" onClick={() => setCounts({})}>
            清空重來
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="editor-pool" ref={poolRef}>
          <div className="filters">
            <input
              className="search"
              placeholder="搜尋卡名或效果文字…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {COLOR_TABS.map((t) => (
              <button key={t.key} className={`chip${color === t.key ? ' on' : ''}`} onClick={() => setColor(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="filters">
            {TYPE_TABS.map((t) => (
              <button key={t.key} className={`chip${type === t.key ? ' on' : ''}`} onClick={() => setType(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="cardgrid">
            {pool.map((c) => (
              <button key={c.id} className="cardcell addable" onClick={() => add(c.id)}>
                {/* The real card — border effect and turning emblem — over a flat fallback. */}
                <span className="fx-slot" ref={fx.slot(`pool:${c.id}`, c)}>
                  <img src={getCardThumbUrl(c)} alt={c.name} loading="lazy" />
                </span>
                <span className="add-badge">加入</span>
                {counts[c.id] ? <b className="have">×{counts[c.id]}</b> : null}
              </button>
            ))}
          </div>
        </div>

        <aside className="editor-side">
          <div className={`deck-count${total === 60 ? ' ok' : ''}`}>
            {total} / 60 張（非魔法石 {spellCount}．魔法石 {landCount}）
          </div>
          {!entries.length && <p className="empty">尚未加入任何卡牌</p>}
          <ul className="decklist">
            {entries.map(([id, n]) => (
              <li key={id}>
                <button className="dl-minus" onClick={() => remove(id)}>
                  −
                </button>
                <span className="dl-n">{n}</span>
                <span className="dl-name">{E.CARDS[id].name}</span>
                <button className="dl-plus" onClick={() => add(id)}>
                  ＋
                </button>
              </li>
            ))}
          </ul>
          <button className="btn-go editor-save" onClick={save}>
            儲存牌組
          </button>
        </aside>
      </div>

      {toast && <div className="toast">{toast}</div>}
      <fx.Layer clip={poolRef} z={4} />
    </div>
  );
};
