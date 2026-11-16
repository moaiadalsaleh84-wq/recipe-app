/**
 * Biscuit as a layered puppet. Each part (tail, body, arms, head, ears, eyes, pupils, eyelids,
 * mouth, hat) is its own layer and moves around a real joint, driven by Reanimated springs.
 *
 * - Always: breathing, blinking at random, tail sway.
 * - A mood plays once as a short act (anticipation, squash and stretch, overshoot, settle),
 *   then Biscuit relaxes: glances around, twitches an ear, flicks its tail.
 * - The pupils follow your finger for a moment after each touch (see look.tsx).
 * - With Reduce Motion on, poses change with a simple fade-like ease and nothing bounces.
 *
 * This file is one "renderer" for the mascot. The app only uses <Mascot> (Mascot.tsx).
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import * as art from './art';
import { FOLLOW_MS, useLook } from './look';
import { actMs, moodSpecs, restSpec, sustained, type Fx, type Mood } from './moods';

export type RigProps = {
  mood: Mood;
  talking: boolean;
  size: number;
  /** Change this to play the same mood again. */
  playKey: string;
  /** Keep the mood's pose instead of relaxing afterwards (for still images). */
  hold: boolean;
};

const origin = (p: readonly [number, number] | readonly number[]) => `${p[0] / 2}% ${p[1] / 2}%`;
const mirrored = (p: readonly number[]) => [200 - p[0], p[1]] as const;

/** Arms and head: quick, with a small overshoot. */
const snap = { damping: 13, stiffness: 190, mass: 0.7 };
/** Relaxing back to rest. */
const soft = { damping: 20, stiffness: 75, mass: 1 };
/** Landing from a hop. */
const jiggle = { damping: 8, stiffness: 240, mass: 0.6 };
/** Eyes turning. */
const glance = { damping: 18, stiffness: 160, mass: 0.6 };
const sine = Easing.inOut(Easing.sin);
const out = Easing.out(Easing.cubic);
const fall = Easing.in(Easing.quad);
const HOLD_MS = 1300;

const T = (v: number, ms: number, easing = sine) => withTiming(v, { duration: ms, easing });
const S = (v: number, config: object = snap) => withSpring(v, config);
const back = (a: number, b: number, ms: number, times: number) => withRepeat(withSequence(T(a, ms), T(b, ms)), times);

/** Hops: crouch, stretch up, fall, squash on landing, jiggle. */
function hops(h: number, n: number, gap = 70) {
  const jump = [];
  const sq = [];
  for (let i = 0; i < n; i++) {
    const height = h * (i === n - 1 && n > 1 ? 0.75 : 1);
    jump.push(T(0, 110), T(-height, 230, out), T(0, 200, fall), T(0, 150 + gap));
    sq.push(T(0.88, 110, out), T(1.09, 120, out), T(1, 110), T(1.04, 200), T(0.86, 70, out), S(1, jiggle), T(1, gap));
  }
  return { jump: withSequence(...jump), sq: withSequence(...sq) };
}

function Layer({ children }: { children: React.ReactNode }) {
  return (
    <Svg viewBox="0 0 200 200" width="100%" height="100%">
      {children}
    </Svg>
  );
}

