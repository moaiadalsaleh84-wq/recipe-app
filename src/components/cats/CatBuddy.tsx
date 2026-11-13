/**
 * The animated cat. Each body part is its own layer, and every layer rotates
 * around a real joint (shoulder, elbow, neck, tail base), so poses look like
 * a puppet moving rather than a picture swapping.
 *
 * How it acts:
 * - A line's mood plays once as a short "act" (a wave, a nod, a sip of water…), timed with
 *   anticipation, squash and stretch, and soft overshoot.
 * - When the line is done (and a beat has passed), the cat relaxes: slow breathing, a lazy tail,
 *   blinks and the odd glance around. Nothing loops on repeat except breathing and the tail.
 * - Sleepy and alarm are states, not lines, so they keep going (see `sustained` in moods.ts).
 *
 * <CatBuddy buddy="tank" mood="flex" talking size={160} />
 */
import { useEffect, useRef, useState } from 'react';
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
import { useStore } from '../../state/store';
import { arts, bowlArt, type CatArt, type Pass } from './art';
import { actMs, moodSpecs, restSpec, sustained } from './moods';
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
  /** Change this (e.g. to the line being said) to play the mood's act again. */
  playKey?: string;
  /** Keep the mood's pose instead of relaxing afterwards (for still images). */
  hold?: boolean;
};

const origin = (x: number, y: number) => `${x / 2}% ${y / 2}%`;
/** Arms and head: quick, with a small overshoot. */
const pose = { damping: 14, stiffness: 170, mass: 0.7 };
/** Relaxing back to rest: slow and soft. */
const soft = { damping: 20, stiffness: 70, mass: 1 };
/** Landing from a hop: a jiggly settle. */
const jiggle = { damping: 8, stiffness: 240, mass: 0.6 };
const sine = Easing.inOut(Easing.sin);
const out = Easing.out(Easing.cubic);
const fall = Easing.in(Easing.quad);
/** Pause after a line ends before the cat relaxes. */
const HOLD_MS = 1400;

const T = (v: number, ms: number, easing = sine) => withTiming(v, { duration: ms, easing });
const S = (v: number, config: object = pose) => withSpring(v, config);
const back = (a: number, b: number, ms: number, times: number) => withRepeat(withSequence(T(a, ms), T(b, ms)), times);

/** A hop: crouch, stretch up, fall, squash on landing, jiggle. Returns [jump, squash] steps. */
function hop(h: number) {
  return {
    jump: [T(0, 110), T(-h, 230, out), T(0, 200, fall), T(0, 160)],
    sq: [T(0.9, 110, out), T(1.08, 120, out), T(1, 110), T(1.03, 200), T(0.88, 70, out), S(1, jiggle)],
  };
}
function hops(h: number, n: number, gap = 60) {
  const steps = Array.from({ length: n }, (_, i) => hop(h * (i === n - 1 ? 0.8 : 1)));
  return {
    jump: withSequence(...steps.flatMap((s) => [...s.jump, T(0, gap)])),
    sq: withSequence(...steps.flatMap((s) => [...s.sq.slice(0, -1), S(1, jiggle), T(1, gap)])),
  };
}

function Art({ children }: { children: React.ReactNode }) {
  return (
    <Svg viewBox="0 0 200 200" width="100%" height="100%">
      {children}
    </Svg>
  );
}

