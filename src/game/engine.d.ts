import type { CardDef, DeckDef } from './types';

export type Side = 'you' | 'foe';
export type Phase = 'untap' | 'upkeep' | 'draw' | 'main1' | 'atk' | 'blk' | 'blkShow' | 'main2' | 'end';

export interface CardInst {
  iid: string;
  defId: string;
  owner: Side;
  tapped: boolean;
  sick: boolean;
  damage: number;
  attacking?: boolean;
  counters?: number;
  attachedTo?: string;
  regenUsed?: boolean;
}

export interface Zone {
  lib: string[];
  hand: string[];
  field: string[];
  gy: string[];
  exile: string[];
}

export interface LogLine {
  s: string;
  c?: 'sys' | 'good' | 'bad' | 'you' | 'foe';
}

export interface Fx {
  id: number;
  kind: string;
  pid?: Side;
  src?: string;
  tgt?: string;
  defId?: string;
  amt?: number;
  text?: string;
  delay?: number;
}

export interface Pending {
  card: string;
  legal: string[];
  legalP: string[];
  isAttach?: boolean;
  label?: string;
  /** Set for two-target effects such as fight: what still has to be chosen. */
  needSecond?: string;
  /** The first of two targets, once it has been picked. */
  first?: string;
}

export interface Choice {
  kind: string;
  pid: Side;
  options: { key: string; label: string; defId?: string }[];
  remain?: number;
}

export interface GameState {
  seq: number;
  turn: number;
  active: Side;
  first: Side;
  phase: Phase;
  cards: Record<string, CardInst>;
  zones: Record<Side, Zone>;
  life: Record<Side, number>;
  landPlayed: Record<Side, number>;
  attackers: string[];
  blocks: Record<string, string[]>;
  origBlocked: Record<string, string[]>;
  temp: { iid: string; p: number; t: number; kw: string[] }[];
  pending: Pending | null;
  stack: { card: string; caster: Side; target?: string } | null;
  awaitResp: Side | null;
  choice: Choice | null;
  winner: Side | null;
  winReason: string;
  log: LogLine[];
  fx: Fx[];
  fxId: number;
  combatDone?: boolean;
  /** Anthems from permanents that have left play but whose buff persists. */
  legacyAnthems?: Record<Side, { p: number; t: number; scope: string; tribe?: string }[]>;
  decks: Record<Side, string>;
  /** Cursor of the match's own random stream — see `createMatch`'s seed. */
  rng?: number;
  /** The match's own instance-id counter, so tokens are named the same on both ends. */
  iidSeq?: number;
}

export type Action =
  | { t: 'fxDone'; ids: number[] }
  | { t: 'advance' }
  | { t: 'playLand'; iid: string }
  | { t: 'cast'; iid: string }
  | { t: 'chooseTarget'; tid: string }
  | { t: 'cancelPending' }
  | { t: 'skipResponse' }
  | { t: 'toCombat' }
  | { t: 'toggleAttacker'; iid: string }
  | { t: 'confirmAttackers' }
  | { t: 'resolveYourCombat' }
  | { t: 'toggleBlock'; blocker: string; attacker: string }
  | { t: 'unassignBlocker'; blocker: string }
  | { t: 'confirmBlocks' }
  | { t: 'endTurn' }
  | { t: 'choose'; key: string }
  | { t: 'aiAct'; act: any };

export const CARDS: Record<string, CardDef>;
export const DECKS: Record<string, DeckDef>;
export const CUSTOM_DECKS: Record<string, DeckDef>;
export const COLORS: readonly ['W', 'U', 'B', 'R', 'G'];
export const SIDE_NAME: Record<Side, string>;
export const COLOR_NAME: Record<string, string>;
export const KEYWORD_NAME: Record<string, string>;
export const KEYWORD_TEXT: Record<string, string>;

export function cardDefById(defId: string): CardDef;
export function deckById(deckId: string): DeckDef | undefined;
export function allDecks(): DeckDef[];
export function makeCost(g: number, c?: Record<string, number>): { g: number; c: Record<string, number> };

/**
 * Builds a match. With a seed, the deal, the shuffles and the coin toss are repeatable —
 * which is what lets two machines derive the same game from nothing but the seed.
 */
export function createMatch(youDeckId: string, foeDeckId: string, seed?: number): GameState;
export function reducer(state: GameState, action: Action): GameState;
export function aiPlan(state: GameState): { act: any; delay: number } | null;

export function defOf(state: GameState, iid: string): CardDef;
export function creaturesOf(state: GameState, side: Side): string[];
export function manaSourcesOf(state: GameState, side: Side): string[];
export function availableMana(state: GameState, side: Side): Record<string, number> & { total: number };
export function cmc(cost: CardDef['cost']): number;
export function powerOf(state: GameState, iid: string): number;
export function toughnessOf(state: GameState, iid: string): number;
export function keywordsOf(state: GameState, iid: string): string[];
export function hasKeyword(state: GameState, iid: string, kw: string): boolean;
export function anthemBonus(state: GameState, iid: string): [number, number];
export function attachBonus(state: GameState, iid: string): { p: number; t: number; kw: string[] };
export function canPlay(state: GameState, side: Side, iid: string): boolean;
export function canAttack(state: GameState, iid: string): boolean;
export function canBlock(state: GameState, blocker: string, attacker: string): { ok: boolean; why?: string };
export function colorOf(def: CardDef): string | undefined;

/**
 * House rules hook. The content layer installs a damage filter here; unset, the engine
 * behaves exactly as it always did. This is the one thing that cannot be corrected after
 * the reducer returns, because by then the creature is already dead.
 */
export const HOUSE: {
  creatureDamage: ((state: GameState, target: string, amount: number, source: string | null) => number) | null;
  targets:
    | ((state: GameState, side: Side, cls: string) => { iids: string[]; players: Side[] } | null)
    | null;
};
