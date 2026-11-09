/**
 * Original artwork for the two kitchen buddies, drawn as separate parts on a
 * shared 200×200 grid so the rig in CatBuddy.tsx can move each part on its own.
 *
 * Arms are drawn for the LEFT side, hanging straight down from the shoulder;
 * the rig mirrors them for the right side and rotates them into poses.
 */
import type { ReactNode } from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { BuddyId, Eyes, Mouth, Prop } from './types';

type Pt = readonly [number, number];

export type CatArt = {
  name: string;
  colors: { outline: string; fur: string; blush: string; accent: string };
  pivots: { shoulder: Pt; elbow: Pt; tail: Pt; neck: Pt; feet: Pt; eyeLine: number; hat?: Pt };
  anchors: { sweat: Pt; headTop: Pt; mouth: Pt; bowl: Pt; paw: Pt; leftBicep: Pt };
  defaultEyes: Eyes;
  /** Static head size multiplier, around the neck. */
  headScale: number;
  tail: ReactNode;
  body: ReactNode;
  ears: ReactNode;
  head: ReactNode;
  hat?: ReactNode;
  eyes: (e: Eyes) => ReactNode;
  mouth: (m: Mouth) => ReactNode;
  blush: ReactNode;
  upperArm: ReactNode;
  foreArm: ReactNode;
  prop: (p: Prop) => ReactNode;
};

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

const mirror = (node: ReactNode) => <G transform="translate(200,0) scale(-1,1)">{node}</G>;

const propArt = (p: Prop, paw: Pt, outline: string): ReactNode => {
  const [x, y] = paw;
  switch (p) {
    case 'spoon':
      return (
        <G>
          <Path d={`M${x} ${y - 4} L${x + 2} ${y + 24}`} stroke={outline} strokeWidth={7} strokeLinecap="round" />
          <Path d={`M${x} ${y - 4} L${x + 2} ${y + 24}`} stroke="#C98A4B" strokeWidth={3.5} strokeLinecap="round" />
          <Ellipse cx={x + 2} cy={y + 27} rx={5.5} ry={4} fill="#C98A4B" stroke={outline} strokeWidth={2.5} />
        </G>
      );
    case 'dumbbell':
      return (
        <G>
          <Rect x={x - 16} y={y - 2.5} width={32} height={5} rx={2} fill="#8D8A99" stroke={outline} strokeWidth={2.5} />
          <Rect x={x - 22} y={y - 9} width={8} height={18} rx={2.5} fill="#E2634A" stroke={outline} strokeWidth={3} />
          <Rect x={x + 14} y={y - 9} width={8} height={18} rx={2.5} fill="#E2634A" stroke={outline} strokeWidth={3} />
        </G>
      );
    case 'cookie':
      return (
        <G>
          <Circle cx={x + 4} cy={y - 6} r={9} fill="#E7B36F" stroke={outline} strokeWidth={2.5} />
          <Circle cx={x + 1} cy={y - 8} r={1.6} fill="#5A3420" />
          <Circle cx={x + 7} cy={y - 5} r={1.6} fill="#5A3420" />
          <Circle cx={x + 3} cy={y - 2} r={1.4} fill="#5A3420" />
        </G>
      );
    default:
      return null;
  }
};

export const bowlArt = (cx: number, cy: number, outline: string) => (
  <G>
    <Path d={`M${cx - 34} ${cy - 6} Q ${cx} ${cy + 34} ${cx + 34} ${cy - 6} Z`} fill="#D9663E" stroke={outline} strokeWidth={4} strokeLinejoin="round" />
    <Ellipse cx={cx} cy={cy - 6} rx={34} ry={7} fill="#FFF3E2" stroke={outline} strokeWidth={4} />
    <Ellipse cx={cx} cy={cy - 6} rx={26} ry={4} fill="#F2C14E" />
    <Path d={`M${cx - 20} ${cy + 6} Q ${cx} ${cy + 14} ${cx + 20} ${cy + 6}`} stroke="#FFF3E2" strokeWidth={3} fill="none" strokeLinecap="round" />
  </G>
);

