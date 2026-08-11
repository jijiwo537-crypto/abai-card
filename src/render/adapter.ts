/**
 * Bridges the ArcaneDuel engine's state onto the 3D battle renderer.
 *
 * The renderer was written for a different data model, so rather than rewrite it we
 * translate: an engine card instance becomes a `RenderCard` carrying both the renderer's
 * expected fields and the card definition the face art is drawn from.
 */

import * as E from '../game/engine';
import type { CardDef } from '../game/types';
import { cardTheme, holoTypeOf, borderTypeOf } from './cardFace';

export type Side = 'you' | 'foe';

/** The renderer's card-type vocabulary. */
export type RenderType = 'Land' | 'Creature' | 'Artifact' | 'Enchantment' | 'Sorcery' | 'Instant';

const TYPE_MAP: Record<string, RenderType> = {
  land: 'Land',
  creature: 'Creature',
  artifact: 'Artifact',
  enchantment: 'Enchantment',
  sorcery: 'Sorcery',
  instant: 'Instant',
};

export interface RenderCard extends CardDef {
  instanceId: string;
  renderType: RenderType;
  isTapped: boolean;
  isAttacking: boolean;
  isBlocking: boolean;
  summoningSickness: boolean;
  damage: number;
  counters: number;
  attachedTo?: string;
  /** Power/toughness after anthems, auras, counters and temporary pumps. */
  livePow: number;
  liveTou: number;
  /**
   * The keywords the creature actually has right now, aura and equipment grants included.
   * The card face prints these rather than the ones printed on the card, because a creature
   * wearing 縛光法陣 really is a 守軍 and the card in front of the player should say so.
   */
  liveKw?: string[];
  color1: string;
  color2: string;
  holoType: number;
  borderType: number;
  /** Owner side, so the renderer can pick a facing. */
  side: Side;
  /**
   * Already destroyed, but still holding its place in the row until the exchange that
   * killed it has finished playing. The renderer collapses it where it stands.
   */
  fallen?: boolean;
}

/** The renderer keys card meshes off `type`; keep its vocabulary. */
export function renderTypeOf(def: CardDef): RenderType {
  return TYPE_MAP[def.type] || 'Artifact';
}

/**
 * Builds a render card for an in-play instance. `state` is an engine state; `iid` an
 * instance id present in `state.cards`.
 */
export function toRenderCard(state: any, iid: string, side: Side): RenderCard {
  const inst = state.cards[iid];
  const def: CardDef = E.defOf(state, iid);
  const [c1, c2] = cardTheme(def);
  const isCreature = def.type === 'creature';
  return {
    ...def,
    instanceId: iid,
    renderType: renderTypeOf(def),
    isTapped: !!inst.tapped,
    isAttacking: !!inst.attacking,
    isBlocking: Object.values(state.blocks || {}).some((ids: any) => (ids || []).includes(iid)),
    summoningSickness: !!inst.sick,
    damage: inst.damage || 0,
    counters: inst.counters || 0,
    attachedTo: inst.attachedTo,
    livePow: isCreature ? E.powerOf(state, iid) : (def.pow ?? 0),
    liveTou: isCreature ? E.toughnessOf(state, iid) : (def.tou ?? 0),
    /*
     * Regeneration is spent once used, and comes back at the next untap. While it is spent
     * the card no longer lists it: a creature that has just been destroyed and reassembled
     * still saying it regenerates reads as a promise it cannot keep. The rules are not
     * touched — the engine asks the card itself, not this list.
     */
    liveKw: isCreature
      ? (E.keywordsOf(state, iid) as string[]).filter(
          (k) => k !== 'regenerate' || !state.cards[iid]?.regenUsed)
      : undefined,
    color1: c1,
    color2: c2,
    holoType: holoTypeOf(def),
    borderType: borderTypeOf(def),
    side,
  };
}

/** Cards in a zone, as render cards. */
export function zoneCards(state: any, side: Side, zone: 'hand' | 'field' | 'gy' | 'exile'): RenderCard[] {
  return (state.zones[side][zone] as string[]).map((iid) => toRenderCard(state, iid, side));
}

/** Battlefield split the way the board lays it out: creatures in front, lands behind. */
export function splitField(cards: RenderCard[]) {
  return {
    creatures: cards.filter((c) => c.renderType !== 'Land'),
    lands: cards.filter((c) => c.renderType === 'Land'),
  };
}

/** Mana currently available to a side, as the engine computes it. */
export function manaOf(state: any, side: Side): Record<string, number> {
  return E.availableMana(state, side);
}
