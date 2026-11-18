/**
 * Biscuit's drawing: an original chef cat, built from simple rounded shapes in a 200 x 200 space.
 *
 * How the lines work:
 * - "line" pass: every part is drawn filled with the outline color and a thick stroke. Together they
 *   make one clean outer silhouette with an even outline (OUT, about 3% of the height).
 * - "fill" pass: every part is drawn again in its colors, on top. Where parts meet, the fills cover
 *   the outline, so arms, ears and tail grow out of the body with no seams. Thin inner lines
 *   (INNER, 60% of OUT) are added only where they are needed: the chin, the hat band, an arm
 *   crossing the body, the scarf.
 * - Rendering the line pass alone, in black, is the silhouette check.
 *
 * Left and right are built from one half and mirrored, so the two sides are always identical.
 */
import { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { biscuit as P } from '../../theme';
import type { Brows, Eyes, Fx, Mouth, Prop } from './moods';

/** Outer outline width and inner line width, in art units (the art is 200 units tall). */
export const OUT = 4.8;
export const INNER = OUT * 0.6;
/** At small sizes the lines are a little heavier, so they don't vanish. */
export const OUT_SMALL = 6.4;

export type Pass = 'line' | 'fill';

/* ------------------------------------------------------------------ */
/* Geometry                                                             */
/* ------------------------------------------------------------------ */

type Pt = readonly [number, number];
type Seg = readonly [number, number, number, number, number, number];
const mx = (x: number) => 200 - x;
const f = (n: number) => Math.round(n * 100) / 100;

/** A closed shape from its right half: starts at the top center, ends at the bottom center. */
function symmetric(start: Pt, segs: Seg[]) {
  let d = `M${f(start[0])} ${f(start[1])}`;
  for (const s of segs) d += ` C${s.map(f).join(' ')}`;
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    const prev = i === 0 ? start : ([segs[i - 1][4], segs[i - 1][5]] as const);
    d += ` C${f(mx(s[2]))} ${f(s[3])} ${f(mx(s[0]))} ${f(s[1])} ${f(mx(prev[0]))} ${f(prev[1])}`;
  }
  return `${d} Z`;
}
/** A path's mirror image (left from right). Absolute M, L, C, Q and Z commands only. */
function mirrorPath(d: string) {
  return d.replace(/([MLCQ])([^MLCQZ]*)/g, (_, cmd: string, args: string) => {
    const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    for (let i = 0; i < n.length; i += 2) n[i] = f(mx(n[i]));
    return `${cmd}${n.join(' ')} `;
  });
}

/** Joints, in art space. */
export const PIVOT = {
  /** The whole body turns and squashes at the feet. */
  feet: [100, 194] as Pt,
  /** The head turns at the neck. */
  neck: [100, 140] as Pt,
  shoulderL: [74, 151] as Pt,
  shoulderR: [126, 151] as Pt,
  earL: [mx(146), 66] as Pt,
  earR: [146, 66] as Pt,
  hat: [100, 44] as Pt,
  tailBase: [128, 182] as Pt,
  tailJoint: [162, 174] as Pt,
  eyes: [100, 101] as Pt,
  mouth: [100, 121] as Pt,
};
export const EYE_L: Pt = [72, 101];
export const EYE_R: Pt = [128, 101];

/** One soft, slightly wide head, with two small round tufts of cheek fur on each side. */
const HEAD = symmetric(
  [100, 44],
  [
    [134, 44, 158, 57, 163, 81],
    [166, 95, 165, 105, 161, 111],
    [167, 113, 169, 120, 163, 123.5],
    [167, 127, 164, 134.5, 156, 134.5],
    [145, 143, 125, 146, 100, 146],
  ],
);
/** The chin: the one inner line where the head sits on the body. */
const CHIN = 'M156 134.5 C145 143 125 146 100 146 C75 146 55 143 44 134.5';
/** The muzzle and lower face: cream, flowing into the chin. */
const MUZZLE = symmetric(
  [100, 105],
  [
    [113, 105, 124, 111, 128, 120],
    [131, 128, 132, 136, 128, 142],
    [120, 147, 110, 147, 100, 147],
  ],
);
/** Short rounded ears, tilted outward, with soft tips. */
const EAR_R = 'M124 60 C131 47 146 35.5 159 30.5 C166 28 171 32.5 169 40 C166 52 164 64 161.5 77 Z';
const EAR_INNER_R = 'M132.5 57 C138.5 48 148.5 40.5 156.5 37.5 C160 36.5 162 39 161 43 C159 51.5 157.5 59.5 156.5 67.5 Z';
const EAR_L = mirrorPath(EAR_R);
const EAR_INNER_L = mirrorPath(EAR_INNER_R);

