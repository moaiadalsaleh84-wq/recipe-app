/**
 * The drawn fox: a flat, round little fox in the app's colors, used for any pose that has no image
 * yet (see foxImages.ts). One drawing; each pose changes the eyes, mouth and one small prop.
 * `blink` swaps the open eyes for closed ones (the idle blink).
 */
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { pop } from '../../theme';
import type { FoxPose } from './foxPoses';

const ORANGE = '#F5893A';
const ORANGE_DARK = '#E0702A';
const CREAM = '#FFF6EC';
const INK = pop.ink;
const BLUSH = '#FF9C9C';

export function FoxArt({ pose, size, blink = false }: { pose: FoxPose; size: number; blink?: boolean }) {
  const closed = blink || pose === 'sleepy';
  const happyEyes = pose === 'happy' || pose === 'cheer';
  const wide = pose === 'alert';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Tail: a big curl behind the body, white tip */}
      <Path d="M64 92 C 84 94, 96 80, 92 62 C 90 54, 84 50, 80 52 C 84 62, 80 76, 64 80 Z" fill={ORANGE_DARK} />
      <Path d="M92 62 C 90 54, 84 50, 80 52 C 82 56, 83 60, 83 64 C 87 64, 90 63, 92 62 Z" fill={CREAM} />

      {/* Body and chest */}
      <Path d="M29 100 C 29 85, 37 75, 50 75 C 63 75, 71 85, 71 100 Z" fill={ORANGE} />
      <Path d="M41 100 C 41 89, 45 82, 50 82 C 55 82, 59 89, 59 100 Z" fill={CREAM} />

      {/* Ears, with dark tips and soft insides */}
      <Path d="M21 38 L 27 9 L 46 27 Z" fill={ORANGE} stroke={ORANGE} strokeWidth={5} strokeLinejoin="round" />
      <Path d="M79 38 L 73 9 L 54 27 Z" fill={ORANGE} stroke={ORANGE} strokeWidth={5} strokeLinejoin="round" />
      <Path d="M27 9 L 24.5 21 L 33 15 Z" fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M73 9 L 75.5 21 L 67 15 Z" fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M28 31 L 30 19 L 39 27 Z" fill={BLUSH} opacity={0.55} strokeLinejoin="round" />
      <Path d="M72 31 L 70 19 L 61 27 Z" fill={BLUSH} opacity={0.55} strokeLinejoin="round" />

      {/* Head and the cream muzzle */}
      <Path d="M50 21 C 67 21, 85 31, 86 50 C 87 63, 72 77, 50 80 C 28 77, 13 63, 14 50 C 15 31, 33 21, 50 21 Z" fill={ORANGE} />
      <Path d="M17 53 C 26 50, 41 55, 50 65 C 59 55, 74 50, 83 53 C 81 66, 67 78, 50 80 C 33 78, 19 66, 17 53 Z" fill={CREAM} />

      {/* Cheeks */}
      <Circle cx={29} cy={61} r={4.5} fill={BLUSH} opacity={0.45} />
      <Circle cx={71} cy={61} r={4.5} fill={BLUSH} opacity={0.45} />

      {/* Eyes */}
      {closed ? (
        <G stroke={INK} strokeWidth={2.6} strokeLinecap="round" fill="none">
          <Path d="M33 49 Q 38 52.5, 43 49" />
          <Path d="M57 49 Q 62 52.5, 67 49" />
        </G>
      ) : happyEyes ? (
        <G stroke={INK} strokeWidth={2.8} strokeLinecap="round" fill="none">
          <Path d="M33 50 Q 38 44, 43 50" />
          <Path d="M57 50 Q 62 44, 67 50" />
        </G>
      ) : pose === 'reading' ? (
        <G fill={INK}>
          <Ellipse cx={38} cy={51} rx={3.6} ry={3.2} />
          <Ellipse cx={62} cy={51} rx={3.6} ry={3.2} />
        </G>
      ) : (
        <G>
          <Ellipse cx={38} cy={48} rx={wide ? 5 : 4.2} ry={wide ? 6.2 : 5.2} fill={INK} />
          <Ellipse cx={62} cy={48} rx={wide ? 5 : 4.2} ry={wide ? 6.2 : 5.2} fill={INK} />
          <Circle cx={39.6} cy={46} r={1.5} fill="#FFFFFF" />
          <Circle cx={63.6} cy={46} r={1.5} fill="#FFFFFF" />
        </G>
      )}
      {pose === 'oops' && (
        <G stroke={INK} strokeWidth={2.2} strokeLinecap="round">
          <Path d="M32 42 L 42 38.5" />
          <Path d="M68 42 L 58 38.5" />
        </G>
      )}

      {/* Nose */}
      <Ellipse cx={50} cy={65} rx={4.6} ry={3.3} fill={INK} />

      {/* Mouth */}
      {pose === 'cheer' || pose === 'alert' ? (
        <Path d="M44.5 70 Q 50 79, 55.5 70 Z" fill={INK} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      ) : pose === 'oops' ? (
        <Path d="M44 73 Q 47 70.5, 50 73 Q 53 75.5, 56 73" stroke={INK} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      ) : (
        <Path d="M45 70.5 Q 50 75, 55 70.5" stroke={INK} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      )}

      {/* One small prop per pose */}
      {pose === 'chef' && (
        <G>
          <Circle cx={39} cy={14} r={9} fill="#FFFFFF" stroke={pop.line} strokeWidth={1.5} />
          <Circle cx={61} cy={14} r={9} fill="#FFFFFF" stroke={pop.line} strokeWidth={1.5} />
          <Circle cx={50} cy={9} r={10} fill="#FFFFFF" stroke={pop.line} strokeWidth={1.5} />
          <Rect x={34} y={16} width={32} height={10} rx={3} fill="#FFFFFF" stroke={pop.line} strokeWidth={1.5} />
        </G>
      )}
      {pose === 'reading' && (
        <G>
          <Path d="M28 86 L 50 82 L 72 86 L 72 99 L 50 95 L 28 99 Z" fill={pop.sky} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
          <Path d="M50 82 L 50 95" stroke={INK} strokeWidth={1.6} />
          <Path d="M33 88 L 45 86 M33 92 L 45 90 M55 86 L 67 88 M55 90 L 67 92" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
        </G>
      )}
      {pose === 'wave' && (
        <G>
          <Path d="M70 84 C 76 78, 82 70, 86 62" stroke={ORANGE} strokeWidth={8} strokeLinecap="round" fill="none" />
          <Circle cx={87} cy={59} r={6} fill={ORANGE} />
          <Circle cx={87} cy={58} r={3.2} fill={CREAM} />
        </G>
      )}
      {pose === 'oops' && <Path d="M82 30 C 82 30, 78 36, 78 39 A 4 4 0 0 0 86 39 C 86 36, 82 30, 82 30 Z" fill={pop.sky} />}
      {pose === 'alert' && (
        <G>
          <Rect x={86} y={6} width={6} height={15} rx={3} fill={pop.tomato} />
          <Circle cx={89} cy={27} r={3.4} fill={pop.tomato} />
        </G>
      )}
      {pose === 'cheer' && (
        <G>
          <Rect x={6} y={18} width={6} height={10} rx={2} fill={pop.sky} transform="rotate(-25 9 23)" />
          <Rect x={88} y={14} width={6} height={10} rx={2} fill={pop.berry} transform="rotate(20 91 19)" />
          <Circle cx={14} cy={40} r={3} fill={pop.sunshine} />
          <Circle cx={88} cy={36} r={3} fill={pop.leaf} />
          <Rect x={82} y={48} width={5} height={8} rx={2} fill={pop.sunshine} transform="rotate(35 84 52)" />
        </G>
      )}
      {pose === 'sleepy' && (
        <G>
          <Path d="M78 22 L 86 22 L 78 30 L 86 30" stroke={pop.lilac} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Path d="M88 8 L 94 8 L 88 14 L 94 14" stroke={pop.lilac} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </G>
      )}
    </Svg>
  );
}
