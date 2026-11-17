/**
 * Biscuit as a layered puppet. Each part (tail, body, scarf, head, ears, eyes, pupils, eyelids,
 * brows, mouth, cheeks, hat, each arm, paws, props) is its own layer and moves around a real joint,
 * driven by Reanimated springs.
 *
 * - Always: breathing, blinking at random, tail sway.
 * - A mood plays as a short act (anticipation, squash and stretch, overshoot, settle), then Biscuit
 *   relaxes: glances around, twitches an ear, flicks its tail. Busy moods (cooking, chopping,
 *   eating, hungry, sleepy, alarm) keep going.
 * - The eyes follow your finger for a moment after each touch (see look.tsx).
 * - With Reduce Motion on, poses change with a short ease and nothing bounces.
 *
 * This file is one "renderer" for the mascot. The app only uses <Mascot> (Mascot.tsx).
 */
import { useEffect, useId, useRef, useState } from 'react';
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
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
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
  // Clip-path ids must be unique on the page when several Biscuits are showing.
  const uid = `b${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

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
  const canGlance = art.glances(spec.eyes);

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
  const blink = useSharedValue(0);
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
    const aL = s.akimbo ? 0 : s.armL;
    const aR = s.akimbo ? 0 : s.armR;
    if (reduceMotion) {
      armL.set(T(aL, 220));
      armR.set(T(aR, 220));
      lookX.set(T(look[0], 220));
      lookY.set(T(look[1], 220));
      return;
    }
    // Defaults: into the pose, body back to neutral. Each act below overrides what it moves.
    const cfg = resting ? soft : snap;
    armL.set(S(aL, cfg));
    armR.set(S(aR, cfg));
    jump.set(S(0, cfg));
    tilt.set(S(0, cfg));
    sq.set(S(1, cfg));
    puff.set(S(1, cfg));
    headRot.set(S(0, cfg));
    headY.set(S(0, cfg));
    hat.set(S(0, cfg));
    earL.set(S(0, cfg));
    earR.set(S(0, cfg));
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
            (side < 0 ? earL : earR).set(withSequence(T(-14, 70, out), S(0, jiggle), T(-9, 70, out), S(0, jiggle)));
          } else if (pick === 1) {
            lookX.set(withSequence(S(0.9 * side, glance), withDelay(900, S(0, glance))));
            headRot.set(withSequence(T(3 * side, 500), withDelay(700, T(0, 600))));
          } else if (pick === 2) {
            tail.set(withSequence(T(24, 220, out), T(-8, 650), lazyTail));
          } else if (pick === 3) {
            lookX.set(withSequence(S(-0.9, glance), withDelay(700, S(0.9, glance)), withDelay(700, S(0, glance))));
          } else {
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
        sq.set(withSequence(T(0.86, 150, out), S(1.06, jiggle), withRepeat(withSequence(T(0.95, 110), T(1.05, 110)), 5), S(1, jiggle)));
        jump.set(withDelay(150, withSequence(withRepeat(withSequence(T(-8, 110, out), T(0, 110, fall)), 5), S(0))));
        armL.set(withDelay(150, withSequence(back(aL + 12, aL - 14, 110, 5), S(aL))));
        armR.set(withDelay(150, withSequence(back(aR - 14, aR + 12, 110, 5), S(aR))));
        earL.set(withSequence(T(-10, 120), S(0, jiggle)));
        earR.set(withSequence(T(-10, 120), S(0, jiggle)));
        tail.set(wag(8));
        break;
      }
      case 'love': {
        sq.set(withSequence(T(0.92, 220, out), S(1, soft)));
        tilt.set(withSequence(back(-4, 4, 520, 2), S(0, soft)));
        headRot.set(withSequence(back(6, -6, 520, 2), S(3, soft)));
        tail.set(withSequence(back(-14, 20, 400, 3), lazyTail));
        break;
      }
      case 'thinking': {
        headRot.set(S(8));
        headY.set(S(-1));
        armR.set(withDelay(380, withSequence(back(aR + 8, aR - 3, 180, 6), S(aR))));
        earR.set(withDelay(900, withSequence(T(-12, 70, out), S(0, jiggle))));
        tail.set(withRepeat(withSequence(T(-4, 1500), T(7, 1500)), -1));
        break;
      }
      case 'hungry': {
        // Leans in toward the bowl, little bobs, tail going.
        headY.set(S(3));
        headRot.set(withRepeat(withSequence(T(-3, 700), T(3, 700)), -1));
        sq.set(withSequence(T(0.94, 160, out), S(1, jiggle)));
        tail.set(withRepeat(withSequence(T(-16, 260), T(18, 260)), -1));
        break;
      }
      case 'eating': {
        // Chewing: the head bobs, the paws nibble.
        headY.set(withRepeat(withSequence(T(2.4, 150), T(-1, 150)), -1));
        armL.set(withRepeat(withSequence(T(aL - 6, 300), T(aL + 3, 300)), -1));
        armR.set(withRepeat(withSequence(T(aR + 3, 300), T(aR - 6, 300)), -1));
        tail.set(withRepeat(withSequence(T(-10, 600), T(14, 600)), -1));
        break;
      }
      case 'cooking': {
        // Stirring the pot round and round.
        armR.set(withRepeat(withSequence(T(aR + 18, 420), T(aR - 8, 420)), -1));
        tilt.set(withRepeat(withSequence(T(-2, 840), T(2, 840)), -1));
        headRot.set(withRepeat(withSequence(T(2, 840), T(-2, 840)), -1));
        break;
      }
      case 'chopping': {
        // Careful chops: up, down onto the board, a beat.
        armR.set(withRepeat(withSequence(T(aR + 16, 180, out), T(aR - 2, 120, fall), T(aR - 2, 260)), -1));
        headY.set(S(2));
        sq.set(withRepeat(withSequence(T(1, 300), T(0.985, 120), T(1, 140)), -1));
        break;
      }
      case 'worried': {
        tilt.set(S(4, soft));
        sq.set(withSequence(T(0.93, 160, out), S(0.97, soft)));
        headRot.set(withSequence(S(-6), withDelay(700, T(-3, 600))));
        earL.set(S(18, soft));
        earR.set(S(18, soft));
        tail.set(withSequence(T(-14, 400), withRepeat(withSequence(T(-12, 700), T(-6, 700)), -1)));
        break;
      }
      case 'shocked': {
        // Anticipation, then a jolt up with everything stretched.
        sq.set(withSequence(T(0.85, 90, out), T(1.12, 120, out), S(1, jiggle)));
        jump.set(withSequence(T(0, 90), T(-10, 120, out), S(0, jiggle)));
        earL.set(withSequence(T(-16, 100), S(-6, jiggle)));
        earR.set(withSequence(T(-16, 100), S(-6, jiggle)));
        tail.set(withSequence(T(30, 120, out), S(16, jiggle)));
        break;
      }
      case 'sleepy': {
        headRot.set(S(9, soft));
        headY.set(withSequence(S(4, soft), withRepeat(withSequence(T(7, 1900), T(3, 1900)), -1)));
        earL.set(S(10, soft));
        earR.set(S(10, soft));
        tail.set(withRepeat(withSequence(T(-3, 2300), T(3, 2300)), -1));
        break;
      }
      case 'proud': {
        sq.set(withSequence(T(0.94, 150, out), S(1, jiggle)));
        puff.set(withDelay(150, S(1.06, snap)));
        headY.set(withDelay(150, S(-3)));
        headRot.set(withSequence(withDelay(150, S(-7)), withDelay(450, T(-1, 220)), T(-7, 300)));
        tail.set(withRepeat(withSequence(T(-6, 900), T(12, 900)), -1));
        break;
      }
      case 'celebrating': {
        const h = hops(22, 3);
        jump.set(h.jump);
        sq.set(h.sq);
        armL.set(withDelay(120, withSequence(back(aL + 8, aL - 22, 170, 6), S(aL))));
        armR.set(withDelay(120, withSequence(back(aR - 22, aR + 8, 170, 6), S(aR))));
        headRot.set(withSequence(back(-4, 4, 300, 3), S(0)));
        tail.set(wag(10));
        break;
      }
      case 'oops': {
        const h = hops(7, 1);
        jump.set(h.jump);
        tilt.set(withSequence(T(-10, 150), T(8, 190), T(-4, 180), S(0, jiggle)));
        hat.set(withSequence(T(-20, 170), S(-9, jiggle)));
        armR.set(withSequence(S(aR), back(aR + 8, aR - 6, 150, 4), S(aR)));
        earL.set(withSequence(T(14, 150), S(6, soft)));
        earR.set(withSequence(T(14, 150), S(6, soft)));
        break;
      }
      case 'wave': {
        sq.set(withSequence(T(0.94, 120, out), S(1, jiggle)));
        headRot.set(S(-6));
        armR.set(withSequence(S(aR), back(aR + 22, aR - 16, 180, 5), S(aR)));
        tail.set(wag(4));
        break;
      }
      case 'watch': {
        headRot.set(S(-4));
        headY.set(S(-3));
        sq.set(withSequence(T(1.04, 300, out), S(1.02, soft)));
        earL.set(withDelay(500, withSequence(T(-12, 70, out), S(0, jiggle))));
        tail.set(withSequence(back(-6, 12, 240, 6), lazyTail));
        break;
      }
      case 'alarm': {
        jump.set(withRepeat(withSequence(T(-6, 260, out), T(0, 300, fall)), -1));
        sq.set(withRepeat(withSequence(T(1.04, 260), T(0.96, 300)), -1));
        armR.set(withDelay(150, back(aR + 15, aR - 18, 380, -1)));
        headRot.set(back(-4, 4, 560, -1));
        tail.set(back(-12, 16, 380, -1));
        break;
      }
    }
  }, [mood, playId, resting, reduceMotion, jump, tilt, sq, puff, headRot, headY, hat, tail, earL, earR, lookX, lookY, armL, armR]);

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
    const following = canGlance && touchAt.get() > 0 && Date.now() - touchAt.get() < FOLLOW_MS;
    return withSpring(following ? 1 : 0, glance);
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
    return { transform: [{ translateX: x * 3 * k }, { translateY: y * 3.2 * k }] };
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
    const v = blink.get();
    // Fully open lids are hidden outright: a layer scaled to zero can still leave a sliver.
    return { opacity: v > 0.02 ? 1 : 0, transform: [{ scaleY: Math.max(0.02, v) }] };
  });
  const closedStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (blink.get() - 0.8) * 5)) }));
  const mouthClosed = useAnimatedStyle(() => ({ opacity: 1 - mouthOpen.get() }));
  const mouthTalk = useAnimatedStyle(() => ({ opacity: mouthOpen.get() }));
  const hatStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${hat.get()}deg` }] }));
  const armLStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${armL.get()}deg` }] }));
  const armRStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-armR.get()}deg` }] }));

  const fill = StyleSheet.absoluteFill;
  // While talking the mouth swaps with a second shape: open mouths close a little, closed ones open.
  const talkMouth = spec.mouth === 'open' || spec.mouth === 'o' ? 'small' : 'open';
  const lidTop = [100, art.pivots.eyeTop] as const;

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
          <Layer>
            {art.body(uid)}
            {art.front(spec.prop)}
          </Layer>
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
              {art.head(uid, spec.puff)}
              {art.cheeks(spec.eyes === 'heart' || spec.puff)}
              {art.eyeFrame(spec.eyes)}
            </Layer>
          </View>
          {canGlance && (
            <>
              <Animated.View style={[fill, pupilStyle]}>
                <Layer>{art.pupils(spec.eyes)}</Layer>
              </Animated.View>
              {spec.eyes !== 'ring' && (
                <>
                  <Animated.View style={[fill, { transformOrigin: origin(lidTop) }, lidStyle]}>
                    <Layer>
                      {art.lidL}
                      {art.lidR}
                    </Layer>
                  </Animated.View>
                  <Animated.View style={[fill, closedStyle]}>
                    <Layer>{art.blinkLine}</Layer>
                  </Animated.View>
                </>
              )}
            </>
          )}
          <View style={fill}>
            <Layer>
              {art.brows(spec.brows)}
              {art.nose}
              {spec.fx.includes('flour') && art.flour}
            </Layer>
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

        {/* arms in front of the head, so a paw can reach the chin and the cheeks */}
        <Animated.View style={[fill, { transformOrigin: origin(art.pivots.shoulderL) }, armLStyle]}>
          <Layer>{spec.akimbo ? art.akimbo : art.arm(!!spec.palms)}</Layer>
        </Animated.View>
        <Animated.View style={[fill, { transformOrigin: origin(mirrored(art.pivots.shoulderL)) }, armRStyle]}>
          <Layer>
            {spec.akimbo ? art.akimboR : art.armR(!!spec.palms)}
            {art.heldR(spec.prop)}
          </Layer>
        </Animated.View>
        {/* the scarf sits over the shoulders, so the arms come out from under it */}
        <View style={fill}>
          <Layer>
            {art.scarf}
            {spec.prop === 'pot' && art.potFront}
            {spec.prop === 'cookie' && art.cookie}
          </Layer>
        </View>
      </Animated.View>

      {spec.fx
        .filter((e) => e !== 'flour')
        .map((e) => (
          <Effect key={e} kind={e} clock={clock} k={size / 200} />
        ))}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Little effects around Biscuit, all driven by one looping clock      */
