import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../components/Text';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  LinearTransition,
  SlideInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { PressableScale } from '../../components/PressableScale';
import { RecipePhoto } from '../../components/RecipeCard';
import { useToast } from '../../components/Toast';
import { Lift, MascotSlot, PopButton, PopCard, PopChip, PopIconButton, SHOW_MASCOT_PLACEHOLDER } from '../../components/pop';
import { CheckCircle, EmptyState, ProgressBar } from '../../components/ui';
import type { Ingredient, Rating } from '../../data/mock';
import { clock, isReady, secondsLeft, type CookTimer } from '../../lib/cookTimers';
import { haptics } from '../../lib/haptics';
import { photoUri, takePhoto } from '../../lib/photos';
import { levelFor, streakOf, xpFor } from '../../lib/progress';
import { playSuccess } from '../../lib/sounds';
import { nb } from '../../lib/text';
import { ingredientsInStep, splitTip, warnStepProblems } from '../../lib/steps';
import { durationLabel, findTimers } from '../../lib/timers';
import { convertQty, convertStepText } from '../../lib/units';
import { formatQty, nameFor, roundQty, useStore } from '../../state/store';
import { useTimers } from '../../state/timers';
import { fonts, pop, popCycle, useTheme } from '../../theme';

export default function CookMode() {
  // The screen stays on while you cook. Leaving quickly can deactivate before activation finishes; that's harmless.
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string; servings?: string }>();
  const store = useStore();
  const { getRecipe, units, logCooked, rateCooked, setCookedPhoto, cooked, customRecipes, plan, favorites, fun } = store;
  const recipe = getRecipe(params.id);
  const servings = Number(params.servings) || recipe?.servings || 1;

  const [page, setPage] = useState(0); // 0 = get ready, 1..n = steps, n+1 = finish
  // Kept for the whole cook: going back never resets what you've set out.
  const [gathered, setGathered] = useState<Record<string, boolean>>({});
  const [listOpen, setListOpen] = useState(false);
  // Which way the last move went, so the next step slides in from the right side.
  const [forward, setForward] = useState(true);
  // The cooking-history entry made when you finish, and your XP and level just before it.
  const [entry, setEntry] = useState<{ date: string; xpBefore: number; levelBefore: number } | null>(null);
  // Timers live app-wide (src/state/timers.tsx): they keep going outside Cook Mode and ring when the app is closed.
  const { timers, now, support, start, pause, resume, reset, stop } = useTimers();

  const steps = recipe?.steps ?? [];
  const last = steps.length + 1;

  // In development: point out recipe text Cook Mode can't link to its ingredients.
  useEffect(() => {
    if (recipe) warnStepProblems(recipe.title, recipe.steps, recipe.ingredients);
  }, [recipe]);

  if (!recipe) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.colors.background }}>
        <EmptyState icon="fork" title="Recipe not found" message="It may have been removed." action={{ label: 'Close', onPress: () => router.back() }} />
      </View>
    );
  }

  const progressInput = { cooked, customRecipes, plan, favorites, fun, streak: streakOf(cooked.map((c) => c.date)) };

  const go = (p: number) => {
    const next = Math.max(0, Math.min(last, p));
    haptics.select();
    setForward(next >= page);
    // A finished timer doesn't follow you to the next step. Running ones keep counting.
    for (const tm of timers) if (tm.status === 'ringing' || tm.status === 'done') stop(tm.id);
    // Finishing logs the meal once: streak, XP and history update right away.
    if (next === last && !entry) {
      const xpBefore = xpFor(progressInput);
      const date = logCooked(recipe.id, servings);
      setEntry({ date, xpBefore, levelBefore: levelFor(xpBefore).level });
    }
    setPage(next);
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

  // Opened from a link there is nothing to go back to, so land on the recipe instead.
  const close = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } }));
  const goHome = () => (router.canDismiss() ? router.dismissTo('/') : router.replace('/'));

  const scale = servings / recipe.servings;
  /** "300 g chicken breast", scaled and in your units. */
  const amountOf = (ing: Ingredient) => {
    const c = convertQty(roundQty(ing.quantity * scale), ing.unit, units);
    return `${formatQty(c.quantity, c.unit)} ${nameFor(c.quantity, c.unit, ing.name)}`.trim();
  };
  const toggleGathered = (key: string) => {
    const next = { ...gathered, [key]: !gathered[key] };
    setGathered(next);
    // The last one set out: a small "ready" moment.
    if (!gathered[key] && recipe.ingredients.every((ing, i) => next[`${ing.id}-${i}`])) haptics.success();
  };
  const setOut = recipe.ingredients.filter((ing, i) => gathered[`${ing.id}-${i}`]).length;

  const onStep = page >= 1 && page <= steps.length;
  const stepText = onStep ? convertStepText(steps[page - 1], units) : '';
  const { main, tip } = splitTip(stepText);
  const inStep = onStep ? ingredientsInStep(steps[page - 1], recipe.ingredients) : [];
  const stepTimers = onStep ? uniqueTimers(findTimers(stepText)) : [];
  const timerFor = (label: string) => timers.find((tm) => tm.recipeId === recipe.id && tm.step === page && tm.label === label);
  // Timers that aren't on this step float as small pills, so you never lose them.
  const floating = timers.filter((tm) => !(tm.recipeId === recipe.id && tm.step === page && stepTimers.some((s) => s.label === tm.label)));
  const color = onStep ? popCycle[(page - 1) % popCycle.length] : popCycle[0];
  const bg = page === 0 ? pop.sunshineTint : page === last ? pop.sunshine : color.tint;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar style="dark" />

      {page === last ? (
        <Finish
          recipeTitle={recipe.title}
          recipe={recipe}
          servings={servings}
          entry={entry}
          progressInput={progressInput}
          onRate={(r) => entry && rateCooked(entry.date, r)}
          onPhoto={(uri) => entry && setCookedPhoto(entry.date, uri)}
          onDone={goHome}
        />
      ) : (
        <>
          {/* Header: close, where you are, all ingredients */}
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
            <PopIconButton icon="close" accessibilityLabel="Exit cook mode" onPress={close} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              {page === 0 ? (
                <View style={[styles.readyPill, { backgroundColor: setOut === recipe.ingredients.length ? pop.leaf : pop.white }]}>
                  <Text style={[t.type.headline, { color: pop.ink, fontFamily: fonts.black }]} testID="gather-count">
                    {setOut === recipe.ingredients.length ? 'Everything’s ready' : `${setOut} of ${recipe.ingredients.length} ready`}
                  </Text>
                </View>
              ) : (
                <Text style={[t.type.title3, { color: pop.ink }]} testID="cook-progress">
                  Step {page} of {steps.length}
                </Text>
              )}
            </View>
            {page === 0 ? (
              <View style={{ width: 44 }} />
            ) : (
              <PopIconButton icon="notes" accessibilityLabel="Show all ingredients" onPress={() => setListOpen(true)} />
            )}
          </View>

          {/* One chunky segment per step; tap one to jump there. */}
          {page > 0 && (
            <View style={styles.segments} accessibilityLabel="Steps" accessibilityValue={{ min: 0, max: steps.length, now: page }}>
              {steps.map((_, i) => (
                <PressableScale key={i} onPress={() => go(i + 1)} haptic={null} scaleTo={0.96} accessibilityLabel={`Go to step ${i + 1}${i + 1 < page ? ', done' : i + 1 === page ? ', current' : ''}`} style={styles.segmentTap}>
                  <View testID="cook-segment" style={[styles.segment, { backgroundColor: i + 1 < page ? pop.leaf : i + 1 === page ? pop.sunshine : pop.white }]} />
                </PressableScale>
              ))}
            </View>
          )}

          {/* Timers from other steps (or recipes), as small floating pills */}
          {floating.length > 0 && (
            <View style={styles.pills}>
              {floating.map((tm) => (
                <TimerPill key={tm.id} timer={tm} now={now} here={tm.recipeId === recipe.id} onPress={() => (tm.recipeId === recipe.id ? go(tm.step) : undefined)} onStop={() => stop(tm.id)} />
              ))}
            </View>
          )}

          <ScrollView style={{ flex: 1 }} contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} contentContainerStyle={styles.content}>
            {page === 0 && (
              <Animated.View key="gather" entering={(forward ? FadeInRight : FadeInLeft).duration(240)} style={{ gap: 18 }}>
                <View style={{ gap: 4 }}>
                  <Text style={[t.type.largeTitle, { color: pop.ink }]} accessibilityRole="header">
                    Grab your stuff
                  </Text>
                  <Text style={[t.type.body, { color: pop.inkMuted }]}>Tap each one as it lands on the counter.</Text>
                </View>
                <MascotSlot
                  message={
                    setOut === recipe.ingredients.length
                      ? 'Everything’s here. Let’s go!'
                      : setOut >= Math.ceil(recipe.ingredients.length / 2) && setOut > 0
                        ? 'Halfway there!'
                        : 'Let’s gather everything!'
                  }
                />
                <View style={styles.grid}>
                  {recipe.ingredients.map((ing, i) => {
                    const key = `${ing.id}-${i}`;
                    return <GatherTile key={key} label={amountOf(ing)} checked={!!gathered[key]} onPress={() => toggleGathered(key)} />;
                  })}
                </View>
              </Animated.View>
            )}

            {onStep && (
              <Animated.View key={page} entering={(forward ? FadeInRight : FadeInLeft).duration(240)} style={{ gap: 16 }}>
                {/* The step: a big card with its number sitting on the top edge */}
                <PopCard clip={false} style={{ marginTop: 26 }} contentStyle={styles.stepCard}>
                  <View style={[styles.stepBadge, { backgroundColor: color.fill }]} accessibilityElementsHidden>
                    <Text style={[t.type.title2, { color: pop.ink }]}>{page}</Text>
                  </View>
                  <Text style={[styles.stepText, main.length > 120 && styles.stepTextLong, t.noWidows.style, { color: pop.ink }]} {...t.noWidows.props} testID="cook-step" accessibilityRole="header">
                    {main}
                  </Text>
                  {inStep.length > 0 && (
                    <View style={styles.stepChips} testID="in-step" accessibilityLabel={`In this step: ${inStep.map(amountOf).join(', ')}`}>
                      {inStep.map((ing) => (
                        <PopChip key={ing.id} label={amountOf(ing)} color={color.tint} small />
                      ))}
                    </View>
                  )}
                </PopCard>

                {tip && (
                  <View style={[styles.tip, { backgroundColor: pop.berryTint }]} testID="pro-move">
                    <Text style={[t.type.body, { color: pop.ink }]}>
                      <Text style={{ fontFamily: fonts.black }}>Pro move: </Text>
                      {tip}
                    </Text>
                  </View>
                )}

                {stepTimers.map((st, i) => {
                  const tm = timerFor(st.label);
                  return (
                    <TimerCard
                      key={st.label}
                      seconds={st.seconds}
                      timer={tm}
                      now={now}
                      first={i === 0}
                      onStart={() => startTimer(st.label, st.seconds)}
                      onPause={() => tm && pause(tm.id)}
                      onResume={() => tm && resume(tm.id)}
                      onReset={() => tm && reset(tm.id)}
                      onStop={() => {
                        if (!tm) return;
                        stop(tm.id);
                        if (tm.status === 'ringing') haptics.success();
                      }}
                    />
                  );
                })}
              </Animated.View>
            )}
          </ScrollView>

          {/* Footer: back + the one big button */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {page === 0 ? (
              <PopButton label="Start cooking" iconRight="arrowRight" onPress={() => go(1)} accessibilityLabel="Start the first step" style={{ flex: 1 }} />
            ) : (
              <>
                <PopIconButton icon="back" size={56} iconSize={22} accessibilityLabel="Previous step" onPress={() => go(page - 1)} haptic={null} />
                <PopButton
                  label={page === steps.length ? 'I’m done!' : 'Done! Next step'}
                  iconRight={page === steps.length ? 'check' : 'arrowRight'}
                  onPress={() => go(page + 1)}
                  accessibilityLabel={page === steps.length ? 'Finish cooking' : 'Next step'}
                  haptic={null}
                  style={{ flex: 1 }}
                />
              </>
            )}
          </View>
        </>
      )}

      {/* Every ingredient, any time, without leaving the step */}
      <Modal visible={listOpen} transparent animationType="fade" onRequestClose={() => setListOpen(false)}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.scrim }]} onPress={() => setListOpen(false)} accessibilityLabel="Close ingredients" />
        <Animated.View entering={SlideInDown.duration(260)} style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
          <View style={styles.sheetHead}>
            <Text style={[t.type.title2, { color: pop.ink, flex: 1 }]} accessibilityRole="header">
              Ingredients
            </Text>
            <PopIconButton icon="close" accessibilityLabel="Close ingredients" onPress={() => setListOpen(false)} />
          </View>
          <Text style={[t.type.subhead, { color: pop.inkMuted, marginBottom: 8 }]}>
            For {servings} {servings === 1 ? 'person' : 'people'}
          </Text>
          <ScrollView style={{ maxHeight: 420 }}>
            {recipe.ingredients.map((ing, i) => {
              const key = `${ing.id}-${i}`;
              return (
                <PressableScale
                  key={key}
                  onPress={() => toggleGathered(key)}
                  haptic="select"
                  scaleTo={0.98}
                  accessibilityRole="checkbox"
                  aria-checked={!!gathered[key]}
                  accessibilityLabel={amountOf(ing)}
                  style={[styles.sheetRow, i > 0 && { borderTopWidth: 1.5, borderTopColor: t.colors.separator }]}
                >
                  <CheckCircle checked={!!gathered[key]} color={pop.leaf} />
                  <Text style={[t.type.body, { color: gathered[key] ? pop.inkMuted : pop.ink, flex: 1 }]}>{amountOf(ing)}</Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Get ready                                                            */
/* ------------------------------------------------------------------ */

/**
 * One ingredient on the counter. Unchecked: white with a dashed empty circle, sitting high on a
 * 5px shadow. Checked: leaf green with a white check, pressed down to a 2px shadow. A small pop when tapped.
 */
function GatherTile({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(checked ? 1 : 0);
  const bounce = useSharedValue(1);
  useEffect(() => {
    pressed.set(reduceMotion ? (checked ? 1 : 0) : withTiming(checked ? 1 : 0, { duration: 120 }));
  }, [checked, reduceMotion, pressed]);
  // Numbers only in here: this runs on the UI thread.
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: pressed.get() * 3 }, { scale: bounce.get() }] }));
  const { width } = useWindowDimensions();
  const tileWidth = (Math.min(width, 640) - 40 - 12) / 2;
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        if (!reduceMotion) bounce.set(withSequence(withTiming(1.06, { duration: 75 }), withTiming(1, { duration: 75 })));
        onPress();
      }}
      accessibilityRole="checkbox"
      aria-checked={checked}
      accessibilityLabel={label}
      style={{ width: tileWidth, paddingBottom: 5 }}
    >
      <View style={styles.tileShadow} />
      <Animated.View style={[styles.tile, { backgroundColor: checked ? pop.leaf : pop.white }, face]}>
        {checked ? (
          <View style={styles.tileCheck}>
            <Icon name="check" size={14} color={pop.ink} weight="bold" />
          </View>
        ) : (
          <View style={styles.tileEmpty} />
        )}
        <Text style={styles.tileText}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Timers                                                               */
