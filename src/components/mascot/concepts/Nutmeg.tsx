/**
 * Concept C: Nutmeg, a small hedgehog with soft scalloped quills and a trusty oven mitt.
 */
import { Path } from 'react-native-svg';
import { capsule, ell, Frame, Layer, sparkle, type CharProps, type Part } from './kit';

export const nutmeg = {
  ink: '#3A1C3F',
  quill: '#7E4C3B',
  quillHi: '#986050',
  skin: '#F3D3A7',
  skinShade: '#DFB685',
  cream: '#FFF4E0',
  mitt: '#D23F5B',
  mittShade: '#AE2D47',
  nose: '#3A1C3F',
  blush: '#F08A8F',
  eye: '#2B1630',
  mouth: '#7C2238',
  tongue: '#F27C8A',
  spark: '#EDB031',
} as const;
const P = nutmeg;

/** A soft scalloped outline around (cx, cy): rounded bumps from angle a0 to a1 (degrees, 0 = right, 90 = down). */
function scallops(cx: number, cy: number, r: number, a0: number, a1: number, n: number, h: number) {
  const pt = (a: number, rr: number) => {
    const t = (a * Math.PI) / 180;
    return [Math.round((cx + Math.cos(t) * rr) * 10) / 10, Math.round((cy + Math.sin(t) * rr) * 10) / 10];
  };
  const step = (a1 - a0) / n;
  const [sx, sy] = pt(a0, r);
  let d = `M${sx} ${sy}`;
  for (let i = 0; i < n; i++) {
    const a = a0 + step * i;
    const [c1x, c1y] = pt(a + step * 0.05, r + h * 1.3);
    const [c2x, c2y] = pt(a + step * 0.95, r + h * 1.3);
    const [ex, ey] = pt(a + step, r);
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`;
  }
  return `${d} Q${cx} ${cy} ${sx} ${sy} Z`;
}

/** Quills on top of the head (not around the face, or it reads as a lion's mane) and behind the back. */
const HOOD = scallops(100, 90, 54, 186, 354, 7, 12);
const BACK_L = scallops(100, 156, 40, 128, 212, 3, 10);
const BACK_R = scallops(100, 156, 40, -32, 52, 3, 10);
const FACE = 'M100 42 C131 42 150 63 150 89 C150 115 128 130 100 130 C72 130 50 115 50 89 C50 63 69 42 100 42 Z';
const BODY = 'M100 118 C126 118 140 144 140 168 C140 184 126 191 100 191 C74 191 60 184 60 168 C60 144 74 118 100 118 Z';
const ARM = capsule(8.5, 22);
const SH = { x: 72, y: 133 };

const angles = { idle: [16, 16], happy: [58, 46], excited: [146, 138] } as const;

function face(pose: CharProps['pose']) {
  const out = [];
  for (const x of [80, 120]) {
    const side = x < 100 ? -1 : 1;
    if (pose === 'happy') {
      out.push(<Path key={`e${x}`} d={`M${x - 7.5} 95 Q${x} 85 ${x + 7.5} 95`} stroke={P.eye} strokeWidth={5} strokeLinecap="round" fill="none" />);
    } else if (pose === 'excited') {
      out.push(<Path key={`e${x}`} d={ell(x, 91, 8, 9.5)} fill={P.eye} />);
      out.push(<Path key={`s${x}`} d={ell(x - 3, 87, 3.2, 3.6)} fill="#FFFFFF" />);
      out.push(<Path key={`t${x}`} d={ell(x + 3, 95, 1.4, 1.4)} fill="#FFFFFF" />);
      out.push(<Path key={`b${x}`} d={`M${x - 6 * side} 75 Q${x} 71 ${x + 6 * side} 74`} stroke={P.ink} strokeWidth={3.4} strokeLinecap="round" fill="none" />);
    } else {
      // Idle: careful eyes. The brows tilt up in the middle, a little earnest.
      out.push(<Path key={`e${x}`} d={ell(x, 92, 6.5, 8.5)} fill={P.eye} />);
      out.push(<Path key={`s${x}`} d={ell(x - 2.2, 89, 2.2, 2.6)} fill="#FFFFFF" />);
      out.push(<Path key={`b${x}`} d={`M${x + 6 * side} 80 Q${x} 76 ${x - 6 * side} 77`} stroke={P.ink} strokeWidth={3.2} strokeLinecap="round" fill="none" />);
    }
  }
  out.push(<Path key="bl" d={ell(66, 106, 7, 4.5)} fill={P.blush} opacity={0.6} />);
  out.push(<Path key="br" d={ell(134, 106, 7, 4.5)} fill={P.blush} opacity={0.6} />);
  out.push(<Path key="muz" d={ell(100, 113, 15, 11)} fill={P.cream} />);
  out.push(<Path key="nose" d={ell(100, 106, 6.5, 5)} fill={P.nose} />);
  out.push(<Path key="nh" d={ell(98, 104.5, 2.2, 1.4)} fill="#FFFFFF" opacity={0.55} />);
  if (pose === 'idle') {
    out.push(<Path key="m" d="M95 116 Q100 120 105 116" stroke={P.mouth} strokeWidth={3} strokeLinecap="round" fill="none" />);
  } else {
    const big = pose === 'excited' ? 3 : 0;
    out.push(<Path key="m" d={`M92 114.5 Q100 116 108 114.5 Q107 ${125 + big} 100 ${126 + big} Q93 ${125 + big} 92 114.5 Z`} fill={P.mouth} />);
    out.push(<Path key="tg" d={ell(100, 122.5 + big, 4.5, 2.6)} fill={P.tongue} />);
  }
  return out;
}

export function Nutmeg({ pose, size, silhouette }: CharProps) {
  const w = size < 80 ? 5.2 : 3.8;
  const inner = w * 0.62;
  const [la, ra] = angles[pose];
  const armL = `translate(${SH.x} ${SH.y}) rotate(${la})`;
  const armR = `translate(${200 - SH.x} ${SH.y}) rotate(${-ra})`;

  const body: Part[] = [
    { d: BACK_L, fill: P.quill },
    { d: BACK_R, fill: P.quill },
    { d: ell(82, 189, 13, 7.5), fill: P.skinShade },
    { d: ell(118, 189, 13, 7.5), fill: P.skinShade },
    { d: BODY, fill: P.skin },
    { detail: <Path d={ell(100, 162, 21, 20)} fill={P.cream} /> },
    { d: HOOD, fill: P.quill },
    { d: FACE, fill: P.skin },
    // A widow's peak: the quills come down onto the forehead. This is what reads as "hedgehog".
    { detail: <Path d="M52 74 C60 58 78 52 92 62 C96 65 98 69 100 71 C102 69 104 65 108 62 C122 52 140 58 148 74 C146 52 126 38 100 38 C74 38 54 52 52 74 Z" fill={P.quill} /> },
    { detail: <Path d="M58 62 C64 50 76 44 90 42 C78 48 70 54 64 64 Z" fill={P.quillHi} /> },
    { detail: <><Path d={ell(54, 80, 6, 7)} fill={P.skinShade} /><Path d={ell(146, 80, 6, 7)} fill={P.skinShade} /></> },
    { detail: <>{face(pose)}</> },
    { detail: <Path d="M72 124.5 C82 129 91 130 100 130 C109 130 118 129 128 124.5" stroke={P.ink} strokeWidth={inner} fill="none" strokeLinecap="round" /> },
    { d: ARM.d, fill: P.skin, t: armL },
    { d: ARM.d, fill: P.skin, t: armR },
    { detail: <Path d={ARM.edge} transform={armL} stroke={P.ink} strokeWidth={inner} fill="none" strokeLinecap="round" /> },
    { detail: <Path d={ARM.edge} transform={armR} stroke={P.ink} strokeWidth={inner} fill="none" strokeLinecap="round" /> },
    // The signature: a puffy oven mitt on the left paw, with a cream cuff and a thumb.
    { d: ell(8, 27, 6, 8), fill: P.mitt, t: armL },
    { d: ell(0, 33, 12.5, 13), fill: P.mitt, t: armL },
    { detail: <Path d="M-6 40 C-2 44 4 44 8 41 C6 46 0 48 -4 46 Z" fill={P.mittShade} transform={armL} /> },
    { d: 'M-12 16 H12 Q14 16 14 18 V23 Q14 25 12 25 H-12 Q-14 25 -14 23 V18 Q-14 16 -12 16 Z', fill: P.cream, t: armL },
  ];

  return (
    <Frame size={size} pose={pose} silhouette={silhouette} ink={P.ink}>
      <Layer parts={body} ink={P.ink} w={w} silhouette={silhouette} />
      {pose === 'excited' && !silhouette && (
        <>
          <Path d={sparkle(166, 40, 9)} fill={P.spark} />
          <Path d={sparkle(30, 30, 6)} fill={P.spark} />
        </>
      )}
    </Frame>
  );
}
