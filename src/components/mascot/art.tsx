/**
 * Biscuit: a little cat who is also a fresh bread bun. That mix is what makes Biscuit its own
 * character (the way Duo is an owl, but unmistakably Duo):
 *   - a golden, toasted crown with three baked-loaf score marks instead of plain tabby stripes
 *   - a curl of dough on top as its signature tuft
 *   - a croissant tail
 * Drawn in a soft emote style: a thick reddish-brown outline around every shape, flat peach fur
 * with one soft shade tone, a white muzzle, big dark eyes and fluffy jagged cheeks.
 *
 * Every part is its own piece so the rig (BiscuitRig.tsx) can move it by itself. Coordinates are
 * on a 200 × 200 grid; the ear tips are near y = 6 and the feet near y = 196.
 * Parts that need a clip take a `uid` so several Biscuits can be on screen at once.
 */
import type { ReactNode } from 'react';
import { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { Brows, Eyes, Mouth, Prop } from './moods';

export const C = {
  line: '#6E2C20', // the outline, everywhere: a warm reddish brown
  fur: '#F8C891',
  furShade: '#ECAA6E',
  crust: '#E59A55', // the toasted crown, ear tips and croissant tail
  crustDark: '#C9763A',
  score: '#BF6F45', // the score marks on the crown
  cream: '#FFF8EE',
  creamShade: '#F1E1CB',
  pink: '#F6A7AE',
  nose: '#E9798C',
  eye: '#2B1914',
  white: '#FFFFFF',
  blush: '#FF9C94',
  mouth: '#8A2F27',
  tongue: '#F27C8A',
  scarf: '#E8402B',
  scarfShade: '#B9301E',
  drool: '#A9DDF7',
  wood: '#C88A52',
  woodShade: '#A96D3A',
  steel: '#DCE3E8',
  steelShade: '#AEB9C2',
  pot: '#E8402B',
  carrot: '#FF8A2A',
  leaf: '#4CAF50',
  cookie: '#E2A35C',
  chip: '#6B3A1F',
} as const;

/** Outline width: about 3.5% of Biscuit's height. */
export const W = 6.5;
const outline = { stroke: C.line, strokeWidth: W, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
const thin = { stroke: C.line, strokeWidth: 4.5, strokeLinejoin: 'round', strokeLinecap: 'round', fill: 'none' } as const;

export const EYE_L = [71, 100] as const;
export const EYE_R = [129, 100] as const;
const ER = { rx: 12.5, ry: 14.5 };

/** Where parts turn: [x, y] on the 200 grid. */
export const pivots = {
  feet: [100, 196],
  neck: [100, 148],
  tail: [132, 178],
  shoulderL: [76, 158],
  earL: [62, 46],
  hat: [100, 40],
  eyeTop: EYE_L[1] - ER.ry - 1,
} as const;

const mirror = (node: ReactNode) => <G transform="translate(200,0) scale(-1,1)">{node}</G>;

/* ------------------------------------------------------------------ */
/* Tail, body, scarf                                                   */
/* ------------------------------------------------------------------ */

/** A croissant tail: rounded lobes that get smaller toward the curled tip. */
export const tail = (
  <G>
    {(
      [
        [167, 140, 5.5],
        [166, 151, 7.5],
        [160, 164, 9.5],
        [148, 175, 11],
        [134, 181, 11],
      ] as const
    ).map(([x, y, r], i) => (
      <Circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? C.crust : C.fur} {...outline} strokeWidth={5} />
    ))}
    <Path d="M144 171 Q 149 175 150 181 M157 160 Q 162 164 162 169" stroke={C.crustDark} strokeWidth={2.5} fill="none" strokeLinecap="round" />
  </G>
);

const BODY = 'M100 136 C 126 136 139 152 139 168 C 139 186 124 194 100 194 C 76 194 61 186 61 168 C 61 152 74 136 100 136 Z';
export const body = (uid: string) => (
  <G>
    <Ellipse cx={81} cy={191} rx={14} ry={7.5} fill={C.fur} {...outline} />
    <Ellipse cx={119} cy={191} rx={14} ry={7.5} fill={C.fur} {...outline} />
    <Defs>
      <ClipPath id={`${uid}-body`}>
        <Path d={BODY} />
      </ClipPath>
    </Defs>
    <Path d={BODY} fill={C.fur} />
    <G clipPath={`url(#${uid}-body)`}>
      <Ellipse cx={146} cy={170} rx={20} ry={40} fill={C.furShade} />
      <Ellipse cx={100} cy={176} rx={23} ry={18} fill={C.cream} />
    </G>
    <Path d={BODY} fill="none" {...outline} />
  </G>
);

/** A small red scarf knotted at the front. */
export const scarf = (
  <G>
    <Path d="M66 141 C 82 153 118 153 134 141 L 136 151 C 118 164 82 164 64 151 Z" fill={C.scarf} {...outline} />
    <Path d="M98 160 L 89 177 L 100 175 Z" fill={C.scarf} {...outline} strokeWidth={5} />
    <Path d="M102 160 L 112 176 L 101 175 Z" fill={C.scarf} {...outline} strokeWidth={5} />
    <Path d="M92 153 Q 100 148 108 153 Q 110 160 100 164 Q 90 160 92 153 Z" fill={C.scarf} {...outline} strokeWidth={5} />
  </G>
);

/* ------------------------------------------------------------------ */
/* Head                                                                */
/* ------------------------------------------------------------------ */

/** A big round head with fluffy, jagged fur on both cheeks. */
const HEAD =
  'M100 38 C 139 38 165 56 169 86 C 171 98 169 108 165 116 L 175 121 L 165 127 L 172 134 L 159 136 ' +
  'C 147 147 127 151 100 151 C 73 151 53 147 41 136 L 28 134 L 35 127 L 25 121 L 35 116 ' +
  'C 31 108 29 98 31 86 C 35 56 61 38 100 38 Z';

export const earL = (
  <G>
    <Path d="M40 82 L 33 14 C 32 6 39 4 45 8 L 94 44 Z" fill={C.fur} />
    <Path d="M45 68 L 40 24 L 80 47 Z" fill={C.pink} />
    {/* a toasted tip, like the crust of a bun */}
    <Path d="M35 34 L 33 14 C 32 6 39 4 45 8 L 58 17 Z" fill={C.crust} />
    <Path d="M40 82 L 33 14 C 32 6 39 4 45 8 L 94 44" fill="none" {...outline} />
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
      {/* golden toasted crown, and a soft shade under the jaw */}
      <Ellipse cx={100} cy={30} rx={78} ry={36} fill={C.crust} />
      <Ellipse cx={100} cy={166} rx={80} ry={28} fill={C.furShade} />
      {/* baked score marks */}
      <Path d="M84 46 Q 87 55 88 66" stroke={C.score} strokeWidth={6.5} strokeLinecap="round" fill="none" />
      <Path d="M100 42 L 100 64" stroke={C.score} strokeWidth={6.5} strokeLinecap="round" />
      <Path d="M116 46 Q 113 55 112 66" stroke={C.score} strokeWidth={6.5} strokeLinecap="round" fill="none" />
      {/* a shine on the crust */}
      <Ellipse cx={66} cy={54} rx={10} ry={4.5} fill={C.cream} opacity={0.55} transform="rotate(-28 66 54)" />
      {/* cheek stripes */}
      <Path d="M36 104 L 48 106 M38 112 L 49 112" stroke={C.score} strokeWidth={4} strokeLinecap="round" />
      <Path d="M164 104 L 152 106 M162 112 L 151 112" stroke={C.score} strokeWidth={4} strokeLinecap="round" />
      {/* the white muzzle, soft like the inside of a bun */}
      <Path d="M100 115 C 117 113 129 120 128 130 C 127 141 114 145 100 143 C 86 145 73 141 72 130 C 71 120 83 113 100 115 Z" fill={C.cream} />
      {puff && (
        <G>
          <Ellipse cx={68} cy={130} rx={15} ry={11} fill={C.cream} />
          <Ellipse cx={132} cy={130} rx={15} ry={11} fill={C.cream} />
        </G>
      )}
    </G>
    <Path d={HEAD} fill="none" {...outline} />
  </G>
);

export const cheeks = (strong = false) => (
  <G opacity={strong ? 0.85 : 0.55}>
    <Ellipse cx={55} cy={123} rx={10} ry={6} fill={C.blush} />
    <Ellipse cx={145} cy={123} rx={10} ry={6} fill={C.blush} />
  </G>
);

export const nose = <Path d="M95.5 118 Q 100 115.5 104.5 118 Q 103.5 122.5 100 123.5 Q 96.5 122.5 95.5 118 Z" fill={C.nose} stroke={C.line} strokeWidth={2.5} strokeLinejoin="round" />;

/* ------------------------------------------------------------------ */
/* Eyes, lids, brows                                                   */
/* ------------------------------------------------------------------ */

const heart = (x: number, y: number, s: number) =>
  `M${x} ${y + 9 * s} C ${x - 13 * s} ${y + 1 * s}, ${x - 9 * s} ${y - 11 * s}, ${x} ${y - 4 * s} C ${x + 9 * s} ${y - 11 * s}, ${x + 13 * s} ${y + 1 * s}, ${x} ${y + 9 * s} Z`;
const star = (x: number, y: number, r: number) => `M${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`;
const both = (f: (x: number, y: number, right: boolean) => ReactNode) => (
  <G>
    <G>{f(EYE_L[0], EYE_L[1], false)}</G>
    <G>{f(EYE_R[0], EYE_R[1], true)}</G>
  </G>
);

/** The part of the eyes that can glance around (dark ovals, sparkles, the pupil in a ring). */
export const pupils = (e: Eyes) =>
  both((x, y) => {
    if (e === 'ring') {
      return (
        <G>
          <Circle cx={x} cy={y} r={5.5} fill={C.eye} />
          <Circle cx={x - 1.6} cy={y - 1.8} r={1.7} fill={C.white} />
        </G>
      );
    }
    const big = e === 'sparkle';
    return (
      <G>
        <Ellipse cx={x} cy={y} rx={big ? ER.rx + 1.5 : ER.rx} ry={big ? ER.ry + 1.5 : ER.ry} fill={C.eye} />
        {big ? <Path d={star(x - 4, y - 5, 5.5)} fill={C.white} /> : <Circle cx={x - 4} cy={y - 5.5} r={4.2} fill={C.white} />}
        <Circle cx={x + 4.5} cy={y + 6} r={big ? 2.4 : 2} fill={C.white} />
      </G>
    );
  });

/** The part of the eyes that stays put. */
export const eyeFrame = (e: Eyes) => {
  switch (e) {
    case 'ring':
      return both((x, y) => <Circle cx={x} cy={y} r={14.5} fill={C.white} stroke={C.line} strokeWidth={5} />);
    case 'heart':
      return both((x, y) => (
        <G>
          <Path d={heart(x, y, 1.3)} fill="#F0546B" stroke={C.line} strokeWidth={4.5} strokeLinejoin="round" />
          <Circle cx={x - 4.5} cy={y - 3.5} r={2.2} fill={C.white} />
        </G>
      ));
    case 'arc':
      return both((x, y) => <Path d={`M${x - 12} ${y + 4} Q ${x} ${y - 11} ${x + 12} ${y + 4}`} {...thin} strokeWidth={6} />);
    case 'closed':
      return both((x, y) => <Path d={`M${x - 12} ${y - 1} Q ${x} ${y + 9} ${x + 12} ${y - 1}`} {...thin} strokeWidth={6} />);
    case 'half':
      return both((x, y) => (
        <G>
          <Path d={`M${x - 12.5} ${y + 1} Q ${x} ${y + 17} ${x + 12.5} ${y + 1} Z`} fill={C.eye} />
          <Circle cx={x - 3} cy={y + 6} r={2} fill={C.white} />
          <Path d={`M${x - 14} ${y + 1} L ${x + 14} ${y + 1}`} {...thin} strokeWidth={5} />
        </G>
      ));
    case 'focus':
      return both((x, y) => (
        <G>
          <Path d={`M${x - 12.5} ${y - 5} L ${x + 12.5} ${y - 5} Q ${x + 12.5} ${y + 14.5} ${x} ${y + 14.5} Q ${x - 12.5} ${y + 14.5} ${x - 12.5} ${y - 5} Z`} fill={C.eye} />
          <Circle cx={x - 4} cy={y + 1} r={3} fill={C.white} />
          <Path d={`M${x - 14} ${y - 5} L ${x + 14} ${y - 5}`} {...thin} strokeWidth={5} />
        </G>
      ));
    default:
      return null;
  }
};

/** Eyes whose dark part moves (and blinks). */
export const glances = (e: Eyes) => e === 'oval' || e === 'sparkle' || e === 'ring';

/** Lids for blinking: fur-colored covers that grow down from the top of each eye. */
export const lidL = <Rect x={EYE_L[0] - 15} y={pivots.eyeTop} width={30} height={34} rx={12} fill={C.fur} />;
export const lidR = <Rect x={EYE_R[0] - 15} y={pivots.eyeTop} width={30} height={34} rx={12} fill={C.fur} />;
export const blinkLine = both((x, y) => <Path d={`M${x - 12} ${y} Q ${x} ${y + 9} ${x + 12} ${y}`} {...thin} strokeWidth={5.5} />);

export const brows = (b: Brows) =>
  both((x, y, right) => {
    const s = right ? -1 : 1; // inner end is toward the nose
    const o = y - 22;
    const d: Record<Brows, string> = {
      calm: `M${x - 10 * s} ${o + 1} Q ${x} ${o - 3} ${x + 10 * s} ${o}`,
      high: `M${x - 10 * s} ${o - 2} Q ${x} ${o - 7} ${x + 10 * s} ${o - 4}`,
      up: `M${x - 10 * s} ${o + 1} L ${x + 10 * s} ${o - 6}`,
      down: `M${x - 10 * s} ${o - 5} L ${x + 10 * s} ${o + 2}`,
      raised: right ? `M${x - 10 * s} ${o - 6} Q ${x} ${o - 12} ${x + 10 * s} ${o - 7}` : `M${x - 10 * s} ${o + 1} Q ${x} ${o - 2} ${x + 10 * s} ${o}`,
    };
    return <Path d={d[b]} {...thin} strokeWidth={5} />;
  });

/* ------------------------------------------------------------------ */
/* Mouths (drawn around y = 128, under the nose)                       */
/* ------------------------------------------------------------------ */

const mouthShape = (m: Mouth): ReactNode => {
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
      return <Path d="M95 111 Q 100 115 105 111" {...thin} strokeWidth={4} />;
    case 'wavy':
      return <Path d="M88 114 Q 92 109 96 114 Q 100 119 104 114 Q 108 109 112 114" {...thin} strokeWidth={4} />;
    case 'chew':
      return <Path d="M93 113 Q 97 109 100 113 Q 103 109 107 113" {...thin} strokeWidth={4} />;
    case 'drool':
      return (
        <G>
          <Path d="M92 109 Q 100 108 108 109 Q 107 119 100 119 Q 93 119 92 109 Z" fill={C.mouth} stroke={C.line} strokeWidth={3.5} strokeLinejoin="round" />
          <Path d="M106 115 Q 110 124 108 130 Q 103 131 103 125 Q 103 120 106 115 Z" fill={C.drool} stroke={C.line} strokeWidth={2.5} strokeLinejoin="round" />
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
      return <Path d="M88 109 Q 100 121 112 109" {...thin} />;
    case 'w':
    default:
      return <Path d="M90 109 Q 95 116 100 109 Q 105 116 110 109" {...thin} strokeWidth={4} />;
  }
};
/** The mouth, placed in the middle of the muzzle. */
export const mouth = (m: Mouth): ReactNode => <G transform="translate(0 17)">{mouthShape(m)}</G>;

/* ------------------------------------------------------------------ */
/* The signature: a curl of dough on top                                */
/* ------------------------------------------------------------------ */

/** Biscuit's tuft: a little curl of dough on top of the head, outlined like everything else. */
export const hat = (
  <G>
    <Path d="M92 44 C 86 30 96 20 107 23 C 117 26 116 39 107 39 C 101 39 100 32 105 31" stroke={C.line} strokeWidth={13} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M92 44 C 86 30 96 20 107 23 C 117 26 116 39 107 39 C 101 39 100 32 105 31" stroke={C.crust} strokeWidth={6.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M94 34 C 95 28 100 25 105 26" stroke={C.cream} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.8} />
  </G>
);

