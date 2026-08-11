/**
 * The tuning bridge.
 *
 * There is a companion page — `tutorial-tuner.html` — that shows this game twice side by
 * side, once at a landscape phone's size and once at a desktop's, and lets the tutorial's
 * panel, its example card and its wording be pushed around with handles and sliders until
 * they look right. This file is the game's half of that: it is inert unless the page was
 * opened with `?tune=1`, and when it is on it does three things and nothing else.
 *
 *  - It accepts an override object over `postMessage` and hands it to the coach, which lays
 *    itself out from it instead of from the stylesheet.
 *  - It accepts a step number, so the tuner can walk the lesson without playing it.
 *  - It reports back, on every step, what the lesson is showing and where everything landed.
 *
 * Deliberately *not* behind the test-hook flag. The test hooks are compiled out of the
 * shipped file because they open the game's state to anything on the page; this opens
 * nothing — it is a stylesheet the tutorial will read if the URL asks for it, and the
 * tuner page is only useful to somebody who already has the file. Being in the shipped
 * build is the point: what you tune is the real thing, not a mock of it.
 */

export interface PanelTune {
  /** Which corner, overriding the measured placement. */
  place?: string;
  /** Nudges from that corner, in px. */
  dx?: number;
  dy?: number;
  /** Panel width in px. */
  w?: number;
  /** Text scale, 1 = the stylesheet's size. */
  scale?: number;
}

export interface SpotTune {
  /** Centre, as a percentage of the viewport. */
  x?: number;
  y?: number;
  /** Width in px for the single card; scale for the six-card row. */
  w?: number;
  scale?: number;
}

export interface Tune {
  /** Per chapter, because that is the unit the panel is placed by. */
  panel?: Record<string, PanelTune>;
  /** The single card held up by the 一張牌 chapter. */
  card?: SpotTune;
  /** The six-card row. */
  gallery?: SpotTune;
  /** Per step, by key: what it says. */
  text?: Record<string, { title?: string; body?: string; task?: string }>;
  /** Extra top inset, for previewing a notch that this browser does not have. */
  inset?: number;
}

/**
 * Is this frame being tuned, and as which machine?
 *
 * Two ways in, because the tuning page has to work when it is a single file sitting in a
 * downloads folder. The query string is the obvious one; `window.name` is the one that
 * survives `srcdoc`, where the frame has no URL of its own to put a query on — and a single
 * self-contained page is the only arrangement that cannot be broken by the game file being
 * somewhere else, or downloaded twice and renamed by the browser.
 */
export function tuneFlag(): 'touch' | '1' | null {
  if (typeof window === 'undefined') return null;
  const q = /(?:^|[?&])tune=(1|touch)(?:&|$)/.exec(location.search)?.[1];
  if (q === 'touch' || q === '1') return q;
  if (window.name === 'abai-tune-touch') return 'touch';
  if (window.name === 'abai-tune-1') return '1';
  return null;
}

export const tuning = (() => {
  const on = tuneFlag() !== null;
  let value: Tune = {};
  const subs = new Set<() => void>();
  const emit = () => { for (const f of subs) f(); };
  return {
    get on() { return on; },
    get value() { return value; },
    set(v: Tune) { value = v ?? {}; emit(); },
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
  };
})();

/** What the tuner asked the lesson to jump to, if anything. */
export const tuneJump = (() => {
  let want: number | null = null;
  const subs = new Set<(n: number) => void>();
  return {
    ask(n: number) { want = n; for (const f of subs) f(n); },
    get pending() { return want; },
    subscribe(f: (n: number) => void) { subs.add(f); return () => { subs.delete(f); }; },
  };
})();

/** Tell the tuner what is on screen. */
export function report(payload: Record<string, unknown>) {
  if (!tuning.on || typeof window === 'undefined' || window.parent === window) return;
  try { window.parent.postMessage({ source: 'abai-tune', ...payload }, '*'); } catch { /* ignore */ }
}

if (tuning.on && typeof window !== 'undefined') {
  window.addEventListener('message', (e: MessageEvent) => {
    const d: any = e.data;
    if (!d || d.target !== 'abai-tune') return;
    if (d.kind === 'set') tuning.set(d.tune ?? {});
    if (d.kind === 'go' && typeof d.at === 'number') tuneJump.ask(d.at);
  });
  // The frame is ready for instructions.
  window.addEventListener('load', () => report({ kind: 'ready' }));
}
