/**
 * Concept B: Pip, a river otter who never puts down a favourite wooden spoon.
 */
import { G, Path } from 'react-native-svg';
import { capsule, ell, Eye, Frame, Layer, sparkle, tip, type CharProps, type Part } from './kit';

export const pip = {
  ink: '#3A1C3F',
  fur: '#BC7A4B',
  shade: '#9D5F37',
  hi: '#DDA676',
  cream: '#F9E8CF',
  nose: '#3A1C3F',
  blush: '#F08A8F',
  eye: '#2B1630',
  mouth: '#7C2238',
  tongue: '#F27C8A',
  wood: '#E2A963',
  woodShade: '#C1873F',
  spark: '#EDB031',
} as const;
const P = pip;

const HEAD = 'M100 40 C141 40 164 60 164 87 C164 114 137 129 100 129 C63 129 36 114 36 87 C36 60 59 40 100 40 Z';
const BODY = 'M100 114 C128 114 144 140 144 166 C144 183 128 191 100 191 C72 191 56 183 56 166 C56 140 72 114 100 114 Z';
const TAIL = 'M72 176 C54 184 33 183 21 171 C17 167 12 169 13 175 C17 190 44 197 74 190 Z';
const MUZZLE = 'M100 101 C106 95 121 93 131 100 C141 108 136 123 119 125 C110 126 104 124 100 121 C96 124 90 126 81 125 C64 123 59 108 69 100 C79 93 94 95 100 101 Z';
const ARM = capsule(9, 26);
const SH = { x: 69, y: 129 };

const pose3 = {
  idle: { l: 17, r: 40, spoon: 16 },
  happy: { l: 52, r: 62, spoon: 26 },
  excited: { l: 140, r: 142, spoon: 8 },
} as const;

function face(pose: CharProps['pose'], w: number) {
  const out = [];
  out.push(<Eye key="el" x={81} y={87} rx={13} ry={13.5} pose={pose} side={-1} lid={P.fur} ink={P.ink} pupil={P.eye} w={w} />);
  out.push(<Eye key="er" x={119} y={87} rx={13} ry={13.5} pose={pose} side={1} lid={P.fur} ink={P.ink} pupil={P.eye} w={w} />);
  out.push(<Path key="bl" d={ell(57, 105, 7, 4.5)} fill={P.blush} opacity={0.55} />);
  out.push(<Path key="br" d={ell(143, 105, 7, 4.5)} fill={P.blush} opacity={0.55} />);
  // The muzzle, nose, whiskers and mouth as one small group under the eyes.
  const g = [];
  g.push(<Path key="muz" d={MUZZLE} fill={P.cream} />);
  for (const [dx, dy] of [[-17, 109], [-22, 115], [-14, 116]] as const) {
    g.push(<Path key={`w${dx}${dy}`} d={ell(100 + dx, dy, 1.6, 1.6)} fill={P.shade} />);
    g.push(<Path key={`v${dx}${dy}`} d={ell(100 - dx, dy, 1.6, 1.6)} fill={P.shade} />);
  }
  g.push(<Path key="nose" d="M91 100 Q100 96 109 100 Q108 106.5 100 108.5 Q92 106.5 91 100 Z" fill={P.nose} />);
  g.push(<Path key="nh" d={ell(96, 99.5, 3, 1.6)} fill="#FFFFFF" opacity={0.5} />);
  if (pose === 'idle') {
    g.push(<Path key="m" d="M94 114 Q100 119 106 114" stroke={P.mouth} strokeWidth={3.6} strokeLinecap="round" fill="none" />);
  } else {
    const big = pose === 'excited' ? 2 : 0;
    g.push(<Path key="m" d={`M90 112.5 Q100 114 110 112.5 Q109 ${124 + big} 100 ${125 + big} Q91 ${124 + big} 90 112.5 Z`} fill={P.mouth} />);
    g.push(<Path key="tg" d={ell(100, 121.5 + big, 5.2, 3)} fill={P.tongue} />);
  }
  out.push(<G key="muzzle" transform="translate(100 117) scale(0.78) translate(-100 -112)">{g}</G>);
  return out;
}

export function Pip({ pose, size, silhouette }: CharProps) {
  const w = size < 80 ? 5.2 : 3.8;
  const inner = w * 0.62;
  const p = pose3[pose];
  const armL = `translate(${SH.x} ${SH.y}) rotate(${p.l})`;
  const armR = `translate(${200 - SH.x} ${SH.y}) rotate(${-p.r})`;
  const [px, py] = tip(200 - SH.x, SH.y, 26, -p.r);

  // The signature: a long wooden spoon, held behind the paw so the paw grips it.
  const spoon: Part[] = [
    { line: 'M0 20 L0 -60', color: P.wood, w: 7 },
    { d: ell(0, -75, 11.5, 15.5), fill: P.wood },
    { detail: <Path d={ell(1.5, -73, 6.5, 10)} fill={P.woodShade} /> },
  ];

  const body: Part[] = [
    { d: TAIL, fill: P.fur },
    { d: ell(44, 68, 10, 9), fill: P.fur },
    { d: ell(156, 68, 10, 9), fill: P.fur },
    { d: ell(80, 189, 15, 8), fill: P.shade },
    { d: ell(120, 189, 15, 8), fill: P.shade },
    { d: BODY, fill: P.fur },
    { detail: <Path d={ell(100, 160, 24, 22)} fill={P.cream} /> },
    { detail: <Path d={`M20 172 C30 180 50 184 70 180 L72 188 C48 193 26 188 18 178 Z`} fill={P.shade} /> },
    { detail: <><Path d={ell(44, 68, 4.5, 4)} fill={P.shade} /><Path d={ell(156, 68, 4.5, 4)} fill={P.shade} /></> },
    { d: HEAD, fill: P.fur },
    { detail: <Path d="M48 74 C51 61 62 51 78 46 C67 54 60 63 56 76 Z" fill={P.hi} /> },
    { detail: <>{face(pose, w)}</> },
    { detail: <Path d="M70 124 C80 128 90 129 100 129 C110 129 120 128 130 124" stroke={P.ink} strokeWidth={inner} fill="none" strokeLinecap="round" /> },
    { d: ARM.d, fill: P.fur, t: armL },
    { d: ARM.d, fill: P.fur, t: armR },
    { detail: <Path d={ARM.edge} transform={armL} stroke={P.ink} strokeWidth={inner} fill="none" strokeLinecap="round" /> },
    { detail: <Path d={ARM.edge} transform={armR} stroke={P.ink} strokeWidth={inner} fill="none" strokeLinecap="round" /> },
  ];

  return (
    <Frame size={size} pose={pose} silhouette={silhouette} ink={P.ink}>
      <G transform={`translate(${px} ${py}) rotate(${p.spoon})`}>
        <Layer parts={spoon} ink={P.ink} w={w} silhouette={silhouette} />
      </G>
      <Layer parts={body} ink={P.ink} w={w} silhouette={silhouette} />
      {pose === 'excited' && !silhouette && (
        <>
          <Path d={sparkle(28, 46, 9)} fill={P.spark} />
          <Path d={sparkle(40, 16, 5.5)} fill={P.spark} />
        </>
      )}
    </Frame>
  );
}
