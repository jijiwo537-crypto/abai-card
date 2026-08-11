/**
 * The deluxe border effects, for the card designer.
 *
 * Fifty were built and two were kept — 13 and 19 of the elements family. They hold the
 * numbers they were reviewed under rather than being renumbered to 1 and 2, so those
 * names still mean the same thing, and any `art.border` already written against them
 * stays valid.
 *
 * They are opt-in only. A card with no `art.border` gets its border from
 * `seedOf(id) % 17`, which can never reach this range, so nothing in the card pool picks
 * one of these up by accident.
 *
 * Everything is authored in the border's own 2.4 x 3.6 space — the card's own footprint,
 * which the board then scales to whatever size it is drawing — so an effect's edge sits
 * exactly on the card's edge. Each definition returns its group and an update function,
 * and `BorderFactory` drives that function every frame.
 */

import * as THREE from 'three';

export const CARD_W = 2.4;
export const CARD_H = 3.6;

const HW = CARD_W / 2;
const HH = CARD_H / 2;
const TAU = Math.PI * 2;

/** The first id of the deluxe range. Below this are the original built-in borders. */
export const DELUXE_BASE = 100;

/** No border effect at all, not even the lit outline the others are built on. */
export const NO_BORDER = -1;

/** 雷霆囚籠 — the elements effect that survived the cull, as a whole border id. */
export const THUNDER_CAGE = DELUXE_BASE + 13;

export interface Fx {
  group: THREE.Group;
  update: (t: number) => void;
}

export interface FxDef {
  id: number;
  /** The number this effect is listed under in the designer. */
  n: number;
  label: string;
  family: string;
  build: (c1: THREE.Color, c2: THREE.Color) => Fx;
}

// ---------------------------------------------------------------- materials ----

const glow = (c: THREE.Color, opacity = 0.85) =>
  new THREE.MeshBasicMaterial({
    color: c, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });

const wire = (c: THREE.Color, opacity = 0.6) =>
  new THREE.MeshBasicMaterial({
    color: c, transparent: true, opacity, wireframe: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });

const stroke = (c: THREE.Color, opacity = 0.8) =>
  new THREE.LineBasicMaterial({
    color: c, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });

const dust = (c: THREE.Color, size: number, opacity = 0.9) =>
  new THREE.PointsMaterial({
    color: c, size, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });

// ---------------------------------------------------------------- geometry ----

/** A point on the card's rim at normalised parameter `u`, pushed out by `pad`. */
function onRim(u: number, pad = 0): THREE.Vector3 {
  const w = (HW + pad) * 2;
  const h = (HH + pad) * 2;
  const per = 2 * (w + h);
  let d = (((u % 1) + 1) % 1) * per;
  if (d < w) return new THREE.Vector3(-w / 2 + d, h / 2, 0);
  d -= w;
  if (d < h) return new THREE.Vector3(w / 2, h / 2 - d, 0);
  d -= h;
  if (d < w) return new THREE.Vector3(w / 2 - d, -h / 2, 0);
  d -= w;
  return new THREE.Vector3(-w / 2, -h / 2 + d, 0);
}

/** Outward normal at the same parameter, for things that should face away from the card. */
function rimNormal(u: number): THREE.Vector3 {
  const w = HW * 2;
  const h = HH * 2;
  const per = 2 * (w + h);
  let d = (((u % 1) + 1) % 1) * per;
  if (d < w) return new THREE.Vector3(0, 1, 0);
  d -= w;
  if (d < h) return new THREE.Vector3(1, 0, 0);
  d -= h;
  if (d < w) return new THREE.Vector3(0, -1, 0);
  return new THREE.Vector3(-1, 0, 0);
}

/** Closed outline of the card, as a line loop. */
function rimLoop(pad = 0, samples = 160) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i++) pts.push(onRim(i / samples, pad));
  return new THREE.BufferGeometry().setFromPoints(pts);
}

/** An n-pointed star as a fillable shape. */
function starShape(points: number, outer: number, inner: number) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * TAU - Math.PI / 2;
    const r = i % 2 ? inner : outer;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  return s;
}

/** A cog with square-ish teeth. */
function gearShape(teeth: number, root: number, tip: number) {
  const s = new THREE.Shape();
  const steps = teeth * 4;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    const phase = i % 4;
    const r = phase === 1 || phase === 2 ? tip : root;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  return s;
}

/** Deterministic pseudo-random, so an effect looks the same every time it is built. */
function rng(seed: number) {
  let s = (seed * 1664525 + 1013904223) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// ---------------------------------------------------------------- composers ----

/** One maker, mirrored into all four corners. */
function corners(make: (sx: number, sy: number) => THREE.Object3D, inset = 0.06) {
  const g = new THREE.Group();
  for (const [sx, sy] of [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const) {
    const o = make(sx, sy);
    o.position.set(sx * (HW - inset), sy * (HH - inset), o.position.z);
    g.add(o);
  }
  return g;
}

/** `n` objects spaced evenly around the rim; the returned group can be marched along it. */
function around(n: number, pad: number, make: (i: number) => THREE.Object3D) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const o = make(i);
    o.userData.u = i / n;
    const p = onRim(i / n, pad);
    o.position.set(p.x, p.y, o.position.z);
    g.add(o);
  }
  return g;
}

