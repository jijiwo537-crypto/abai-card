/**
 * Cards, drawn properly, anywhere on the page.
 *
 * On the battlefield a card is a 3D object: a lit outline and a border effect that says
 * what type it is before you have read a word, and a hologram turning in front of the
 * illustration. Everywhere else — the deck list, the builder, the pack, the hover preview
 * — a card was a flat PNG, so the two most recognisable things about it were exactly the
 * two things that never appeared outside the match.
 *
 * This draws the real thing in those places too. One WebGL canvas is stretched over the
 * viewport and every registered slot is rendered into it: the face on a plane, the border
 * effect around it, the hologram in front. One canvas, not one per card — a browser hands
 * out a limited number of WebGL contexts and starts dropping the oldest when you pass it,
 * and the oldest would be the board's.
 *
 * Usage is two lines at the call site:
 *
 *     const fx = useCardFx();
 *     ...
 *     <span className="slot" ref={fx.slot(card.id, card)} />
 *     <fx.Layer clip={scrollBoxRef} />
 *
 * The slot element supplies the rectangle and nothing else — it can be empty, or it can
 * hold the flat `<img>` as a fallback for machines with no WebGL, which is what the
 * callers here do.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { FaceCard } from './cardFace';
import { cardTheme, holoTypeOf, borderTypeOf, renderCardCanvas } from './cardFace';
import { BorderFactory, createHologramGroup } from './cardVisuals';
import { maxPixelRatio, wantsAntialias, isTouch } from '../ui/device';

/** The card's own footprint, the space every border effect is authored in. */
const CARD_W = 2.4;
const CARD_H = 3.6;

/*
 * Where the hologram floats.
 *
 * These used to be the board's numbers copied across to the digit — 0.4, 0.5, 0.23 — on the
 * reasoning that the same card must wear the emblem the same way in both places. The
 * numbers were right and the reasoning was wrong: they are *board* numbers, and the board's
 * card is 1.8 x 2.7 while a card here is 2.4 x 3.6, because that is the footprint every
 * border effect is authored in. Same shape, four-thirds the size.
 *
 * So the raw values put the emblem at 0.4/3.6 = 11% of the way up a card instead of the
 * board's 0.4/2.7 = 15%, and drew it three quarters as large. It sat low and small, down in
 * the illustration instead of riding above it. Converting by 4/3 puts it where the board
 * puts it, which is the only thing that was ever meant.
 */
const BOARD_TO_LAYER = CARD_H / 2.7;   // the board's card is 1.8 x 2.7
const HOLO_Y = 0.4 * BOARD_TO_LAYER;
const HOLO_Z = (0.06 / 2 + 0.2) * BOARD_TO_LAYER;
const HOLO_SCALE = 0.5 * BOARD_TO_LAYER;

/*
 * How finely a face is drawn for the layer. The board draws its own at 0.5 — half of
 * 2048x3072 — and that is comfortably above what any slot here shows, the largest being the
 * hover preview at about 300 CSS pixels. Going through a data URL instead, as this used to,
 * meant encoding a PNG and then decoding it again on the frame the pointer moved onto a new
 * card: a hitch you could feel every time. A canvas goes straight to the GPU.
 */
const FACE_SCALE = 0.5;

interface Slot {
  el: HTMLElement | null;
  card: FaceCard;
  /** Full-resolution face, for slots big enough that a thumbnail would go soft. */
  hi: boolean;
  /** Rebuilt when this changes, so a slot can be reused for a different card. */
  sig: string;
}

interface Built {
  group: THREE.Group;
  border: THREE.Group;
  /** Lives in the overlay scene, so it is always drawn after — and over — its own card. */
  holo: THREE.Group;
  /** Its own accumulating spin, kept apart from the tilt the slot imposes. */
  holoSpin: THREE.Euler;
  texture: THREE.Texture | null;
  sig: string;
}

/*
 * Live power, toughness and keywords are in the signature because they are printed on the
 * face: a creature wearing an aura really is a 守軍 and the texture has to be redrawn to
 * say so.
 */
