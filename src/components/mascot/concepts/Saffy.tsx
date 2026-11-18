/**
 * Concept A: Saffy, a saffron cat with a slouchy soufflé hat that tips to one side.
 */
import { G, Path } from 'react-native-svg';
import { capsule, ell, Frame, Layer, mirror, sparkle, type CharProps, type Part } from './kit';

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

function face(pose: CharProps['pose']) {
  const out = [];
  // Eyes sit in the lower half of the head, well apart from the muzzle.
  for (const x of [78, 122]) {
    if (pose === 'happy') {
      out.push(<Path key={`e${x}`} d={`M${x - 8} 96 Q${x} 85 ${x + 8} 96`} stroke={P.eye} strokeWidth={5} strokeLinecap="round" fill="none" />);
    } else if (pose === 'excited') {
      out.push(<Path key={`e${x}`} d={ell(x, 91, 8.5, 11)} fill={P.eye} />);
      out.push(<Path key={`s${x}`} d={ell(x - 3, 86, 3.4, 4)} fill="#FFFFFF" />);
      out.push(<Path key={`t${x}`} d={ell(x + 3, 96, 1.6, 1.6)} fill="#FFFFFF" />);
      out.push(<Path key={`b${x}`} d={`M${x - 7} 75 Q${x} 70 ${x + 7} 74`} stroke={P.ink} strokeWidth={3.4} strokeLinecap="round" fill="none" />);
    } else {
      // Idle: an upright pill with a relaxed upper lid that covers the top of the eye.
      out.push(<Path key={`e${x}`} d={ell(x, 93, 7, 9.5)} fill={P.eye} />);
      const lid = x < 100 ? `M${x - 9} 81 H${x + 9} V88 C${x + 4} 86.5 ${x - 3} 86.5 ${x - 9} 89 Z` : `M${x - 9} 81 H${x + 9} V89 C${x + 3} 86.5 ${x - 4} 86.5 ${x - 9} 88 Z`;
      out.push(<Path key={`l${x}`} d={lid} fill={P.fur} />);
      out.push(<Path key={`s${x}`} d={ell(x - 2.5, 90.5, 2.2, 2.8)} fill="#FFFFFF" />);
    }
  }
  out.push(<Path key="bl" d={ell(62, 107, 8, 4.8)} fill={P.blush} opacity={0.6} />);
  out.push(<Path key="br" d={ell(138, 107, 8, 4.8)} fill={P.blush} opacity={0.6} />);
  out.push(<Path key="muz" d={ell(100, 113, 15, 11)} fill={P.cream} />);
  out.push(<Path key="nose" d="M95 106 Q100 103.5 105 106 Q103.5 110.5 100 111.5 Q96.5 110.5 95 106 Z" fill={P.nose} />);
  if (pose === 'idle') {
    out.push(<Path key="m" d="M93.5 115.5 Q100 121 106.5 115.5" stroke={P.mouth} strokeWidth={3} strokeLinecap="round" fill="none" />);
  } else {
    const big = pose === 'excited' ? 4 : 0;
    out.push(<Path key="m" d={`M${91 - big / 2} 114.5 Q100 116 ${109 + big / 2} 114.5 Q${108 + big / 2} ${127 + big} 100 ${128 + big} Q${92 - big / 2} ${127 + big} ${91 - big / 2} 114.5 Z`} fill={P.mouth} />);
    out.push(<Path key="tg" d={ell(100, 124.5 + big, 5.2, 3)} fill={P.tongue} />);
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
    { detail: <>{face(pose)}</> },
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

