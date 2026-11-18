/**
 * Pop's drawing (placeholder mascot): a freshly popped popcorn kernel, drawn flat with no outlines.
 * Every part is its own piece in a 200 x 200 space so PopRig can move it: the body, the top puff
 * (it lags behind jumps), each arm, the eyes, brows and mouth. Pieces are positioned in art space;
 * PopRig animates them with transforms only, never by changing a path.
 *
 * Colors: a base, one shade tone and one highlight per material. No outlines.
 */
import { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import type { Brows, Eyes, Mouth } from '../moods';

export const POP = {
  puff: '#FFE9A8',
  puffShade: '#F5C95E',
  puffHi: '#FFF8E1',
  shell: '#E8952A',
  shellShade: '#C9761A',
  pupil: '#2B1630',
  mouth: '#7C2238',
  tongue: '#F27C8A',
  blush: '#F59A8C',
  heart: '#E5486A',
  sweat: '#6DB6EA',
  flour: '#FFFFFF',
  pot: '#7F8C99',
  potShade: '#66727E',
  wood: '#C98A52',
  woodShade: '#A96F3E',
  carrot: '#F28A2E',
} as const;
const P = POP;

type Pt = readonly [number, number];
/** Joints and centers, in art space. */
export const PIVOT = {
  feet: [100, 194] as Pt,
  face: [100, 118] as Pt,
  eyes: [100, 104] as Pt,
  mouth: [100, 134] as Pt,
  top: [100, 96] as Pt,
  shoulderL: [46, 132] as Pt,
  shoulderR: [154, 132] as Pt,
};

const f = (n: number) => Math.round(n * 100) / 100;
export const ell = (cx: number, cy: number, rx: number, ry: number) => `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)} Z`;

/** The puff is overlapping circles, so its edge is naturally soft and bumpy. */
const BODY = [ell(100, 118, 56, 54), ell(52, 114, 26, 26), ell(148, 114, 26, 26)];
const TOP = [ell(66, 78, 30, 30), ell(101, 60, 34, 32), ell(136, 78, 30, 30)];
const SHELL = 'M52 140 C54 170 76 188 100 188 C124 188 146 170 148 140 C134 153 117 158 100 158 C83 158 66 153 52 140 Z';
/** A little arm with a round end, pointing down from its shoulder. */
const NUB = 'M-9 0 C-11 12 -9 25 0 29 C9 25 11 12 9 0 C6 -5 -6 -5 -9 0 Z';

const BLACK = '#000000';

/** A shape filled with its base color and a shade crescent along the lower right (light from the top left). */
function Shaded({ id, shapes, base, shade, dx = -6, dy = -7, silhouette }: { id: string; shapes: string[]; base: string; shade: string; dx?: number; dy?: number; silhouette?: boolean }) {
  if (silhouette)
    return (
      <G>
        {shapes.map((d, i) => (
          <Path key={i} d={d} fill={BLACK} />
        ))}
      </G>
    );
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

export function Feet({ silhouette }: { silhouette?: boolean }) {
  const c = silhouette ? BLACK : P.shellShade;
  return (
    <>
      <Path d={ell(84, 190, 12, 6.5)} fill={c} />
      <Path d={ell(116, 190, 12, 6.5)} fill={c} />
    </>
  );
}

/** The top of the puff. Drawn behind the body, so the two read as one shape. */
export function Top({ uid, silhouette }: { uid: string; silhouette?: boolean }) {
  return (
    <>
      <Shaded id={`${uid}top`} shapes={TOP} base={P.puff} shade={P.puffShade} silhouette={silhouette} />
      {!silhouette && (
        <>
          <Path d={ell(84, 46, 11, 6.5)} fill={P.puffHi} transform="rotate(-24 84 46)" />
          <Path d={ell(56, 70, 6, 4)} fill={P.puffHi} transform="rotate(-40 56 70)" />
        </>
      )}
    </>
  );
}

/** The body and the golden kernel shell it wears like an apron (the signature). */
export function Body({ uid, silhouette }: { uid: string; silhouette?: boolean }) {
  return (
    <>
      <Shaded id={`${uid}body`} shapes={BODY} base={P.puff} shade={P.puffShade} silhouette={silhouette} />
      <Shaded id={`${uid}shell`} shapes={[SHELL]} base={P.shell} shade={P.shellShade} dx={-4} dy={-5} silhouette={silhouette} />
    </>
  );
}

/** One arm, hanging down from its shoulder at (0, 0). In front of the body it uses the shade tone so it reads. */
export function Arm({ front, silhouette }: { front: boolean; silhouette?: boolean }) {
  return <Path d={NUB} fill={silhouette ? BLACK : front ? P.puffShade : P.puff} />;
}

/* ------------------------------------------------------------------ */
/* Face                                                                 */
/* ------------------------------------------------------------------ */

const EY = 104;
const ERX = 15;
const ERY = 17;
const EYE_X = [83, 117] as const;

const heart = (x: number, y: number, s: number) =>
  `M${x} ${y + 7 * s} C${x - 11 * s} ${y - 1 * s} ${x - 6 * s} ${y - 11 * s} ${x} ${y - 4 * s} C${x + 6 * s} ${y - 11 * s} ${x + 11 * s} ${y - 1 * s} ${x} ${y + 7 * s} Z`;

function OneEye({ x, side, kind, id }: { x: number; side: -1 | 1; kind: Eyes; id: string }) {
  const y = EY;
  if (kind === 'closed') {
    // Calm and content: a soft upside-down U.
    return <Path d={`M${x - 10} ${y + 3} Q${x} ${y - 9} ${x + 10} ${y + 3}`} stroke={P.pupil} strokeWidth={5} strokeLinecap="round" fill="none" />;
  }
  if (kind === 'squeeze') {
    // Oops: squeezed shut, > <
    const d = side < 0 ? `M${x - 7} ${y - 8} L${x + 6} ${y} L${x - 7} ${y + 8}` : `M${x + 7} ${y - 8} L${x - 6} ${y} L${x + 7} ${y + 8}`;
    return <Path d={d} stroke={P.pupil} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
  }
  const k = kind === 'sparkle' || kind === 'tiny' ? 1.1 : 1;
  const ex = ERX * k;
  const ey = ERY * k;
  const big = kind === 'sparkle';
  const pr = ex * (kind === 'tiny' ? 0.26 : big ? 0.66 : 0.62);
  const pry = ey * (kind === 'tiny' ? 0.24 : big ? 0.68 : 0.64);
  const px = x - side * ex * (kind === 'tiny' ? 0 : 0.17);
  const py = y + ey * (kind === 'arc' ? -0.18 : kind === 'focus' ? 0.2 : 0.12);
  const L = x - ex - 3;
  const R = x + ex + 3;
  // Lids, in the face's color: they change the eye's shape instead of adding lines.
  let lid: string | null = null;
  if (kind === 'arc') lid = `M${L} ${y + ey * 0.5} Q${x} ${y - ey * 0.25} ${R} ${y + ey * 0.5} L${R} ${y + ey + 4} L${L} ${y + ey + 4} Z`;
  if (kind === 'half') lid = `M${L} ${y - ey - 4} L${R} ${y - ey - 4} L${R} ${y - ey * 0.1} Q${x} ${y + ey * 0.05} ${L} ${y - ey * 0.1} Z`;
  if (kind === 'focus') {
    // determined: the lid slopes down toward the nose
    const inner = side < 0 ? R : L;
    const outer = side < 0 ? L : R;
    lid = `M${outer} ${y - ey - 4} L${inner} ${y - ey - 4} L${inner} ${y - ey * 0.2} L${outer} ${y - ey * 0.55} Z`;
  }
  const eye = ell(x, y, ex, ey);
  return (
    <G>
      <Defs>
        <ClipPath id={`${id}e`}>
          <Path d={eye} />
        </ClipPath>
        <ClipPath id={`${id}l`}>
          <Path d={ell(x, y, ex + 1.5, ey + 1.5)} />
        </ClipPath>
      </Defs>
      <Path d={eye} fill="#FFFFFF" />
      <G clipPath={`url(#${id}e)`}>
        {kind === 'heart' ? (
          <>
            <Path d={heart(px, py, 0.95)} fill={P.heart} />
            <Path d={ell(px - 3.5, py - 3.5, 2.2, 1.8)} fill="#FFFFFF" />
          </>
        ) : (
          <>
            <Path d={ell(px, py, pr, pry)} fill={P.pupil} />
            {kind !== 'tiny' && <Path d={ell(px - pr * 0.3, py - pry * 0.36, pr * 0.38, pry * 0.36)} fill="#FFFFFF" />}
            {big && <Path d={ell(px + pr * 0.4, py + pry * 0.42, pr * 0.16, pr * 0.16)} fill="#FFFFFF" />}
          </>
        )}
      </G>
      {lid && <Path clipPath={`url(#${id}l)`} d={lid} fill={P.puff} />}
    </G>
  );
}

export function EyesArt({ kind, uid }: { kind: Eyes; uid: string }) {
  return (
    <>
      <OneEye x={EYE_X[0]} side={-1} kind={kind} id={`${uid}L`} />
      <OneEye x={EYE_X[1]} side={1} kind={kind} id={`${uid}R`} />
    </>
  );
}

/** Brows are short, soft marks in the shade tone, not dark lines. */
export function BrowsArt({ kind }: { kind: Brows }) {
  if (kind === 'none') return null;
  const one = (x: number, side: -1 | 1) => {
    const o = x + side * 8; // outer end
    const i = x - side * 7; // inner end
    switch (kind) {
      case 'raised':
        return `M${o} 82 Q${x} 76 ${i} 82`;
      case 'high':
        return `M${o} 76 Q${x} 70 ${i} 76`;
      case 'worried':
        return `M${o} 82 Q${x} 80 ${i} 75`;
      case 'determined':
        return `M${o} 76 Q${x} 78 ${i} 83`;
    }
  };
  return (
    <>
      {EYE_X.map((x, n) => (
        <Path key={x} d={one(x, n === 0 ? -1 : 1)} stroke={P.shellShade} strokeWidth={5} strokeLinecap="round" fill="none" />
      ))}
    </>
  );
}

export function MouthArt({ kind }: { kind: Mouth }) {
  const x = 100;
  const y = 131;
  const stroke = {
    stroke: P.mouth,
    strokeWidth: 3.8,
    strokeLinecap: 'round' as const,
    fill: 'none',
  };
  const open = (w: number, h: number, tongue = true) => (
    <>
      <Path d={`M${x - w} ${y - 1} Q${x} ${y + 1} ${x + w} ${y - 1} Q${x + w - 1} ${y + h - 1} ${x} ${y + h} Q${x - w + 1} ${y + h - 1} ${x - w} ${y - 1} Z`} fill={P.mouth} />
      {tongue && <Path d={ell(x, y + h - 3.5, w * 0.48, 2.8)} fill={P.tongue} />}
    </>
  );
  switch (kind) {
    case 'w':
      return <Path d={`M${x - 6} ${y} Q${x} ${y + 5.5} ${x + 6} ${y}`} {...stroke} />;
    case 'smile':
      return <Path d={`M${x - 9} ${y - 1} Q${x} ${y + 7} ${x + 9} ${y - 1}`} {...stroke} />;
    case 'small':
      return <Path d={`M${x - 4} ${y + 1} Q${x} ${y + 4} ${x + 4} ${y + 1}`} {...stroke} />;
    case 'flat':
      return <Path d={`M${x - 6} ${y + 2} L${x + 6} ${y + 2}`} {...stroke} />;
    case 'wavy':
      return <Path d={`M${x - 9} ${y + 2} Q${x - 4.5} ${y - 2} ${x} ${y + 2} Q${x + 4.5} ${y + 6} ${x + 9} ${y + 2}`} {...stroke} />;
    case 'chew':
      return <Path d={`M${x - 5} ${y + 2} Q${x} ${y + 5} ${x + 5} ${y + 2}`} {...stroke} />;
    case 'o':
      return <Path d={ell(x, y + 4, 4.5, 5.5)} fill={P.mouth} />;
    case 'open':
      return open(9, 13);
    case 'big':
      return open(11, 16);
    case 'grin':
      return open(12, 10, false);
    case 'tongue':
      return (
        <>
          {open(9, 11, false)}
          <Path d={`M${x - 2} ${y + 6} Q${x - 2} ${y + 17} ${x + 4} ${y + 17} Q${x + 9} ${y + 16} ${x + 7} ${y + 6} Z`} fill={P.tongue} />
        </>
      );
  }
}

/** The mouth while a line types out: it opens and closes (PopRig scales it). */
export function TalkMouth() {
  return (
    <>
      <Path d={ell(100, 135, 7, 6.5)} fill={P.mouth} />
      <Path d={ell(100, 138.5, 4, 2.4)} fill={P.tongue} />
    </>
  );
}

export function Cheeks({ strong, puff, flour, sweat }: { strong?: boolean; puff?: boolean; flour?: boolean; sweat?: boolean }) {
  return (
    <>
      {puff && (
        <>
          <Path d={ell(70, 128, 11, 9)} fill={P.puffHi} />
          <Path d={ell(130, 128, 11, 9)} fill={P.puffHi} />
        </>
      )}
      {strong && (
        <>
          <Path d={ell(64, 124, 8, 5)} fill={P.blush} opacity={0.6} />
          <Path d={ell(136, 124, 8, 5)} fill={P.blush} opacity={0.6} />
        </>
      )}
      {flour && <Path d={ell(134, 120, 7, 4)} fill={P.flour} opacity={0.9} transform="rotate(-18 134 120)" />}
      {sweat && <Path d="M150 70 C146 78 144 82 146 85 C148 89 155 89 156 84 C157 80 154 76 150 70 Z" fill={P.sweat} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Props, drawn in front of the body                                    */
/* ------------------------------------------------------------------ */

export function Pot() {
  return (
    <>
      <Rect x={40} y={168} width={18} height={9} rx={4.5} fill={P.potShade} />
      <Rect x={142} y={168} width={18} height={9} rx={4.5} fill={P.potShade} />
      <Path d="M54 166 L146 166 L142 190 Q141 198 133 198 L67 198 Q59 198 58 190 Z" fill={P.pot} />
      <Path d="M136 166 L146 166 L142 190 Q141 198 133 198 L128 198 Q135 196 136 188 Z" fill={P.potShade} />
      <Rect x={50} y={161} width={100} height={9} rx={4.5} fill={P.potShade} />
    </>
  );
}

export function Board() {
  return (
    <>
      <Rect x={42} y={180} width={116} height={14} rx={6} fill={P.wood} />
      <Rect x={42} y={189} width={116} height={5} rx={2.5} fill={P.woodShade} />
      <Path d="M58 178 Q58 173 63 173 L84 173 Q88 175.5 84 178 Z" fill={P.carrot} />
      <Path d={ell(92, 176.5, 3, 3)} fill={P.carrot} />
      <Path d={ell(100, 176.5, 3, 3)} fill={P.carrot} />
    </>
  );
}

/** Pop's signature move when celebrating: little puffs pop off the top. `t` runs 0..1. */
export function PopPuffs({ t }: { t: number }) {
  return (
    <>
      {(
        [
          [58, 30, -18, 0],
          [146, 24, 16, 0.33],
          [162, 50, 22, 0.66],
        ] as const
      ).map(([x, y, dx, o]) => {
        const p = (t + o) % 1;
        const op = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
        return <Path key={x} d={ell(x + dx * p, y - 22 * p, 7 + 2 * p, 6.5 + 2 * p)} fill={P.puff} opacity={op} />;
      })}
    </>
  );
}
