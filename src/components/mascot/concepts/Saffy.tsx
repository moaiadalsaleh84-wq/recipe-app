/**
 * Concept A: Saffy, a saffron cat with a slouchy soufflé hat that tips to one side.
 */
import { G, Path } from 'react-native-svg';
import { capsule, ell, Eye, Frame, Layer, mirror, sparkle, type CharProps, type Part } from './kit';

export const saffy = {
  ink: '#3A1C3F',
  fur: '#F4B23F',
  shade: '#DE952A',
  hi: '#FFD98C',
  cream: '#FFF3DA',
  pink: '#F5A3AE',
  nose: '#D44A68',
  blush: '#F27D8C',
  eye: '#2B1630',
  mouth: '#7C2238',
  tongue: '#F27C8A',
  hat: '#FFFFFF',
  hatShade: '#E6DCEC',
  band: '#5A2D61',
  spark: '#EDB031',
} as const;
const P = saffy;

const EAR = 'M118 46 C124 30 137 16 149 14 C156 14 158 21 158 31 C158 44 154 56 148 66 Z';
const EAR_IN = 'M128 44 C133 34 141 25 148 24 C150 31 149 42 146 52 Z';
const HEAD = 'M100 34 C136 34 158 54 158 84 C158 114 134 132 100 132 C66 132 42 114 42 84 C42 54 64 34 100 34 Z';
const BODY = 'M100 116 C126 116 140 142 140 166 C140 182 128 190 100 190 C72 190 60 182 60 166 C60 142 74 116 100 116 Z';
const TAIL = 'M134 176 C156 174 168 154 160 136 C156 127 160 118 168 118';
const ARM = capsule(9, 26);
const SHOULDER = { x: 70, y: 131 };

const angles = { idle: [17, 17], happy: [48, 48], excited: [138, 138] } as const;

function face(pose: CharProps['pose'], w: number) {
  const out = [];
  // Big eyes in the lower half of the head, close together, well apart from the small muzzle.
  out.push(<Eye key="el" x={80} y={90} rx={14} ry={15.5} pose={pose} side={-1} lid={P.fur} ink={P.ink} pupil={P.eye} w={w} />);
  out.push(<Eye key="er" x={120} y={90} rx={14} ry={15.5} pose={pose} side={1} lid={P.fur} ink={P.ink} pupil={P.eye} w={w} />);
  out.push(<Path key="bl" d={ell(60, 111, 7, 4.5)} fill={P.blush} opacity={0.6} />);
  out.push(<Path key="br" d={ell(140, 111, 7, 4.5)} fill={P.blush} opacity={0.6} />);
  out.push(<Path key="muz" d={ell(100, 119, 13, 9.5)} fill={P.cream} />);
  out.push(<Path key="nose" d="M95.5 111.5 Q100 109.5 104.5 111.5 Q103 115.5 100 116.5 Q97 115.5 95.5 111.5 Z" fill={P.nose} />);
  if (pose === 'idle') {
    out.push(<Path key="m" d="M94.5 120.5 Q100 125.5 105.5 120.5" stroke={P.mouth} strokeWidth={3} strokeLinecap="round" fill="none" />);
  } else {
    const big = pose === 'excited' ? 2 : 0;
    out.push(<Path key="m" d={`M92.5 119.5 Q100 121 107.5 119.5 Q106.5 ${128.5 + big} 100 ${129.5 + big} Q93.5 ${128.5 + big} 92.5 119.5 Z`} fill={P.mouth} />);
    out.push(<Path key="tg" d={ell(100, 126.5 + big, 4.4, 2.5)} fill={P.tongue} />);
  }
  return out;
}

export function Saffy({ pose, size, silhouette }: CharProps) {
  const w = size < 80 ? 5.2 : 3.8;
  const inner = w * 0.62;
  const [la, ra] = angles[pose];
  const armL = `translate(${SHOULDER.x} ${SHOULDER.y}) rotate(${la})`;
  const armR = `translate(${200 - SHOULDER.x} ${SHOULDER.y}) rotate(${-ra})`;
  const hatTilt = { idle: -3, happy: -7, excited: -13 }[pose];

  const body: Part[] = [
    { line: TAIL, color: P.fur, w: 13 },
    { d: EAR, fill: P.fur },
    { d: mirror(EAR), fill: P.fur },
    { d: ell(82, 189, 14, 8), fill: P.shade },
    { d: ell(118, 189, 14, 8), fill: P.shade },
    { d: BODY, fill: P.fur },
    { detail: <Path d={ell(100, 163, 21, 19)} fill={P.cream} /> },
    { detail: <Path d={EAR_IN} fill={P.pink} /> },
    { detail: <Path d={mirror(EAR_IN)} fill={P.pink} /> },
    { d: HEAD, fill: P.fur },
    { detail: <Path d="M54 72 C55 58 64 48 78 42 C69 51 63 60 61 74 Z" fill={P.hi} /> },
    { detail: <>{face(pose, w)}</> },
    { detail: <Path d="M72 125 C82 130.5 91 132 100 132 C109 132 118 130.5 128 125" stroke={P.ink} strokeWidth={inner} fill="none" strokeLinecap="round" /> },
    { d: ARM.d, fill: P.fur, t: armL },
    { d: ARM.d, fill: P.fur, t: armR },
    { detail: <Path d={ARM.edge} transform={armL} stroke={P.ink} strokeWidth={inner} fill="none" strokeLinecap="round" /> },
    { detail: <Path d={ARM.edge} transform={armR} stroke={P.ink} strokeWidth={inner} fill="none" strokeLinecap="round" /> },
  ];

  // The signature: a soft, slouchy soufflé hat that leans and puffs out to one side.
  const hat: Part[] = [
    { d: 'M74 36 C64 20 66 -2 90 -8 C112 -13 136 -8 150 4 C162 14 170 28 164 37 C159 44 149 43 144 37 C140 33 135 32 128 34 Z', fill: P.hat },
    { detail: <Path d="M128 34 C135 32 140 33 144 37 C149 43 159 44 164 37 C166 33 166 29 164 25 C160 31 152 32 146 28 C140 24 132 25 126 29 Z" fill={P.hatShade} /> },
    { d: 'M79 31 H121 Q126 31 126 35 V39 Q126 43 121 43 H79 Q74 43 74 39 V35 Q74 31 79 31 Z', fill: P.band },
  ];

  return (
    <Frame size={size} pose={pose} silhouette={silhouette} ink={P.ink}>
      <Layer parts={body} ink={P.ink} w={w} silhouette={silhouette} />
      <G transform={`rotate(${hatTilt} 100 40)`}>
        <Layer parts={hat} ink={P.ink} w={w} silhouette={silhouette} />
      </G>
      {pose === 'excited' && !silhouette && (
        <>
          <Path d={sparkle(30, 40, 9)} fill={P.spark} />
          <Path d={sparkle(176, 64, 7)} fill={P.spark} />
        </>
      )}
    </Frame>
  );
}