/* ------------------------------------------------------------------ */
/* Tank: the gym coach. Huge dark-grey torso, tiny serious face, sweatband */
/* ------------------------------------------------------------------ */

const T = { o: '#17141C', fur: '#55545F', furShade: '#47464F', inner: '#2B2933', blush: '#F59AA6', band: '#E2634A', bandStripe: '#FFF3E0', mouth: '#7A2E3A' };

const tankEyes = (e: Eyes): ReactNode => {
  const o = T.o;
  switch (e) {
    case 'happy':
      return (
        <G stroke={o} strokeWidth={3.5} fill="none" strokeLinecap="round">
          <Path d="M82 62 Q 88.5 54 95 62" />
          <Path d="M105 62 Q 111.5 54 118 62" />
        </G>
      );
    case 'closed':
      return (
        <G stroke={o} strokeWidth={3.5} fill="none" strokeLinecap="round">
          <Path d="M82 60 Q 88.5 64 95 60" />
          <Path d="M105 60 Q 111.5 64 118 60" />
        </G>
      );
    case 'wide':
      return (
        <G>
          <Circle cx={88.5} cy={60} r={6.5} fill="#fff" stroke={o} strokeWidth={2.5} />
          <Circle cx={111.5} cy={60} r={6.5} fill="#fff" stroke={o} strokeWidth={2.5} />
          <Circle cx={88.5} cy={60.5} r={2.6} fill={o} />
          <Circle cx={111.5} cy={60.5} r={2.6} fill={o} />
        </G>
      );
    case 'normal':
      return (
        <G>
          <Ellipse cx={88.5} cy={60} rx={4.5} ry={5.5} fill={o} />
          <Ellipse cx={111.5} cy={60} rx={4.5} ry={5.5} fill={o} />
          <Circle cx={90} cy={58} r={1.4} fill="#fff" />
          <Circle cx={113} cy={58} r={1.4} fill="#fff" />
        </G>
      );
    case 'wink':
      return (
        <G>
          <Path d="M82 62 Q 88.5 54 95 62" stroke={o} strokeWidth={3.5} fill="none" strokeLinecap="round" />
          <Path d="M118 54 L 105 58 Q 105 66 111.5 66 Q 118 66 118 54 Z" fill={o} />
        </G>
      );
    default: // determined: the signature serious-but-cute look
      return (
        <G>
          <Path d="M82 54 L 95 58 Q 95 66 88.5 66 Q 82 66 82 54 Z" fill={o} />
          <Path d="M118 54 L 105 58 Q 105 66 111.5 66 Q 118 66 118 54 Z" fill={o} />
          <Circle cx={87} cy={61} r={1.3} fill="#fff" />
          <Circle cx={110} cy={61} r={1.3} fill="#fff" />
        </G>
      );
  }
};