/* ------------------------------------------------------------------ */
/* Arms and paws                                                       */
/* ------------------------------------------------------------------ */

/** Left arm: a short soft paw from under the scarf, so there is no seam at the shoulder. */
const ARM = 'M67 158 C 67 150 85 150 85 158 L 84 172 C 83 183 68 183 68 172 Z';
export const arm = (palms: boolean) => (
  <G>
    <Path d={ARM} fill={C.fur} {...outline} />
    {palms ? (
      <G>
        <Ellipse cx={76} cy={174} rx={7.5} ry={6.5} fill={C.cream} />
        <Ellipse cx={76} cy={176} rx={3.8} ry={2.8} fill={C.pink} />
        <Circle cx={71.5} cy={171} r={1.8} fill={C.pink} />
        <Circle cx={76} cy={169.5} r={1.8} fill={C.pink} />
        <Circle cx={80.5} cy={171} r={1.8} fill={C.pink} />
      </G>
    ) : (
      <G>
        <Ellipse cx={76} cy={175} rx={7.5} ry={5} fill={C.cream} />
        <Path d="M73 176 l 0 3 M79 176 l 0 3" stroke={C.line} strokeWidth={2.2} strokeLinecap="round" />
      </G>
    )}
  </G>
);
/** Paws on hips: a bent arm, elbow out. */
export const akimbo = (
  <Path d="M72 150 C 63 155 55 160 53 166 C 51 172 58 178 66 182 C 72 185 79 180 75 174 C 71 171 65 168 65 166 C 69 162 76 159 82 157 Z" fill={C.fur} {...outline} />
);
export const armR = (palms: boolean) => mirror(arm(palms));
export const akimboR = mirror(akimbo);

