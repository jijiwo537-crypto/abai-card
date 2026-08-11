import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** The render layer the tutorial's second pass draws — see the spotlight in the loop. */
const SPOT_LAYER = 1;

/** Where the camera sits once the game is being played, and where it opens from. */
const CAM_TO = { x: 0, y: -11.5, z: 14.5 };
const LOOK_TO = { x: 0, y: 0.2, z: 0 };
/*
 * The establishing shot: well back and only moderately high, so the columns are seen
 * standing at their full height rather than from overhead. Straight down turns the arena
 * into a floor plan and the pillars into circles, which says nothing about the room.
 */
const CAM_FROM = { x: 0, y: -30, z: 17 };
const LOOK_FROM = { x: 0, y: 0, z: 4 };
/*
 * And before that, the crane shot: up above the ring, looking down its throat, so the first
 * thing seen is the mast heads standing around an arena you have not been shown yet. It is
 * the shot that says where you are; the descent that follows says what you are here to do.
 */
const CAM_HIGH = { x: 0, y: -9, z: 40 };
const LOOK_HIGH = { x: 0, y: 3, z: 5.5 };

/*
 * The opening, as one move through three framings.
 *
 * Two straight legs met at CAM_FROM in a 125-degree corner — the camera pulls back away
 * from the table on the way down from the crane and then comes forward again, so the middle
 * of the shot was a hard reversal no amount of speed-matching could hide. A Catmull-Rom
 * through the same three points turns that corner into an arc: measured at the joint the
 * direction now changes by 10 degrees rather than 125, and the path is C1, so there is no
 * cusp to see. Uniform parameterisation, not centripetal, because it passes exactly through
 * the middle framing at u = 0.5 — the shot at one second is the one it always was — and
 * with these three points it swings no wider than a hundredth of a unit past it.
 */
const CRANE_MS = 1000;
const DESCENT_MS = 1900;
const INTRO_MS = CRANE_MS + DESCENT_MS;
/** The longest the opening may take in real seconds, as a multiple of its own length. */
const INTRO_WALL_CAP = 2;


const v3 = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
const CAM_PATH = new THREE.CatmullRomCurve3(
  [v3(CAM_HIGH), v3(CAM_FROM), v3(CAM_TO)], false, 'catmullrom', 0.5,
);
const LOOK_PATH = new THREE.CatmullRomCurve3(
  [v3(LOOK_HIGH), v3(LOOK_FROM), v3(LOOK_TO)], false, 'catmullrom', 0.5,
);

/**
 * Where along that path the shot is, at a given fraction of its length.
 *
 * A cubic Hermite through three timing knots — rest, the middle framing at exactly half the
 * path, rest again — which makes the timing curve C1 for the same reason the path is, so
 * there is no speed jump to see either.
 *
 * The one number that matters is the slope at the middle. Rounding the corner was not
 * enough on its own: the camera was still going almost flat out through it, and turning
 * that fast around a bend that tight is a kink however smooth the maths. But a camera
 * reversing direction has to slow down — that is what the move looks like when a person
 * does it — so the slope there is set to the crane's own average pace. Measured over the
 * shot that takes the sharpest 30ms from 31 degrees of turn to 12, and the speed at the
 * middle sits just under the glide that follows it, so it reads as arriving rather than as
 * hesitating.
 */
const K_JOINT = CRANE_MS / INTRO_MS;
const JOINT_SLOPE = 0.5 / K_JOINT;
const hermite = (x: number, y0: number, y1: number, m0: number, m1: number, h: number) => {
  const t2 = x * x;
  const t3 = t2 * x;
  return (
    (2 * t3 - 3 * t2 + 1) * y0 +
    (t3 - 2 * t2 + x) * h * m0 +
    (-2 * t3 + 3 * t2) * y1 +
    (t3 - t2) * h * m1
  );
};
function introEase(k: number): number {
  if (k <= 0) return 0;
  if (k >= 1) return 1;
  return k < K_JOINT
    ? hermite(k / K_JOINT, 0, 0.5, 0, JOINT_SLOPE, K_JOINT)
    : hermite((k - K_JOINT) / (1 - K_JOINT), 0.5, 1, JOINT_SLOPE, 0, 1 - K_JOINT);
}

/** The idle drift. Small enough to read as the room breathing, not as a moving camera. */
const DRIFT_RATE = 0.42;
/** How long the drift takes to reach full size, from nothing, once the opening lands. */
const DRIFT_FADE = 2.5;
const DRIFT_X = 0.16;
const DRIFT_Z = 0.1;
/**
 * How much of the screen's height the largest card on the board ever covers. Measured, not
 * guessed: with the drawing buffer held to a fixed pixel budget, a hand card comes out at
 * very nearly the same fraction of it on every phone tested.
 */
const FACE_SHARE = 0.36;

/**
 * How large to rasterise a card face.
 *
 * A texture is sharpest when one texel lands on one pixel. Miss that upwards and the card is
 * drawn from a blend of two mip levels, one of which is half the resolution you needed — the
 * face was three times larger than the biggest card on screen, so every card was being drawn
 * partly from a quarter-size copy of itself, and the names went soft. Miss it downwards and
 * the face is stretched. So the face is sized from the drawing buffer: big enough for the
 * largest card the board ever shows, and no bigger, with the mip chain covering everything
 * smaller. The desktop, whose cards are read at rest and never had the problem, is untouched.
 */
function faceScale(renderer: THREE.WebGLRenderer | null | undefined): number {
  if (!isTouch()) return 0.5;
  if (!renderer) return 0.2;
  const dp = new THREE.Vector2();
  renderer.getDrawingBufferSize(dp);
  return Math.max(0.1, Math.min(0.34, (FACE_SHARE * dp.y) / 3072));
}

/**
 * How large to draw the action button's label, by the same rule as a card face: the cap is a
 * small disc, and a face far larger than it is drawn from a low mip and reads soft.
 */
function capTexSize(renderer: THREE.WebGLRenderer | null | undefined): number {
  if (!renderer) return 256;
  const dp = new THREE.Vector2();
  renderer.getDrawingBufferSize(dp);
  return Math.max(128, Math.min(512, Math.round((0.15 * dp.y) / 8) * 8));
}

/**
 * The deal does not wait for the descent to finish. Starting it a beat before the camera
 * settles overlaps the two just enough that the opening reads as one movement instead of
 * two, and the first card is already in the air by the time the table stops moving.
 */
const DEAL_LEAD_MS = 500;
import type { RenderCard } from '../render/adapter';
import { BorderFactory, createHologramGroup } from '../render/cardVisuals';
import { FLIGHT_SECONDS, FX_TIMING, IMPACT_SECONDS } from '../render/fxTiming';
import { renderCardCanvas } from '../render/cardFace';
import { soundFx } from '../game/audio';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { maxPixelRatio, wantsAntialias, isTouch } from '../ui/device';

/**
 * Cel-shading helpers.
 *
 * A two-step gradient ramp turns Three's toon material into flat anime shading:
 * one lit tone, one shadow tone, with a hard edge between them. Outlines come from
 * the classic inverted-hull trick — a slightly larger copy of the mesh drawn
 * back-faces-only in near-black.
 */
let toonRampTex: THREE.DataTexture | null = null;

function toonRamp(): THREE.DataTexture {
  if (toonRampTex) return toonRampTex;
  // Three tones: deep shadow, mid, full light — the classic anime ramp.
  const data = new Uint8Array([90, 96, 120, 255, 176, 182, 205, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  toonRampTex = tex;
  return tex;
}

const toonMat = (
  color: number,
  opts: { transparent?: boolean; opacity?: number; side?: THREE.Side; flatShading?: boolean } = {},
) => new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...opts });

/** Wraps a mesh in an inverted-hull outline and returns the pair as a group. */
function withOutline(mesh: THREE.Mesh, thickness = 0.035): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh);
  const outline = new THREE.Mesh(
    mesh.geometry,
    new THREE.MeshBasicMaterial({ color: 0x14121c, side: THREE.BackSide }),
  );
  outline.scale.setScalar(1 + thickness);
  outline.position.copy(mesh.position);
  outline.rotation.copy(mesh.rotation);
  outline.renderOrder = (mesh.renderOrder || 0) - 1;
  g.add(outline);
  return g;
}


/**
 * A mana badge for any permanent that taps for mana.
 *
 * The rule itself has always been generic — a card is a mana source if its definition
 * lists the mana it makes, whatever its type — so the two druids in the set really do work
 * like lands. With the mana panel gone there was nothing on screen saying so, and an
 * ability you cannot see is an ability players do not believe in. This puts the pip on the
 * card, lit while the mana is actually available and dimmed while it is not.
 */
function createManaBadge(colours: string[], ready: boolean): THREE.Mesh {
  const PIP: Record<string, string> = {
    W: '#fef3c7', U: '#38bdf8', B: '#a855f7', R: '#f87171', G: '#4ade80', C: '#cbd5e1',
  };
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.globalAlpha = ready ? 1 : 0.42;
  ctx.fillStyle = 'rgba(8, 9, 12, 0.9)';
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fill();
  // A split disc when the source makes more than one colour, the way a dual land reads.
  colours.slice(0, 2).forEach((col, i, arr) => {
    ctx.fillStyle = PIP[col] ?? PIP.C;
    ctx.beginPath();
    if (arr.length === 1) ctx.arc(64, 64, 42, 0, Math.PI * 2);
    else ctx.arc(64, 64, 42, i ? -Math.PI / 2 : Math.PI / 2, i ? Math.PI / 2 : (3 * Math.PI) / 2);
    ctx.fill();
  });
  ctx.strokeStyle = ready ? '#ffffff' : '#6b7280';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(64, 64, 46, 0, Math.PI * 2);
  ctx.stroke();
  // The tap symbol, so the badge says *how* the mana is made.
  ctx.fillStyle = '#0b0c10';
  ctx.font = '900 52px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('T', 64, 68);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.52),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }),
  );
  mesh.name = 'manaBadge';
  return mesh;
}

/** A soft round dot, shared by every particle system — points are square by default. */
let dotTex: THREE.CanvasTexture | null = null;
function particleDot(): THREE.CanvasTexture {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}