export function BiscuitRig({ mood, talking, size, playKey, hold }: RigProps) {
  const reduceMotion = useReducedMotion();

  // Act, then rest: once the line is done (and its act has played), relax.
  const playId = `${mood}|${playKey}`;
  const [restedId, setRestedId] = useState<string | null>(null);
  const keeps = hold || !!sustained[mood];
  const resting = !keeps && restedId === playId;
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, [playId]);
  useEffect(() => {
    if (keeps || talking) return;
    const left = Math.max(0, startedAt.current + actMs[mood] - Date.now());
    const id = setTimeout(() => setRestedId(playId), left + HOLD_MS);
    return () => clearTimeout(id);
  }, [playId, talking, keeps, mood]);

  const spec = resting ? restSpec : moodSpecs[mood];
  const lineEyes = spec.eyes === 'smile' || spec.eyes === 'squeeze';

  // Whole body (turns at the feet)
  const jump = useSharedValue(0);
  const tilt = useSharedValue(0);
  const sq = useSharedValue(1); // squash (<1) and stretch (>1)
  const breath = useSharedValue(1);
  const puff = useSharedValue(1); // chest out
  // Parts
  const headRot = useSharedValue(0);
  const headY = useSharedValue(0);
  const bob = useSharedValue(0); // head bob while talking
  const tail = useSharedValue(0);
  const earL = useSharedValue(0);
  const earR = useSharedValue(0);
  const lid = useSharedValue(spec.lid ?? 0); // mood eyelids, 0 open to 1 closed
  const blink = useSharedValue(0); // blinks, added on top
  const lookX = useSharedValue(spec.look?.[0] ?? 0);
  const lookY = useSharedValue(spec.look?.[1] ?? 0);
  const mouthOpen = useSharedValue(0);
  const hat = useSharedValue(0);
  const armL = useSharedValue(spec.armL);
  const armR = useSharedValue(spec.armR);
  const clock = useSharedValue(0); // effects, 0 to 1, looping

  /* ---------- always: breathing, blinking ---------- */
  useEffect(() => {
    if (reduceMotion) return;
    breath.set(withRepeat(T(1.03, 1700), -1, true));
    clock.set(withRepeat(withTiming(1, { duration: 1700, easing: Easing.linear }), -1));
    let id: ReturnType<typeof setTimeout>;
    const next = () => {
      id = setTimeout(() => {
        const close = withSequence(T(1, 70, fall), T(0, 130, out));
        blink.set(Math.random() < 0.25 ? withSequence(close, T(0, 90), close) : close);
        next();
      }, 2000 + Math.random() * 3000);
    };
    next();
    return () => clearTimeout(id);
  }, [reduceMotion, breath, blink, clock]);

  /* ---------- the act (or the rest) ---------- */
  useEffect(() => {
    const s = resting ? restSpec : moodSpecs[mood];
    const look = s.look ?? [0, 0];
    if (reduceMotion) {
      armL.set(T(s.armL, 220));
      armR.set(T(s.armR, 220));
      lid.set(T(s.lid ?? 0, 220));
      lookX.set(T(look[0], 220));
      lookY.set(T(look[1], 220));
      return;
    }
    // Defaults: into the pose, body back to neutral. Each act below overrides what it moves.
    const cfg = resting ? soft : snap;
    armL.set(S(s.armL, cfg));
    armR.set(S(s.armR, cfg));
    jump.set(S(0, cfg));
    tilt.set(S(0, cfg));
    sq.set(S(1, cfg));
    puff.set(S(1, cfg));
    headRot.set(S(0, cfg));
    headY.set(S(0, cfg));
    hat.set(S(0, cfg));
    earL.set(S(0, cfg));
    earR.set(S(0, cfg));
    lid.set(S(s.lid ?? 0, soft));
    lookX.set(S(look[0], glance));
    lookY.set(S(look[1], glance));
    const lazyTail = withRepeat(withSequence(T(-8, 1300), T(10, 1300)), -1);
    const wag = (times: number) => withSequence(back(-18, 22, 160, times), lazyTail);
    tail.set(lazyTail);

    if (resting || mood === 'idle') {
      // Relaxed: every few seconds a little something.
      let id: ReturnType<typeof setTimeout>;
      const fidget = () => {
        id = setTimeout(() => {
          const pick = Math.floor(Math.random() * 5);
          const side = Math.random() < 0.5 ? -1 : 1;
          if (pick === 0) {
            // Ear twitch
            (side < 0 ? earL : earR).set(withSequence(T(-14, 70, out), S(0, jiggle), T(-9, 70, out), S(0, jiggle)));
          } else if (pick === 1) {
            // Glance to one side, then back
            lookX.set(withSequence(S(0.9 * side, glance), withDelay(900, S(0, glance))));
            headRot.set(withSequence(T(3 * side, 500), withDelay(700, T(0, 600))));
          } else if (pick === 2) {
            tail.set(withSequence(T(24, 220, out), T(-8, 650), lazyTail));
          } else if (pick === 3) {
            // Look around: one way, then the other
            lookX.set(withSequence(S(-0.9, glance), withDelay(700, S(0.9, glance)), withDelay(700, S(0, glance))));
          } else {
            // A small stretch
            sq.set(withSequence(T(1.04, 700), T(1, 900)));
            headY.set(withSequence(T(-2, 700), T(0, 900)));
          }
          fidget();
        }, 2600 + Math.random() * 3200);
      };
      fidget();
      return () => clearTimeout(id);
    }

    switch (mood) {
      case 'happy': {
        const h = hops(13, 2);
        jump.set(h.jump);
        sq.set(h.sq);
        headRot.set(withSequence(T(-5, 300), T(5, 400), S(0)));
        tail.set(wag(6));
        break;
      }
      case 'excited': {
        // Wind up, then quick little bounces with shaking paws.
        sq.set(withSequence(T(0.86, 150, out), S(1.06, jiggle), withRepeat(withSequence(T(0.95, 110), T(1.05, 110)), 5), S(1, jiggle)));
        jump.set(withDelay(150, withSequence(withRepeat(withSequence(T(-8, 110, out), T(0, 110, fall)), 5), S(0))));
        armL.set(withDelay(150, withSequence(back(140, 112, 110, 5), S(s.armL))));
        armR.set(withDelay(150, withSequence(back(112, 140, 110, 5), S(s.armR))));
        earL.set(withSequence(T(-10, 120), S(0, jiggle)));
        earR.set(withSequence(T(-10, 120), S(0, jiggle)));
        tail.set(wag(8));
        break;
      }
      case 'cheering': {
        const h = hops(22, 3);
        jump.set(h.jump);
        sq.set(h.sq);
        armL.set(withDelay(120, withSequence(back(172, 140, 170, 6), S(s.armL))));
        armR.set(withDelay(120, withSequence(back(140, 172, 170, 6), S(s.armR))));
        headRot.set(withSequence(back(-4, 4, 300, 3), S(0)));
        tail.set(wag(10));
        break;
      }
      case 'thinking': {
        headRot.set(S(8));
        headY.set(S(-1));
        // The paw taps the chin.
        armR.set(withDelay(380, withSequence(back(s.armR + 9, s.armR - 3, 180, 6), S(s.armR))));
        earR.set(withDelay(900, withSequence(T(-12, 70, out), S(0, jiggle))));
        tail.set(withRepeat(withSequence(T(-4, 1500), T(7, 1500)), -1));
        break;
      }
      case 'worried': {
        // Shrink back, tuck the tail, ears down.
        tilt.set(S(4, soft));
        sq.set(withSequence(T(0.93, 160, out), S(0.97, soft)));
        headRot.set(withSequence(S(-6), withDelay(700, T(-3, 600))));
        earL.set(S(16, soft));
        earR.set(S(16, soft));
        tail.set(withSequence(T(-14, 400), withRepeat(withSequence(T(-12, 700), T(-6, 700)), -1)));
        break;
      }
      case 'sleepy': {
        headRot.set(S(10, soft));
        // Nods off, catches itself.
        headY.set(withSequence(S(4, soft), withRepeat(withSequence(T(7, 1900), T(3, 1900)), -1)));
        lid.set(withSequence(S(0.72, soft), withRepeat(withSequence(T(1, 1900), T(0.7, 1900)), -1)));
        earL.set(S(10, soft));
        earR.set(S(10, soft));
        tail.set(withRepeat(withSequence(T(-3, 2300), T(3, 2300)), -1));
        break;
      }
      case 'proud': {
        sq.set(withSequence(T(0.94, 150, out), S(1, jiggle)));
        puff.set(withDelay(150, S(1.06, snap)));
        headY.set(withDelay(150, S(-3)));
        // Chin up, then one slow nod.
        headRot.set(withSequence(withDelay(150, S(-7)), withDelay(450, T(-1, 220)), T(-7, 300)));
        tail.set(withRepeat(withSequence(T(-6, 900), T(12, 900)), -1));
        break;
      }
      case 'oops': {
        const h = hops(7, 1);
        jump.set(h.jump);
        tilt.set(withSequence(T(-12, 150), T(9, 190), T(-5, 180), S(0, jiggle)));
        hat.set(withSequence(T(-24, 170), S(-10, jiggle)));
        armL.set(withSequence(T(150, 140, out), T(80, 180), S(s.armL)));
        armR.set(withSequence(T(30, 140, out), T(95, 180), S(s.armR)));
        earL.set(withSequence(T(14, 150), S(6, soft)));
        earR.set(withSequence(T(14, 150), S(6, soft)));
        break;
      }
      case 'love': {
        sq.set(withSequence(T(0.92, 220, out), S(1, soft)));
        tilt.set(withSequence(back(-4, 4, 520, 2), S(0, soft)));
        headRot.set(withSequence(back(6, -6, 520, 2), S(3, soft)));
        tail.set(withSequence(back(-14, 20, 400, 3), lazyTail));
        break;
      }
      case 'wave': {
        sq.set(withSequence(T(0.94, 120, out), S(1, jiggle)));
        headRot.set(S(-6));
        armR.set(withSequence(S(s.armR), back(s.armR + 22, s.armR - 16, 180, 5), S(s.armR)));
        tail.set(wag(4));
        break;
      }
      case 'hop': {
        const h = hops(24, 1);
        jump.set(h.jump);
        sq.set(h.sq);
        armL.set(withSequence(T(20, 110), S(150, snap), withDelay(380, S(s.armL))));
        armR.set(withSequence(T(20, 110), S(150, snap), withDelay(380, S(s.armR))));
        tail.set(wag(6));
        break;
      }
      case 'watch': {
        // Looks up at the timer, leans in, tail tapping.
        headRot.set(S(-4));
        headY.set(S(-3));
        sq.set(withSequence(T(1.04, 300, out), S(1.02, soft)));
        earL.set(withDelay(500, withSequence(T(-12, 70, out), S(0, jiggle))));
        tail.set(withSequence(back(-6, 12, 240, 6), lazyTail));
        break;
      }
      case 'hide': {
        // Ducks and scrunches up, ears flat, tail tucked; then relaxes a little.
        sq.set(withSequence(T(0.86, 160, out), S(0.93, soft)));
        headY.set(withSequence(S(11, snap), withDelay(1300, S(6, soft))));
        tilt.set(withSequence(T(-3, 120), T(3, 140), S(0, jiggle)));
        earL.set(S(20, soft));
        earR.set(S(20, soft));
        tail.set(withSequence(T(-14, 300), withRepeat(withSequence(T(-12, 600), T(-7, 600)), -1)));
        break;
      }
      case 'alarm': {
        // Time's up: a cheerful wave and a little bounce, without the panic.
        jump.set(withRepeat(withSequence(T(-6, 260, out), T(0, 300, fall)), -1));
        sq.set(withRepeat(withSequence(T(1.04, 260), T(0.96, 300)), -1));
        armR.set(withDelay(150, back(165, 132, 380, -1)));
        headRot.set(back(-4, 4, 560, -1));
        tail.set(back(-12, 16, 380, -1));
        break;
      }
    }
  }, [mood, playId, resting, reduceMotion, jump, tilt, sq, puff, headRot, headY, hat, tail, earL, earR, lid, lookX, lookY, armL, armR]);

  /* ---------- talking mouth ---------- */
  useEffect(() => {
    if (talking && !reduceMotion) {
      mouthOpen.set(withRepeat(withSequence(T(1, 110), T(0.1, 130)), -1, true));
      bob.set(withRepeat(withSequence(T(-1.4, 240), T(0.5, 240)), -1, true));
    } else {
      mouthOpen.set(T(0, 140));
      bob.set(S(0, soft));
    }
  }, [talking, reduceMotion, mouthOpen, bob]);

  /* ---------- eyes follow the last touch ---------- */
  const look = useLook();
  const self = useAnimatedRef<Animated.View>();
  const fallback = useSharedValue(0);
  const touchX = look?.x ?? fallback;
  const touchY = look?.y ?? fallback;
  const touchAt = look?.at ?? fallback;
  const follow = useDerivedValue(() => {
    clock.get(); // re-check every frame, so following ends on time
    const following = !lineEyes && touchAt.get() > 0 && Date.now() - touchAt.get() < FOLLOW_MS;
    if (!following) return withSpring(0, glance);
    return withSpring(1, glance);
  });
  const pupilStyle = useAnimatedStyle(() => {
    let x = lookX.get();
    let y = lookY.get();
    const f = follow.get();
    if (f > 0.01) {
      const box = measure(self);
      if (box) {
        const dx = (touchX.get() - (box.pageX + box.width / 2)) / 150;
        const dy = (touchY.get() - (box.pageY + box.height * 0.4)) / 150;
        const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        x += (dx / len - x) * f;
        y += (dy / len - y) * f;
      }
    }
    const k = size / 200;
    return { transform: [{ translateX: x * 4.2 * k }, { translateY: y * 4.5 * k }] };
  });

  /* ---------- animated styles ---------- */
  const rootStyle = useAnimatedStyle(() => {
    const k = sq.get();
    const b = breath.get();
    return {
      transform: [
        { translateY: (jump.get() * size) / 200 },
        { rotate: `${tilt.get()}deg` },
        { scaleX: (1 + (1 - k) * 0.6) * (1 - (b - 1) * 0.3) * puff.get() },
        { scaleY: k * b * puff.get() },
      ],
    };
  });
  const shadowStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: (1 + jump.get() / 60) * (1 + (1 - sq.get()) * 0.6) }], opacity: 1 + jump.get() / 40 }));
  const tailStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tail.get()}deg` }] }));
  const headStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ((headY.get() + bob.get()) * size) / 200 }, { rotate: `${headRot.get()}deg` }] }));
  const earLStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-earL.get()}deg` }] }));
  const earRStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${earR.get()}deg` }] }));
  const lidStyle = useAnimatedStyle(() => {
    const v = Math.min(1, lid.get() + blink.get());
    // Fully open lids are hidden outright: a layer scaled to zero can still leave a sliver.
    return { opacity: v > 0.02 ? 1 : 0, transform: [{ scaleY: Math.max(0.02, v) }] };
  });
  const closedStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (lid.get() + blink.get() - 0.8) * 5)) }));
  const mouthClosed = useAnimatedStyle(() => ({ opacity: 1 - mouthOpen.get() }));
  const mouthTalk = useAnimatedStyle(() => ({ opacity: mouthOpen.get() }));
  const hatStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${hat.get()}deg` }] }));
  const armLStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${armL.get()}deg` }] }));
  const armRStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-armR.get()}deg` }] }));

  const fill = StyleSheet.absoluteFill;
  // While talking the mouth swaps with a second shape: open mouths close a little, closed ones open.
  const talkMouth = spec.mouth === 'open' ? 'small' : 'open';
  const lidTop = [art.pivots.eyeL[0], 59] as const;

  return (
    <Animated.View ref={self} style={{ width: size, height: size }} pointerEvents="none">
      <Animated.View style={[fill, { transformOrigin: origin(art.pivots.feet) }, shadowStyle]}>
        <Layer>{art.groundShadow}</Layer>
      </Animated.View>

      <Animated.View style={[fill, { transformOrigin: origin(art.pivots.feet) }, rootStyle]}>
        <Animated.View style={[fill, { transformOrigin: origin(art.pivots.tail) }, tailStyle]}>
          <Layer>{art.tail}</Layer>
        </Animated.View>
        <View style={fill}>
          <Layer>{art.body}</Layer>
        </View>

        {/* head: ears behind, then the face, then the hat */}
        <Animated.View style={[fill, { transformOrigin: origin(art.pivots.neck) }, headStyle]}>
          <Animated.View style={[fill, { transformOrigin: origin(art.pivots.earL) }, earLStyle]}>
            <Layer>{art.earL}</Layer>
          </Animated.View>
          <Animated.View style={[fill, { transformOrigin: origin(mirrored(art.pivots.earL)) }, earRStyle]}>
            <Layer>{art.earR}</Layer>
          </Animated.View>
          <View style={fill}>
            <Layer>
              {art.head}
              {art.cheeks}
              {spec.brows && art.brows}
              {lineEyes ? art.lineEyes(spec.eyes) : art.eyeWhites}
            </Layer>
          </View>
          {!lineEyes && (
            <>
              <Animated.View style={[fill, pupilStyle]}>
                <Layer>{art.pupils(spec.eyes === 'wide')}</Layer>
              </Animated.View>
              <Animated.View style={[fill, { transformOrigin: origin(lidTop) }, lidStyle]}>
                <Layer>{art.lidL}</Layer>
              </Animated.View>
              <Animated.View style={[fill, { transformOrigin: origin(mirrored(lidTop)) }, lidStyle]}>
                <Layer>{art.lidR}</Layer>
              </Animated.View>
              <Animated.View style={[fill, closedStyle]}>
                <Layer>{art.closedEyes}</Layer>
              </Animated.View>
            </>
          )}
          <View style={fill}>
            <Layer>{art.nose}</Layer>
          </View>
          <Animated.View style={[fill, mouthClosed]}>
            <Layer>{art.mouth(spec.mouth)}</Layer>
          </Animated.View>
          <Animated.View style={[fill, mouthTalk]}>
            <Layer>{art.mouth(talkMouth)}</Layer>
          </Animated.View>
          <Animated.View style={[fill, { transformOrigin: origin(art.pivots.hat) }, hatStyle]}>
            <Layer>{art.hat}</Layer>
          </Animated.View>
        </Animated.View>

        {/* arms in front of the head, so a paw can reach the chin */}
        <Animated.View style={[fill, { transformOrigin: origin(art.pivots.shoulderL) }, armLStyle]}>
          <Layer>{art.armL}</Layer>
        </Animated.View>
        <Animated.View style={[fill, { transformOrigin: origin(mirrored(art.pivots.shoulderL)) }, armRStyle]}>
          <Layer>{art.armR}</Layer>
        </Animated.View>
        {/* the scarf sits over the shoulders, so the arms come out from under it */}
        <View style={fill}>
          <Layer>{art.scarf}</Layer>
        </View>
      </Animated.View>

      {spec.fx.map((e) => (
        <Effect key={e} kind={e} clock={clock} k={size / 200} />
      ))}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Little effects around the head, all driven by one looping clock     */
/* ------------------------------------------------------------------ */

function Particle({ clock, phase, from, to, children, pop = false, k }: {
  k: number; // pixels per grid unit
  clock: SharedValue<number>;
  phase: number;
  from: readonly [number, number];
  to: readonly [number, number];
  children: React.ReactNode;
  /** Grow and shrink in place instead of drifting and fading. */
  pop?: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const p = (clock.get() + phase) % 1;
    return {
      opacity: pop ? 1 : Math.min(1, (1 - p) * 2.2) * Math.min(1, p * 6),
      transform: [{ translateX: (to[0] - from[0]) * p * k }, { translateY: (to[1] - from[1]) * p * k }, { scale: pop ? Math.sin(p * Math.PI) : 0.7 + p * 0.5 }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: origin(from) }, style]}>
      <Layer>{children}</Layer>
    </Animated.View>
  );
}

