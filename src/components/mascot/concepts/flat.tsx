/**
 * Flat drawing kit for the round-2 concepts: no outlines (like Duo and Waterllama's characters).
 * Shapes read by color alone: a base color, one shade tone and one highlight.
 */
import { useId } from 'react';
import { ClipPath, Defs, G, Path } from 'react-native-svg';
import { ell, type Pose } from './kit';

const useSvgId = (p: string) => `${p}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

/**
 * A shape (the union of `shapes`) filled with the base color and one shade tone: the shade shows as a
 * crescent along the lower right edge, as if lit from the top left.
 */
export function Shaded({ shapes, base, shade, dx = -6, dy = -7, silhouette }: { shapes: string[]; base: string; shade: string; dx?: number; dy?: number; silhouette?: boolean }) {
  const id = useSvgId('sh');
  if (silhouette) return <G>{shapes.map((d, i) => <Path key={i} d={d} fill="#000000" />)}</G>;
  return (
    <G>
      <Defs>
        <ClipPath id={id}>
          {shapes.map((d, i) => (
            <Path key={i} d={d} />
          ))}
        </ClipPath>
      </Defs>
      {shapes.map((d, i) => (
        <Path key={`s${i}`} d={d} fill={shade} />
      ))}
      <G clipPath={`url(#${id})`}>
        <G transform={`translate(${dx} ${dy})`}>
          {shapes.map((d, i) => (
            <Path key={`b${i}`} d={d} fill={base} />
          ))}
        </G>
      </G>
    </G>
  );
}

/**
 * A big eye with no outline. The expression comes from the eye's shape, not from lines:
 * - idle: open, the pupil looks at you
 * - happy: the cheek rises into the eye (cut in the face's color), so the eye smiles
 * - excited: wider, bigger pupil, a second shine
 */
export function FlatEye({ x, y, rx, ry, pose, side, face, pupil }: { x: number; y: number; rx: number; ry: number; pose: Pose; side: -1 | 1; face: string; pupil: string }) {
  const id = useSvgId('eye');
  const cutId = useSvgId('cut');
  const k = pose === 'excited' ? 1.1 : 1;
  const ex = rx * k;
  const ey = ry * k;
  const pr = ex * (pose === 'excited' ? 0.66 : 0.62);
  const pry = ey * (pose === 'excited' ? 0.68 : 0.64);
  const px = x - side * ex * 0.17;
  const py = y + ey * (pose === 'happy' ? -0.18 : 0.12);
  const L = x - ex - 2;
  const R = x + ex + 2;
  const eye = ell(x, y, ex, ey);
  return (
    <G>
      <Defs>
        <ClipPath id={id}>
          <Path d={eye} />
        </ClipPath>
      </Defs>
      <Path d={eye} fill="#FFFFFF" />
      <G clipPath={`url(#${id})`}>
        <Path d={ell(px, py, pr, pry)} fill={pupil} />
        <Path d={ell(px - pr * 0.3, py - pry * 0.36, pr * 0.38, pry * 0.36)} fill="#FFFFFF" />
        {pose === 'excited' && <Path d={ell(px + pr * 0.4, py + pry * 0.42, pr * 0.16, pr * 0.16)} fill="#FFFFFF" />}
      </G>
      {pose === 'happy' && (
        // The rising cheek is clipped to a slightly bigger eye, so no white edge is left around it.
        <G>
          <Defs>
            <ClipPath id={cutId}>
              <Path d={ell(x, y, ex + 1.5, ey + 1.5)} />
            </ClipPath>
          </Defs>
          <Path clipPath={`url(#${cutId})`} d={`M${L} ${y + ey * 0.5} Q${x} ${y - ey * 0.25} ${R} ${y + ey * 0.5} L${R} ${y + ey + 4} L${L} ${y + ey + 4} Z`} fill={face} />
        </G>
      )}
    </G>
  );
}

/** A little limb with a round end, pointing down from (0,0). Drawn behind the body, so it grows out of it. */
export const NUB = 'M-9 0 C-11 12 -9 25 0 29 C9 25 11 12 9 0 C6 -5 -6 -5 -9 0 Z';

/** The mouth: idle a small smile, happy an open D, excited a bigger one. */
export function Mouth({ x, y, pose, color, tongue }: { x: number; y: number; pose: Pose; color: string; tongue: string }) {
  if (pose === 'idle') return <Path d={`M${x - 6} ${y} Q${x} ${y + 5.5} ${x + 6} ${y}`} stroke={color} strokeWidth={3.8} strokeLinecap="round" fill="none" />;
  const b = pose === 'excited' ? 3 : 0;
  const w = 9 + b / 2;
  return (
    <G>
      <Path d={`M${x - w} ${y - 1} Q${x} ${y + 1} ${x + w} ${y - 1} Q${x + w - 1} ${y + 12 + b} ${x} ${y + 13 + b} Q${x - w + 1} ${y + 12 + b} ${x - w} ${y - 1} Z`} fill={color} />
      <Path d={ell(x, y + 9.5 + b, 4.6, 2.8)} fill={tongue} />
    </G>
  );
}