/** The body: one smooth bean. */
const BODY = symmetric(
  [100, 128],
  [
    [121, 128, 137, 140, 139, 160],
    [141, 179, 127, 188.5, 100, 188.5],
  ],
);
/** The edge of the body between the feet. */
const BODY_HEM = 'M73 183 C85 190 115 190 127 183';

/** The chef hat: puffy, with three soft bumps and a band. Sits snug between the ears. */
const HAT_PUFF = 'M78 34 C62.5 34 58 16.5 71.5 12 C74.5 2 90 -1.5 100 4.5 C110 -1.5 125.5 2 128.5 12 C142 16.5 137.5 34 122 34 Z';
/** The band curves with the head, like cloth, instead of a flat label. */
const HAT_BAND = 'M71.5 31.5 Q100 36 128.5 31.5 Q131.5 31 131 34.5 L129.6 45.5 Q129.2 48.6 126 49 Q100 53.5 74 49 Q70.8 48.6 70.4 45.5 L69 34.5 Q68.5 31 71.5 31.5 Z';

/** A neckerchief: a band under the chin and a small rounded point, tied with a small knot. */
const SCARF_BAND = 'M66 139 C82 148.5 118 148.5 134 139 C136.5 142 137 146 135.5 149 C118 158 82 158 64.5 149 C63 146 63.5 142 66 139 Z';
const SCARF_TIP = 'M88.5 152 C95 154.5 105 154.5 111.5 152 C110.5 159 106.5 165 101.5 168.2 C100.6 168.8 99.4 168.8 98.5 168.2 C93.5 165 89.5 159 88.5 152 Z';

/** An arm hanging from its shoulder: short, with a round paw a little wider than the arm. */
const ARM_LEN = 19;
function armPath([x, y]: Pt) {
  const r0 = 6.4;
  const r1 = 7.6;
  return `M${x - r0} ${y} L${x - r1} ${y + ARM_LEN} A${r1} ${r1} 0 0 0 ${x + r1} ${y + ARM_LEN} L${x + r0} ${y} A${r0} ${r0} 0 0 0 ${x - r0} ${y} Z`;
}
const ARM_L = armPath(PIVOT.shoulderL);
const ARM_R = armPath(PIVOT.shoulderR);

/** Two small round feet peeking out under the body. */
const FOOT = { y: 188.5, dx: 15.5, rx: 11, ry: 7.2 };

/** The tail, in two tapered pieces so the tip can follow through. Thick at the base, thin at the tip. */
function taper(from: Pt, to: Pt, w0: number, w1: number, bend: number) {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const mxp = (x0 + x1) / 2 + nx * bend;
  const myp = (y0 + y1) / 2 + ny * bend;
  const a0 = [x0 + nx * w0, y0 + ny * w0];
  const b0 = [x0 - nx * w0, y0 - ny * w0];
  const a1 = [x1 + nx * w1, y1 + ny * w1];
  const b1 = [x1 - nx * w1, y1 - ny * w1];
  const wm = (w0 + w1) / 2;
  return [
    `M${f(a0[0])} ${f(a0[1])}`,
    `Q${f(mxp + nx * wm)} ${f(myp + ny * wm)} ${f(a1[0])} ${f(a1[1])}`,
    `A${w1} ${w1} 0 0 0 ${f(b1[0])} ${f(b1[1])}`,
    `Q${f(mxp - nx * wm)} ${f(myp - ny * wm)} ${f(b0[0])} ${f(b0[1])}`,
    `A${w0} ${w0} 0 0 0 ${f(a0[0])} ${f(a0[1])} Z`,
  ].join(' ');
}
const TAIL_END: Pt = [182, 144];
const TAIL_BASE = taper(PIVOT.tailBase, PIVOT.tailJoint, 8.4, 7, 2);
const TAIL_TIP = taper(PIVOT.tailJoint, TAIL_END, 7, 5.2, 5);
/** A point part-way along a line. */
const along = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** A stripe across a tail piece at t (0 at the start, 1 at the end). */
function stripeAcross(a: Pt, b: Pt, t: number, half = 14) {
  const [cx, cy] = along(a, b, t);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * half;
  const ny = (dx / len) * half;
  return `M${f(cx - nx)} ${f(cy - ny)} L${f(cx + nx)} ${f(cy + ny)}`;
}