const sigOf = (card: FaceCard, hi: boolean) =>
  `${card.id}|${hi ? 'hi' : 'lo'}|${holoTypeOf(card)}|${borderTypeOf(card)}` +
  `|${cardTheme(card).join(',')}|${card.livePow ?? ''}/${card.liveTou ?? ''}|${(card.liveKw ?? []).join(',')}`;

/**
 * The rotation and uniform scale an element's own transform applies, walking up through
 * transformed ancestors so a tilted card inside a scaled panel still lands square on
 * itself. Identity when nothing on the chain is transformed, which is the common case.
 *
 * `mirrored` is the important one. A card that has been flipped face-down carries a
 * `rotateY(180deg)`, which flattens to a horizontal mirror — and a mirror read as a
 * rotation is a rotation of 180 degrees, which is how the pack came to deal five cards
 * that were the right cards printed upside down. A mirrored slot is showing its back, so
 * the layer draws nothing there and lets the DOM card back show through.
 */
function tf(el: HTMLElement): { angle: number; scale: number; mirrored: boolean } {
  let angle = 0;
  let scale = 1;
  let det = 1;
  let node: HTMLElement | null = el;
  for (let depth = 0; node && depth < 6; depth++, node = node.parentElement) {
    const t = getComputedStyle(node).transform;
    if (!t || t === 'none') continue;
    const m = new DOMMatrixReadOnly(t);
    const d = m.a * m.d - m.b * m.c;
    det *= d;
    if (d < 0) continue;   // a mirror has no meaningful in-plane angle
    angle += Math.atan2(m.b, m.a);
    scale *= Math.hypot(m.a, m.b) || 1;
  }
  return { angle, scale, mirrored: det < 0 };
}

export interface CardFxHandle {
  /** Ref callback for a slot element. Pass a stable key and the card it shows. */
  slot: (key: string, card: FaceCard, hi?: boolean) => (el: HTMLElement | null) => void;
  /** The canvas. `clip` scissors it to a scroll box; `z` sets the stacking order. */
  Layer: React.FC<{ clip?: React.RefObject<HTMLElement | null>; z?: number }>;
}

/*
 * How many built cards are kept alive after their slot has let go of them. Sweeping the
 * pointer along the hand asks for a different card every few frames and then asks for the
 * previous one again on the way back; without a pool each of those is a fresh face render,
 * a fresh border and a fresh emblem. Eight covers a hand and costs a few megabytes.
 */
const POOL_MAX = 8;

