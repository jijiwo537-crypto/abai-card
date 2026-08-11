/**
 * How long each blow occupies the stage.
 *
 * Combat is played one blow at a time: a swing starts, flies, lands, and only then does
 * the next one begin. These numbers are what "lands" and "finished" mean, and they are
 * shared rather than guessed at in two places — the 3D scene uses the flight times to size
 * its projectiles, and the effects layer uses the same ones to place the sound on the
 * frame the projectile arrives and to know when the stage is free again.
 */
export const FX_TIMING = {
  /** One creature swinging at another: a fast, flat arc that lands as a cross-slash. */
  duelFlight: 190,
  duelImpact: 150,
  /**
   * A blow that reaches a player: a high arc that detonates on the die.
   *
   * Four creatures getting through used to take the best part of four seconds to watch.
   * The saving comes out of the detonation, not the flight — the arc itself is unchanged,
   * so a projectile crosses the board at the speed it always did; it is the standing
   * around afterwards that is gone.
   */
  boltFlight: 400,
  boltImpact: 260,
  /** Breath between consecutive blows, and between one attacker's exchange and the next. */
  gap: 20,
  actGap: 180,
  /**
   * How much closer together blows to a player fall when more than one creature gets
   * through. Taken out of the wait, never out of the flight: the next orb leaves while the
   * last one is still breaking, so a volley reads as a volley.
   */
  volleyCut: 300,
  /**
   * The interval between one drawn card and the next.
   *
   * "Draw two cards" is two draws, not one draw of two: the second card leaves the library
   * after the first has arrived, so the eye can count them. The engine already stamps its draw
   * effects this far apart (`delay: 160 * n`, where the library is popped), which is what puts
   * the riffle on the soundtrack; this is the same number for the card that flies, so the sound
   * and the card stay together.
   */
  drawStep: 160,
} as const;

/** How long each impact keeps drawing, in seconds — the 3D bursts are sized to these. */
export const IMPACT_SECONDS = {
  duel: FX_TIMING.duelImpact / 1000,
  bolt: FX_TIMING.boltImpact / 1000,
} as const;

/** The same flight times in seconds, which is what three.js clocks in. */
export const FLIGHT_SECONDS = {
  duel: FX_TIMING.duelFlight / 1000,
  bolt: FX_TIMING.boltFlight / 1000,
} as const;
