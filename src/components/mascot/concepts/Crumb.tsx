/**
 * Concept E: Crumb, a cat shaped like a loaf of bread ("cat loaf").
 * The tabby stripes are the baker's score marks on the crust.
 */
import { G, Path } from 'react-native-svg';
import { FlatEye, Mouth, NUB, Shaded } from './flat';
import { ell, Frame, mirror, sparkle, type CharProps } from './kit';

export const crumbColors = {
  crust: '#C8803E',
  crustShade: '#A8652C',
  score: '#ECB673',
  crumb: '#FBE2B4',
  crumbShade: '#F0CB8A',
  nose: '#D44A68',
  pupil: '#2B1630',
  mouth: '#7C2238',
  tongue: '#F27C8A',
  spark: '#EDB031',
  shadow: '#3A1C3F',
} as const;
const P = crumbColors;

const LOAF = 'M100 56 C150 56 170 80 170 114 L170 162 C170 178 160 188 144 188 L56 188 C40 188 30 178 30 162 L30 114 C30 80 50 56 100 56 Z';
const EAR = 'M124 66 C132 46 144 32 155 30 C162 30 164 38 162 50 C160 62 155 74 150 84 Z';
const FACE = 'M100 96 C137 96 158 112 158 140 L158 166 C158 178 150 186 138 186 L62 186 C50 186 42 178 42 166 L42 140 C42 112 63 96 100 96 Z';

const arms = { idle: [0, 0], happy: [70, 70], excited: [148, 148] } as const;

export function Crumb({ pose, size, silhouette }: CharProps) {
  const [la, ra] = arms[pose];
  const fill = (c: string) => (silhouette ? '#000000' : c);
  return (
    <Frame size={size} pose={pose} silhouette={silhouette} ink={P.shadow}>
      {pose !== 'idle' && (
        <G>
          <Path d={NUB} fill={fill(P.crust)} transform={`translate(36 132) rotate(${la})`} />
          <Path d={NUB} fill={fill(P.crust)} transform={`translate(164 132) rotate(${-ra})`} />
        </G>
      )}
      <Shaded shapes={[EAR, mirror(EAR), LOAF]} base={P.crust} shade={P.crustShade} silhouette={silhouette} />
      {!silhouette && (
        <G>
          <Path d="M134 68 C139 54 147 44 153 42 C155 50 153 62 148 72 Z" fill={P.crumbShade} />
          <Path d={mirror('M134 68 C139 54 147 44 153 42 C155 50 153 62 148 72 Z')} fill={P.crumbShade} />
          {/* The signature: three score marks across the crust, which are also the tabby stripes. */}
          <Path d="M76 70 Q82 78 79 88" stroke={P.score} strokeWidth={6} strokeLinecap="round" fill="none" />
          <Path d="M100 64 Q104 74 101 86" stroke={P.score} strokeWidth={6} strokeLinecap="round" fill="none" />
          <Path d="M124 70 Q127 78 122 88" stroke={P.score} strokeWidth={6} strokeLinecap="round" fill="none" />
          <Shaded shapes={[FACE]} base={P.crumb} shade={P.crumbShade} dx={-4} dy={-5} />
          {pose === 'idle' && (
            <G>
              {/* Paws tucked in front, loaf style. */}
              <Path d={ell(76, 184, 15, 9)} fill={P.crust} />
              <Path d={ell(124, 184, 15, 9)} fill={P.crust} />
            </G>
          )}
          <FlatEye x={81} y={124} rx={15} ry={16.5} pose={pose} side={-1} face={P.crumb} pupil={P.pupil} />
          <FlatEye x={119} y={124} rx={15} ry={16.5} pose={pose} side={1} face={P.crumb} pupil={P.pupil} />
          <Path d="M95.5 143 Q100 141 104.5 143 Q103 147 100 148 Q97 147 95.5 143 Z" fill={P.nose} />
          <Mouth x={100} y={153} pose={pose} color={P.mouth} tongue={P.tongue} />
          {pose === 'excited' && (
            <G>
              <Path d={sparkle(22, 52, 8)} fill={P.spark} />
              <Path d={sparkle(180, 70, 6)} fill={P.spark} />
            </G>
          )}
        </G>
      )}
    </Frame>
  );
}