/** One numbered face texture, black on clear, cached per number. */
const dieFaceTextures = new Map<number, THREE.CanvasTexture>();
function dieFaceTexture(n: number): THREE.CanvasTexture {
  const hit = dieFaceTextures.get(n);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0a0b0f';
  ctx.font = `800 ${n >= 10 ? 62 : 72}px "Orbitron", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 64, 62);
  // 6 and 9 get the underline that stops a real die being ambiguous.
  if (n === 6 || n === 9) {
    ctx.fillRect(64 - 20, 100, 40, 6);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  dieFaceTextures.set(n, tex);
  return tex;
}

/**
 * The life total, as a real twenty-sided die: white facets, black edges, and a number on
 * every one of the twenty faces, paired so that opposite faces sum to 21 the way a d20 is
 * numbered. Changing life rolls it, and the roll is aimed — it tumbles, then settles with
 * the face carrying the new total turned to the camera.
 *
 * It is lit from within its own little scene: a ground shadow that tracks the tumble, a
 * hoop, and three satellites that flare outward whenever the number moves. Past twenty the
 * die can say no more, so it rests on 20 and the surplus rides a plate beside it.
 */
/**
 * Where the two dice stand. Both sides sit on the same rail down the *left* edge of the
 * table, mirrored across the centre line — the deck and graveyard own the right edge, so
 * putting the life totals opposite them keeps each half of the board readable.
 */
const DIE_X = -8.7;
const DIE_Y = { you: -6.5, foe: 7.4 };

function createLifeDie(isOpponent: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = 'lifeDie';
  const spinner = new THREE.Group();
  spinner.name = 'dieBody';
  group.add(spinner);

  const geo = new THREE.IcosahedronGeometry(1.0, 0);
  /*
   * Flat shading on a physical material, so every facet catches the key light at its own
   * angle: the die has real light and shade across it rather than reading as a white
   * silhouette. A little clearcoat-ish sheen keeps it looking like polished resin.
   */
  const body = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0xf4f6fa, roughness: 0.32, metalness: 0.08, flatShading: true,
    }),
  );
  body.castShadow = true;
  spinner.add(body);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x0a0a0c, transparent: true, opacity: 0.95 }),
  );
  spinner.add(edges);

  const hullOut = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0x101014, side: THREE.BackSide }),
  );
  hullOut.scale.setScalar(1.012);
  spinner.add(hullOut);

  /*
   * The rim that says this die can be pointed at. It is the die's own edges drawn again in
   * gold, a hair proud of the black ones, rather than a plate hung behind it: a spell
   * targets the die, so the die is what lights up.
   */
  /*
   * A shell, not a line. WebGL ignores LineBasicMaterial.linewidth, so the gold edge was
   * always one pixel wide however thick it was asked to be; the die's own hull drawn back
   * faces only, a little larger, gives a border whose thickness is the amount it is scaled
   * up by, and it reads at any distance.
   */
  const rim = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      color: 0xffb02e, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false,
    }),
  );
  rim.name = 'dieRim';
  rim.scale.setScalar(1.085);
  rim.visible = false;
  spinner.add(rim);

  /*
   * And the die itself breathes with it: a gold wash laid over the faces, added to what is
   * already there, so the whole die warms to gold and cools back rather than only its
   * outline blinking.
   */
  const wash = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      color: 0xffc046, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  wash.name = 'dieWash';
  wash.scale.setScalar(1.004);
  wash.visible = false;
  wash.renderOrder = 22;
  spinner.add(wash);

  // ---- face table: centroid, outward normal, and the number engraved there
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const normals: THREE.Vector3[] = [];
  for (let f = 0; f < pos.count; f += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, f);
    const b = new THREE.Vector3().fromBufferAttribute(pos, f + 1);
    const c2 = new THREE.Vector3().fromBufferAttribute(pos, f + 2);
    normals.push(a.add(b).add(c2).divideScalar(3).normalize());
  }
  /*
   * Number the faces in opposite pairs summing to 21, the way a d20 is actually numbered:
   * each face's opposite is the one whose outward normal is its exact inverse.
   */
  const numbering = new Array<number>(normals.length).fill(0);
  let next = 1;
  for (let i = 0; i < normals.length; i++) {
    if (numbering[i]) continue;
    numbering[i] = next;
    const opp = normals.findIndex((m, j) => j !== i && m.dot(normals[i]) < -0.99);
    if (opp >= 0) numbering[opp] = 21 - next;
    next += 1;
  }

  normals.forEach((n, i) => {
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 0.66),
      new THREE.MeshBasicMaterial({ map: dieFaceTexture(numbering[i]), transparent: true, depthWrite: false }),
    );
    plate.position.copy(n).multiplyScalar(0.88);
    plate.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    plate.renderOrder = 20;
    spinner.add(plate);
  });

  // ---- ground shadow, drawn rather than cast: always readable, and free
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d')!;
  const sgrad = sctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  sgrad.addColorStop(0, 'rgba(0,0,0,0.62)');
  sgrad.addColorStop(0.55, 'rgba(0,0,0,0.26)');
  sgrad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = sgrad;
  sctx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false,
    }),
  );
  shadow.name = 'dieShadow';
  shadow.position.set(0.25, -0.25, -0.98);
  group.add(shadow);

  // ---- satellites: a hoop and three shards that react when the total moves
  const orbit = new THREE.Group();
  orbit.name = 'dieOrbit';
  const hoop = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.028, 6, 44),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }),
  );
  hoop.name = 'dieHoop';
  hoop.rotation.x = 1.15;
  orbit.add(hoop);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const shard = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14, 0),
      new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp() }),
    );
    shard.name = 'dieShard';
    shard.userData.angle = a;
    orbit.add(shard);
  }
  group.add(orbit);

  const overCanvas = document.createElement('canvas');
  overCanvas.width = 256;
  overCanvas.height = 96;
  const overTex = new THREE.CanvasTexture(overCanvas);
  overTex.colorSpace = THREE.SRGBColorSpace;
  const over = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.56),
    new THREE.MeshBasicMaterial({
      map: overTex, transparent: true, depthWrite: false, depthTest: false,
    }),
  );
  over.name = 'lifeOver';
  over.position.set(0, isOpponent ? -1.85 : 1.85, 0.02);
  over.renderOrder = 60;
  over.visible = false;
  group.add(over);

  group.userData.overTex = overTex;
  group.userData.normals = normals;
  group.userData.numbering = numbering;
  group.userData.shown = null;
  group.userData.spin = 0;
  // Which way the winning face has to point: straight at the camera, from where this die
  // stands, with the frame's own up as the roll reference so the digits sit level.
  group.userData.faceDir = new THREE.Vector3(0, -11.5, 14.5)
    .sub(new THREE.Vector3(DIE_X, isOpponent ? DIE_Y.foe : DIE_Y.you, 1.0))
    .normalize();
  return group;
}

/** The orientation that turns the face carrying `value` toward the camera, digits level. */
function dieQuaternionFor(die: THREE.Group, value: number): THREE.Quaternion {
  const normals = die.userData.normals as THREE.Vector3[];
  const numbering = die.userData.numbering as number[];
  const idx = Math.max(0, numbering.indexOf(value));
  const n = normals[idx];

  const t = (die.userData.faceDir as THREE.Vector3).clone().normalize();
  const worldUp = new THREE.Vector3(0, 0.778, 0.628);
  const upT = worldUp.clone().sub(t.clone().multiplyScalar(worldUp.dot(t))).normalize();
  const rightT = new THREE.Vector3().crossVectors(upT, t).normalize();

  // The face's own frame: its normal, plus whichever axis the number plate calls up.
  const plateUp = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n));
  const u1 = plateUp.clone().sub(n.clone().multiplyScalar(plateUp.dot(n))).normalize();
  const r1 = new THREE.Vector3().crossVectors(u1, n).normalize();

  const from = new THREE.Matrix4().makeBasis(r1, u1, n);
  const to = new THREE.Matrix4().makeBasis(rightT, upT, t);
  return new THREE.Quaternion().setFromRotationMatrix(to.multiply(from.invert()));
}

/** Repaints the surplus plate and aims the roll at the new total. */
function drawLifeDie(die: THREE.Group, life: number) {
  const capped = Math.max(1, Math.min(20, life));
  const surplus = Math.max(0, life - 20);

  die.userData.targetQuat = dieQuaternionFor(die, capped);

  const over = die.getObjectByName('lifeOver') as THREE.Mesh | undefined;
  if (over) {
    over.visible = surplus > 0;
    if (surplus > 0) {
      const overTex = die.userData.overTex as THREE.CanvasTexture;
      const oc = overTex.image as HTMLCanvasElement;
      const octx = oc.getContext('2d')!;
      octx.clearRect(0, 0, 256, 96);
      octx.fillStyle = 'rgba(6, 7, 10, 0.86)';
      octx.beginPath();
      octx.roundRect(6, 8, 244, 80, 40);
      octx.fill();
      octx.strokeStyle = '#ffffff';
      octx.lineWidth = 4;
      octx.stroke();
      octx.fillStyle = '#ffffff';
      octx.font = '900 54px "Orbitron", system-ui, sans-serif';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillText(`+${surplus}`, 128, 50);
      overTex.needsUpdate = true;
    }
  }
}

export interface HudSide {
  life: number;
  maxLife: number;
  manaPool: Record<string, number>;
}

interface BattleCanvasProps {
  player: HudSide;
  opponent: HudSide;
  playerHand?: RenderCard[];
  playerBattlefield: RenderCard[];
  opponentBattlefield: RenderCard[];
  playerDeckCount: number;
  opponentDeckCount: number;
  playerGraveyard: RenderCard[];
  opponentGraveyard: RenderCard[];
  gamePhase: string;
  isPlayerTurn: boolean;
  hasTappedAttackers: boolean;
  /** Click on a card already on the battlefield (either side). */
  /**
   * `byTouch` says the click came from a finger. The board work is the same either way;
   * it only tells the screen not to raise the card reader, because on touch the reader is
   * driven by press and release rather than by the click.
   */
  onBoardCardClick: (card: RenderCard, isOpponent: boolean, byTouch?: boolean) => void;
  /** Click on a card in your hand. */
  onHandCardClick: (card: RenderCard) => void;
  /** A hand card was dragged onto the battlefield. */
  onPlayCard: (card: RenderCard) => void;
  onHoverCard?: (card: RenderCard | null) => void;
  /** The 3D board button: label plus what it does. */
  primaryLabel: string;
  primaryEnabled: boolean;
  onPrimaryAction: () => void;
  /** Instance ids to ring-highlight: legal targets, chosen attackers, blockers. */
  highlightIds?: string[];
  /**
   * Subset that gets the full glowing halo. Kept separate because "these hand cards are
   * affordable" is ambient information, while "pick one of these" is a demand — only the
   * demand earns a halo. Defaults to `highlightIds`.
   */
  glowIds?: string[];
  /**
   * What the highlighted cards are: `source` means "click one of yours to act with
   * it", `target` means "pick one of these to be hit". They glow different colours so
   * the step reads at a glance.
   */
  highlightRole?: 'source' | 'target';
  /** The card the dashed arrow is being drawn from — it lifts clear and glows white. */
  aimSourceId?: string | null;
  /** Players a pending spell may hit: their life panel glows and becomes clickable. */
  targetableHeroes?: ('you' | 'foe')[];
  onHeroClick?: (side: 'you' | 'foe') => void;
  onHeroHover?: (side: 'you' | 'foe' | null) => void;
  /** A finger landed on the table rather than on anything — used to cancel a cast. */
  onEmptyTap?: () => void;
  /** Fired once, when the opening camera move has landed. */
  onIntroDone?: () => void;
  /** Receives the board's own effects API, so spells can be fired inside the 3D scene. */
  onFxApi?: (api: {
    shoot: (from: string, to: string, colour: number) => void;
    duel: (from: string, to: string, colour: number) => void;
    /** Throws every mast on the outer ring into a hard double turn. */
    surge: () => void;
    /** How tall a card on the table currently is, in screen pixels. */
    cardPixels: () => number;
    /** Rasterise these faces ahead of time, a few per idle slot. */
    warmFaces: (cards: RenderCard[]) => void;
  }) => void;
  /**
   * Receives a function that maps an instance id (or the anchors 'hero-you',
   * 'hero-foe', 'deck-you', 'deck-foe') to a screen-space point, so the effects
   * layer can position DOM visuals over the 3D board.
   */
  onProjector?: (project: (key: string) => { x: number; y: number } | null) => void;
  /**
   * The tutorial's light. `null` renders normally; an array darkens the whole board and
   * then redraws exactly these objects over the dark, so what stays lit is the object's
   * own silhouette rather than a box around it. An empty array darkens everything.
   */
  spotlight?: string[] | null;
}

export const BattleCanvas: React.FC<BattleCanvasProps> = ({
  player,
  opponent,
  playerHand = [],
  playerBattlefield,
  opponentBattlefield,
  playerDeckCount,
  opponentDeckCount,
  playerGraveyard,
  opponentGraveyard,
  gamePhase,
  isPlayerTurn,
  hasTappedAttackers,
  onBoardCardClick,
  onHandCardClick,
  onPlayCard,
  onHoverCard,
  primaryLabel,
  primaryEnabled,
  onPrimaryAction,
  highlightIds,
  glowIds,
  highlightRole = 'source',
  aimSourceId,
  targetableHeroes,
  onHeroClick,
  onHeroHover,
  onEmptyTap,
  onIntroDone,
  onFxApi,
  onProjector,
  spotlight = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  /** Mirrors `spotlight` for the animation loop, which runs outside React's render. */
  const spotlightRef = useRef<string[] | null>(null);
  spotlightRef.current = spotlight;
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cardsGroupRef = useRef<THREE.Group | null>(null);
  const particlesGroupRef = useRef<THREE.Group | null>(null);
  const interactablesGroupRef = useRef<THREE.Group | null>(null);
  const arenaRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Map instanceId to THREE.Group
  const cardMeshMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const handMeshMapRef = useRef<Map<string, THREE.Group>>(new Map());

  // Mirrors the aiming card for the pointer handlers, which run outside React's render.
  const aimSourceIdRef = useRef<string | null>(null);
  aimSourceIdRef.current = aimSourceId ?? null;
  const hoveredHeroRef = useRef<'you' | 'foe' | null>(null);
  /** Which die the pointer is resting on, whether or not it may be aimed at. */
  const dieHoverRef = useRef<'you' | 'foe' | null>(null);

  // Dragging 3D Hand Card state
  const dragging3DInstanceIdRef = useRef<string | null>(null);
  const dragPlanePointRef = useRef<THREE.Vector3 | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  /** 'mouse' | 'touch' | 'pen' — which kind of pointer began the gesture now finishing. */
  const lastPointerTypeRef = useRef<string>('mouse');
  /**
   * A finger dragging from one board card to another during combat.
   *
   * `armed` is the card the finger went down on; `live` says the drag has passed the slop
   * threshold and the first of the two taps has already been sent.
   */
  const boardDragRef = useRef<{ iid: string; mine: boolean; live: boolean } | null>(null);
  /** What the press landed on, and where, so the tap that follows resolves to the same thing. */
  const pressPickRef = useRef<{ obj: THREE.Object3D | null; x: number; y: number } | null>(null);
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.0));

  // Shared clock, so effects started outside the frame loop can stamp their own start.
  /**
   * `getObjectByName` walks the entire subtree beneath the object it is called on. Calling
   * it once per card and once per arena decoration on every frame — which is what the
   * animation loop was doing, several times over — is thousands of node visits a frame for
   * answers that do not change. This remembers the answer on the object it was asked of,
   * and re-asks only if what it found has since been detached.
   */
  const named = <T extends THREE.Object3D>(
    root: THREE.Object3D | null | undefined,
    name: string,
  ): T | undefined => {
    if (!root) return undefined;
    const ud = root.userData as { __named?: Record<string, THREE.Object3D> };
    const memo = (ud.__named ??= {});
    const hit = memo[name];
    if (hit && hit.parent) return hit as T;
    const found = root.getObjectByName(name);
    if (found) memo[name] = found;
    else delete memo[name];
    return found as T | undefined;
  };

  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  /**
   * How far the opening move has run, in ms of drawn time; null once it has finished.
   * Drawn time, not wall time — see the loop.
   */
  const introRef = useRef<number | null>(null);
  /** Wall clock at the first frame of the opening, for the cap that bounds it. */
  const introWallRef = useRef(0);
  /** Scene second the opening handed over, which is where the idle drift counts from. */
  const driftFromRef = useRef<number | null>(null);
  /** Scratch for sampling the opening's path, so the loop allocates nothing. */
  const camShot = useRef(new THREE.Vector3());
  const lookShot = useRef(new THREE.Vector3());
  /**
   * Scene-clock second the opening move will land on. While the move is running this is
   * re-estimated every frame from how much of it is left, so a stall that stretches the
   * shot stretches the wait for the deal with it rather than letting the cards out early.
   */
  const introUntilRef = useRef(0);
  /**
   * When a given card of a deal is allowed onto the table: not before the camera is nearly
   * down, and one interval per card after that. Computed rather than stored, because the
   * instant the camera lands is not known until it has landed.
   */
  const dealGate = (dealtAt: number, order: number) =>
    Math.max(dealtAt, introUntilRef.current - DEAL_LEAD_MS / 1000) +
    (order * FX_TIMING.drawStep) / 1000;
  const introDoneSent = useRef(false);
  /**
   * Scene time at which the masts were last thrown into their double turn, or -1 for never.
   * A blow that reaches the player sets it, and the frame loop adds two whole revolutions
   * on top of each mast's ordinary drift over the next moment.
   */
  const mastSurgeRef = useRef(-1);
  /** Spells in flight, and the bursts they leave behind, both live in the 3D scene. */
  const shotsRef = useRef<
    {
      group: THREE.Group;
      head: THREE.Object3D;
      trail: THREE.Points;
      lightSlot: { light: THREE.PointLight; busy: boolean } | null;
      from: THREE.Vector3;
      ctrl: THREE.Vector3;
      to: THREE.Vector3;
      /**
       * What the shot is aimed at, so its target can be re-read every frame. A card that
       * dies mid-combat takes its neighbours with it — the row re-centres — and a shot
       * that had captured a position at launch would land where the card used to be.
       */
      toKey: string;
      swing: number;
      colour: THREE.Color;
      start: number;
      dur: number;
      /** `bolt` is the spell/player strike; `duel` is one creature swinging at another. */
      style: 'bolt' | 'duel';
      onLand?: () => void;
      landed: boolean;
    }[]
  >([]);
  /**
   * Spell lights, allocated once.
   *
   * Adding a light to a three.js scene changes the lighting signature every material is
   * compiled against, so every shader in the scene is rebuilt on the spot — which is
   * exactly the hitch that showed up when an attack animation started, and again when it
   * detonated. The count never changes now: four lights exist from the first frame, sit at
   * zero intensity, and effects borrow one instead of creating their own.
   */
  const lightPoolRef = useRef<{ light: THREE.PointLight; busy: boolean }[]>([]);
  const takeLight = (colour: number, intensity: number, distance: number) => {
    const slot = lightPoolRef.current.find((l) => !l.busy);
    if (!slot) return null;
    slot.busy = true;
    slot.light.color.setHex(colour);
    slot.light.intensity = intensity;
    slot.light.distance = distance;
    return slot;
  };
  const freeLight = (slot: { light: THREE.PointLight; busy: boolean } | null) => {
    if (!slot) return;
    slot.light.intensity = 0;
    slot.busy = false;
  };

  /** Accumulated time spent building card meshes — the opening cost, measured. */
  const buildMsRef = useRef(0);

  /** Cumulative counters, so a test can see an effect that has already finished. */
  const fxTallyRef = useRef({ shots: 0, bursts: 0 });
  const burstsRef = useRef<
    {
      points: THREE.Points;
      /** The ring for a bolt; the whole crossed-slash assembly for a duel. */
      ring: THREE.Object3D;
      lightSlot: { light: THREE.PointLight; busy: boolean } | null;
      vel: Float32Array;
      start: number;
      dur: number;
      style?: 'bolt' | 'duel';
    }[]
  >([]);

  // Cards that have just left the hand and are playing their burn-away exit.
  const spentMeshesRef = useRef<
    { group: THREE.Group; start: number; from: THREE.Vector3; rotZ: number }[]
  >([]);

  /**
   * Hover targets for the hand.
   *
   * A hovered card rises and grows, which means its own silhouette can swallow the slot
   * next to it — so the pointer would leave a card and still be "on" it, and the cards
   * either side became hard to reach. These proxies stay at each card's resting slot and
   * are what the pointer is actually tested against; the visible card is free to move.
   * They draw nothing.
   */
  const handHitMapRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Map for dying meshes playing flight arc disintegration animation into graveyard
  const dyingMeshesRef = useRef<
    Map<
      string,
      {
        group: THREE.Group;
        startTime: number;
        duration: number;
        startPos: THREE.Vector3;
        endPos: THREE.Vector3;
        startRotX: number;
        startRotY: number;
        startRotZ: number;
        particleSystem?: THREE.Points;
        velocities?: Float32Array;
      }
    >
  >(new Map());

  // Flight animations for drawing cards
  const activeDrawAnimsRef = useRef<{ mesh: THREE.Group; startTime: number; duration: number; startPos: THREE.Vector3; endPos: THREE.Vector3 }[]>([]);

  // 3D Objects
  const playerDeckMeshRef = useRef<THREE.Group | null>(null);
  const opponentDeckMeshRef = useRef<THREE.Group | null>(null);
  const playerGraveyardMeshRef = useRef<THREE.Group | null>(null);
  const opponentGraveyardMeshRef = useRef<THREE.Group | null>(null);
  const endTurnButtonRef = useRef<THREE.Group | null>(null);
  const buttonCapMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const confirmAttackButtonRef = useRef<THREE.Group | null>(null);
  const playerHudMeshRef = useRef<THREE.Group | null>(null);
  const opponentHudMeshRef = useRef<THREE.Group | null>(null);

  // Hover states
  const hoveredInstanceIdRef = useRef<string | null>(null);
  const prevHoveredIdRef = useRef<string | null>(null);
  const isEndTurnHoveredRef = useRef<boolean>(false);
  const isAttackHoveredRef = useRef<boolean>(false);
  /*
   * When the board button was last pressed. A button that only lit up on hover felt like
   * a picture of a button; the cap now travels below its rest height on the way down and
   * springs back, so the press is something you can see happen.
   */
  const buttonPressUntilRef = useRef(0);

  /** The back never changes, and it is a 2048x3072 canvas — build it once. */
  const cardBackTexRef = useRef<THREE.CanvasTexture | null>(null);

  /**
   * The cut edge of a stack of cards: one hairline per card in the pile, so a deck reads
   * as a real block of paper rather than a painted slab. The stripes have to run across
   * the stack's depth, and BoxGeometry maps depth to U on the two X faces and to V on the
   * two Y faces — hence the axis argument.
   */
  const createDeckEdgeTexture = (count: number, axis: 'u' | 'v') => {
    const N = 1024;
    const c = document.createElement('canvas');
    c.width = axis === 'u' ? N : 16;
    c.height = axis === 'u' ? 16 : N;
    const ctx = c.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(c);

    const n = Math.max(1, Math.min(220, count));
    ctx.fillStyle = '#0b0b0f';
    ctx.fillRect(0, 0, c.width, c.height);

    /*
     * Deterministic jitter: the same deck always draws the same edge, so the stack does
     * not shimmer when a card is removed and the texture is rebuilt.
     */
    let seed = 0x2f6e2b1;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    for (let i = 0; i < n; i++) {
      const a = (i / n) * N;
      const b = ((i + 1) / n) * N;
      // Each card's face: a very dark grey, varying a little so no two read the same.
      const v = 26 + Math.floor(rnd() * 16);
      ctx.fillStyle = `rgb(${v},${v},${v + 3})`;
      if (axis === 'u') ctx.fillRect(a, 0, b - a, c.height);
      else ctx.fillRect(0, a, c.width, b - a);

      // The cut itself: a hairline of light caught on the edge of the stock.
      ctx.fillStyle = `rgba(226,232,240,${0.3 + rnd() * 0.4})`;
      const w = Math.max(1, (N / n) * 0.16);
      if (axis === 'u') ctx.fillRect(b - w, 0, w, c.height);
      else ctx.fillRect(0, b - w, c.width, w);
    }

    // A gradient along the stack so the bottom of the pile sits in its own shadow.
    const g = axis === 'u'
      ? ctx.createLinearGradient(0, 0, N, 0)
      : ctx.createLinearGradient(0, 0, 0, N);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  };

  // Card Back Texture Helper
  /**
   * The card back.
   *
   * Black, with the work done at the edges. An ornate frame runs the perimeter — a heavy
   * rule, a beaded track, and two hairlines — and each corner carries a piece of filigree
   * built from stepped brackets, a diamond and three diagonal cuts. The field inside is
   * flat black with nothing drawn on it at all: no ring, no rule, no pattern, and no lift
   * at the centre. The only thing standing in that space is the mark.
   */
  const createCardBackTexture = () => {
    const W = 2048;
    const H = 3072;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(c);

    const cx = W / 2;
    const cy = H / 2;
    const INK = '233,237,245';

    // Flat black. Nothing brightens the middle.
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // ---- the frame, four concentric tracks near the edge
    const rect = (inset: number, width: number, alpha: number) => {
      ctx.strokeStyle = `rgba(${INK},${alpha})`;
      ctx.lineWidth = width;
      ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
    };
    rect(84, 12, 0.62);     // the heavy outer rule
    rect(132, 3, 0.24);     // a hairline just inside it
    rect(214, 5, 0.42);     // the inner rule that closes the band
    rect(232, 2, 0.16);

    /*
     * A beaded track running between the two inner rules. The beads are spaced by arc
     * length rather than per side, so the rhythm carries round the corners unbroken.
     */
    const beadR = 173;
    const step = 46;
    ctx.fillStyle = `rgba(${INK},0.5)`;
    for (let x = beadR + step; x < W - beadR; x += step) {
      for (const y of [beadR, H - beadR]) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let y = beadR + step; y < H - beadR; y += step) {
      for (const x of [beadR, W - beadR]) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- corner filigree, one piece mirrored into all four corners
    const filigree = (ox: number, oy: number, sx: number, sy: number) => {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(sx, sy);
      ctx.lineCap = 'square';

      // Stepped bracket: three right angles marching inward.
      const steps: [number, number, number][] = [[0, 300, 11], [56, 232, 7], [104, 176, 4]];
      for (const [off, reach, wgt] of steps) {
        ctx.strokeStyle = `rgba(${INK},${0.85 - off / 520})`;
        ctx.lineWidth = wgt;
        ctx.beginPath();
        ctx.moveTo(off, off + reach);
        ctx.lineTo(off, off);
        ctx.lineTo(off + reach, off);
        ctx.stroke();
      }

      // Three cuts across the angle, longest at the outside.
      ctx.strokeStyle = `rgba(${INK},0.6)`;
      ctx.lineWidth = 5;
      for (const d of [188, 232, 276]) {
        ctx.beginPath();
        ctx.moveTo(d - 92, 22);
        ctx.lineTo(22, d - 92);
        ctx.stroke();
      }

      // A struck diamond sitting on the diagonal, with a bright core.
      ctx.translate(150, 150);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = `rgba(${INK},0.9)`;
      ctx.lineWidth = 6;
      ctx.strokeRect(-34, -34, 68, 68);
      ctx.fillStyle = `rgba(${INK},0.9)`;
      ctx.fillRect(-13, -13, 26, 26);
      ctx.restore();
    };
    filigree(120, 120, 1, 1);
    filigree(W - 120, 120, -1, 1);
    filigree(120, H - 120, 1, -1);
    filigree(W - 120, H - 120, -1, -1);

    /*
     * The mark, alone in the middle. Sized to the frame rather than to a guessed point
     * size, and letter-spaced wide so it holds the space without a heavy face.
     */
    const word = 'ABAI';
    /*
     * Orbitron is not loaded anywhere — this file fetches nothing — so naming it first
     * meant the mark rendered in whatever the browser happened to fall back to. A real
     * grotesque stack, at a weight and a tracking that suit the size it is actually seen
     * at: smaller than the frame, and spaced enough to breathe without falling apart.
     */
    const face = '600 {S}px "Helvetica Neue", Helvetica, Arial, "Noto Sans TC", sans-serif';
    const measure = (size: number) => {
      ctx.font = face.replace('{S}', String(size));
      const ws = [...word].map((ch) => ctx.measureText(ch).width);
      const track = size * 0.13;
      return { ws, track, total: ws.reduce((a, w) => a + w, 0) + track * (word.length - 1) };
    };
    const targetW = 620;
    let size = 240;
    let m = measure(size);
    size = Math.max(90, Math.floor((size * targetW) / m.total));
    m = measure(size);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f4f7fb';
    let penX = cx - m.total / 2;
    [...word].forEach((ch, i) => {
      ctx.fillText(ch, penX + m.ws[i] / 2, cy);
      penX += m.ws[i] + m.track;
    });

    return new THREE.CanvasTexture(c);
  };

  /**
   * Text on the table is read at a slant, so it wants anisotropic filtering — but only on
   * the phone, where this was asked for. The desktop keeps exactly the button it had.
   */
  const crisp = (t: THREE.CanvasTexture) => {
    if (!isTouch()) return t;
    t.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() ?? 8;
    t.needsUpdate = true;
    return t;
  };

  // 3D End Turn Button Canvas Texture (Monochrome Dark)
  const createButtonCanvasTexture = (isActive: boolean, label = '結束回合') => {
    const canvas = document.createElement('canvas');
    /*
     * Sized to the cap, on a phone. Drawing it larger was the obvious move and the wrong
     * one: the cap is about 140 pixels across, so a 1024 face is drawn from a mip a
     * seventh of that — the label was rasterised at seven times the size it is seen at and
     * then averaged back down, which is exactly how type goes soft. This is the one piece
     * of text the whole match is steered by. The desktop keeps the face it had.
     */
    const SZ = isTouch() ? capTexSize(rendererRef.current) : 512;
    canvas.width = SZ;
    canvas.height = SZ;
    const ctx = canvas.getContext('2d');
    // Everything below was authored against a 512 face, so it is drawn through one factor.
    const k = SZ / 512;
    if (ctx) {
      ctx.fillStyle = isActive ? '#050505' : '#141414';
      ctx.beginPath();
      ctx.arc(256 * k, 256 * k, 240 * k, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isActive ? '#ffffff' : '#444444';
      ctx.lineWidth = 18 * k;
      ctx.stroke();

      ctx.fillStyle = isActive ? '#ffffff' : '#666666';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      /*
       * One line, always. Anything in brackets is dropped — the count it carried is
       * already legible on the board — and the type shrinks until the rest fits inside
       * the cap rather than wrapping.
       */
      const clean = label.replace(/[▶✕]/g, '').replace(/[（(][^）)]*[）)]/g, '').trim();
      const lines = [clean];
      let size = 64 * k;
      ctx.font = `900 ${size}px "Noto Sans TC", sans-serif`;
      while (size > 30 * k && ctx.measureText(clean).width > 380 * k) {
        size -= 4 * k;
        ctx.font = `900 ${size}px "Noto Sans TC", sans-serif`;
      }
      lines.forEach((ln, i) => {
        ctx.fillText(ln, 256 * k, 256 * k + (i - (lines.length - 1) / 2) * (size + 10 * k));
      });
    }
    return crisp(new THREE.CanvasTexture(canvas));
  };

  // Helper to build 3D Label Badge
  const createLabelBadge = (text: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, 248, 56);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 32);
    }
    const tex = new THREE.CanvasTexture(canvas);

    const planeGeom = new THREE.PlaneGeometry(1.6, 0.4);
    const planeMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(planeGeom, planeMat);
    return mesh;
  };

  /**
   * A large power/toughness plate that floats in front of a battlefield creature.
   * The value printed on the card face is legible in hand but far too small once the
   * card is lying on the board, so combat stats get their own billboard.
   */
  const createStatPlate = (pow: number, tou: number, buffed: boolean, damaged: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const accent = damaged ? '#f87171' : buffed ? '#4ade80' : '#ffffff';
      ctx.fillStyle = 'rgba(6, 6, 10, 0.94)';
      ctx.beginPath();
      ctx.roundRect(6, 6, 244, 116, 22);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = accent;
      ctx.font = '900 66px "Orbitron", "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${pow}/${tou}`, 128, 66);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.46),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }),
    );
    mesh.name = 'statPlate';
    return mesh;
  };

  /**
   * Halo used to say "this card is what the game wants from you right now".
   *
   * It is a card-shaped ring rather than a filled glow: the interior stays clear so the
   * art is never washed out, and the blur spills outward so the light reads as coming
   * from behind the card. One texture is shared by every card and tinted per role.
   */
  const glowTexRef = useRef<THREE.CanvasTexture | null>(null);
  const glowTexture = () => {
    if (glowTexRef.current) return glowTexRef.current;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 372;
    const ctx = c.getContext('2d')!;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    /*
     * The ring is drawn so that, once the plane below is scaled, it lands exactly on the
     * card's own silhouette: 18px in on 256 gives 1.80 units across, 21px in on 372 gives
     * 2.71 down — the card is 1.8 x 2.7 — with the same corner radius as the frame.
     */
    const rr = () => {
      ctx.beginPath();
      ctx.roundRect(18, 21, c.width - 36, c.height - 42, 13);
    };
    for (const [w, blur, alpha] of [[6, 14, 0.34], [4.8, 4, 0.95]] as const) {
      ctx.lineWidth = w;
      ctx.shadowBlur = blur;
      ctx.globalAlpha = alpha;
      rr();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    glowTexRef.current = tex;
    return tex;
  };

  /** Pulses whatever halo a card is currently wearing; called every frame. */
  const breatheGlow = (group: THREE.Group, time: number) => {
    const halo = group.getObjectByName('glowHalo') as THREE.Mesh | undefined;
    if (!halo || !halo.visible) return;
    const mat = halo.material as THREE.MeshBasicMaterial;
    // Brightness alone carries the pulse — the card itself never moves, so a lit board
    // stays still instead of bobbing.
    mat.opacity = group.userData.isAimSource
      ? 0.92 + Math.sin(time * 6) * 0.08
      : 0.62 + Math.sin(time * 3.4) * 0.24;
  };

  /** Adds (or finds) the halo on a card group. */
  const ensureGlow = (group: THREE.Group) => {
    const found = group.getObjectByName('glowHalo') as THREE.Mesh | undefined;
    if (found) return found;
    const mesh = new THREE.Mesh(
      // Oversized on purpose: the blur has to live outside the card silhouette.
      new THREE.PlaneGeometry(2.1, 3.05),
      new THREE.MeshBasicMaterial({
        map: glowTexture(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      }),
    );
    mesh.name = 'glowHalo';
    // Just clear of the face so the ring is never z-fought by the card itself.
    mesh.position.z = 0.09;
    mesh.renderOrder = 1100;
    mesh.visible = false;
    group.add(mesh);
    return mesh;
  };

  /**
   * Splits a dying card into two halves along a diagonal, so destruction reads as a
   * blade stroke rather than a fade. The halves inherit the card's own face texture
   * via UV offsets, then fall away from the cut.
   */
  const buildCardHalves = (source: THREE.Group, card: RenderCard) => {
    /*
     * The very face the card was already wearing. Drawing it again cost 12ms or more per
     * casualty, taken synchronously on the frame the creature died — six of them going at
     * once in a big exchange was a hitch you could see. The halves only need different UVs,
     * and UVs live on the geometry, so one texture serves both and the card in play too.
     */
    const faceTex = faceTexture(card);
    const halves: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      const geom = new THREE.PlaneGeometry(1.8, 1.35);
      // Top half samples the upper portion of the face, bottom half the lower.
      const uv = geom.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) {
        uv.setY(i, uv.getY(i) * 0.5 + (side < 0 ? 0.5 : 0));
      }
      uv.needsUpdate = true;
      const mesh = new THREE.Mesh(
        geom,
        new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
      );
      mesh.position.copy(source.position);
      mesh.position.y += side < 0 ? 0.675 : -0.675;
      mesh.rotation.copy(source.rotation);
      mesh.renderOrder = 400;
      mesh.userData.drift = side;
      halves.push(mesh);
    }
    return halves;
  };

  // Helper to construct Physical 3D Graveyard Pile with Stack Thickness & Card Layering
  const createGraveyardStackMesh = (graveyardCards: RenderCard[]): THREE.Group => {
    const gyT0 = import.meta.env.VITE_TEST_HOOK ? performance.now() : 0;
    const graveGroup = new THREE.Group();
    const stackGroup = new THREE.Group();
    stackGroup.rotation.z = Math.PI / 2; // Horizontal landscape orientation

    // Solid Stone/Obsidian Altar Pedestal Base (Halved thickness)
    const baseBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 2.7, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.8, metalness: 0.3 })
    );
    baseBox.position.z = 0.02;
    stackGroup.add(baseBox);

    // Pedestal Edge Outline
    const edges = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.8, 2.7));
    const edgeLine = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
    );
    edgeLine.position.z = 0.045;
    stackGroup.add(edgeLine);

    const cardCount = graveyardCards.length;
    // Each buried card is its own slab, so its cut edge is what separates it from the one
    // below; a light enough side makes that edge read instead of merging into the pile.
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 0.75 });

    if (cardCount > 0) {
      // Physical stacked card layers constructing realistic physical depth (Halved thickness)
      const maxVisible = Math.min(15, cardCount);
      const cardThickness = 0.0225;

      for (let i = 0; i < maxVisible; i++) {
        const cardIndex = cardCount - maxVisible + i;
        const card = graveyardCards[cardIndex];
        const isTop = i === maxVisible - 1;

        const zPos = 0.04 + i * cardThickness + cardThickness / 2;

        // Pseudo-random subtle organic card stack rotation and jitter
        const rotZ = (((cardIndex * 13) % 17) - 8) * (Math.PI / 180); // -8 to +8 degrees
        const jitterX = (((cardIndex * 7) % 11) - 5) * 0.015;
        const jitterY = (((cardIndex * 11) % 13) - 6) * 0.015;

        let topMat: THREE.Material;
        if (isTop) {
          /*
           * The shared face, the same one the card wore in play. This used to draw a fresh
           * 2048x3072 canvas every time the graveyard changed — that is, on every single
           * death — for a card the size of a thumbnail on the table.
           */
          topMat = new THREE.MeshBasicMaterial({ map: faceTexture(card) });
        } else {
          // The back is a 2048x3072 canvas; building one per buried card rebuilt fourteen
          // of them every time the graveyard changed.
          if (!cardBackTexRef.current) cardBackTexRef.current = createCardBackTexture();
          cardBackTexRef.current.colorSpace = THREE.SRGBColorSpace;
          topMat = new THREE.MeshBasicMaterial({ map: cardBackTexRef.current });
        }

        const layerGeom = new THREE.BoxGeometry(1.8, 2.7, cardThickness);
        const layerMesh = new THREE.Mesh(layerGeom, [sideMat, sideMat, sideMat, sideMat, topMat, sideMat]);
        layerMesh.position.set(jitterX, jitterY, zPos);
        layerMesh.rotation.z = rotZ;
        layerMesh.castShadow = true;
        layerMesh.receiveShadow = true;
        stackGroup.add(layerMesh);
      }
    }

    graveGroup.add(stackGroup);
    if (import.meta.env.VITE_TEST_HOOK) {
      const g = ((window as any).__gyBuild ??= { n: 0, ms: 0 });
      g.n += 1;
      g.ms += performance.now() - gyT0;
    }
    return graveGroup;
  };

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    // Painted sky backdrop: dusk gradient with a low sun bloom, the way a cel
    // background plate would be painted rather than rendered.
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 16;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext('2d')!;
    // Deep space, read in greys only: black overhead falling to a pale horizon glow,
    // which is what separates the arena silhouette from the void behind it.
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, '#000000');
    skyGrad.addColorStop(0.45, '#07080b');
    skyGrad.addColorStop(0.74, '#171a20');
    skyGrad.addColorStop(0.9, '#31353e');
    skyGrad.addColorStop(1, '#4a4f5a');
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 16, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;
    scene.overrideMaterial = null;
    scene.fog = null;
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    /*
     * The arrival.
     *
     * The camera opens high above the arena, far enough back that the pillars are read from
     * their footings to their caps, and comes down to the seat the game is played from. It
     * is one move on a single ease — no cuts, no orbit — because the point is to establish
     * where you are, not to show off the model.
     *
     * Everything else waits on it: the hand is not dealt and the toss is not thrown until
     * the camera is down, so the sequence reads as a room being entered and then a game
     * beginning, rather than both happening over each other.
     */
    camera.position.set(CAM_FROM.x, CAM_FROM.y, CAM_FROM.z);
    camera.lookAt(LOOK_FROM.x, LOOK_FROM.y, LOOK_FROM.z);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: wantsAntialias(), powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(maxPixelRatio());
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    /*
     * The shadow map is redrawn every frame. Refreshing it on a stride instead was tried —
     * it is a second pass over every caster, so skipping two frames in three is a real
     * saving — and it does not survive contact with this scene: with the map held between
     * frames the arena comes back a great deal darker, so what is being skipped is not just
     * a repeat. It stays on every frame.
     */
    renderer.shadowMap.autoUpdate = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    /*
     * Edges, on a phone, without paying for multisampling.
     *
     * The phone renders at nearly its full device resolution — that is what makes the type
     * on a card legible — and multisampling on top of that is four times the drawing buffer,
     * which is the memory ceiling iOS quietly enforces by leaving parts of the screen black.
     * So the board is drawn once into an ordinary buffer and passed through FXAA on the way
     * to the screen: one extra full-screen pass and one plain render target, against the
     * ~120 MB a multisampled buffer would have cost. Edges come back and the resolution
     * stays. The desktop keeps real multisampling and never takes this path.
     */
    // The comparison hook: the same board with the extra pass switched off, so a test can
    // put the two side by side and see whether the pass changes anything but the edges.
    const useFxaa =
      isTouch() &&
      !(import.meta.env.VITE_TEST_HOOK && localStorage.getItem('__nofx') === '1');
    /*
     * The offscreen buffer has to behave exactly like the canvas, or the board changes
     * appearance on the way through.
     *
     * Three converts colour on the way to the canvas and not on the way to a render target,
     * so a plain target receives raw linear values — and then every transparent thing on the
     * board (the ring arcs, the grid lines, the glows) blends against a linear backdrop
     * instead of the encoded one it was authored against, and the whole arena comes out
     * about a fifth brighter. Making the buffer itself sRGB does not help either: the
     * hardware then encodes on the way in without decoding on the way out.
     *
     * isXRRenderTarget is the renderer's own switch for "this target is a screen": the
     * shaders encode to the texture's colour space as they would for the canvas, and the
     * buffer is forced to a plain format so the hardware does not encode a second time.
     * Blending, precision and colour then match the direct path exactly, and the pass that
     * follows is left to do nothing but smooth edges.
     */
    const fxTarget = useFxaa
      ? new THREE.WebGLRenderTarget(1, 1, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
          colorSpace: THREE.SRGBColorSpace,
          depthBuffer: true,
          stencilBuffer: false,
        })
      : null;
    if (fxTarget) (fxTarget as any).isXRRenderTarget = true;
    /*
     * FXAA does two things: it smooths edges, and it blends whole pixels toward their
     * neighbours wherever detail is finer than a pixel. The second is what softens type —
     * a glyph stem is exactly that kind of detail — so it is turned down by half while the
     * edge work, which is what the pass is for, is left alone.
     */
    const fxFrag = FXAAShader.fragmentShader.replace(
      'float _SubpixelBlending = 1.0;',
      'float _SubpixelBlending = 0.5;',
    );
    const fxMat = useFxaa
      ? new THREE.ShaderMaterial({
          uniforms: THREE.UniformsUtils.clone(FXAAShader.uniforms),
          vertexShader: FXAAShader.vertexShader,
          fragmentShader: fxFrag,
          depthTest: false,
          depthWrite: false,
        })
      : null;
    const fxScene = new THREE.Scene();
    const fxCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    if (fxMat) fxScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fxMat));

    /** Size the offscreen buffer to the drawing buffer, and tell FXAA the texel size. */
    const sizeFx = () => {
      if (!fxTarget || !fxMat) return;
      const dp = new THREE.Vector2();
      renderer.getDrawingBufferSize(dp);
      fxTarget.setSize(Math.max(1, dp.x), Math.max(1, dp.y));
      (fxMat.uniforms as any).tDiffuse.value = fxTarget.texture;
      (fxMat.uniforms as any).resolution.value.set(1 / Math.max(1, dp.x), 1 / Math.max(1, dp.y));
    };
    sizeFx();

    /*
     * The two paths, on one frame. Comparing screenshots of two separate matches cannot
     * answer whether the pass changes the picture — a spotlight or a different opening hand
     * moves the average far more than a colour-space slip does. This draws the board through
     * the pass and then straight to the canvas without letting anything else advance, and
     * reads the same rectangle back from both.
     */
    if (import.meta.env.VITE_TEST_HOOK) {
      (window as any).__fxaa = {
        on: useFxaa,
        compare: () => {
          if (!fxTarget) return null;
          const dp = new THREE.Vector2();
          renderer.getDrawingBufferSize(dp);
          const w = Math.min(400, Math.floor(dp.x * 0.25));
          const h = Math.min(400, Math.floor(dp.y * 0.35));
          const x = Math.floor(dp.x * 0.05);
          const y = Math.floor(dp.y * 0.45);
          const gl = renderer.getContext();
          const read = () => {
            const b = new Uint8Array(w * h * 4);
            gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b);
            const s = [0, 0, 0];
            for (let i = 0; i < b.length; i += 4) { s[0] += b[i]; s[1] += b[i + 1]; s[2] += b[i + 2]; }
            return s.map((v) => +(v / (w * h)).toFixed(3));
          };
          renderer.setRenderTarget(fxTarget);
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);
          renderer.render(fxScene, fxCam);
          const viaPass = read();
          renderer.setRenderTarget(null);
          renderer.render(scene, camera);
          const direct = read();
          return { viaPass, direct };
        },
      };
    }

    // 4. Lights
    // Toon shading wants a clear key direction and a bright fill, so surfaces land
    // decisively in one band of the ramp rather than smearing between them.
    // Colourless by design: one white key, a cooler white rim, and a soft fill, so the
    // whole scene lands in greys and the cards are the only colour on screen.
    const ambient = new THREE.AmbientLight(0xe8ecf4, 1.5);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(6, -8, 16);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc8d2e4, 1.25);
    rimLight.position.set(-8, 12, 6);
    scene.add(rimLight);

    const bounce = new THREE.PointLight(0xdfe6f2, 1.3, 26);
    bounce.position.set(0, -2, 6);
    scene.add(bounce);

    /*
     * The lights live on both layers. The tutorial's second pass renders only the layer it
     * has lit, and a lit object with no light on that layer comes out black — which is a
     * spotlight that turns its subject off.
     */
    for (const l of [ambient, keyLight, rimLight, bounce]) l.layers.enable(SPOT_LAYER);

    /*
     * The sheet of dark the tutorial lays over the board: one screen-filling quad in its
     * own tiny scene, drawn between the two passes.
     */
    const dimScene = new THREE.Scene();
    // Camera pulled back off the quad: at zero distance the near plane clips it away.
    const dimCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    dimCam.position.z = 1;
    dimScene.add(new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      /*
       * A veil, not a blackout. The board has to stay legible underneath — a player being
       * shown where the hand is still needs to see that there is a table, an opponent and a
       * row of lands around it. What the light does is put one thing back to full strength,
       * not delete the rest of the game.
       */
      new THREE.MeshBasicMaterial({
        color: 0x03030a, transparent: true, opacity: 0.72, depthTest: false, depthWrite: false,
      }),
    ));

    // Spell lights, parked and dark until an effect borrows one. They exist from the
    // first frame so the shader programs are compiled once, at load, and never again.
    lightPoolRef.current = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 12, 2);
      l.position.set(0, 0, -40);
      scene.add(l);
      lightPoolRef.current.push({ light: l, busy: false });
    }

    // 5. Game Board Grid & Zones
    const boardGroup = new THREE.Group();
    boardGroup.renderOrder = 0;

    // Floor
    // The table is glass over the station deck: dark, seeing through to the structure
    // below, and edged in white so it reads as a defined surface rather than a shadow.
    const floorGeom = new THREE.PlaneGeometry(22, 18);
    const floorMat = toonMat(0x0d0f14, { transparent: true, opacity: 0.62 });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.receiveShadow = true;
    boardGroup.add(floorMesh);

    const floorEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(floorGeom),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }),
    );
    floorEdge.position.z = 0.015;
    boardGroup.add(floorEdge);
    // A second, inset line, the way a real table has a rail.
    const floorInner = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(21.4, 17.4)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32 }),
    );
    floorInner.position.z = 0.016;
    boardGroup.add(floorInner);

    // Zones
    const createZoneBox = (x: number, y: number, w: number, h: number, colorHex: number) => {
      const boxGeom = new THREE.PlaneGeometry(w, h);
      const edges = new THREE.EdgesGeometry(boxGeom);
      const lineMat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.4 });
      const line = new THREE.LineSegments(edges, lineMat);
      line.position.set(x, y, 0.02);
      boardGroup.add(line);
    };

    createZoneBox(0, -0.6, 14, 3.0, 0xffffff); // Player creatures
    createZoneBox(0, -3.8, 14, 2.4, 0x888888); // Player lands
    createZoneBox(0, 2.8, 14, 3.0, 0xffffff);  // Opponent creatures
    createZoneBox(0, 6.2, 14, 2.4, 0x888888);  // Opponent lands

    scene.add(boardGroup);

    // 6. Interactables Group (3D Buttons, Deck, Graveyard)
    const interactablesGroup = new THREE.Group();
    interactablesGroup.renderOrder = 10;
    scene.add(interactablesGroup);
    interactablesGroupRef.current = interactablesGroup;

    // -------------------------------------------------------------
    // CREATE 3D END TURN BUTTON (Right side: X=9.0, Y=1.2)
    // -------------------------------------------------------------
    const buttonGroup = new THREE.Group();
    buttonGroup.name = 'endTurnButton';
    buttonGroup.position.set(9.0, 1.2, 0.15);

    const baseGeom = new THREE.CylinderGeometry(1.0, 1.15, 0.25, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.8 });
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    baseMesh.rotation.x = Math.PI / 2;
    buttonGroup.add(baseMesh);

    const ringGeom = new THREE.TorusGeometry(1.05, 0.05, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.name = 'buttonRing';
    buttonGroup.add(ringMesh);

    const capGeom = new THREE.CylinderGeometry(0.85, 0.85, 0.25, 32);
    const btnTex = createButtonCanvasTexture(primaryEnabled, primaryLabel);
    const capMatSide = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    const capMatTop = new THREE.MeshBasicMaterial({ map: btnTex });
    const capMesh = new THREE.Mesh(capGeom, [capMatSide, capMatTop, capMatSide]);
    capMesh.name = 'buttonCap';
    capMesh.rotation.x = Math.PI / 2;
    capMesh.position.z = 0.1;
    buttonGroup.add(capMesh);

    interactablesGroup.add(buttonGroup);
    endTurnButtonRef.current = buttonGroup;
    buttonCapMatRef.current = capMatTop;

    // -------------------------------------------------------------
    // ARENA
    // A duelling floor sunk into a ruined hall: tiered stone, a colonnade on all
    // four sides, braziers, banners, corner statues and drifting embers. Everything
    // is procedural geometry — the build ships as one file with no fetched assets.
    // -------------------------------------------------------------
    const arena = new THREE.Group();
    arena.name = 'arena';

    // Four greys and one near-white are the whole palette; nothing here has a hue.
    const stone = toonMat(0x6a6e78);
    const stoneDark = toonMat(0x33363d);
    const gold = toonMat(0x9aa0ac);
    const goldLit = toonMat(0xd8dde6);
    const hull = toonMat(0x4a4e57);
    const hullDark = toonMat(0x1e2026);
    /** Emissive white, used for every light line and core in the station. */
    const lumen = (opacity = 1) =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });

    /** Repeats a builder around the four sides of the arena. */
    const ring = (
      count: number, radiusX: number, radiusY: number, build: (i: number, x: number, y: number) => THREE.Object3D,
    ) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.PI / count;
        arena.add(build(i, Math.cos(a) * radiusX, Math.sin(a) * radiusY));
      }
    };

    // The whole deck assembly turns very slowly, which is only legible because of the
    // panel joins and seams cut into it.
    const deckRing = new THREE.Group();
    deckRing.name = 'deckRing';
    arena.add(deckRing);

    // ---- tiered decks stepping down to the play surface, in dark plating
    for (let step = 0; step < 3; step++) {
      const inner = 12.6 + step * 2.6;
      const tier = new THREE.Mesh(
        new THREE.RingGeometry(inner, inner + 2.4, 96),
        step % 2 ? hullDark : hull,
      );
      tier.position.z = -0.4 - step * 0.55;
      deckRing.add(tier);

      // riser wall between decks, so the tiers read as solid structure
      const riser = new THREE.Mesh(
        new THREE.CylinderGeometry(inner, inner, 0.55, 96, 1, true),
        hullDark,
      );
      riser.rotation.x = Math.PI / 2;
      riser.position.z = -0.4 - step * 0.55 + 0.275;
      deckRing.add(riser);

      // A lit seam along each deck edge, and radial panel joins across it.
      const seam = new THREE.Mesh(new THREE.RingGeometry(inner + 2.32, inner + 2.4, 96), lumen(0.5));
      seam.position.z = -0.38 - step * 0.55;
      deckRing.add(seam);
      /*
       * Panel joins are cut, not painted: each is a shallow box sunk into the deck, so the
       * groove has walls and a floor and takes the light differently from the plate around
       * it. Every fourth one carries a lit strip along its bottom.
       */
      for (let j = 0; j < 28; j++) {
        const a = (j / 28) * Math.PI * 2;
        const groove = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.09, 0.12), stoneDark);
        groove.position.set(
          Math.cos(a) * (inner + 1.3), Math.sin(a) * (inner + 1.3), -0.44 - step * 0.55,
        );
        groove.rotation.z = a;
        deckRing.add(groove);
        if (j % 4 === 0) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.04, 0.02), lumen(0.5));
          strip.position.set(
            Math.cos(a) * (inner + 1.3), Math.sin(a) * (inner + 1.3), -0.4 - step * 0.55,
          );
          strip.rotation.z = a;
          deckRing.add(strip);
        }
        /*
         * A raised plate on every other groove. A perfectly round ring cannot show that it
         * is turning — the relief is what carries the light around with it, so the deck
         * brightens and darkens as it goes.
         */
        if (j % 2 === 0) {
          const plate = new THREE.Mesh(
            new THREE.BoxGeometry(1.85, 0.62, 0.1),
            toonMat(j % 4 === 0 ? 0x565a64 : 0x3f434b, { flatShading: true }),
          );
          plate.position.set(
            Math.cos(a) * (inner + 1.3), Math.sin(a) * (inner + 1.3), -0.34 - step * 0.55,
          );
          plate.rotation.z = a;
          plate.rotation.y = 0.12;
          deckRing.add(plate);
        }

        // Recessed bolt pockets along the outer edge, with a proud head inside.
        if (j % 7 === 0) {
          const pocket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 10), stoneDark);
          pocket.rotation.x = Math.PI / 2;
          pocket.position.set(
            Math.cos(a) * (inner + 2.15), Math.sin(a) * (inner + 2.15), -0.45 - step * 0.55,
          );
          deckRing.add(pocket);
          const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 8), gold);
          bolt.rotation.x = Math.PI / 2;
          bolt.position.set(
            Math.cos(a) * (inner + 2.15), Math.sin(a) * (inner + 2.15), -0.41 - step * 0.55,
          );
          deckRing.add(bolt);
        }
      }
    }

    // ---- containment ring around the play surface: one bright line, not a band
    const inlay = new THREE.Mesh(new THREE.RingGeometry(12.42, 12.6, 96), lumen(0.85));
    inlay.position.z = -0.33;
    arena.add(inlay);
    const inlayBed = new THREE.Mesh(new THREE.RingGeometry(12.0, 12.6, 96), stoneDark);
    inlayBed.position.z = -0.35;
    arena.add(inlayBed);

    /**
     * A mast from the station's outer ring: a segmented tower of hull plating, greebled
     * with vents and conduits, carrying a gyroscope of counter-rotating rings around a
     * white core. It replaces the old brazier column — same footprint, so the arena
     * silhouette and every card position are untouched.
     */
    const mast = (x: number, y: number, height: number, phase: number) => {
      const g = new THREE.Group();
      g.position.set(x, y, -0.3);

      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.42), hullDark);
      plinth.position.z = 0.21;
      g.add(plinth);
      // Anchor bolts around the plinth.
      for (let b = 0; b < 4; b++) {
        const a = (b / 4) * Math.PI * 2 + Math.PI / 4;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 6), gold);
        bolt.rotation.x = Math.PI / 2;
        bolt.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.48);
        g.add(bolt);
      }

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.8, 0.28, 8), hull);
      collar.rotation.x = Math.PI / 2;
      collar.position.z = 0.56;
      g.add(collar);

      // The shaft is built in segments so the joints catch the light separately.
      const segs = 4;
      for (let s = 0; s < segs; s++) {
        const h = height / segs;
        const r0 = 0.46 - s * 0.05;
        // Six flat faces rather than a smooth tube: as the mast turns, each face swings
        // through the key light in turn, so the tower visibly brightens and darkens.
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(r0, r0 + 0.05, h * 0.86, 6),
          toonMat(0x4a4e57, { flatShading: true }),
        );
        seg.rotation.x = Math.PI / 2;
        seg.rotation.y = s * 0.26;
        seg.position.z = 0.7 + h * (s + 0.5);
        g.add(withOutline(seg, 0.025));

        // An off-centre fin, so the silhouette itself changes as it rotates.
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, r0 * 1.5, h * 0.5),
          toonMat(0x33363d, { flatShading: true }),
        );
        fin.position.set(0, r0 * 0.85, 0.7 + h * (s + 0.5));
        g.add(fin);

        const joint = new THREE.Mesh(new THREE.CylinderGeometry(r0 + 0.11, r0 + 0.11, h * 0.1, 8), stoneDark);
        joint.rotation.x = Math.PI / 2;
        joint.position.z = 0.7 + h * (s + 0.95);
        g.add(joint);

        // Conduit strips running up two faces of each segment.
        for (const side of [-1, 1]) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, h * 0.7), lumen(0.5));
          strip.position.set(side * (r0 + 0.03), 0, 0.7 + h * (s + 0.5));
          g.add(strip);
        }
      }

      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.56, 0.4, 8), stone);
      head.rotation.x = Math.PI / 2;
      head.position.z = 0.7 + height + 0.2;
      g.add(withOutline(head, 0.03));

      // Gyroscope: two rings on different axes, spun in the frame loop.
      const gyro = new THREE.Group();
      gyro.position.z = 0.7 + height + 1.05;
      gyro.name = 'gyro';
      const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 28), goldLit);
      ringA.name = 'gyroA';
      gyro.add(ringA);
      const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.03, 6, 24), gold);
      ringB.rotation.x = Math.PI / 2;
      ringB.name = 'gyroB';
      gyro.add(ringB);
      g.add(gyro);

      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), lumen(0.9));
      core.position.z = 0.7 + height + 1.05;
      core.name = 'core';
      core.userData.phase = phase;
      g.add(core);

      /*
       * The pool of light each core throws.
       *
       * These fourteen are, measured, the most expensive thing on the board: a light is not
       * a local cost, three compiles the whole list into every lit material and every shaded
       * pixel walks all of it, so the phone evaluates twenty-two lights across two and a
       * half million pixels every frame. Taking them off the phone was tried, twice, and it
       * is not free: the arena comes back visibly darker — the ring plating either side of
       * the table loses its grey — and lifting the masts' own materials to compensate did
       * not bring it back. So they stay, and the board looks the way it looks. Baking their
       * contribution into the geometry is the way to have both, and is its own piece of work.
       */
      const glow = new THREE.PointLight(0xdfe8ff, 1.5, 13, 2);
      glow.position.set(0, 0, 0.7 + height + 1.05);
      glow.name = 'coreLight';
      g.add(glow);

      return g;
    };

    // The same fourteen positions as before, so nothing on the board shifts. Each is
    // tagged so the frame loop can turn it slowly about its own axis.
    ring(14, 19.5, 17.5, (i, x, y) => {
      const m = mast(x, y, y > 2 ? 5.2 : 4.0, i * 0.7);
      m.name = 'mast';
      m.userData.spin = 0.09 + (i % 5) * 0.024;
      return m;
    });

    // ---- span trusses arcing between neighbouring masts
    ring(14, 19.5, 17.5, (i, x, y) => {
      const a = (i / 14) * Math.PI * 2 + Math.PI / 14;
      const g = new THREE.Group();
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.11, 6, 20, Math.PI), hull);
      g.add(withOutline(arch, 0.04));
      // A light line follows the truss, so the ring of the station reads at a glance.
      const lit = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.028, 6, 20, Math.PI), lumen(0.42));
      g.add(lit);
      // Cross-bracing under the arc.
      for (let b = 1; b < 4; b++) {
        const t = (b / 4) * Math.PI;
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.55), stoneDark);
        strut.position.set(Math.cos(t) * 1.5, Math.sin(t) * 1.5 - 0.28, 0);
        strut.rotation.z = t;
        g.add(strut);
      }
      g.position.set(x, y, y > 2 ? 5.9 : 4.7);
      g.rotation.z = a - Math.PI / 2;
      g.rotation.x = Math.PI / 2;
      return g;
    });

    /** A hanging standard, now a projected panel that ripples on its rail. */
    const banner = (x: number, y: number, colour: number, tag: string) => {
      const g = new THREE.Group();
      const cloth = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 3.4, 4, 10),
        toonMat(colour, { side: THREE.DoubleSide, transparent: true, opacity: 0.94 }),
      );
      cloth.name = 'cloth';
      g.add(cloth);

      const hem = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.16), gold);
      hem.position.y = -1.7;
      g.add(hem);

      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), gold);
      rod.rotation.z = Math.PI / 2;
      rod.position.y = 1.75;
      g.add(rod);

      g.position.set(x, y, 3.2);
      g.rotation.x = Math.PI / 2.05;
      g.name = tag;
      return g;
    };

    // Both pairs are the same white now; the sides are told apart by the HUD, not here.
    for (const [bx, by] of [[-18.0, -2.5], [-18.0, 5.5], [18.0, -2.5], [18.0, 5.5]] as [number, number][]) {
      arena.add(banner(bx, by, 0xb9c0cc, 'banner'));
    }

    /**
     * A sentinel obelisk: a faceted monolith on a stepped base, ringed by a slowly
     * turning armillary and lit from within. Two of them flank the far end.
     */
    const sentinel = (x: number, y: number, facing: number) => {
      const g = new THREE.Group();
      g.position.set(x, y, -0.3);
      g.rotation.z = facing;

      const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.1, 0.9), hullDark);
      base.position.z = 0.45;
      g.add(base);
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 0.34), hull);
      step.position.z = 1.05;
      g.add(step);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.84, 1.84, 0.05), lumen(0.55));
      trim.position.z = 1.24;
      g.add(trim);

      // The monolith itself: an eight-sided shard, wider at the base.
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.62, 3.2, 8), stone);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.z = 2.85;
      g.add(withOutline(shaft, 0.03));

      // Inset panels down two faces.
      for (const side of [-1, 1]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 2.2), stoneDark);
        panel.position.set(side * 0.44, 0, 2.85);
        g.add(panel);
        const litLine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 1.9), lumen(0.6));
        litLine.position.set(side * 0.47, 0, 2.85);
        g.add(litLine);
      }

      const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), goldLit);
      cap.position.z = 4.7;
      g.add(withOutline(cap, 0.03));

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), lumen(0.95));
      eye.position.z = 4.7;
      eye.name = 'core';
      eye.userData.phase = facing * 3;
      g.add(eye);

      // Armillary: three rings on different axes, turning at their own rates.
      const arm = new THREE.Group();
      arm.position.z = 4.7;
      arm.name = 'armillary';
      [
        [0.95, 0, 0],
        [0.78, Math.PI / 2, 0],
        [0.6, 0, Math.PI / 2],
      ].forEach(([r, rx, ry], i) => {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 6, 30), gold);
        hoop.rotation.set(rx, ry, 0);
        hoop.name = `hoop${i}`;
        arm.add(hoop);
      });
      g.add(arm);

      return g;
    };

    arena.add(sentinel(-16.0, 12.5, -0.7));
    arena.add(sentinel(16.0, 12.5, 0.7));

    /**
     * Free-floating debris: slabs of hull and rock adrift beyond the ring, each turning
     * on its own axis. They sit well outside the play area, so they add depth without
     * ever overlapping a card.
     */
    const debrisSeeds: [number, number, number, number][] = [
      [-24, -6, 6.5, 1.1], [-22, 14, 9.0, 0.8], [24, 2, 7.5, 1.3],
      [21, 17, 11.0, 0.9], [-14, 22, 8.0, 1.0], [12, 24, 10.0, 0.7],
      [-27, 8, 4.0, 1.5], [27, 11, 5.0, 1.2],
    ];
    debrisSeeds.forEach(([dx, dy, dz, s], i) => {
      const g = new THREE.Group();
      g.position.set(dx, dy, dz);
      g.name = 'debris';
      g.userData.spin = 0.06 + (i % 3) * 0.035;
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * s, 0), hull);
      g.add(withOutline(rock, 0.04));
      // A broken plate bolted to one face, to read as wreckage rather than a boulder.
      const plate = new THREE.Mesh(new THREE.BoxGeometry(1.5 * s, 0.12 * s, 0.9 * s), stoneDark);
      plate.position.set(0.3 * s, 0.5 * s, 0.2 * s);
      plate.rotation.z = 0.4;
      g.add(plate);
      const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 2.2 * s, 6), gold);
      spar.rotation.z = 1.1;
      g.add(spar);
      arena.add(g);
    });

    /**
     * Star layers. Two shells of points at different sizes and one tilted disc give the
     * background parallax as they turn: fine grain far out, brighter grains nearer, and
     * a galactic band edge-on behind the arena.
     */
    const starShell = (count: number, radius: number, size: number, opacity: number, tag: string) => {
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        // Even spread over a sphere, then pushed out to a shell of varying thickness.
        const u = Math.random() * 2 - 1;
        const t = Math.random() * Math.PI * 2;
        const r = radius * (0.85 + Math.random() * 0.3);
        const s = Math.sqrt(1 - u * u);
        pos[i * 3] = Math.cos(t) * s * r;
        pos[i * 3 + 1] = Math.sin(t) * s * r;
        pos[i * 3 + 2] = u * r * 0.55 + 6;
      }
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(
        geom,
        new THREE.PointsMaterial({
          color: 0xffffff, size, transparent: true, opacity, map: particleDot(),
          depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
        }),
      );
      pts.name = tag;
      return pts;
    };
    arena.add(starShell(1400, 62, 0.13, 0.75, 'starsFar'));
    arena.add(starShell(420, 44, 0.22, 0.9, 'starsNear'));

    // Galactic band: a flattened disc of points, tilted and turning very slowly.
    const bandCount = 900;
    const bandGeom = new THREE.BufferGeometry();
    const bandPos = new Float32Array(bandCount * 3);
    for (let i = 0; i < bandCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 30 + Math.pow(Math.random(), 0.6) * 34;
      bandPos[i * 3] = Math.cos(a) * r;
      bandPos[i * 3 + 1] = Math.sin(a) * r * 0.24;
      bandPos[i * 3 + 2] = (Math.random() - 0.5) * 3.5;
    }
    bandGeom.setAttribute('position', new THREE.BufferAttribute(bandPos, 3));
    const band = new THREE.Points(
      bandGeom,
      new THREE.PointsMaterial({
        color: 0xffffff, size: 0.17, transparent: true, opacity: 0.5, map: particleDot(),
        depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    band.position.set(0, 26, 16);
    band.rotation.set(1.25, 0.2, 0.35);
    band.name = 'band';
    arena.add(band);

    /*
     * A ringed world low behind the station. It is the one large shape in the sky, so it
     * carries the sense of place: banded surface, a tilted ring split into three lanes,
     * and a pale terminator where the key light falls away.
     */
    const world = new THREE.Group();
    world.position.set(-24, 36, -20);
    world.name = 'world';
    const globe = new THREE.Mesh(new THREE.SphereGeometry(11.5, 48, 32), toonMat(0x8d939e));
    world.add(globe);
    // Latitude bands, slightly proud of the surface so they catch the ramp differently.
    for (let b = 0; b < 7; b++) {
      const t = (b + 1) / 8;
      const r = Math.sin(t * Math.PI) * 11.55;
      const bandRing = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.16 + (b % 2) * 0.1, 6, 64),
        toonMat(b % 2 ? 0x767c87 : 0xa8aeb8),
      );
      bandRing.rotation.x = Math.PI / 2;
      bandRing.position.y = Math.cos(t * Math.PI) * 11.5;
      world.add(bandRing);
    }
    const halo = new THREE.Mesh(new THREE.SphereGeometry(12.1, 32, 20), lumen(0.07));
    world.add(halo);
    for (const [rr2, thick, op] of [[16.5, 0.9, 0.5], [18.4, 0.55, 0.34], [20.0, 0.32, 0.22]] as const) {
      const lane = new THREE.Mesh(
        new THREE.TorusGeometry(rr2, thick, 2, 96),
        new THREE.MeshBasicMaterial({
          color: 0xd6dbe4, transparent: true, opacity: op,
          side: THREE.DoubleSide, depthWrite: false,
        }),
      );
      lane.rotation.set(1.15, 0.35, 0);
      lane.scale.z = 0.04;
      world.add(lane);
    }
    arena.add(world);

    /*
     * Moons on tilted orbits, each at its own distance and speed, plus a fine belt of rubble
     * orbiting inside the rings. They are children of the world, so they travel with it.
     */
    const moons = new THREE.Group();
    moons.name = 'moons';
    ([[1.5, 17, 0.10, 0xb6bcc7], [0.95, 22, 0.07, 0x8f959f], [0.6, 26.5, 0.05, 0xd4d9e2]] as
      [number, number, number, number][]).forEach(([r, rad, speed, col]) => {
      const m = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r, 1),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, metalness: 0.1, flatShading: true }),
      );
      m.userData.radius = rad;
      m.userData.speed = speed;
      moons.add(m);
    });
    world.add(moons);

    const beltCount = 700;
    const beltGeo = new THREE.BufferGeometry();
    const beltPos = new Float32Array(beltCount * 3);
    for (let i = 0; i < beltCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 16.5 + Math.random() * 4.2;
      beltPos[i * 3] = Math.cos(a) * r;
      beltPos[i * 3 + 1] = Math.sin(a) * r;
      beltPos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    beltGeo.setAttribute('position', new THREE.BufferAttribute(beltPos, 3));
    const belt = new THREE.Points(
      beltGeo,
      new THREE.PointsMaterial({
        color: 0xdfe4ec, size: 0.24, map: particleDot(), transparent: true, opacity: 0.65,
        depthWrite: false, sizeAttenuation: true,
      }),
    );
    belt.name = 'belt';
    belt.rotation.set(1.15, 0.35, 0);
    belt.scale.z = 0.04;
    world.add(belt);

    /*
     * A derelict outpost turning end over end far behind the arena: a habitation ring on
     * spokes, in polished metal so it catches the horizon band as it goes round.
     */
    const outpost = new THREE.Group();
    outpost.name = 'outpost';
    outpost.position.set(34, 30, -26);
    const opRing = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.55, 10, 40), hull);
    outpost.add(opRing);
    const opRail = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.14, 6, 40), goldLit);
    outpost.add(opRail);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.34, 0.34), hullDark);
      spoke.position.set(Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0);
      spoke.rotation.z = a;
      outpost.add(spoke);
    }
    const hubCore = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.8, 12), stone);
    hubCore.rotation.x = Math.PI / 2;
    outpost.add(hubCore);
    outpost.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), lumen(0.9)));
    arena.add(outpost);

    /** Distant towers on the far rim, purely silhouette, to give the horizon a skyline. */
    ([[-38, 34, 2.4, 9], [-30, 38, 1.8, 6.5], [26, 35, 2.2, 8], [36, 31, 1.6, 5.5], [6, 40, 2.0, 7]] as
      [number, number, number, number][]).forEach(([tx, ty, tw, th]) => {
      const g = new THREE.Group();
      // Far side of the station, and well below the deck plane, so they read as a skyline
      // along the horizon rather than towers standing on the arena floor.
      g.position.set(tx, ty, -24);
      const body = new THREE.Mesh(new THREE.BoxGeometry(tw, tw, th), hullDark);
      body.position.z = th / 2;
      g.add(body);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(tw * 0.1, tw * 0.42, th * 0.22, 6), hull);
      crown.rotation.x = Math.PI / 2;
      crown.position.z = th * 1.06;
      g.add(crown);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(tw * 0.12, 8, 6), lumen(0.8));
      beacon.position.z = th * 1.2;
      beacon.name = 'core';
      beacon.userData.phase = tx;
      g.add(beacon);
      arena.add(g);
    });

    /** Grey nebula veils: soft radial gradients drifting at different rates. */
    const nebulaTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g2 = c.getContext('2d')!;
      const grad = g2.createRadialGradient(128, 128, 8, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255,255,255,0.5)');
      grad.addColorStop(0.35, 'rgba(200,208,222,0.18)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g2.fillStyle = grad;
      g2.fillRect(0, 0, 256, 256);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    ([[-30, 30, 20, 26], [26, 34, 14, 20], [0, 40, 26, 34]] as [number, number, number, number][])
      .forEach(([nx, ny, nz, size], i) => {
        const veil = new THREE.Mesh(
          new THREE.PlaneGeometry(size, size * 0.7),
          new THREE.MeshBasicMaterial({
            map: nebulaTex, transparent: true, opacity: 0.3,
            blending: THREE.AdditiveBlending, depthWrite: false,
          }),
        );
        veil.position.set(nx, ny, nz);
        veil.rotation.x = -0.5;
        veil.name = 'nebula';
        veil.userData.drift = 0.02 + i * 0.012;
        arena.add(veil);
      });

    // ---- drifting stardust, to keep the air alive
    const emberCount = 220;
    const emberGeom = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    const emberSeed = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      // Out over the decks and behind the board only. The near side is where the hand
      // fans out, and dust drifting across the cards read as snow on the artwork.
      const ea = Math.random() * Math.PI * 2;
      const er = 15 + Math.random() * 13;
      const ey = Math.sin(ea) * er;
      emberPos[i * 3] = Math.cos(ea) * er;
      emberPos[i * 3 + 1] = Math.abs(ey) + 3;
      emberPos[i * 3 + 2] = 1.5 + Math.random() * 11;
      emberSeed[i] = Math.random() * Math.PI * 2;
    }
    emberGeom.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    const embers = new THREE.Points(
      emberGeom,
      new THREE.PointsMaterial({
        color: 0xffffff, size: 0.075, transparent: true, opacity: 0.6, map: particleDot(),
        depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    embers.name = 'embers';
    embers.userData.seed = emberSeed;
    arena.add(embers);

    /*
     * ---- the megastructure, and the living sky behind it -----------------------
     *
     * Everything below is scenery: named children of the arena, animated by name in
     * the frame loop the way the masts and the planet already are. Same palette,
     * same toon ramp — the sky gets bigger and busier, not more colourful.
     */

    // Two great gyres: tilted rings of the station far larger than the deck itself,
    // turning against each other. Teeth and lamps ride them, which is what makes the
    // turning legible at this distance.
    /*
     * Placement note: the camera sits low and looks down at the table, so the visible sky
     * is a shallow band above the far rim — and "far and high" in world terms means large
     * +y with strongly negative z, which is where the planet has always lived. Anything
     * hung at positive z ends up above the top of the frame.
     */
    const gyreSpec = [
      { pos: [30, 55, -26] as const, tilt: [1.05, 0.25] as const, r: 13, spin: 0.085 },
      { pos: [-6, 66, -34] as const, tilt: [1.3, -0.3] as const, r: 19, spin: -0.05 },
    ];
    for (const g of gyreSpec) {
      const holder = new THREE.Group();
      holder.name = 'gyre';
      holder.position.set(g.pos[0], g.pos[1], g.pos[2]);
      holder.rotation.x = g.tilt[0];
      holder.rotation.y = g.tilt[1];
      holder.userData.spin = g.spin;
      const spinner = new THREE.Group();
      spinner.name = 'spinner';
      spinner.add(new THREE.Mesh(new THREE.TorusGeometry(g.r, 0.32, 8, 72), hullDark));
      spinner.add(new THREE.Mesh(new THREE.TorusGeometry(g.r + 0.6, 0.08, 6, 72), stoneDark));
      for (let i = 0; i < 18; i++) {
        const ta = (i / 18) * Math.PI * 2;
        const tooth = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 1.7, 0.5),
          i % 3 ? stoneDark : hullDark,
        );
        tooth.position.set(Math.cos(ta) * g.r, Math.sin(ta) * g.r, 0);
        tooth.rotation.z = ta;
        spinner.add(tooth);
        if (i % 3 === 0) {
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), lumen(0.85));
          lamp.position.set(Math.cos(ta) * (g.r - 0.95), Math.sin(ta) * (g.r - 0.95), 0);
          spinner.add(lamp);
        }
      }
      holder.add(spinner);
      arena.add(holder);
    }

    // Shuttles: small craft on tight laps just outside the decks, nose to the wind.
    for (let i = 0; i < 4; i++) {
      const shuttle = new THREE.Group();
      shuttle.name = 'shuttle';
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.14), stone);
      shuttle.add(body);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), lumen(0.9));
      lamp.position.x = -0.32;
      shuttle.add(lamp);
      shuttle.userData = {
        r: 20.8 + i * 1.15,
        h: 1.6 + (i % 2) * 2.2,
        speed: (0.16 + 0.05 * i) * (i % 2 ? -1 : 1),
        phase: i * 1.9,
      };
      arena.add(shuttle);
    }

    // A comet, every half minute or so: a bright head and a crossed-plane tail so it
    // reads from any angle, gone again in under three seconds.
    const comet = new THREE.Group();
    comet.name = 'comet';
    comet.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), lumen(0.95)));
    const tailMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    for (const rx of [0, Math.PI / 2]) {
      const tail = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.42), tailMat);
      tail.position.x = 4.6;
      tail.rotation.x = rx;
      comet.add(tail);
    }
    comet.visible = false;
    comet.userData = { period: 31, active: 2.8, from: [-55, 52, -6], to: [45, 40, -30] };
    arena.add(comet);

    // Two moons on a tilted ellipse around the planet, passing in front and behind.
    const moonSpec = [
      { r: 15, size: 1.05, speed: 0.045, phase: 1.2, m: stone },
      { r: 19.5, size: 0.62, speed: -0.03, phase: 4.4, m: stoneDark },
    ];
    for (const mo of moonSpec) {
      const moon = new THREE.Mesh(
        new THREE.IcosahedronGeometry(mo.size, 1),
        mo.m,
      );
      moon.name = 'moon';
      moon.userData = { ...mo, cx: -24, cy: 36, cz: -20 };
      arena.add(moon);
    }

    // A loose belt of rock, tumbling far off the right shoulder of the board.
    const rockBelt = new THREE.Group();
    rockBelt.name = 'rockBelt';
    rockBelt.position.set(34, 38, -16);
    let beltSeed = 0x51ed270;
    const beltRnd = () => {
      beltSeed = (beltSeed * 1664525 + 1013904223) >>> 0;
      return beltSeed / 0xffffffff;
    };
    for (let i = 0; i < 7; i++) {
      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.6 + beltRnd() * 1.1, 0),
        i % 2 ? stoneDark : toonMat(0x4a4d55, { flatShading: true }),
      );
      rock.position.set(
        (beltRnd() - 0.5) * 18,
        (beltRnd() - 0.5) * 12,
        (beltRnd() - 0.5) * 9,
      );
      rock.rotation.set(beltRnd() * 3, beltRnd() * 3, beltRnd() * 3);
      rockBelt.add(rock);
    }
    arena.add(rockBelt);

    scene.add(arena);
    arenaRef.current = arena;



    // 7. Cards Group & Particles
    const cardsGroup = new THREE.Group();
    cardsGroup.renderOrder = 100;
    scene.add(cardsGroup);
    cardsGroupRef.current = cardsGroup;

    const particlesGroup = new THREE.Group();
    particlesGroup.renderOrder = 20;
    scene.add(particlesGroup);
    particlesGroupRef.current = particlesGroup;

    // Dust particles
    const dustCount = 150;
    const dustGeom = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i++) {
      dustPos[i] = (Math.random() - 0.5) * 30;
    }
    dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.09, transparent: true, opacity: 0.34,
      map: particleDot(), depthWrite: false,
    });
    const dustPoints = new THREE.Points(dustGeom, dustMat);
    particlesGroup.add(dustPoints);

    // Animation Loop
    let animationFrameId: number;
    const clock = clockRef.current;

    let lastTime = clock.getElapsedTime();
    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);
      const loopT0 = import.meta.env.VITE_TEST_HOOK ? performance.now() : 0;
      const time = clock.getElapsedTime();
      // Real elapsed seconds, clamped so a stalled tab cannot fling anything across the
      // board. Anything that decays or eases is scaled by this rather than by frames, so
      // the board behaves the same at 30fps as at 144.
      const dt = Math.min(0.05, Math.max(0.001, time - lastTime));
      lastTime = time;
      const rate = dt * 60;

      /*
       * The descent. A single ease from the establishing shot to the playing seat, driven
       * off wall time so it takes the same 1.9 seconds whatever the frame rate. The look-at
       * target travels with it, or the board would swing rather than settle.
       */
      if (import.meta.env.VITE_TEST_HOOK && cameraRef.current) {
        // Every frame's camera position, and whether the opening still owned it, so a
        // harness can look at the one frame where the two meet.
        const w = window as any;
        (w.__camTrack ??= []).push({
          intro: introRef.current !== null,
          x: +cameraRef.current.position.x.toFixed(4),
          y: +cameraRef.current.position.y.toFixed(4),
          z: +cameraRef.current.position.z.toFixed(4),
        });
        if (w.__camTrack.length > 400) w.__camTrack.shift();
      }
      if (import.meta.env.VITE_TEST_HOOK && introRef.current !== null) {
        const w = window as any;
        if (!w.__intro) w.__intro = { late: Math.round(performance.now() - introRef.current), frames: 0, gaps: [] };
        w.__intro.frames += 1;
        w.__intro.gaps.push(Math.round(performance.now() - (w.__intro.last ?? introRef.current)));
        w.__intro.last = performance.now();
      }
      if (introRef.current !== null && cameraRef.current) {
        /*
         * How far into the shot we are, by whichever of two clocks is further along.
         *
         * The first is drawn time: the same clamped step everything else on the board uses,
         * so a frame that takes a second advances the shot by one step rather than by a
         * second. That is the fix for the opening not appearing the first time in — the
         * first match builds every card face, uploads every texture and compiles the last
         * of the materials while this is running, and on raw wall time that work came
         * straight out of the shot, which was over before it had been drawn twice.
         *
         * The second is wall time against a cap, so that a machine slow enough to stall
         * frame after frame does not leave the player sitting through a two-second move for
         * a minute. Taking the further of the two means the shot is protected from a hitch
         * and still always over within INTRO_WALL_CAP times its length — and because it is
         * a progress rather than a deadline, the camera is never snapped anywhere.
         */
        introRef.current += dt * 1000;
        const wall = performance.now() - introWallRef.current;
        let p = Math.min(
          1,
          Math.max(introRef.current / INTRO_MS, wall / (INTRO_MS * INTRO_WALL_CAP)),
        );
        // Freeze the shot at one moment, so a harness can measure the path it takes.
        if (import.meta.env.VITE_TEST_HOOK && (window as any).__camHold !== undefined) {
          p = Math.min(1, (window as any).__camHold / INTRO_MS);
        }
        introUntilRef.current = time + ((1 - p) * INTRO_MS) / 1000;
        const cam = cameraRef.current;
        const u = introEase(p);
        CAM_PATH.getPoint(u, camShot.current);
        LOOK_PATH.getPoint(u, lookShot.current);
        cam.position.copy(camShot.current);
        cam.lookAt(lookShot.current);

        if (p >= 1) {
          introRef.current = null;
          driftFromRef.current = time;
          if (!introDoneSent.current) { introDoneSent.current = true; onIntroDone?.(); }
        }
      } else if (cameraRef.current) {
        /*
         * Once the board is being played the camera keeps its seat. It drifts, very
         * slightly, on a long slow cycle — not enough to notice as a movement, but enough
         * that the board is not a photograph of one — and it does nothing else. It used to
         * change seats with the turn as well, which turned out to be one idea too many:
         * the board should change hands, not the room.
         */
        const cam = cameraRef.current;
        /*
         * The drift starts from nothing, at the moment the opening handed over.
         *
         * It used to be a sine of the scene clock, which meant that on the first frame after
         * the camera had settled it was already somewhere in its cycle — so the shot ended
         * exactly on the seat and then the very next frame moved it by up to a sixth of a
         * unit. That single frame is the jolt. Measuring the cycle from the handover starts
         * it at zero, and fading its amplitude in over DRIFT_FADE means it starts at zero
         * speed as well: the drift grows out of the landing instead of interrupting it.
         */
        const since = Math.max(0, time - (driftFromRef.current ?? time));
        const ramp = Math.min(1, since / DRIFT_FADE);
        const sway = Math.sin(since * DRIFT_RATE) * ramp;
        const rise = Math.sin(since * DRIFT_RATE * 0.61) * ramp;
        cam.position.set(CAM_TO.x + sway * DRIFT_X, CAM_TO.y, CAM_TO.z + rise * DRIFT_Z);
        cam.lookAt(LOOK_TO.x, LOOK_TO.y, LOOK_TO.z);
      }

      if (import.meta.env.VITE_TEST_HOOK) {
        const probe = (ref: React.RefObject<THREE.Group | null>) => {
          const d = named(ref.current, 'lifeDie') as THREE.Group | undefined;
          const sp = named(d, 'dieBody') as THREE.Group | undefined;
          if (!d || !sp) return null;
          const normals = d.userData.normals as THREE.Vector3[];
          const numbering = d.userData.numbering as number[];
          const dir = (d.userData.faceDir as THREE.Vector3).clone();
          let best = -2;
          let bi = -1;
          normals.forEach((n, i) => {
            const dot = n.clone().applyQuaternion(sp.quaternion).dot(dir);
            if (dot > best) { best = dot; bi = i; }
          });
          return { facing: numbering[bi], dot: Number(best.toFixed(3)), spin: d.userData.spin, hasTarget: !!d.userData.targetQuat };
        };
        (window as any).__canvasDebug = {
          spent: spentMeshesRef.current.length,
          hand: handMeshMapRef.current.size,
          buildMs: Math.round(buildMsRef.current),
          shots: shotsRef.current.length,
          bursts: burstsRef.current.length,
          // The whole point of pooling: this number must never move while a spell plays.
          lights: sceneRef.current
            ? sceneRef.current.children.filter((o) => (o as THREE.Light).isLight).length
            : 0,
          shotsMade: fxTallyRef.current.shots,
          burstsMade: fxTallyRef.current.bursts,
          youDie: probe(playerHudMeshRef),
          foeDie: probe(opponentHudMeshRef),
        };
      }

      // Spells in flight.
      for (let i = shotsRef.current.length - 1; i >= 0; i--) {
        const sh = shotsRef.current[i];
        const k = (time - sh.start) / sh.dur;
        if (k >= 1) {
          if (!sh.landed) {
            sh.landed = true;
            // Full size only where it lands on a player; a creature gets half.
            burstAt(sh.to, sh.colour.getHex(), sh.style,
              sh.toKey.startsWith('hero-') ? 1 : 0.5);
            sh.onLand?.();
          }
          freeLight(sh.lightSlot);
          sh.group.parent?.remove(sh.group);
          sh.head.traverse((o) => {
            const m = o as THREE.Mesh;
            m.geometry?.dispose?.();
            const mat = m.material as THREE.Material | THREE.Material[] | undefined;
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
            else mat?.dispose();
          });
          (sh.trail.material as THREE.Material).dispose();
          sh.trail.geometry.dispose();
          shotsRef.current.splice(i, 1);
          continue;
        }
        /*
         * Re-read the target every frame. A creature dying mid-combat makes the row
         * re-centre, and every card left in it slides — a shot that had captured its
         * target's position at launch would arrive at empty table. Once the card is gone
         * the last known position stands, which is where the blow should land anyway.
         */
        const live = worldOf(sh.toKey);
        if (live) {
          sh.to.copy(live);
          const mid = sh.from.clone().add(sh.to).multiplyScalar(0.5);
          const away = sh.to.clone().sub(sh.from);
          const side = new THREE.Vector3(-away.y, away.x, 0).normalize();
          sh.ctrl = sh.style === 'duel'
            ? mid
                .add(new THREE.Vector3(0, 0, 1.25 + away.length() * 0.1))
                .add(side.multiplyScalar(sh.swing * 0.42 + 0.6))
            : mid
                .add(new THREE.Vector3(0, 0, 3.2 + away.length() * 0.16))
                .add(side.multiplyScalar(sh.swing * 1.1));
        }

        // A bolt eases out of the muzzle and into the target; a duel leaves late and
        // arrives hard, which is what a swing feels like.
        const t = sh.style === 'duel' ? k * k * (2 - k) * (0.6 + k * 0.4) : k * k * (3 - 2 * k);
        const inv = 1 - t;
        const p = new THREE.Vector3()
          .addScaledVector(sh.from, inv * inv)
          .addScaledVector(sh.ctrl, 2 * inv * t)
          .addScaledVector(sh.to, t * t);
        sh.head.position.copy(p);
        if (sh.lightSlot) {
          sh.lightSlot.light.position.copy(p);
          sh.lightSlot.light.intensity = 3.2 * (1 - k * 0.4);
        }
        if (sh.style === 'duel') {
          // Point the rack along its own travel, then spin it about that line.
          const ahead = new THREE.Vector3()
            .addScaledVector(sh.ctrl, 2 * (1 - t))
            .addScaledVector(sh.to, 2 * t)
            .addScaledVector(sh.from, -2 * (1 - t))
            .addScaledVector(sh.ctrl, -2 * t);
          if (ahead.lengthSq() > 1e-6) sh.head.lookAt(p.clone().add(ahead));
          sh.head.rotateZ(time * 26);
          sh.head.scale.setScalar(0.7 + k * 0.75);
          const blades = sh.head as THREE.Group;
          blades.children.forEach((child, ci) => {
            if (ci < 3) child.rotation.z = time * (ci % 2 ? -14 : 18);
          });
        } else {
          const pulse = 1 + Math.sin(time * 40) * 0.12;
          sh.head.scale.setScalar(pulse * (1.25 - k * 0.35));
        }

        // Shift the trail down one slot and write the new head position at the front. A
        // duel's trail is offset perpendicular to travel, so it winds instead of following.
        const attr = sh.trail.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        arr.copyWithin(3, 0, arr.length - 3);
        if (sh.style === 'duel') {
          const dir = sh.to.clone().sub(sh.from).normalize();
          const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
          const w = Math.sin(time * 34) * 0.3;
          arr[0] = p.x + perp.x * w;
          arr[1] = p.y + perp.y * w;
          arr[2] = p.z + Math.cos(time * 34) * 0.3;
        } else {
          arr[0] = p.x;
          arr[1] = p.y;
          arr[2] = p.z;
        }
        attr.needsUpdate = true;
        (sh.trail.material as THREE.PointsMaterial).opacity = 0.85 * (1 - k * 0.35);
      }

      // Detonations.
      for (let i = burstsRef.current.length - 1; i >= 0; i--) {
        const bu = burstsRef.current[i];
        const k = (time - bu.start) / bu.dur;
        if (k >= 1) {
          freeLight(bu.lightSlot);
          bu.points.parent?.remove(bu.points);
          bu.ring.parent?.remove(bu.ring);
          bu.points.geometry.dispose();
          (bu.points.material as THREE.Material).dispose();
          bu.ring.traverse((o) => {
            const m = o as THREE.Mesh;
            m.geometry?.dispose?.();
            const mat = m.material as THREE.Material | undefined;
            mat?.dispose();
          });
          burstsRef.current.splice(i, 1);
          continue;
        }
        const attr = bu.points.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        const step = 0.016;
        for (let j = 0; j < arr.length; j += 3) {
          arr[j] += bu.vel[j] * step;
          arr[j + 1] += bu.vel[j + 1] * step;
          arr[j + 2] += bu.vel[j + 2] * step - 2.6 * step * k;
          bu.vel[j] *= 0.965;
          bu.vel[j + 1] *= 0.965;
          bu.vel[j + 2] *= 0.965;
        }
        attr.needsUpdate = true;
        (bu.points.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - k * 1.15);
        if (bu.style === 'duel') {
          /*
           * The cut opens rather than expanding evenly: the slashes stretch along their
           * own length and thin out across it, while the shockwave ring grows fast and
           * goes. Every part fades on its own curve.
           */
          const stretch = 0.35 + k * 2.4;
          bu.ring.children.forEach((child, ci) => {
            const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
            if (ci < 2) {
              child.scale.set(stretch, Math.max(0.05, 1 - k * 0.85), 1);
              mat.opacity = Math.max(0, 1 - k * 1.25);
            } else {
              const g = 1 + k * 7;
              child.scale.set(g, g, 1);
              mat.opacity = Math.max(0, 0.9 - k * 1.9);
            }
          });
          if (bu.lightSlot) bu.lightSlot.light.intensity = Math.max(0, 6 * (1 - k * 2));
        } else {
          const g = 1 + k * 9;
          bu.ring.scale.set(g, g, 1);
          ((bu.ring as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
            Math.max(0, 0.95 - k * 1.3);
          if (bu.lightSlot) bu.lightSlot.light.intensity = Math.max(0, 9 * (1 - k * 1.6));
        }
      }

      // Spent cards: lift, straighten, shrink and fade, then leave the scene.
      for (let i = spentMeshesRef.current.length - 1; i >= 0; i--) {
        const item = spentMeshesRef.current[i];
        const k = (time - item.start) / 0.72;
        if (k >= 1) {
          item.group.parent?.remove(item.group);
          item.group.traverse((child) => {
            const mats = (child as THREE.Mesh).material;
            if (mats) (Array.isArray(mats) ? mats : [mats]).forEach((m) => m.dispose());
          });
          spentMeshesRef.current.splice(i, 1);
          continue;
        }
        const ease = 1 - Math.pow(1 - k, 3);
        item.group.position.set(item.from.x, item.from.y + ease * 1.6, item.from.z + ease * 2.6);
        item.group.rotation.z = item.rotZ * (1 - ease);
        item.group.rotation.x = 0.58 * (1 - ease * 0.7);
        item.group.scale.setScalar(1 + ease * 0.18);
        item.group.traverse((child) => {
          const mats = (child as THREE.Mesh).material;
          if (!mats) return;
          (Array.isArray(mats) ? mats : [mats]).forEach((m: any) => {
            // Holds its colour through the first half of the flight, then goes quickly.
            m.opacity = Math.max(0, 1 - Math.pow(k, 2.2));
          });
        });
      }

      // Animate floating dust
      dustPoints.rotation.y = time * 0.05;

      // Animate 3D White Confirm Attack Button
      if (confirmAttackButtonRef.current) {
        const ring = named(confirmAttackButtonRef.current, 'attackButtonRing') as THREE.Mesh;
        const cap = named(confirmAttackButtonRef.current, 'attackButtonCap') as THREE.Mesh;
        const isAttackActive = isPlayerTurn && hasTappedAttackers;

        if (ring) {
          ring.rotation.z = -time * 0.8;
          if (isAttackActive) {
            const pulse = 0.7 + Math.sin(time * 8) * 0.3;
            (ring.material as THREE.MeshBasicMaterial).opacity = pulse;
            (ring.material as THREE.MeshBasicMaterial).transparent = true;
          } else {
            (ring.material as THREE.MeshBasicMaterial).opacity = 0.15;
          }
        }

        if (cap) {
          const targetCapZ = isAttackHoveredRef.current && isAttackActive ? 0.2 : 0.1;
          cap.position.z += (targetCapZ - cap.position.z) * 0.2;
        }
      }

      // Animate 3D End Turn Button
      if (endTurnButtonRef.current) {
        const ring = named(endTurnButtonRef.current, 'buttonRing') as THREE.Mesh;
        const cap = named(endTurnButtonRef.current, 'buttonCap') as THREE.Mesh;

        if (ring) {
          ring.rotation.z = time * 0.8;
          if (isPlayerTurn) {
            const pulse = 0.7 + Math.sin(time * 5) * 0.3;
            (ring.material as THREE.MeshBasicMaterial).opacity = pulse;
            (ring.material as THREE.MeshBasicMaterial).transparent = true;
          } else {
            (ring.material as THREE.MeshBasicMaterial).opacity = 0.2;
          }
        }

        if (cap) {
          /*
           * How far down is a real constraint, not a taste call: the base's rim sits at
           * z = 0.125 and the cap's lit face is 0.125 above its own centre, so anything
           * below z = 0 buries the label inside the base and the button reads as a black
           * disc. It stops at 0.05, which is a visible press and still clear of the rim.
           */
          const pressed = performance.now() < buttonPressUntilRef.current;
          const targetCapZ = pressed
            ? 0.05
            : isEndTurnHoveredRef.current && isPlayerTurn ? 0.2 : 0.1;
          // Down hard, back up softly — the asymmetry is what reads as a click.
          cap.position.z += (targetCapZ - cap.position.z) * (pressed ? 0.5 : 0.16);
          const ringMesh = named(endTurnButtonRef.current, 'buttonRing') as THREE.Mesh;
          if (ringMesh) ringMesh.scale.setScalar(pressed ? 0.97 : 1);
        }
      }

      // Animate Draw Card Flight Arcs
      for (let i = activeDrawAnimsRef.current.length - 1; i >= 0; i--) {
        const item = activeDrawAnimsRef.current[i];
        const elapsed = time - item.startTime;
        const progress = Math.min(1, elapsed / item.duration);

        // Smooth cubic ease out
        const t = 1 - Math.pow(1 - progress, 3);

        const currentPos = new THREE.Vector3().lerpVectors(item.startPos, item.endPos, t);
        currentPos.z += Math.sin(progress * Math.PI) * 2.5;

        item.mesh.position.copy(currentPos);
        item.mesh.rotation.y = progress * Math.PI * 2;
        item.mesh.rotation.z = progress * 0.2;

        if (progress >= 1) {
          scene.remove(item.mesh);
          activeDrawAnimsRef.current.splice(i, 1);
        }
      }

      // Animate Active Cards Placement & Motion
      cardMeshMapRef.current.forEach((group, instanceId) => {
        const ud = group.userData;
        if (!ud) return;

        const isHovered = hoveredInstanceIdRef.current === instanceId;
        const hoverZ = isHovered ? 0.6 : 0;
        const hoverY = isHovered ? (ud.isOpponent ? -0.2 : 0.2) : 0;

        // The blocker you picked stands right up, so the arrow clearly leaves it. Nothing
        // else on the board moves on its own — an eligible card only brightens.
        // Half of what it was: a targeting card only needs to lift clear, not leap.
        const aimLift = ud.isAimSource ? 0.275 : 0;
        breatheGlow(group, time);
        // Declared attackers lean toward the opponent's side.
        const attackLean = ud.card?.isAttacking ? (ud.isOpponent ? -0.55 : 0.55) : 0;

        const targetX = ud.targetX || 0;
        const targetY = (ud.targetY || 0) + hoverY + attackLean + (ud.animOffsetY || 0);
        const targetZ = (ud.targetZ || 0) + hoverZ + aimLift + (ud.animOffsetZ || 0);
        const targetRotZ = (ud.targetRotZ || 0) + (ud.animOffsetRotZ || 0);
        const targetRotX = (ud.targetRotX || 0) + (ud.animOffsetRotX || 0);

        group.position.x += (targetX - group.position.x) * 0.12;
        group.position.y += (targetY - group.position.y) * 0.12;
        group.position.z += (targetZ - group.position.z) * 0.12;

        group.rotation.z += (targetRotZ - group.rotation.z) * 0.12;
        group.rotation.x += (targetRotX - group.rotation.x) * 0.12;

        const wantScale = (ud.targetScale ?? 1) * (isHovered ? 1.06 : 1);
        group.scale.setScalar(group.scale.x + (wantScale - group.scale.x) * 0.12);

        const activeOrder = isHovered ? 200 : 100;
        group.renderOrder = activeOrder;
        group.traverse((child) => {
          child.renderOrder = activeOrder;
        });

        const borderGroup = named(group, 'borderGroup') as THREE.Group;
        if (borderGroup) {
          BorderFactory.update(borderGroup, time);
        }

        const holoGroup = named(group, 'holoGroup') as THREE.Group;
        if (holoGroup) {
          holoGroup.rotation.y += 0.02;
          holoGroup.rotation.z += 0.008;
        }

        // The marquee is deliberately inert: it neither spins nor breathes, so the board
        // holds still while you decide.

        // The stat plate and mana pip stay upright and forward-facing even when the card
        // taps, so a tapped source can still be read at a glance.
        for (const tag of ['statPlate', 'manaBadge']) {
          const plate = named(group, tag);
          if (!plate) continue;
          plate.rotation.z = -group.rotation.z;
          plate.rotation.x = -group.rotation.x;
          plate.renderOrder = activeOrder + 5;
        }
      });

      /*
       * Arena life. Nothing here is static: cores pulse out of phase, gyroscopes and
       * armillaries turn on their own axes, wreckage tumbles, the star shells and the
       * galactic band creep round at different rates for parallax, the veils drift, and
       * the dust rises. All of it lives outside the play area.
       */
      const arenaGroup = arenaRef.current;
      if (arenaGroup) {
        const far = named(arenaGroup, 'starsFar');
        if (far) far.rotation.z = time * 0.006;
        const near = named(arenaGroup, 'starsNear');
        if (near) {
          near.rotation.z = time * 0.013;
          // A slow collective twinkle; individual stars are too small to shimmer alone.
          (near as THREE.Points).material &&
            (((near as THREE.Points).material as THREE.PointsMaterial).opacity =
              0.78 + Math.sin(time * 0.9) * 0.14);
        }
        // The deck assembly and every mast turn slowly on their own axes.
        const deckRing = named(arenaGroup, 'deckRing');
        if (deckRing) deckRing.rotation.z = time * 0.024;
        /*
         * On top of that drift, a blow landing on the player spins every mast through two
         * whole turns. It eases out rather than stopping dead, and because it is added to
         * the drift rather than replacing it, the masts come out of the surge already
         * turning at their own speed instead of snapping back.
         */
        const since = mastSurgeRef.current >= 0 ? time - mastSurgeRef.current : Infinity;
        const SURGE_SECONDS = 1.1;
        const surge = since < SURGE_SECONDS
          ? (1 - Math.pow(1 - since / SURGE_SECONDS, 3)) * 2 * Math.PI * 2
          : 0;
        arenaGroup.children.forEach((c) => {
          if (c.name === 'mast') {
            c.rotation.z = time * ((c.userData.spin as number) ?? 0.03) + surge;
          }
        });

        const bandPts = named(arenaGroup, 'band');
        if (bandPts) bandPts.rotation.z = 0.35 + time * 0.009;
        const world2 = named(arenaGroup, 'world') as THREE.Group | undefined;
        if (world2) {
          // The planet turns on a tilted axis and rocks very slightly, so the bands crawl
          // across its face instead of sitting still.
          world2.rotation.y = time * 0.035;
          world2.rotation.z = 0.24 + Math.sin(time * 0.05) * 0.01;
          world2.position.x = -24 + Math.sin(time * 0.03) * 0.7;
          const moons = named(world2, 'moons') as THREE.Group | undefined;
          if (moons) {
            moons.children.forEach((m, mi) => {
              const sp = (m.userData.speed as number) ?? 0.1;
              const rad = (m.userData.radius as number) ?? 18;
              const a = time * sp + mi * 2.1;
              m.position.set(Math.cos(a) * rad, Math.sin(a) * rad * 0.34, Math.sin(a * 0.7) * 3);
              m.rotation.y += 0.004 + mi * 0.002;
            });
          }
          const belt = named(world2, 'belt');
          if (belt) belt.rotation.z = time * 0.06;
        }
        const outpost = named(arenaGroup, 'outpost') as THREE.Group | undefined;
        if (outpost) {
          outpost.rotation.z = time * 0.05;
          outpost.rotation.x = 1.1;
        }

        arenaGroup.children.forEach((child, i) => {
          const core = named(child, 'core') as THREE.Mesh | undefined;
          if (core) {
            const ph = (core.userData.phase as number) ?? i;
            const f = 1 + Math.sin(time * 2.4 + ph) * 0.12;
            core.scale.setScalar(f);
            core.rotation.y += 0.01;
            core.rotation.x += 0.004;
            (core.material as THREE.MeshBasicMaterial).opacity = 0.72 + Math.sin(time * 3.1 + ph) * 0.24;
          }
          const light = named(child, 'coreLight') as THREE.PointLight | undefined;
          if (light) light.intensity = 1.25 + Math.sin(time * 2.4 + i * 1.7) * 0.45;

          const gyro = named(child, 'gyro') as THREE.Group | undefined;
          if (gyro) {
            const a = named(gyro, 'gyroA');
            const b = named(gyro, 'gyroB');
            if (a) a.rotation.z = time * 0.5 + i;
            if (b) b.rotation.y = -time * 0.7 + i;
          }

          const arm = named(child, 'armillary') as THREE.Group | undefined;
          if (arm) {
            arm.children.forEach((hoop, hi) => {
              hoop.rotation.z += 0.004 + hi * 0.003;
              hoop.rotation.x += 0.002 * (hi % 2 ? -1 : 1);
            });
          }

          if (child.name === 'debris') {
            const spin = (child.userData.spin as number) ?? 0.08;
            child.rotation.x += spin * 0.01;
            child.rotation.y += spin * 0.014;
            child.position.z += Math.sin(time * 0.5 + i) * 0.002;
          }

          if (child.name === 'nebula') {
            const drift = (child.userData.drift as number) ?? 0.02;
            child.rotation.z += drift * 0.01;
            (child as THREE.Mesh).position.x += Math.sin(time * 0.12 + i) * 0.004;
            ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
              0.24 + Math.sin(time * 0.35 + i) * 0.09;
          }

          if (child.name === 'banner') {
            const cloth = named(child, 'cloth') as THREE.Mesh | undefined;
            if (cloth) {
              const pos = cloth.geometry.getAttribute('position') as THREE.BufferAttribute;
              for (let v = 0; v < pos.count; v++) {
                const y = pos.getY(v);
                pos.setZ(v, Math.sin(time * 2.2 + y * 1.6 + i) * 0.14 * ((1.7 - y) / 3.4));
              }
              pos.needsUpdate = true;
            }
          }

          if (child.name === 'embers') {
            const pts = child as THREE.Points;
            const pos = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
            const seeds = pts.userData.seed as Float32Array;
            for (let v = 0; v < pos.count; v++) {
              let z = pos.getZ(v) + 0.006 + Math.sin(time + seeds[v]) * 0.002;
              if (z > 12.5) z = 1.5;
              pos.setZ(v, z);
              pos.setX(v, pos.getX(v) + Math.sin(time * 0.6 + seeds[v]) * 0.004);
            }
            pos.needsUpdate = true;
          }

          // ---- the megastructure and the traffic through it ----
          if (child.name === 'gyre') {
            const sp = named(child, 'spinner');
            if (sp) sp.rotation.z = time * ((child.userData.spin as number) ?? 0.06);
          }
          if (child.name === 'shuttle') {
            const ud = child.userData as { r: number; h: number; speed: number; phase: number };
            const a = time * ud.speed + ud.phase;
            child.position.set(
              Math.cos(a) * ud.r,
              Math.sin(a) * ud.r,
              ud.h + Math.sin(time * 0.9 + ud.phase) * 0.2,
            );
            child.rotation.z = a + (ud.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
          }
          if (child.name === 'comet') {
            const ud = child.userData as {
              period: number; active: number; from: number[]; to: number[];
            };
            const k = time % ud.period;
            if (k < ud.active) {
              const t01 = k / ud.active;
              child.visible = true;
              child.position.set(
                ud.from[0] + (ud.to[0] - ud.from[0]) * t01,
                ud.from[1] + (ud.to[1] - ud.from[1]) * t01,
                ud.from[2] + (ud.to[2] - ud.from[2]) * t01,
              );
              // Tail pointing back along the travel, faded in and out at the ends.
              child.rotation.z = Math.atan2(
                -(ud.to[1] - ud.from[1]), -(ud.to[0] - ud.from[0]),
              );
              const fade = Math.sin(Math.PI * t01);
              child.children.forEach((part) => {
                const m = (part as THREE.Mesh).material as THREE.MeshBasicMaterial;
                if (m) m.opacity = (part === child.children[0] ? 0.95 : 0.4) * fade;
              });
            } else {
              child.visible = false;
            }
          }
          if (child.name === 'moon') {
            const ud = child.userData as {
              r: number; speed: number; phase: number; cx: number; cy: number; cz: number;
            };
            const a = time * ud.speed + ud.phase;
            child.position.set(
              ud.cx + Math.cos(a) * ud.r,
              ud.cy + Math.sin(a) * ud.r * 0.4,
              ud.cz + Math.sin(a) * ud.r * 0.8,
            );
            child.rotation.y += 0.002;
          }
          if (child.name === 'rockBelt') {
            child.rotation.z += 0.0004 * rate;
            child.children.forEach((rock, ri) => {
              rock.rotation.x += (0.003 + ri * 0.0008) * rate;
              rock.rotation.y += 0.004 * rate;
            });
          }
        });
      }

      // Animate 3D Floating Hand Cards
      handMeshMapRef.current.forEach((group, instanceId) => {
        const ud = group.userData;
        if (!ud) return;

        const isDragging = dragging3DInstanceIdRef.current === instanceId;
        const isHovered = hoveredInstanceIdRef.current === instanceId && !isDragging;
        breatheGlow(group, time);

        /*
         * Still on the library, waiting its turn to be dealt — and *hidden* while it waits.
         *
         * The card is spawned on the deck so it has somewhere to fly from, and the loop
         * simply skipped it until its moment came. That was invisible when the wait was a
         * tenth of a second; now that the deal holds until the opening camera has landed it
         * is nearly two, and seven face-up cards sat stacked on the library in plain sight.
         * A card that has not been dealt yet should not be on the table at all.
         */
        if (typeof ud.dealFrom === 'number' && time < dealGate(ud.dealFrom, ud.dealOrder)) {
          if (!ud.held) { group.visible = false; ud.held = true; }
          return;
        }
        if (ud.held) { group.visible = true; ud.held = false; }

        let targetX = ud.targetX || 0;
        let targetY = ud.targetY || 0;
        let targetZ = ud.targetZ || 0;
        let targetRotZ = ud.targetRotZ || 0;
        let targetRotX = ud.targetRotX || 0;
        // The hand's own size — doubled on a phone — with the lift multipliers on top.
        const handBase = (ud.handScale as number) || 1;
        let targetScale = handBase;

        if (isDragging && dragPlanePointRef.current) {
          targetX = dragPlanePointRef.current.x;
          targetY = dragPlanePointRef.current.y;
          targetZ = 3.5;
          targetRotX = 0;
          targetRotZ = 0;
          targetScale = handBase * 1.15;
        } else if (ud.isAimSource) {
          // A spell waiting for its target sits back in the fan, but raised and turned
          // face-on: it is plainly the card the dashed arrow is coming from.
          targetY += 0.8;
          targetZ += 1.7;
          targetRotX = 0.28;
          targetRotZ = 0;
          targetScale = handBase * 1.12;
        } else if (isHovered) {
          targetY += 0.3;
          targetZ += 1.2;
          targetRotX = 0.65;
          targetRotZ = 0;
          targetScale = handBase * 1.08;
        }

        const lerpRate = isHovered || isDragging || ud.isAimSource ? 0.35 : 0.15;

        group.position.x += (targetX - group.position.x) * lerpRate;
        group.position.y += (targetY - group.position.y) * lerpRate;

        if (isHovered && group.position.z < (ud.targetZ || 0) + 0.8) {
          group.position.z = (ud.targetZ || 0) + 0.8;
        }
        group.position.z += (targetZ - group.position.z) * lerpRate;

        group.rotation.z += (targetRotZ - group.rotation.z) * lerpRate;
        group.rotation.x += (targetRotX - group.rotation.x) * lerpRate;

        group.scale.setScalar(group.scale.x + (targetScale - group.scale.x) * lerpRate);

        const handIndex = typeof ud.handIndex === 'number' ? ud.handIndex : 0;
        const baseOrder = 300 + handIndex * 10;
        const activeOrder = isDragging ? 2000 : ud.isAimSource ? 1500 : isHovered ? 1000 : baseOrder;

        group.renderOrder = activeOrder;
        group.traverse((child) => {
          child.renderOrder = activeOrder;
        });

        const borderGroup = named(group, 'borderGroup') as THREE.Group;
        if (borderGroup) {
          BorderFactory.update(borderGroup, time);
        }

        const holoGroup = named(group, 'holoGroup') as THREE.Group;
        if (holoGroup) {
          holoGroup.rotation.y += 0.02;
          holoGroup.rotation.z += 0.008;
        }
      });

      // Animate Dying Cards (Particle Burst Expansion + Card Dissolve/Disappear)
      dyingMeshesRef.current.forEach((item, id) => {
        const elapsed = time - item.startTime;
        const duration = item.duration || 0.5;

        if (elapsed < duration) {
          const progress = elapsed / duration;
          const dt = 0.016;

          // 1. Dissolve Card (Fade Opacity & float slightly upward)
          // Front-loaded fade: the card is visibly gone early, the sparks linger.
          const dissolveAlpha = Math.max(0, 1.0 - Math.pow(progress, 0.55));
          item.group.position.z = item.startPos.z + progress * 0.7;
          item.group.scale.set(1.0 + progress * 0.15, 1.0 + progress * 0.15, 1.0 - progress * 0.5);

          item.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (Array.isArray(child.material)) {
                child.material.forEach((m) => {
                  m.opacity = dissolveAlpha;
                });
              } else if (child.material) {
                child.material.opacity = dissolveAlpha;
              }
            }
          });

          // 2. Expand Particles
          if (item.particleSystem && item.velocities) {
            const posAttr = item.particleSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
            const positions = posAttr.array as Float32Array;
            const vels = item.velocities;

            for (let i = 0; i < vels.length / 3; i++) {
              positions[i * 3] += vels[i * 3] * dt;
              positions[i * 3 + 1] += vels[i * 3 + 1] * dt;
              positions[i * 3 + 2] += vels[i * 3 + 2] * dt;
              vels[i * 3] *= 0.95;
              vels[i * 3 + 1] *= 0.95;
            }
            posAttr.needsUpdate = true;

            (item.particleSystem.material as THREE.PointsMaterial).opacity = Math.max(0, 1.0 - progress);
          }
        } else {
          cardsGroup.remove(item.group);
          if (item.particleSystem && particlesGroupRef.current) {
            particlesGroupRef.current.remove(item.particleSystem);
            item.particleSystem.geometry.dispose();
          }
          dyingMeshesRef.current.delete(id);
        }
      });

      // The dice drift very slightly, so they sit in the scene rather than on the glass.
      for (const [ref, home, ph] of [
        [playerHudMeshRef, DIE_Y.you, 0],
        [opponentHudMeshRef, DIE_Y.foe, 1.4],
      ] as const) {
        const g = ref.current;
        if (!g) continue;
        g.position.x = DIE_X + Math.cos(time * 0.8 + ph) * 0.05;
        g.position.y = home + Math.sin(time * 0.9 + ph) * 0.05;
        g.position.z = 1.0;
      }

      // The gold rim breathes with the same rhythm as a targetable card.
      for (const ref of [playerHudMeshRef, opponentHudMeshRef]) {
        const rim = named(ref.current, 'dieRim') as THREE.Mesh | undefined;
        if (rim?.visible) {
          /*
           * One beat, 0 to 1 and back, driving the border and the wash over the faces
           * together so the die brightens to gold as a whole. It swings the whole way:
           * at the bottom of the breath the gold is all but gone, which is what makes the
           * top of it read as a pulse rather than a light that is merely on.
           */
          const beat = 0.5 + Math.sin(time * 3.0) * 0.5;
          (rim.material as THREE.MeshBasicMaterial).opacity = 0.03 + beat * 0.95;
          const wash = named(ref.current, 'dieWash') as THREE.Mesh | undefined;
          if (wash) (wash.material as THREE.MeshBasicMaterial).opacity = beat * beat * 0.34;
        }

        /*
         * The dice. A change in life sets `spin`, which decays away: while it is spinning
         * the die tumbles freely, and once it slows it turns to the orientation that puts
         * the face bearing the new total square to the camera. So the roll actually lands
         * on its number rather than snapping back to a fixed pose.
         */
        const die = named(ref.current, 'lifeDie') as THREE.Group | undefined;
        const spinner = named(die, 'dieBody') as THREE.Group | undefined;
        if (!die || !spinner) continue;
        /*
         * One roll, one landing.
         *
         * The die used to tumble freely while its spin decayed and then, once slow, turn
         * separately to the face carrying the number — two motions, and the second one
         * read as the die correcting itself. It is now a single interpolation from where
         * it stood to where it must end, with whole extra turns folded in on top and
         * eased out: the tumble and the landing are the same movement, and the last frame
         * is exactly the target orientation.
         */
        const roll = die.userData.roll as
          | { from: THREE.Quaternion; to: THREE.Quaternion; axis: THREE.Vector3; turns: number; start: number; dur: number }
          | undefined;
        if (roll) {
          const k = Math.min(1, (time - roll.start) / roll.dur);
          const ease = 1 - Math.pow(1 - k, 3);
          const q = new THREE.Quaternion().slerpQuaternions(roll.from, roll.to, ease);
          if (k < 1) {
            // The extra revolutions unwind to nothing, so they cannot disturb the landing.
            q.premultiply(
              new THREE.Quaternion().setFromAxisAngle(roll.axis, (1 - ease) * roll.turns * Math.PI * 2),
            );
          } else {
            die.userData.roll = undefined;
          }
          spinner.quaternion.copy(q);
        }

        /*
         * The pointer resting on a targetable die: it lifts a little off the glass, and its
         * satellites take one whole turn round it — eased, so the turn arrives rather than
         * stopping dead. `focusAt` is stamped by the pointer handler; the movement is all
         * here, and decays to nothing on its own once the turn is done.
         */
        const FOCUS_TURN = 0.75;
        const focusAt = die.userData.focusAt as number | undefined;
        const focusK = focusAt === undefined ? 1 : Math.min(1, (time - focusAt) / FOCUS_TURN);
        const focusEase = 1 - Math.pow(1 - focusK, 3);
        // Starts a whole turn behind and eases up to where it would have been, so the
        // satellites sweep forwards through exactly one revolution and settle.
        const spinRound = focusAt === undefined ? 0 : -(1 - focusEase) * Math.PI * 2;
        const wantLift = dieHoverRef.current === (ref === playerHudMeshRef ? 'you' : 'foe') ? 0.42 : 0;
        const lift = (die.userData.lift as number) ?? 0;
        die.userData.lift = lift + (wantLift - lift) * Math.min(1, 0.16 * rate);
        die.position.z = die.userData.lift as number;

        // Satellites: a slow orbit at rest, thrown wide and spun up by a change in life.
        const orbit = named(die, 'dieOrbit') as THREE.Group | undefined;
        if (orbit) {
          const flare = (die.userData.flare as number) ?? 0;
          die.userData.flare = flare * Math.pow(0.93, rate);
          const radius = 1.55 + flare * 1.5;
          orbit.children.forEach((child, ci) => {
            if (child.name === 'dieHoop') {
              // Its own slow drift is kept apart from the focus turn, so the two add up
              // instead of one overwriting the other.
              const drift = ((child.userData.drift as number) ?? 0) + 0.006 + flare * 0.08;
              child.userData.drift = drift;
              child.rotation.z = drift + spinRound;
              child.scale.setScalar(1 + flare * 0.75);
              ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.35 + flare * 0.6;
              return;
            }
            const a0 = (child.userData.angle as number) ?? 0;
            const a = a0 + time * (0.5 + flare * 5) + spinRound;
            child.position.set(
              Math.cos(a) * radius,
              Math.sin(a) * radius * 0.42,
              Math.sin(a * 1.3) * 0.35,
            );
            child.rotation.x += 0.02 + flare * 0.3;
            child.rotation.y += 0.03 + flare * 0.3;
            child.scale.setScalar(1 + flare * 1.4);
          });
        }

        // The drawn shadow tracks the tumble, so the die reads as sitting on the glass.
        const shadow = named(die, 'dieShadow') as THREE.Mesh | undefined;
        if (shadow) {
          const wobble = 1 + Math.sin(time * 1.1) * 0.02 + ((die.userData.spin as number) ?? 0) * 0.6;
          // The die rises; its shadow stays on the glass and softens, which is the whole
          // reason the lift reads as a lift.
          const up = (die.userData.lift as number) ?? 0;
          shadow.position.z = -0.98 - up;
          shadow.scale.setScalar(wobble * (1 + up * 0.22));
          (shadow.material as THREE.MeshBasicMaterial).opacity =
            (0.9 - ((die.userData.spin as number) ?? 0)) * (1 - up * 0.5);
        }
      }

      /*
       * How much of a frame this loop's own JavaScript costs, kept apart from the draw
       * call so the two can be judged separately. Test builds only.
       */
      if (import.meta.env.VITE_TEST_HOOK) {
        const w = window as any;
        const spent = performance.now() - loopT0;
        (w.__loop ??= { frames: 0, ms: 0, max: 0 });
        w.__loop.frames += 1;
        w.__loop.ms += spent;
        w.__loop.max = Math.max(w.__loop.max, spent);
      }

      /*
       * The tutorial's light.
       *
       * A hole cut in a DOM overlay is a rectangle, and a rectangle around a twenty-sided
       * die is a rectangle with a lot of table in it. So the dark goes *inside* the render:
       * the board is drawn, a dark sheet is laid over the whole of it, the depth buffer is
       * cleared, and then the named objects are drawn again on top — at full brightness,
       * in their own outline, with nothing around them. What stays lit is the die.
       *
       * The second pass is selected with a render layer rather than by moving objects into
       * another scene, because moving them would lose their place in the hierarchy that put
       * them where they are.
       */
      // Everything the frame draws goes into the offscreen buffer when FXAA is in play;
      // the composite at the bottom is what actually reaches the screen.
      if (fxTarget) renderer.setRenderTarget(fxTarget);

      const composite = () => {
        if (!fxTarget) return;
        renderer.setRenderTarget(null);
        const wasAuto = renderer.autoClear;
        renderer.autoClear = true;
        renderer.render(fxScene, fxCam);
        renderer.autoClear = wasAuto;
      };

      const spot = spotlightRef.current;
      if (!spot) {
        renderer.render(scene, camera);
        if (import.meta.env.VITE_TEST_HOOK) {
          (window as any).__sceneCalls = renderer.info.render.calls;
          (window as any).__sceneTris = renderer.info.render.triangles;
        }
        composite();
        return;
      }

      renderer.render(scene, camera);
      const wasAutoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.render(dimScene, dimCam);

      const lit = spot.map(objectOf).filter(Boolean) as THREE.Object3D[];
      if (lit.length) {
        /*
         * The depth buffer is left exactly as the first pass wrote it, and the veil does
         * not touch it. Three's materials test LEQUAL, so redrawing a lit object at its own
         * depth passes where it was visible and fails where something else is in front —
         * which is the whole point. Clearing depth here instead put a lit creature on the
         * battlefield in front of the hand cards that are physically nearer the camera.
         *
         * Shadows are already up to date from the first pass; letting the renderer redo
         * them for the second is a whole shadow-map render per frame for nothing, and it
         * is what made the board stutter while a card was being hovered.
         */
        const autoShadow = renderer.shadowMap.autoUpdate;
        renderer.shadowMap.autoUpdate = false;
        for (const o of lit) o.traverse((n) => n.layers.enable(SPOT_LAYER));
        camera.layers.set(SPOT_LAYER);
        /*
         * The sky has to come off for the second pass. A scene's background is painted on
         * every render regardless of which layer the camera is looking at, so leaving it on
         * repaints the whole sky over the blackout — which is what made the dark read as a
         * sheet of tinted glass with the board still visible behind it.
         */
        const sky = scene.background;
        scene.background = null;
        renderer.render(scene, camera);
        scene.background = sky;
        camera.layers.set(0);
        for (const o of lit) o.traverse((n) => n.layers.disable(SPOT_LAYER));
        renderer.shadowMap.autoUpdate = autoShadow;
      }
      renderer.autoClear = wasAutoClear;
      composite();
    };

    /*
     * Compile everything the effects will ever need before the first frame is shown. A
     * material meeting the renderer for the first time is compiled there and then, which
     * is a visible hitch if it happens while a spell is in the air; doing it here moves
     * that cost to load, where nothing is moving.
     */
    const warmup = new THREE.Group();
    warmup.position.set(0, 0, -60);
    warmup.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    ));
    warmup.add(new THREE.Sprite(new THREE.SpriteMaterial({
      map: particleDot(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    })));
    const warmGeo = new THREE.BufferGeometry();
    warmGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    warmup.add(new THREE.Points(warmGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.34, map: particleDot(), transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    })));
    warmup.add(new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.075, 8, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    ));
    scene.add(warmup);
    renderer.compile(scene, camera);
    warmup.visible = false;

    /*
     * Both clocks are started here, together. The opening move counts drawn milliseconds
     * from zero; the deal's gate is an estimate of where that lands on the scene clock,
     * refreshed every frame while the move runs.
     *
     * The descent is timed on wall time and the deal on the scene clock, and the deal's gate
     * used to be seeded lazily inside the first frame — which is after the hand effect has
     * already run and read it. The two ended up nearly a second apart and the cards began
     * arriving while the camera was still coming down. Seeding it here, before any other
     * effect can look, makes them the same instant by construction.
     */
    /*
     * The opening hand's faces are drawn and uploaded here, before the clock starts.
     *
     * They are the largest piece of work the first match does that the warm-up above does
     * not cover — seven card faces rasterised on a 2D canvas and pushed to the GPU with
     * their mip chains — and it used to happen during the opening move, on whichever frames
     * the cards were first drawn. Doing it here costs the same milliseconds where nothing
     * is moving yet. Faces are cached by card, so a card already drawn is free.
     */
    for (const card of playerHand.slice(0, 10)) {
      try {
        renderer.initTexture(faceTexture(card));
      } catch {
        // A face that will not rasterise is not worth failing the match over; the board
        // draws it on demand later, exactly as it did before.
      }
    }

    introRef.current = 0;
    introWallRef.current = performance.now();
    introUntilRef.current = clockRef.current.getElapsedTime() + INTRO_MS / 1000;
    renderLoop();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const aspect = w / h;
      cameraRef.current.aspect = aspect;
      if (aspect < 1.5) {
        cameraRef.current.fov = 50 * (1.5 / Math.max(0.7, aspect));
      } else {
        cameraRef.current.fov = 50;
      }
      cameraRef.current.updateProjectionMatrix();
      // Rotating a phone can change the reported ratio, and it was never re-applied.
      rendererRef.current.setPixelRatio(maxPixelRatio());
      rendererRef.current.setSize(w, h);
      sizeFx();
    };
    window.addEventListener('resize', handleResize);
    /*
     * The black slab along the bottom of a phone.
     *
     * `setSize` writes the canvas's size into its own style in pixels, so the canvas is only
     * as tall as the container was on the frame it last ran. The container is `100dvh` and on
     * iOS that grows the moment the address bar retracts — but `window.resize` is not reliably
     * fired for it, and when it is, it can arrive before the layout has settled. The canvas
     * keeps the shorter height, and the strip it no longer covers shows what is behind: black.
     *
     * `visualViewport` is the thing that actually changes, so it is what we listen to, and the
     * measurement is taken a frame later so it reads the settled height rather than the one
     * mid-animation. The stylesheet holds the canvas at 100% of its container as well, so even
     * the frame before this runs has nothing showing through.
     */
    const vv = window.visualViewport;
    const settle = () => requestAnimationFrame(handleResize);
    vv?.addEventListener('resize', settle);
    vv?.addEventListener('scroll', settle);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      vv?.removeEventListener('resize', settle);
      vv?.removeEventListener('scroll', settle);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }
    };
  }, []);

  // Synchronize 3D Deck Piles & Physical 3D Graveyard Piles
  useEffect(() => {
    if (!interactablesGroupRef.current) return;
    const group = interactablesGroupRef.current;

    if (!cardBackTexRef.current) cardBackTexRef.current = createCardBackTexture();
    const topMat = new THREE.MeshBasicMaterial({ map: cardBackTexRef.current });
    const bottomMat = new THREE.MeshBasicMaterial({ color: 0x07070b });

    /*
     * A deck is a stack of cards, so its sides show the cut edges of every one of them:
     * a hairline per card, running across the depth of the pile. BoxGeometry lays depth
     * along U on the X faces and along V on the Y faces, so each pair gets its own map.
     */
    const edgeMats = (count: number) => {
      const u = new THREE.MeshBasicMaterial({ map: createDeckEdgeTexture(count, 'u') });
      const v = new THREE.MeshBasicMaterial({ map: createDeckEdgeTexture(count, 'v') });
      return [u, u, v, v, topMat, bottomMat];
    };

    // 1. Player Deck Pile (Aligned with End Turn Button: X=9.0, Y=-2.8, Horizontal)
    if (playerDeckMeshRef.current) group.remove(playerDeckMeshRef.current);

    const pDeckGroup = new THREE.Group();
    pDeckGroup.position.set(9.0, -2.8, 0);

    const pDepth = Math.max(0.02, playerDeckCount * 0.0175);
    const deckGeom = new THREE.BoxGeometry(1.8, 2.7, pDepth);
    const pDeckMesh = new THREE.Mesh(deckGeom, edgeMats(playerDeckCount));
    pDeckMesh.position.z = pDepth / 2;
    pDeckMesh.rotation.z = Math.PI / 2; // Horizontal landscape orientation
    pDeckMesh.castShadow = true;
    pDeckMesh.receiveShadow = true;
    pDeckGroup.add(pDeckMesh);

    group.add(pDeckGroup);
    playerDeckMeshRef.current = pDeckGroup;

    // 2. Opponent Deck Pile (Aligned with End Turn Button: X=9.0, Y=4.2, Horizontal)
    if (opponentDeckMeshRef.current) group.remove(opponentDeckMeshRef.current);

    const oDeckGroup = new THREE.Group();
    oDeckGroup.position.set(9.0, 4.2, 0);

    const oDepth = Math.max(0.02, opponentDeckCount * 0.0175);
    const oDeckGeom = new THREE.BoxGeometry(1.8, 2.7, oDepth);
    const oDeckMesh = new THREE.Mesh(oDeckGeom, edgeMats(opponentDeckCount));
    oDeckMesh.position.z = oDepth / 2;
    oDeckMesh.rotation.z = Math.PI / 2; // Horizontal landscape orientation
    oDeckMesh.castShadow = true;
    oDeckMesh.receiveShadow = true;
    oDeckGroup.add(oDeckMesh);

    group.add(oDeckGroup);
    opponentDeckMeshRef.current = oDeckGroup;

    /*
     * A pile is rebuilt only when that pile changed. This effect watches four things —
     * both deck counts and both graveyards — and a change in any one of them rebuilt all
     * four, so during a big exchange each death rebuilt the other side's untouched pile
     * as well. The signature is what the pile is actually made of.
     */
    const gySig = (cards: RenderCard[]) =>
      `${cards.length}|${cards.slice(-15).map((c) => c.id).join(',')}`;

    // 3. Physical Player Graveyard Pile (Below Deck: X=9.0, Y=-5.2, Horizontal)
    const pSig = gySig(playerGraveyard);
    if (!playerGraveyardMeshRef.current || playerGraveyardMeshRef.current.userData.sig !== pSig) {
      if (playerGraveyardMeshRef.current) group.remove(playerGraveyardMeshRef.current);
      const pGraveGroup = createGraveyardStackMesh(playerGraveyard);
      pGraveGroup.position.set(9.0, -5.2, 0);
      pGraveGroup.userData.sig = pSig;
      group.add(pGraveGroup);
      playerGraveyardMeshRef.current = pGraveGroup;
    }

    // 4. Physical Opponent Graveyard Pile (Above Deck: X=9.0, Y=6.6, Horizontal)
    const oSig = gySig(opponentGraveyard);
    if (!opponentGraveyardMeshRef.current || opponentGraveyardMeshRef.current.userData.sig !== oSig) {
      if (opponentGraveyardMeshRef.current) group.remove(opponentGraveyardMeshRef.current);
      const oGraveGroup = createGraveyardStackMesh(opponentGraveyard);
      oGraveGroup.position.set(9.0, 6.6, 0);
      oGraveGroup.userData.sig = oSig;
      group.add(oGraveGroup);
      opponentGraveyardMeshRef.current = oGraveGroup;
    }
  }, [playerDeckCount, opponentDeckCount, playerGraveyard, opponentGraveyard]);

  /*
   * The life readouts. The mana panels are gone, so each side is just its die, parked in
   * the near corner of the table — the player at bottom left, the opponent at the matching
   * corner of their own half. These sit exactly on the `hero-you` / `hero-foe` anchors the
   * effects layer aims at, so an attack on a player lands on the die itself.
   */
  useEffect(() => {
    if (!interactablesGroupRef.current) return;
    const group = interactablesGroupRef.current;

    if (!playerHudMeshRef.current) {
      const pGroup = new THREE.Group();
      pGroup.name = 'playerHUD';
      pGroup.position.set(DIE_X, DIE_Y.you, 1.0);
      const pDie = createLifeDie(false);
      pDie.scale.setScalar(0.86);
      pGroup.add(pDie);
      group.add(pGroup);
      playerHudMeshRef.current = pGroup;
    }

    if (!opponentHudMeshRef.current) {
      const oGroup = new THREE.Group();
      oGroup.name = 'opponentHUD';
      oGroup.position.set(DIE_X, DIE_Y.foe, 1.0);
      const oDie = createLifeDie(true);
      oDie.scale.setScalar(0.86);
      oGroup.add(oDie);
      group.add(oGroup);
      opponentHudMeshRef.current = oGroup;
    }

    /*
     * A spell that can hit a player has no card to light up, so the die itself does — its
     * own edges drawn again in gold. It used to be a square plate hung behind the die,
     * which read as a box around it rather than as the die being the thing you may point
     * at.
     */
    const heroes = new Set(targetableHeroes || []);
    for (const [ref, side] of [
      [playerHudMeshRef, 'you'],
      [opponentHudMeshRef, 'foe'],
    ] as const) {
      const g = ref.current;
      if (!g) continue;
      const rim = g.getObjectByName('dieRim') as THREE.Mesh | undefined;
      const wash = g.getObjectByName('dieWash') as THREE.Mesh | undefined;
      if (rim) rim.visible = heroes.has(side);
      if (wash) wash.visible = heroes.has(side);
      g.userData.targetable = heroes.has(side);
    }

    // Life is on the dice now: repaint the face and, when the number actually moved, give
    // the die a fresh tumble so a drain reads as a roll rather than a counter ticking.
    for (const [ref, side] of [
      [playerHudMeshRef, player],
      [opponentHudMeshRef, opponent],
    ] as const) {
      const die = ref.current?.getObjectByName('lifeDie') as THREE.Group | undefined;
      if (!die || !side) continue;
      if (die.userData.shown !== side.life) {
        die.userData.shown = side.life;
        drawLifeDie(die, side.life);
        const spinner = die.getObjectByName('dieBody') as THREE.Group | undefined;
        const target = die.userData.targetQuat as THREE.Quaternion | undefined;
        if (spinner && target) {
          // A single roll: where it stands, where it must end, and the turns in between.
          die.userData.roll = {
            from: spinner.quaternion.clone(),
            to: target.clone(),
            axis: new THREE.Vector3(
              0.4 + Math.random() * 0.6,
              0.7 + Math.random() * 0.5,
              Math.random() * 0.3,
            ).normalize(),
            turns: 2 + Math.floor(Math.random() * 2),
            start: clockRef.current.getElapsedTime(),
            // Short enough to finish inside one blow's slot, so four creatures getting
            // through give four separate rolls rather than one long continuous tumble.
            dur: 0.5,
          };
        }
        die.userData.flare = 1;
        if (import.meta.env.VITE_TEST_HOOK) {
          // Every fresh tumble, so a harness can count one roll per blow.
          ((window as any).__rolls ??= []).push({
            side: side === player ? 'you' : 'foe',
            life: side.life,
            t: Math.round(performance.now()),
          });
        }
      }
    }

  }, [player, opponent, targetableHeroes]);

  // The player's drawn card flies in as its own hand mesh (see the hand sync effect),
  // so no separate ghost card is needed here — only the opponent needs one, since
  // their hand is never rendered.


  /**
   * One texture per printed face, shared by every copy of it.
   *
   * Rasterising a card and uploading it cost most of the time a card takes to appear —
   * measured at 177ms each — and four copies of the same card in a deck were paying it
   * four times over, once per instance, in the middle of play. The face is printed
   * matter: it depends on the card and on its live power and toughness, and on nothing
   * else about the instance, so it keys on exactly that and every copy shares one.
   */
  const faceTexCache = useRef<Map<string, THREE.Texture>>(new Map());
  const faceTexture = (card: RenderCard): THREE.Texture => {
    const key = `${card.id}|${card.livePow ?? ''}|${card.liveTou ?? ''}`;
    const had = faceTexCache.current.get(key);
    if (had) return had;
    /*
     * A creature whose power changes needs a new face, and the old one is dead weight. The
     * set is small enough that this never fires in a normal game; it is here so a very long
     * one cannot grow the cache without bound.
     */
    /*
     * A face at 0.5 is 1024x1536 of RGBA — six megabytes each, and four hundred of them
     * would be two and a half gigabytes. That ceiling was written for a desktop; a phone
     * reaches for the eject handle long before it.
     */
    const cap = isTouch() ? 96 : 400;
    if (faceTexCache.current.size > cap) {
      /*
       * Evict the oldest half, not the lot. Throwing the whole cache away meant the frame
       * after the cap was reached had to re-rasterise and re-upload every face still on the
       * table at once — a cliff you could feel. A Map keeps insertion order, so the front of
       * it is the least recently made.
       */
      let drop = Math.ceil(cap / 2);
      for (const [k, t] of faceTexCache.current) {
        if (drop-- <= 0) break;
        t.dispose();
        faceTexCache.current.delete(k);
      }
    }
    // Sized to the screen — see faceScale. The reader that opens on a press is drawn by the
    // shared layer, which keeps its own full-size face, so nothing here limits what you read.
    const tex = new THREE.CanvasTexture(renderCardCanvas(card, faceScale(rendererRef.current)));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    /*
     * The camera looks down the table, so every card is seen at a slant — and a slanted
     * mipmapped texture is chosen by its *worst* axis, which is why the rules text went to
     * mush the further up the board a card sat. Anisotropic filtering samples along the
     * direction of the squeeze instead. It is the single biggest legibility win on the
     * board and it costs nothing that matters here.
     */
    tex.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() ?? 8;
    faceTexCache.current.set(key, tex);
    return tex;
  };

  const create3DCardMeshHelper = (
    card: RenderCard,
    isOpponent: boolean,
    initialX: number,
    initialY: number
  ): THREE.Group => {
    const buildStart = performance.now();
    const cardWidth = 1.8;
    const cardHeight = 2.7;
    const cardDepth = 0.06;

    const group = new THREE.Group();
    group.name = `card_${card.instanceId}`;

    const spawnY = isOpponent ? initialY + 3.0 : initialY - 3.5;
    const spawnZ = 2.5;
    group.position.set(initialX, spawnY, spawnZ);
    group.rotation.x = isOpponent ? 0.4 : -0.4;

    /*
     * Half resolution for the face in play.
     *
     * A card face is drawn at 2048x3072; seven of those arrive in the opening hand at once,
     * plus the board, which is around 25MB of texture each to rasterise and upload — the
     * stall at the start of a match. On the board a card is a couple of hundred pixels
     * tall, so half of that is already more detail than the screen can show, and the
     * hover preview still uses the full-resolution render.
     */
    const fTex = faceTexture(card);

    /*
     * The back is the same on every card in the game, so it is drawn once and shared —
     * the singleton the deck and graveyard piles already use. It used to be rasterised
     * fresh per card mesh: a 2048x3072 canvas of filigree, over a hundred milliseconds,
     * paid again for every card that entered play. That one line was the stutter.
     */
    if (!cardBackTexRef.current) cardBackTexRef.current = createCardBackTexture();
    const bTex = cardBackTexRef.current;
    bTex.colorSpace = THREE.SRGBColorSpace;

    const matSide = new THREE.MeshBasicMaterial({ color: 0x111111, fog: false });
    const matFront = new THREE.MeshBasicMaterial({ map: fTex, fog: false });
    const matBack = new THREE.MeshBasicMaterial({ map: bTex, fog: false });

    const geom = new THREE.BoxGeometry(cardWidth, cardHeight, cardDepth);
    const mats = [matSide, matSide, matSide, matSide, matFront, matBack];
    const cardMesh = new THREE.Mesh(geom, mats);
    cardMesh.name = 'mainCardBox';
    cardMesh.castShadow = true;
    cardMesh.receiveShadow = true;
    group.add(cardMesh);

    const colorHexMap: Record<string, string> = {
      W: '#f0f0f0',
      U: '#a0c8ff',
      B: '#b080ff',
      R: '#ff6b6b',
      G: '#6bff9d',
      C: '#ffffff',
    };
    const themeHex = colorHexMap[card.color] || '#ffffff';
    /*
     * The border effect runs the card's own gradient, corner to corner, rather than one
     * flat colour — the same pair the frame is drawn with, so a gold-and-purple dual reads
     * as gold and purple in three dimensions too.
     */
    const borderMesh = BorderFactory.create(
      card.borderType || 1,
      card.color1 || themeHex,
      card.color2 || card.color1 || themeHex,
    );
    borderMesh.name = 'borderGroup';
    borderMesh.scale.set(cardWidth / 2.4, cardHeight / 3.6, 1);
    group.add(borderMesh);

    if (card.holoType !== undefined) {
      const holoGroup = createHologramGroup(card.holoType, card.color1 || themeHex, card.color2 || card.color1);
      holoGroup.name = 'holoGroup';
      holoGroup.position.set(0, 0.4, cardDepth / 2 + 0.2);
      holoGroup.scale.set(0.5, 0.5, 0.5);
      group.add(holoGroup);
    }

    group.userData = { instanceId: card.instanceId, isOpponent, card };
    buildMsRef.current += performance.now() - buildStart;

    group.renderOrder = 100;
    group.traverse((child) => {
      child.renderOrder = 100;
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => {
            m.fog = false;
          });
        } else if (child.material) {
          child.material.fog = false;
        }
      }
    });

    return group;
  };

  // Publish a world -> screen projector so DOM effects can sit on top of the board.
  useEffect(() => {
    if (!onProjector) return;
    const project = (key: string) => {
      const cam = cameraRef.current;
      const el = containerRef.current;
      if (!cam || !el) return null;
      const v = worldOf(key);
      if (!v) return null;
      v.project(cam);
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + ((v.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - v.y) / 2) * rect.height,
      };
    };
    onProjector(project);

    if (import.meta.env.VITE_TEST_HOOK) {
      (window as any).__fx = {
        surge: () => { mastSurgeRef.current = clockRef.current.getElapsedTime(); },
        // Fire projectiles on demand, so a harness can price one style against the other.
        throw: (from: string, to: string, style: 'bolt' | 'duel') =>
          shoot(from, to, 0xffffff, undefined, style),
      };
    }
    onFxApi?.({
      shoot: (from, to, colour) => shoot(from, to, colour),
      duel: (from, to, colour) => shoot(from, to, colour, undefined, 'duel'),
      surge: () => { mastSurgeRef.current = clockRef.current.getElapsedTime(); },
      /*
       * How tall a card on the table is, in screen pixels. Effects drawn over the board
       * have to match the thing they are drawn over — a card breaking apart has to be the
       * size of the card that broke — and that depends on the camera, not on a guess.
       */
      /*
       * Draw the faces for a whole deck before anything needs them.
       *
       * Rasterising a card face and uploading it is the bulk of what a card costs to
       * appear — measured at 177ms — and paying it mid-game is the hitch you see when a
       * creature hits the table. This walks a list a few at a time in idle slots, so the
       * cost lands during the opening instead, where nothing is moving.
       */
      warmFaces: (cards: RenderCard[]) => {
        let i = 0;
        const step = () => {
          const until = performance.now() + 8;
          while (i < cards.length && performance.now() < until) faceTexture(cards[i++]);
          if (i < cards.length) {
            const idle = (window as any).requestIdleCallback;
            if (idle) idle(step, { timeout: 200 });
            else window.setTimeout(step, 16);
          }
        };
        step();
      },
      cardPixels: () => {
        const cam = cameraRef.current;
        const el = containerRef.current;
        if (!cam || !el) return 120;
        const a = new THREE.Vector3(0, 0, 0).project(cam);
        const b = new THREE.Vector3(0, 2.7, 0).project(cam);
        return Math.abs(((a.y - b.y) / 2) * el.getBoundingClientRect().height);
      },
    });
    /*
     * How tall a card actually is on the glass, in real pixels — for the board and for the
     * hand, which is both nearer the camera and scaled up. The face texture only has to beat
     * this number; guessing at it is how the type ended up softer than the screen it is on.
     */
    if (import.meta.env.VITE_TEST_HOOK) {
      (window as any).__cardPx = () => {
        const cam = cameraRef.current;
        const el = containerRef.current;
        if (!cam || !el) return null;
        const r = el.getBoundingClientRect();
        const dp = rendererRef.current?.getPixelRatio() ?? 1;
        // The card's own edges in screen pixels. An axis-aligned box says nothing here: a
        // hand card is fanned, and rotation inflates the box far past the card inside it.
        const edges = (o: THREE.Object3D | undefined) => {
          if (!o) return null;
          o.updateWorldMatrix(true, false);
          const at = (x: number, y: number) => {
            const v = new THREE.Vector3(x, y, 0).applyMatrix4(o.matrixWorld).project(cam);
            return { x: (v.x / 2) * r.width * dp, y: (v.y / 2) * r.height * dp };
          };
          const a = at(-0.9, -1.35), b = at(0.9, -1.35), c = at(0.9, 1.35);
          return {
            w: Math.round(Math.hypot(b.x - a.x, b.y - a.y)),
            h: Math.round(Math.hypot(c.x - b.x, c.y - b.y)),
          };
        };
        const widest = (ms: THREE.Group[]) =>
          ms.filter((m) => m.visible).reduce((best, m) => {
            const e = edges(m);
            return e && (!best || e.h > best.h) ? e : best;
          }, null as { w: number; h: number } | null);
        const capPx = () => {
          const cap = endTurnButtonRef.current?.getObjectByName('buttonCap');
          if (!cap) return null;
          const box = new THREE.Box3().setFromObject(cap);
          if (box.isEmpty()) return null;
          let l = Infinity, rr = -Infinity, lo = Infinity, hi = -Infinity;
          for (let i = 0; i < 8; i += 1) {
            const v = new THREE.Vector3(
              i & 1 ? box.max.x : box.min.x,
              i & 2 ? box.max.y : box.min.y,
              i & 4 ? box.max.z : box.min.z,
            ).project(cam);
            l = Math.min(l, v.x); rr = Math.max(rr, v.x);
            lo = Math.min(lo, v.y); hi = Math.max(hi, v.y);
          }
          return { w: Math.round(((rr - l) / 2) * r.width * dp), h: Math.round(((hi - lo) / 2) * r.height * dp) };
        };
        return {
          button: capPx(),
          buttonTex: isTouch() ? capTexSize(rendererRef.current) : 512,
          board: widest([...cardMeshMapRef.current.values()]),
          hand: widest([...handMeshMapRef.current.values()]),
          face: Math.round(2048 * faceScale(rendererRef.current)),
          ratio: dp,
        };
      };
    }
  }, [onProjector, onFxApi]);

  // Keep the 3D board button's face in sync with the current primary action.
  useEffect(() => {
    const mat = buttonCapMatRef.current;
    if (!mat) return;
    mat.map?.dispose();
    mat.map = createButtonCanvasTexture(primaryEnabled, primaryLabel);
    mat.needsUpdate = true;
    if (import.meta.env.VITE_TEST_HOOK) {
      (window as any).__buttonLabel = primaryLabel;
      // How far the cap currently sits above its seat, so a harness can watch it travel.
      (window as any).__buttonCapZ = () =>
        (endTurnButtonRef.current?.getObjectByName('buttonCap') as THREE.Mesh | undefined)
          ?.position.z ?? null;
      (window as any).__buttonHover = () => isEndTurnHoveredRef.current;
      /*
       * When each card in hand was released from the library, in scene seconds. Two cards drawn
       * by one spell must differ by one draw step — a thing that cannot be seen in a screenshot
       * and cannot be sampled reliably on a slow renderer, so it is asserted from the numbers.
       */
      (window as any).__handHolds = () => {
        const out: { id: string; at: number }[] = [];
        handMeshMapRef.current.forEach((g, id) => {
          const ud = g.userData as { dealFrom?: number; dealOrder?: number };
          if (typeof ud.dealFrom === 'number') {
            out.push({ id, at: +dealGate(ud.dealFrom, ud.dealOrder ?? 0).toFixed(4) });
          }
        });
        return out;
      };
      // How many cards the board is actually drawing, and how many shots are in flight.
      // Whether the opening camera move has finished, straight from the loop rather than
      // from the class the screen applies a beat later.
      (window as any).__cameraLanded = () => introRef.current === null;
      // Where the camera is sitting, so a harness can watch it change seats with the turn.
      (window as any).__camPos = () => {
        const c = cameraRef.current;
        return c ? { x: +c.position.x.toFixed(3), y: +c.position.y.toFixed(3), z: +c.position.z.toFixed(3) } : null;
      };
      // How many hand cards are actually on screen — an undealt one must not be.
      (window as any).__handVisible = () => {
        let n = 0;
        handMeshMapRef.current.forEach((g) => { if (g.visible) n += 1; });
        return n;
      };
      (window as any).__boardCards = () => cardMeshMapRef.current.size;
      // What one frame actually costs the GPU, and what the board is asking it to do.
      (window as any).__cost = () => {
        const r = rendererRef.current;
        if (!r) return null;
        const dp = new THREE.Vector2();
        r.getDrawingBufferSize(dp);
        let meshes = 0, lights = 0, shadows = 0, transparent = 0;
        sceneRef.current?.traverse((o: any) => {
          if (o.isMesh || o.isPoints || o.isLine) meshes += 1;
          if (o.isLight) { lights += 1; if (o.castShadow) shadows += 1; }
          if (o.material && (Array.isArray(o.material) ? o.material : [o.material]).some((m: any) => m?.transparent)) transparent += 1;
        });
        return {
          calls: r.info.render.calls, tris: r.info.render.triangles,
          programs: r.info.programs?.length ?? 0,
          textures: r.info.memory.textures, geometries: r.info.memory.geometries,
          buffer: [dp.x, dp.y], pixels: dp.x * dp.y,
          shadowMaps: r.shadowMap.enabled, shadowAuto: r.shadowMap.autoUpdate,
          meshes, lights, shadowCasters: shadows, transparent,
        };
      };
      // Everything the pointer's ray passes through at a screen point, in order.
      (window as any).__pick = (cx: number, cy: number) => {
        const el = containerRef.current, cam = cameraRef.current;
        if (!el || !cam) return null;
        const r = el.getBoundingClientRect();
        mouseRef.current.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
        raycasterRef.current.setFromCamera(mouseRef.current, cam);
        return raycasterRef.current
          .intersectObjects(cardsGroupRef.current?.children || [], true)
          .slice(0, 8)
          .map((h) => {
            let n: any = h.object;
            while (n && !n.userData.instanceId) n = n.parent;
            return { name: h.object.name || h.object.type, iid: n?.userData?.instanceId ?? null };
          });
      };
      // The keywords printed on a card that is on the table right now, and how far it has
      // collapsed: a regenerated creature comes apart and reassembles without leaving.
      (window as any).__cardKw = (iid: string) =>
        ((cardMeshMapRef.current.get(iid)?.userData as any)?.card?.liveKw as string[]) ?? null;
      (window as any).__cardScale = (iid: string) =>
        (cardMeshMapRef.current.get(iid)?.userData as any)?.targetScale ?? null;
      (window as any).__inFlight = () => shotsRef.current.length;
      // Where every card is being laid out, so a harness can watch a row hold still.
      (window as any).__cardSlots = () => {
        const out: Record<string, { x: number; y: number; s: number }> = {};
        cardMeshMapRef.current.forEach((g, iid) => {
          const ud = g.userData as any;
          if (typeof ud.targetX !== 'number') return;
          out[iid] = {
            x: +ud.targetX.toFixed(3), y: +ud.targetY.toFixed(3),
            s: +(ud.targetScale ?? 1).toFixed(3),
          };
        });
        return out;
      };
      // What border each card on the board is actually wearing, and whether anything at
      // all was built for it.
      (window as any).__cardBorders = () => {
        const out: Record<string, { type: number; parts: number; name: string }> = {};
        cardMeshMapRef.current.forEach((g, iid) => {
          const card = g.userData.card as RenderCard | undefined;
          const bg = g.getObjectByName('borderGroup');
          if (!card) return;
          out[iid] = {
            type: card.borderType,
            parts: bg ? bg.children.length : -1,
            name: card.name,
          };
        });
        return out;
      };
      // The arena's own motion: the deck ring's angle, and one mast's.
      // Whether each die is wearing its gold targeting rim, and how bright it is.
      (window as any).__dieRim = () => {
        const read = (r: React.RefObject<THREE.Group | null>) => {
          const rim = r.current?.getObjectByName('dieRim') as THREE.Mesh | undefined;
          const wash = r.current?.getObjectByName('dieWash') as THREE.Mesh | undefined;
          if (!rim) return null;
          const m = rim.material as THREE.MeshBasicMaterial;
          const w = wash?.material as THREE.MeshBasicMaterial | undefined;
          return {
            on: rim.visible,
            colour: `#${m.color.getHexString()}`,
            opacity: +m.opacity.toFixed(2),
            thickness: +((rim.scale.x - 1) * 100).toFixed(1),
            lift: +(((r.current?.getObjectByName('lifeDie')?.userData.lift as number) ?? 0)).toFixed(3),
            wash: w ? { on: !!wash?.visible, opacity: +w.opacity.toFixed(2) } : null,
          };
        };
        return { you: read(playerHudMeshRef), foe: read(opponentHudMeshRef) };
      };
      (window as any).__arenaSpin = () => {
        const a = arenaRef.current;
        if (!a) return null;
        const mast = a.children.find((c) => c.name === 'mast');
        return {
          ring: a.getObjectByName('deckRing')?.rotation.z ?? null,
          mast: mast ? mast.rotation.z : null,
        };
      };
      // The living sky, one sample: enough for a harness to prove everything moves.
      (window as any).__bg = () => {
        const a2 = arenaRef.current;
        if (!a2) return null;
        const one = (n: string) => a2.children.find((c) => c.name === n);
        const shuttle = one('shuttle');
        const moon = one('moon');
        const gyre = one('gyre');
        const comet = one('comet');
        const rocks = one('rockBelt');
        return {
          shuttle: shuttle ? [+shuttle.position.x.toFixed(2), +shuttle.position.y.toFixed(2)] : null,
          moon: moon ? [+moon.position.x.toFixed(2), +moon.position.z.toFixed(2)] : null,
          gyreSpin: gyre ? +((gyre.children[0]?.rotation.z ?? 0).toFixed(3)) : null,
          cometVisible: comet ? comet.visible : null,
          rockSpin: rocks ? +rocks.children[0].rotation.x.toFixed(3) : null,
          counts: {
            gyre: a2.children.filter((c) => c.name === 'gyre').length,
            shuttle: a2.children.filter((c) => c.name === 'shuttle').length,
            moon: a2.children.filter((c) => c.name === 'moon').length,
          },
        };
      };
    }
  }, [primaryLabel, primaryEnabled]);

  /*
   * The card under the cursor used to also get a dashed marquee on top of it. With the
   * rim light already saying which cards are choosable, that second frame was just extra
   * furniture, so the hovered card is now marked by the lift and the rim alone.
   */

  // Ring-highlight cards the current step invites you to click. Colour carries the
  // role: cool blue for "act with this one of yours", warm gold for "pick this target".
  useEffect(() => {
    const ids = new Set(highlightIds || []);
    const glows = new Set(glowIds ?? highlightIds ?? []);
    const tint = highlightRole === 'target' ? 0xffc46b : 0x7fd8ff;
    const apply = (map: Map<string, THREE.Group>) => {
      map.forEach((group, iid) => {
        const on = glows.has(iid);
        const aiming = iid === aimSourceId;
        group.userData.highlighted = ids.has(iid);
        group.userData.isAimSource = aiming;
        if (!on && !aiming) {
          const existing = group.getObjectByName('glowHalo') as THREE.Mesh | undefined;
          if (existing) existing.visible = false;
          return;
        }
        const halo = ensureGlow(group);
        halo.visible = true;
        // The card being aimed from is the one you already committed to: solid white.
        (halo.material as THREE.MeshBasicMaterial).color.setHex(aiming ? 0xffffff : tint);
      });
    };
    apply(cardMeshMapRef.current);
    apply(handMeshMapRef.current);
  }, [highlightIds, glowIds, highlightRole, aimSourceId]);

  // Synchronize 3D Floating Player Hand Cards
  useEffect(() => {
    if (!cardsGroupRef.current) return;
    const cardsGroup = cardsGroupRef.current;
    const currentHandIds = new Set<string>();

    const total = playerHand.length;
    const centerIndex = (total - 1) / 2;
    /*
     * Half again the size on a phone, and no taller on screen for it.
     *
     * A hand card is 1.8 x 2.7 and on a 375-tall phone that lands at about ninety pixels
     * across — the rules text on it is theoretically present and practically unreadable.
     * Growing it is the only thing that actually fixes that. The fan is then dropped by
     * half the height it gained, so the *top* edge of the hand stays exactly where it was
     * and the extra size goes off the bottom of the screen rather than up over the board:
     * the band the hand occupies is unchanged, the part of the card you read is bigger.
     * The spread widens with it, or the cards would sit on top of one another.
     */
    const HAND_SCALE = isTouch() ? 1.4 : 1;
    const maxSpan = 9.0 * (isTouch() ? 1.2 : 1);
    const spacing = Math.min(1.35 * HAND_SCALE, maxSpan / Math.max(1, total));
    const startX = -((total - 1) * spacing) / 2;
    /** Half the height the card gained, in world units — how far the fan moves down. */
    const handDrop = 1.35 * (HAND_SCALE - 1);

    /*
     * How many cards this update is dealing, so each can be held back one interval longer, and
     * the one moment they are all counted from. Read once: `getElapsedTime` advances the clock
     * as it answers, so asking it per card drifted the interval by a frame each time.
     */
    let born = 0;
    const dealtAt = clockRef.current.getElapsedTime();

    playerHand.forEach((card, idx) => {
      currentHandIds.add(card.instanceId);
      const offsetFromCenter = idx - centerIndex;
      const targetX = startX + idx * spacing;
      // Symmetric arc: the centre of the fan sits highest and closest, and both
      // edges fall away equally. (Depth used to climb with the index, which tilted
      // the whole fan up toward the right.)
      const yArcOffset = Math.pow(Math.abs(offsetFromCenter), 1.4) * 0.04;
      const targetRotZ = -offsetFromCenter * (2.5 * Math.PI / 180); // -2.5 degrees fan rotation
      const targetRotX = 0.58; // Standing upright facing the user camera
      /*
       * Depth must climb left-to-right so every card is overlapped by the one on its
       * right. Because the cards are tilted back, a card's own depth varies with its
       * height: dropping a card by dy also pushes it back by dy*tan(tilt). The arc
       * therefore leaked into depth and made the middle of the fan win. Cancelling
       * that term first leaves a clean, purely index-driven ordering.
       */
      const zStep = 0.09;
      const targetZ = 2.0 + idx * zStep - yArcOffset * Math.tan(targetRotX);
      /*
       * ...but depth is not free on screen. The camera looks down at the board, so moving
       * a card toward it also moves it *up* in the frame — which is why the fan kept
       * climbing to the right even though its arc was symmetric. The screen height of a
       * point here is 0.778*y + 0.628*z, so each step of depth is paid for with 0.806 of
       * a step of height. Layering is untouched: z still rises left to right.
       */
      const targetY = -7.35 - handDrop - yArcOffset - (idx - centerIndex) * zStep * (0.628 / 0.778);

      let meshGroup = handMeshMapRef.current.get(card.instanceId);
      if (!meshGroup) {
        // Spawn at the deck so the card visibly travels from the library into the fan.
        meshGroup = create3DCardMeshHelper(card, false, 9.0, -3.2);
        meshGroup.position.set(9.0, -3.2, 2.4);
        meshGroup.userData.isHand = true;
        /*
         * ...and wait its turn on the library. Two cards arriving in one step used to leave the
         * deck on the same frame and fly across together, which reads as one event: the player
         * sees a hand grow by two rather than two cards being drawn. Each card past the first
         * holds on the deck for one interval, so a draw of two is two draws — and the interval
         * is the one the engine already puts between the two draw sounds, so the card and its
         * riffle arrive together.
         */
        // Not before the camera is nearly down: the opening hand should be dealt into a table
        // you are already looking at, not into one still rushing toward you.
        meshGroup.userData.dealFrom = dealtAt;
        meshGroup.userData.dealOrder = born;
        const hold = dealGate(dealtAt, born);
        /*
         * Hidden from the moment it exists, not from the next frame. Waiting for the loop to
         * hide it leaves one frame in which a card that has not been dealt is sitting on the
         * library in full view — a single frame at 60fps is a flicker, and at the start of a
         * match, where the whole hand is created at once, it is seven of them.
         */
        if (hold > dealtAt) { meshGroup.visible = false; meshGroup.userData.held = true; }
        born += 1;
        cardsGroup.add(meshGroup);
        handMeshMapRef.current.set(card.instanceId, meshGroup);
      }

      // The pointer target for this card: same footprint, parked at the resting slot.
      let hit = handHitMapRef.current.get(card.instanceId);
      if (!hit) {
        hit = new THREE.Mesh(
          new THREE.PlaneGeometry(1.8 * HAND_SCALE, 2.7 * HAND_SCALE),
          new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
        );
        hit.name = 'handHit';
        hit.userData.instanceId = card.instanceId;
        hit.userData.isHand = true;
        cardsGroup.add(hit);
        handHitMapRef.current.set(card.instanceId, hit);
      }
      hit.position.set(targetX, targetY, targetZ);
      hit.rotation.set(targetRotX, 0, targetRotZ);
      hit.userData.card = card;

      meshGroup.userData.handIndex = idx;
      meshGroup.userData.handScale = HAND_SCALE;
      meshGroup.userData.targetX = targetX;
      meshGroup.userData.targetY = targetY;
      meshGroup.userData.targetZ = targetZ;
      meshGroup.userData.targetRotZ = targetRotZ;
      meshGroup.userData.targetRotX = targetRotX;
      meshGroup.userData.card = card;
      meshGroup.userData.isHand = true;
    });

    // A card that leaves the hand is spent, not deleted: it rises off the fan, turns
    // face-on and burns away, so a resolved spell has a visible exit instead of blinking
    // out of existence.
    handHitMapRef.current.forEach((hit, id) => {
      if (currentHandIds.has(id)) return;
      hit.parent?.remove(hit);
      hit.geometry.dispose();
      (hit.material as THREE.Material).dispose();
      handHitMapRef.current.delete(id);
    });

    handMeshMapRef.current.forEach((group, id) => {
      if (currentHandIds.has(id)) return;
      handMeshMapRef.current.delete(id);
      // Clone first: some materials are shared between cards, and fading one must not
      // drag the rest of the board down with it.
      group.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.material) return;
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => Object.assign(m.clone(), { transparent: true }))
          : Object.assign(mesh.material.clone(), { transparent: true });
      });
      spentMeshesRef.current.push({
        group,
        start: clockRef.current.getElapsedTime(),
        from: group.position.clone(),
        rotZ: group.rotation.z,
      });
    });
  }, [playerHand]);

  // Synchronize player & opponent battlefield cards into 3D meshes with fluid placement
  useEffect(() => {
    if (!cardsGroupRef.current) return;
    const cardsGroup = cardsGroupRef.current;

    const currentCardIds = new Set<string>();

    /**
     * Two rows per side. Creatures hold the front on their own; everything else — lands,
     * free-standing artifacts and enchantments, and anything attached to a creature —
     * shares the back shelf, kept in those three groups so the shelf still reads as
     * sorted rather than as a pile. Attachments used to be tucked under their host, which
     * buried them and made them easy to click by mistake.
     */
    const splitSide = (cards: RenderCard[]) => ({
      creatures: cards.filter((c) => c.type === 'creature'),
      lands: cards.filter((c) => c.type === 'land'),
      support: cards.filter((c) => c.type !== 'creature' && c.type !== 'land' && !c.attachedTo),
      attached: cards.filter((c) => !!c.attachedTo),
    });

    /** How wide a row may be before its cards start sliding over each other. */
    const ROW_WIDTH = 13.4;

    /** The depth step between neighbours in a row — a tie-break, not a staircase. */
    const ROW_LIFT = 0.001;

    /**
     * Positions one card and remembers it. `depth` breaks the tie when a crowded row
     * makes cards overlap: each card sits a hair in front of the one to its left, so a
     * packed row shelves cleanly instead of z-fighting.
     *
     * A hair, and no more than a hair. This step used to be 0.012, which is nothing for
     * two cards and a visible staircase for ten — the camera looks down at the board, so
     * height off the table reads as height up the screen, and every card played sat higher
     * than the one before it. One thousandth of a unit is still far more than the depth
     * buffer needs to keep the order, and a row of twelve now rises by less than a
     * hundredth of a card.
     */
    const place = (
      card: RenderCard, x: number, y: number, isOpponent: boolean, scale: number, depth = 0,
    ) => {
      currentCardIds.add(card.instanceId);
      let meshGroup = cardMeshMapRef.current.get(card.instanceId);
      if (!meshGroup) {
        meshGroup = create3DCardMeshHelper(card, isOpponent, x, y);
        cardsGroup.add(meshGroup);
        cardMeshMapRef.current.set(card.instanceId, meshGroup);
      }
      /*
       * A card that has already been destroyed but whose slot is still being held open
       * collapses where it stands: it folds down to nothing and sinks, so the gap it leaves
       * is visibly empty, while the cards on either side of it never move.
       */
      const gone = card.fallen === true;
      if (import.meta.env.VITE_TEST_HOOK) {
        // Every reposition, as it happens: a harness can then check that nothing slid
        // sideways while an exchange was still being drawn.
        const ud = meshGroup.userData as any;
        const nextScale = gone ? scale * 0.02 : scale;
        if (ud.targetX !== x || ud.targetScale !== nextScale) {
          ((window as any).__moves ??= []).push({
            iid: card.instanceId,
            x: +x.toFixed(3),
            s: +nextScale.toFixed(3),
            t: Math.round(performance.now()),
          });
        }
      }
      meshGroup.userData.targetX = x;
      meshGroup.userData.targetY = y;
      meshGroup.userData.targetZ = gone ? depth - 0.5 : depth;
      meshGroup.userData.targetRotZ = card.isTapped ? (isOpponent ? Math.PI / 2 : -Math.PI / 2) : 0;
      meshGroup.userData.targetRotX = 0;
      meshGroup.userData.targetScale = gone ? scale * 0.02 : scale;
      meshGroup.userData.isOpponent = isOpponent;
      meshGroup.userData.card = card;
    };

    /** Places a row of cards centred on x, tightening the spacing if the row is full. */
    const layoutRow = (cards: RenderCard[], y: number, want: number, isOpponent: boolean) => {
      if (!cards.length) return;
      const spacing = Math.min(want, ROW_WIDTH / cards.length);
      const startX = -((cards.length - 1) * spacing) / 2;
      cards.forEach((card, idx) =>
        place(card, startX + idx * spacing, y, isOpponent, 1, idx * ROW_LIFT));
    };

    /**
     * The back shelf. Same card size as the front row, laid out in groups with a break
     * between them — and only between groups that exist, so a side with no enchantments
     * gives all of that room back to its lands instead of holding a slot open.
     */
    const layoutShelf = (groups: RenderCard[][], y: number, isOpponent: boolean) => {
      const filled = groups.filter((g) => g.length);
      const count = filled.reduce((n, g) => n + g.length, 0);
      if (!count) return;
      const gap = 0.8;
      const breaks = gap * (filled.length - 1);
      const spacing = Math.min(2.0, (ROW_WIDTH - breaks) / count);
      let x = -(spacing * (count - 1) + breaks) / 2;
      let i = 0;
      filled.forEach((g, gi) => {
        g.forEach((card) => {
          place(card, x, y, isOpponent, 1, i * ROW_LIFT);
          x += spacing;
          i += 1;
        });
        if (gi < filled.length - 1) x += gap;
      });
    };

    const you = splitSide(playerBattlefield);
    const foe = splitSide(opponentBattlefield);

    layoutRow(you.creatures, -0.6, 2.2, false);
    layoutRow(foe.creatures, 2.8, 2.2, true);
    layoutShelf([you.lands, you.support, you.attached], -3.9, false);
    layoutShelf([foe.lands, foe.support, foe.attached], 6.3, true);

    // Mana sources wear their pip, lit only while the mana can actually be tapped.
    cardMeshMapRef.current.forEach((group) => {
      const card = group.userData.card as (RenderCard & { mana?: string[] }) | undefined;
      const existing = group.getObjectByName('manaBadge') as THREE.Mesh | undefined;
      // Lands already announce themselves by their frame and their row; the badge is for
      // the permanents that produce mana *as well as* being something else.
      const colours = card && card.type !== 'land' ? card.mana ?? [] : [];
      if (!card || !colours.length) {
        if (existing) group.remove(existing);
        return;
      }
      const ready = !card.isTapped && !(card.type === 'creature' && card.summoningSickness);
      const key = `${colours.join('')}/${ready}`;
      if (existing && group.userData.manaKey === key) return;
      if (existing) {
        (existing.material as THREE.MeshBasicMaterial).map?.dispose();
        group.remove(existing);
      }
      const badge = createManaBadge(colours, ready);
      badge.position.set(-0.6, -1.12, 0.22);
      badge.renderOrder = 320;
      group.add(badge);
      group.userData.manaKey = key;
    });

    // Keep each creature's power/toughness billboard current.
    cardMeshMapRef.current.forEach((group) => {
      const card = group.userData.card as RenderCard | undefined;
      const existing = group.getObjectByName('statPlate') as THREE.Mesh | undefined;
      if (!card || card.type !== 'creature') {
        if (existing) group.remove(existing);
        return;
      }
      const pow = card.livePow ?? card.pow ?? 0;
      const tou = (card.liveTou ?? card.tou ?? 0) - (card.damage || 0);
      const key = `${pow}/${tou}/${card.damage || 0}`;
      if (existing && group.userData.statKey === key) return;
      if (existing) {
        (existing.material as THREE.MeshBasicMaterial).map?.dispose();
        group.remove(existing);
      }
      const plate = createStatPlate(
        pow,
        tou,
        pow > (card.pow ?? 0) || (card.liveTou ?? 0) > (card.tou ?? 0),
        (card.damage || 0) > 0,
      );
      plate.position.set(0.46, -1.14, 0.22);
      group.add(plate);
      group.userData.statKey = key;
    });

    // Handle Cards Leaving Battlefield -> Animate Particle Burst & Card Dissolve Disappearance Effect
    cardMeshMapRef.current.forEach((group, id) => {
      if (!currentCardIds.has(id)) {
        const leaveT0 = import.meta.env.VITE_TEST_HOOK ? performance.now() : 0;
        const origin = group.position.clone();
        // Remember the spot, so anything still owed to this card is thrown from it.
        if (lastSeenRef.current.size > 200) lastSeenRef.current.clear();
        lastSeenRef.current.set(id, group.getWorldPosition(new THREE.Vector3()));

        // 1. Prepare card mesh materials for smooth alpha dissolve
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (Array.isArray(child.material)) {
              child.material = child.material.map((mat) => {
                const cloned = mat.clone();
                cloned.transparent = true;
                return cloned;
              });
            } else if (child.material) {
              child.material = child.material.clone();
              child.material.transparent = true;
            }
          }
        });

        // The card itself is replaced by its two severed halves.
        const dyingCard = group.userData.card as RenderCard | undefined;
        if (dyingCard && particlesGroupRef.current) {
          group.visible = false;
          const halves = buildCardHalves(group, dyingCard);
          halves.forEach((h) => particlesGroupRef.current!.add(h));

          // The stroke itself: a hot line drawn across the cut, gone in a blink.
          const slashLen = 3.4;
          const slash = new THREE.Mesh(
            new THREE.PlaneGeometry(slashLen, 0.09),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }),
          );
          slash.position.copy(group.position);
          slash.position.z += 0.4;
          slash.rotation.z = -0.34;
          slash.renderOrder = 420;
          particlesGroupRef.current.add(slash);

          const t0 = performance.now();
          const driftAnim = () => {
            const e = (performance.now() - t0) / 1000;
            const k = Math.min(1, e / 0.62);
            halves.forEach((h) => {
              const d = h.userData.drift as number;
              h.position.y += d * 0.02;
              h.position.x -= d * 0.012;
              h.position.z -= 0.014;
              h.rotation.z += d * 0.02;
              (h.material as THREE.MeshBasicMaterial).opacity = 1 - k;
            });
            (slash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - e / 0.18);
            if (k < 1) requestAnimationFrame(driftAnim);
            else {
              halves.forEach((h) => {
                particlesGroupRef.current?.remove(h);
                h.geometry.dispose();
                // The material is ours; the map on it is the shared face, which other
                // copies of this card are still wearing. It is not ours to throw away.
                (h.material as THREE.MeshBasicMaterial).dispose();
              });
              particlesGroupRef.current?.remove(slash);
            }
          };
          requestAnimationFrame(driftAnim);
        }

        dyingMeshesRef.current.set(id, {
          group,
          startTime: performance.now() / 1000,
          duration: 0.5,
          startPos: origin,
          endPos: origin,
          startRotX: group.rotation.x,
          startRotY: group.rotation.y,
          startRotZ: group.rotation.z,
        });
        cardMeshMapRef.current.delete(id);
        if (import.meta.env.VITE_TEST_HOOK) {
          const s = ((window as any).__leaveCost ??= { n: 0, ms: 0 });
          s.n += 1;
          s.ms += performance.now() - leaveT0;
        }
      }
    });
  }, [playerBattlefield, opponentBattlefield]);


  /*
   * Which card the pointer is over.
   *
   * This used to accept only a hit on the card's own box mesh, which meant every part of a
   * card that is *not* that box swallowed the click: the power/toughness plate hanging over
   * the bottom corner (drawn in front of everything, so it looks like part of the card), the
   * eligibility rim, the border effects. Clicking there did nothing at all — no selection,
   * no preview, no sound — which is exactly what "I can block but it will not let me pick
   * the creature" looks like. Now any hit that belongs to a card counts as that card.
   */

  /**
   * Launches a spell along its own arc, in the colour of whatever threw it.
   *
   * This lives in the 3D scene rather than as an overlay drawn on top of it, so the bolt
   * passes through the board's own space and light: it travels a bezier lifted off the
   * table, drags a tapering trail of embers, carries a moving light that plays across the
   * cards it passes, and detonates into a ring, a shell of sparks and a flash when it
   * arrives.
   */
  /**
   * Something thrown across the board.
   *
   * Two styles, because a spell hitting a player and a creature swinging at another
   * creature are not the same event and should not look the same. `bolt` is a burning
   * head with a corona and an ember trail, thrown high; `duel` is a spinning crescent of
   * blades with a ribboned trail, thrown flat and fast across the short gap between two
   * facing cards, and it lands as a cross-slash rather than a detonation.
   */
  const shoot = (
    fromKey: string,
    toKey0: string,
    hex: number,
    onLand?: () => void,
    style: 'bolt' | 'duel' = 'bolt',
  ) => {
    if (import.meta.env.VITE_TEST_HOOK) {
      // Every projectile the board is asked to throw, so a harness can check that one was.
      ((window as any).__shots ??= []).push({
        from: fromKey, to: toKey0, style, t: Math.round(performance.now()),
        // Whether the board could actually find the thing it was told to throw from.
        placed: !!worldOf(fromKey),
      });
    }
    const scene = sceneRef.current;
    const from = worldOf(fromKey);
    const to = worldOf(toKey0);
    if (!scene || !from || !to) {
      onLand?.();
      return;
    }
    const colour = new THREE.Color(hex);
    const group = new THREE.Group();
    group.renderOrder = 900;

    const lit = (opacity: number) =>
      new THREE.MeshBasicMaterial({
        color: colour, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });

    /*
     * One head for everything that crosses the board.
     *
     * A duel used to build its own rack of crescents — three tori, an octahedron and four
     * tetrahedra, eight meshes with eight geometries and eight materials, made and thrown
     * away again for every single swing. In a twelve-creature exchange that is a hundred
     * allocations landing in the middle of the animation, and it cost about three times
     * what this does. A swing now throws the same orb an attack on a player throws; only
     * the arc and the flight time still differ, because the two cards are a hand's width
     * apart and a high slow lob between them would look absurd.
     */
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), lit(0.95));
    group.add(ball);
    // A soft corona around the head, so it reads as light rather than a ball.
    const corona = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: particleDot(), color: colour, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    corona.scale.setScalar(1.7);
    ball.add(corona);
    const head: THREE.Object3D = ball;

    // The trail is a ring buffer of past positions, drawn as fading embers.
    const TRAIL = 46;
    const tgeo = new THREE.BufferGeometry();
    const tpos = new Float32Array(TRAIL * 3);
    for (let i = 0; i < TRAIL; i++) {
      tpos[i * 3] = from.x;
      tpos[i * 3 + 1] = from.y;
      tpos[i * 3 + 2] = from.z;
    }
    tgeo.setAttribute('position', new THREE.BufferAttribute(tpos, 3));
    const trail = new THREE.Points(
      tgeo,
      new THREE.PointsMaterial({
        color: colour, size: style === 'duel' ? 0.24 : 0.34, map: particleDot(),
        transparent: true, opacity: style === 'duel' ? 0.9 : 0.8,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
      }),
    );
    group.add(trail);

    const lightSlot = takeLight(hex, style === 'duel' ? 2.4 : 3.2, style === 'duel' ? 6 : 9);

    scene.add(group);

    // Arc: lifted off the table, and bowed sideways by an amount that varies per shot so
    // a volley fans out instead of retracing one line. A duel is thrown lower and harder,
    // because the two cards are a hand's width apart and a high lob would look absurd.
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const away = to.clone().sub(from);
    const side = new THREE.Vector3(-away.y, away.x, 0).normalize();
    const swing = (shotsRef.current.length % 5) - 2;
    const toKey = toKey0;
    const ctrl = style === 'duel'
      ? mid
          .add(new THREE.Vector3(0, 0, 1.25 + away.length() * 0.1))
          .add(side.multiplyScalar(swing * 0.42 + 0.6))
      : mid
          .add(new THREE.Vector3(0, 0, 3.2 + away.length() * 0.16))
          .add(side.multiplyScalar(swing * 1.1));

    fxTallyRef.current.shots += 1;
    shotsRef.current.push({
      group, head, trail, lightSlot, from, ctrl, to, toKey, swing, colour,
      start: clockRef.current.getElapsedTime(),
      dur: style === 'duel' ? FLIGHT_SECONDS.duel : FLIGHT_SECONDS.bolt,
      style,
      onLand,
      landed: false,
    });
  };

  /**
   * What a shot leaves behind.
   *
   * A bolt detonates: an expanding ring, a shell of sparks and a flash of light. A duel
   * cuts: two crossed slashes that stretch open and thin out, a tight shockwave, and a
   * spray of shards thrown sideways rather than a sphere — the difference between being
   * hit by magic and being hit by something with an edge.
   */
  const burstAt = (
    at: THREE.Vector3,
    hex: number,
    style: 'bolt' | 'duel' = 'bolt',
    /**
     * How big the detonation is. A blow that reaches a player is the loud one and keeps its
     * full size; one that lands on a creature is drawn at half, because the ring was as wide
     * as the card underneath it and buried the thing it was meant to be happening to.
     */
    scale = 1,
  ) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const colour = new THREE.Color(hex);

    if (style === 'duel') {
      const cut = new THREE.Group();
      cut.position.copy(at);
      cut.lookAt(cameraRef.current ? cameraRef.current.position : new THREE.Vector3(0, -12, 15));
      const bladeMat = () =>
        new THREE.MeshBasicMaterial({
          color: colour, transparent: true, opacity: 1,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        });
      for (const ang of [0.72, -0.72]) {
        const slash = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.13), bladeMat());
        slash.rotation.z = ang;
        cut.add(slash);
      }
      const shock = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 8, 40), bladeMat());
      cut.add(shock);
      scene.add(cut);

      const M = 34;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(M * 3);
      const vel = new Float32Array(M * 3);
      for (let i = 0; i < M; i++) {
        pos[i * 3] = at.x;
        pos[i * 3 + 1] = at.y;
        pos[i * 3 + 2] = at.z;
        // Thrown along the two cut lines rather than spherically.
        const along = (i % 2 ? 0.72 : -0.72) + (Math.random() - 0.5) * 0.5;
        const speed = 3.2 + Math.random() * 5;
        vel[i * 3] = Math.cos(along) * speed * (Math.random() < 0.5 ? -1 : 1);
        vel[i * 3 + 1] = Math.sin(along) * speed * (Math.random() < 0.5 ? -1 : 1);
        vel[i * 3 + 2] = Math.random() * 2.2;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const shards = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          color: colour, size: 0.22, map: particleDot(), transparent: true, opacity: 1,
          depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
        }),
      );
      scene.add(shards);

      const slot = takeLight(hex, 6, 10);
      if (slot) slot.light.position.copy(at);

      fxTallyRef.current.bursts += 1;
      burstsRef.current.push({
        points: shards, ring: cut, vel, lightSlot: slot,
        start: clockRef.current.getElapsedTime(), dur: IMPACT_SECONDS.duel, style: 'duel',
      });
      return;
    }

    const N = 70;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = at.x;
      pos[i * 3 + 1] = at.y;
      pos[i * 3 + 2] = at.z;
      // An even spread over a sphere, squashed a little toward the table.
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = (2.6 + Math.random() * 4.4) * scale;
      const sr = Math.sqrt(1 - u * u);
      vel[i * 3] = Math.cos(t) * sr * r;
      vel[i * 3 + 1] = Math.sin(t) * sr * r;
      vel[i * 3 + 2] = u * r * 0.7 + 1.2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: colour, size: 0.3, map: particleDot(), transparent: true, opacity: 1,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
      }),
    );
    scene.add(points);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5 * scale, 0.075 * scale, 8, 48),
      new THREE.MeshBasicMaterial({
        color: colour, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    ring.position.copy(at);
    ring.lookAt(cameraRef.current ? cameraRef.current.position : new THREE.Vector3(0, -12, 15));
    scene.add(ring);

    const lightSlot = takeLight(hex, 9, 16);
    if (lightSlot) lightSlot.light.position.copy(at);

    fxTallyRef.current.bursts += 1;
    burstsRef.current.push({
      points, ring, lightSlot, vel,
      start: clockRef.current.getElapsedTime(),
      dur: IMPACT_SECONDS.bolt,
    });
  };

  /** Fixed points on the board that effects and overlays can aim at by name. */
  const ANCHORS: Record<string, [number, number, number]> = {
    'hero-you': [DIE_X, DIE_Y.you, 1.0],
    'hero-foe': [DIE_X, DIE_Y.foe, 1.0],
    // The board button, so effects and harnesses can aim at it by name.
    button: [9.0, 1.2, 0.4],
    'deck-you': [9.0, -3.2, 0.4],
    'deck-foe': [9.0, 5.0, 0.4],
    // The graveyards, where a spell goes the instant it resolves — so the orb it throws
    // can be seen to leave from the card that threw it.
    'gy-you': [9.0, -5.2, 0.6],
    'gy-foe': [9.0, 6.6, 0.6],
    board: [0, 0, 0.4],
  };

  /**
   * Where a card stood when it left the board.
   *
   * A blow is thrown from the card that threw it, by instance id — and a creature can be
   * off the board by the time the blow it struck is drawn, at which point there is no mesh
   * to ask. Falling back to a named anchor would throw it from the graveyard pile in the
   * corner; falling back to nothing would drop the projectile entirely. It throws from
   * where the creature was standing instead, which is what anyone watching expects.
   */
  const lastSeenRef = useRef<Map<string, THREE.Vector3>>(new Map());

  /**
   * The scene object a tutorial key names. One table, so the rectangle the coach measures
   * and the silhouette it lights are guaranteed to be the same thing.
   */
  const objectOf = (key: string): THREE.Object3D | null => {
    switch (key) {
      // The spinner, not the whole die group: the group also carries a drawn ground shadow
      // that is wider than the die and sits well below it.
      case 'die-you': return playerHudMeshRef.current?.getObjectByName('dieBody') ?? null;
      case 'die-foe': return opponentHudMeshRef.current?.getObjectByName('dieBody') ?? null;
      case 'button': return endTurnButtonRef.current;
      case 'deck-you': return playerDeckMeshRef.current;
      case 'deck-foe': return opponentDeckMeshRef.current;
      case 'gy-you': return playerGraveyardMeshRef.current;
      case 'gy-foe': return opponentGraveyardMeshRef.current;
      default: {
        const g = cardMeshMapRef.current.get(key) || handMeshMapRef.current.get(key);
        return g ?? null;
      }
    }
  };

  /** World position of a card or a named anchor. `top:<iid>` gives a card's upper edge. */
  const worldOf = (key: string): THREE.Vector3 | null => {
    const topOf = key.startsWith('top:');
    const id = topOf ? key.slice(4) : key;
    const mesh = cardMeshMapRef.current.get(id) || handMeshMapRef.current.get(id);
    if (mesh) {
      const v = mesh.getWorldPosition(new THREE.Vector3());
      if (topOf) {
        v.add(
          new THREE.Vector3(0, 1.45, 0).applyQuaternion(
            mesh.getWorldQuaternion(new THREE.Quaternion()),
          ),
        );
      }
      return v;
    }
    const seen = lastSeenRef.current.get(id);
    if (seen) return seen.clone();
    if (ANCHORS[key]) return new THREE.Vector3(...ANCHORS[key]);
    return null;
  };

  const pickCard = (): THREE.Object3D | null => {
    const hits = raycasterRef.current.intersectObjects(cardsGroupRef.current?.children || [], true);
    for (const hit of hits) {
      /*
       * Only the card's own body counts — its box, and the stat plate that hangs off the
       * corner and reads as part of it. Everything else a card carries is bigger than the
       * card itself: the eligibility rim overhangs it, and several border effects are wider
       * still, so accepting those made a card's reach spill over its neighbours and the
       * pointer kept hovering a card it had already left.
       */
      const n = hit.object.name;
      if (n !== 'mainCardBox' && n !== 'statPlate' && n !== 'manaBadge' && n !== 'handHit') continue;
      let node: THREE.Object3D | null = hit.object;
      while (node && !node.userData.instanceId) node = node.parent;
      if (!node || !node.userData.card) continue;
      // The hand answers only through its proxies, so a lifted card never steals the slot
      // beside it.
      if (n !== 'handHit' && node.userData.isHand) continue;
      return node;
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current) return;
    // `click` is a MouseEvent and carries no pointerType, so the kind of pointer that
    // opened the gesture is remembered here for it.
    lastPointerTypeRef.current = e.pointerType;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    mouseRef.current.set(x, y);
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };

    // Press the board button on the way down, not on the way up.
    if (endTurnButtonRef.current && primaryEnabled) {
      const hits = raycasterRef.current.intersectObjects(endTurnButtonRef.current.children, true);
      if (hits.length > 0) buttonPressUntilRef.current = performance.now() + 150;
    }

    const topObj = pickCard();
    /*
     * What the press landed on, kept for the tap that follows.
     *
     * A tap is resolved twice — once here and once when the click arrives — and by the
     * second time the board has already reacted to the first: pressing a card opens the
     * reader and lifts the card, so the ray that hit its box on the way down passes under
     * it on the way up and finds only the glow, which is wider. On a phone that turned
     * aiming an arrival trigger at a creature into cancelling it, because a tap that hits
     * nothing is the gesture that calls the spell off. What the finger was pointing at is
     * what it pressed.
     */
    pressPickRef.current = { obj: topObj, x: e.clientX, y: e.clientY };

    /*
     * Press to read, let go to put it back.
     *
     * A finger has no hover, so the reader has to hang off press and release instead. It
     * opens on the way down — before any drag begins — so the card you are about to pull
     * out of hand is legible while you pull it, and it closes in handlePointerUp. That is
     * also why the tap that follows must not re-open it: see handleClick.
     */
    if (e.pointerType === 'touch' && onHoverCard) {
      const card = topObj?.userData?.card as RenderCard | undefined;
      onHoverCard(card ?? null);
    }
    /*
     * Arm a combat drag. Nothing is committed yet — a press that never travels stays a tap
     * and goes through handleClick exactly as before, so tap-then-tap still works for
     * anyone who prefers it.
     */
    boardDragRef.current = null;
    // Not while a spell is already aiming — there the pointer belongs to the target picker,
    // and a drag would spend the cast on whatever it happened to pass over.
    if (e.pointerType === 'touch' && !aimSourceIdRef.current
        && topObj && !topObj.userData.isHand && topObj.userData.card) {
      boardDragRef.current = {
        iid: topObj.userData.instanceId,
        mine: !topObj.userData.isOpponent,
        live: false,
      };
    }
    {
      // No dragging while an arrow is out: the pointer belongs to the aiming step until
      // a target is clicked (or the cast is cancelled).
      if (topObj && topObj.userData.isHand && !aimSourceIdRef.current) {
        dragging3DInstanceIdRef.current = topObj.userData.instanceId;
        const hitPoint = new THREE.Vector3();
        raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, hitPoint);
        dragPlanePointRef.current = hitPoint;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    mouseRef.current.set(x, y);
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    // Update 3D Dragging position
    if (dragging3DInstanceIdRef.current) {
      const hitPoint = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, hitPoint);
      dragPlanePointRef.current = hitPoint;
      return;
    }

    /*
     * The dice answer the pointer in two different ways, and they are not the same thing.
     *
     * Resting on a die always makes it respond — it lifts, its satellites come round once
     * and a crystal is struck — because a thing that reacts is a thing you understand is
     * there. Whether the *aim* may snap to that player is a separate question, and that
     * still only holds while the player is a legal target. Tying the two together meant
     * the dice were inert objects for almost the whole game.
     */
    {
      let overAny: 'you' | 'foe' | null = null;
      let overTargetable: 'you' | 'foe' | null = null;
      for (const [ref, side] of [
        [playerHudMeshRef, 'you'],
        [opponentHudMeshRef, 'foe'],
      ] as const) {
        const g = ref.current;
        if (!g) continue;
        if (raycasterRef.current.intersectObject(g, true).length) {
          overAny = side;
          if (g.userData.targetable) overTargetable = side;
          break;
        }
      }

      if (overAny !== dieHoverRef.current) {
        dieHoverRef.current = overAny;
        if (overAny) {
          const ref = overAny === 'you' ? playerHudMeshRef : opponentHudMeshRef;
          const die = ref.current?.getObjectByName('lifeDie');
          if (die) die.userData.focusAt = clockRef.current.getElapsedTime();
          soundFx.playDieFocus();
        }
      }

      if (onHeroHover && overTargetable !== hoveredHeroRef.current) {
        hoveredHeroRef.current = overTargetable;
        onHeroHover(overTargetable);
      }
    }

    // Check 3D End Turn Button Hover
    if (endTurnButtonRef.current) {
      const buttonHits = raycasterRef.current.intersectObjects(endTurnButtonRef.current.children, true);
      isEndTurnHoveredRef.current = buttonHits.length > 0;
    }

    /*
     * A finger does not hover.
     *
     * Touch still delivers pointermove — one or two events between the press and the
     * release, and a synthetic pair on either side — so leaving this path open meant a tap
     * "hovered" the card, then un-hovered it the instant the finger lifted, and the reader
     * flickered. Worse, dragging a card out of hand swept the pointer across every card it
     * passed over and fired a preview for each. On touch the card reader is opened by the
     * tap itself, in handleClick, which is a decision rather than an accident.
     */
    /*
     * Once the finger has travelled far enough to be a drag rather than a tap, send the
     * first of the two taps the board already understands: in the blocking step that picks
     * the blocker and lights every attacker it may legally stop, and the aiming line starts
     * following the finger. Everything downstream is the existing code path — no second set
     * of combat rules to keep in step with the first.
     */
    if (e.pointerType === 'touch') {
      const d = boardDragRef.current;
      if (d && !d.live && d.mine && pointerDownPosRef.current) {
        const moved = Math.hypot(
          e.clientX - pointerDownPosRef.current.x,
          e.clientY - pointerDownPosRef.current.y,
        );
        const combat = gamePhase === 'atk' || gamePhase === 'blk';
        if (moved > 14 && combat) {
          d.live = true;
          const g = cardMeshMapRef.current.get(d.iid);
          const card = g?.userData.card as RenderCard | undefined;
          if (card) onBoardCardClick(card, false, true);
        }
      }
      return;
    }

    // Anything belonging to a card counts as hovering that card.
    const hovered = pickCard();
    hoveredInstanceIdRef.current = hovered ? hovered.userData.instanceId : null;

    if (prevHoveredIdRef.current !== hoveredInstanceIdRef.current) {
      prevHoveredIdRef.current = hoveredInstanceIdRef.current;
      const currentId = hoveredInstanceIdRef.current;
      if (currentId) {
        soundFx.playHover();
        const foundCard = playerHand.find((c) => c.instanceId === currentId) ||
          [...playerBattlefield, ...opponentBattlefield].find((c) => c.instanceId === currentId);
        if (onHoverCard) onHoverCard(foundCard || null);
      } else {
        if (onHoverCard) onHoverCard(null);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // Let go and the card goes back down. Also covers pointercancel, which is what iOS
    // sends when the system takes the gesture (a swipe from the edge, a call coming in).
    if (e.pointerType === 'touch' && onHoverCard) onHoverCard(null);

    /*
     * Landing a combat drag: whatever card is under the finger at the moment it lifts is
     * the target, and it is sent as the second tap. Releasing over nothing leaves the
     * source selected, so a drag that misses degrades into the tap-then-tap it started as
     * rather than throwing the selection away.
     */
    const drag = boardDragRef.current;
    boardDragRef.current = null;
    if (drag?.live && containerRef.current && cameraRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const drop = pickCard();
      const iid = drop?.userData.instanceId as string | undefined;
      /*
       * Only the blocking step needs the second tap — that is the one that is genuinely
       * two-part, blocker then attacker. Declaring an attack is one decision, already made
       * when the drag started, so a release over a neighbour must not quietly enlist it too.
       */
      if (gamePhase === 'blk' && drop?.userData.card && iid && iid !== drag.iid && !drop.userData.isHand) {
        onBoardCardClick(drop.userData.card as RenderCard, !!drop.userData.isOpponent, true);
      }
    }
    if (dragging3DInstanceIdRef.current) {
      const instanceId = dragging3DInstanceIdRef.current;
      const group = handMeshMapRef.current.get(instanceId);
      if (group && group.userData.card && dragPlanePointRef.current) {
        const card = group.userData.card as RenderCard;
        // If dragged up into playfield area (Y > -4.8)
        if (dragPlanePointRef.current.y > -4.8) {
          onPlayCard(card);
          soundFx.playCastSpell();
        }
      }
      dragging3DInstanceIdRef.current = null;
      dragPlanePointRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current) return;
    /*
     * On a finger, the press already decided this — see pressPickRef. The pick is only
     * reused when the click is where the press was; anything further is a drag's release
     * and is thrown out below anyway.
     */
    const pressed = pressPickRef.current;
    const fromPress =
      lastPointerTypeRef.current === 'touch' && pressed &&
      Math.abs(e.clientX - pressed.x) <= 10 && Math.abs(e.clientY - pressed.y) <= 10
        ? pressed
        : null;
    pressPickRef.current = null;
    if (pointerDownPosRef.current) {
      const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
      const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
      if (dx > 10 || dy > 10) return; // Ignore drag release clicks
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    mouseRef.current.set(x, y);
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    // 1. Check 3D End Turn Button Click
    if (endTurnButtonRef.current && primaryEnabled) {
      const buttonHits = raycasterRef.current.intersectObjects(endTurnButtonRef.current.children, true);
      if (buttonHits.length > 0) {
        soundFx.playTapLand();
        onPrimaryAction();
        return;
      }
    }

    // 1b. A glowing life panel is a legal target — clicking it aims the spell at that
    // player, the same as clicking a creature.
    if (onHeroClick) {
      for (const [ref, side] of [
        [playerHudMeshRef, 'you'],
        [opponentHudMeshRef, 'foe'],
      ] as const) {
        const g = ref.current;
        if (!g?.userData.targetable) continue;
        if (raycasterRef.current.intersectObject(g, true).length) {
          onHeroClick(side);
          return;
        }
      }
    }

    // 2. Cards
    {
      const topObj = fromPress ? fromPress.obj : pickCard();
      if (topObj && topObj.userData.card) {
        const card = topObj.userData.card as RenderCard;
        const isOpponent = topObj.userData.isOpponent;
        const isHand = topObj.userData.isHand;

        if (e.button === 2) {
          e.preventDefault();
          onHandCardClick(card);
          return;
        }

        const byTouch = lastPointerTypeRef.current === 'touch';

        /*
         * A hand card's click does nothing but raise the reader, and on touch the press
         * already did that and the release already put it away — so running it here would
         * re-open the reader the instant the finger left the glass and leave it stuck open.
         */
        if (isHand) {
          if (!byTouch) onHandCardClick(card);
          return;
        }

        // Board cards do real work on click; only the reader they raise is suppressed.
        if (import.meta.env.VITE_TEST_HOOK) {
          (window as any).__lastClick = { x: e.clientX, y: e.clientY, picked: card.instanceId };
        }
        onBoardCardClick(card, !!isOpponent, byTouch);
        return;
      }

      // Nothing under the finger. On touch that is the gesture that cancels an aiming spell.
      if (import.meta.env.VITE_TEST_HOOK) {
        (window as any).__lastClick = {
          x: e.clientX, y: e.clientY, picked: null,
          pointer: lastPointerTypeRef.current,
          through: (window as any).__pick?.(e.clientX, e.clientY) ?? null,
        };
      }
      if (lastPointerTypeRef.current === 'touch') onEmptyTap?.();
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative cursor-pointer select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={(e) => {
        // Touch fires pointerleave the moment the finger lifts, which would close the card
        // reader between the tap and the click that opened it.
        if (e.pointerType === 'touch') return;
        hoveredInstanceIdRef.current = null;
        if (prevHoveredIdRef.current !== null) {
          prevHoveredIdRef.current = null;
          if (onHoverCard) onHoverCard(null);
        }
      }}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};