/* ------------------------------------------------------------------ */

function Particle({ clock, phase, from, to, children, pop = false, spin = 0, k }: {
  k: number; // pixels per grid unit
  clock: SharedValue<number>;
  phase: number;
  from: readonly [number, number];
  to: readonly [number, number];
  children: React.ReactNode;
  /** Grow and shrink in place instead of drifting and fading. */
  pop?: boolean;
  spin?: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = (clock.get() + phase) % 1;
    return {
      opacity: pop ? 1 : Math.min(1, (1 - p) * 2.2) * Math.min(1, p * 6),
      transform: [{ translateX: (to[0] - from[0]) * p * k }, { translateY: (to[1] - from[1]) * p * k }, { rotate: `${spin * p}deg` }, { scale: pop ? Math.sin(p * Math.PI) : 0.7 + p * 0.5 }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: origin(from) }, style]}>
      <Layer>{children}</Layer>
    </Animated.View>
  );
}

const L = art.C.line;
function Effect({ kind, clock, k }: { kind: Fx; clock: SharedValue<number>; k: number }) {
  const p = { clock, k };
  switch (kind) {
    case 'hearts':
      return (
        <>
          {([[44, 40, 0, -12], [158, 34, 0.5, 12], [100, 10, 0.25, 0]] as const).map(([x, y, ph, dx]) => (
            <Particle key={ph} {...p} phase={ph} from={[x, y]} to={[x + dx, y - 24]}>
              <Path d={`M${x} ${y + 8} C ${x - 12} ${y - 1}, ${x - 7} ${y - 12}, ${x} ${y - 4} C ${x + 7} ${y - 12}, ${x + 12} ${y - 1}, ${x} ${y + 8} Z`} fill="#F0546B" stroke={L} strokeWidth={3} strokeLinejoin="round" />
            </Particle>
          ))}
        </>
      );
    case 'sparkle':
      return (
        <>
          {([[26, 60, 0, 9], [176, 74, 0.33, 8], [166, 22, 0.66, 10]] as const).map(([x, y, ph, r]) => (
            <Particle key={ph} {...p} phase={ph} from={[x, y]} to={[x, y]} pop>
              <Path d={`M${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`} fill="#FFC933" stroke={L} strokeWidth={2.5} strokeLinejoin="round" />
            </Particle>
          ))}
        </>
      );
    case 'zzz':
      return (
        <>
          {[0, 0.33, 0.66].map((ph, i) => (
            <Particle key={ph} {...p} phase={ph} from={[150, 40]} to={[178, 8]}>
              <SvgText x={150} y={40} fontSize={15 + i * 3} fontWeight="bold" fill="#7A5C8E" stroke={L} strokeWidth={1}>
                z
              </SvgText>
            </Particle>
          ))}
        </>
      );
    case 'sweat':
      return (
        <Particle {...p} phase={0} from={[168, 66]} to={[172, 86]}>
          <Path d="M168 54 Q 177 66 168 71 Q 159 66 168 54 Z" fill={art.C.drool} stroke={L} strokeWidth={3} strokeLinejoin="round" />
        </Particle>
      );
    case 'dots':
      return (
        <>
          {[0, 1, 2].map((i) => (
            <Particle key={i} {...p} phase={i * 0.2} from={[150 + i * 13, 26]} to={[150 + i * 13, 26]} pop>
              <Circle cx={150 + i * 13} cy={26} r={5} fill={art.C.cream} stroke={L} strokeWidth={2.5} />
            </Particle>
          ))}
        </>
      );
    case 'ring':
      return (
        <>
          {[0, 0.5].map((ph) => (
            <Particle key={ph} {...p} phase={ph} from={[100, 80]} to={[100, 80]} pop>
              <Path d="M14 80 Q 4 98 14 116 M186 80 Q 196 98 186 116" stroke="#FFC933" strokeWidth={6} fill="none" strokeLinecap="round" />
            </Particle>
          ))}
        </>
      );
    case 'steam':
      return (
        <>
          {[-14, 0, 14].map((dx, i) => (
            <Particle key={dx} {...p} phase={i * 0.33} from={[100 + dx * 2.4, 172]} to={[100 + dx * 2.8, 156]}>
              <Path d={`M${100 + dx * 2.4} 178 q -4 -5 0 -10 q 4 -5 0 -10`} stroke="#D9C7B0" strokeWidth={4} fill="none" strokeLinecap="round" />
            </Particle>
          ))}
        </>
      );
    case 'crumbs':
      return (
        <>
          {[[-8, 0], [6, 0.35], [-2, 0.7]].map(([dx, ph]) => (
            <Particle key={ph} {...p} phase={ph} from={[100 + dx, 176]} to={[100 + dx * 2.2, 196]} spin={180}>
              <Rect x={98 + dx} y={174} width={5} height={4.5} rx={1} fill={art.C.cookie} stroke={L} strokeWidth={1.5} />
            </Particle>
          ))}
        </>
      );
    case 'confetti':
      return (
        <>
          {([
            [20, 0, '#F2431F'],
            [56, 0.2, '#FFC933'],
            [144, 0.4, '#1F9A45'],
            [180, 0.6, '#7A5C8E'],
            [100, 0.8, '#F0546B'],
            [36, 0.5, '#FF9838'],
            [164, 0.1, '#FFC933'],
          ] as const).map(([x, ph, c]) => (
            <Particle key={`${x}-${ph}`} {...p} phase={ph} from={[x, 0]} to={[x + 10, 110]} spin={360}>
              <Rect x={x - 3} y={0} width={6} height={9} rx={1.5} fill={c} />
            </Particle>
          ))}
        </>
      );
    default:
      return null;
  }
}
