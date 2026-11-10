/**
 * The animated cat. Each body part is its own layer, and every layer rotates
 * around a real joint (shoulder, elbow, neck, tail base), so poses look like
 * a puppet moving rather than a picture swapping.
 *
 * <CatBuddy buddy="tank" mood="flex" talking size={160} />
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { haptics } from '../../lib/haptics';
import { arts, bowlArt, type CatArt } from './art';
import { moodSpecs, settle } from './moods';
import type { BuddyId, Eyes, Mood } from './types';

type Props = {
  buddy: BuddyId;
  mood?: Mood;
  /** Moves the mouth, for while a speech bubble is typing. */
  talking?: boolean;
  size?: number;
  /** Tapping the cat pets it. */
  onPet?: () => void;
  petable?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Change this (e.g. to the line being said) to replay an energetic mood that already settled. */
  playKey?: string;
};

const origin = (x: number, y: number) => `${x / 2}% ${y / 2}%`;
const pose = { damping: 13, stiffness: 140, mass: 0.8 };
const ease = Easing.inOut(Easing.quad);

function Art({ children }: { children: React.ReactNode }) {
  return (
    <Svg viewBox="0 0 200 200" width="100%" height="100%">
      {children}
    </Svg>
  );
}

export function CatBuddy({ buddy, mood = 'idle', talking = false, size = 160, onPet, petable = true, style, accessibilityLabel, playKey = '' }: Props) {
  const art = arts[buddy];
  const reduceMotion = useReducedMotion();
  const [petted, setPetted] = useState(false);
  const baseMood: Mood = petted ? 'love' : mood;
  // Energetic moods calm down after a few loops (see `settle` in moods.ts).
  const playId = `${baseMood}|${playKey}|${petted}`;
  const [settledId, setSettledId] = useState<string | null>(null);
  const rule = settle[baseMood];
  const activeMood: Mood = rule && settledId === playId ? rule.to : baseMood;
  useEffect(() => {
    if (!rule) return;
    const id = setTimeout(() => setSettledId(playId), rule.after);
    return () => clearTimeout(id);
  }, [playId, rule]);
  const spec = moodSpecs[activeMood];
  const eyes: Eyes = spec.eyes === 'default' ? art.defaultEyes : spec.eyes === 'determined' && buddy === 'biscuit' ? 'normal' : spec.eyes;

  // Whole body
  const jump = useSharedValue(0);
  const tilt = useSharedValue(0);
  const shake = useSharedValue(0);
  const breath = useSharedValue(1);
  const pump = useSharedValue(1);
  // Parts
  const headRot = useSharedValue(0);
  const headY = useSharedValue(0);
  const tail = useSharedValue(0);
  const blink = useSharedValue(1);
  const mouth = useSharedValue(0);
  const hat = useSharedValue(0);
  const lU = useSharedValue(spec.L[0]);
  const lF = useSharedValue(spec.L[1]);
  const rU = useSharedValue(spec.R[0]);
  const rF = useSharedValue(spec.R[1]);
  // Effects clock (0 → 1, looping)
  const fx = useSharedValue(0);

  /* ---------- idle life: breathing, blinking, tail ---------- */
  useEffect(() => {
    if (reduceMotion) return;
    breath.set(withRepeat(withTiming(1.025, { duration: 1400, easing: ease }), -1, true));
    blink.set(withRepeat(withSequence(withDelay(2600 + Math.random() * 1600, withTiming(0.1, { duration: 70 })), withTiming(1, { duration: 110 })), -1));
    fx.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1));
  }, [reduceMotion, breath, blink, fx]);

  /* ---------- mood: pose + motion ---------- */
  useEffect(() => {
    const s = moodSpecs[activeMood];
    // Arms spring into the new pose.
    lU.set(withSpring(s.L[0], pose));
    lF.set(withSpring(s.L[1], pose));
    rU.set(withSpring(s.R[0], pose));
    rF.set(withSpring(s.R[1], pose));
    // Reset body motion.
    jump.set(withSpring(0, pose));
    tilt.set(withSpring(0, pose));
    shake.set(withTiming(0, { duration: 120 }));
    pump.set(withSpring(1, pose));
    headRot.set(withSpring(0, pose));
    headY.set(withSpring(0, pose));
    hat.set(withSpring(0, pose));
    tail.set(withRepeat(withSequence(withTiming(-8, { duration: 900, easing: ease }), withTiming(10, { duration: 900, easing: ease })), -1, true));
    if (reduceMotion) return;

    const loop = (a: number, b: number, ms: number) => withRepeat(withSequence(withTiming(a, { duration: ms, easing: ease }), withTiming(b, { duration: ms, easing: ease })), -1, true);

    switch (activeMood) {
      case 'wave':
        rF.set(withDelay(250, loop(s.R[1] + 30, s.R[1] - 10, 260)));
        headRot.set(withSpring(-6, pose));
        break;
      case 'happy':
        jump.set(withRepeat(withSequence(withTiming(-10, { duration: 180, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 220, easing: Easing.bounce }), withDelay(500, withTiming(0, { duration: 1 }))), -1));
        tail.set(loop(-14, 18, 260));
        break;
      case 'celebrate':
        jump.set(withRepeat(withSequence(withTiming(-18, { duration: 220, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 260, easing: Easing.bounce })), -1));
        lU.set(withDelay(200, loop(170, 145, 240)));
        rU.set(withDelay(200, loop(145, 170, 240)));
        tail.set(loop(-16, 20, 200));
        break;
      case 'love':
        tilt.set(loop(-4, 4, 500));
        headRot.set(loop(5, -5, 500));
        tail.set(loop(-18, 22, 350));
        break;
      case 'think':
        headRot.set(withSpring(9, pose));
        rF.set(withDelay(300, loop(s.R[1] - 8, s.R[1] + 4, 700)));
        tail.set(loop(-4, 6, 1300));
        break;
      case 'worried':
        shake.set(withRepeat(withSequence(withTiming(-2.5, { duration: 50 }), withTiming(2.5, { duration: 50 })), -1, true));
        tail.set(withSpring(-20, pose));
        break;
      case 'sleepy':
        headRot.set(withSpring(12, { damping: 30, stiffness: 30 }));
        headY.set(withSpring(5, { damping: 30, stiffness: 30 }));
        tail.set(loop(-3, 3, 2000));
        break;
      case 'stir':
        rF.set(withDelay(200, loop(s.R[1] - 25, s.R[1] + 15, 380)));
        rU.set(withDelay(200, loop(s.R[0] - 6, s.R[0] + 6, 380)));
        headRot.set(loop(-3, 3, 760));
        break;
      case 'eat':
        headY.set(loop(1.5, -1.5, 160));
        lF.set(withDelay(250, loop(s.L[1] - 8, s.L[1] + 4, 320)));
        rF.set(withDelay(250, loop(s.R[1] + 4, s.R[1] - 8, 320)));
        break;
      case 'flex':
        pump.set(withDelay(250, withRepeat(withSequence(withTiming(1.05, { duration: 260, easing: ease }), withTiming(1, { duration: 360, easing: ease })), -1)));
        lF.set(withDelay(250, loop(s.L[1] + 12, s.L[1] - 4, 310)));
        rF.set(withDelay(250, loop(s.R[1] + 12, s.R[1] - 4, 310)));
        break;
      case 'lift':
        rF.set(withDelay(200, withRepeat(withSequence(withTiming(-140, { duration: 650, easing: ease }), withTiming(-20, { duration: 650, easing: ease })), -1)));
        headY.set(loop(1, -1, 650));
        break;
      case 'oops':
        tilt.set(withSequence(withTiming(-14, { duration: 160 }), withTiming(11, { duration: 200 }), withTiming(-7, { duration: 180 }), withSpring(0, { damping: 6, stiffness: 120 })));
        hat.set(withSequence(withTiming(-22, { duration: 180 }), withSpring(-8, { damping: 5, stiffness: 90 })));
        lU.set(loop(140, 100, 180));
        rU.set(loop(40, 80, 200));
        break;
      case 'proud':
        headRot.set(withSpring(-7, pose));
        headY.set(withSpring(-3, pose));
        pump.set(withSpring(1.03, pose));
        break;
      case 'alarm':
        // Ringing! Quick hops, both paws waving overhead, a little shake.
        jump.set(withRepeat(withSequence(withTiming(-12, { duration: 150, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) })), -1));
        lU.set(withDelay(150, loop(165, 135, 160)));
        rU.set(withDelay(150, loop(135, 165, 160)));
        lF.set(withDelay(150, loop(40, 5, 160)));
        rF.set(withDelay(150, loop(5, 40, 160)));
        headRot.set(loop(-6, 6, 160));
        tail.set(loop(-20, 24, 140));
        hat.set(loop(-6, 6, 160));
        break;
      case 'wait':
        headRot.set(loop(-7, 7, 900));
        tail.set(loop(-10, 14, 300));
        break;
    }
  }, [activeMood, reduceMotion, jump, tilt, shake, pump, headRot, headY, hat, tail, lU, lF, rU, rF]);

  /* ---------- talking mouth ---------- */
  useEffect(() => {
    if (talking && !reduceMotion) {
      mouth.set(withRepeat(withSequence(withTiming(1, { duration: 110 }), withTiming(0.15, { duration: 120 })), -1, true));
      headY.set(withRepeat(withSequence(withTiming(-1.2, { duration: 230 }), withTiming(0.4, { duration: 230 })), -1, true));
    } else {
      mouth.set(withTiming(0, { duration: 120 }));
    }
  }, [talking, reduceMotion, mouth, headY]);

  /* ---------- animated styles ---------- */
  const [fx_, fy] = art.pivots.feet;
  const rootStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.get() }, { translateY: jump.get() }, { rotate: `${tilt.get()}deg` }, { scaleY: breath.get() * pump.get() }, { scaleX: pump.get() }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + jump.get() / 60 }], opacity: 1 + jump.get() / 40 }));
  const tailStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tail.get()}deg` }] }));
  const headScale = art.headScale;
  const headStyle = useAnimatedStyle(() => ({ transform: [{ translateY: headY.get() }, { rotate: `${headRot.get()}deg` }, { scale: headScale }] }));
  const eyesStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.get() }] }));
  const mouthClosed = useAnimatedStyle(() => ({ opacity: 1 - mouth.get() }));
  const mouthOpen = useAnimatedStyle(() => ({ opacity: mouth.get() }));
  const hatStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${hat.get()}deg` }] }));
  const lUStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${lU.get()}deg` }] }));
  const lFStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${lF.get()}deg` }] }));
  const rUStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-rU.get()}deg` }] }));
  const rFStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-rF.get()}deg` }] }));

  const [sx, sy] = art.pivots.shoulder;
  const [ex, ey] = art.pivots.elbow;
  const [tx, ty] = art.pivots.tail;
  const [nx, ny] = art.pivots.neck;
  const hatPivot = art.pivots.hat ?? [100, 40];
  const mouthMood = spec.mouth;
  const talkMouth = activeMood === 'eat' ? 'chew' : spec.mouth === 'smile' ? 'smile' : 'open';
  const hasFx = (e: string) => spec.fx.includes(e as never);

  const body = (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {/* ground shadow */}
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin(fx_, fy) }, shadowStyle]}>
        <Art>
          <Path d="M48 193 Q 100 201 152 193 Q 100 186 48 193 Z" fill="rgba(60,30,10,0.16)" />
        </Art>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin(fx_, fy) }, rootStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin(tx, ty) }, tailStyle]}>
          <Art>{art.tail}</Art>
        </Animated.View>
        <View style={StyleSheet.absoluteFill}>
          <Art>{art.body}</Art>
        </View>
        {hasFx('bowl') && (
          <View style={StyleSheet.absoluteFill}>
            <Art>{bowlArt(art.anchors.bowl[0], art.anchors.bowl[1], art.colors.outline)}</Art>
          </View>
        )}

        {/* head */}
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin(nx, ny) }, headStyle]}>
          <Art>
            {art.ears}
            {art.head}
            {art.blush}
            {art.brows(eyes)}
          </Art>
          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin(100, art.pivots.eyeLine) }, eyesStyle]}>
            <Art>{art.eyes(eyes)}</Art>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, mouthClosed]}>
            <Art>{art.mouth(mouthMood)}</Art>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, mouthOpen]}>
            <Art>{art.mouth(talkMouth)}</Art>
          </Animated.View>
          {art.hat && (
            <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin(hatPivot[0], hatPivot[1]) }, hatStyle]}>
              <Art>{art.hat}</Art>
            </Animated.View>
          )}
        </Animated.View>

        {/* arms: forearm is nested in the upper arm so it follows the shoulder */}
        <Arm art={art} side="L" upperStyle={lUStyle} foreStyle={lFStyle} shoulder={[sx, sy]} elbow={[ex, ey]} />
        <Arm art={art} side="R" upperStyle={rUStyle} foreStyle={rFStyle} shoulder={[200 - sx, sy]} elbow={[200 - ex, ey]} prop={spec.prop} />
      </Animated.View>

      {/* effects */}
      {spec.fx.map((e) => (
        <Effects key={e} kind={e} art={art} clock={fx} k={size / 200} />
      ))}
    </View>
  );

  if (!petable) return <View style={style}>{body}</View>;

  return (
    <Pressable
      onPress={() => {
        haptics.select();
        setPetted(true);
        setTimeout(() => setPetted(false), 1600);
        onPet?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Pet ${art.name}`}
      style={style}
    >
      {body}
    </Pressable>
  );
}

function Arm({
  art,
  side,
  upperStyle,
  foreStyle,
  shoulder,
  elbow,
  prop,
}: {
  art: CatArt;
  side: 'L' | 'R';
  upperStyle: ReturnType<typeof useAnimatedStyle>;
  foreStyle: ReturnType<typeof useAnimatedStyle>;
  shoulder: readonly [number, number];
  elbow: readonly [number, number];
  prop?: string;
}) {
  const flip = (node: React.ReactNode) => (side === 'R' ? <G transform="translate(200,0) scale(-1,1)">{node}</G> : node);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin(shoulder[0], shoulder[1]) }, upperStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin(elbow[0], elbow[1]) }, foreStyle]}>
        <Art>
          {flip(art.foreArm)}
          {prop && prop !== 'none' && flip(art.prop(prop as never))}
        </Art>
      </Animated.View>
      <Art>{flip(art.upperArm)}</Art>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Particle effects, all driven by one looping clock                   */
/* ------------------------------------------------------------------ */

function Particle({ clock, phase, from, to, children, spin = 0, fade = true, pop = false, k }: {
  k: number; // pixels per grid unit
  clock: SharedValue<number>;
  phase: number;
  from: readonly [number, number];
  to: readonly [number, number];
  children: React.ReactNode;
  spin?: number;
  fade?: boolean;
  pop?: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const p = (clock.get() + phase) % 1;
    const scale = pop ? Math.sin(p * Math.PI) : 1;
    return {
      opacity: fade ? Math.min(1, (1 - p) * 2.2) * Math.min(1, p * 6) : 1,
      transform: [
        { translateX: (to[0] - from[0]) * p * k },
        { translateY: (to[1] - from[1]) * p * k },
        { rotate: `${spin * p}deg` },
        { scale },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: origin(from[0], from[1]) }, style]}>
      <Art>{children}</Art>
    </Animated.View>
  );
}

const sparkle = (x: number, y: number, r: number, color = '#FFD24D') => (
  <Path d={`M${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`} fill={color} stroke="#B07A1E" strokeWidth={1} />
);
const heart = (x: number, y: number) => (
  <Path d={`M${x} ${y + 6} C ${x - 9} ${y - 1}, ${x - 5} ${y - 9}, ${x} ${y - 3} C ${x + 5} ${y - 9}, ${x + 9} ${y - 1}, ${x} ${y + 6} Z`} fill="#F0727E" stroke="#9E3443" strokeWidth={1.5} />
);

function Effects({ kind, art, clock, k }: { kind: string; art: CatArt; clock: SharedValue<number>; k: number }) {
  const [hx, hy] = art.anchors.headTop;
  const [mx, my] = art.anchors.mouth;
  const [sx, sy] = art.anchors.sweat;
  const [bx, by] = art.anchors.bowl;
  switch (kind) {
    case 'exclaim':
      return (
        <>
          {[[hx - 46, hy + 22, 0], [hx + 48, hy + 16, 0.5]].map(([x, y, ph]) => (
            <Particle key={ph} k={k} clock={clock} phase={ph} from={[x, y]} to={[x, y - 6]} pop fade={false}>
              <Path d={`M${x - 3} ${y - 16} L${x + 3} ${y - 16} L${x + 1.5} ${y - 2} L${x - 1.5} ${y - 2} Z`} fill="#E2463A" stroke="#7A1E17" strokeWidth={1.5} strokeLinejoin="round" />
              <Circle cx={x} cy={y + 3.5} r={2.8} fill="#E2463A" stroke="#7A1E17" strokeWidth={1.5} />
            </Particle>
          ))}
        </>
      );
    case 'ring': {
      // Sound waves just outside the head, at eye level.
      const cy = my - 14;
      const a = art.anchors.headHalf + 8;
      const b2 = a + 11;
      return (
        <>
          {[0, 0.5].map((ph) => (
            <Particle key={ph} k={k} clock={clock} phase={ph} from={[hx, cy]} to={[hx, cy]} pop>
              <Path d={`M${hx - a} ${cy - 12} Q ${hx - a - 8} ${cy} ${hx - a} ${cy + 12} M${hx + a} ${cy - 12} Q ${hx + a + 8} ${cy} ${hx + a} ${cy + 12}`} stroke="#E2634A" strokeWidth={3.5} fill="none" strokeLinecap="round" />
              <Path d={`M${hx - b2} ${cy - 18} Q ${hx - b2 - 11} ${cy} ${hx - b2} ${cy + 18} M${hx + b2} ${cy - 18} Q ${hx + b2 + 11} ${cy} ${hx + b2} ${cy + 18}`} stroke="#F2C14E" strokeWidth={3} fill="none" strokeLinecap="round" />
            </Particle>
          ))}
        </>
      );
    }
    case 'sweat':
      return (
        <Particle k={k} clock={clock} phase={0} from={[sx, sy]} to={[sx + 2, sy + 16]}>
          <Path d={`M${sx} ${sy - 7} Q ${sx + 6} ${sy + 1} ${sx} ${sy + 4} Q ${sx - 6} ${sy + 1} ${sx} ${sy - 7} Z`} fill="#8FD0F2" stroke="#3E87B5" strokeWidth={1.5} />
        </Particle>
      );
    case 'sparkle':
      return (
        <>
          {[[hx - 52, hy + 20, 0], [hx + 54, hy + 34, 0.33], [hx + 40, hy - 2, 0.66]].map(([x, y, ph]) => (
            <Particle k={k} key={ph} clock={clock} phase={ph} from={[x, y]} to={[x, y - 4]} pop fade={false}>
              {sparkle(x, y, 8)}
            </Particle>
          ))}
        </>
      );
    case 'hearts':
      return (
        <>
          {[[hx - 18, hy + 12, 0], [hx + 22, hy + 6, 0.5]].map(([x, y, ph]) => (
            <Particle k={k} key={ph} clock={clock} phase={ph} from={[x, y]} to={[x + (ph ? 8 : -8), y - 26]}>
              {heart(x, y)}
            </Particle>
          ))}
        </>
      );
    case 'zzz':
      return (
        <>
          {[0, 0.33, 0.66].map((ph, i) => (
            <Particle k={k} key={ph} clock={clock} phase={ph} from={[hx + 34, hy + 18]} to={[hx + 58, hy - 12]}>
              <SvgText x={hx + 34} y={hy + 18} fontSize={12 + i * 2} fontWeight="bold" fill="#7B6CD9" stroke="#3A2C8F" strokeWidth={0.8}>
                Z
              </SvgText>
            </Particle>
          ))}
        </>
      );
    case 'dots':
      return (
        <>
          {[0, 1, 2].map((i) => (
            <Particle k={k} key={i} clock={clock} phase={i * 0.2} from={[hx + 34 + i * 10, hy + 4]} to={[hx + 34 + i * 10, hy]} pop fade={false}>
              <Circle cx={hx + 34 + i * 10} cy={hy + 4} r={4} fill="#FFFDF7" stroke="#5A3A24" strokeWidth={2} />
            </Particle>
          ))}
        </>
      );
    case 'crumbs':
      return (
        <>
          {[[-10, 0], [6, 0.3], [-2, 0.6]].map(([dx, ph]) => (
            <Particle k={k} key={ph} clock={clock} phase={ph} from={[mx + dx, my + 4]} to={[mx + dx * 2, my + 40]} spin={180}>
              <Rect x={mx + dx - 2} y={my + 2} width={4.5} height={4} rx={1} fill="#C98A4B" />
            </Particle>
          ))}
        </>
      );
    case 'poof':
      return (
        <>
          {[[-44, 0], [44, 0.25], [-30, 0.5], [32, 0.75]].map(([dx, ph]) => (
            <Particle k={k} key={ph} clock={clock} phase={ph} from={[100 + dx, 176]} to={[100 + dx * 1.4, 160]} pop>
              <Circle cx={100 + dx} cy={176} r={10} fill="#FFFFFF" stroke="#E8DCCB" strokeWidth={2} />
            </Particle>
          ))}
        </>
      );
    case 'steam':
      return (
        <>
          {[-14, 0, 14].map((dx, i) => (
            <Particle k={k} key={dx} clock={clock} phase={i * 0.33} from={[bx + dx, by - 16]} to={[bx + dx, by - 44]}>
              <Path d={`M${bx + dx} ${by - 10} q -5 -6 0 -12 q 5 -6 0 -12`} stroke="#C9B8A6" strokeWidth={3} fill="none" strokeLinecap="round" />
            </Particle>
          ))}
        </>
      );
    case 'confetti':
      return (
        <>
          {[
            [24, 0, '#F2C14E'],
            [62, 0.2, '#E2634A'],
            [140, 0.4, '#7FA36B'],
            [176, 0.6, '#7B6CD9'],
            [100, 0.8, '#F0727E'],
            [40, 0.5, '#4FA3F7'],
            [160, 0.1, '#F2C14E'],
          ].map(([x, ph, c]) => (
            <Particle k={k} key={`${x}-${ph}`} clock={clock} phase={ph as number} from={[x as number, 4]} to={[(x as number) + 10, 120]} spin={360}>
              <Rect x={(x as number) - 3} y={0} width={6} height={9} rx={1.5} fill={c as string} />
            </Particle>
          ))}
        </>
      );
    default:
      return null;
  }
}
