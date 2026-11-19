import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight, LinearTransition, SlideInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FoodIcon } from '../../components/FoodIcon';
import { ConfettiBurst } from '../../components/ConfettiBurst';
import { Icon } from '../../components/Icon';
import { PressableScale } from '../../components/PressableScale';
import { useToast } from '../../components/Toast';
import { Button, CheckCircle, EmptyState, IconButton, ProgressBar } from '../../components/ui';
import { words } from '../../lib/pantry';
import { haptics } from '../../lib/haptics';
import { playSuccess } from '../../lib/sounds';
import { noWidow } from '../../lib/text';
import { clock, secondsLeft, type CookTimer } from '../../lib/cookTimers';
import { findTimers } from '../../lib/timers';
import { convertQty, convertStepText } from '../../lib/units';
import { formatQty, nameFor, roundQty, useStore } from '../../state/store';
import { useTimers } from '../../state/timers';
import { useTheme } from '../../theme';

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

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
        <IconButton icon="close" accessibilityLabel="Exit cook mode" onPress={close} color={t.colors.label} background={t.colors.fill} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[t.type.headline, { color: t.colors.label }]}>
            {recipe.title}
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} testID="cook-progress">
            {page === 0 ? 'Get ready' : done ? 'Done!' : `Step ${page} of ${steps.length}`}
          </Text>
        </View>
        <IconButton icon="notes" accessibilityLabel="Show all ingredients" onPress={() => setListOpen(true)} color={t.colors.label} background={t.colors.fill} />
      </View>

      {/* One segment per step. Getting the ingredients out isn't a step. */}
      {/* One segment per step; tap one to jump there. The current step is tomato, finished ones green. */}
      <View style={styles.segments} accessibilityLabel="Steps" accessibilityValue={{ min: 0, max: steps.length, now: Math.min(page, steps.length) }}>
        {steps.map((_, i) => (
          <PressableScale key={i} onPress={() => go(i + 1)} haptic={null} scaleTo={0.96} accessibilityLabel={`Go to step ${i + 1}${i + 1 < page ? ', done' : i + 1 === page ? ', current' : ''}`} style={styles.segmentTap}>
            <View testID="cook-segment" style={[styles.segment, { backgroundColor: i + 1 < page || done ? t.colors.success : i + 1 === page ? t.colors.tintFill : t.colors.fillStrong }]} />
          </PressableScale>
        ))}
      </View>

      {/* Timers: compact pills that sit above the step and never cover it. A ringing one comes first. */}
      {timers.length > 0 && (
        <View style={styles.timers}>
          {[...ringing, ...timers.filter((tm) => tm.status !== 'ringing')].map((tm, i) => (
            <TimerPill
              key={tm.id}
              timer={tm}
              now={now}
              first={i === 0}
              page={page}
              recipeId={recipe.id}
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
          <Animated.View key="gather" entering={(forward ? FadeInRight : FadeInLeft).duration(240)} style={[styles.card, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}>
            <Text style={[t.type.title2, { color: t.colors.label }]} accessibilityRole="header">
              Ingredients
            </Text>
            <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>
              {noWidow(`For ${servings} ${servings === 1 ? 'serving' : 'servings'}. Tap each one as you set it out.`)}
            </Text>
            <View style={styles.gatherBar}>
              <View style={{ flex: 1 }}>
                <ProgressBar value={setOut / Math.max(1, recipe.ingredients.length)} height={10} color={allOut ? t.colors.success : t.colors.reward} label="Ingredients set out" />
              </View>
              <Text style={[t.type.footnote, { color: allOut ? t.colors.successText : t.colors.secondaryLabel, fontVariant: ['tabular-nums'], fontWeight: allOut ? '700' : '400' }]} testID="gather-count">
                {allOut ? 'Everything’s ready' : `${setOut} of ${recipe.ingredients.length}`}
              </Text>
            </View>
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
          </Animated.View>
        )}

        {page >= 1 && page <= steps.length && (
          <Animated.View key={page} entering={(forward ? FadeInRight : FadeInLeft).duration(240)} style={{ gap: 16 }}>
            <View style={[styles.card, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}>
              <Text style={[t.type.headline, { color: t.colors.tint }]}>
                Step {page}
              </Text>
              <Text style={[styles.stepText, t.noWidows.style, { color: t.colors.label }]} {...t.noWidows.props} testID="cook-step" accessibilityRole="header">
                {stepText}
              </Text>
              {stepTimers.map((tm) => (
                <Button key={tm.label} label={`Start ${tm.label} timer`} icon="timer" variant="tinted" size="medium" onPress={() => startTimer(tm.label, tm.seconds)} style={{ alignSelf: 'stretch', marginTop: 8 }} accessibilityLabel={`Start a ${tm.label} timer`} />
              ))}
            </View>
            {inStep.length > 0 && (
              <View style={[styles.card, styles.inStep, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]} testID="in-step">
                <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>In this step</Text>
                {inStep.map((ing) => (
                  <View key={ing.id} style={styles.inStepRow}>
                    <FoodIcon name={ing.name} aisle={ing.aisle} size={26} />
                    <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>{amountOf(ing)}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* The best moment in the app: confetti falls and a chime plays. */}
        {done && (
          <Animated.View key="done" entering={ZoomIn.springify().damping(12)} style={styles.done}>
            <View style={[styles.doneBadge, { backgroundColor: t.colors.success, ...t.chunky.button(t.colors.successDeep) }]}>
              <Icon name="check" size={56} color="#FFFFFF" weight="bold" />
            </View>
            <Text style={[t.type.largeTitle, { color: t.colors.label, textAlign: 'center' }]} accessibilityRole="header">
              You made it!
            </Text>
            <Text style={[t.type.body, t.noWidows.style, { color: t.colors.secondaryLabel, textAlign: 'center', maxWidth: 300 }]} {...t.noWidows.props}>
              {noWidow(`${recipe.title} is ready. Log the meal to add it to your progress.`)}
            </Text>
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center' }]}>
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
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: t.colors.background }]}>
        {page > 0 && <Button label="Back" icon="back" variant="tinted" onPress={() => go(page - 1)} style={{ flex: 1 }} accessibilityLabel="Previous step" />}
        {!done ? (
          <Button label={page === 0 ? 'Let’s cook' : page === steps.length ? 'Finish' : 'Next'} icon="arrowRight" onPress={() => go(page + 1)} style={{ flex: 2 }} accessibilityLabel={page === 0 ? 'Start the first step' : page === steps.length ? 'Finish cooking' : 'Next step'} />
        ) : (
          <Button label="Log meal" icon="check" variant="success" onPress={finish} style={{ flex: 2 }} accessibilityLabel="Log meal and finish" />
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

/** One timer as a compact pill: time left, pause or resume, restart, stop. */
function TimerPill({ timer: tm, now, first, page, recipeId, onStop, onPause, onResume, onRestart }: { timer: CookTimer; now: number; first: boolean; page: number; recipeId: string; onStop: () => void; onPause: () => void; onResume: () => void; onRestart: () => void }) {
  const t = useTheme();
  const where = tm.recipeId !== recipeId ? tm.recipeTitle : tm.step !== page ? `Step ${tm.step}` : tm.label;
  if (tm.status === 'ringing') {
    return (
      <Animated.View entering={FadeIn} layout={LinearTransition} style={[styles.pill, { backgroundColor: t.colors.destructive }]} accessibilityRole="alert">
        <Icon name="timer" size={20} color="#FFFFFF" weight="bold" />
        <View style={{ flex: 1 }}>
          <Text style={[t.type.headline, { color: '#FFFFFF' }]} testID={first ? 'timer-done' : undefined}>
            Time’s up!
          </Text>
          <Text style={[t.type.caption1, { color: 'rgba(255,255,255,0.92)' }]}>
            {tm.label}, {tm.recipeId !== recipeId ? tm.recipeTitle : `step ${tm.step}`}
          </Text>
        </View>
        <PressableScale onPress={onStop} accessibilityLabel="Stop alarm" style={styles.stopBtn}>
          <Text style={[t.type.headline, { color: t.colors.destructive }]}>Stop</Text>
        </PressableScale>
      </Animated.View>
    );
  }
  if (tm.status === 'done') {
    // Ended while the app was closed: the notification already rang.
    return (
      <Animated.View entering={FadeIn} layout={LinearTransition} style={[styles.pill, { backgroundColor: t.colors.successSoft }]} testID="timer-finished-away">
        <Icon name="checkCircle" size={20} color={t.colors.successText} weight="bold" />
        <Text style={[t.type.subhead, { color: t.colors.label, flex: 1 }]}>
          {tm.label} timer finished while you were away
        </Text>
        <IconButton icon="close" accessibilityLabel="Dismiss finished timer" color={t.colors.secondaryLabel} iconSize={14} onPress={onStop} />
      </Animated.View>
    );
  }
  const running = tm.status === 'running';
  return (
    <Animated.View entering={FadeIn} layout={LinearTransition} style={[styles.pill, { backgroundColor: t.colors.cell, borderWidth: 2, borderColor: t.colors.border }]}>
      <Icon name="timer" size={18} color={t.colors.tint} weight="bold" />
      <Text style={[t.type.title3, { color: t.colors.label, fontVariant: ['tabular-nums'], minWidth: 56 }]} testID={first ? 'timer-display' : undefined}>
        {clock(secondsLeft(tm, now))}
      </Text>
      <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, flex: 1 }]}>
        {running ? where : 'Paused'}
      </Text>
      <IconButton icon={running ? 'pause' : 'play'} accessibilityLabel={running ? 'Pause timer' : 'Resume timer'} iconSize={16} onPress={running ? onPause : onResume} />
      <IconButton icon="restart" accessibilityLabel="Restart timer" iconSize={16} onPress={onRestart} />
      <IconButton icon="close" accessibilityLabel="Stop timer" iconSize={14} color={t.colors.secondaryLabel} onPress={onStop} />
    </Animated.View>
  );
}

const NOTE_KEY = 'pantry-pop-timer-note-seen';

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  segments: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, marginBottom: 4 },
  // A full 44pt tap area that only takes 24pt of room on screen.
  segmentTap: { flex: 1, height: 44, marginVertical: -10, justifyContent: 'center' },
  segment: { height: 8, borderRadius: 4 },
  timers: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 4, borderRadius: 26, borderCurve: 'continuous', minHeight: 52 },
  stopBtn: { minHeight: 44, minWidth: 80, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 8, paddingBottom: 140, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { padding: 16, paddingTop: 20, gap: 8, borderCurve: 'continuous' },
  gatherBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 4 },
  stepText: { fontSize: 26, lineHeight: 35, fontWeight: '600', marginTop: 4 },
  gatherRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 14, borderCurve: 'continuous' },
  inStep: { paddingTop: 16, gap: 4 },
  inStepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 },
  doneBadge: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16, borderCurve: 'continuous' },
  sheetHead: { flexDirection: 'row', alignItems: 'center' },
  done: { alignItems: 'center', gap: 8, paddingTop: 24 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
});