/* ------------------------------------------------------------------ */

/**
 * The step's timer: a tomato card. Row 1: the big time and its status (Ready, Running, Paused,
 * Done!), always in full. Row 2: the controls, 48pt each: Play or Pause, Reset, and Stop as a word
 * (not an ✕, which looks like closing the screen). It never starts on its own.
 */
function TimerCard({ seconds, timer: tm, now, first, onStart, onPause, onResume, onReset, onStop }: { seconds: number; timer?: CookTimer; now: number; first: boolean; onStart: () => void; onPause: () => void; onResume: () => void; onReset: () => void; onStop: () => void }) {
  const t = useTheme();
  const length = durationLabel(seconds);
  const done = tm?.status === 'ringing' || tm?.status === 'done';
  const ready = !tm || isReady(tm);
  const running = tm?.status === 'running';
  const left = tm ? secondsLeft(tm, now) : seconds;
  const status = done ? 'Done!' : ready ? 'Ready' : running ? 'Running' : 'Paused';
  return (
    <Animated.View entering={FadeIn} layout={LinearTransition}>
      <PopCard color={tm?.status === 'done' ? pop.tomatoTint : pop.tomato} contentStyle={styles.timerFace} testID={tm?.status === 'done' ? 'timer-finished-away' : undefined}>
        <View accessible accessibilityRole={tm?.status === 'ringing' ? 'alert' : undefined} accessibilityLabel={`${length} timer. ${status}${done ? '' : `, ${clock(left)} left`}`}>
          <Text style={[styles.timerClock, { color: pop.ink }]} testID={first ? (done ? 'timer-done' : 'timer-display') : undefined}>
            {done ? '0:00' : clock(left)}
          </Text>
          <Text style={[t.type.headline, { color: pop.ink }]} testID={first ? 'timer-label' : undefined}>
            {status} · {length}
          </Text>
        </View>
        <View style={styles.timerBtns}>
          {!done &&
            (ready ? (
              <PopIconButton icon="play" size={48} accessibilityLabel={`Start a ${length} timer`} onPress={tm ? onResume : onStart} haptic={null} />
            ) : (
              <PopIconButton icon={running ? 'pause' : 'play'} size={48} accessibilityLabel={running ? 'Pause timer' : 'Resume timer'} onPress={running ? onPause : onResume} haptic="select" />
            ))}
          {tm && !done && !ready && <PopIconButton icon="restart" size={48} accessibilityLabel="Reset timer" onPress={onReset} haptic="select" />}
          {tm && (
            <PopButton
              label="Stop"
              size="small"
              color={pop.white}
              onPress={onStop}
              accessibilityLabel={tm.status === 'ringing' ? 'Stop alarm' : 'Stop timer'}
              haptic="select"
              faceStyle={styles.stopFace}
            />
          )}
        </View>
      </PopCard>
    </Animated.View>
  );
}

