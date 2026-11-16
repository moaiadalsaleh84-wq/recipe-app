/**
 * Biscuit, drawn as simple bold shapes with no outlines. Every part is its own piece so the rig
 * (BiscuitRig.tsx) can move it by itself. Coordinates are on a 200 × 200 grid, feet near y = 190.
 */
import type { ReactNode } from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { Eyes, Mouth } from './moods';

export const C = {
  fur: '#FF9838',
  furDeep: '#F27F1B', // arms, tail, feet and ear backs, so they read against the body
  cream: '#FFF0DA',
  pink: '#FF9DAA',
  nose: '#F0647C',
  ink: '#3D2314', // eyes and mouth lines
  mouth: '#6B2A1E',
  tongue: '#FF7A8C',
  white: '#FFFFFF',
  hatShade: '#EFE5D8',
  hatEdge: '#E3D3BE',
  scarf: '#F2431F',
  scarfDeep: '#C9330F',
} as const;

/** Where parts turn: [x, y] on the 200 grid. */
export const pivots = {
  feet: [100, 192],
  neck: [100, 128],
  tail: [128, 172],
  shoulderL: [68, 136],
  earL: [62, 52],
  hat: [100, 40],
  eyeL: [74, 80],
} as const;

const mirror = (node: ReactNode) => <G transform="translate(200,0) scale(-1,1)">{node}</G>;

export const tail = (
  <G fill="none" strokeLinecap="round">
    <Path d="M128 172 C 154 178 172 162 168 138" stroke={C.furDeep} strokeWidth={16} />
    <Path d="M168.6 143 L 168 138" stroke={C.cream} strokeWidth={16} />
  </G>
);

export const body = (
  <G>
    <Ellipse cx={81} cy={186} rx={16} ry={9} fill={C.furDeep} />
    <Ellipse cx={119} cy={186} rx={16} ry={9} fill={C.furDeep} />
    <Path d="M100 108 C 132 108 141 138 139 160 C 137 182 121 190 100 190 C 79 190 63 182 61 160 C 59 138 68 108 100 108 Z" fill={C.fur} />
    <Ellipse cx={100} cy={161} rx={25} ry={24} fill={C.cream} />
  </G>
);

/** The tiny scarf: sits on the shoulders, under the chin. */
export const scarf = (
  <G>
    <Path d="M119 134 L 131 152 Q 124 157 116 152 L 111 136 Z" fill={C.scarfDeep} />
    <Path d="M66 124 Q 100 146 134 124 L 135 133 Q 100 156 65 133 Z" fill={C.scarf} />
  </G>
);

/** Left arm, hanging down from the shoulder. The right arm is this one mirrored. */
export const armL = (
  <G>
    <Rect x={59} y={127} width={18} height={40} rx={9} fill={C.furDeep} />
    <Circle cx={68} cy={160} r={9} fill={C.cream} />
  </G>
);
export const armR = mirror(armL);

export const earL = (
  <G>
    <Path d="M43 72 Q 31 24 47 20 Q 64 20 88 46 Z" fill={C.furDeep} />
    <Path d="M49 62 Q 42 33 51 31 Q 62 33 76 48 Z" fill={C.pink} />
  </G>
);
export const earR = mirror(earL);

export const head = (
  <G>
    <Ellipse cx={100} cy={80} rx={60} ry={48} fill={C.fur} />
    <Ellipse cx={100} cy={99} rx={45} ry={27} fill={C.cream} />
  </G>
);

export const cheeks = (
  <G opacity={0.8}>
    <Ellipse cx={55} cy={101} rx={9} ry={6} fill={C.pink} />
    <Ellipse cx={145} cy={101} rx={9} ry={6} fill={C.pink} />
  </G>
);

export const nose = <Path d="M94.5 92.5 Q 100 90 105.5 92.5 Q 104.5 99 100 100.5 Q 95.5 99 94.5 92.5 Z" fill={C.nose} />;

/** The whites of both eyes. */
export const eyeWhites = (
  <G fill={C.white}>
    <Ellipse cx={74} cy={80} rx={15} ry={17} />
    <Ellipse cx={126} cy={80} rx={15} ry={17} />
  </G>
);

