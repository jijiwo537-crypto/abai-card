/**
 * What kind of machine is this, and how much room is there.
 *
 * The whole phone layout hangs off this file, and it exists to make one promise keepable:
 * the desktop build must not change at all. So nothing here is a width breakpoint. Width
 * breakpoints are what broke the app on a phone in the first place — a phone held sideways
 * is *wide*, so every `max-width` rule written for "small screen" either misses it entirely
 * or, worse, fires on a narrow desktop window and moves furniture the user never asked to
 * have moved.
 *
 * Instead three flags are written onto `<html>` as data attributes, and every new rule in
 * the stylesheet is scoped under one of them:
 *
 *   data-touch     the primary input is a finger. Governs affordances — tap targets, the
 *                  tap-to-read preview, no hover states, no long-press magnifier.
 *   data-compact   a finger *and* not much height. Governs layout — this is the flag that
 *                  reflows a screen, and it is the one a desktop can never acquire, because
 *                  a desktop's pointer is fine however small the window gets.
 *   data-portrait  a touch device being held upright, which for a landscape card game is a
 *                  state to be corrected rather than laid out for.
 *
 * A desktop browser matches `pointer: fine`, so it gets none of them, and a stylesheet rule
 * that begins `html[data-compact]` is unreachable there no matter how the window is sized.
 * That is the guarantee, and it is structural rather than a matter of care.
 */

import { useEffect, useState } from 'react';
import { tuneFlag } from './tuner';

/**
 * Below this many CSS pixels of height, a landscape phone needs a different layout rather
 * than a smaller version of the same one. An iPhone 16 Pro Max is 440 tall on its side and
 * the biggest iPhone ever sold is 440; an iPad in landscape is 768 and wants the desktop
 * layout with bigger targets, which is exactly what `data-touch` alone gives it.
 */
const COMPACT_H = 560;

export interface Device {
  /** The primary input is a finger. */
  touch: boolean;
  /** A finger, and a viewport too short for the desktop layout. */
  compact: boolean;
  /** A touch device held upright. */
  portrait: boolean;
}

const coarse = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

/** The primary input is a finger. */
export const isTouch = () => coarse();

/**
 * How many device pixels a drawing buffer may cover.
 *
 * This is a memory budget wearing a resolution's clothes. There are two full-screen WebGL
 * canvases — the board and the shared card layer — and each one costs colour plus depth,
 * multiplied again by the MSAA sample count. Raising the ratio to a flat 3 to sharpen the
 * phone took the pair from about 69 MB on the smallest iPhone to 155, and on a 16 Pro Max
 * from 116 MB to 260. iOS Safari's per-tab GPU allowance is well under that, and when it is
 * passed WebKit does not throw — it simply stops backing part of the surface, which is seen
 * as a slab of the screen going black.
 *
 * So the ratio is derived from the budget rather than declared: pick the largest oversample
 * whose buffer fits. A 667x375 phone still gets the full 3x, because at that size 3x is only
 * 2.25 megapixels; a 956x440 one settles around 2.5x, which is where it should have been.
 */
const PIXEL_BUDGET = 2_600_000;

export function maxPixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  const dpr = window.devicePixelRatio || 1;
  // A desktop keeps exactly the cap it has always had.
  if (!coarse()) return Math.min(dpr, 2);
  const area = Math.max(1, window.innerWidth * window.innerHeight);
  return Math.max(1, Math.min(dpr, 3, Math.sqrt(PIXEL_BUDGET / area)));
}

/**
 * Whether to ask for multisampling.
 *
 * MSAA multiplies the drawing buffer by the sample count, and once the buffer is already
 * being drawn at two or more device pixels per CSS pixel it is paying four times the memory
 * for an edge that supersampling has largely resolved anyway. On a phone that trade is the
 * difference between fitting in the budget and not. A desktop is untouched — it keeps
 * multisampling at every ratio, exactly as before.
 */
export function wantsAntialias(): boolean {
  if (!coarse()) return true;
  /*
   * Never on a phone. The board is drawn at nearly full device resolution and then passed
   * through FXAA, which buys the same smooth edges for one extra pass and one ordinary
   * render target instead of quadrupling the drawing buffer. See the FXAA block in
   * BattleCanvas — the two decisions are the same decision.
   */
  return false;
}

export function readDevice(): Device {
  if (typeof window === 'undefined') return { touch: false, compact: false, portrait: false };
  /*
   * The tuning page previews the phone layout inside a desktop browser, where the pointer is
   * a mouse however small the frame is — which is the whole point of gating on pointer type
   * and is exactly what makes the preview show the wrong layout. `?tune=touch` says "treat
   * this frame as a finger": it is the one place a claim about the input device is allowed to
   * come from the URL rather than from the browser, and it only exists inside the tuner.
   */
  const forced = tuneFlag() === 'touch';
  const touch = forced || coarse();
  const h = window.innerHeight;
  const w = window.innerWidth;
  return {
    touch,
    compact: touch && h <= COMPACT_H,
    portrait: touch && h > w,
  };
}

const same = (a: Device, b: Device) =>
  a.touch === b.touch && a.compact === b.compact && a.portrait === b.portrait;

/** Mirror the flags onto `<html>` so the stylesheet can scope every new rule under them. */
function publish(d: Device) {
  const el = document.documentElement;
  const set = (k: string, on: boolean) => {
    if (on) el.setAttribute(k, '1');
    else el.removeAttribute(k);
  };
  set('data-touch', d.touch);
  set('data-compact', d.compact);
  set('data-portrait', d.portrait);
}

/**
 * Install the flags and keep them current.
 *
 * `resize` covers rotation on iOS — `orientationchange` fires *before* the new dimensions
 * are readable there, so measuring in it gives the old size — but both are listened to and
 * the state is compared rather than assumed, so a duplicate event costs nothing.
 */
export function installDevice(): void {
  if (typeof window === 'undefined') return;
  let last = readDevice();
  publish(last);
  const sync = () => {
    const next = readDevice();
    if (same(next, last)) return;
    last = next;
    publish(next);
    window.dispatchEvent(new CustomEvent('ad:device'));
  };
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', () => setTimeout(sync, 60));
  // Safari can change the reported pointer type when a Magic Keyboard is attached.
  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(pointer: coarse)');
    mq.addEventListener?.('change', sync);
  }
}

/** The current device flags, re-rendering the caller when they change. */
export function useDevice(): Device {
  const [d, setD] = useState<Device>(readDevice);
  useEffect(() => {
    const sync = () => setD((prev) => {
      const next = readDevice();
      return same(prev, next) ? prev : next;
    });
    sync();
    window.addEventListener('ad:device', sync);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('ad:device', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);
  return d;
}
