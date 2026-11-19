import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight, LinearTransition, SlideInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FoodIcon } from '../../components/FoodIcon';
import { ConfettiBurst } from '../../components/ConfettiBurst';
import { Icon } from '../../components/Icon';
import { PressableScale } from '../../components/PressableScale';
import { useToast } from '../../components/Toast';
import { Chunky } from '../../components/Chunky';
import { Button, CheckCircle, EmptyState, IconButton } from '../../components/ui';
import { words } from '../../lib/pantry';
import { haptics } from '../../lib/haptics';
import { playSuccess } from '../../lib/sounds';
import { noWidow } from '../../lib/text';
import { clock, secondsLeft, type CookTimer } from '../../lib/cookTimers';
import { durationLabel, findTimers } from '../../lib/timers';
import { convertQty, convertStepText } from '../../lib/units';
import { formatQty, nameFor, roundQty, useStore } from '../../state/store';
import { useTimers } from '../../state/timers';
import { cook, fonts, useTheme } from '../../theme';

export default function CookMode() {
  // The screen stays on while you cook. Leaving quickly can deactivate before activation finishes; that's harmless.
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string; servings?: string }>();
  const { getRecipe, units, logCooked } = useStore();
  const recipe = getRecipe(params.id);
  const servings = Number(params.servings) || recipe?.servings || 1;

  const [page, setPage] = useState(0); // 0 = get ready, 1..n = steps, n+1 = done
  // Kept for the whole cook: going back never resets what you've set out.
  const [gathered, setGathered] = useState<Record<string, boolean>>({});
  const [listOpen, setListOpen] = useState(false);
  // Which way the last move went, so the next step slides in from the right side.
  const [forward, setForward] = useState(true);
  // Timers live app-wide (src/state/timers.tsx): they keep going outside Cook Mode and ring when the app is closed.
  const { timers, now, support, start, pause, resume, restart, stop } = useTimers();
  const ringing = timers.filter((tm) => tm.status === 'ringing');

  const steps = recipe?.steps ?? [];
  const last = steps.length + 1;


  if (!recipe) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.colors.background }}>
        <EmptyState icon="fork" title="Recipe not found" message="It may have been removed." action={{ label: 'Close', onPress: () => router.back() }} />
      </View>
    );
  }

  const stopAlarm = (id: string) => {
    stop(id);
    haptics.success();
  };

  const go = (p: number) => {
    haptics.select();
    setForward(p >= page);
    // A finished timer doesn't follow you to the next step. Running ones keep counting.
    for (const tm of timers) if (tm.status === 'ringing' || tm.status === 'done') stop(tm.id);
    setPage(Math.max(0, Math.min(last, p)));
  };

  const startTimer = (label: string, seconds: number) => {
    start({ label, total: seconds, recipeId: recipe.id, recipeTitle: recipe.title, step: page, stepText: shortStep(steps[page - 1] ?? '') });
    haptics.success();
    // Said once, the first time: where timers can and can't ring.
    if (support.reason) {
      AsyncStorage.getItem(NOTE_KEY)
        .then((seen) => {
          if (seen) return;
          AsyncStorage.setItem(NOTE_KEY, '1').catch(() => {});
          toast({ message: support.reason === 'expo-go' ? 'In Expo Go, timers only ring while the app is open.' : 'On the web, timers only ring while this page is open.', icon: 'info', tone: 'info' });
        })
        .catch(() => {});
    }
  };

  const finish = () => {
    logCooked(recipe.id, servings);
    toast({ message: `Logged ${recipe.title}. +50 XP, nice cooking!`, icon: 'checkCircle' });
    close();
  };

  // Opened from a link there is nothing to go back to, so land on the recipe instead.
  const close = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } }));
  const stepText = page >= 1 && page <= steps.length ? convertStepText(steps[page - 1], units) : '';
  // A timer that is already running for this step doesn't need its Start button.
  const active = (label: string) => timers.some((tm) => tm.recipeId === recipe.id && tm.step === page && tm.label === label && (tm.status === 'running' || tm.status === 'paused'));
  const stepTimers = stepText ? findTimers(stepText).filter((tm) => !active(tm.label)) : [];
  const setOut = recipe.ingredients.filter((ing, i) => gathered[`${ing.id}-${i}`]).length;
  const allOut = setOut === recipe.ingredients.length && setOut > 0;
  const done = page === last;
  const scale = servings / recipe.servings;
  /** "300 g chicken breast", scaled and in your units. */
  const amountOf = (ing: (typeof recipe.ingredients)[number]) => {
    const c = convertQty(roundQty(ing.quantity * scale), ing.unit, units);
    return `${formatQty(c.quantity, c.unit)} ${nameFor(c.quantity, c.unit, ing.name)}`.trim();
  };
  // The ingredients this step mentions, so you don't have to scroll back to the list.
  const stepWords = new Set(words(stepText));
  const inStep = stepText
    ? recipe.ingredients.filter((ing) => {
        const w = words(ing.name);
        return w.length > 0 && (w.every((x) => stepWords.has(x)) || stepWords.has(w[0]));
      })
    : [];
  const toggleGathered = (key: string) => {
    const next = { ...gathered, [key]: !gathered[key] };
    setGathered(next);
    // The last one set out: a small "ready" moment.
    if (!gathered[key] && recipe.ingredients.every((ing, i) => next[`${ing.id}-${i}`])) haptics.success();
  };

  // The checklist stays light; the cooking steps use the dark kitchen palette.
  const dark = page > 0;
  const C = dark
    ? { bg: cook.background, card: cook.card, strong: cook.cardStrong, label: cook.label, sec: cook.secondaryLabel, track: cook.track, now: cook.accent, done: cook.done }
    : { bg: t.colors.background, card: t.colors.cell, strong: t.colors.fill, label: t.colors.label, sec: t.colors.secondaryLabel, track: t.colors.fillStrong, now: t.colors.tintFill, done: t.colors.success };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={dark || t.isDark ? 'light' : 'dark'} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
        <IconButton icon="close" accessibilityLabel="Exit cook mode" onPress={close} color={C.label} background={C.card} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[t.type.headline, { color: C.label }]} numberOfLines={1}>
            {recipe.title}
          </Text>
          <Text style={[t.type.footnote, { color: C.sec }]} testID="cook-progress">
            {page === 0 ? 'Get ready' : done ? 'Done!' : `Step ${page} of ${steps.length}`}
          </Text>
        </View>
        <IconButton icon="notes" accessibilityLabel="Show all ingredients" onPress={() => setListOpen(true)} color={C.label} background={C.card} />
      </View>

      {/* One segment per step; tap one to jump there. The current step is saffron, finished ones green. */}
      <View style={styles.segments} accessibilityLabel="Steps" accessibilityValue={{ min: 0, max: steps.length, now: Math.min(page, steps.length) }}>
        {steps.map((_, i) => (
          <PressableScale key={i} onPress={() => go(i + 1)} haptic={null} scaleTo={0.96} accessibilityLabel={`Go to step ${i + 1}${i + 1 < page ? ', done' : i + 1 === page ? ', current' : ''}`} style={styles.segmentTap}>
            <View testID="cook-segment" style={[styles.segment, { backgroundColor: i + 1 < page || done ? C.done : i + 1 === page ? C.now : C.track }]} />
          </PressableScale>
        ))}
      </View>

      {/* Timers: one card each, above the step. A ringing one comes first. */}
      {timers.length > 0 && (
        <View style={styles.timers}>
          {[...ringing, ...timers.filter((tm) => tm.status !== 'ringing')].map((tm, i) => (
            <TimerCard
              key={tm.id}
              timer={tm}
              now={now}
              first={i === 0}
              page={page}
              recipeId={recipe.id}
              dark={dark}
              onStop={() => (tm.status === 'ringing' ? stopAlarm(tm.id) : stop(tm.id))}
              onPause={() => pause(tm.id)}
              onResume={() => resume(tm.id)}
              onRestart={() => restart(tm.id)}
            />
          ))}
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} contentContainerStyle={styles.content}>
        {page === 0 && (
          <Animated.View key="gather" entering={(forward ? FadeInRight : FadeInLeft).duration(240)} style={{ gap: 16 }}>
            <View style={styles.gatherHead}>
              <ReadyRing done={setOut} total={recipe.ingredients.length} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[t.type.title1, { color: t.colors.label }]} accessibilityRole="header">
                  {allOut ? 'Ready to cook' : 'Set out your ingredients'}
                </Text>
                <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]} testID="gather-count">
                  {allOut ? 'Everything’s ready' : `${setOut} of ${recipe.ingredients.length} · for ${servings} ${servings === 1 ? 'serving' : 'servings'}`}
                </Text>
              </View>
            </View>
            <View style={[styles.card, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}>
              {recipe.ingredients.map((ing, i) => {
                const key = `${ing.id}-${i}`;
                const label = amountOf(ing);
                return (
                  <PressableScale
                    key={key}
                    onPress={() => toggleGathered(key)}
                    haptic="select"
                    scaleTo={0.98}
                    accessibilityRole="checkbox"
                    aria-checked={!!gathered[key]}
                    accessibilityLabel={label}
                    style={[styles.gatherRow, { backgroundColor: gathered[key] ? t.colors.successSoft : 'transparent' }]}
                  >
                    <CheckCircle checked={!!gathered[key]} color={t.colors.success} />
                    <Text style={[t.type.body, { color: gathered[key] ? t.colors.secondaryLabel : t.colors.label, flex: 1, textDecorationLine: gathered[key] ? 'line-through' : 'none' }]}>{label}</Text>
                    <FoodIcon name={ing.name} aisle={ing.aisle} size={28} />
                  </PressableScale>
                );
              })}
            </View>
          </Animated.View>
        )}

        {page >= 1 && page <= steps.length && (
          <Animated.View key={page} entering={(forward ? FadeInRight : FadeInLeft).duration(240)} style={{ gap: 20 }}>
            <Text style={[t.type.headline, { color: cook.accent }]}>Step {page}</Text>
            <Text style={[styles.stepText, t.noWidows.style, { color: cook.label }]} {...t.noWidows.props} testID="cook-step" accessibilityRole="header">
              {stepText}
            </Text>
            {stepTimers.map((tm) => (
              <Chunky key={tm.label} onPress={() => startTimer(tm.label, tm.seconds)} face={cook.accent} accessibilityLabel={`Start a ${durationLabel(tm.seconds)} timer`} faceStyle={styles.timerStart}>
                <Icon name="timer" size={19} color={cook.onAccent} weight="bold" />
                <Text style={[t.type.button, { color: cook.onAccent }]} numberOfLines={1}>
                  Start {durationLabel(tm.seconds)} timer
                </Text>
              </Chunky>
            ))}
            {inStep.length > 0 && (
              <View style={[styles.card, styles.inStep, { backgroundColor: cook.card, borderRadius: t.layout.cardRadius }]} testID="in-step">
                <Text style={[t.type.subhead, { color: cook.secondaryLabel, fontFamily: t.fonts.bold }]}>In this step</Text>
                {inStep.map((ing) => (
                  <View key={ing.id} style={styles.inStepRow}>
                    <View style={[styles.dot, { backgroundColor: cook.accent }]} />
                    <Text style={[t.type.body, { color: cook.label, flex: 1 }]}>{amountOf(ing)}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* The best moment in the app: confetti falls and a chime plays. */}
        {done && (
          <Animated.View key="done" entering={ZoomIn.springify().damping(12)} style={styles.done}>
            <View style={[styles.doneBadge, { backgroundColor: cook.done }]}>
              <Icon name="check" size={56} color={cook.background} weight="bold" />
            </View>
            <Text style={[t.type.largeTitle, { color: cook.label, textAlign: 'center' }]} accessibilityRole="header">
              You made it!
            </Text>
            <Text style={[t.type.body, t.noWidows.style, { color: cook.secondaryLabel, textAlign: 'center', maxWidth: 300 }]} {...t.noWidows.props}>
              {noWidow(`${recipe.title} is ready. Log the meal to add it to your progress.`)}
            </Text>
            <Text style={[t.type.footnote, { color: cook.secondaryLabel, textAlign: 'center' }]}>
              {steps.length} steps · {servings} {servings === 1 ? 'serving' : 'servings'}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {done && <Celebrate />}

      {/* Every ingredient, any time, without leaving the step */}
      <Modal visible={listOpen} transparent animationType="fade" onRequestClose={() => setListOpen(false)}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.scrim }]} onPress={() => setListOpen(false)} accessibilityLabel="Close ingredients" />
        <Animated.View entering={SlideInDown.duration(260)} style={[styles.sheet, { backgroundColor: t.colors.background, paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
          <View style={styles.sheetHead}>
            <Text style={[t.type.title2, { color: t.colors.label, flex: 1 }]} accessibilityRole="header">
              Ingredients
            </Text>
            <IconButton icon="close" accessibilityLabel="Close ingredients" onPress={() => setListOpen(false)} color={t.colors.label} background={t.colors.fill} />
          </View>
          <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginBottom: 8 }]}>For {servings} {servings === 1 ? 'serving' : 'servings'}</Text>
          <ScrollView style={{ maxHeight: 420 }}>
            {recipe.ingredients.map((ing, i) => {
              const key = `${ing.id}-${i}`;
              return (
                <PressableScale key={key} onPress={() => toggleGathered(key)} haptic="select" scaleTo={0.98} accessibilityRole="checkbox" aria-checked={!!gathered[key]} accessibilityLabel={amountOf(ing)} style={[styles.gatherRow, { backgroundColor: gathered[key] ? t.colors.successSoft : 'transparent' }]}>
                  <CheckCircle checked={!!gathered[key]} color={t.colors.success} />
                  <Text style={[t.type.body, { color: gathered[key] ? t.colors.secondaryLabel : t.colors.label, flex: 1 }]}>{amountOf(ing)}</Text>
                  <FoodIcon name={ing.name} aisle={ing.aisle} size={28} />
                </PressableScale>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Modal>

      {/* Navigation: one main button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: C.bg }]}>
        {page > 0 && (
          <Chunky onPress={() => go(page - 1)} face={cook.cardStrong} accessibilityLabel="Previous step" style={{ flex: 1 }} faceStyle={styles.navBtn}>
            <Icon name="back" size={17} color={cook.label} weight="bold" />
            <Text style={[t.type.button, { color: cook.label }]}>Back</Text>
          </Chunky>
        )}
        {page === 0 ? (
          <Button label="Start cooking" icon="arrowRight" onPress={() => go(1)} style={{ flex: 1 }} accessibilityLabel="Start the first step" />
        ) : !done ? (
          <Chunky onPress={() => go(page + 1)} face={cook.accent} accessibilityLabel={page === steps.length ? 'Finish cooking' : 'Next step'} style={{ flex: 2 }} faceStyle={styles.navBtn}>
            <Text style={[t.type.button, { color: cook.onAccent }]}>{page === steps.length ? 'Finish' : 'Next step'}</Text>
            <Icon name="arrowRight" size={17} color={cook.onAccent} weight="bold" />
          </Chunky>
        ) : (
          <Chunky onPress={finish} face={cook.done} accessibilityLabel="Log meal and finish" style={{ flex: 2 }} faceStyle={styles.navBtn}>
            <Icon name="check" size={17} color={cook.background} weight="bold" />
            <Text style={[t.type.button, { color: cook.background }]}>Log meal</Text>
          </Chunky>
        )}
      </View>
    </View>
  );
}

/** Confetti, a happy chime and a success tap, once, when the last step is finished. */
function Celebrate() {
  useEffect(() => {
    haptics.success();
    playSuccess();
  }, []);
  return <ConfettiBurst count={80} />;
}

/** First sentence of a step, short enough for the Lock Screen. */
const shortStep = (step: string) => {
  const first = step.split(/(?<=[.!?])\s/)[0] ?? step;
  return first.length > 48 ? `${first.slice(0, 46).trimEnd()}…` : first;
};

/** A ring that fills as ingredients are set out. */
function ReadyRing({ done, total }: { done: number; total: number }) {
  const t = useTheme();
  const size = 64;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  const full = done === total && total > 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.colors.fillStrong} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={full ? t.colors.success : t.colors.reward} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      {full ? (
        <Icon name="check" size={24} color={t.colors.success} weight="bold" />
      ) : (
        <Text style={[t.type.headline, { color: t.colors.label, fontVariant: ['tabular-nums'] }]}>
          {done}/{total}
        </Text>
      )}
    </View>
  );
}

/**
 * One timer: a ring that empties as time runs out, the time left in large digits, a short label on
 * its own line ("18 min · Step 3", never squeezed), then pause or resume, restart and stop.
 */
function TimerCard({ timer: tm, now, first, page, recipeId, dark, onStop, onPause, onResume, onRestart }: { timer: CookTimer; now: number; first: boolean; page: number; recipeId: string; dark: boolean; onStop: () => void; onPause: () => void; onResume: () => void; onRestart: () => void }) {
  const t = useTheme();
  // On the narrowest phones the restart button makes way so the time always fits.
  const narrow = useWindowDimensions().width < 360;
  const card = dark ? cook.card : t.colors.cell;
  const label = dark ? cook.label : t.colors.label;
  const sec = dark ? cook.secondaryLabel : t.colors.secondaryLabel;
  const where = tm.recipeId !== recipeId ? tm.recipeTitle : `Step ${tm.step}`;
  const length = durationLabel(tm.total);
  if (tm.status === 'ringing') {
    return (
      <Animated.View entering={FadeIn} layout={LinearTransition} style={[styles.timerCard, { backgroundColor: cook.accent }]} accessibilityRole="alert">
        <Icon name="timer" size={24} color={cook.onAccent} weight="bold" />
        <View style={styles.timerText}>
          <Text style={[t.type.title3, { color: cook.onAccent }]} numberOfLines={1} testID={first ? 'timer-done' : undefined}>
            Time’s up!
          </Text>
          <Text style={[t.type.footnote, { color: cook.onAccent }]} numberOfLines={1}>
            {length} · {where}
          </Text>
        </View>
        <PressableScale onPress={onStop} accessibilityLabel="Stop alarm" style={[styles.stopBtn, { backgroundColor: cook.background }]}>
          <Text style={[t.type.headline, { color: cook.accent }]}>Stop</Text>
        </PressableScale>
      </Animated.View>
    );
  }
  if (tm.status === 'done') {
    // Ended while the app was closed: the notification already rang.
    return (
      <Animated.View entering={FadeIn} layout={LinearTransition} style={[styles.timerCard, { backgroundColor: card }]} testID="timer-finished-away">
        <Icon name="checkCircle" size={22} color={dark ? cook.done : t.colors.success} weight="bold" />
        <Text style={[t.type.subhead, { color: label, flex: 1, minWidth: 0 }]} numberOfLines={2}>
          {length} timer finished while you were away
        </Text>
        <IconButton icon="close" accessibilityLabel="Dismiss finished timer" color={sec} iconSize={14} onPress={onStop} />
      </Animated.View>
    );
  }
  const running = tm.status === 'running';
  const left = secondsLeft(tm, now);
  const size = 52;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = tm.total ? left / tm.total : 0;
  return (
    <Animated.View entering={FadeIn} layout={LinearTransition} style={[styles.timerCard, { backgroundColor: card }, !dark && t.chunky.card]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={dark ? cook.track : t.colors.fillStrong} strokeWidth={stroke} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={cook.accent} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        </Svg>
        <Icon name={running ? 'timer' : 'pause'} size={18} color={label} weight="bold" />
      </View>
      {/* The text column may shrink, but each line stays whole: no letter-by-letter wrapping. */}
      <View style={styles.timerText}>
        <Text style={[styles.timerClock, { color: label }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} testID={first ? 'timer-display' : undefined}>
          {clock(left)}
        </Text>
        <Text style={[t.type.footnote, { color: sec }]} numberOfLines={1} testID={first ? 'timer-label' : undefined}>
          {running ? `${length} · ${where}` : `Paused · ${length}`}
        </Text>
      </View>
      <IconButton icon={running ? 'pause' : 'play'} accessibilityLabel={running ? 'Pause timer' : 'Resume timer'} iconSize={17} color={label} background={dark ? cook.cardStrong : t.colors.fill} onPress={running ? onPause : onResume} />
      {!narrow && <IconButton icon="restart" accessibilityLabel="Restart timer" iconSize={16} color={sec} onPress={onRestart} />}
      <IconButton icon="close" accessibilityLabel="Stop timer" iconSize={14} color={sec} onPress={onStop} />
    </Animated.View>
  );
}

const NOTE_KEY = 'pantry-pop-timer-note-seen';

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  segments: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, marginBottom: 4 },
  // A full 44pt tap area that only takes 24pt of room on screen.
  segmentTap: { flex: 1, height: 44, marginVertical: -10, justifyContent: 'center' },
  segment: { height: 6, borderRadius: 3 },
  timers: { paddingHorizontal: 16, gap: 8, marginBottom: 4, marginTop: 8 },
  timerCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12, paddingRight: 4, paddingVertical: 10, borderRadius: 24, borderCurve: 'continuous', minHeight: 72 },
  timerText: { flex: 1, minWidth: 0 },
  timerClock: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 30, fontVariant: ['tabular-nums'] },
  timerStart: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56, paddingHorizontal: 20 },
  stopBtn: { minHeight: 44, minWidth: 80, paddingHorizontal: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 16, paddingBottom: 140, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { padding: 8, borderCurve: 'continuous' },
  gatherHead: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepText: { fontFamily: fonts.serifMedium, fontSize: 30, lineHeight: 39, letterSpacing: -0.3 },
  gatherRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 8, borderRadius: 14, borderCurve: 'continuous' },
  inStep: { padding: 16, gap: 6 },
  inStepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  done: { alignItems: 'center', gap: 8, paddingTop: 40 },
  doneBadge: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 16, borderCurve: 'continuous' },
  sheetHead: { flexDirection: 'row', alignItems: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  navBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56, paddingHorizontal: 18 },
});