/** Marches every child of an `around()` group along the rim. */
function march(g: THREE.Group, offset: number, pad: number, face = false) {
  for (const o of g.children) {
    const u = (o.userData.u as number) + offset;
    const p = onRim(u, pad);
    o.position.x = p.x;
    o.position.y = p.y;
    if (face) {
      const n = rimNormal(u);
      o.rotation.z = Math.atan2(n.y, n.x);
    }
  }
}

/** A field of motes with per-mote state the update function can drive. */
function motes(n: number, seed: number, mat: THREE.PointsMaterial, spread: [number, number, number]) {
  const r = rng(seed);
  const pos = new Float32Array(n * 3);
  const seedArr = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (r() - 0.5) * spread[0];
    pos[i * 3 + 1] = (r() - 0.5) * spread[1];
    pos[i * 3 + 2] = (r() - 0.5) * spread[2];
    seedArr[i] = r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, mat);
  pts.userData.seeds = seedArr;
  pts.userData.home = pos.slice();
  return pts;
}

/** A ring of line segments radiating outward — the workhorse for haloes. */
function rays(n: number, r0: number, r1: number, mat: THREE.LineBasicMaterial, jitter = 0) {
  const pts: THREE.Vector3[] = [];
  const rnd = rng(n * 7 + 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const e = r1 + (jitter ? (rnd() - 0.5) * jitter : 0);
    pts.push(new THREE.Vector3(Math.cos(a) * r0, Math.sin(a) * r0, 0));
    pts.push(new THREE.Vector3(Math.cos(a) * e, Math.sin(a) * e, 0));
  }
  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat);
}

/** A flat ring, drawn as a filled annulus. */
const annulus = (ri: number, ro: number, mat: THREE.Material, seg = 64) =>
  new THREE.Mesh(new THREE.RingGeometry(ri, ro, seg), mat);

const disc = (r: number, mat: THREE.Material, seg = 48) =>
  new THREE.Mesh(new THREE.CircleGeometry(r, seg), mat);

const bar = (w: number, h: number, mat: THREE.Material) =>
  new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);

const loop = (pad: number, mat: THREE.LineBasicMaterial, samples = 160) =>
  new THREE.Line(rimLoop(pad, samples), mat);

// ================================================================ the set ====

export const DELUXE: FxDef[] = [];

/** `n` is the number the effect was reviewed under, and the number the designer shows. */
const def = (n: number, label: string, family: string, build: FxDef['build']) => {
  DELUXE.push({ id: DELUXE_BASE + n, n, label, family, build });
};

def(13, '雷霆囚籠', '元素', (c1, c2) => {
  const g = new THREE.Group();
  const arcs: THREE.Line[] = [];
  for (let k = 0; k < 3; k++) {
    const geo = rimLoop(0.06 + k * 0.04, 120);
    (geo.userData as any).orig = geo.attributes.position.clone();
    const l = new THREE.Line(geo, stroke(k ? c2 : c1, 0.9 - k * 0.25));
    arcs.push(l);
    g.add(l);
  }
  return { group: g, update: (t) => arcs.forEach((l, k) => {
    const p = l.geometry.attributes.position as THREE.BufferAttribute;
    const o = (l.geometry.userData as any).orig as THREE.BufferAttribute;
    const on = Math.floor(t * 12 + k) % 3 === 0;
    for (let i = 0; i < p.count; i++) {
      const j = on ? (Math.sin(i * 12.9898 + Math.floor(t * 12)) * 43758.5453 % 1) * 0.09 : 0;
      p.setX(i, o.getX(i) + j);
      p.setY(i, o.getY(i) + j * 0.6);
    }
    p.needsUpdate = true;
    (l.material as THREE.LineBasicMaterial).opacity = on ? 1 : 0.35;
  }) };
});

def(19, '氣泡上湧', '元素', (c1, c2) => {
  const g = new THREE.Group();
  const bubbles: THREE.Mesh[] = [];
  const r = rng(71);
  for (let i = 0; i < 22; i++) {
    const rad = 0.03 + r() * 0.07;
    const b = annulus(rad * 0.65, rad, glow(i % 3 ? c1 : c2, 0.8), 16);
    b.userData.x = -1.2 + r() * 2.4;
    b.userData.phase = r();
    b.userData.speed = 0.3 + r() * 0.4;
    bubbles.push(b);
    g.add(b);
  }
  g.add(loop(0.05, stroke(c2, 0.75)));
  return { group: g, update: (t) => bubbles.forEach((b) => {
    const k = ((t * b.userData.speed + b.userData.phase) % 1);
    b.position.set(b.userData.x + Math.sin(t * 2 + b.userData.phase * 9) * 0.07, -HH - 0.2 + k * (CARD_H + 0.5), 0);
  }) };
});
