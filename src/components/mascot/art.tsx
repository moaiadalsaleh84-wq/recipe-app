/**
 * Biscuit, drawn as simple bold shapes with no outlines. Every part is its own piece so the rig
 * (BiscuitRig.tsx) can move it by itself. Coordinates are on a 200 × 200 grid, feet near y = 190.
 */
import type { ReactNode } from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { Eyes, Mouth } from './moods';

export const C = {
  fur: '#FF9838',
  cream: '#FFF0DA',
  pink: '#FF9DAA',
  nose: '#F0647C',
  ink: '#3D2314', // eyes and mouth lines
  mouth: '#6B2A1E',
  tongue: '#FF7A8C',
  white: '#FFFFFF',
  hat: '#F1E8DC', // the hat's own color: off-white, so it shows on white and on cream
  hatShine: '#FFFFFF',
  scarf: '#F2431F',
  scarfDeep: '#D2380F',
} as const;

/** Where parts turn: [x, y] on the 200 grid. */
export const pivots = {
  feet: [100, 192],
  neck: [100, 128],
  tail: [124, 174],
  shoulderL: [72, 136],
  earL: [62, 50],
  hat: [100, 42],
  eyeL: [74, 78],
} as const;

const mirror = (node: ReactNode) => <G transform="translate(200,0) scale(-1,1)">{node}</G>;

/** One thick stroke that starts inside the body, so the tail grows out of it with no seam. */
export const tail = <Path d="M118 176 C 150 184 172 166 167 138" stroke={C.fur} strokeWidth={17} fill="none" strokeLinecap="round" />;

export const body = (
  <G>
    <Ellipse cx={82} cy={186} rx={16} ry={9} fill={C.fur} />
    <Ellipse cx={118} cy={186} rx={16} ry={9} fill={C.fur} />
    <Path d="M100 106 C 131 106 141 138 139 160 C 137 182 121 190 100 190 C 79 190 63 182 61 160 C 59 138 69 106 100 106 Z" fill={C.fur} />
    <Ellipse cx={100} cy={162} rx={24} ry={23} fill={C.cream} />
  </G>
);

/** The tiny scarf: a band under the chin, with its tail hanging in front of the chest. */
export const scarf = (
  <G>
    <Path d="M96 134 L 109 134 L 113 156 Q 104 161 96 156 Z" fill={C.scarfDeep} />
    <Path d="M66 123 Q 100 146 134 123 L 135 132 Q 100 156 65 132 Z" fill={C.scarf} />
  </G>
);

/**
 * Left arm: one stubby shape in the body's own orange, rounded at the paw. It starts inside the
 * body, so it grows out of the shoulder with no edge. The right arm is this one mirrored.
 */
export const armL = <Path d="M62 132 C 62 124 82 124 82 132 L 81 160 C 81 174 61 174 61 160 Z" fill={C.fur} />;
export const armR = mirror(armL);

export const earL = (
  <G>
    <Path d="M44 74 Q 30 24 46 19 Q 64 19 90 46 Z" fill={C.fur} />
    <Path d="M50 62 Q 42 33 51 30 Q 62 32 77 48 Z" fill={C.pink} />
  </G>
);
export const earR = mirror(earL);

/** One round head. The cream is a small soft muzzle below the eyes, never a hood. */
export const head = (
  <G>
    <Ellipse cx={100} cy={80} rx={60} ry={49} fill={C.fur} />
    <Ellipse cx={100} cy={108} rx={30} ry={16.5} fill={C.cream} />
  </G>
);

export const cheeks = (
  <G opacity={0.85}>
    <Ellipse cx={58} cy={101} rx={8.5} ry={5.5} fill={C.pink} />
    <Ellipse cx={142} cy={101} rx={8.5} ry={5.5} fill={C.pink} />
  </G>
);

export const nose = <Path d="M94.5 95 Q 100 92.5 105.5 95 Q 104.5 101.5 100 103 Q 95.5 101.5 94.5 95 Z" fill={C.nose} />;

/** The whites of both eyes: full ovals, sitting wholly on the orange. */
export const eyeWhites = (
  <G fill={C.white}>
    <Ellipse cx={74} cy={78} rx={15} ry={17} />
    <Ellipse cx={126} cy={78} rx={15} ry={17} />
  </G>
);

/** Both pupils with their shine. `wide` adds a bigger sparkle. */
export const pupils = (wide: boolean) => (
  <G>
    {[74, 126].map((x) => (
      <G key={x}>
        <Circle cx={x} cy={79} r={wide ? 11.5 : 10.5} fill={C.ink} />
        <Circle cx={x - 3.5} cy={74.5} r={wide ? 4.6 : 4} fill={C.white} />
        <Circle cx={x + 4} cy={83.5} r={wide ? 2.6 : 1.8} fill={C.white} />
      </G>
    ))}
  </G>
);

/** One eyelid: a cover in the head's own orange that grows down from the top of the eye. */
export const lidL = <Rect x={57} y={59} width={34} height={38} rx={15} fill={C.fur} />;
export const lidR = mirror(lidL);

const line = { fill: 'none', stroke: C.ink, strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** The line of a closed eye (blinks and sleep). */
export const closedEyes = (
  <G {...line}>
    <Path d="M63 81 Q 74 89 85 81" />
    <Path d="M115 81 Q 126 89 137 81" />
  </G>
);

/** Eyes drawn as lines: a happy squint, or squeezed shut. */
export const lineEyes = (e: Eyes) =>
  e === 'smile' ? (
    <G {...line}>
      <Path d="M62 84 Q 74 68 86 84" />
      <Path d="M114 84 Q 126 68 138 84" />
    </G>
  ) : (
    <G {...line}>
      <Path d="M64 70 L 84 79 L 64 88" />
      <Path d="M136 70 L 116 79 L 136 88" />
    </G>
  );

export const brows = (
  <G fill="none" stroke={C.ink} strokeWidth={4.5} strokeLinecap="round" opacity={0.55}>
    <Path d="M62 56 L 80 50" />
    <Path d="M138 56 L 120 50" />
  </G>
);

const mouthShape = (m: Mouth): ReactNode => {
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

/** The mouth, placed in the middle of the muzzle. */
export const mouth = (m: Mouth): ReactNode => <G transform="translate(0 3.5)">{mouthShape(m)}</G>;

/**
 * A small chef hat with no outline, sitting snugly between the ears. It's off-white with a white
 * sheen, so its shape shows on a white card as well as on the cream page.
 */
export const hat = (
  <G>
    <Path d="M80 40 C 67 37 66 19 81 18 C 85 6 102 4 108 13 C 120 7 136 16 129 30 C 133 36 128 40 122 40 Z" fill={C.hat} />
    <Path d="M84 30 C 76 28 76 22 84 23 C 87 13 100 11 104 19 C 97 17 90 21 91 28 Z" fill={C.hatShine} />
    <Rect x={78} y={36} width={46} height={12} rx={6} fill={C.hat} />
    <Rect x={82} y={38.5} width={30} height={3.5} rx={1.75} fill={C.hatShine} />
  </G>
);

export const groundShadow = <Ellipse cx={100} cy={192} rx={44} ry={5.5} fill="rgba(61,35,20,0.13)" />;
