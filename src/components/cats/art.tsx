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
  /** headHalf: half the head width, so effects can sit just outside it. */
  anchors: { sweat: Pt; headTop: Pt; mouth: Pt; bowl: Pt; paw: Pt; leftBicep: Pt; headHalf: number };
  defaultEyes: Eyes;
  /** Static head size multiplier, around the neck. */
  headScale: number;
  tail: ReactNode;
  body: ReactNode;
  ears: ReactNode;
  head: ReactNode;
  hat?: ReactNode;
  eyes: (e: Eyes) => ReactNode;
  /** Eyebrows, drawn outside the blinking eye layer so they stay put. */
  brows: (e: Eyes) => ReactNode;
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
    case 'bottle':
      // A water bottle, cap at the paw: raised to the mouth, the bottom tips up.
      return (
        <G transform={`rotate(-40 ${x} ${y})`}>
          <Rect x={x - 3.5} y={y - 4} width={7} height={7} rx={2} fill="#FFFDF7" stroke={outline} strokeWidth={2.5} />
          <Rect x={x - 7} y={y + 3} width={14} height={30} rx={5} fill="#8FD0F2" stroke={outline} strokeWidth={2.5} />
          <Rect x={x - 5.8} y={y + 13} width={11.6} height={8} fill="#E2634A" />
          <Path d={`M${x - 3} ${y + 24} L${x - 3} ${y + 29}`} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
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

const T = { o: '#17141C', fur: '#55545F', furShade: '#47464F', light: '#6E6D7A', inner: '#3A3442', innerPink: '#8E6477', blush: '#F59AA6', band: '#E2634A', bandDark: '#B9452F', bandStripe: '#FFF3E0', mouth: '#7A2E3A', pad: '#F2A0AE' };

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
      // Big, round, shiny eyes: a cute "oh!" instead of a startled stare.
      return (
        <G>
          <Ellipse cx={88.5} cy={60} rx={5.6} ry={6.6} fill={o} />
          <Ellipse cx={111.5} cy={60} rx={5.6} ry={6.6} fill={o} />
          <Circle cx={90.4} cy={57.6} r={2} fill="#fff" />
          <Circle cx={113.4} cy={57.6} r={2} fill="#fff" />
          <Circle cx={87} cy={62.6} r={0.9} fill="#fff" />
          <Circle cx={110} cy={62.6} r={0.9} fill="#fff" />
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

const tankBrows = (e: Eyes): ReactNode => {
  const line = (d: string) => <Path d={d} stroke={T.o} strokeWidth={3.4} fill="none" strokeLinecap="round" />;
  switch (e) {
    case 'happy':
      return <G>{line('M82 51 Q 88 47.5 94 51')}{line('M106 51 Q 112 47.5 118 51')}</G>;
    case 'wide': // a soft, slightly concerned curve (never angry or alarmed)
      return <G>{line('M82.5 52.5 Q 88 50 93.5 50.5')}{line('M117.5 52.5 Q 112 50 106.5 50.5')}</G>;
    case 'closed':
      return <G>{line('M82.5 52.5 Q 88 51 93.5 52.5')}{line('M106.5 52.5 Q 112 51 117.5 52.5')}</G>;
    case 'normal':
      return <G>{line('M82 52 Q 88 50.5 94 52')}{line('M106 52 Q 112 50.5 118 52')}</G>;
    case 'wink':
      return <G>{line('M82 51 Q 88 47.5 94 51')}{line('M119 51 L 107 54')}</G>;
    default: // determined: angled down toward the middle
      return <G>{line('M81 51 L 93.5 54')}{line('M119 51 L 106.5 54')}</G>;
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
          <Path d="M96.5 69.5 L 98.5 69.5 L 97.5 72 Z" fill="#fff" />
        </G>
      );
    case 'smile':
      return (
        <G>
          {nose}
          <Path d="M93 68.5 Q 100 80 107 68.5 Z" fill={T.mouth} stroke={o} strokeWidth={2.5} strokeLinejoin="round" />
          <Path d="M95 69 L 97.5 69 L 96.2 72.2 Z" fill="#fff" />
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
    <Path d="M80 39 L 78 20 L 91 32 Z" fill={T.innerPink} />
    <Path d="M81 36 l2 -5 M84 37 l2 -4" stroke={T.light} strokeWidth={1.6} strokeLinecap="round" />
  </G>
);

const tank: CatArt = {
  name: 'Tank',
  colors: { outline: T.o, fur: T.fur, blush: T.blush, accent: T.band },
  pivots: { shoulder: [46, 96], elbow: [45, 131], tail: [130, 163], neck: [100, 76], feet: [100, 192], eyeLine: 60 },
  anchors: { sweat: [130, 44], headTop: [100, 22], mouth: [100, 70], bowl: [100, 154], paw: [45, 164], leftBicep: [40, 112], headHalf: 46 }, // head is drawn 1.15× larger
  defaultEyes: 'determined',
  headScale: 1.15,
  tail: (
    <G>
      <Path
        d="M126 164 C 150 168, 170 158, 174 136 C 175 128, 171 122, 166 124 C 161 126, 164 132, 163 138 C 160 152, 146 158, 126 156 Z"
        fill={T.fur}
        stroke={T.o}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <Path d="M150 158 Q 160 152 165 142" stroke={T.light} strokeWidth={2.2} fill="none" strokeLinecap="round" />
    </G>
  ),
  body: (
    <G stroke={T.o} strokeLinejoin="round" strokeLinecap="round">
      {/* legs with toes */}
      <Path d="M79 168 C 77 177, 76 185, 77 190 Q 78 195 86 195 L 95 195 Q 99.5 195 99.5 190 L 99.5 170 Z" fill={T.fur} strokeWidth={4} />
      <Path d="M121 168 C 123 177, 124 185, 123 190 Q 122 195 114 195 L 105 195 Q 100.5 195 100.5 190 L 100.5 170 Z" fill={T.fur} strokeWidth={4} />
      <Path d="M85.5 191.5 l0 3.5 M91 192 l0 3 M109 192 l0 3 M114.5 191.5 l0 3.5" strokeWidth={2} />
      {/* torso: broad shoulders tapering to a narrow waist */}
      <Path
        d="M84 69 C 74 71, 62 74, 52 79 C 38 85, 30 95, 32 108 C 34 120, 48 126, 64 129 C 67 145, 72 158, 78 166 L 122 166 C 128 158, 133 145, 136 129 C 152 126, 166 120, 168 108 C 170 95, 162 85, 148 79 C 138 74, 126 71, 116 69 Z"
        fill={T.fur}
        strokeWidth={4}
      />
      {/* trapezius */}
      <G stroke="none" fill={T.light}>
        <Path d="M84 71 C 76 75, 68 78, 60 82 Q 74 85 87 79 Z" />
        <Path d="M116 71 C 124 75, 132 78, 140 82 Q 126 85 113 79 Z" />
      </G>
      {/* chest */}
      <Path d="M65 97 C 72 90, 90 90, 99 98 L 99 113 C 90 119, 73 118, 66 110 C 62 105, 62 100, 65 97 Z" fill={T.light} stroke="none" />
      <Path d="M135 97 C 128 90, 110 90, 101 98 L 101 113 C 110 119, 127 118, 134 110 C 138 105, 138 100, 135 97 Z" fill={T.light} stroke="none" />
      <Path d="M66 110 C 73 118, 90 119, 99 113 M134 110 C 127 118, 110 119, 101 113 M100 97 L 100 114" fill="none" strokeWidth={2.8} />
      {/* six-pack: a soft lighter area with gentle dividing lines */}
      <Path d="M88 119 Q 100 115 112 119 L 110 155 Q 100 159 90 155 Z" fill={T.light} stroke="none" />
      <G fill="none" strokeWidth={2.4}>
        <Path d="M100 119 L 100 155" />
        <Path d="M89.5 130.5 Q 94.5 133.5 99 130.5 M101 130.5 Q 105.5 133.5 110.5 130.5" />
        <Path d="M90 142.5 Q 94.5 145.5 99 142.5 M101 142.5 Q 105.5 145.5 110 142.5" />
      </G>
      {/* obliques */}
      <Path d="M77 122 Q 82 132 80 144 M123 122 Q 118 132 120 144" fill="none" strokeWidth={2.2} />
      {/* gym shorts, matching the sweatband */}
      <Path d="M74 156 Q 100 162 126 156 L 130 180 Q 117 183 104 181 L 100 171 L 96 181 Q 83 183 70 180 Z" fill={T.band} strokeWidth={3.5} />
      <Path d="M74.5 161 Q 100 167 125.5 161" stroke={T.bandDark} strokeWidth={3} fill="none" />
      <Path d="M76.5 166 L 77 179.5 M123.5 166 L 123 179.5" stroke={T.bandStripe} strokeWidth={2.5} />
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
      {/* sweatband tails hang BEHIND the head, so they never cover the ear */}
      <Path d="M118 47 C 128 49, 135 55, 139 65 L 133 67 C 130 59, 125 55, 117 53 Z" fill={T.band} stroke={T.o} strokeWidth={2.5} strokeLinejoin="round" />
      <Path d="M117 50 C 124 56, 127 63, 128 73 L 122 73 C 122 65, 120 59, 115 55 Z" fill={T.bandDark} stroke={T.o} strokeWidth={2.5} strokeLinejoin="round" />
      <Path d="M74 58 C 72 40, 84 30, 100 30 C 116 30, 128 40, 126 58 C 126 72, 114 80, 100 80 C 86 80, 74 72, 74 58 Z" fill={T.fur} stroke={T.o} strokeWidth={4} />
      {/* cheek fur */}
      <Path d="M75.5 64 l-3.5 3 l4 1 M124.5 64 l3.5 3 l-4 1" stroke={T.o} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {/* lighter muzzle */}
      <Ellipse cx={100} cy={69.5} rx={12.5} ry={7.5} fill={T.light} />
      {/* sweatband with a neat knot at the side */}
      <Path d="M75.5 44 Q 100 33 124.5 44 L 125.5 51 Q 100 40 74.5 51 Z" fill={T.band} stroke={T.o} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M76 47.5 Q 100 36.5 124.5 47.5" stroke={T.bandStripe} strokeWidth={1.6} fill="none" />
      <Path d="M121 43.5 Q 127 43 127.5 47.5 Q 127 52 121 51.5 Q 119 47.5 121 43.5 Z" fill={T.bandDark} stroke={T.o} strokeWidth={2.4} strokeLinejoin="round" />
      {/* face stitches, like whiskers */}
      <Path d="M74 63 L 67 62 M74 67 L 67 68 M126 63 L 133 62 M126 67 L 133 68" stroke={T.o} strokeWidth={2.4} strokeLinecap="round" />
    </G>
  ),
  eyes: tankEyes,
  brows: tankBrows,
  mouth: tankMouth,
  blush: (
    <G>
      <Ellipse cx={80} cy={68} rx={6.5} ry={3.6} fill={T.blush} opacity={0.6} />
      <Ellipse cx={120} cy={68} rx={6.5} ry={3.6} fill={T.blush} opacity={0.6} />
      <Path d="M78.5 66.5 l-1 3 M82 66.5 l-1 3 M118 66.5 l1 3 M121.5 66.5 l1 3" stroke="#E46F82" strokeWidth={1.2} strokeLinecap="round" />
    </G>
  ),
  // One muscular piece from shoulder cap to elbow: deltoid, biceps (front) and triceps (outside).
  upperArm: (
    <G strokeLinecap="round" strokeLinejoin="round">
      <Path d="M46 80 C 34 80, 26 90, 27 104 C 28 118, 33 130, 45 136 C 57 130, 63 118, 63 104 C 63 90, 58 80, 46 80 Z" fill={T.fur} stroke={T.o} strokeWidth={4} />
      <Path d="M34 86 C 40 82, 50 82, 56 87 C 50 90, 40 92, 34 86 Z" fill={T.light} />
      <Path d="M50 104 C 58 106, 60 116, 56 125 C 52 120, 49 112, 50 104 Z" fill={T.light} />
      <Path d="M29 99 C 36 104, 44 104, 51 98" stroke={T.o} strokeWidth={2.6} fill="none" />
      <Path d="M31 112 Q 34 122 40 129" stroke={T.o} strokeWidth={2.2} fill="none" />
    </G>
  ),
  // Forearm tapering into a wristband and a mitten-shaped cat paw with three toe bumps.
  foreArm: (
    <G strokeLinecap="round" strokeLinejoin="round">
      <Path d="M36 126 C 33 136, 33 146, 35 154 L 55 154 C 57 146, 57 136, 54 126 Z" fill={T.fur} stroke={T.o} strokeWidth={4} />
      <Path d="M39 136 Q 42 144 41 150" stroke={T.light} strokeWidth={2.4} fill="none" />
      {/* wristband */}
      <Rect x={32.5} y={147.5} width={25} height={8.5} rx={4} fill={T.band} stroke={T.o} strokeWidth={2.6} />
      <Path d="M34.5 151.75 L 55.5 151.75" stroke={T.bandStripe} strokeWidth={1.4} />
      {/* paw */}
      <Path
        d="M33.5 156 C 30 161, 31 169, 36 172 Q 39 175 42.5 173 Q 45 175.5 47.5 173 Q 51 175 54 172 C 59 169, 60 161, 56.5 156 Z"
        fill={T.fur}
        stroke={T.o}
        strokeWidth={4}
      />
      <Path d="M42.5 173 l 0 -3.5 M47.5 173 l 0 -3.5" stroke={T.o} strokeWidth={2} />
      <Path d="M37 160 Q 45 157 53 160" stroke={T.light} strokeWidth={2.2} fill="none" />
    </G>
  ),
  prop: (p) => propArt(p, [45, 165], T.o),
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
      // Big, round, shiny eyes: a cute "oh!" instead of a startled stare.
      return (
        <G>
          <Ellipse cx={80} cy={82} rx={9} ry={10.5} fill={o} />
          <Ellipse cx={120} cy={82} rx={9} ry={10.5} fill={o} />
          <Circle cx={83} cy={77.5} r={3.3} fill="#fff" />
          <Circle cx={123} cy={77.5} r={3.3} fill="#fff" />
          <Circle cx={77.5} cy={86.5} r={1.5} fill="#fff" />
          <Circle cx={117.5} cy={86.5} r={1.5} fill="#fff" />
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

const biscuitBrows = (e: Eyes): ReactNode => {
  const line = (d: string) => <Path d={d} stroke={B.o} strokeWidth={2.8} fill="none" strokeLinecap="round" />;
  switch (e) {
    case 'happy':
      return <G>{line('M73 67 Q 80 62.5 87 67')}{line('M113 67 Q 120 62.5 127 67')}</G>;
    case 'wide': // a soft, slightly concerned curve
      return <G>{line('M74 67.5 Q 80 64.5 86 65')}{line('M126 67.5 Q 120 64.5 114 65')}</G>;
    case 'closed':
      return <G>{line('M74 69 Q 80 67 86 69')}{line('M114 69 Q 120 67 126 69')}</G>;
    case 'wink':
      return <G>{line('M73 67 Q 80 62.5 87 67')}{line('M114 68 Q 120 65.5 126 68')}</G>;
    default:
      return <G>{line('M74 68 Q 80 65.5 86 68')}{line('M114 68 Q 120 65.5 126 68')}</G>;
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
    <Path d="M64 54 l4 -4 M66 58 l5 -3" stroke={B.cream} strokeWidth={2} strokeLinecap="round" />
  </G>
);

const biscuit: CatArt = {
  name: 'Biscuit',
  colors: { outline: B.o, fur: B.fur, blush: B.blush, accent: B.scarf },
  pivots: { shoulder: [68, 125], elbow: [66, 140], tail: [134, 172], neck: [100, 118], feet: [100, 192], eyeLine: 82, hat: [100, 44] },
  anchors: { sweat: [146, 58], headTop: [100, 14], mouth: [100, 100], bowl: [100, 166], paw: [66, 156], leftBicep: [60, 134], headHalf: 52 },
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
      <Path d="M65 148 l11 2 M64 160 l11 1 M66 172 l9 -1 M135 148 l-11 2 M136 160 l-11 1 M134 172 l-9 -1" stroke={B.stripe} strokeWidth={3.5} strokeLinecap="round" />
      {/* chef apron */}
      <Path d="M77 136 Q 100 142 123 136 L 122 176 Q 100 184 78 176 Z" fill={B.cream} stroke={B.o} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M90 158 L 110 158 L 109 169 Q 100 172 91 169 Z" fill="none" stroke={B.stripe} strokeWidth={2.4} strokeLinejoin="round" />
      <Path d="M100 166 C 96 163, 96.5 160, 98.5 160.5 C 99.5 160.8, 100 161.6, 100 162.2 C 100 161.6, 100.5 160.8, 101.5 160.5 C 103.5 160, 104 163, 100 166 Z" fill="#E0605A" />
      <Path d="M80 148 Q 100 152 120 148" stroke={B.hatShade} strokeWidth={2} fill="none" strokeLinecap="round" />
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
      {/* fluffy cheeks poke out behind the head */}
      <Path d="M58 90 L 45 95 L 56 99 L 47 106 L 62 106 Z" fill={B.fur} stroke={B.o} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M142 90 L 155 95 L 144 99 L 153 106 L 138 106 Z" fill={B.fur} stroke={B.o} strokeWidth={3} strokeLinejoin="round" />
      <Path
        d="M52 86 C 50 58, 72 42, 100 42 C 128 42, 150 58, 148 86 C 150 100, 140 114, 120 118 C 108 121, 92 121, 80 118 C 60 114, 50 100, 52 86 Z"
        fill={B.fur}
        stroke={B.o}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <Path d="M100 46 L100 58 M89 48 L91.5 57 M111 48 L108.5 57" stroke={B.stripe} strokeWidth={4} strokeLinecap="round" />
      <Path d="M52 92 l-7 -1 M53 98 l-6 2 M148 92 l7 -1 M147 98 l6 2" stroke={B.o} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M56 74 Q 62 70 66 74 M144 74 Q 138 70 134 74" stroke={B.stripe} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Ellipse cx={100} cy={99} rx={17} ry={11} fill={B.cream} />
      {/* whisker dots */}
      <Circle cx={90} cy={98} r={1.2} fill={B.stripe} />
      <Circle cx={92.5} cy={102} r={1.2} fill={B.stripe} />
      <Circle cx={110} cy={98} r={1.2} fill={B.stripe} />
      <Circle cx={107.5} cy={102} r={1.2} fill={B.stripe} />
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
      <Circle cx={86} cy={45.5} r={2.6} fill="#E0605A" stroke={B.o} strokeWidth={1.6} />
    </G>
  ),
  eyes: biscuitEyes,
  brows: biscuitBrows,
  mouth: biscuitMouth,
  blush: (
    <G>
      <Ellipse cx={68} cy={97} rx={8} ry={4.5} fill={B.blush} opacity={0.55} />
      <Ellipse cx={132} cy={97} rx={8} ry={4.5} fill={B.blush} opacity={0.55} />
    </G>
  ),
  upperArm: (
    <G>
      <Ellipse cx={67} cy={132} rx={10.5} ry={12.5} fill={B.fur} stroke={B.o} strokeWidth={4} />
      <Path d="M59 130 l6 1.5 M59.5 136 l6 1" stroke={B.stripe} strokeWidth={2.8} strokeLinecap="round" />
    </G>
  ),
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