export function useCardFx(): CardFxHandle {
  const slots = useRef(new Map<string, Slot>());
  const built = useRef(new Map<string, Built>());
  /** Built cards no slot is using, keyed by signature and ready to be picked up again. */
  const pool = useRef(new Map<string, Built>());
  /** Whether the canvas currently holds ink, so it is wiped exactly once when it empties. */
  const dirty = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const clipRef = useRef<React.RefObject<HTMLElement | null> | undefined>(undefined);

  const slot = useCallback(
    (key: string, card: FaceCard, hi = false) => (el: HTMLElement | null) => {
      if (!el) { slots.current.delete(key); return; }
      slots.current.set(key, { el, card, hi, sig: sigOf(card, hi) });
    },
    [],
  );

  const Layer = useMemo<CardFxHandle['Layer']>(
    () => ({ clip, z = 3 }) => {
      clipRef.current = clip;
      /*
       * The geometry is inline rather than in a stylesheet. The canvas measures itself to
       * decide where every card goes, so a missing rule does not degrade it — it collapses
       * it to the 300x150 a canvas defaults to, and every card lands somewhere absurd.
       * That is not a thing to leave depending on a class name.
       */
      return (
        <canvas
          className="cardfx-layer"
          ref={(el) => { canvasRef.current = el; }}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: z,
          }}
          aria-hidden="true"
        />
      );
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: wantsAntialias() });
    } catch {
      return;   // no context to be had; the flat fallbacks inside the slots stand alone
    }
    renderer.setClearAlpha(0);
    renderer.setScissorTest(true);
    // The clear and the draw want different scissors, so the render must not do its own.
    renderer.autoClear = false;

    /*
     * Two scenes and two passes. The hologram has to be the topmost thing on its card —
     * several border effects are wide, bright and sit in front of the face, and any of them
     * can bury the emblem. Turning depth testing off inside the emblem would fix that and
     * break the emblem, whose own solid core is what hides the far half of its wireframe.
     * So the card is drawn, the depth buffer is cleared, and the emblems are drawn on top
     * with their own depth intact.
     */
    const scene = new THREE.Scene();
    const holoScene = new THREE.Scene();
    // The board's own key and fill, so a toon-shaded emblem lands in the same band of its
    // ramp here as it does on the table.
    holoScene.add(new THREE.AmbientLight(0xe8ecf4, 1.5));
    const holoKey = new THREE.DirectionalLight(0xffffff, 2.2);
    holoKey.position.set(6, -8, 16);
    holoScene.add(holoKey);
    // The board's other two, so the emblem lands in the same band of its toon ramp here as
    // it does on the table. With only a key it read as a flat lump instead of a lit cage.
    const holoRim = new THREE.DirectionalLight(0xc8d2e4, 1.25);
    holoRim.position.set(-8, 12, 6);
    holoScene.add(holoRim);
    const holoBounce = new THREE.PointLight(0xdfe6f2, 1.3, 26);
    holoBounce.position.set(0, -2, 6);
    holoScene.add(holoBounce);
    const camera = new THREE.OrthographicCamera(0, 1, 0, -1, 0.1, 100);
    camera.position.z = 10;

    let raf = 0;
    let w = 0;
    let h = 0;

    /** Frees a built card's GPU resources for good. */
    const destroy = (b: Built) => {
      scene.remove(b.group);
      holoScene.remove(b.holo);
      b.holo.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
      b.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
      b.texture?.dispose();
    };

    /**
     * A slot has let go of this card. It is parked rather than thrown away, so coming back
     * to it — which is what sweeping along a row of cards does constantly — is free.
     */
    const release = (key: string) => {
      const b = built.current.get(key);
      if (!b) return;
      built.current.delete(key);
      b.group.visible = false;
      b.holo.visible = false;
      const already = pool.current.get(b.sig);
      if (already && already !== b) { destroy(b); return; }
      pool.current.set(b.sig, b);
      while (pool.current.size > POOL_MAX) {
        const oldest = pool.current.keys().next().value as string;
        const victim = pool.current.get(oldest)!;
        pool.current.delete(oldest);
        destroy(victim);
      }
    };

    const build = (key: string, s: Slot): Built => {
      // Already built and parked: pick it straight back up.
      const parked = pool.current.get(s.sig);
      if (parked) {
        pool.current.delete(s.sig);
        built.current.set(key, parked);
        return parked;
      }
      const [c1, c2] = cardTheme(s.card);
      const group = new THREE.Group();

      // The face, so the border's outline is occluded by the card exactly as on the board.
      const tex = new THREE.CanvasTexture(renderCardCanvas(s.card, s.hi ? FACE_SCALE : 0.25));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W, CARD_H),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
      );
      /*
       * The paper goes behind the frame, not through the middle of it.
       *
       * A border effect is a box 0.08 deep authored around the card, so it spans z from
       * -0.04 to +0.04. Leaving the face at z = 0 ran the paper straight through that box:
       * the back half of every border was buried, and because both the face and the border
       * shaders are transparent — same pass, sorted back to front, centres tied at zero —
       * which half won was down to render order rather than depth. That is what read as the
       * frame being *behind* the card.
       *
       * On the board this never came up: there the card is a solid box with real thickness,
       * so the border sits around it and the depth buffer settles it honestly. Here the card
       * is one flat plane, so it is put behind the border's whole span and told to draw
       * first. Now the frame always sits on the card, which is what a frame does.
       */
      face.position.z = -0.05;
      face.renderOrder = 0;
      group.add(face);

      const border = BorderFactory.create(borderTypeOf(s.card), c1, c2);
      border.renderOrder = 1;
      border.traverse((o) => { o.renderOrder = 1; });
      group.add(border);

      /*
       * The emblem lives in its own scene; its placement is applied per frame from the
       * card's, so the two stay locked together without being in the same depth pass.
       *
       * Two things have to be undone first, both consequences of drawing it through an
       * orthographic camera when it was authored for the board's perspective one.
       *
       * The emblem is built as three shells: a near-black solid, a wireframe, and a
       * back-face outline pushed out along its normals. The solid is the occluder — it is
       * what hides the far half of the wireframe and keeps the outline to a rim. It carries
       * a polygon offset of one unit, which under the board's perspective depth is a hair
       * and under a flat orthographic depth range is enough to shove it *behind* the
       * outline shell. The result was a filled orange lump with a patch of wireframe on one
       * side instead of an open golden cage. Off it goes.
       *
       * And the solid is a toon material, so with no light on it at all it renders dead
       * black rather than the shaded dark the board gives it — hence the lights below.
       */
      const holo = createHologramGroup(holoTypeOf(s.card), c1, c2);
      holoScene.add(holo);

      scene.add(group);
      const b: Built = { group, border, holo, holoSpin: new THREE.Euler(), texture: tex, sig: s.sig };
      built.current.set(key, b);
      return b;
    };

    /*
     * Half rate on a phone.
     *
     * All this layer ever animates is a slowly turning emblem and a border shimmer; at 30fps
     * neither is distinguishable from 60, and the saving lands exactly where it is felt —
     * while a card is being dragged, when the reader is open and the board is already asking
     * for everything the GPU has. The spin steps twice as far per frame, so the emblem turns
     * at the same speed it always did.
     */
    const halfRate = isTouch();
    const spinStep = halfRate ? 2 : 1;
    let tick = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (halfRate && (tick++ & 1)) return;
      /*
       * The canvas's own rectangle, not the window's. A `position: fixed` element inside a
       * transformed ancestor is laid out against that ancestor rather than the viewport, so
       * assuming the canvas covers the screen put every card in the wrong place at the
       * wrong size the moment a caller centred its container with a translate.
       */
      const box = canvas.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) return;
      if (box.width !== w || box.height !== h) {
        w = box.width; h = box.height;
        renderer.setPixelRatio(maxPixelRatio());
        renderer.setSize(w, h, false);
        camera.right = w;
        camera.bottom = -h;
        camera.updateProjectionMatrix();
      }

      const t = performance.now() / 1000;
      const clipEl = clipRef.current?.current;
      const cr = clipEl ? clipEl.getBoundingClientRect() : null;

      // Slots that vanished take their meshes with them.
      for (const key of [...built.current.keys()]) {
        if (!slots.current.has(key)) release(key);
      }

      /*
       * Nothing is cleared or drawn until it is known that there is something to draw, and
       * then only over the piece of the canvas the cards actually occupy.
       *
       * This loop used to clear the whole buffer at the top of every frame and then render
       * full-screen. On a desktop that is invisible; on a phone the canvas is 2001x1125 and
       * the loop runs at 60fps whether or not a single card is registered — so the battle
       * screen, which shows a card only while a finger is held on one, was paying a
       * full-screen clear sixty times a second for an empty layer. That is pure heat. Now an
       * idle layer costs nothing at all, and a layer showing one card pays for one card.
       */
      let drew = false;
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;

      for (const [key, s] of slots.current) {
        const el = s.el;
        if (!el || !el.isConnected) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        // Off the canvas, or scrolled out of its own box: nothing to draw, nothing to build.
        if (r.bottom < box.top || r.top > box.bottom || r.right < box.left || r.left > box.right) continue;
        if (cr && (r.bottom < cr.top || r.top > cr.bottom)) continue;

        let b = built.current.get(key);
        if (!b || b.sig !== s.sig) { if (b) release(key); b = build(key, s); }

        /*
         * A slot may be rotated — the pack fans its five cards on an arc. A rotated
         * element's bounding rectangle is bigger than the element, so taking the width
         * from the rectangle would draw the card too large and square-on inside its own
         * tilted frame. The card's real size comes from its layout box and its angle from
         * the computed transform; the rectangle is used only for the centre, which a
         * rotation about the centre leaves alone.
         */
        const m = tf(el);
        // Face-down: the DOM is showing this slot's back, and so should the layer.
        if (m.mirrored) continue;
        const scale = ((el as HTMLElement).offsetWidth || r.width) * m.scale / CARD_W;
        b.group.rotation.z = -m.angle;
        b.group.position.set(
          r.left - box.left + r.width / 2,
          -(r.top - box.top + r.height / 2),
          0,
        );
        b.group.scale.setScalar(scale);
        BorderFactory.update(b.border, t);
        // The emblem rides the card: same centre, same tilt, offset to the art window.
        b.holo.position.set(
          b.group.position.x - Math.sin(-m.angle) * HOLO_Y * scale,
          b.group.position.y + Math.cos(-m.angle) * HOLO_Y * scale,
          HOLO_Z,
        );
        b.holo.scale.setScalar(scale * HOLO_SCALE);
        b.holoSpin.y += 0.02 * spinStep;
        b.holoSpin.z += 0.008 * spinStep;
        b.holo.rotation.set(b.holoSpin.x, b.holoSpin.y, b.holoSpin.z + -m.angle);
        b.group.visible = true;
        b.holo.visible = true;
        drew = true;
        /*
         * The dirty box, with room for the effects. A border effect is drawn well outside
         * the card it frames — the crackle reaches roughly half a card past the edge — so
         * the region has to be grown or the frame would be sliced off at the card's own
         * rectangle.
         */
        const mx = r.width * 0.6, my = r.height * 0.6;
        bx0 = Math.min(bx0, r.left - box.left - mx);
        by0 = Math.min(by0, r.top - box.top - my);
        bx1 = Math.max(bx1, r.right - box.left + mx);
        by1 = Math.max(by1, r.bottom - box.top + my);
      }

      if (!drew) {
        // One last wipe when the final card goes away, then the layer sleeps.
        if (dirty.current) {
          renderer.setScissor(0, 0, w, h);
          renderer.clear();
          dirty.current = false;
        }
        return;
      }
      dirty.current = true;

      // One pass, scissored to the scroll box when there is one, so a card that has been
      // scrolled half out of a list is cut off at the list's edge rather than floating
      // over whatever is beside it.
      // The drawn region, narrowed further by the scroll box when there is one, so a card
      // scrolled half out of a list is still cut off at the list's edge.
      let x0 = bx0, y0 = by0, x1 = bx1, y1 = by1;
      if (cr) {
        x0 = Math.max(x0, cr.left - box.left);
        x1 = Math.min(x1, cr.right - box.left);
        y0 = Math.max(y0, cr.top - box.top);
        y1 = Math.min(y1, cr.bottom - box.top);
      }
      x0 = Math.max(0, Math.floor(x0));
      y0 = Math.max(0, Math.floor(y0));
      x1 = Math.min(w, Math.ceil(x1));
      y1 = Math.min(h, Math.ceil(y1));
      if (x1 <= x0 || y1 <= y0) return;
      // Scissor is in canvas pixels measured from the bottom-left, so the box is flipped.
      renderer.setScissor(x0, h - y1, x1 - x0, y1 - y0);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.clearDepth();
      renderer.render(holoScene, camera);

      for (const b of built.current.values()) { b.group.visible = false; b.holo.visible = false; }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      for (const b of built.current.values()) destroy(b);
      for (const b of pool.current.values()) destroy(b);
      built.current.clear();
      pool.current.clear();
      renderer.dispose();
    };
  }, []);

  return { slot, Layer };
}
