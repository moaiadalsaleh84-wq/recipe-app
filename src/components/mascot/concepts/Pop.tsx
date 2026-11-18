/**
 * Concept D: Pop, a freshly popped popcorn kernel (the app is called Pantry Pop).
 * One puffy cloud shape is the whole body. It still wears its golden kernel shell like an apron.
 */
import { G, Path } from 'react-native-svg';
import { FlatEye, Mouth, NUB, Shaded } from './flat';
import { ell, Frame, sparkle, type CharProps } from './kit';

export const popColors = {
  puff: '#FFE9A8',
  puffShade: '#F5C95E',
  puffHi: '#FFF8E1',
  shell: '#E8952A',
  shellShade: '#C9761A',
  pupil: '#2B1630',
  mouth: '#7C2238',
  tongue: '#F27C8A',
  spark: '#E8952A',
  shadow: '#3A1C3F',
} as const;
const P = popColors;

/** The puff: overlapping circles, so the outline is naturally bumpy and soft. */
const PUFF = [ell(100, 118, 56, 54), ell(66, 78, 30, 30), ell(101, 60, 34, 32), ell(136, 78, 30, 30), ell(52, 114, 26, 26), ell(148, 114, 26, 26)];
const SHELL = 'M52 140 C54 170 76 188 100 188 C124 188 146 170 148 140 C134 153 117 158 100 158 C83 158 66 153 52 140 Z';

const arms = { idle: [28, 28], happy: [74, 74], excited: [150, 150] } as const;

export function Pop({ pose, size, silhouette }: CharProps) {
  const [la, ra] = arms[pose];
  const fill = (c: string) => (silhouette ? '#000000' : c);
  return (
    <Frame size={size} pose={pose} silhouette={silhouette} ink={P.shadow}>
      {/* Arms and feet sit behind the body. */}
      <Path d={NUB} fill={fill(P.puffShade)} transform={`translate(46 132) rotate(${la})`} />
      <Path d={NUB} fill={fill(P.puffShade)} transform={`translate(154 132) rotate(${-ra})`} />
      <Path d={ell(84, 190, 12, 6.5)} fill={fill(P.shellShade)} />
      <Path d={ell(116, 190, 12, 6.5)} fill={fill(P.shellShade)} />
      <Shaded shapes={PUFF} base={P.puff} shade={P.puffShade} silhouette={silhouette} />
      <Shaded shapes={[SHELL]} base={P.shell} shade={P.shellShade} dx={-4} dy={-5} silhouette={silhouette} />
      {!silhouette && (
        <G>
          <Path d={ell(84, 46, 11, 6.5)} fill={P.puffHi} transform="rotate(-24 84 46)" />
          <Path d={ell(56, 70, 6, 4)} fill={P.puffHi} transform="rotate(-40 56 70)" />
          <FlatEye x={83} y={104} rx={15} ry={17} pose={pose} side={-1} face={P.puff} pupil={P.pupil} />
          <FlatEye x={117} y={104} rx={15} ry={17} pose={pose} side={1} face={P.puff} pupil={P.pupil} />
          <Mouth x={100} y={131} pose={pose} color={P.mouth} tongue={P.tongue} />
          {pose === 'excited' && (
            <G>
              {/* The signature move: little puffs pop off the top. */}
              <Path d={ell(58, 22, 9, 8)} fill={P.puff} />
              <Path d={ell(146, 16, 7, 6.5)} fill={P.puff} />
              <Path d={ell(162, 42, 5, 4.5)} fill={P.puff} />
              <Path d={sparkle(30, 48, 7)} fill={P.spark} />
            </G>
          )}
        </G>
      )}
    </Frame>
  );
}
