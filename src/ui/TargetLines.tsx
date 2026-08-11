/**
 * Dashed connector overlay drawn on top of the 3D board.
 *
 * Two jobs, both about making a choice legible before it is made:
 *  - while a spell waits for a target, an animated dashed arrow runs from the spell
 *    to whichever legal target the cursor is over (or to each of them, faintly);
 *  - while blockers are being assigned, a dashed line links every blocker to the
 *    attacker it has been put in front of.
 */

import React, { useEffect, useState } from 'react';
import type { Projector } from './FxLayer';

export interface Link {
  from: string;
  /** An instance id / anchor name, or a raw screen point (used to follow the cursor). */
  to: string | { x: number; y: number };
  kind: 'target' | 'block' | 'aim';
  /**
   * A small sideways nudge, so two creatures holding the same attacker do not draw the
   * same curve on top of each other. Zero for a single blocker.
   */
  bow?: number;
}

interface Props {
  links: Link[];
  project: Projector | null;
  /** Bumped by the parent whenever the board may have moved. */
  tick: number;
}

/**
 * All connectors are white; only weight, rhythm and how they curve separate them.
 *
 * Every one of them arches *upward*. An aiming arrow gets a fixed head of lift on top of
 * its length, because it usually crosses most of the board.
 *
 * A committed block needs more care. It joins a blocker to the attacker standing directly
 * in front of it — sixty-odd pixels, and very often exactly vertical — and lifting a
 * vertical chord straight up puts the control point on the chord itself, so the curve
 * collapses onto a line running back over its own start. It therefore takes a sideways
 * component as well, which is what keeps a vertical link drawn. But the sideways component
 * alone can point downward depending on which way the chord runs, so it is always paired
 * with a genuine rise, and the perpendicular is flipped whenever it would dip: a block
 * arcs over, never under.
 */
const STYLE: Record<Link['kind'], {
  color: string; width: number; dash: string;
  arc: { mode: 'up' | 'across'; k: number; base: number; min: number; max: number };
}> = {
  target: { color: '#ffffff', width: 2.5, dash: '9 9', arc: { mode: 'up', k: 0.42, base: 70, min: 40, max: 260 } },
  aim: { color: '#ffffff', width: 4.5, dash: '16 8', arc: { mode: 'up', k: 0.42, base: 70, min: 40, max: 260 } },
  block: { color: '#ffffff', width: 4, dash: '11 8', arc: { mode: 'across', k: 0.38, base: 0, min: 22, max: 70 } },
};

export const TargetLines: React.FC<Props> = ({ links, project, tick }) => {
  const [, force] = useState(0);

  // The board animates continuously, so re-resolve the endpoints every frame.
  useEffect(() => {
    if (!links.length) return;
    let raf = 0;
    const loop = () => {
      force((n) => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [links.length]);

  if (!links.length || !project) return null;

  const resolved = links
    .map((l) => ({
      l,
      a: project(l.from),
      b: typeof l.to === 'string' ? project(l.to) : l.to,
    }))
    .filter((r) => r.a && r.b) as { l: Link; a: { x: number; y: number }; b: { x: number; y: number } }[];

  if (!resolved.length) return null;

  return (
    <svg className="link-layer" aria-hidden="true">
      <defs>
        <filter id="link-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {(['target', 'aim', 'block'] as const).map((k) => (
          <marker
            key={k}
            id={`arrow-${k}`}
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="4.2"
            markerHeight="4.2"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 11 6 L 0 11 z" fill={STYLE[k].color} />
          </marker>
        ))}
      </defs>
      {resolved.map(({ l, a, b }, i) => {
        const st = STYLE[l.kind];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const lift = Math.min(st.arc.max, Math.max(st.arc.min, st.arc.base + len * st.arc.k));
        let cx: number;
        let cy: number;
        if (st.arc.mode === 'across') {
          const ux = (b.x - a.x) / len;
          const uy = (b.y - a.y) / len;
          // The perpendicular, turned to whichever side points up. On a vertical chord it
          // is level, which is why the explicit rise below is not optional.
          let nx = -uy;
          let ny = ux;
          if (ny > 0) { nx = -nx; ny = -ny; }
          // Extra blockers on the same attacker bow wider so they never sit on each other,
          // and lean to alternating sides — still upward, just further over.
          const k = l.bow ?? 0;
          const spread = 1 + Math.abs(k) * 0.7;
          const lean = k < 0 ? -1 : 1;
          cx = mx + nx * lift * spread * lean;
          cy = my + ny * lift * spread - lift * 0.75;
        } else {
          cx = mx;
          cy = my - lift;
        }
        const key = `${l.from}-${typeof l.to === 'string' ? l.to : 'cursor'}-${i}`;
        return (
          <g key={key}>
            <path
              d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
              fill="none"
              stroke={st.color}
              strokeWidth={st.width}
              strokeDasharray={st.dash}
              strokeLinecap="round"
              markerEnd={`url(#arrow-${l.kind})`}
              className="link-path"
              filter="url(#link-glow)"
              opacity={l.kind === 'target' ? 0.62 : 1}
            />
            {/* A bead on the blocker's end, so a committed block is anchored at both ends. */}
            {l.kind === 'block' && (
              <circle cx={a.x} cy={a.y} r={6} fill={st.color} filter="url(#link-glow)" />
            )}
          </g>
        );
      })}
    </svg>
  );
};
