/**
 * Data model of the s-version (ArcaneDuel) card game, transcribed from the original
 * bundle's card records. Field names are kept exactly as the original engine uses them,
 * so engine code and card data stay interchangeable.
 */

export type Color = 'W' | 'U' | 'B' | 'R' | 'G';
/** `L` is a land, `C` a colourless (artifact-aligned) card — neither has a colour identity. */
export type CardColor = Color | 'L' | 'C';
export type Rarity = 'C' | 'U' | 'R' | 'M';

export type CardType = 'land' | 'creature' | 'artifact' | 'enchantment' | 'instant' | 'sorcery';

export type Keyword =
  | 'flying'
  | 'reach'
  | 'vigilance'
  | 'haste'
  | 'trample'
  | 'lifelink'
  | 'deathtouch'
  | 'firststrike'
  | 'doublestrike'
  | 'menace'
  | 'defender'
  | 'hexproof'
  | 'indestructible'
  | 'unblockable'
  | 'flash'
  | 'regenerate';

/** Mana cost: `g` is generic, `c` maps a colour to how many pips of it are required. */
export interface ManaCost {
  g: number;
  c: Partial<Record<Color, number>>;
}

export type EffectKind =
  | 'damage'
  | 'draw'
  | 'gainLife'
  | 'loseLifeSelf'
  | 'pump'
  | 'addCounter'
  | 'createToken'
  | 'sacrifice'
  | 'scry'
  | 'fight'
  | 'mill'
  | 'destroy'
  | 'exile'
  | 'discardRandom'
  | 'reanimate'
  | 'ramp'
  | 'counter';

export type EffectTarget =
  | 'none'
  | 'any'
  | 'creature'
  | 'ownCreature'
  | 'oppCreature'
  | 'player'
  | 'combatCreature'
  | 'ownGyCreature';

export interface Effect {
  kind: EffectKind;
  target?: EffectTarget;
  amount?: number;
  /** power / toughness deltas for pump and counters */
  p?: number;
  t?: number;
  /** keywords granted by a pump effect for the turn */
  kw?: Keyword[];
  /** card id of the token minted by createToken */
  tokenId?: string;
}

/** Aura / equipment attachment. */
export interface Attach {
  host: EffectTarget;
  kind: 'aura' | 'equipment';
  p?: number;
  t?: number;
  kw?: Keyword[];
}

/** Static global buff while this permanent is on the battlefield. */
export interface Anthem {
  p?: number;
  t?: number;
  scope: 'own' | 'tribe';
  tribe?: string;
  excludeSelf?: boolean;
  /** keywords the anthem hands out for as long as it is on the battlefield */
  grantKw?: Keyword[];
}

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  color: CardColor;
  text: string;
  rarity: Rarity;
  flavor?: string;
  cost?: ManaCost;
  sub?: string[];
  pow?: number;
  tou?: number;
  kw?: Keyword[];
  /** Effect fired when an instant or sorcery resolves. */
  spell?: Effect;
  /** Effect fired when this permanent enters the battlefield. */
  etb?: Effect;
  attach?: Attach;
  anthem?: Anthem;
  /** Colours a land taps for; `C` is colourless mana, which only pays generic costs. */
  mana?: (Color | 'C')[];
  basic?: boolean;
  protFrom?: Color;
  token?: boolean;
  /**
   * Display-only colour identity. Present on multicolour cards so the frame can be
   * drawn as a gradient between them; the engine still uses the single `color` field.
   */
  colors?: Color[];
  /** An anthem whose effect lingers after this permanent leaves the battlefield. */
  anthemPersists?: boolean;
  /**
   * Art overrides. Left unset, a card's frame gradient comes from its colour and its two
   * 3D effects are picked deterministically from its id — so every card looks different
   * without anyone choosing. Set here, they are chosen: `c1`/`c2` are the frame gradient,
   * `border` the battlefield border effect and `holo` the floating emblem.
   */
  art?: { c1?: string; c2?: string; border?: number; holo?: number };
}

export interface DeckDef {
  id: string;
  name: string;
  colors: Color[];
  hero: string;
  heroName: string;
  strategy: string;
  blurb: string;
  /** [cardId, count] pairs totalling 60. */
  list: [string, number][];
}