/* ------------------------------------------------------------------ */
/* Drawing helpers                                                      */
/* ------------------------------------------------------------------ */

/** The silhouette pass: the shape filled and stroked in the outline color. */
function lineProps(width: number, color: string) {
  return { fill: color, stroke: color, strokeWidth: width * 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
}
const inner = (width = INNER) => ({ stroke: P.outline, strokeWidth: width, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const });

export type Look = { out: number; color: string };

/* ------------------------------------------------------------------ */
/* Parts                                                                */
/* ------------------------------------------------------------------ */

export function Tail({ piece, pass, look, uid }: { piece: 'base' | 'tip'; pass: Pass; look: Look; uid: string }) {
  const d = piece === 'base' ? TAIL_BASE : TAIL_TIP;
  if (pass === 'line') return <Path d={d} {...lineProps(look.out, look.color)} />;
  const id = `${uid}-tail-${piece}`;
  const [a, b] = piece === 'base' ? [PIVOT.tailBase, PIVOT.tailJoint] : [PIVOT.tailJoint, TAIL_END];
  return (
    <>
      <Defs>
        <ClipPath id={id}>
          <Path d={d} />
        </ClipPath>
      </Defs>
      <Path d={d} fill={P.fur} />
      <G clipPath={`url(#${id})`}>
        {/* soft stripes, kept inside the shape */}
        {piece === 'base' ? (
          <Path d={stripeAcross(a, b, 0.42)} stroke={P.stripe} strokeWidth={4.6} strokeLinecap="round" />
        ) : (
          <>
            <Path d={stripeAcross(a, b, 0.2)} stroke={P.stripe} strokeWidth={4.2} strokeLinecap="round" />
            {/* cream tip */}
            <Circle cx={TAIL_END[0]} cy={TAIL_END[1]} r={11.5} fill={P.cream} />
          </>
        )}
      </G>
    </>
  );
}

export function Feet({ pass, look }: { pass: Pass; look: Look }) {
  const feet = [100 - FOOT.dx, 100 + FOOT.dx].map((x) => (
    <Ellipse key={x} cx={x} cy={FOOT.y} rx={FOOT.rx} ry={FOOT.ry} {...(pass === 'line' ? lineProps(look.out, look.color) : { fill: P.fur })} />
  ));
  return <>{feet}</>;
}

export function Body({ pass, look, uid }: { pass: Pass; look: Look; uid: string }) {
  if (pass === 'line') return <Path d={BODY} {...lineProps(look.out, look.color)} />;
  const id = `${uid}-body`;
  return (
    <>
      <Defs>
        <ClipPath id={id}>
          <Path d={BODY} />
        </ClipPath>
      </Defs>
      <Path d={BODY} fill={P.fur} />
      {/* the one shade tone: the far side of the body */}
      <G clipPath={`url(#${id})`}>
        <Ellipse cx={150} cy={170} rx={22} ry={34} fill={P.furShade} />
      </G>
      {/* one clean belly */}
      <Ellipse cx={100} cy={167} rx={19} ry={15.5} fill={P.cream} />
      <Path d={BODY_HEM} fill="none" {...inner()} />
    </>
  );
}

export function Scarf() {
  return (
    <>
      <Path d={SCARF_TIP} fill={P.scarf} {...inner()} />
      <Path d={SCARF_BAND} fill={P.scarf} {...inner()} />
    </>
  );
}

export function Ear({ side, pass, look }: { side: 'L' | 'R'; pass: Pass; look: Look }) {
  const d = side === 'L' ? EAR_L : EAR_R;
  if (pass === 'line') return <Path d={d} {...lineProps(look.out, look.color)} />;
  return (
    <>
      <Path d={d} fill={P.fur} />
      <Path d={side === 'L' ? EAR_INNER_L : EAR_INNER_R} fill={P.earPink} />
    </>
  );
}

export function Head({ pass, look, uid, small }: { pass: Pass; look: Look; uid: string; small?: boolean }) {
  if (pass === 'line') return <Path d={HEAD} {...lineProps(look.out, look.color)} />;
  const id = `${uid}-head`;
  return (
    <>
      <Defs>
        <ClipPath id={id}>
          <Path d={HEAD} />
        </ClipPath>
      </Defs>
      <Path d={HEAD} fill={P.fur} />
      <G clipPath={`url(#${id})`}>
        {/* the one highlight */}
        <Ellipse cx={64} cy={64} rx={9} ry={4.4} fill={P.highlight} opacity={0.6} transform="rotate(-34 64 64)" />
        <Path d={MUZZLE} fill={P.cream} />
      </G>
      {/* three short rounded tabby stripes, on the forehead only */}
      {!small && (
        <G stroke={P.stripe} strokeWidth={4.4} strokeLinecap="round">
          <Path d="M100 55 L100 66" />
          <Path d="M89 57 L90.5 65.5" />
          <Path d="M111 57 L109.5 65.5" />
        </G>
      )}
      <Path d={CHIN} fill="none" {...inner()} />
    </>
  );
}

export function Hat({ pass, look, uid }: { pass: Pass; look: Look; uid: string }) {
  if (pass === 'line')
    return (
      <>
        <Path d={HAT_PUFF} {...lineProps(look.out, look.color)} />
        <Path d={HAT_BAND} {...lineProps(look.out, look.color)} />
      </>
    );
  return (
    <>
      <Defs>
        <ClipPath id={`${uid}-hat`}>
          <Path d={HAT_PUFF} />
        </ClipPath>
      </Defs>
      <Path d={HAT_PUFF} fill={P.hat} />
      {/* a soft shade under the puff, no vertical lines */}
      <Path d="M50 22 C70 31 130 31 150 22 L150 40 L50 40 Z" fill={P.hatShade} clipPath={`url(#${uid}-hat)`} />
      <Path d={HAT_BAND} fill={P.hat} {...inner()} />
    </>
  );
}

/** One arm, hanging from its shoulder (the rig rotates it). Front arms get an inner line and a hidden shoulder. */
export function Arm({ side, pass, look, layer, palm, prop }: { side: 'L' | 'R'; pass: Pass; look: Look; layer: 'back' | 'front' | 'over'; palm?: boolean; prop?: 'spoon' | 'ladle' | 'knife' }) {
  const d = side === 'L' ? ARM_L : ARM_R;
  const [x, y] = side === 'L' ? PIVOT.shoulderL : PIVOT.shoulderR;
  const held = prop ? <Held prop={prop} x={x} y={y + ARM_LEN} side={side} /> : null;
  if (pass === 'line') return <Path d={d} {...lineProps(look.out, look.color)} />;
  const end = y + ARM_LEN;
  return (
    <>
      {prop === 'knife' || prop === 'ladle' ? held : null}
      <Path d={d} fill={P.fur} {...(layer === 'back' ? {} : inner())} />
      {/* hide the arm's line at the shoulder, so the arm grows out of the body */}
      {layer !== 'back' && <Circle cx={x} cy={y} r={6.8} fill={P.fur} />}
      {palm && (
        <G fill={P.beans}>
          <Ellipse cx={x} cy={end + 1.6} rx={3.6} ry={2.8} />
          <Circle cx={x - 3.9} cy={end - 3.2} r={1.5} />
          <Circle cx={x} cy={end - 4.7} r={1.5} />
          <Circle cx={x + 3.9} cy={end - 3.2} r={1.5} />
        </G>
      )}
      {prop === 'spoon' ? held : null}
    </>
  );
}

/** Things held in a paw, drawn in the arm's own space so they move with it. */
function Held({ prop, x, y, side }: { prop: 'spoon' | 'ladle' | 'knife'; x: number; y: number; side: 'L' | 'R' }) {
  const s = side === 'L' ? -1 : 1;
  if (prop === 'spoon')
    // eating: a small spoon pointing on from the paw toward the mouth
    return (
      <G transform={`rotate(${-30 * s} ${x} ${y})`}>
        <Rect x={x - 2.4} y={y - 4} width={4.8} height={20} rx={2.4} fill={P.steel} {...inner(2.4)} />
        <Ellipse cx={x} cy={y + 20} rx={7} ry={5.4} fill={P.steel} {...inner(2.4)} />
      </G>
    );
  if (prop === 'ladle')
    // cooking: a wooden spoon going down into the pot
    return (
      <G transform={`rotate(${150 * s} ${x} ${y})`}>
        <Rect x={x - 2.8} y={y - 12} width={5.6} height={36} rx={2.8} fill={P.wood} {...inner(2.4)} />
      </G>
    );
  // chopping: a small knife held by the handle, blade pointing down onto the board
  return (
    <G transform={`rotate(${-12 * s} ${x} ${y})`}>
      <Path d={`M${x - 3} ${y + 4} L${x - 3} ${y + 20} Q${x + 6} ${y + 17} ${x + 5} ${y + 4} Z`} fill={P.steel} {...inner(2.2)} />
      <Rect x={x - 3.4} y={y - 6} width={8.4} height={11} rx={3} fill={P.woodShade} {...inner(2.2)} />
    </G>
  );
}

/* ------------------------------------------------------------------ */
/* Face                                                                 */
/* ------------------------------------------------------------------ */

const shine = (cx: number, cy: number, big = 3.8, small = 1.8) => (
  <>
    <Circle cx={cx - 3.3} cy={cy - 4.6} r={big} fill={P.eyeShine} />
    <Circle cx={cx + 3.4} cy={cy + 4.8} r={small} fill={P.eyeShine} />
  </>
);

function Eye({ kind, c, side }: { kind: Eyes; c: Pt; side: 'L' | 'R' }) {
  const [cx, cy] = c;
  const s = side === 'L' ? 1 : -1; // toward the middle of the face
  const stroke = { stroke: P.eye, strokeWidth: 4.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  switch (kind) {
    case 'oval':
      return (
        <>
          <Ellipse cx={cx} cy={cy} rx={9.5} ry={12} fill={P.eye} />
          {shine(cx, cy)}
        </>
      );
    case 'sparkle':
      return (
        <>
          <Ellipse cx={cx} cy={cy} rx={10.4} ry={13} fill={P.eye} />
          {shine(cx, cy, 4.6, 2.3)}
          {/* a tiny star for the sparkle */}
          <Path d={`M${cx + 1} ${cy - 3} L${cx + 2} ${cy} L${cx + 5} ${cy + 1} L${cx + 2} ${cy + 2} L${cx + 1} ${cy + 5} L${cx} ${cy + 2} L${cx - 3} ${cy + 1} L${cx} ${cy} Z`} fill={P.eyeShine} opacity={0.9} />
        </>
      );
    case 'heart':
      return (
        <>
          <Path
            d={`M${cx} ${cy + 10} C${cx - 4} ${cy + 6} ${cx - 12} ${cy + 1} ${cx - 11} ${cy - 5} C${cx - 10} ${cy - 11} ${cx - 2} ${cy - 11} ${cx} ${cy - 5} C${cx + 2} ${cy - 11} ${cx + 10} ${cy - 11} ${cx + 11} ${cy - 5} C${cx + 12} ${cy + 1} ${cx + 4} ${cy + 6} ${cx} ${cy + 10} Z`}
            fill={P.heart}
            {...inner(2.6)}
          />
          <Circle cx={cx - 5.5} cy={cy - 5} r={2.4} fill={P.eyeShine} />
        </>
      );
    case 'arc':
      return <Path d={`M${cx - 8.5} ${cy + 3} Q${cx} ${cy - 9} ${cx + 8.5} ${cy + 3}`} {...stroke} />;
    case 'closed':
      return <Path d={`M${cx - 8.5} ${cy - 1} Q${cx} ${cy + 7} ${cx + 8.5} ${cy - 1}`} {...stroke} />;
    case 'squeeze':
      return <Path d={`M${cx - 6 * s} ${cy - 6.5} L${cx + 5 * s} ${cy} L${cx - 6 * s} ${cy + 6.5}`} {...stroke} />;
    case 'tiny':
      return (
        <>
          <Ellipse cx={cx} cy={cy} rx={10} ry={12.5} fill={P.eyeShine} {...inner(2.6)} />
          <Ellipse cx={cx} cy={cy + 1} rx={4.4} ry={5.4} fill={P.eye} />
          <Circle cx={cx - 1.4} cy={cy - 1} r={1.5} fill={P.eyeShine} />
        </>
      );
    case 'half':
      return (
        <>
          <Path d={`M${cx - 9.5} ${cy + 1} A9.5 10 0 0 0 ${cx + 9.5} ${cy + 1} Z`} fill={P.eye} />
          <Path d={`M${cx - 10.5} ${cy + 1} L${cx + 10.5} ${cy + 1}`} {...inner(3.4)} />
          <Circle cx={cx + 3.4} cy={cy + 5.6} r={1.6} fill={P.eyeShine} />
        </>
      );
    case 'focus':
      // determined: the top of the eye is flattened by a lid that slopes toward the nose
      return (
        <>
          <Path d={`M${cx - 9.5} ${cy - 3 - 2 * s} L${cx + 9.5} ${cy - 3 + 2 * s} L${cx + 9.5} ${cy + 1} A9.5 11 0 0 1 ${cx - 9.5} ${cy + 1} Z`} fill={P.eye} />
          <Path d={`M${cx - 10.5} ${cy - 3.2 - 2.2 * s} L${cx + 10.5} ${cy - 3.2 + 2.2 * s}`} {...inner(3.4)} />
          <Circle cx={cx - 3.3} cy={cy + 1} r={2.6} fill={P.eyeShine} />
          <Circle cx={cx + 3.4} cy={cy + 6} r={1.4} fill={P.eyeShine} />
        </>
      );
  }
}

export function EyesArt({ kind }: { kind: Eyes }) {
  return (
    <>
      <Eye kind={kind} c={EYE_L} side="L" />
      <Eye kind={kind} c={EYE_R} side="R" />
    </>
  );
}

export function BrowsArt({ kind }: { kind: Brows }) {
  if (kind === 'none') return null;
  const st = { ...inner(3.6), fill: 'none' };
  const y = 84;
  const pair = (l: string) => (
    <>
      <Path d={l} {...st} />
      <Path d={mirrorPath(l)} {...st} />
    </>
  );
  switch (kind) {
    case 'high':
      return pair(`M64 ${y - 3} Q72 ${y - 9} 80 ${y - 4}`);
    case 'worried':
      // the inner ends lift
      return pair(`M64 ${y - 1} Q72 ${y - 2} 80 ${y - 7}`);
    case 'determined':
      // the inner ends dip
      return pair(`M64 ${y - 6} Q72 ${y - 5} 80 ${y}`);
    case 'raised':
      // one brow up, one level
      return (
        <>
          <Path d={`M64 ${y - 1} Q72 ${y - 3} 80 ${y - 1}`} {...st} />
          <Path d={`M120 ${y - 6} Q128 ${y - 13} 136 ${y - 7}`} {...st} />
        </>
      );
  }
}

/** The tiny pink nose. */
export function Nose() {
  return <Path d="M95.2 110 Q100 108.4 104.8 110 Q106 111.2 104.2 113 L101.5 115.3 Q100 116.4 98.5 115.3 L95.8 113 Q94 111.2 95.2 110 Z" fill={P.nose} />;
}

export function MouthArt({ kind }: { kind: Mouth }) {
  const st = { ...inner(3), fill: 'none' };
  switch (kind) {
    case 'w':
      return <Path d="M91 116.5 Q95.5 122 100 116.5 Q104.5 122 109 116.5" {...st} />;
    case 'open':
      return (
        <>
          <Path d="M90.5 116.5 Q100 118.5 109.5 116.5 Q108.5 128 100 128.5 Q91.5 128 90.5 116.5 Z" fill={P.mouth} {...inner(2.8)} />
          <Path d="M94.5 125.2 Q100 121.4 105.5 125.2 Q103.8 128 100 128.2 Q96.2 128 94.5 125.2 Z" fill={P.tongue} />
        </>
      );
    case 'big':
      return (
        <>
          <Path d="M88.5 116 Q100 118.5 111.5 116 Q110.5 132 100 132.5 Q89.5 132 88.5 116 Z" fill={P.mouth} {...inner(2.8)} />
          <Path d="M93.5 128 Q100 123 106.5 128 Q104.5 132 100 132.2 Q95.5 132 93.5 128 Z" fill={P.tongue} />
        </>
      );
    case 'small':
      return <Path d="M95.5 119 Q100 121.8 104.5 119" {...st} />;
    case 'flat':
      return <Path d="M95 120 Q100 119 105 120" {...st} />;
    case 'tongue':
      return (
        <>
          <Path d="M96 118.5 L96 123.5 Q96 128 100 128 Q104 128 104 123.5 L104 118.5 Z" fill={P.tongue} {...inner(2.4)} />
          <Path d="M91 116.5 Q95.5 122 100 116.5 Q104.5 122 109 116.5" {...st} />
        </>
      );
    case 'chew':
      return <Path d="M94 118 Q97 121.5 100 118 Q103 121.5 106 118" {...st} />;
    case 'wavy':
      return <Path d="M89.5 121 Q92.5 117.5 95.5 121 Q98.5 124.5 101.5 121 Q104.5 117.5 107.5 121 Q109 122.5 110.5 121" {...st} />;
    case 'o':
      return <Ellipse cx={100} cy={122.5} rx={4.8} ry={5.8} fill={P.mouth} {...inner(2.8)} />;
    case 'grin':
      return <Path d="M88 117 Q93 123.5 98 119.5 Q100 118.5 102 119.5 Q107 123.5 112 117" {...st} />;
    case 'smile':
      return <Path d="M89 116.5 Q100 128 111 116.5" {...st} />;
  }
}

/** The open mouth used while talking (the rig scales it open and shut). */
export function TalkMouth() {
  return (
    <>
      <Ellipse cx={100} cy={121.5} rx={5.6} ry={5} fill={P.mouth} {...inner(2.6)} />
      <Ellipse cx={100} cy={124} rx={3.4} ry={1.9} fill={P.tongue} />
    </>
  );
}

/** Blush, full cheeks, flour, sweat: things on the face that belong to the expression. */
export function Cheeks({ strong, puff, flour, sweat }: { strong?: boolean; puff?: boolean; flour?: boolean; sweat?: boolean }) {
  return (
    <>
      <Ellipse cx={58} cy={118} rx={8.5} ry={5.2} fill={P.blush} opacity={strong ? 0.85 : 0.5} />
      <Ellipse cx={142} cy={118} rx={8.5} ry={5.2} fill={P.blush} opacity={strong ? 0.85 : 0.5} />
      {puff && (
        // full cheeks: round and rosy, with a little shine
        <>
          <Ellipse cx={60} cy={120} rx={12} ry={8.5} fill={P.blush} opacity={0.75} />
          <Ellipse cx={140} cy={120} rx={12} ry={8.5} fill={P.blush} opacity={0.75} />
          <Circle cx={56} cy={117} r={2.2} fill={P.eyeShine} opacity={0.9} />
          <Circle cx={136} cy={117} r={2.2} fill={P.eyeShine} opacity={0.9} />
        </>
      )}
      {flour && (
        <G fill={P.flour}>
          <Ellipse cx={56} cy={110} rx={6} ry={3.6} transform="rotate(-20 56 110)" />
          <Circle cx={63} cy={106} r={1.8} />
          <Circle cx={51} cy={116} r={1.4} />
        </G>
      )}
      {sweat && <Path d="M154 70 C154 70 147 79 147 83.5 C147 87.5 150 90 153.5 90 C157 90 160 87.5 160 83.5 C160 79 154 70 154 70 Z" fill={P.sweat} {...inner(2.2)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Props and effects (simple, so they read at small sizes)              */
/* ------------------------------------------------------------------ */

export function Pot() {
  return (
    <>
      {/* handles */}
      <Rect x={42} y={170} width={18} height={9} rx={4.5} fill={P.potShade} {...inner()} />
      <Rect x={140} y={170} width={18} height={9} rx={4.5} fill={P.potShade} {...inner()} />
      <Path d="M54 167 L146 167 L142 190 Q141 198 133 198 L67 198 Q59 198 58 190 Z" fill={P.pot} {...inner(OUT * 0.8)} />
      <Rect x={50} y={163} width={100} height={9} rx={4.5} fill={P.potShade} {...inner(OUT * 0.8)} />
    </>
  );
}

export function Board() {
  return (
    <>
      <Rect x={42} y={180} width={116} height={14} rx={6} fill={P.wood} {...inner(OUT * 0.8)} />
      <Rect x={50} y={184} width={100} height={3} rx={1.5} fill={P.woodShade} />
      {/* a carrot, half chopped */}
      <Path d="M58 178 Q58 173 63 173 L84 173 Q88 175.5 84 178 Z" fill={P.carrot} {...inner(2.2)} />
      <Circle cx={92} cy={176.5} r={3} fill={P.carrot} {...inner(2)} />
      <Circle cx={100} cy={176.5} r={3} fill={P.carrot} {...inner(2)} />
    </>
  );
}

/** Small effects around Biscuit. `t` runs 0..1 in a loop, `pulse` is 0..1 back and forth. */
export function Effect({ fx, t, pulse }: { fx: Fx; t: number; pulse: number }) {
  switch (fx) {
    case 'hearts':
      return (
        <>
          {[
            [160, 50, 0],
            [40, 64, 0.5],
          ].map(([x, y, o]) => {
            const p = (t + o) % 1;
            return <G key={x} opacity={p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85} transform={`translate(${x} ${y - p * 26}) scale(${0.8 + p * 0.3})`}><Heart /></G>;
          })}
        </>
      );
    case 'sparkle':
      return (
        <>
          <G transform={`translate(166 60) scale(${0.7 + pulse * 0.4})`}><Star /></G>
          <G transform={`translate(34 78) scale(${1.1 - pulse * 0.4})`}><Star /></G>
        </>
      );
    case 'zzz':
      return (
        <>
          {[0, 0.5].map((o) => {
            const p = (t + o) % 1;
            return <Path key={o} d="M-6 -6 L6 -6 L-6 6 L6 6" stroke={P.outline} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={Math.min(1, (1 - p) * 1.6)} transform={`translate(${160 + p * 16} ${62 - p * 34}) scale(${0.7 + p * 0.6})`} />;
          })}
        </>
      );
    case 'dots':
      return (
        <G fill={P.hat} {...inner(2.4)}>
          <Circle cx={44} cy={70} r={3.4} opacity={pulse > 0.1 ? 1 : 0.3} />
          <Circle cx={34} cy={56} r={4.6} opacity={pulse > 0.4 ? 1 : 0.3} />
          <Circle cx={24} cy={38} r={6.4} opacity={pulse > 0.7 ? 1 : 0.3} />
        </G>
      );
    case 'confetti':
      return (
        <>
          {P.confetti.flatMap((c, i) =>
            [0, 1].map((k) => {
              const p = (t + i * 0.17 + k * 0.5) % 1;
              const x = 22 + ((i * 37 + k * 71) % 156);
              return <Rect key={`${i}-${k}`} x={-3} y={-1.6} width={6} height={3.2} rx={1} fill={c} opacity={p > 0.85 ? (1 - p) / 0.15 : 1} transform={`translate(${x + Math.sin((p + i) * 6) * 5} ${10 + p * 70}) rotate(${p * 360 + i * 40})`} />;
            }),
          )}
        </>
      );
    case 'steam':
      return (
        <G stroke={P.steam} strokeWidth={4} strokeLinecap="round" fill="none">
          {[40, 160, 172].map((x, i) => {
            const p = (t + i * 0.33) % 1;
            return <Path key={x} d={`M${x} ${158 - p * 22} q-4 -6 0 -12 q4 -6 0 -12`} opacity={p < 0.2 ? p * 5 : 1 - (p - 0.2) / 0.8} />;
          })}
        </G>
      );
    case 'ring':
      return (
        <G stroke={P.outline} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.4 + pulse * 0.6}>
          <Path d="M34 60 Q26 72 30 86" />
          <Path d="M24 54 Q14 72 20 92" />
          <Path d="M166 60 Q174 72 170 86" />
          <Path d="M176 54 Q186 72 180 92" />
        </G>
      );
    case 'flour':
    case 'sweat':
    case 'note':
      return null;
  }
}

function Heart() {
  return <Path d="M0 7 C-3 4 -9 1 -8.5 -3.5 C-8 -8 -2 -8.5 0 -4 C2 -8.5 8 -8 8.5 -3.5 C9 1 3 4 0 7 Z" fill={P.heart} {...inner(2.2)} />;
}
function Star() {
  return <Path d="M0 -9 Q1.5 -1.5 9 0 Q1.5 1.5 0 9 Q-1.5 1.5 -9 0 Q-1.5 -1.5 0 -9 Z" fill={P.sparkle} {...inner(1.8)} />;
}

export type HeldProp = 'spoon' | 'ladle' | 'knife';
/** Which paw holds what, for each prop. */
export function heldBy(props: readonly Prop[]): { L?: HeldProp; R?: HeldProp } {
  if (props.includes('spoon')) return { R: 'spoon' };
  if (props.includes('pot')) return { R: 'ladle' };
  if (props.includes('board')) return { R: 'knife' };
  return {};
}

