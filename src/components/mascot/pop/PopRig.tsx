/**
 * Pop (placeholder mascot) as a layered puppet. Same three layers as the Rive state machine:
 *
 * 1. Base layer (always on): breathing, random blinks (sometimes double), small glances, the eyes
 *    following a nearby touch.
 * 2. Emotion layer: the current mood (moods.ts). Face and body blend into it with springs.
 *    Expressions cross-fade behind a quick blink so nothing jumps.
 * 3. Reaction layer: celebrating, love, oops and shocked play once (anticipation, squash and
 *    stretch, overshoot, settle), then blend back to the mood before.
 *
 * Secondary motion: the top of the puff lags behind jumps and turns, then settles.
 * Performance: every motion is a transform or opacity on a whole layer (an Animated.View holding
 * an SVG). No path changes shape per frame. Animations stop while Pop is off screen.
 * Reduce Motion: only gentle fades and blinks.
 *
 * The app only talks to <Mascot> (Mascot.tsx). To replace the art, swap this file and pop/art.tsx.
 */
import { type ComponentRef, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
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
  type SharedValue,
  type WithSpringConfig,
} from 'react-native-reanimated';
import Svg, { G } from 'react-native-svg';
import { Effect } from '../art';
import { useLook } from '../look';
import { canLook, isReaction, moodSpecs, type Mood } from '../moods';
import { BLINK_MS, BREATH_SCALE, DOUBLE_BLINK_CHANCE, FOLLOW_MS, GLANCE_MS, HEAD_LAG_MS, REACTION_MS, springs } from '../springs';
import * as art from './art';
import { useOnScreen } from './useOnScreen';

export type RigProps = {
  mood: Mood;
  talking: boolean;
  size: number;
  /** Change this to play the same mood's entrance again. */
  playKey: string;
  /** Freeze in the mood's pose (for still images): no blinks, glances or returning from a reaction. */
  hold: boolean;
  /** Force Reduce Motion on (the lab's switch). Otherwise the system setting is used. */
  reduceMotion?: boolean;
  /** Draw only the filled silhouette, in black (the readability check). */
  silhouette?: boolean;
};

/** Below this size Pop leaves out props and effects. */
export const SMALL = 56;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const S = (v: number, c: WithSpringConfig = springs.pose) => withSpring(v, c);
/** An arm hangs behind the body when it's at the side; raised or crossing arms come in front. */
const armInFront = (deg: number, layer: string) => layer !== 'back' && (deg < 0 || deg > 110);

