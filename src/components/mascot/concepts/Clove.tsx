/**
 * Concept F: Clove, a little purple garlic bulb with a green sprout on top.
 * Garlic goes in almost everything: the friend who's always there in the pantry.
 */
import { G, Path } from 'react-native-svg';
import { FlatEye, Mouth, NUB, Shaded } from './flat';
import { ell, Frame, mirror, sparkle, type CharProps } from './kit';

export const cloveColors = {
  bulb: '#D7A9D6',
  bulbShade: '#B784B8',
  bulbHi: '#F2DDF0',
  sprout: '#3E9A5E',
  sproutShade: '#2E7A4C',
  root: '#F3E3D3',
  pupil: '#2B1630',
  mouth: '#6E1F45',
  tongue: '#F27C8A',
  spark: '#EDB031',
  shadow: '#3A1C3F',
} as const;
const P = cloveColors;

const BULB = 'M100 40 C116 54 154 76 160 116 C166 156 140 186 100 186 C60 186 34 156 40 116 C46 76 84 54 100 40 Z';
/** The clove segments: thin shade crescents, no lines. */
const SEG = 'M72 70 C54 102 52 150 76 182 C64 150 64 104 72 70 Z';

const arms = { idle: [26, 26], happy: [72, 72], excited: [150, 150] } as const;
const sprouts = { idle: 0, happy: -8, excited: -16 } as const;

export function Clove({ pose, size, silhouette }: CharProps) {
  const [la, ra] = arms[pose];
  const fill = (c: string) => (silhouette ? '#000000' : c);
  // The signature: a sprout that curls up when Clove is happy (and would droop when sad).
  const sprout = (
    <G transform={`rotate(${sprouts[pose]} 100 44)`}>
      <Path d="M100 46 C99 30 106 16 118 14 C127 13 130 22 124 27 C119 31 113 27 116 22" stroke={fill(P.sprout)} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M101 34 C92 26 82 26 76 32 C84 36 93 37 101 34 Z" fill={fill(P.sprout)} />
    </G>
  );
  return (
    <Frame size={size} pose={pose} silhouette={silhouette} ink={P.shadow}>
      {sprout}
      <Path d={NUB} fill={fill(P.bulbShade)} transform={`translate(46 134) rotate(${la})`} />
      <Path d={NUB} fill={fill(P.bulbShade)} transform={`translate(154 134) rotate(${-ra})`} />
      {/* Roots as little feet. */}
      {[82, 100, 118].map((x) => (
        <Path key={x} d={ell(x, 188, 9, 6)} fill={fill(P.root)} />
      ))}
      <Shaded shapes={[BULB]} base={P.bulb} shade={P.bulbShade} silhouette={silhouette} />
      {!silhouette && (
        <G>
          <Path d={SEG} fill={P.bulbShade} />
          <Path d={mirror(SEG)} fill={P.bulbShade} />
          <Path d="M64 98 C70 80 82 66 96 56 C88 70 80 84 74 100 Z" fill={P.bulbHi} />
          <FlatEye x={83} y={120} rx={14.5} ry={16.5} pose={pose} side={-1} face={P.bulb} pupil={P.pupil} />
          <FlatEye x={117} y={120} rx={14.5} ry={16.5} pose={pose} side={1} face={P.bulb} pupil={P.pupil} />
          <Mouth x={100} y={148} pose={pose} color={P.mouth} tongue={P.tongue} />
          {pose === 'excited' && (
            <G>
              <Path d={sparkle(34, 56, 8)} fill={P.spark} />
              <Path d={sparkle(166, 70, 6)} fill={P.spark} />
            </G>
          )}
        </G>
      )}
    </Frame>
  );
}
