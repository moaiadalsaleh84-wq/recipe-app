/**
 * Biscuit, drawn in a sticker / emote style: every shape has the same thick warm-brown outline,
 * flat colors with one soft shade tone, small highlights, and fluffy jagged fur on the cheeks and
 * the forehead. Chibi proportions: the head is about 58% of the height.
 *
 * Every part is its own piece so the rig (BiscuitRig.tsx) can move it by itself. Coordinates are
 * on a 200 × 200 grid; the hat top is near y = 8 and the feet near y = 194.
 * Parts that need a clip take a `uid` so several Biscuits can be on screen at once.
 */
import type { ReactNode } from 'react';
import { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { Brows, Eyes, Mouth, Prop } from './moods';

export const C = {
  line: '#4A2A1A', // the outline, everywhere
  fur: '#F7A24E',
  furShade: '#E5832F',
  furLight: '#FFC889',
  stripe: '#CF6A22',
  cream: '#FFF5E6',
  creamShade: '#F2DFC6',
  pink: '#F8A5AE',
  nose: '#EC6F86',
  eye: '#2E1A12',
  white: '#FFFFFF',
  blush: '#FF8F8F',
  mouth: '#7A2B22',
  tongue: '#F27A8A',
  hat: '#FFFFFF',
  hatShade: '#ECE3D7',
  scarf: '#E8402B',
  scarfShade: '#B9301E',
  drool: '#A9DDF7',
  wood: '#C88A52',
  woodShade: '#A96D3A',
  steel: '#D9E1E7',
  steelShade: '#AEB9C2',
  pot: '#E8402B',
  carrot: '#FF8A2A',
  leaf: '#4CAF50',
  cookie: '#E2A35C',
  chip: '#6B3A1F',
} as const;

/** Outline width: about 3.6% of Biscuit's height. */
export const W = 6.5;
const outline = { stroke: C.line, strokeWidth: W, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
const thin = { stroke: C.line, strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round', fill: 'none' } as const;

/** Where parts turn: [x, y] on the 200 grid. */
export const pivots = {
  feet: [100, 194],
  neck: [100, 126],
  tail: [124, 172],
  shoulderL: [74, 140],
  earL: [62, 50],
  hat: [100, 46],
  eyeTop: 72,
} as const;

export const EYE_L = [77, 86] as const;
export const EYE_R = [123, 86] as const;

const mirror = (node: ReactNode) => <G transform="translate(200,0) scale(-1,1)">{node}</G>;

/* ------------------------------------------------------------------ */
/* Tail, body, scarf                                                   */
/* ------------------------------------------------------------------ */

const TAIL = 'M118 178 C 150 186 174 166 166 134';
/** A thick curl with a cream tip and two stripes. Drawn behind the body, so it grows out of it. */
export const tail = (
  <G>
    <Path d={TAIL} stroke={C.line} strokeWidth={17 + W * 2} fill="none" strokeLinecap="round" />
    <Path d={TAIL} stroke={C.fur} strokeWidth={17} fill="none" strokeLinecap="round" />
    <Path d="M152.8 162.4 L 163.8 175.6" stroke={C.stripe} strokeWidth={5} strokeLinecap="round" />
    <Path d="M159 150.4 L 173.6 153.2" stroke={C.stripe} strokeWidth={5} strokeLinecap="round" />
    <Path d="M166.9 138.5 L 166 134" stroke={C.cream} strokeWidth={17} fill="none" strokeLinecap="round" />
  </G>
);

const BODY = 'M100 116 C 129 116 141 140 140 160 C 139 181 124 190 100 190 C 76 190 61 181 60 160 C 59 140 71 116 100 116 Z';
export const body = (uid: string) => (
  <G>
    {/* feet, behind the belly */}
    <Ellipse cx={81} cy={187} rx={15} ry={8.5} fill={C.fur} {...outline} />
    <Ellipse cx={119} cy={187} rx={15} ry={8.5} fill={C.fur} {...outline} />
    <Path d="M76 186 l 0 5 M83 186 l 0 5 M117 186 l 0 5 M124 186 l 0 5" stroke={C.line} strokeWidth={3} strokeLinecap="round" />
    <Defs>
      <ClipPath id={`${uid}-body`}>
        <Path d={BODY} />
      </ClipPath>
    </Defs>
    <Path d={BODY} fill={C.fur} />
    <G clipPath={`url(#${uid}-body)`}>
      <Ellipse cx={148} cy={160} rx={22} ry={46} fill={C.furShade} />
      <Ellipse cx={100} cy={164} rx={24} ry={24} fill={C.cream} />
      <Ellipse cx={112} cy={170} rx={12} ry={18} fill={C.creamShade} />
    </G>
    <Path d={BODY} fill="none" {...outline} />
  </G>
);

/** A red scarf knotted at the front; the knot's tails hang in front of the chest. */
export const scarf = (
  <G>
    <Path d="M64 125 C 80 138 120 138 136 125 L 139 137 C 121 151 79 151 61 137 Z" fill={C.scarf} {...outline} />
    <Path d="M68 136 C 84 145 116 145 132 136" stroke={C.scarfShade} strokeWidth={3.5} fill="none" strokeLinecap="round" />
    <Path d="M97 146 L 86 168 L 99 165 Z" fill={C.scarf} {...outline} />
    <Path d="M103 146 L 116 167 L 104 165 Z" fill={C.scarf} {...outline} />
    <Path d="M105 152 L 111 162" stroke={C.scarfShade} strokeWidth={3} strokeLinecap="round" />
    <Path d="M91 138 Q 100 132 109 138 Q 111 147 100 151 Q 89 147 91 138 Z" fill={C.scarf} {...outline} />
  </G>
);

/* ------------------------------------------------------------------ */
/* Head                                                                */
/* ------------------------------------------------------------------ */

/** One round head with fluffy, jagged fur on both cheeks. */
const HEAD =
  'M100 40 C 128 40 150 48 157 62 C 163 74 164 88 162 97 L 171 101 L 162 107 L 169 113 L 158 117 ' +
  'C 150 129 128 134 100 134 C 72 134 50 129 42 117 L 31 113 L 38 107 L 29 101 L 38 97 ' +
  'C 36 88 37 74 43 62 C 50 48 72 40 100 40 Z';

export const earL = (
  <G>
    <Path d="M48 72 L 39 25 C 38 18 44 16 48 19 L 86 48 Z" fill={C.fur} {...outline} />
    <Path d="M52 62 L 46 32 L 74 50 Z" fill={C.pink} />
    <Path d="M50 46 l 6 -3 M51 54 l 6 -2" stroke={C.cream} strokeWidth={2.5} strokeLinecap="round" />
  </G>
);
export const earR = mirror(earL);

export const head = (uid: string, puff = false) => (
  <G>
    <Defs>
      <ClipPath id={`${uid}-head`}>
        <Path d={HEAD} />
      </ClipPath>
    </Defs>
    <Path d={HEAD} fill={C.fur} />
    <G clipPath={`url(#${uid}-head)`}>
      {/* one soft shade under the jaw and a highlight on the crown */}
      <Ellipse cx={100} cy={146} rx={74} ry={26} fill={C.furShade} />
      <Ellipse cx={70} cy={54} rx={12} ry={5.5} fill={C.furLight} transform="rotate(-22 70 54)" />
      {/* forehead stripes */}
      <Path d="M100 52 L 100 64" stroke={C.stripe} strokeWidth={5.5} strokeLinecap="round" />
      <Path d="M89 54 Q 91 59 92 64" stroke={C.stripe} strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M111 54 Q 109 59 108 64" stroke={C.stripe} strokeWidth={5} strokeLinecap="round" fill="none" />
      {/* cheek stripes */}
      <Path d="M44 92 L 54 94 M46 100 L 55 100" stroke={C.stripe} strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M156 92 L 146 94 M154 100 L 145 100" stroke={C.stripe} strokeWidth={3.5} strokeLinecap="round" />
      {/* white muzzle */}
      <Path d="M100 97 C 117 95 129 103 128 113 C 127 124 114 129 100 127 C 86 129 73 124 72 113 C 71 103 83 95 100 97 Z" fill={C.cream} />
      {puff && (
        // cheeks full of food
        <G>
          <Ellipse cx={70} cy={112} rx={14} ry={11} fill={C.cream} />
          <Ellipse cx={130} cy={112} rx={14} ry={11} fill={C.cream} />
        </G>
      )}
    </G>
    <Path d={HEAD} fill="none" {...outline} />
  </G>
);

export const cheeks = (strong = false) => (
  <G opacity={strong ? 0.85 : 0.6}>
    <Ellipse cx={61} cy={106} rx={9} ry={5.5} fill={C.blush} />
    <Ellipse cx={139} cy={106} rx={9} ry={5.5} fill={C.blush} />
  </G>
);

export const nose = <Path d="M95 100 Q 100 97 105 100 Q 104 105 100 106 Q 96 105 95 100 Z" fill={C.nose} stroke={C.line} strokeWidth={2.5} strokeLinejoin="round" />;

/* ------------------------------------------------------------------ */
/* Eyes, lids, brows                                                   */
/* ------------------------------------------------------------------ */

const heart = (x: number, y: number, s: number) =>
  `M${x} ${y + 9 * s} C ${x - 13 * s} ${y + 1 * s}, ${x - 9 * s} ${y - 11 * s}, ${x} ${y - 4 * s} C ${x + 9 * s} ${y - 11 * s}, ${x + 13 * s} ${y + 1 * s}, ${x} ${y + 9 * s} Z`;
const star = (x: number, y: number, r: number) => `M${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`;

/** The part of the eyes that can glance around (dark ovals, sparkles, the pupil in a ring). */
export const pupils = (e: Eyes) => (
  <G>
    {[EYE_L, EYE_R].map(([x, y]) => {
      if (e === 'ring') {
        return (
          <G key={x}>
            <Circle cx={x} cy={y} r={4.8} fill={C.eye} />
            <Circle cx={x - 1.4} cy={y - 1.6} r={1.5} fill={C.white} />
          </G>
        );
      }
      const big = e === 'sparkle';
      return (
        <G key={x}>
          <Ellipse cx={x} cy={y} rx={big ? 11 : 9.5} ry={big ? 13.5 : 12.5} fill={C.eye} />
          {big ? <Path d={star(x - 3.5, y - 4.5, 5)} fill={C.white} /> : <Circle cx={x - 3.5} cy={y - 5} r={3.8} fill={C.white} />}
          <Circle cx={x + 3.8} cy={y + 5.5} r={big ? 2.2 : 1.8} fill={C.white} />
        </G>
      );
    })}
  </G>
);

/** The part of the eyes that stays put. */
export const eyeFrame = (e: Eyes) => {
  switch (e) {
    case 'ring':
      return (
        <G>
          <Circle cx={EYE_L[0]} cy={EYE_L[1]} r={12.5} fill={C.white} stroke={C.line} strokeWidth={4} />
          <Circle cx={EYE_R[0]} cy={EYE_R[1]} r={12.5} fill={C.white} stroke={C.line} strokeWidth={4} />
        </G>
      );
    case 'heart':
      return (
        <G>
          {[EYE_L, EYE_R].map(([x, y]) => (
            <G key={x}>
              <Path d={heart(x, y, 1.15)} fill="#F0546B" stroke={C.line} strokeWidth={4} strokeLinejoin="round" />
              <Circle cx={x - 4} cy={y - 3} r={2} fill={C.white} />
            </G>
          ))}
        </G>
      );
    case 'arc':
      return (
        <G {...thin} strokeWidth={5.5}>
          <Path d="M67 90 Q 77 77 87 90" />
          <Path d="M113 90 Q 123 77 133 90" />
        </G>
      );
    case 'closed':
      return (
        <G {...thin} strokeWidth={5.5}>
          <Path d="M67 85 Q 77 94 87 85" />
          <Path d="M113 85 Q 123 94 133 85" />
        </G>
      );
    case 'half':
      // Sleepy: the top half is covered by a heavy lid.
      return (
        <G>
          {[EYE_L, EYE_R].map(([x, y]) => (
            <G key={x}>
              <Path d={`M${x - 9.5} ${y + 1} Q ${x} ${y + 15} ${x + 9.5} ${y + 1} Z`} fill={C.eye} />
              <Circle cx={x - 2} cy={y + 5} r={1.8} fill={C.white} />
              <Path d={`M${x - 11} ${y + 1} L ${x + 11} ${y + 1}`} {...thin} strokeWidth={4.5} />
            </G>
          ))}
        </G>
      );
    case 'focus':
      // Concentrating: a flat upper lid over the dark oval.
      return (
        <G>
          {[EYE_L, EYE_R].map(([x, y]) => (
            <G key={x}>
              <Path d={`M${x - 9.5} ${y - 4} L ${x + 9.5} ${y - 4} Q ${x + 9.5} ${y + 12.5} ${x} ${y + 12.5} Q ${x - 9.5} ${y + 12.5} ${x - 9.5} ${y - 4} Z`} fill={C.eye} />
              <Circle cx={x - 3} cy={y + 1} r={2.6} fill={C.white} />
              <Path d={`M${x - 11} ${y - 4} L ${x + 11} ${y - 4}`} {...thin} strokeWidth={4.5} />
            </G>
          ))}
        </G>
      );
    default:
      return null;
  }
};

/** Eyes whose dark part moves (and blinks). */
export const glances = (e: Eyes) => e === 'oval' || e === 'sparkle' || e === 'ring';

/** Lids for blinking: fur-colored covers that grow down from the top of each eye. */
export const lidL = <Rect x={65} y={72} width={24} height={29} rx={10} fill={C.fur} />;
export const lidR = <Rect x={111} y={72} width={24} height={29} rx={10} fill={C.fur} />;
export const blinkLine = (
  <G {...thin} strokeWidth={5}>
    <Path d="M67 86 Q 77 93 87 86" />
    <Path d="M113 86 Q 123 93 133 86" />
  </G>
);

export const brows = (b: Brows) => {
  const d: Record<Brows, [string, string]> = {
    calm: ['M69 69 Q 77 65 85 68', 'M115 68 Q 123 65 131 69'],
    high: ['M69 66 Q 77 61 85 64', 'M115 64 Q 123 61 131 66'],
    up: ['M69 70 L 85 63', 'M115 63 L 131 70'],
    down: ['M69 64 L 85 70', 'M115 70 L 131 64'],
    raised: ['M69 69 Q 77 66 85 68', 'M115 64 Q 123 58 131 62'],
  };
  return (
    <G {...thin} strokeWidth={4.5}>
      <Path d={d[b][0]} />
      <Path d={d[b][1]} />
    </G>
  );
};

/* ------------------------------------------------------------------ */
/* Mouths                                                              */
/* ------------------------------------------------------------------ */

export const mouth = (m: Mouth): ReactNode => {
  switch (m) {
    case 'open':
      return (
        <G>
          <Path d="M88 109 Q 100 107 112 109 Q 111 125 100 125 Q 89 125 88 109 Z" fill={C.mouth} stroke={C.line} strokeWidth={3.5} strokeLinejoin="round" />
          <Path d="M93 120 Q 100 114 107 120 Q 105 124 100 124 Q 95 124 93 120 Z" fill={C.tongue} />
        </G>
      );
    case 'o':
      return <Ellipse cx={100} cy={117} rx={7} ry={8.5} fill={C.mouth} stroke={C.line} strokeWidth={3.5} />;
    case 'big':
      return <Ellipse cx={100} cy={117} rx={9} ry={10} fill={C.mouth} stroke={C.line} strokeWidth={3.5} />;
    case 'small':
      return <Path d="M95 111 Q 100 115 105 111" {...thin} />;
    case 'wavy':
      return <Path d="M88 114 Q 92 109 96 114 Q 100 119 104 114 Q 108 109 112 114" {...thin} />;
    case 'chew':
      return <Path d="M93 113 Q 97 109 100 113 Q 103 109 107 113" {...thin} />;
    case 'drool':
      return (
        <G>
          <Path d="M92 109 Q 100 108 108 109 Q 107 119 100 119 Q 93 119 92 109 Z" fill={C.mouth} stroke={C.line} strokeWidth={3.5} strokeLinejoin="round" />
          <Path d="M108 113 Q 112 121 110 125 Q 106 126 106 121 Q 106 117 108 113 Z" fill={C.drool} stroke={C.line} strokeWidth={2.5} strokeLinejoin="round" />
        </G>
      );
    case 'grin':
      return (
        <G>
          <Path d="M86 109 Q 100 123 114 109 Q 100 115 86 109 Z" fill={C.white} stroke={C.line} strokeWidth={3.5} strokeLinejoin="round" />
          <Path d="M100 112 L 100 118" stroke={C.line} strokeWidth={2} />
        </G>
      );
    case 'smile':
      return <Path d="M88 109 Q 100 121 112 109" {...thin} strokeWidth={4.5} />;
    case 'w':
    default:
      return <Path d="M90 109 Q 95 116 100 109 Q 105 116 110 109" {...thin} />;
  }
};

/* ------------------------------------------------------------------ */
/* Hat                                                                 */
/* ------------------------------------------------------------------ */

/** A small chef hat with an outline, sitting snugly between the ears, and the fur fringe under it. */
export const hat = (
  <G>
    <Path d="M76 46 C 63 44 62 26 75 24 C 77 12 92 7 100 15 C 108 7 123 12 125 24 C 138 26 137 44 124 46 Z" fill={C.hat} {...outline} />
    <Path d="M106 44 C 118 44 127 40 129 31 C 131 38 128 44 121 46 Z" fill={C.hatShade} />
    <Path d="M89 27 Q 91 35 89 42 M111 27 Q 109 35 111 42" {...thin} strokeWidth={3} />
    <Rect x={75} y={40} width={50} height={13} rx={5} fill={C.hat} {...outline} />
    <Rect x={108} y={43.5} width={13} height={6} rx={2} fill={C.hatShade} />
    {/* fluffy fringe peeking out under the band */}
    <Path d="M90 52 L 94 57 L 97 53 L 100 58.5 L 103 53 L 106 57 L 110 52 Z" fill={C.fur} stroke={C.line} strokeWidth={3} strokeLinejoin="round" />
  </G>
);

/* ------------------------------------------------------------------ */
/* Arms and paws                                                       */
/* ------------------------------------------------------------------ */

/** Left arm, hanging from the shoulder. The scarf covers the joint, so there is no seam. */
const ARM = 'M64 140 C 64 131 84 131 84 140 L 82 158 C 81 170 63 170 62 158 Z';
export const arm = (palms: boolean) => (
  <G>
    <Path d={ARM} fill={C.fur} {...outline} />
    {palms ? (
      // The paw turned toward you: a cream pad and pink toe beans.
      <G>
        <Ellipse cx={72} cy={159} rx={8} ry={7} fill={C.cream} />
        <Ellipse cx={72} cy={161} rx={4} ry={3} fill={C.pink} />
        <Circle cx={67} cy={155.5} r={1.9} fill={C.pink} />
        <Circle cx={72} cy={154} r={1.9} fill={C.pink} />
        <Circle cx={77} cy={155.5} r={1.9} fill={C.pink} />
      </G>
    ) : (
      <Path d="M68 163 l 0 4 M75 163 l 0 4" stroke={C.line} strokeWidth={2.5} strokeLinecap="round" />
    )}
  </G>
);
/** Paws on hips: a bent arm, elbow out. */
export const akimbo = (
  <G>
    <Path d="M70 134 C 60 140 52 146 49 152 C 46 158 54 165 62 170 C 69 174 76 168 72 162 C 67 158 62 155 62 153 C 66 149 74 145 80 142 Z" fill={C.fur} {...outline} />
  </G>
);
export const armR = (palms: boolean) => mirror(arm(palms));
export const akimboR = mirror(akimbo);

/** What the right paw holds, drawn in the left arm's frame and mirrored with it. */
export const held = (p: Prop | undefined): ReactNode => {
  if (p === 'pot')
    // A wooden spoon, dipping down into the pot (the pot's front is drawn over its tip).
    return (
      <G>
        <Path d="M72 156 L 76 188" stroke={C.line} strokeWidth={7 + W} strokeLinecap="round" />
        <Path d="M72 156 L 76 188" stroke={C.wood} strokeWidth={7} strokeLinecap="round" />
        <Ellipse cx={76.5} cy={190} rx={6} ry={8} fill={C.wood} stroke={C.line} strokeWidth={4} />
      </G>
    );
  if (p === 'board')
    // A chef's knife held safely by the handle, the blade pointing down at the board.
    return (
      <G>
        <Path d="M66 166 L 79 166 L 77 190 C 70 190 64 184 64 176 Z" fill={C.steel} stroke={C.line} strokeWidth={4.5} strokeLinejoin="round" />
        <Path d="M74 170 L 73 185" stroke={C.steelShade} strokeWidth={2.5} strokeLinecap="round" />
        <Rect x={66} y={150} width={12} height={17} rx={4} fill={C.chip} stroke={C.line} strokeWidth={4.5} />
      </G>
    );
  return null;
};

/** The held tool in the right paw (the right arm is the left one mirrored). */
export const heldR = (p: Prop | undefined) => {
  const node = held(p);
  return node ? mirror(node) : null;
};

/** Things Biscuit stands behind: a pot, a cutting board, a bowl, a cookie in both paws. */
export const front = (p: Prop | undefined): ReactNode => {
  switch (p) {
    case 'pot':
      // The inside of the pot; its front wall is `potFront`, drawn over the spoon.
      return <Ellipse cx={100} cy={164} rx={36} ry={8} fill={C.mouth} {...outline} />;
    case 'board':
      return (
        <G>
          <Rect x={54} y={176} width={92} height={16} rx={6} fill={C.wood} {...outline} />
          <Path d="M60 186 L 140 186" stroke={C.woodShade} strokeWidth={3} strokeLinecap="round" />
          <Path d="M106 176 C 116 168 136 168 140 176 Z" fill={C.carrot} {...outline} strokeWidth={4} />
          <Path d="M139 171 l 6 -5 M140 174 l 7 -1" stroke={C.leaf} strokeWidth={3.5} strokeLinecap="round" />
          <Ellipse cx={95} cy={176} rx={5} ry={3} fill={C.carrot} stroke={C.line} strokeWidth={3} />
          <Ellipse cx={84} cy={177} rx={5} ry={3} fill={C.carrot} stroke={C.line} strokeWidth={3} />
        </G>
      );
    case 'bowl':
      return (
        <G>
          <Path d="M64 172 C 66 194 134 194 136 172 Z" fill={C.white} {...outline} />
          <Path d="M70 172 C 76 160 92 162 100 166 C 108 160 126 160 130 172 Z" fill={C.cookie} {...outline} strokeWidth={4.5} />
          <Circle cx={86} cy={168} r={3} fill={C.leaf} />
          <Circle cx={112} cy={167} r={3} fill={C.carrot} />
          <Path d="M72 182 C 90 186 110 186 128 182" stroke={C.hatShade} strokeWidth={4} fill="none" strokeLinecap="round" />
        </G>
      );
    default:
      return null;
  }
};

/** The pot's front wall, drawn in front of the paw and the spoon. */
export const potFront = (
  <G>
    <Path d="M64 164 L 68 188 C 69 194 131 194 132 188 L 136 164 C 130 172 70 172 64 164 Z" fill={C.pot} {...outline} />
    <Path d="M76 176 C 86 180 114 180 124 176" stroke={C.white} strokeWidth={3} opacity={0.5} fill="none" strokeLinecap="round" />
    <Path d="M60 168 Q 52 168 54 176" fill="none" stroke={C.line} strokeWidth={W} strokeLinecap="round" />
    <Path d="M140 168 Q 148 168 146 176" fill="none" stroke={C.line} strokeWidth={W} strokeLinecap="round" />
  </G>
);

/** A cookie held up in both paws, drawn in front of them. */
export const cookie = (
  <G>
    <Circle cx={100} cy={146} r={13} fill={C.cookie} {...outline} strokeWidth={5} />
    <Path d="M108 136 Q 104 140 110 144 Q 114 140 113 137 Z" fill={C.cream} />
    <Circle cx={95} cy={142} r={2.3} fill={C.chip} />
    <Circle cx={103} cy={150} r={2.3} fill={C.chip} />
    <Circle cx={94} cy={151} r={2} fill={C.chip} />
  </G>
);

/** Flour on the face and hat (oops). */
export const flour = (
  <G fill={C.white} opacity={0.95}>
    <Ellipse cx={62} cy={98} rx={7} ry={4.5} />
    <Circle cx={70} cy={104} r={2.5} />
    <Circle cx={132} cy={78} r={2.4} />
    <Ellipse cx={86} cy={58} rx={5} ry={3} />
  </G>
);

export const groundShadow = <Ellipse cx={100} cy={194} rx={46} ry={5} fill="rgba(74,42,26,0.16)" />;
