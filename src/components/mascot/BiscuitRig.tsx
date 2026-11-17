/**
 * Biscuit as a layered puppet, animated like a state machine with three layers running together:
 *
 * 1. Base layer (always on): breathing (body 1.00 → 1.02 over ~3.2 s, the head following a moment
 *    later), random blinks every 2-6 s (sometimes double), a slow tail sway whose tip follows
 *    through, an ear flick every 6-12 s, small glances, and the eyes following a nearby touch.
 * 2. Emotion layer: the current mood. Face and body blend into it with springs and stay there.
 *    Expressions cross-fade (behind a blink) so nothing jumps.
 * 3. Reaction layer: celebrating, love, oops and shocked play once, with anticipation, squash
 *    and stretch, overshoot and a settle, then blend back to the mood Biscuit was in.
 *
 * The hat and tail lag behind the head and body and settle afterwards (follow-through).
 * Every motion is a Reanimated spring; the values live in springs.ts.
 * With Reduce Motion on, only gentle fades and blinks remain.
 * Under 56 pt Biscuit is drawn simplified: head and shoulders, fewer lines, no props.
 *
 * This file is one renderer. The app only talks to <Mascot> (Mascot.tsx), with the mood names in
 * moods.ts, which map 1:1 to a Rive state machine.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
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
import Svg from 'react-native-svg';
import { biscuit } from '../../theme';
import * as art from './art';
import { useLook } from './look';
import { canLook, isReaction, moodSpecs, type Mood } from './moods';
import {
  BLINK_MS,
  BREATH_SCALE,
  DOUBLE_BLINK_CHANCE,
  EAR_MS,
  FOLLOW_MS,
  GLANCE_MS,
  HEAD_LAG_MS,
  REACTION_MS,
  TAIL_SWAY,
  TAIL_TIP_LAG_MS,
  springs,
} from './springs';

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

/** Below this size Biscuit is drawn as head and shoulders. */
export const SMALL = 56;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const S = (v: number, c: WithSpringConfig = springs.pose) => withSpring(v, c);