export function PopRig({ mood, talking, size, playKey, hold, reduceMotion: forceReduce, silhouette }: RigProps) {
  const systemReduce = useReducedMotion();
  const reduce = forceReduce ?? systemReduce;
  const small = size < SMALL;
  const uid = `p${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const self = useAnimatedRef<Animated.View>();
  // Nothing animates while Pop is off screen (or the app is in the background).
  const boxRef = useRef<ComponentRef<typeof View>>(null);
  const visible = useOnScreen(boxRef);
  const still = hold || !visible;

  const vb = { x: -6, y: -10, w: 212, h: 212 };
  const k = size / vb.w; // art units → points
  const org = (p: readonly [number, number]) => `${((p[0] - vb.x) / vb.w) * 100}% ${((p[1] - vb.y) / vb.h) * 100}%`;
  // Pivots as plain strings, worked out on the JS side (animation code runs on the UI thread).
  const O = {
    eyes: org(art.PIVOT.eyes),
    face: org(art.PIVOT.face),
    feet: org(art.PIVOT.feet),
    mouth: org(art.PIVOT.mouth),
    top: org(art.PIVOT.top),
    shoulderL: org(art.PIVOT.shoulderL),
    shoulderR: org(art.PIVOT.shoulderR),
  };

  /* ---------------- emotion and reaction layers ---------------- */
  const [layers, setLayers] = useState(() => ({
    mood,
    playKey,
    emotion: isReaction(mood) ? ('idle' as Mood) : mood,
    reaction: isReaction(mood) ? { mood, key: playKey } : (null as { mood: Mood; key: string } | null),
  }));
  if (layers.mood !== mood || layers.playKey !== playKey) {
    setLayers((l) => (isReaction(mood) ? { ...l, mood, playKey, reaction: { mood, key: playKey } } : { mood, playKey, emotion: mood, reaction: null }));
  }
  const { emotion, reaction } = layers;
  useEffect(() => {
    if (!reaction || hold) return;
    const id = setTimeout(() => setLayers((l) => ({ ...l, reaction: null })), REACTION_MS);
    return () => clearTimeout(id);
  }, [reaction, hold]);

  const active: Mood = reaction?.mood ?? emotion;
  const spec = moodSpecs[active];
  const playId = `${active}|${reaction?.key ?? playKey}`;

  /* ---------------- shared values ---------------- */
  const jump = useSharedValue(0);
  const lean = useSharedValue(spec.lean);
  const sq = useSharedValue(1);
  const breath = useSharedValue(1);
  const faceTilt = useSharedValue(spec.headTilt);
  const faceY = useSharedValue(spec.headY);
  const faceBreath = useSharedValue(0);
  const nod = useSharedValue(0);
  const armL = useSharedValue(spec.armL);
  const armR = useSharedValue(spec.armR);
  const armBusy = useSharedValue(0);
  const blink = useSharedValue(0);
  const lookX = useSharedValue(spec.look[0]);
  const lookY = useSharedValue(spec.look[1]);
  const glance = useSharedValue(0);
  const talk = useSharedValue(0);
  const talkOn = useSharedValue(0);
  const chew = useSharedValue(0);
  const faceMix = useSharedValue(0);

  /* ---------------- base layer ---------------- */
  useEffect(() => {
    if (reduce || still) {
      breath.set(1);
      faceBreath.set(0);
      return;
    }
    breath.set(1);
    breath.set(withRepeat(S(BREATH_SCALE, springs.breath), -1, true));
    faceBreath.set(0);
    faceBreath.set(withDelay(HEAD_LAG_MS, withRepeat(S(1, springs.breath), -1, true)));
  }, [reduce, still, breath, faceBreath]);

  useEffect(() => {
    if (still) return;
    let id: ReturnType<typeof setTimeout>;
    const once = () => withSequence(S(1, springs.blink), S(0, springs.blink));
    const next = () => {
      id = setTimeout(
        () => {
          blink.set(Math.random() < DOUBLE_BLINK_CHANCE ? withSequence(once(), withDelay(90, once())) : once());
          next();
        },
        rand(BLINK_MS[0], BLINK_MS[1]),
      );
    };
    next();
    return () => clearTimeout(id);
  }, [still, blink]);

  const eyesCanLook = canLook(spec.eyes) && spec.look[0] === 0 && spec.look[1] === 0;
  useEffect(() => {
    if (still || reduce || !eyesCanLook) {
      glance.set(S(0, springs.glance));
      return;
    }
    let id: ReturnType<typeof setTimeout>;
    const next = () => {
      id = setTimeout(
        () => {
          glance.set(withSequence(S(Math.random() < 0.5 ? -0.7 : 0.7, springs.glance), withDelay(rand(500, 900), S(0, springs.glance))));
          next();
        },
        rand(GLANCE_MS[0], GLANCE_MS[1]),
      );
    };
    next();
    return () => clearTimeout(id);
  }, [still, reduce, eyesCanLook, glance]);

  /* ---------------- emotion layer: blend into the mood ---------------- */
  useEffect(() => {
    const c = reduce ? springs.gentle : springs.pose;
    const set = (v: SharedValue<number>, to: number) => (hold ? v.set(to) : v.set(S(to, c)));
    set(armL, spec.armL);
    set(armR, spec.armR);
    set(faceTilt, spec.headTilt);
    set(faceY, spec.headY);
    set(lean, spec.lean);
    set(lookX, spec.look[0]);
    set(lookY, spec.look[1]);
  }, [spec, hold, reduce, armL, armR, faceTilt, faceY, lean, lookX, lookY]);

  const face = useMemo(
    () => ({
      eyes: spec.eyes,
      mouth: spec.mouth,
      brows: spec.brows,
      puff: !!spec.puff,
      blush: !!spec.blush,
      flour: spec.fx.includes('flour'),
      sweat: spec.fx.includes('sweat'),
    }),
    [spec],
  );
  const faceKey = JSON.stringify(face);
  const [slots, setSlots] = useState<{
    a: typeof face;
    b: typeof face;
    front: 0 | 1;
  }>({ a: face, b: face, front: 0 });
  const shownKey = JSON.stringify(slots.front === 0 ? slots.a : slots.b);
  if (faceKey !== shownKey) {
    setSlots((s) => (s.front === 0 ? { a: s.a, b: face, front: 1 } : { a: face, b: s.b, front: 0 }));
  }
  useEffect(() => {
    if (hold) faceMix.set(slots.front);
    else {
      faceMix.set(S(slots.front, springs.fade));
      if (!reduce) blink.set(withSequence(S(0.85, springs.blink), S(0, springs.blink)));
    }
  }, [slots.front, hold, reduce, faceMix, blink]);

  /* ---------------- entrances and reactions ---------------- */
  useEffect(() => {
    if (hold || reduce) {
      jump.set(0);
      sq.set(1);
      nod.set(0);
      return;
    }
    // Anticipation (crouch), stretch up, fall, squash on landing, settle.
    const hop = () => [S(0.9, { duration: 90, dampingRatio: 1 }), S(1.08, springs.snappy)];
    const jumpHop = (h: number) => [S(2, { duration: 90, dampingRatio: 1 }), S(-h, { duration: 180, dampingRatio: 0.9 }), S(0, { duration: 160, dampingRatio: 1 })];
    switch (spec.entry) {
      case 'hop':
        jump.set(withSequence(...jumpHop(14)));
        sq.set(withSequence(...hop(), S(1, { duration: 150, dampingRatio: 1 }), S(0.88, { duration: 60, dampingRatio: 1 }), S(1, springs.land)));
        break;
      case 'hop2':
        jump.set(withSequence(...jumpHop(16), ...jumpHop(11)));
        sq.set(
          withSequence(
            ...hop(),
            S(1, { duration: 150, dampingRatio: 1 }),
            S(0.88, { duration: 60, dampingRatio: 1 }),
            ...hop(),
            S(1, { duration: 150, dampingRatio: 1 }),
            S(0.9, { duration: 60, dampingRatio: 1 }),
            S(1, springs.land),
          ),
        );
        break;
      case 'jumpBack':
        jump.set(withSequence(S(2, { duration: 70, dampingRatio: 1 }), S(-12, springs.snappy), S(0, { duration: 200, dampingRatio: 1 })));
        sq.set(withSequence(S(0.9, { duration: 70, dampingRatio: 1 }), S(1.12, springs.snappy), S(0.9, { duration: 80, dampingRatio: 1 }), S(1, springs.land)));
        lean.set(withSequence(S(-7, springs.snappy), S(spec.lean, springs.settle)));
        break;
      case 'puff':
        sq.set(withSequence(S(0.95, { duration: 90, dampingRatio: 1 }), S(1.06, springs.snappy), S(1, springs.settle)));
        break;
      case 'shiver':
        lean.set(withSequence(S(-3, springs.flick), S(3, springs.flick), S(-2, springs.flick), S(spec.lean, springs.settle)));
        break;
      case 'nod':
        nod.set(withSequence(S(-5, springs.snappy), S(3, springs.snappy), S(0, springs.settle)));
        break;
      case 'none':
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId, hold, reduce]);

  /* ---------------- loops while a mood lasts ---------------- */
  useEffect(() => {
    chew.set(0);
    armBusy.set(S(0, springs.settle));
    if (still || reduce || !spec.loop) return;
    const c = springs.busy;
    switch (spec.loop) {
      case 'stir':
        armBusy.set(withRepeat(withSequence(S(12, { ...c, duration: 380 }), S(-8, { ...c, duration: 380 })), -1));
        break;
      case 'chop':
        armBusy.set(withRepeat(withSequence(S(-16, c), S(2, { ...c, duration: 160 })), -1));
        break;
      case 'wave':
        armBusy.set(withRepeat(withSequence(S(18, c), S(-14, c)), -1, true));
        break;
      case 'chew':
        chew.set(withRepeat(withSequence(S(1, c), S(0, c)), -1));
        break;
      case 'sway':
        break;
    }
  }, [spec.loop, still, reduce, armBusy, chew]);

  /* ---------------- talking ---------------- */
  useEffect(() => {
    if (talking && !reduce && !still) {
      talkOn.set(S(1, springs.fade));
      talk.set(withRepeat(withSequence(S(1, springs.talk), S(0.2, springs.talk), S(0.75, springs.talk), S(0.1, springs.talk)), -1));
    } else {
      talkOn.set(S(talking ? 1 : 0, springs.fade));
      talk.set(S(talking ? 0.6 : 0, springs.talk));
    }
  }, [talking, reduce, still, talk, talkOn]);

  /* ---------------- secondary motion: the top puff lags behind ---------------- */
  const lagJump = useDerivedValue(() => withSpring(jump.get(), springs.lag));
  const lagTilt = useDerivedValue(() => withSpring(faceTilt.get() + nod.get() + lean.get(), springs.lag));

  /* ---------------- eyes follow a nearby touch ---------------- */
  const touch = useLook();
  const zero = useSharedValue(0);
  const tx = touch?.x ?? zero;
  const ty = touch?.y ?? zero;
  const tat = touch?.at ?? zero;
  const follow = useDerivedValue(() => {
    breath.get(); // re-check every frame while breathing
    const on = eyesCanLook && !hold && tat.get() > 0 && Date.now() - tat.get() < FOLLOW_MS;
    return withSpring(on ? 1 : 0, springs.glance);
  });

  /* ---------------- animated styles (transforms and opacity only) ---------------- */
  const rootStyle = useAnimatedStyle(() => {
    const s = sq.get();
    const b = breath.get();
    return {
      transform: [{ translateY: jump.get() * k }, { rotate: `${lean.get()}deg` }, { scaleX: (1 / Math.sqrt(s)) * (1 + (b - 1) * 0.5) }, { scaleY: s * b }],
    };
  });
  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (lagJump.get() - jump.get()) * 0.45 * k },
      {
        rotate: `${(lagTilt.get() - faceTilt.get() - nod.get() - lean.get()) * 1.3}deg`,
      },
    ],
  }));
  const faceStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: (faceY.get() - faceBreath.get() * 1.2 + chew.get() * 0.8) * k,
      },
      { rotate: `${(faceTilt.get() + nod.get()) * 0.6}deg` },
    ],
  }));
  const armLStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${armL.get()}deg` }],
  }));
  const armRStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-(armR.get() + armBusy.get())}deg` }],
  }));
  const eyesStyle = useAnimatedStyle(() => {
    let x = lookX.get() + glance.get();
    let y = lookY.get();
    const fo = follow.get();
    if (fo > 0.01) {
      const box = measure(self);
      if (box) {
        const dx = tx.get() - (box.pageX + box.width / 2);
        const dy = ty.get() - (box.pageY + box.height * 0.5);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < box.width * 3) {
          const len = Math.max(1, dist / 1.2);
          x += (Math.max(-1, Math.min(1, dx / len)) - x) * fo;
          y += (Math.max(-1, Math.min(1, dy / len)) - y) * fo;
        }
      }
    }
    // Big eyes move as a whole, a little: enough to read as looking, never off the face.
    return {
      transform: [{ translateX: x * 2.6 * k }, { translateY: y * 2.2 * k }, { scaleY: 1 - blink.get() * 0.9 }],
    };
  });
  const slotA = useAnimatedStyle(() => ({ opacity: 1 - faceMix.get() }));
  const slotB = useAnimatedStyle(() => ({ opacity: faceMix.get() }));
  const mouthStyle = useAnimatedStyle(() => ({
    opacity: 1 - talkOn.get(),
    transform: [{ scaleX: 1 + chew.get() * 0.12 }, { scaleY: 1 - chew.get() * 0.25 }],
  }));
  const talkStyle = useAnimatedStyle(() => ({
    opacity: talkOn.get(),
    transform: [{ scaleY: 0.2 + talk.get() * 0.8 }],
  }));

  /* ---------------- effects ---------------- */
  const fx = small ? [] : spec.fx.filter((x) => x !== 'flour' && x !== 'sweat');
  const pops = !small && (active === 'celebrating' || active === 'excited');
  const fxClock = useFxClock((fx.length > 0 || pops) && !still && !reduce);

  /* ---------------- drawing ---------------- */
  const box = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
  const A = Animated.View;
  const frontL = armInFront(spec.armL, spec.layerL);
  const frontR = armInFront(spec.armR, spec.layerR);
  const [sLx, sLy] = art.PIVOT.shoulderL;
  const [sRx, sRy] = art.PIVOT.shoulderR;
  const arm = (side: 'L' | 'R', front: boolean) => (
    <A key={side} style={[StyleSheet.absoluteFill, { transformOrigin: side === 'L' ? O.shoulderL : O.shoulderR }, side === 'L' ? armLStyle : armRStyle]}>
      <Layer box={box}>
        <G x={side === 'L' ? sLx : sRx} y={side === 'L' ? sLy : sRy}>
          <art.Arm front={front} silhouette={silhouette} />
        </G>
      </Layer>
    </A>
  );

  const faceSlot = (fc: typeof face, style: object, key: string) => (
    <A key={key} style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Layer box={box}>
        <art.Cheeks strong={fc.blush} puff={fc.puff && !small} flour={fc.flour} sweat={fc.sweat} />
        <art.BrowsArt kind={fc.brows} />
      </Layer>
      <A style={[StyleSheet.absoluteFill, { transformOrigin: O.eyes }, eyesStyle]}>
        <Layer box={box}>
          <art.EyesArt kind={fc.eyes} uid={`${uid}${key}`} />
        </Layer>
      </A>
      <A style={[StyleSheet.absoluteFill, { transformOrigin: O.mouth }, mouthStyle]}>
        <Layer box={box}>
          <art.MouthArt kind={fc.mouth} />
        </Layer>
      </A>
    </A>
  );

  return (
    <View ref={boxRef} collapsable={false} style={{ width: size, height: size }} pointerEvents="box-none">
      <Animated.View ref={self} style={{ width: size, height: size }} pointerEvents="box-none">
        <A style={[StyleSheet.absoluteFill, { transformOrigin: O.feet }, rootStyle]} pointerEvents="none">
          {!frontL && arm('L', false)}
          {!frontR && arm('R', false)}
          <A style={[StyleSheet.absoluteFill, { transformOrigin: O.top }, topStyle]}>
            <Layer box={box}>
              <art.Top uid={uid} silhouette={silhouette} />
            </Layer>
          </A>
          <Layer box={box}>
            <art.Feet silhouette={silhouette} />
            <art.Body uid={uid} silhouette={silhouette} />
          </Layer>
          {!silhouette && (
            <A style={[StyleSheet.absoluteFill, { transformOrigin: O.face }, faceStyle]}>
              {faceSlot(slots.a, slotA, 'a')}
              {faceSlot(slots.b, slotB, 'b')}
              <A style={[StyleSheet.absoluteFill, { transformOrigin: O.mouth }, talkStyle]} pointerEvents="none">
                <Layer box={box}>
                  <art.TalkMouth />
                </Layer>
              </A>
            </A>
          )}
          {!silhouette && !small && (spec.props.includes('pot') || spec.props.includes('board')) && (
            <Layer box={box}>
              {spec.props.includes('pot') && <art.Pot />}
              {spec.props.includes('board') && <art.Board />}
            </Layer>
          )}
          {frontL && arm('L', true)}
          {frontR && arm('R', true)}
          {!silhouette && (fx.length > 0 || pops) && (
            <View style={StyleSheet.absoluteFill}>
              <Layer box={box}>
                {pops && <art.PopPuffs t={fxClock.t} />}
                {fx.map((e) => (
                  <Effect key={e} fx={e} t={fxClock.t} pulse={fxClock.pulse} />
                ))}
              </Layer>
            </View>
          )}
        </A>
      </Animated.View>
    </View>
  );
}

/** A slow clock for the small effects, about 24 frames a second, eased. Stopped when not needed. */
function useFxClock(on: boolean) {
  const [frame, setFrame] = useState({ t: 0.35, pulse: 0.6 });
  const start = useRef(0);
  useEffect(() => {
    if (!on) return;
    start.current = Date.now();
    const id = setInterval(() => {
      const ms = Date.now() - start.current;
      const raw = (ms % 2600) / 2600;
      const t = raw - (Math.sin(raw * Math.PI * 2) / (Math.PI * 2)) * 0.35;
      setFrame({ t, pulse: (Math.sin((ms / 900) * Math.PI) + 1) / 2 });
    }, 42);
    return () => clearInterval(id);
  }, [on]);
  return frame;
}

/** One drawing layer: an SVG filling its parent, in art space. */
function Layer({ box, children }: { box: string; children: ReactNode }) {
  return (
    <Svg viewBox={box} width="100%" height="100%" style={StyleSheet.absoluteFill}>
      {children}
    </Svg>
  );
}
