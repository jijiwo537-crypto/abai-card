/**
 * Held the wrong way up.
 *
 * The board is a wide table seen from one end: two rows of battlefield, a hand along the
 * near edge, and the dice out at the corners. There is no honest portrait version of that —
 * squeezing it into a tall window either shrinks the cards below the point of being
 * readable or crops the far row off the top. So the app asks to be turned instead of
 * pretending, which is what every landscape game on the platform does.
 *
 * It renders only when `data-portrait` is set, i.e. a coarse-pointer device that is
 * currently taller than it is wide. A desktop never sees it at any window shape.
 */

import React from 'react';

export const RotateGate: React.FC = () => (
  <div className="rotate-gate" role="alertdialog" aria-label="請將裝置轉為橫向">
    <div className="rg-inner">
      {/* A phone turning a quarter turn, which says it faster than the sentence does. */}
      <svg className="rg-phone" viewBox="-60 -60 120 120" aria-hidden="true">
        <g className="rg-turn">
          <rect x="-21" y="-36" width="42" height="72" rx="7" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <rect x="-15" y="-28" width="30" height="52" rx="2" fill="currentColor" opacity="0.14" />
          <circle cx="0" cy="30" r="2.2" fill="currentColor" opacity="0.7" />
        </g>
        {/* The arc of the turn itself. */}
        <path
          className="rg-arc"
          d="M -44 -18 A 47 47 0 0 1 -8 -46"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.65"
        />
        <path d="M -10 -52 L -4 -45 L -12 -40 Z" fill="currentColor" opacity="0.8" />
      </svg>

      <b>請將裝置轉為橫向</b>
      <p>祕法對決是一張橫著擺的牌桌，橫持才看得到完整的戰場與手牌。</p>
    </div>
  </div>
);