const tankMouth = (m: Mouth): ReactNode => {
  const o = T.o;
  const nose = <Path d="M97.5 65 L102.5 65 L100 67.5 Z" fill={o} />;
  switch (m) {
    case 'open':
      return (
        <G>
          {nose}
          <Path d="M95 69 Q 100 78 105 69 Z" fill={T.mouth} stroke={o} strokeWidth={2.5} strokeLinejoin="round" />
        </G>
      );
    case 'smile':
      return (
        <G>
          {nose}
          <Path d="M93 68.5 Q 100 80 107 68.5 Z" fill={T.mouth} stroke={o} strokeWidth={2.5} strokeLinejoin="round" />
          <Ellipse cx={100} cy={74.5} rx={3.5} ry={2} fill="#F28B9B" />
        </G>
      );
    case 'flat':
      return (
        <G>
          {nose}
          <Path d="M95 71 L105 71" stroke={o} strokeWidth={2.5} strokeLinecap="round" />
        </G>
      );
    case 'o':
      return (
        <G>
          {nose}
          <Ellipse cx={100} cy={72} rx={2.6} ry={3.2} fill={T.mouth} stroke={o} strokeWidth={2} />
        </G>
      );
    case 'chew':
      return (
        <G>
          {nose}
          <Path d="M94 71 Q 97 68 100 71 Q 103 74 106 71" stroke={o} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'tongue':
      return (
        <G>
          {nose}
          <Path d="M99 70 Q 101 77 104 70 Z" fill="#F28B9B" stroke={o} strokeWidth={1.8} />
          <Path d="M94 68.5 Q 97 72.5 100 68.5 Q 103 72.5 106 68.5" stroke={o} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </G>
      );
    default:
      return (
        <G>
          {nose}
          <Path d="M94 68.5 Q 97 72.5 100 68.5 Q 103 72.5 106 68.5" stroke={o} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </G>
      );
  }
};

const tankEarL = (
  <G>
    <Path d="M78 46 L 74 13 Q 76 10 80 13 L 98 32 Z" fill={T.fur} stroke={T.o} strokeWidth={4} strokeLinejoin="round" />
    <Path d="M80 39 L 78 20 L 91 32 Z" fill={T.inner} />
  </G>
);

const tank: CatArt = {
  name: 'Tank',
  colors: { outline: T.o, fur: T.fur, blush: T.blush, accent: T.band },
  pivots: { shoulder: [46, 96], elbow: [45, 131], tail: [130, 163], neck: [100, 76], feet: [100, 192], eyeLine: 60 },
  anchors: { sweat: [130, 44], headTop: [100, 22], mouth: [100, 70], bowl: [100, 154], paw: [45, 158], leftBicep: [40, 116] },
  defaultEyes: 'determined',
  headScale: 1.15,
  tail: (
    <Path
      d="M128 168 C 152 170, 172 160, 176 138 C 178 128, 171 124, 167 131 C 163 148, 150 156, 128 158 Z"
      fill={T.fur}
      stroke={T.o}
      strokeWidth={4}
      strokeLinejoin="round"
    />
  ),
  body: (
    <G stroke={T.o} strokeLinejoin="round" strokeLinecap="round">
      {/* legs */}
      <Path d="M80 160 L78 186 Q78 192 86 192 L94 192 Q98 192 98 186 L98 162 Z" fill={T.fur} strokeWidth={4} />
      <Path d="M120 160 L122 186 Q122 192 114 192 L106 192 Q102 192 102 186 L102 162 Z" fill={T.fur} strokeWidth={4} />
      {/* torso */}
      <Path
        d="M84 70 C 58 70, 32 76, 30 100 C 28 120, 50 128, 64 132 C 68 150, 74 162, 80 170 L 120 170 C 126 162, 132 150, 136 132 C 150 128, 172 120, 170 100 C 168 76, 142 70, 116 70 Z"
        fill={T.fur}
        strokeWidth={4}
      />
      {/* muscle lines */}
      <G fill="none" strokeWidth={2.8}>
        <Path d="M66 106 Q 84 121 100 109 Q 116 121 134 106" />
        <Path d="M100 113 L100 160" />
        <Path d="M88 129 Q94 133 98.5 130 M101.5 130 Q106 133 112 129" />
        <Path d="M90 143 Q95 146 98.5 144 M101.5 144 Q105 146 110 143" />
        <Path d="M92 156 Q96 158 98.5 157 M101.5 157 Q104 158 108 156" />
      </G>
    </G>
  ),
  ears: (
    <G>
      {tankEarL}
      {mirror(tankEarL)}
    </G>
  ),
  head: (
    <G>
      <Path d="M74 58 C 72 40, 84 30, 100 30 C 116 30, 128 40, 126 58 C 126 72, 114 80, 100 80 C 86 80, 74 72, 74 58 Z" fill={T.fur} stroke={T.o} strokeWidth={4} />
      {/* sweatband */}
      <Path d="M75.5 44 Q 100 33 124.5 44 L 125.5 51 Q 100 40 74.5 51 Z" fill={T.band} stroke={T.o} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M76 47.5 Q 100 36.5 124.5 47.5" stroke={T.bandStripe} strokeWidth={1.6} fill="none" />
      <Path d="M124 45 L 135 40 L 132 49 Z" fill={T.band} stroke={T.o} strokeWidth={2.5} strokeLinejoin="round" />
      <Path d="M124 49 L 133 55 L 123 56 Z" fill={T.band} stroke={T.o} strokeWidth={2.5} strokeLinejoin="round" />
      {/* face stitches, like whiskers */}
      <Path d="M74 63 L 67 62 M74 67 L 67 68 M126 63 L 133 62 M126 67 L 133 68" stroke={T.o} strokeWidth={2.4} strokeLinecap="round" />
    </G>
  ),
  eyes: tankEyes,
  mouth: tankMouth,
  blush: (
    <G>
      <Ellipse cx={80} cy={68} rx={6.5} ry={3.6} fill={T.blush} opacity={0.6} />
      <Ellipse cx={120} cy={68} rx={6.5} ry={3.6} fill={T.blush} opacity={0.6} />
      <Path d="M78.5 66.5 l-1 3 M82 66.5 l-1 3 M118 66.5 l1 3 M121.5 66.5 l1 3" stroke="#E46F82" strokeWidth={1.2} strokeLinecap="round" />
    </G>
  ),
  upperArm: (
    <G>
      <Ellipse cx={45} cy={114} rx={16} ry={21} fill={T.fur} stroke={T.o} strokeWidth={4} />
      <Path d="M37 106 Q 44 101 51 106" stroke={T.o} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </G>
  ),
  foreArm: (
    <G>
      <Ellipse cx={45} cy={144} rx={11.5} ry={15} fill={T.fur} stroke={T.o} strokeWidth={4} />
      <Circle cx={45} cy={158} r={10.5} fill={T.fur} stroke={T.o} strokeWidth={4} />
      <Path d="M41 163 l0 3 M45 164 l0 3 M49 163 l0 3" stroke={T.o} strokeWidth={2} strokeLinecap="round" />
    </G>
  ),
  prop: (p) => propArt(p, [45, 160], T.o),
};

/* ------------------------------------------------------------------ */
/* Biscuit: the clumsy chef. Chubby orange tabby, crooked chef hat       */
/* ------------------------------------------------------------------ */

const B = { o: '#6B3A1F', fur: '#F6B878', stripe: '#D8894C', cream: '#FFF3E2', inner: '#F6A5A0', blush: '#F58C8C', hat: '#FFFDF7', hatShade: '#EDE3D2', eye: '#3B2216', mouth: '#8E3B3B', scarf: '#7FA36B' };

const biscuitEyes = (e: Eyes): ReactNode => {
  const o = B.eye;
  switch (e) {
    case 'happy':
      return (
        <G stroke={o} strokeWidth={4} fill="none" strokeLinecap="round">
          <Path d="M71 85 Q 80 74 89 85" />
          <Path d="M111 85 Q 120 74 129 85" />
        </G>
      );
    case 'closed':
      return (
        <G stroke={o} strokeWidth={4} fill="none" strokeLinecap="round">
          <Path d="M71 82 Q 80 87 89 82" />
          <Path d="M111 82 Q 120 87 129 82" />
        </G>
      );
    case 'wide':
      return (
        <G>
          <Ellipse cx={80} cy={81} rx={11} ry={12} fill="#fff" stroke={B.o} strokeWidth={3} />
          <Ellipse cx={120} cy={81} rx={11} ry={12} fill="#fff" stroke={B.o} strokeWidth={3} />
          <Circle cx={80} cy={82} r={4} fill={o} />
          <Circle cx={120} cy={82} r={4} fill={o} />
        </G>
      );
    case 'wink':
      return (
        <G>
          <Path d="M71 85 Q 80 74 89 85" stroke={o} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Ellipse cx={120} cy={82} rx={7.5} ry={9} fill={o} />
          <Circle cx={122.5} cy={78.5} r={2.6} fill="#fff" />
        </G>
      );
    default: // normal (also used for "determined": Biscuit can't do serious)
      return (
        <G>
          <Ellipse cx={80} cy={82} rx={7.5} ry={9} fill={o} />
          <Ellipse cx={120} cy={82} rx={7.5} ry={9} fill={o} />
          <Circle cx={82.5} cy={78.5} r={2.6} fill="#fff" />
          <Circle cx={122.5} cy={78.5} r={2.6} fill="#fff" />
          <Circle cx={78} cy={86} r={1.2} fill="#fff" />
          <Circle cx={118} cy={86} r={1.2} fill="#fff" />
        </G>
      );
  }
};

const biscuitMouth = (m: Mouth): ReactNode => {
  const o = B.o;
  const nose = <Path d="M96 92 L104 92 L100 96 Z" fill="#F08A8A" stroke={o} strokeWidth={1.6} strokeLinejoin="round" />;
  const cat = <Path d="M92 98 Q 96 103 100 98 Q 104 103 108 98" stroke={o} strokeWidth={3} fill="none" strokeLinecap="round" />;
  switch (m) {
    case 'open':
      return (
        <G>
          {nose}
          <Path d="M93 98 Q 100 110 107 98 Z" fill={B.mouth} stroke={o} strokeWidth={2.6} strokeLinejoin="round" />
          <Ellipse cx={100} cy={104} rx={3.5} ry={2} fill="#F28B9B" />
        </G>
      );
    case 'smile':
      return (
        <G>
          {nose}
          <Path d="M89 97 Q 100 115 111 97 Z" fill={B.mouth} stroke={o} strokeWidth={2.6} strokeLinejoin="round" />
          <Ellipse cx={100} cy={106} rx={5} ry={3} fill="#F28B9B" />
        </G>
      );
    case 'flat':
      return (
        <G>
          {nose}
          <Path d="M94 101 Q 100 98 106 101" stroke={o} strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'o':
      return (
        <G>
          {nose}
          <Ellipse cx={100} cy={102} rx={4} ry={5} fill={B.mouth} stroke={o} strokeWidth={2.4} />
        </G>
      );
    case 'chew':
      return (
        <G>
          {nose}
          <Path d="M91 100 Q 95.5 96 100 100 Q 104.5 104 109 100" stroke={o} strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'tongue':
      return (
        <G>
          {nose}
          <Path d="M99 100 Q 101 110 105 100 Z" fill="#F28B9B" stroke={o} strokeWidth={2} />
          {cat}
        </G>
      );
    default:
      return (
        <G>
          {nose}
          {cat}
        </G>
      );
  }
};

const biscuitEarL = (
  <G>
    <Path d="M58 68 Q 51 34 59 25 Q 66 22 93 44 Z" fill={B.fur} stroke={B.o} strokeWidth={4} strokeLinejoin="round" />
    <Path d="M62 59 Q 58 39 62 33 Q 68 33 84 46 Z" fill={B.inner} />
  </G>
);

const biscuit: CatArt = {
  name: 'Biscuit',
  colors: { outline: B.o, fur: B.fur, blush: B.blush, accent: B.scarf },
  pivots: { shoulder: [68, 125], elbow: [66, 140], tail: [134, 172], neck: [100, 118], feet: [100, 192], eyeLine: 82, hat: [100, 44] },
  anchors: { sweat: [146, 58], headTop: [100, 14], mouth: [100, 100], bowl: [100, 166], paw: [66, 156], leftBicep: [60, 134] },
  defaultEyes: 'normal',
  headScale: 1,
  tail: (
    <G>
      <Path
        d="M132 178 C 160 182, 183 170, 181 143 C 180 132, 170 131, 170 140 C 170 158, 156 167, 132 166 Z"
        fill={B.fur}
        stroke={B.o}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <Path d="M158 170 l5 -9 M169 160 l8 -5 M176 147 l7 0" stroke={B.stripe} strokeWidth={3.5} strokeLinecap="round" />
    </G>
  ),
  body: (
    <G>
      <Ellipse cx={83} cy={185} rx={14} ry={8} fill={B.fur} stroke={B.o} strokeWidth={4} />
      <Ellipse cx={117} cy={185} rx={14} ry={8} fill={B.fur} stroke={B.o} strokeWidth={4} />
      <Path d="M79 186 l0 4 M84 187 l0 4 M116 187 l0 4 M121 186 l0 4" stroke={B.o} strokeWidth={2} strokeLinecap="round" />
      <Path d="M62 130 C 54 160, 66 186, 100 186 C 134 186, 146 160, 138 130 C 132 110, 68 110, 62 130 Z" fill={B.fur} stroke={B.o} strokeWidth={4} strokeLinejoin="round" />
      <Path d="M79 154 C 79 136, 121 136, 121 154 C 121 175, 79 175, 79 154 Z" fill={B.cream} />
      <Path d="M65 148 l11 2 M64 160 l11 1 M135 148 l-11 2 M136 160 l-11 1" stroke={B.stripe} strokeWidth={3.5} strokeLinecap="round" />
      {/* scarf */}
      <Path d="M70 118 Q 100 133 130 118 L 128 128 Q 100 142 72 128 Z" fill={B.scarf} stroke={B.o} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M93 133 L100 148 L107 133 Z" fill={B.scarf} stroke={B.o} strokeWidth={3} strokeLinejoin="round" />
    </G>
  ),
  ears: (
    <G>
      {biscuitEarL}
      {mirror(biscuitEarL)}
    </G>
  ),
  head: (
    <G>
      <Path
        d="M52 86 C 50 58, 72 42, 100 42 C 128 42, 150 58, 148 86 C 150 100, 140 114, 120 118 C 108 121, 92 121, 80 118 C 60 114, 50 100, 52 86 Z"
        fill={B.fur}
        stroke={B.o}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <Path d="M100 46 L100 58 M89 48 L91.5 57 M111 48 L108.5 57" stroke={B.stripe} strokeWidth={4} strokeLinecap="round" />
      <Path d="M52 92 l-7 -1 M53 98 l-6 2 M148 92 l7 -1 M147 98 l6 2" stroke={B.o} strokeWidth={2.5} strokeLinecap="round" />
      <Ellipse cx={100} cy={99} rx={17} ry={11} fill={B.cream} />
    </G>
  ),
  hat: (
    <G transform="rotate(-13 100 44)">
      <Path
        d="M76 46 L 77 32 C 63 31, 62 13, 77 15 C 79 4, 98 2, 101 11 C 111 3, 129 8, 124 22 C 136 24, 134 38, 122 36 L 123 46 Z"
        fill={B.hat}
        stroke={B.o}
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      <Path d="M86 30 Q 88 38 87 45 M110 30 Q 108 38 109 45" stroke={B.hatShade} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Rect x={75} y={41} width={49} height={9} rx={3} fill={B.hat} stroke={B.o} strokeWidth={3.5} />
    </G>
  ),
  eyes: biscuitEyes,
  mouth: biscuitMouth,
  blush: (
    <G>
      <Ellipse cx={68} cy={97} rx={8} ry={4.5} fill={B.blush} opacity={0.55} />
      <Ellipse cx={132} cy={97} rx={8} ry={4.5} fill={B.blush} opacity={0.55} />
    </G>
  ),
  upperArm: <Ellipse cx={67} cy={132} rx={10.5} ry={12.5} fill={B.fur} stroke={B.o} strokeWidth={4} />,
  foreArm: (
    <G>
      <Ellipse cx={66} cy={147} rx={9} ry={9} fill={B.fur} stroke={B.o} strokeWidth={4} />
      <Circle cx={66} cy={155} r={8.5} fill={B.cream} stroke={B.o} strokeWidth={4} />
      <Circle cx={66} cy={157} r={2.4} fill={B.inner} />
    </G>
  ),
  prop: (p) => propArt(p, [66, 157], B.o),
};

export const arts: Record<BuddyId, CatArt> = { tank, biscuit };
