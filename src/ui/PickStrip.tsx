/**
 * The card picker.
 *
 * Anything that asks you to choose a card — discarding to hand size, scrying, searching,
 * or naming a creature in a graveyard that nothing on the board can point at — is answered
 * here: a band of dark glass across the screen carrying a single row of cards, running left
 * to right. One row, always. When there are more cards than fit, the row scrolls rather
 * than wrapping, because a wall of cards is a puzzle and a row is a list.
 *
 * The dashed arrow is untouched by this. Targets that are physically on the board are still
 * chosen by aiming at them; this is only for the ones that are not.
 */

import React from 'react';
import type { CardDef } from '../game/types';
import { getCardThumbUrl } from '../render/cardFace';
import { sfx } from '../game/audio';

export interface PickOption {
  key: string;
  label: string;
  /** The card to show. Options with no card render as a plain word in the same row. */
  card?: CardDef | null;
}

interface Props {
  title: string;
  note?: string;
  options: PickOption[];
  onPick: (key: string) => void;
  /** Shown at the right-hand end when the choice can be backed out of. */
  onCancel?: () => void;
  cancelLabel?: string;
}

export const PickStrip: React.FC<Props> = ({
  title, note, options, onPick, onCancel, cancelLabel = '取消',
}) => (
  <div className="pick">
    <div className="pick-head">
      <span className="pick-title">{title}</span>
      {note && <span className="pick-note">{note}</span>}
      <span className="pick-count">{options.length}</span>
      {onCancel && (
        <button className="pick-cancel" onClick={onCancel}>{cancelLabel}</button>
      )}
    </div>

    <div className="pick-row">
      {options.map((o) => (
        <button
          key={o.key}
          className={`pick-item${o.card ? '' : ' plain'}`}
          onClick={() => { sfx.tap(); onPick(o.key); }}
          onMouseEnter={() => sfx.hover()}
        >
          {o.card && <img src={getCardThumbUrl(o.card)} alt={o.label} draggable={false} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  </div>
);
