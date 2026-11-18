/**
 * Shared drawing kit for the mascot concepts (dev preview only, see src/app/dev-mascots.tsx).
 *
 * How lines work: each Layer draws all its shapes twice. First every shape in the outline color
 * with a thick stroke (one clean outer outline around the whole layer), then every shape in its own
 * color on top. Where shapes overlap, the fills hide the outline, so arms, ears and tails grow out of
 * the body with no seams. Inner lines are added only on purpose, as `detail` parts.
 * The silhouette check draws only the first pass, in black.
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

export type Part =
  /** A filled shape: part of the outline pass and the fill pass. */
  | { d: string; fill: string; t?: string }
  /** A thick round stroke (tails, handles): part of both passes. */
  | { line: string; color: string; w: number; t?: string }
  /** Drawn only in the fill pass, in order (inner lines, faces, shading). */
  | { detail: ReactNode };

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

/** A limb pointing straight down from (0,0): radius r, straight length len. `edge` is its inner line, open at the shoulder. */
export const capsule = (r: number, len: number) => ({
  d: `M${-r} 0 L${-r} ${len} A${r} ${r} 0 0 0 ${r} ${len} L${r} 0 A${r} ${r} 0 0 0 ${-r} 0 Z`,
  edge: `M${-r} ${r * 1.2} L${-r} ${len} A${r} ${r} 0 0 0 ${r} ${len} L${r} ${r * 1.2}`,
});

/** Where the end of a limb lands: pivot, length, angle (degrees, 0 = straight down, positive = clockwise). */
export const tip = (px: number, py: number, len: number, deg: number): readonly [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [px - Math.sin(a) * len, py + Math.cos(a) * len];
};

export function Layer({ parts, ink, w, silhouette }: { parts: Part[]; ink: string; w: number; silhouette?: boolean }) {
  const k = silhouette ? '#000000' : ink;
  return (
    <G>
      {parts.map((p, i) =>
        'd' in p ? (
          <Path key={`o${i}`} d={p.d} transform={p.t} fill={k} stroke={k} strokeWidth={w * 2} strokeLinejoin="round" />
        ) : 'line' in p ? (
          <Path key={`o${i}`} d={p.line} transform={p.t} fill="none" stroke={k} strokeWidth={p.w + w * 2} strokeLinecap="round" strokeLinejoin="round" />
        ) : null,
      )}
      {!silhouette &&
        parts.map((p, i) =>
          'd' in p ? (
            <Path key={`f${i}`} d={p.d} transform={p.t} fill={p.fill} />
          ) : 'line' in p ? (
            <Path key={`f${i}`} d={p.line} transform={p.t} fill="none" stroke={p.color} strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <G key={`f${i}`}>{p.detail}</G>
          ),
      )}
    </G>
  );
}

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