/** A timer from another step: a small pill with the time left. Tap it to go back to its step. */
function TimerPill({ timer: tm, now, here, onPress, onStop }: { timer: CookTimer; now: number; here: boolean; onPress: () => void; onStop: () => void }) {
  const t = useTheme();
  const ringing = tm.status === 'ringing';
  const where = here ? `Step ${tm.step}` : tm.recipeTitle;
  const text = ringing ? `Time’s up · ${where}` : tm.status === 'done' ? `Done · ${where}` : `${clock(secondsLeft(tm, now))} · ${where}`;
  return (
    <Animated.View entering={FadeInUp.duration(200)} layout={LinearTransition} style={[styles.pill, { backgroundColor: ringing ? pop.tomato : pop.white }]}>
      <PressableScale onPress={onPress} disabled={!here} accessibilityLabel={`${text}${here ? '. Go to that step' : ''}`} style={styles.pillMain} testID="timer-pill">
        <Icon name="timer" size={15} color={pop.ink} weight="bold" />
        <Text style={[t.type.footnote, { color: pop.ink, fontFamily: fonts.black, fontVariant: ['tabular-nums'], flexShrink: 1 }]}>
          {text}
        </Text>
      </PressableScale>
      {(ringing || tm.status === 'done') && (
        <PressableScale onPress={onStop} accessibilityLabel={ringing ? 'Stop alarm' : 'Dismiss timer'} style={styles.pillStop}>
          <Icon name="close" size={13} color={pop.ink} weight="bold" />
        </PressableScale>
      )}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Finish                                                               */
/* ------------------------------------------------------------------ */

type ProgressInput = Parameters<typeof xpFor>[0];

/**
 * The best moment in the app: sunshine, a little confetti, the dish in a circle, your streak and
 * XP, how it tasted, and a photo of your plate. Everything is saved with the cooking-history entry.
 */
function Finish({
  recipe,
  recipeTitle,
  servings,
  entry,
  progressInput,
  onRate,
  onPhoto,
  onDone,
}: {
  recipe: NonNullable<ReturnType<ReturnType<typeof useStore>['getRecipe']>>;
  recipeTitle: string;
  servings: number;
  entry: { date: string; xpBefore: number; levelBefore: number } | null;
  progressInput: ProgressInput;
  onRate: (r: Rating) => void;
  onPhoto: (uri: string) => void;
  onDone: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [rating, setRating] = useState<Rating | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const celebrated = useRef(false);
  useEffect(() => {
    if (celebrated.current) return;
    celebrated.current = true;
    haptics.success();
    playSuccess();
  }, []);

  const streak = progressInput.streak;
  const xpNow = xpFor(progressInput);
  const lvl = levelFor(xpNow);
  const gained = entry ? Math.max(0, xpNow - entry.xpBefore) : 0;
  const leveledUp = !!entry && lvl.level > entry.levelBefore;

  const snap = async () => {
    try {
      const uri = await takePhoto();
      if (!uri) return;
      setPhoto(uri);
      onPhoto(uri);
      haptics.success();
      toast({ message: 'Photo saved to your cooking history', icon: 'camera' });
    } catch {
      toast({ message: 'Couldn’t open the camera or your photos', tone: 'warning' });
    }
  };

  const RATINGS: { value: Rating; label: string }[] = [
    { value: 'meh', label: 'Meh' },
    { value: 'yum', label: 'Good' },
    { value: 'amazing', label: 'Loved it' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Confetti />
      <ScrollView contentContainerStyle={[styles.finish, { paddingTop: Math.max(insets.top, 16) + 28, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.finishTop}>
          {/* The dish in a 200pt circle, centered: the frame carries the border and clips; the photo is
              3pt smaller all round. With the character on, it says "Chef's kiss!" beside it. */}
          <Lift radius={100}>
            <View style={styles.finishPhoto}>
              {photo ? <Image source={{ uri: photoUri(photo) }} style={[StyleSheet.absoluteFill, { borderRadius: 97 }]} contentFit="cover" accessibilityLabel="Your photo of the dish" /> : <RecipePhoto recipe={recipe} iconSize={56} radius={97} />}
            </View>
          </Lift>
          {SHOW_MASCOT_PLACEHOLDER && <MascotSlot message="Chef’s kiss!" size={56} />}
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(380).delay(120)} style={{ alignItems: 'center', gap: 6 }}>
          <Text style={[styles.finishTitle, { color: pop.ink }]} accessibilityRole="header">
            You made it!
          </Text>
          <Text style={[t.type.body, t.noWidows.style, { color: pop.ink, textAlign: 'center' }]} {...t.noWidows.props} testID="finish-sub">
            {recipeTitle} for {servings}.
          </Text>
        </Animated.View>

        {/* Rewards: your streak and XP, from the app's real progress */}
        <Animated.View entering={FadeInUp.duration(380).delay(220)} style={styles.rewards}>
          <PopCard style={{ flex: 1 }} contentStyle={[styles.reward, { flexGrow: 1 }]}>
            <Icon name="flameFill" size={26} color={pop.tomato} />
            <Text style={[t.type.title2, { color: pop.ink }]} testID="finish-streak">
              {nb(streak, streak === 1 ? 'day' : 'days')}
            </Text>
            <Text style={[t.type.caption1, { color: pop.inkMuted }]}>cooking streak</Text>
          </PopCard>
          {/* What actually happened this cook: XP earned, and how close the next level is. Only a
              level-up from this cook turns the card into "unlocked!". */}
          <PopCard style={{ flex: 1 }} color={leveledUp ? pop.lilac : pop.white} contentStyle={[styles.reward, { flexGrow: 1 }]}>
            <Icon name={leveledUp ? 'crown' : 'sparkles'} size={26} color={pop.ink} weight="bold" />
            <Text style={[t.type.title2, { color: pop.ink, textAlign: 'center' }]} testID="finish-xp">
              {leveledUp ? `LEVEL\u00A0${lvl.level}` : `+${nb(gained, 'XP')}`}
            </Text>
            {leveledUp ? (
              <Text style={[t.type.caption1, { color: pop.ink, textAlign: 'center' }]}>{`${lvl.title}\u00A0—\u00A0unlocked!`}</Text>
            ) : (
              <View style={{ alignSelf: 'stretch', gap: 4 }}>
                <ProgressBar value={lvl.progress} color={pop.lilac} height={8} label="Progress to the next level" />
                <Text style={[t.type.caption1, { color: pop.inkMuted, textAlign: 'center' }]}>{lvl.next ? `${nb(lvl.toNext, 'XP')} to ${lvl.next.title}` : 'Top level'}</Text>
              </View>
            )}
          </PopCard>
        </Animated.View>

        {/* How'd it taste? Saved with this meal in your history. */}
        <Animated.View entering={FadeInUp.duration(380).delay(320)} style={{ gap: 10, alignSelf: 'stretch' }}>
          <Text style={[t.type.title3, { color: pop.ink, textAlign: 'center' }]}>How’d it taste?</Text>
          <View style={styles.ratings} accessibilityRole="radiogroup" accessibilityLabel="How it tasted">
            {RATINGS.map((r) => (
              <RatingButton
                key={r.value}
                label={r.label}
                selected={rating === r.value}
                onPress={() => {
                  setRating(r.value);
                  onRate(r.value);
                }}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(380).delay(400)} style={{ gap: 6, alignSelf: 'stretch' }}>
          <PopButton label={photo ? 'Change photo' : 'Snap your plate'} icon="camera" color={pop.ink} textColor={pop.white} onPress={snap} accessibilityLabel={photo ? 'Change the photo of your plate' : 'Snap a photo of your plate'} />
          <PressableScale onPress={onDone} accessibilityLabel={rating || photo ? 'Done, back to Home' : 'Maybe later, back to Home'} style={styles.later} testID="finish-done">
            <Text style={[t.type.button, { color: pop.ink, textDecorationLine: 'underline' }]}>{rating || photo ? 'Done' : 'Maybe later'}</Text>
          </PressableScale>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/** One of three equal rating buttons. Selected: berry, pressed in (no shadow). */
function RatingButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Lift radius={16} offset={3} pressed={selected} style={{ flex: 1 }}>
      <Pressable
        onPress={() => {
          haptics.select();
          onPress();
        }}
        accessibilityRole="radio"
        aria-checked={selected}
        accessibilityLabel={label}
        style={[styles.rating, { backgroundColor: selected ? pop.berry : pop.white }, selected && { transform: [{ translateY: 3 }] }]}
      >
        <Text style={styles.ratingText}>{label}</Text>
      </Pressable>
    </Lift>
  );
}

/** Six little shapes in the app's colors, each with an ink outline. They drop in once; still with Reduce Motion. */
// Only at the left and right edges, beside the 200pt photo and above the title, so they never
// cover either.
const CONFETTI = [
  { left: '4%', top: 30, size: 18, round: false, rotate: '-18deg', color: pop.tomato },
  { left: '88%', top: 22, size: 16, round: true, rotate: '0deg', color: pop.sky },
  { left: '9%', top: 120, size: 14, round: true, rotate: '0deg', color: pop.berry },
  { left: '85%', top: 110, size: 20, round: false, rotate: '24deg', color: pop.leaf },
  { left: '90%', top: 190, size: 14, round: false, rotate: '40deg', color: pop.lilac },
  { left: '3%', top: 200, size: 16, round: true, rotate: '0deg', color: pop.sky },
] as const;

function Confetti() {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: Math.max(insets.top, 16) }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {CONFETTI.map((c, i) => (
        <ConfettiBit key={i} index={i} {...c} />
      ))}
    </View>
  );
}

function ConfettiBit({ index, left, top, size, round, rotate, color }: (typeof CONFETTI)[number] & { index: number }) {
  const reduceMotion = useReducedMotion();
  const drop = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) drop.set(withDelay(index * 70, withSpring(1, { damping: 11, stiffness: 140 })));
  }, [reduceMotion, drop, index]);
  return <Bit drop={drop} style={{ left, top, width: round ? size : size * 1.6, height: size, borderRadius: round ? size / 2 : 5, backgroundColor: color, transform: [{ rotate }] }} />;
}

function Bit({ drop, style }: { drop: SharedValue<number>; style: object }) {
  // Falls from above into place. Numbers only in here.
  const fall = useAnimatedStyle(() => ({ opacity: Math.min(1, drop.get() * 2), marginTop: (drop.get() - 1) * 140 }));
  return <Animated.View style={[styles.bit, style, fall]} />;
}

/* ------------------------------------------------------------------ */

/** The same duration said twice in one step ("8 minutes … 8 minutes") gets one timer. */
const uniqueTimers = (list: { label: string; seconds: number }[]) => list.filter((x, i) => list.findIndex((y) => y.label === x.label) === i);

/** First sentence of a step, short enough for the Lock Screen. */
const shortStep = (step: string) => {
  const first = step.split(/(?<=[.!?])\s/)[0] ?? step;
  return first.length > 48 ? `${first.slice(0, 46).trimEnd()}…` : first;
};

const NOTE_KEY = 'pantry-pop-timer-note-seen';

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10, gap: 10 },
  readyPill: { minHeight: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 2.5, borderColor: pop.ink, justifyContent: 'center' },
  segments: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 4 },
  // A full 44pt tap area around each 12pt segment.
  segmentTap: { flex: 1, height: 44, marginVertical: -12, justifyContent: 'center' },
  segment: { height: 12, borderRadius: 6, borderWidth: 2, borderColor: pop.ink },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginTop: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 2, borderColor: pop.ink, paddingLeft: 12, paddingRight: 4, minHeight: 36 },
  pillMain: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingRight: 8 },
  pillStop: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: 16, paddingBottom: 140, width: '100%', maxWidth: 640, alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tileShadow: { position: 'absolute', left: 0, right: 0, top: 5, bottom: 0, borderRadius: 20, backgroundColor: pop.ink },
  // At least 92 tall; a long name makes the tile (and its row partner) taller instead of being cut.
  tile: { flex: 1, minHeight: 92, borderRadius: 20, borderWidth: 2.5, borderColor: pop.ink, padding: 12, justifyContent: 'space-between', gap: 8, borderCurve: 'continuous' },
  tileEmpty: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: pop.ink },
  tileCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: pop.ink, backgroundColor: pop.white, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, color: pop.ink },
  stepCard: { paddingHorizontal: 20, paddingTop: 36, paddingBottom: 20, gap: 16 },
  stepBadge: { position: 'absolute', top: -26, left: 18, width: 50, height: 50, borderRadius: 25, borderWidth: 2.5, borderColor: pop.ink, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: fonts.headingSemi, fontSize: 30, lineHeight: 38 },
  // Long steps (over 120 characters) a little smaller; the step area scrolls if it still doesn't fit.
  stepTextLong: { fontSize: 26, lineHeight: 33 },
  stepChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tip: { borderWidth: 2, borderStyle: 'dashed', borderColor: pop.ink, borderRadius: 18, padding: 14 },
  timerFace: { gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  timerClock: { fontFamily: fonts.heading, fontSize: 40, lineHeight: 46, fontVariant: ['tabular-nums'] },
  timerBtns: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stopFace: { minHeight: 48, paddingHorizontal: 18 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16, backgroundColor: pop.white, borderWidth: 2.5, borderBottomWidth: 0, borderColor: pop.ink },
  sheetHead: { flexDirection: 'row', alignItems: 'center' },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  finish: { paddingHorizontal: 20, gap: 22, alignItems: 'center', width: '100%', maxWidth: 560, alignSelf: 'center' },
  finishTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, alignSelf: 'stretch' },
  finishPhoto: { width: 200, height: 200, borderRadius: 100, borderWidth: 3, borderColor: pop.ink, backgroundColor: pop.white, overflow: 'hidden' },
  finishTitle: { fontFamily: fonts.heading, fontSize: 42, lineHeight: 48, textAlign: 'center' },
  rewards: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  reward: { alignItems: 'center', gap: 2, paddingVertical: 14, paddingHorizontal: 10 },
  ratings: { flexDirection: 'row', gap: 10 },
  rating: { minHeight: 48, paddingHorizontal: 8, borderRadius: 16, borderWidth: 2.5, borderColor: pop.ink, alignItems: 'center', justifyContent: 'center' },
  ratingText: { fontFamily: fonts.black, fontSize: 16, lineHeight: 21, color: pop.ink, textAlign: 'center' },
  later: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  bit: { position: 'absolute', borderWidth: 2, borderColor: pop.ink },
});