function Effect({ kind, clock, k }: { kind: Fx; clock: SharedValue<number>; k: number }) {
  const p = { clock, k };
  switch (kind) {
    case 'hearts':
      return (
        <>
          {([[52, 34, 0, -12], [150, 28, 0.5, 12], [100, 12, 0.25, 0]] as const).map(([x, y, ph, dx]) => (
            <Particle key={ph} {...p} phase={ph} from={[x, y]} to={[x + dx, y - 26]}>
              <Path d={`M${x} ${y + 8} C ${x - 12} ${y - 1}, ${x - 7} ${y - 12}, ${x} ${y - 4} C ${x + 7} ${y - 12}, ${x + 12} ${y - 1}, ${x} ${y + 8} Z`} fill="#FF5C7A" />
            </Particle>
          ))}
        </>
      );
    case 'sparkle':
      return (
        <>
          {([[30, 54, 0, 9], [172, 70, 0.33, 8], [160, 22, 0.66, 10]] as const).map(([x, y, ph, r]) => (
            <Particle key={ph} {...p} phase={ph} from={[x, y]} to={[x, y]} pop>
              <Path d={`M${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`} fill="#FFC933" />
            </Particle>
          ))}
        </>
      );
    case 'zzz':
      return (
        <>
          {[0, 0.33, 0.66].map((ph, i) => (
            <Particle key={ph} {...p} phase={ph} from={[150, 44]} to={[178, 10]}>
              <SvgText x={150} y={44} fontSize={15 + i * 3} fontWeight="bold" fill="#7A5C8E">
                Z
              </SvgText>
            </Particle>
          ))}
        </>
      );
    case 'sweat':
      return (
        <Particle {...p} phase={0} from={[158, 50]} to={[162, 70]}>
          <Path d="M158 40 Q 166 51 158 55 Q 150 51 158 40 Z" fill="#8CCBF2" />
        </Particle>
      );
    case 'dots':
      return (
        <>
          {[0, 1, 2].map((i) => (
            <Particle key={i} {...p} phase={i * 0.2} from={[150 + i * 13, 26]} to={[150 + i * 13, 26]} pop>
              <Circle cx={150 + i * 13} cy={26} r={5} fill="#A08A7B" />
            </Particle>
          ))}
        </>
      );
    case 'ring':
      return (
        <>
          {[0, 0.5].map((ph) => (
            <Particle key={ph} {...p} phase={ph} from={[100, 80]} to={[100, 80]} pop>
              <Path d="M30 62 Q 20 80 30 98 M170 62 Q 180 80 170 98" stroke="#FFC933" strokeWidth={5} fill="none" strokeLinecap="round" />
            </Particle>
          ))}
        </>
      );
    default:
      return null;
  }
}