export function CatBuddy({ buddy, mood = 'idle', talking = false, size = 160, onPet, petable = true, style, accessibilityLabel, playKey = '', hold = false }: Props) {
  const art = arts[buddy];
  const reduceMotion = useReducedMotion();
  const [petted, setPetted] = useState(false);
  const { addPet } = useStore();
  const activeMood: Mood = petted ? 'love' : mood;

  // Act, then rest: once the line is done (and its act has played), relax.
  const playId = `${activeMood}|${playKey}|${petted}`;
  const [restedId, setRestedId] = useState<string | null>(null);
  const keeps = hold || !!sustained[activeMood];
  const resting = !keeps && restedId === playId;
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, [playId]);
  useEffect(() => {
    if (keeps || talking) return;
    const left = Math.max(0, startedAt.current + actMs[activeMood] - Date.now());
    const id = setTimeout(() => setRestedId(playId), left + HOLD_MS);
    return () => clearTimeout(id);
  }, [playId, talking, keeps, activeMood]);

  const spec = resting ? restSpec : moodSpecs[activeMood];
  const eyes: Eyes = spec.eyes === 'default' ? art.defaultEyes : spec.eyes === 'determined' && buddy === 'biscuit' ? 'normal' : spec.eyes;

  // Whole body (pivots at the feet)
  const jump = useSharedValue(0);
  const tilt = useSharedValue(0);
  const sq = useSharedValue(1); // squash (<1) and stretch (>1), volume-preserving
  const breath = useSharedValue(1);
  const pump = useSharedValue(1); // chest out
  // Parts
  const headRot = useSharedValue(0);
  const headY = useSharedValue(0);
  const bob = useSharedValue(0); // head bob while talking
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

  /* ---------- always: breathing, blinking ---------- */
  useEffect(() => {
    if (reduceMotion) return;
    breath.set(withRepeat(T(1.028, 1600), -1, true));
    fx.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1));
    let id: ReturnType<typeof setTimeout>;
    const next = () => {
      id = setTimeout(() => {
        const close = withSequence(T(0.08, 70, Easing.in(Easing.quad)), T(1, 120, out));
        // Now and then a double blink.
        blink.set(Math.random() < 0.25 ? withSequence(close, T(1, 90), close) : close);
        next();
      }, 2200 + Math.random() * 2800);
    };
    next();
    return () => clearTimeout(id);
  }, [reduceMotion, breath, blink, fx]);

  /* ---------- the act (or the rest) ---------- */
  useEffect(() => {
    const s = resting ? restSpec : moodSpecs[activeMood];
    const L = s.L;
    const R = s.R;
    if (reduceMotion) {
      for (const [v, to] of [[lU, L[0]], [lF, L[1]], [rU, R[0]], [rF, R[1]]] as const) v.set(T(to, 200));
      return;
    }
    // Defaults: arms into the pose, body back to neutral. Each act below overrides what it moves.
    const cfg = resting ? soft : pose;
    lU.set(S(L[0], cfg));
    lF.set(S(L[1], cfg));
    rU.set(S(R[0], cfg));
    rF.set(S(R[1], cfg));
    jump.set(S(0, cfg));
    tilt.set(S(0, cfg));
    sq.set(S(1, cfg));
    pump.set(S(1, cfg));
    headRot.set(S(0, cfg));
    headY.set(S(0, cfg));
    hat.set(S(0, cfg));
    const lazyTail = withRepeat(withSequence(T(-7, 1300), T(9, 1300)), -1);
    const happyTail = (times: number) => withSequence(back(-16, 20, 170, times), lazyTail);
    tail.set(lazyTail);

    if (resting || activeMood === 'idle' || activeMood === 'content') {
      // Relaxed: every few seconds, a little something (a glance, a tail flick, a stretch).
      let id: ReturnType<typeof setTimeout>;
      const fidget = () => {
        id = setTimeout(() => {
          const pick = Math.floor(Math.random() * 4);
          const side = Math.random() < 0.5 ? -1 : 1;
          if (pick === 0) headRot.set(withSequence(T(6 * side, 600), withDelay(1300, T(0, 700))));
          else if (pick === 1) tail.set(withSequence(T(20, 220, out), T(-8, 650), lazyTail));
          else if (pick === 2) headRot.set(withSequence(T(-6, 500), withDelay(450, T(6, 800)), withDelay(400, T(0, 600))));
          else {
            sq.set(withSequence(T(1.035, 700), T(1, 900)));
            headY.set(withSequence(T(-1.5, 700), T(0, 900)));
          }
          fidget();
        }, 3500 + Math.random() * 4000);
      };
      fidget();
      return () => clearTimeout(id);
    }

    switch (activeMood) {
      case 'wave': {
        sq.set(withSequence(T(0.95, 120, out), S(1, jiggle)));
        headRot.set(S(-6));
        rF.set(withDelay(220, withSequence(back(R[1] + 32, R[1] - 12, 190, 6), S(R[1]))));
        tail.set(happyTail(4));
        break;
      }
      case 'happy': {
        const h = hops(12, 2);
        jump.set(h.jump);
        sq.set(h.sq);
        headRot.set(withSequence(T(-5, 300), T(5, 400), S(0)));
        tail.set(happyTail(6));
        break;
      }
      case 'celebrate': {
        const h = hops(20, 3);
        jump.set(h.jump);
        sq.set(h.sq);
        lU.set(withDelay(150, withSequence(back(175, 148, 170, 6), S(L[0]))));
        rU.set(withDelay(150, withSequence(back(148, 175, 170, 6), S(R[0]))));
        tail.set(happyTail(8));
        break;
      }
      case 'love': {
        tilt.set(withSequence(back(-4, 4, 520, 2), S(0, soft)));
        headRot.set(withSequence(back(6, -6, 520, 2), S(3, soft)));
        sq.set(withSequence(T(0.95, 300, out), S(1, soft)));
        tail.set(withSequence(back(-14, 18, 400, 3), lazyTail));
        break;
      }
      case 'think': {
        headRot.set(S(9));
        headY.set(S(-1));
        // Paw taps the chin.
        rF.set(withDelay(350, withSequence(back(R[1] - 10, R[1] + 4, 180, 6), S(R[1]))));
        tail.set(withRepeat(withSequence(T(-4, 1400), T(6, 1400)), -1));
        break;
      }
      case 'worried': {
        // Lean back, shrink a little, tuck the tail.
        tilt.set(S(4, soft));
        headRot.set(withSequence(S(-7), withDelay(700, T(-4, 600))));
        sq.set(S(0.96, soft));
        tail.set(withSequence(T(-12, 400), withRepeat(withSequence(T(-10, 700), T(-4, 700)), -1)));
        break;
      }
      case 'sleepy': {
        headRot.set(S(12, soft));
        headY.set(withSequence(S(5, soft), withRepeat(withSequence(T(6.5, 1800), T(4, 1800)), -1)));
        tail.set(withRepeat(withSequence(T(-3, 2200), T(3, 2200)), -1));
        break;
      }
      case 'stir': {
        rF.set(withDelay(200, withSequence(back(R[1] - 25, R[1] + 15, 360, 8), S(R[1]))));
        rU.set(withDelay(200, withSequence(back(R[0] - 6, R[0] + 6, 360, 8), S(R[0]))));
        headRot.set(withSequence(back(-3, 3, 720, 4), S(0)));
        break;
      }
      case 'eat': {
        headY.set(withDelay(250, withSequence(back(2, -1.5, 150, 10), S(0))));
        lF.set(withDelay(250, withSequence(back(L[1] - 8, L[1] + 4, 300, 6), S(L[1]))));
        rF.set(withDelay(250, withSequence(back(R[1] + 4, R[1] - 8, 300, 6), S(R[1]))));
        tail.set(happyTail(4));
        break;
      }
      case 'flex': {
        // Crouch, then two pumps and a proud hold.
        sq.set(withSequence(T(0.93, 160, out), S(1, jiggle)));
        pump.set(withDelay(220, withSequence(T(1.06, 220, out), T(1, 300), T(1.06, 220, out), S(1.03, soft))));
        lF.set(withDelay(220, withSequence(back(L[1] + 14, L[1] - 4, 260, 4), S(L[1]))));
        rF.set(withDelay(220, withSequence(back(R[1] + 14, R[1] - 4, 260, 4), S(R[1]))));
        headRot.set(withDelay(900, S(-5)));
        break;
      }
      case 'lift': {
        rF.set(withDelay(250, withSequence(back(-140, -20, 600, 4), S(R[1]))));
        sq.set(withDelay(250, withSequence(back(0.97, 1.01, 600, 4), S(1))));
        headY.set(withDelay(250, withSequence(back(1, -1, 600, 4), S(0))));
        break;
      }
      case 'oops': {
        const h = hop(7);
        jump.set(withSequence(...h.jump));
        tilt.set(withSequence(T(-12, 150), T(9, 190), T(-5, 180), S(0, jiggle)));
        hat.set(withSequence(T(-22, 170), S(-6, jiggle)));
        lU.set(withSequence(T(150, 140, out), T(105, 180), S(L[0])));
        rU.set(withSequence(T(30, 140, out), T(80, 180), S(R[0])));
        break;
      }
      case 'proud': {
        pump.set(S(1.04, soft));
        headY.set(S(-3));
        // Chin up, then one slow nod.
        headRot.set(withSequence(S(-7), withDelay(500, T(-1, 220)), T(-7, 300)));
        tail.set(withRepeat(withSequence(T(-6, 900), T(10, 900)), -1));
        break;
      }
      case 'wait': {
        // Look one way, then the other, tapping the tail.
        headRot.set(withSequence(T(-8, 500), withDelay(500, T(8, 700)), withDelay(500, S(0, soft))));
        tail.set(withSequence(back(-6, 10, 240, 6), lazyTail));
        sq.set(withSequence(back(0.98, 1, 240, 6), S(1)));
        break;
      }
      case 'alarm': {
        // Time's up: a cheerful wave and a little bounce to get your attention, without the panic.
        jump.set(withRepeat(withSequence(T(-5, 260, out), T(0, 300, fall)), -1));
        rU.set(withDelay(150, back(160, 130, 420, -1)));
        rF.set(withDelay(150, back(10, 35, 420, -1)));
        headRot.set(back(-3, 3, 560, -1));
        tail.set(back(-10, 14, 420, -1));
        break;
      }
      case 'nod': {
        // Two nods: the head dips, the body gives a little.
        headY.set(withSequence(T(4, 160, out), T(-1, 180), T(4, 160, out), S(0)));
        headRot.set(withSequence(T(-3, 160), T(2, 180), T(-3, 160), S(0)));
        sq.set(withSequence(T(0.97, 160), T(1.01, 180), T(0.97, 160), S(1, jiggle)));
        tail.set(happyTail(2));
        break;
      }
      case 'point': {
        // Wind up, reach out toward the bubble, two little jabs.
        rU.set(withSequence(T(R[0] - 30, 140, out), S(R[0])));
        rF.set(withDelay(450, withSequence(T(R[1] + 14, 130), T(R[1], 150), T(R[1] + 14, 130), S(R[1]))));
        headRot.set(S(-4));
        tilt.set(withSequence(T(-1.5, 140), S(2)));
        break;
      }
      case 'drink': {
        // Bottle up, head back, three gulps, "ahh".
        headRot.set(withDelay(250, withSequence(T(-11, 400), withDelay(1300, S(0, soft)))));
        tilt.set(withDelay(250, withSequence(T(-3, 400), withDelay(1300, S(0, soft)))));
        headY.set(withDelay(650, withSequence(back(-1.5, 0.6, 170, 6), S(0))));
        sq.set(withDelay(2000, withSequence(T(1.03, 260, out), S(1, jiggle))));
        break;
      }
      case 'shrug': {
        // Shoulders up, head into them, palms out, tilt.
        sq.set(withSequence(T(1.04, 170, out), withDelay(500, S(1, jiggle))));
        headY.set(withSequence(T(3, 170, out), withDelay(500, S(0))));
        headRot.set(withSequence(T(8, 220), withDelay(700, S(3, soft))));
        lU.set(withSequence(T(L[0] + 16, 170, out), withDelay(500, S(L[0]))));
        rU.set(withSequence(T(R[0] + 16, 170, out), withDelay(500, S(R[0]))));
        break;
      }
    }
  }, [activeMood, playId, resting, reduceMotion, jump, tilt, sq, pump, headRot, headY, hat, tail, lU, lF, rU, rF]);

  /* ---------- talking mouth ---------- */
  useEffect(() => {
    if (talking && !reduceMotion) {
      mouth.set(withRepeat(withSequence(T(1, 110), T(0.15, 120)), -1, true));
      bob.set(withRepeat(withSequence(T(-1.2, 240), T(0.4, 240)), -1, true));
    } else {
      mouth.set(T(0, 140));
      bob.set(S(0, soft));
    }
  }, [talking, reduceMotion, mouth, bob]);

  /* ---------- animated styles ---------- */
  const [fx_, fy] = art.pivots.feet;
  const rootStyle = useAnimatedStyle(() => {
    const k = sq.get();
    const b = breath.get();
    return {
      transform: [
        { translateY: jump.get() },
        { rotate: `${tilt.get()}deg` },
        { scaleX: (1 + (1 - k) * 0.6) * (1 - (b - 1) * 0.25) * pump.get() },
        { scaleY: k * b * pump.get() },
      ],
    };
  });
  const shadowStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: (1 + jump.get() / 60) * (1 + (1 - sq.get()) * 0.6) }], opacity: 1 + jump.get() / 40 }));
  const tailStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tail.get()}deg` }] }));
  const headScale = art.headScale;
  const headStyle = useAnimatedStyle(() => ({ transform: [{ translateY: headY.get() + bob.get() }, { rotate: `${headRot.get()}deg` }, { scale: headScale }] }));
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
  const talkMouth = activeMood === 'eat' && !resting ? 'chew' : spec.mouth === 'smile' ? 'smile' : 'open';
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
        addPet();
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
  // Two passes with the same joints: all outlines first, then all fills on top, so the elbow,
  // wristband and paw join without lines between them (see `upperArm` in art.tsx).
  const pass = (p: Pass) => (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin(shoulder[0], shoulder[1]) }, upperStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin(elbow[0], elbow[1]) }, foreStyle]}>
        <Art>
          {flip(art.foreArm(p))}
          {p === 'fill' && prop && prop !== 'none' && flip(art.prop(prop as never))}
        </Art>
      </Animated.View>
      <Art>{flip(art.upperArm(p))}</Art>
    </Animated.View>
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pass('outline')}
      {pass('fill')}
    </View>
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
      return (
        <>
          {[0, 0.5].map((ph) => (
            <Particle key={ph} k={k} clock={clock} phase={ph} from={[hx, cy]} to={[hx, cy]} pop>
              <Path d={`M${hx - a} ${cy - 12} Q ${hx - a - 8} ${cy} ${hx - a} ${cy + 12} M${hx + a} ${cy - 12} Q ${hx + a + 8} ${cy} ${hx + a} ${cy + 12}`} stroke="#F2C14E" strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.85} />
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