/** Both pupils with their shine. `wide` adds a second sparkle. */
export const pupils = (wide: boolean) => (
  <G>
    {[74, 126].map((x) => (
      <G key={x}>
        <Circle cx={x} cy={81} r={wide ? 11.5 : 10.5} fill={C.ink} />
        <Circle cx={x - 3.5} cy={76.5} r={wide ? 4.6 : 4} fill={C.white} />
        <Circle cx={x + 4} cy={85.5} r={wide ? 2.6 : 1.8} fill={C.white} />
      </G>
    ))}
  </G>
);

/** One eyelid: a fur-colored cover that grows down from the top of the eye. */
export const lidL = <Rect x={57} y={61} width={34} height={39} rx={15} fill={C.fur} />;
export const lidR = mirror(lidL);

const line = { fill: 'none', stroke: C.ink, strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** The line of a closed eye (blinks and sleep). */
export const closedEyes = (
  <G {...line}>
    <Path d="M63 83 Q 74 91 85 83" />
    <Path d="M115 83 Q 126 91 137 83" />
  </G>
);

/** Eyes drawn as lines: a happy squint, or squeezed shut. */
export const lineEyes = (e: Eyes) =>
  e === 'smile' ? (
    <G {...line}>
      <Path d="M62 86 Q 74 70 86 86" />
      <Path d="M114 86 Q 126 70 138 86" />
    </G>
  ) : (
    <G {...line}>
      <Path d="M64 72 L 84 81 L 64 90" />
      <Path d="M136 72 L 116 81 L 136 90" />
    </G>
  );

export const brows = (
  <G fill="none" stroke={C.furDeep} strokeWidth={5.5} strokeLinecap="round">
    <Path d="M61 59 L 82 52" />
    <Path d="M139 59 L 118 52" />
  </G>
);

export const mouth = (m: Mouth): ReactNode => {
  switch (m) {
    case 'open':
      return (
        <G>
          <Path d="M87 104 Q 100 101 113 104 Q 112 121 100 121 Q 88 121 87 104 Z" fill={C.mouth} />
          <Path d="M93 116 Q 100 110 107 116 Q 105 121 100 121 Q 95 121 93 116 Z" fill={C.tongue} />
        </G>
      );
    case 'grin':
      return <Path d="M85 103 Q 100 120 115 103" {...line} strokeWidth={4.5} />;
    case 'o':
      return <Ellipse cx={100} cy={110} rx={5.5} ry={6.5} fill={C.mouth} />;
    case 'wavy':
      return <Path d="M87 110 Q 91.5 104 96 110 Q 100 115 104 110 Q 108.5 104 113 110" {...line} strokeWidth={4.5} />;
    case 'tongue':
      return (
        <G>
          <Path d="M94 107 Q 100 124 106 107 Z" fill={C.tongue} />
          <Path d="M89 104 Q 94.5 111 100 104 Q 105.5 111 111 104" {...line} strokeWidth={4.5} />
        </G>
      );
    case 'small':
      return <Path d="M94 107 Q 100 112 106 107" {...line} strokeWidth={4.5} />;
    case 'smile':
    default:
      return <Path d="M89 104 Q 94.5 111 100 104 Q 105.5 111 111 104" {...line} strokeWidth={4.5} />;
  }
};

/** A small, clean chef hat, tipped a little to one side. */
export const hat = (
  <G transform="rotate(-7 100 36) translate(100 38) scale(0.8) translate(-100 -38)">
    <Path d="M74 34 C 60 30 60 10 77 10 C 82 -2 101 -4 107 5 C 120 -2 139 8 131 23 C 136 29 131 34 126 34 Z" fill={C.white} stroke={C.hatEdge} strokeWidth={3} strokeLinejoin="round" />
    <Path d="M80 30 Q 100 24 120 30" stroke={C.hatShade} strokeWidth={5} fill="none" strokeLinecap="round" />
    <Rect x={74} y={31} width={52} height={14} rx={6} fill={C.white} stroke={C.hatEdge} strokeWidth={3} />
  </G>
);

export const groundShadow = <Ellipse cx={100} cy={192} rx={44} ry={5.5} fill="rgba(61,35,20,0.13)" />;
