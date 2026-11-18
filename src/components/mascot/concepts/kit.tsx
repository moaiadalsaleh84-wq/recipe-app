/**
 * Shared drawing kit for the mascot concepts (dev preview only, see src/app/dev-mascots.tsx):
 * the 200-unit frame, poses and a few shape helpers. The flat style itself lives in flat.tsx.
 */
import type { ReactNode } from 'react';
import Svg, { G, Path } from 'react-native-svg';

export type Pose = 'idle' | 'happy' | 'excited';
export const POSES: readonly Pose[] = ['idle', 'happy', 'excited'];

export type CharProps = {
  pose: Pose;
  size: number;
  /** Filled black silhouette. */
  silhouette?: boolean;
};


const f = (n: number) => Math.round(n * 100) / 100;

/** An ellipse as a path. */
export const ell = (cx: number, cy: number, rx: number, ry: number) =>
  `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)} Z`;

/** Mirror a path across x = 100. Absolute M, L, C, Q and Z only. */
export const mirror = (d: string) =>
  d.replace(/([MLCQ])([^MLCQZ]*)/g, (_, cmd: string, args: string) => {
    const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    for (let i = 0; i < n.length; i += 2) n[i] = f(200 - n[i]);
    return `${cmd}${n.join(' ')} `;
  });




/** A soft four-point sparkle. */
export const sparkle = (x: number, y: number, s: number) =>
  `M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z`;

/**
 * The frame every concept draws in: 200 art units tall, feet on y = 194.
 * Excited lifts the whole body and stretches it a little (anticipation is for the real rig).
 */
export function Frame({ size, pose, silhouette, ink, children }: { size: number; pose: Pose; silhouette?: boolean; ink: string; children: ReactNode }) {
  const lift = pose === 'excited' ? 10 : 0;
  const body = pose === 'excited' ? `translate(0 ${-lift}) translate(100 194) scale(0.97 1.04) translate(-100 -194)` : undefined;
  return (
    <Svg width={size} height={size} viewBox="-12 -24 224 224">
      {!silhouette && <Path d={ell(100, 196, pose === 'excited' ? 34 : 44, 4.5)} fill={ink} opacity={0.12} />}
      <G transform={body}>{children}</G>
    </Svg>
  );
}