/** What the right paw holds, drawn in the left arm's frame and mirrored with it. */
export const held = (p: Prop | undefined): ReactNode => {
  if (p === 'pot')
    return (
      <G>
        <Path d="M76 170 L 80 198" stroke={C.line} strokeWidth={6 + W} strokeLinecap="round" />
        <Path d="M76 170 L 80 198" stroke={C.wood} strokeWidth={6} strokeLinecap="round" />
      </G>
    );
  if (p === 'board')
    return (
      <G>
        <Path d="M70 178 L 83 178 L 81 199 C 74 199 68 194 68 186 Z" fill={C.steel} stroke={C.line} strokeWidth={4.5} strokeLinejoin="round" />
        <Path d="M78 182 L 77 195" stroke={C.steelShade} strokeWidth={2.5} strokeLinecap="round" />
        <Rect x={70} y={163} width={12} height={16} rx={4} fill={C.chip} stroke={C.line} strokeWidth={4.5} />
      </G>
    );
  return null;
};
export const heldR = (p: Prop | undefined) => {
  const node = held(p);
  return node ? mirror(node) : null;
};

/** Things Biscuit stands behind: a pot (its inside), a cutting board, a bowl. */
export const front = (p: Prop | undefined): ReactNode => {
  switch (p) {
    case 'pot':
      return <Ellipse cx={100} cy={176} rx={36} ry={7} fill={C.mouth} {...outline} />;
    case 'board':
      return (
        <G>
          <Rect x={52} y={182} width={96} height={14} rx={6} fill={C.wood} {...outline} />
          <Path d="M108 182 C 118 174 138 174 142 182 Z" fill={C.carrot} {...outline} strokeWidth={4} />
          <Path d="M141 177 l 6 -5 M142 180 l 7 -1" stroke={C.leaf} strokeWidth={3.5} strokeLinecap="round" />
          <Ellipse cx={95} cy={182} rx={5} ry={3} fill={C.carrot} stroke={C.line} strokeWidth={3} />
          <Ellipse cx={84} cy={183} rx={5} ry={3} fill={C.carrot} stroke={C.line} strokeWidth={3} />
        </G>
      );
    case 'bowl':
      return (
        <G>
          <Path d="M64 178 C 66 198 134 198 136 178 Z" fill={C.white} {...outline} />
          <Path d="M70 178 C 76 166 92 168 100 172 C 108 166 126 166 130 178 Z" fill={C.cookie} {...outline} strokeWidth={4.5} />
          <Circle cx={86} cy={174} r={3} fill={C.leaf} />
          <Circle cx={112} cy={173} r={3} fill={C.carrot} />
        </G>
      );
    default:
      return null;
  }
};