export function BiscuitRig({ mood, talking, size, playKey, hold, reduceMotion: forceReduce, silhouette }: RigProps) {
  const systemReduce = useReducedMotion();
  const reduce = forceReduce ?? systemReduce;
  const small = size < SMALL;
  const uid = `b${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // The art's view box: the whole cat, or head and shoulders when small.
  const vb = small ? { x: 20, y: -6, w: 160, h: 160 } : { x: -6, y: -10, w: 212, h: 212 };
  const k = size / vb.w; // art units → points
  const org = (p: readonly [number, number]) => `${((p[0] - vb.x) / vb.w) * 100}% ${((p[1] - vb.y) / vb.h) * 100}%`;
  // Pivot points as plain strings, worked out here on the JS side. Animation code runs on the UI
  // thread on a phone and must not call ordinary functions, so it only reads these.
  const O = {
    earL: org(art.PIVOT.earL),
    earR: org(art.PIVOT.earR),
    eyes: org(art.PIVOT.eyes),
    feet: org(art.PIVOT.feet),
    hat: org(art.PIVOT.hat),
    mouth: org(art.PIVOT.mouth),
    neck: org(art.PIVOT.neck),
    shoulderL: org(art.PIVOT.shoulderL),
    shoulderR: org(art.PIVOT.shoulderR),
    tailBase: org(art.PIVOT.tailBase),
    tailJoint: org(art.PIVOT.tailJoint),
  };
  const look: art.Look = { out: small ? art.OUT_SMALL : art.OUT, color: silhouette ? '#000000' : biscuit.outline };

  /* ---------------- emotion and reaction layers ---------------- */
  // Derived from the props while rendering (no effect): a reaction keeps the mood it came from.
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
  // A reaction plays once, then Biscuit goes back to the mood it came from.
  useEffect(() => {
    if (!reaction || hold) return;
    const id = setTimeout(() => setLayers((l) => ({ ...l, reaction: null })), REACTION_MS);
    return () => clearTimeout(id);
  }, [reaction, hold]);

  const active: Mood = reaction?.mood ?? emotion;
  const spec = moodSpecs[active];
  const playId = `${active}|${reaction?.key ?? playKey}`;

  /* ---------------- shared values ---------------- */
  // whole body
  const jump = useSharedValue(0);
  const lean = useSharedValue(spec.lean);
  const sq = useSharedValue(1);
  const breath = useSharedValue(1);
  // head
  const headTilt = useSharedValue(spec.headTilt);
  const headY = useSharedValue(spec.headY);
  const headBreath = useSharedValue(0);
  const nod = useSharedValue(0);
  // parts
  const armL = useSharedValue(spec.armL);
  const armR = useSharedValue(spec.armR);
  const armBusy = useSharedValue(0); // loops added to the right arm (stir, chop, wave)
  const tailA = useSharedValue(-TAIL_SWAY);
  const tailB = useSharedValue(-TAIL_SWAY);
  const earL = useSharedValue(0);
  const earR = useSharedValue(0);
  const blink = useSharedValue(0);
  const lookX = useSharedValue(spec.look[0]);
  const lookY = useSharedValue(spec.look[1]);
  const glance = useSharedValue(0);
  const talk = useSharedValue(0);
  const talkOn = useSharedValue(0);
  const chew = useSharedValue(0);
  const faceMix = useSharedValue(0);

  /* ---------------- base layer: breathing, tail, blinks, ears, glances ---------------- */
  useEffect(() => {
    if (reduce || hold) {
      breath.set(1);
      headBreath.set(0);
      return;
    }
    breath.set(1);
    breath.set(withRepeat(S(BREATH_SCALE, springs.breath), -1, true));
    headBreath.set(0);
    headBreath.set(withDelay(HEAD_LAG_MS, withRepeat(S(1, springs.breath), -1, true)));
  }, [reduce, hold, breath, headBreath]);

  const tailSpeed = spec.tailSpeed ?? 1;
  useEffect(() => {
    if (reduce || hold || small) {
      tailA.set(S(0, springs.gentle));
      tailB.set(S(0, springs.gentle));
      return;
    }
    const cfg = { ...springs.sway, duration: springs.sway.duration / tailSpeed };
    tailA.set(-TAIL_SWAY);
    tailB.set(-TAIL_SWAY);
    tailA.set(withRepeat(S(TAIL_SWAY, cfg), -1, true));
    // the tip follows a moment later: follow-through
    tailB.set(withDelay(TAIL_TIP_LAG_MS / tailSpeed, withRepeat(S(TAIL_SWAY, cfg), -1, true)));
  }, [reduce, hold, small, tailSpeed, tailA, tailB]);

  useEffect(() => {
    if (hold) return;
    let id: ReturnType<typeof setTimeout>;
    const once = () => withSequence(S(1, springs.blink), S(0, springs.blink));
    const next = () => {
      id = setTimeout(() => {
        blink.set(Math.random() < DOUBLE_BLINK_CHANCE ? withSequence(once(), withDelay(90, once())) : once());
        next();
      }, rand(BLINK_MS[0], BLINK_MS[1]));
    };
    next();
    return () => clearTimeout(id);
  }, [hold, blink]);

  useEffect(() => {
    if (hold || reduce) return;
    let id: ReturnType<typeof setTimeout>;
    const next = () => {
      id = setTimeout(() => {
        const ear = Math.random() < 0.5 ? earL : earR;
        ear.set(withSequence(S(-16, springs.flick), S(0, springs.flick)));
        next();
      }, rand(EAR_MS[0], EAR_MS[1]));
    };
    next();
    return () => clearTimeout(id);
  }, [hold, reduce, earL, earR]);

  const eyesCanLook = canLook(spec.eyes) && spec.look[0] === 0 && spec.look[1] === 0;
  useEffect(() => {
    if (hold || reduce || !eyesCanLook) {
      glance.set(S(0, springs.glance));
      return;
    }
    let id: ReturnType<typeof setTimeout>;
    const next = () => {
      id = setTimeout(() => {
        glance.set(withSequence(S(Math.random() < 0.5 ? -0.7 : 0.7, springs.glance), withDelay(rand(500, 900), S(0, springs.glance))));
        next();
      }, rand(GLANCE_MS[0], GLANCE_MS[1]));
    };
    next();
    return () => clearTimeout(id);
  }, [hold, reduce, eyesCanLook, glance]);

  /* ---------------- emotion layer: blend the body into the mood ---------------- */
  useEffect(() => {
    const c = reduce ? springs.gentle : springs.pose;
    const set = (v: SharedValue<number>, to: number) => (hold ? v.set(to) : v.set(S(to, c)));
    set(armL, spec.armL);
    set(armR, spec.armR);
    set(headTilt, spec.headTilt);
    set(headY, spec.headY);
    set(lean, spec.lean);
    set(lookX, spec.look[0]);
    set(lookY, spec.look[1]);
  }, [spec, hold, reduce, armL, armR, headTilt, headY, lean, lookX, lookY]);

  // Expressions cross-fade between two slots, behind a quick blink, so the face never jumps.
  const face = useMemo(() => ({ eyes: spec.eyes, mouth: spec.mouth, brows: spec.brows, puff: !!spec.puff, blush: !!spec.blush, flour: spec.fx.includes('flour'), sweat: spec.fx.includes('sweat') }), [spec]);
  const faceKey = JSON.stringify(face);
  const [slots, setSlots] = useState<{ a: typeof face; b: typeof face; front: 0 | 1 }>({ a: face, b: face, front: 0 });
  const shownKey = JSON.stringify(slots.front === 0 ? slots.a : slots.b);
  if (faceKey !== shownKey) {
    // the new face goes into the hidden slot, which then fades in
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
    const hop = () => [
      S(0.9, { duration: 90, dampingRatio: 1 }), // crouch
      S(1.08, springs.snappy), // stretch
    ];
    const jumpHop = (h: number) => [S(2, { duration: 90, dampingRatio: 1 }), S(-h, { duration: 180, dampingRatio: 0.9 }), S(0, { duration: 160, dampingRatio: 1 })];
    switch (spec.entry) {
      case 'hop':
        jump.set(withSequence(...jumpHop(14)));
        sq.set(withSequence(...hop(), S(1, { duration: 150, dampingRatio: 1 }), S(0.88, { duration: 60, dampingRatio: 1 }), S(1, springs.land)));
        break;
      case 'hop2':
        jump.set(withSequence(...jumpHop(16), ...jumpHop(11)));
        sq.set(withSequence(...hop(), S(1, { duration: 150, dampingRatio: 1 }), S(0.88, { duration: 60, dampingRatio: 1 }), ...hop(), S(1, { duration: 150, dampingRatio: 1 }), S(0.9, { duration: 60, dampingRatio: 1 }), S(1, springs.land)));
        break;
      case 'jumpBack':
        // shocked: a quick crouch, then a stretched jump backward, and a wobbly landing
        jump.set(withSequence(S(2, { duration: 70, dampingRatio: 1 }), S(-12, springs.snappy), S(0, { duration: 200, dampingRatio: 1 })));
        sq.set(withSequence(S(0.9, { duration: 70, dampingRatio: 1 }), S(1.12, springs.snappy), S(0.9, { duration: 80, dampingRatio: 1 }), S(1, springs.land)));
        lean.set(withSequence(S(-7, springs.snappy), S(spec.lean, springs.settle)));
        break;
      case 'puff':
        // chest out: a small squash, a stretch with overshoot, and settle
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
    if (hold || reduce || !spec.loop) return;
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
  }, [spec.loop, hold, reduce, armBusy, chew]);

  /* ---------------- talking ---------------- */
  useEffect(() => {
    if (talking && !reduce) {
      talkOn.set(S(1, springs.fade));
      talk.set(withRepeat(withSequence(S(1, springs.talk), S(0.2, springs.talk), S(0.75, springs.talk), S(0.1, springs.talk)), -1));
    } else {
      talkOn.set(S(0, springs.fade));
      talk.set(S(0, springs.talk));
    }
  }, [talking, reduce, talk, talkOn]);

  /* ---------------- secondary motion (follow-through) ---------------- */
  const lagJump = useDerivedValue(() => withSpring(jump.get(), springs.lag));
  const lagTilt = useDerivedValue(() => withSpring(headTilt.get() + nod.get(), springs.lag));

  /* ---------------- eyes follow a nearby touch ---------------- */
  const touch = useLook();
  const self = useAnimatedRef<Animated.View>();
  const zero = useSharedValue(0);
  const tx = touch?.x ?? zero;
  const ty = touch?.y ?? zero;
  const tat = touch?.at ?? zero;
  const follow = useDerivedValue(() => {
    breath.get(); // re-check every frame while breathing
    const on = eyesCanLook && !hold && tat.get() > 0 && Date.now() - tat.get() < FOLLOW_MS;
    return withSpring(on ? 1 : 0, springs.glance);
  });

  /* ---------------- animated styles ---------------- */
  const rootStyle = useAnimatedStyle(() => {
    const s = sq.get();
    const b = breath.get();
    return {
      transform: [{ translateY: jump.get() * k }, { rotate: `${lean.get()}deg` }, { scaleX: (1 / Math.sqrt(s)) * (1 + (b - 1) * 0.5) }, { scaleY: s * b }],
    };
  });
  const headStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (headY.get() - headBreath.get() * 1.2 + chew.get() * 0.8) * k }, { rotate: `${headTilt.get() + nod.get()}deg` }],
  }));
  // The hat lags behind the head's turns and the body's jumps, then settles.
  const hatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (lagJump.get() - jump.get()) * 0.3 * k }, { rotate: `${-5 + (lagTilt.get() - headTilt.get() - nod.get()) * 1.2}deg` }],
  }));
  const earLStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-earL.get()}deg` }] }));
  const earRStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${earR.get()}deg` }] }));
  const armLStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${armL.get()}deg` }] }));
  const armRStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-(armR.get() + armBusy.get())}deg` }] }));
  const tailBaseStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tailA.get() + (lagJump.get() - jump.get()) * 0.9}deg` }],
  }));
  const tailTipStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tailB.get() * 1.4 + (lagJump.get() - jump.get()) * 1.4}deg` }],
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
        // only touches near Biscuit (within about three of its sizes)
        if (dist < box.width * 3) {
          const len = Math.max(1, dist / 1.2);
          x += (Math.max(-1, Math.min(1, dx / len)) - x) * fo;
          y += (Math.max(-1, Math.min(1, dy / len)) - y) * fo;
        }
      }
    }
    return {
      transform: [{ translateX: x * 3.6 * k }, { translateY: y * 3 * k }, { scaleY: 1 - blink.get() * 0.92 }],
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

  /* ---------------- effects (hearts, steam, confetti ...) ---------------- */
  const fx = small ? [] : spec.fx.filter((x) => x !== 'flour' && x !== 'sweat');
  const fxClock = useFxClock(fx.length > 0 && !hold && !reduce);

  /* ---------------- drawing ---------------- */
  const box = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
  const A = Animated.View;
  const held = art.heldBy(spec.props);

  const arm = (side: 'L' | 'R', pass: art.Pass) => (
    <A key={`${side}${pass}`} style={[StyleSheet.absoluteFill, { transformOrigin: side === 'L' ? O.shoulderL : O.shoulderR }, side === 'L' ? armLStyle : armRStyle]}>
      <Layer box={box}>
        <art.Arm side={side} pass={pass} look={look} layer={side === 'L' ? spec.layerL : spec.layerR} palm={side === 'L' ? spec.palmL : spec.palmR} prop={held[side]} />
      </Layer>
    </A>
  );
  const armsIn = (pass: art.Pass, layer: 'back' | 'front' | 'over') =>
    small ? null : (
      <>
        {(pass === 'line' || spec.layerL === layer) && arm('L', pass)}
        {(pass === 'line' || spec.layerR === layer) && arm('R', pass)}
      </>
    );

  const faceSlot = (fc: typeof face, style: object, key: string) => (
    <A key={key} style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Layer box={box}>
        <art.Cheeks strong={fc.blush} puff={fc.puff && !small} flour={fc.flour} sweat={fc.sweat} />
        <art.BrowsArt kind={fc.brows} />
        <art.Nose />
      </Layer>
      <A style={[StyleSheet.absoluteFill, { transformOrigin: O.eyes }, eyesStyle]}>
        <Layer box={box}>
          <art.EyesArt kind={fc.eyes} />
        </Layer>
      </A>
      <A style={[StyleSheet.absoluteFill, { transformOrigin: O.mouth }, mouthStyle]}>
        <Layer box={box}>
          <art.MouthArt kind={fc.mouth} />
        </Layer>
      </A>
    </A>
  );

  const pass = (p: art.Pass) => (
    <>
      {/* tail, behind everything; the tip is its own piece so it can follow through */}
      {!small && (
        <A style={[StyleSheet.absoluteFill, { transformOrigin: O.tailBase }, tailBaseStyle]}>
          <Layer box={box}>
            <art.Tail piece="base" pass={p} look={look} uid={uid} />
          </Layer>
          <A style={[StyleSheet.absoluteFill, { transformOrigin: O.tailJoint }, tailTipStyle]}>
            <Layer box={box}>
              <art.Tail piece="tip" pass={p} look={look} uid={uid} />
            </Layer>
          </A>
        </A>
      )}
      {armsIn(p, 'back')}
      <Layer box={box}>
        {!small && <art.Feet pass={p} look={look} />}
        <art.Body pass={p} look={look} uid={uid} />
        {p === 'fill' && !small && spec.props.includes('pot') && <art.Pot />}
        {p === 'fill' && !small && spec.props.includes('board') && <art.Board />}
      </Layer>
      {p === 'fill' && armsIn(p, 'front')}
      {/* the scarf sits over the tops of the arms */}
      {p === 'fill' && (
        <Layer box={box}>
          <art.Scarf />
        </Layer>
      )}
      <A style={[StyleSheet.absoluteFill, { transformOrigin: O.neck }, headStyle]}>
        <A style={[StyleSheet.absoluteFill, { transformOrigin: O.earL }, earLStyle]}>
          <Layer box={box}>
            <art.Ear side="L" pass={p} look={look} />
          </Layer>
        </A>
        <A style={[StyleSheet.absoluteFill, { transformOrigin: O.earR }, earRStyle]}>
          <Layer box={box}>
            <art.Ear side="R" pass={p} look={look} />
          </Layer>
        </A>
        <Layer box={box}>
          <art.Head pass={p} look={look} uid={uid} small={small} />
        </Layer>
        {p === 'fill' && (
          <>
            {faceSlot(slots.a, slotA, 'a')}
            {faceSlot(slots.b, slotB, 'b')}
            <A style={[StyleSheet.absoluteFill, { transformOrigin: O.mouth }, talkStyle]} pointerEvents="none">
              <Layer box={box}>
                <art.TalkMouth />
              </Layer>
            </A>
          </>
        )}
        <A style={[StyleSheet.absoluteFill, { transformOrigin: O.hat }, hatStyle]}>
          <Layer box={box}>
            <art.Hat pass={p} look={look} uid={uid} />
          </Layer>
        </A>
      </A>
      {p === 'fill' && armsIn(p, 'over')}
    </>
  );

  return (
    <Animated.View ref={self} style={{ width: size, height: size }} pointerEvents="box-none">
      <A style={[StyleSheet.absoluteFill, { transformOrigin: O.feet }, rootStyle]} pointerEvents="none">
        {pass('line')}
        {!silhouette && pass('fill')}
        {!silhouette && fx.length > 0 && (
          <View style={StyleSheet.absoluteFill}>
            <Layer box={box}>
              {fx.map((e) => (
                <art.Effect key={e} fx={e} t={fxClock.t} pulse={fxClock.pulse} />
              ))}
            </Layer>
          </View>
        )}
      </A>
    </Animated.View>
  );
}

/**
 * A slow clock for the small effects (hearts rising, steam, confetti), at about 24 frames a
 * second, eased so nothing moves at a constant speed. Stopped (a fixed frame) when not needed.
 */
function useFxClock(on: boolean) {
  const [frame, setFrame] = useState({ t: 0.35, pulse: 0.6 });
  const start = useRef(0);
  useEffect(() => {
    if (!on) return;
    start.current = Date.now();
    const id = setInterval(() => {
      const ms = Date.now() - start.current;
      const raw = (ms % 2600) / 2600;
      // eased progress: slow in, slow out
      const t = raw - Math.sin(raw * Math.PI * 2) / (Math.PI * 2) * 0.35;
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