/** The pot's front wall, drawn in front of the paw and the spoon. */
export const potFront = (
  <G>
    <Path d="M64 176 L 68 194 C 69 199 131 199 132 194 L 136 176 C 130 184 70 184 64 176 Z" fill={C.pot} {...outline} />
    <Path d="M78 186 C 88 189 112 189 122 186" stroke={C.white} strokeWidth={3} opacity={0.5} fill="none" strokeLinecap="round" />
  </G>
);

/** A cookie held up in both paws. */
export const cookie = (
  <G>
    <Circle cx={100} cy={166} r={12} fill={C.cookie} {...outline} strokeWidth={5} />
    <Circle cx={95} cy={162} r={2.2} fill={C.chip} />
    <Circle cx={104} cy={169} r={2.2} fill={C.chip} />
    <Circle cx={95} cy={170} r={1.9} fill={C.chip} />
  </G>
);

/** Flour on the face (oops). */
export const flour = (
  <G fill={C.white} opacity={0.95}>
    <Ellipse cx={52} cy={112} rx={8} ry={5} />
    <Circle cx={61} cy={119} r={2.6} />
    <Circle cx={142} cy={88} r={2.6} />
    <Ellipse cx={86} cy={76} rx={5} ry={3} />
  </G>
);

export const groundShadow = <Ellipse cx={100} cy={196} rx={46} ry={4.5} fill="rgba(110,44,32,0.16)" />;
