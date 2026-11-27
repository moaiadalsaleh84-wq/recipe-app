import { useKeepAwake } from 'expo-keep-awake';
import { withProfiler } from '../../lib/devProfiler';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../components/Text';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  Easing,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomBar } from '../../components/BottomBar';
import { BottomSheet } from '../../components/BottomSheet';
import { ConfettiBurst } from '../../components/ConfettiBurst';
import { EASE_CUBIC, enter, pressIn, pressOut, spring, uiEase } from '../../motion';
import { scheduleOnRN } from 'react-native-worklets';
import { rollBonus, type Bonus } from '../../lib/bonus';
import { stickers } from '../../data/stickers';
import { todayIndex, useTonightPick } from '../../lib/tonightPick';
import { Icon } from '../../components/Icon';
import { PressableScale } from '../../components/PressableScale';
import { useToast } from '../../components/Toast';
import { Lift, MascotSlot, PopButton, PopCard, PopChip, PopIconButton, SHOW_MASCOT_PLACEHOLDER } from '../../components/pop';
import { AnimatedNumber, CheckCircle, DrawnCheck, EmptyState, ProgressBar, TextButton } from '../../components/ui';
import type { Ingredient, Rating, Recipe } from '../../data/mock';
import { clock, isReady, secondsLeft, type CookTimer } from '../../lib/cookTimers';
import { haptics } from '../../lib/haptics';
import { takePhoto } from '../../lib/photos';
import { levelFor, streakOf, xpFor } from '../../lib/progress';
import { playSuccess } from '../../lib/sounds';
import { keepTogether, nb } from '../../lib/text';
import { ingredientsInStep, splitTip, warnStepProblems } from '../../lib/steps';
import { durationLabel, findTimers } from '../../lib/timers';
import { convertStepText } from '../../lib/units';
import { amountFor, ingredientLabel } from '../../lib/scale';
import { mergeSameIngredients } from '../../lib/groceries';
import { useStore } from '../../state/store';
import { useTimers } from '../../state/timers';
import { fonts, pop, popCycle, useTheme } from '../../theme';
import { PhotoFrame } from '../../components/PhotoFrame';
import { FoxMascot } from '../../components/mascot/FoxMascot';

type FinishEntry = { date: string; xpBefore: number; levelBefore: number; bonus: Bonus };

function CookMode() {
  const t = useTheme();
  const params = useLocalSearchParams<{ id: string; servings?: string; step?: string }>();
  const { getRecipe, profile } = useStore();
  const recipe = getRecipe(params.id);
  if (!recipe) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.colors.background }}>
        <EmptyState icon="fork" title="Oops, that recipe’s gone" message="It may have been removed." action={{ label: 'Close', onPress: () => router.back() }} />
      </View>
    );
  }
  // Opened from the recipe page with its servings; from anywhere else (Home, You, a reminder), sized
  // for your household like the recipe page.
  return <CookSession key={recipe.id} recipe={recipe} servings={Number(params.servings) || profile.household || recipe.servings || 1} startStep={Number(params.step) || 0} />;
}

/** A step's text as separate sentences ("Heat the oil. Add the onion." → two lines). */
function stepLines(text: string) {
  const lines = text.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/).map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines : [text];
}

function CookSession({ recipe, servings, startStep = 0 }: { recipe: Recipe; servings: number; startStep?: number }) {
  // The screen stays on while you cook. Leaving quickly can deactivate before activation finishes; that's harmless.
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const store = useStore();
  const { units, logCooked, rateCooked, setCookedPhoto, cooked, customRecipes, plan, favorites, fun, claimBonus } = store;

  // Opened from another recipe's timer pill: straight to that timer's step.
  const [page, setPage] = useState(() => Math.min(Math.max(0, startStep), recipe.steps.length)); // 0 = get ready, 1..n = steps, n+1 = finish
  // Kept for the whole cook: going back never resets what you've set out.
  const [gathered, setGathered] = useState<Record<string, boolean>>({});
  const [listOpen, setListOpen] = useState(false);
  // Which way the last move went, so the next step slides in from the right side.
  const [forward, setForward] = useState(true);
  // The cooking-history entry made when you finish, and your XP and level just before it.
  const [entry, setEntry] = useState<FinishEntry | null>(null);
  // Timers live app-wide (src/state/timers.tsx): they keep going outside Cook Mode and ring when the app is closed.
  const { timers, now, support, start, pause, resume, reset, stop, addTime } = useTimers();

  const steps = recipe?.steps ?? [];
  const last = steps.length + 1;

  // In development: point out recipe text Cook Mode can't link to its ingredients.
  useEffect(() => {
    // Checked recipes list step ingredients by id, so the text-matching warnings don't apply.
    if (recipe && recipe.source !== 'pantry-pop') warnStepProblems(recipe.title, recipe.steps, recipe.ingredients);
  }, [recipe]);

  // Swipe the step card: left = next step, right = previous (as well as the buttons). Horizontal only,
  // so scrolling up and down still works. Calls go() through a ref, so it always sees this render's state.
  const swipeTo = useRef<(dir: 1 | -1) => void>(() => {});
  const reduceMotion = useReducedMotion();
  const drag = useSharedValue(0);
  const onSwipe = useCallback((dir: 1 | -1) => swipeTo.current(dir), []);
  const swipe = usePanGesture({
    activeOffsetX: [-24, 24],
    failOffsetY: [-14, 14],
    onUpdate: (e) => {
      'worklet';
      drag.set(e.translationX);
    },
    onDeactivate: (e) => {
      'worklet';
      const far = Math.abs(e.translationX) > 60 || Math.abs(e.velocityX) > 500;
      if (far) {
        // Committed: the card resets at once and only the new step slides in (no two motions fighting).
        drag.set(0);
        scheduleOnRN(onSwipe, e.translationX < 0 ? 1 : -1);
      } else {
        // Not far enough: spring back, carrying the finger's speed.
        drag.set(withSpring(0, { duration: 300, dampingRatio: 1, velocity: e.velocityX }));
      }
    },
  });
  // Follows the finger with a little resistance and tilt. Numbers only in here (UI thread).
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateX: drag.get() * 0.6 }, { rotate: `${drag.get() * 0.02}deg` }] }));

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
      // The one small surprise for finishing (see lib/bonus.ts): a tip, double XP, or a new sticker.
      const bonus = rollBonus(recipe, fun.stickers ?? [], Math.random(), Math.random());
      if (bonus.kind === 'lucky') claimBonus({ xp: bonus.xp });
      if (bonus.kind === 'sticker') claimBonus({ sticker: bonus.id });
      setEntry({ date, xpBefore, levelBefore: levelFor(xpBefore).level, bonus });
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

  /** "300 g chicken breast", scaled and in your units. */
  const amountOf = (ing: Ingredient) => {
    const shown = amountFor(ing, servings, recipe.servings, units);
    return `${shown.text} ${ingredientLabel(ing.name, shown)}`.trim();
  };
  /** The tile's two lines: "Cooked rice" (sentence case, like the recipe) and "400 g". */
  const partsOf = (ing: Ingredient, total = false) => {
    const shown = amountFor(ing, servings, recipe.servings, units);
    const name = ingredientLabel(ing.name, shown);
    return { name: name.charAt(0).toUpperCase() + name.slice(1), qty: total && shown.text ? `${shown.text} total` : shown.text };
  };
  // The same ingredient listed twice (salt for the chicken, salt for the flour) is one thing to set
  // out: one tile with the total. The steps keep both lines.
  const gatherTiles = useMemo(() => mergeSameIngredients(recipe.ingredients), [recipe.ingredients]);
  // A line in the ingredients sheet ticks the tile it was merged into.
  const tileOf = useMemo(() => Object.fromEntries(gatherTiles.flatMap((g) => g.lines.map((l) => [l, g.key]))), [gatherTiles]);
  const toggleGathered = (key: string) => {
    const next = { ...gathered, [key]: !gathered[key] };
    setGathered(next);
    // The last one set out: a small "ready" moment.
    if (!gathered[key] && gatherTiles.every((g) => next[g.key])) haptics.success();
  };
  const setOut = gatherTiles.filter((g) => gathered[g.key]).length;
  const allOut = setOut === gatherTiles.length;
  // Ingredient pills ticked off as they go in the pan (any step).
  const [used, setUsed] = useState<Record<string, boolean>>({});
  // "I've got everything": ticks every tile at once (or unticks them all again).
  const gatherAll = () => {
    setGathered(Object.fromEntries(gatherTiles.map((g) => [g.key, !allOut])));
    if (allOut) haptics.tap();
    else haptics.success();
  };

  const onStep = page >= 1 && page <= steps.length;
  // Checked recipe text already gives °C and °F: shown exactly as written.
  const stepText = onStep ? (recipe.source === 'pantry-pop' ? steps[page - 1] : convertStepText(steps[page - 1], units)) : '';
  const { main, tip } = splitTip(stepText);
  // Checked recipe data lists each step's ingredients and timer itself (its step text has no amounts,
  // on purpose); older recipes find them in the step text.
  const meta = onStep ? recipe.stepMeta?.[page - 1] : undefined;
  const inStep = !onStep ? [] : meta ? meta.ingredientIds.map((id) => recipe.ingredients.find((i) => i.id === id)).filter((i): i is Ingredient => !!i) : ingredientsInStep(steps[page - 1], recipe.ingredients);
  const stepTimers = !onStep ? [] : meta ? (meta.timerSeconds ? [{ label: durationLabel(meta.timerSeconds), seconds: meta.timerSeconds }] : []) : uniqueTimers(findTimers(stepText));
  const timerFor = (label: string) => timers.find((tm) => tm.recipeId === recipe.id && tm.step === page && tm.label === label);
  // This recipe's timers from other steps float as small pills, so you never lose them. Timers
  // from other recipes don't show here.
  const floating = timers.filter((tm) => tm.recipeId === recipe.id && !(tm.step === page && stepTimers.some((s) => s.label === tm.label)));
  const color = onStep ? popCycle[(page - 1) % popCycle.length] : popCycle[0];
  const bg = page === 0 ? pop.sunshineTint : page === last ? pop.sunshine : color.tint;

  useEffect(() => {
    swipeTo.current = (dir) => {
      if (onStep) go(page + dir);
    };
  });

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
            {/* Centered on the screen, not between the buttons. */}
            <View style={[StyleSheet.absoluteFill, styles.headerCenter, { top: Math.max(insets.top, 12) + 4 }]} pointerEvents="none">
              {page === 0 ? (
                <View style={[styles.readyPill, { backgroundColor: setOut === gatherTiles.length ? pop.leaf : pop.white }]}>
                  {setOut === gatherTiles.length ? (
                    <Text style={[t.type.headline, { color: pop.ink, fontFamily: fonts.black }]} testID="gather-count">
                      Everything’s ready
                    </Text>
                  ) : (
                    // Plain centred text (the animated number field could sit off-centre on iPhone).
                    <Text style={[t.type.headline, { color: pop.ink, fontFamily: fonts.black, textAlign: 'center', fontVariant: ['tabular-nums'] }]} testID="gather-count">
                      {setOut} of {gatherTiles.length} ready
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={[t.type.title3, { color: pop.ink }]} testID="cook-progress">
                  Step {page} of {steps.length}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }} />
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
                  <Segment state={i + 1 < page ? 'done' : i + 1 === page ? 'current' : 'todo'} />
                </PressableScale>
              ))}
            </View>
          )}

          {/* Timers from this recipe's other steps, as small floating pills */}
          {floating.length > 0 && (
            <View style={styles.pills}>
              {floating.map((tm) => (
                <TimerPill key={tm.id} timer={tm} now={now} here={tm.recipeId === recipe.id} onPress={() => (tm.recipeId === recipe.id ? go(tm.step) : router.push({ pathname: '/cook/[id]', params: { id: tm.recipeId, step: String(tm.step) } }))} onStop={() => stop(tm.id)} />
              ))}
            </View>
          )}

          <ScrollView style={{ flex: 1 }} contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} contentContainerStyle={styles.content}>
            {page === 0 && (
              <Animated.View key="gather" entering={uiEase((forward ? FadeInRight : FadeInLeft).duration(240))} style={{ gap: 18 }}>
                <View style={{ gap: 4 }}>
                  <Text style={[t.type.largeTitle, { color: pop.ink }]} accessibilityRole="header">
                    Grab your stuff
                  </Text>
                  <Text style={[t.type.body, { color: pop.inkMuted }]}>Tap each one as it lands on the counter.</Text>
                </View>
                <PopChip label={allOut ? 'Untick all' : 'I’ve got everything'} icon={allOut ? 'undo' : 'check'} onPress={gatherAll} accessibilityLabel={allOut ? 'Untick every ingredient' : 'Tick every ingredient'} style={{ alignSelf: 'flex-start' }} />
                <MascotSlot
                  message={
                    setOut === gatherTiles.length
                      ? 'Everything’s here. Let’s go!'
                      : setOut >= Math.ceil(gatherTiles.length / 2) && setOut > 0
                        ? 'Halfway there!'
                        : 'Let’s gather everything!'
                  }
                />
                <View style={styles.grid}>
                  {gatherTiles.map(({ key, item, parts }) => (
                    <GatherTile key={key} {...partsOf(item, parts > 1)} checked={!!gathered[key]} onPress={() => toggleGathered(key)} />
                  ))}
                </View>
              </Animated.View>
            )}

            {onStep && (
              <Animated.View key={page} entering={uiEase((forward ? FadeInRight : FadeInLeft).duration(240))} style={{ gap: 16 }}>
                {/* The step: a big card with its number sitting on the top edge. Swipe it to move between steps. */}
                <GestureDetector gesture={swipe}>
                <Animated.View style={reduceMotion ? undefined : dragStyle}>
                <PopCard clip={false} style={{ marginTop: 26 }} contentStyle={styles.stepCard}>
                  <View style={[styles.stepBadge, { backgroundColor: color.fill }]} accessibilityElementsHidden>
                    <Text style={[t.type.title2, { color: pop.ink }]}>{page}</Text>
                  </View>
                  {/* One sentence per line: easy to find your place at arm's length. */}
                  <View style={{ gap: 10 }} testID="cook-step" accessible accessibilityRole="header" accessibilityLabel={main}>
                    {stepLines(main).map((line, i) => (
                      <Text key={i} style={[styles.stepText, stepSize(main), t.noWidows.style, { color: pop.ink }]} {...t.noWidows.props}>
                        {keepTogether(line)}
                      </Text>
                    ))}
                  </View>
                  {inStep.length > 0 && (
                    <View style={styles.stepChips} testID="in-step" accessibilityLabel={`In this step: ${inStep.map(amountOf).join(', ')}`}>
                      {/* Tap one once it's in the pan: it gets a check (tap again to undo). */}
                      {inStep.map((ing) => (
                        <PopChip
                          key={ing.id}
                          label={amountOf(ing)}
                          color={color.tint}
                          small
                          selected={!!used[ing.id]}
                          onPress={() => setUsed((u) => ({ ...u, [ing.id]: !u[ing.id] }))}
                          accessibilityLabel={`${amountOf(ing)}${used[ing.id] ? ', used' : ''}. Tap to mark ${used[ing.id] ? 'not used' : 'as used'}`}
                        />
                      ))}
                    </View>
                  )}
                </PopCard>
                </Animated.View>
                </GestureDetector>

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
                      onAddMinute={() => tm && addTime(tm.id, 60)}
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

          {/* Footer: back + the one big button, under the scroll view (never over it). */}
          <BottomBar color={bg}>
            {page === 0 ? (
              <PopButton label="Start cooking" iconRight="arrowRight" onPress={() => go(1)} accessibilityLabel="Start the first step" style={{ flex: 1 }} />
            ) : (
              <>
                <PopIconButton icon="back" size={56} iconSize={22} accessibilityLabel="Previous step" onPress={() => go(page - 1)} haptic={null} />
                <PopButton
                  label={page === steps.length ? 'Finish!' : 'Next step'}
                  iconRight={page === steps.length ? 'check' : 'arrowRight'}
                  onPress={() => go(page + 1)}
                  accessibilityLabel={page === steps.length ? 'Finish cooking' : 'Next step'}
                  haptic={null}
                  style={{ flex: 1 }}
                />
              </>
            )}
          </BottomBar>
        </>
      )}

      {/* Every ingredient, any time, without leaving the step */}
      {/* Slides up; slides back down on ✕, a tap outside, or dragging it down. */}
      <BottomSheet visible={listOpen} onClose={() => setListOpen(false)} style={{ paddingBottom: Math.max(insets.bottom, 16) }} accessibilityLabel="Ingredients">
        {(closeSheet) => (
        <>
          <View style={styles.sheetHead}>
            <Text style={[t.type.title2, { color: pop.ink, flex: 1 }]} accessibilityRole="header">
              Ingredients
            </Text>
            <PopIconButton icon="close" accessibilityLabel="Close ingredients" onPress={closeSheet} />
          </View>
          <Text style={[t.type.subhead, { color: pop.inkMuted, marginBottom: 8 }]}>
            For {servings} {servings === 1 ? 'person' : 'people'}
          </Text>
          <ScrollView style={{ maxHeight: 420 }}>
            {recipe.ingredients.map((ing, i) => {
              const key = tileOf[`${ing.id}-${i}`] ?? `${ing.id}-${i}`;
              return (
                <PressableScale
                  key={`${ing.id}-${i}`}
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
        </>
        )}
      </BottomSheet>
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
function GatherTile({ name, qty, checked, onPress }: { name: string; qty: string; checked: boolean; onPress: () => void }) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    // Down onto its shadow (120 ms) when ticked, back up (160 ms) when unticked. No bounce.
    pressed.set(reduceMotion ? (checked ? 1 : 0) : withTiming(checked ? 1 : 0, checked ? pressIn : pressOut));
  }, [checked, reduceMotion, pressed]);
  // Numbers only in here: this runs on the UI thread.
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: pressed.get() * 3 }] }));
  const { width } = useWindowDimensions();
  const tileWidth = (Math.min(width, 640) - 40 - 12) / 2;
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      accessibilityRole="checkbox"
      aria-checked={checked}
      accessibilityLabel={qty ? `${qty} ${name}` : name}
      style={{ width: tileWidth, paddingBottom: 5 }}
    >
      <View style={styles.tileShadow} />
      <Animated.View style={[styles.tile, { backgroundColor: checked ? pop.leaf : pop.white }, face]}>
        {checked ? (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(150)} style={styles.tileCheck}>
            <DrawnCheck size={16} delay={60} />
          </Animated.View>
        ) : (
          <View style={styles.tileEmpty} />
        )}
        <View style={{ gap: 2 }}>
          {/* Full names, never cut ("Boneless skinless chicken thighs" takes 3 lines). */}
          <Text style={styles.tileName} numberOfLines={5}>
            {name}
          </Text>
          {qty ? (
            // Muted grey only on white; ink on the green of a ticked tile (contrast).
            <Text style={[styles.tileQty, checked && { color: pop.ink }]} numberOfLines={1}>
              {qty}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Timers                                                               */
/* ------------------------------------------------------------------ */

/**
 * The step's timer: a tomato card. Row 1: the big time and its status (Ready, Running, Stopped,
 * Done!), always in full. Row 2: the controls, 48pt each: Play, or Stop while it runs (freezes the time
 * left; Play carries on), Reset, and Stop to silence the alarm when it's done. It never starts on its own.
 */
function TimerCard({ seconds, timer: tm, now, first, onStart, onPause, onResume, onReset, onStop, onAddMinute }: { seconds: number; timer?: CookTimer; now: number; first: boolean; onStart: () => void; onPause: () => void; onResume: () => void; onReset: () => void; onStop: () => void; onAddMinute: () => void }) {
  const t = useTheme();
  const length = durationLabel(seconds);
  const done = tm?.status === 'ringing' || tm?.status === 'done';
  const ready = !tm || isReady(tm);
  const running = tm?.status === 'running';
  const left = tm ? secondsLeft(tm, now) : seconds;
  const status = done ? 'Ding! Time’s up' : ready ? 'Ready' : running ? 'Running' : 'Stopped';
  const reduceMotion = useReducedMotion();
  // A bar that drains smoothly: each second it glides (linear, on the UI thread) to the next value.
  // Against the timer's own length (it grows with "+1 min").
  const full = tm?.total ?? seconds;
  const drain = useSharedValue(left / full);
  useEffect(() => {
    const to = done ? 0 : Math.max(0, Math.min(1, left / full));
    drain.set(running && !reduceMotion ? withTiming(to, { duration: 1000, easing: Easing.linear }) : to);
  }, [left, full, running, done, reduceMotion, drain]);
  const drainStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: drain.get() }] }));
  // Time's up: a success buzz and the card glows softly once (opacity, no scaling).
  const pulse = useSharedValue(1);
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) {
      haptics.success();
      if (!reduceMotion) pulse.set(withSequence(withTiming(0.7, { duration: 0 }), withTiming(1, { duration: 400, easing: EASE_CUBIC })));
    }
    wasDone.current = done;
  }, [done, reduceMotion, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <Animated.View entering={FadeIn} layout={LinearTransition} style={pulseStyle}>
      <PopCard color={tm?.status === 'done' ? pop.tomatoTint : pop.tomato} contentStyle={styles.timerFace} testID={tm?.status === 'done' ? 'timer-finished-away' : undefined}>
        <View accessible accessibilityRole={tm?.status === 'ringing' ? 'alert' : undefined} accessibilityLabel={`${length} timer. ${status}${done ? '' : `, ${clock(left)} left`}`}>
          <Text style={[styles.timerClock, { color: pop.ink }]} testID={first ? (done ? 'timer-done' : 'timer-display') : undefined}>
            {done ? '0:00' : clock(left)}
          </Text>
          {!ready && (
            <View style={styles.drainTrack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Animated.View style={[styles.drainFill, drainStyle]} />
            </View>
          )}
          <Text style={[t.type.headline, { color: pop.ink }]} testID={first ? 'timer-label' : undefined}>
            {status} · {length}
          </Text>
        </View>
        <View style={styles.timerBtns}>
          {/* Ready or stopped: Play. Running: Stop, which freezes the time where it is (Play carries on). */}
          {!done && !running && <PopIconButton icon="play" size={48} accessibilityLabel={ready ? `Start a ${length} timer` : 'Resume timer'} onPress={!tm ? onStart : onResume} haptic={ready ? null : 'select'} />}
          {running && <PopButton label="Stop" icon="pause" size="small" color={pop.white} onPress={onPause} accessibilityLabel="Stop timer" accessibilityHint="Keeps the time left. Play carries on." haptic="select" faceStyle={styles.stopFace} />}
          {tm && !done && !ready && <PopIconButton icon="restart" size={48} accessibilityLabel="Reset timer" onPress={onReset} haptic="select" />}
          {/* +1 min: running, stopped or just rung (it starts again with one more minute). */}
          {tm && !ready && <PopButton label="+1 min" size="small" color={pop.white} onPress={onAddMinute} accessibilityLabel="Add one minute" haptic="select" testID={first ? 'timer-plus-minute' : undefined} />}
          {/* Time's up: Stop silences the alarm. */}
          {done && <PopButton label="Stop" size="small" color={pop.white} onPress={onStop} accessibilityLabel={tm?.status === 'ringing' ? 'Stop alarm' : 'Clear timer'} haptic="select" faceStyle={styles.stopFace} />}
        </View>
      </PopCard>
    </Animated.View>
  );
}

/** A timer from another step or recipe: a small pill with the time left. Tap it to go to its step. */
function TimerPill({ timer: tm, now, here, onPress, onStop }: { timer: CookTimer; now: number; here: boolean; onPress: () => void; onStop: () => void }) {
  const t = useTheme();
  const ringing = tm.status === 'ringing';
  const where = here ? `Step ${tm.step}` : tm.recipeTitle;
  const text = ringing ? `Time’s up · ${where}` : tm.status === 'done' ? `Done · ${where}` : `${clock(secondsLeft(tm, now))} · ${where}`;
  return (
    <Animated.View entering={FadeInUp.duration(200)} layout={LinearTransition} style={[styles.pill, { backgroundColor: ringing ? pop.tomato : pop.white }]}>
      <PressableScale onPress={onPress} accessibilityLabel={`${text}. Go to that step`} style={styles.pillMain} testID="timer-pill">
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
  entry: FinishEntry | null;
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
  const { setMeal } = useStore();
  const { tomorrow: tomorrowPick, picks } = useTonightPick();
  // Tomorrow's idea, never the dish you just made.
  const tomorrow = [tomorrowPick, ...picks].find((p) => p && p.recipe.id !== recipe.id);
  const tomorrowIndex = (todayIndex() + 1) % 7;
  const [planned, setPlanned] = useState(false);
  const celebrated = useRef(false);
  useEffect(() => {
    if (celebrated.current) return;
    celebrated.current = true;
    haptics.success();
    playSuccess();
  }, []);

  const reduceMotion = useReducedMotion();
  const streak = progressInput.streak;
  // Did this cook make the streak go up? (The first meal of the day does.) Then the flame flares once.
  const streakBefore = streakOf(progressInput.cooked.filter((c) => c.date !== entry?.date).map((c) => c.date));
  const streakUp = streak > streakBefore;
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
      toast({ message: 'Looking good! Photo saved.', icon: 'camera' });
    } catch {
      toast({ message: 'Oops, the camera wouldn’t open. Try again?', tone: 'warning' });
    }
  };

  const RATINGS: { value: Rating; label: string }[] = [
    { value: 'meh', label: 'Meh' },
    { value: 'yum', label: 'Good' },
    { value: 'amazing', label: 'Loved it' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <ConfettiBurst count={36} />
      <ScrollView contentContainerStyle={[styles.finish, { paddingTop: Math.max(insets.top, 16) + 28, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        {/* The photo fades in and settles (rises 8pt), then the cards slide up one after another. */}
        <Animated.View entering={enter(0, reduceMotion)} style={styles.finishTop}>
          {/* The dish in a 200pt circle, centered: the frame carries the border and clips; the photo is
              3pt smaller all round. With the character on, it says "Chef's kiss!" beside it. */}
          <Lift radius={100}>
            {photo ? (
              <PhotoFrame uri={photo} radius={100} accessibilityLabel="Your photo of the dish" style={styles.finishPhoto} />
            ) : (
              <PhotoFrame recipe={recipe} iconSize={56} radius={100} square style={styles.finishPhoto} />
            )}
          </Lift>
          {SHOW_MASCOT_PLACEHOLDER && <MascotSlot message="Chef’s kiss!" size={56} />}
          {/* Fox slot (Phase 2): celebrates the finished dish. */}
          <FoxMascot mood="celebration" size={120} style={{ alignSelf: 'center' }} />
        </Animated.View>

        <Animated.View entering={enter(1, reduceMotion)} style={{ alignItems: 'center', gap: 6 }}>
          <Text style={[styles.finishTitle, { color: pop.ink }]} accessibilityRole="header">
            You made it!
          </Text>
          <Text style={[t.type.body, t.noWidows.style, { color: pop.ink, textAlign: 'center' }]} {...t.noWidows.props} testID="finish-sub">
            {recipeTitle} for {servings}.
          </Text>
        </Animated.View>

        {/* Rewards: your streak and XP, from the app's real progress */}
        <View style={styles.rewards}>
          <Animated.View entering={enter(3, reduceMotion)} style={{ flex: 1 }}>
          <PopCard style={{ flex: 1 }} contentStyle={[styles.reward, { flexGrow: 1 }]}>
            <Flare active={streakUp}>
              <Icon name="flameFill" size={26} color={pop.tomato} />
            </Flare>
            <AnimatedNumber value={streak} suffix={streak === 1 ? '\u00A0day' : '\u00A0days'} style={[t.type.title2, { color: pop.ink }]} testID="finish-streak" />
            <Text style={[t.type.caption1, { color: pop.inkMuted }]}>cooking streak</Text>
          </PopCard>
          </Animated.View>
          <Animated.View entering={enter(4, reduceMotion)} style={{ flex: 1 }}>
          {/* What actually happened this cook: XP earned, and how close the next level is. Only a
              level-up from this cook turns the card into "unlocked!". */}
          <PopCard style={{ flex: 1 }} color={leveledUp ? pop.lilac : pop.white} contentStyle={[styles.reward, { flexGrow: 1 }]}>
            <Icon name={leveledUp ? 'crown' : 'sparkles'} size={26} color={pop.ink} weight="bold" />
            {leveledUp ? (
              <Text style={[t.type.title2, { color: pop.ink, textAlign: 'center' }]} testID="finish-xp">{`LEVEL\u00A0${lvl.level}`}</Text>
            ) : (
              <AnimatedNumber value={gained} prefix="+" suffix={'\u00A0XP'} style={[t.type.title2, { color: pop.ink, textAlign: 'center' }]} testID="finish-xp" />
            )}
            {leveledUp ? (
              <Text style={[t.type.caption1, { color: pop.ink, textAlign: 'center' }]}>{`${lvl.title.replace(/ /g, '\u00A0')}\u00A0— unlocked!`}</Text>
            ) : (
              <View style={{ alignSelf: 'stretch', gap: 4 }}>
                <ProgressBar value={lvl.progress} color={pop.lilac} height={8} label="Progress to the next level" />
                <Text style={[t.type.caption1, { color: pop.inkMuted, textAlign: 'center' }]}>{lvl.next ? `${nb(lvl.toNext, 'XP')} to ${lvl.next.title}` : 'Top level'}</Text>
              </View>
            )}
          </PopCard>
          </Animated.View>
        </View>

        {/* The surprise: a chef tip, Lucky pan (double XP) or a new sticker. */}
        {entry && (
          <Animated.View entering={enter(5, reduceMotion)} style={{ alignSelf: 'stretch' }}>
            <BonusCard bonus={entry.bonus} />
          </Animated.View>
        )}

        {/* How'd it taste? Saved with this meal in your history. */}
        <Animated.View entering={enter(5, reduceMotion)} style={{ gap: 10, alignSelf: 'stretch' }}>
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

        <Animated.View entering={enter(6, reduceMotion)} style={{ gap: 6, alignSelf: 'stretch' }}>
          <PopButton label={photo ? 'Change photo' : 'Snap your plate'} icon="camera" color={pop.ink} textColor={pop.white} onPress={snap} accessibilityLabel={photo ? 'Change the photo of your plate' : 'Snap a photo of your plate'} />
          <TextButton label={rating || photo ? 'Done' : 'Maybe later'} onPress={onDone} accessibilityLabel={rating || photo ? 'Done, back to Home' : 'Maybe later, back to Home'} color={pop.ink} style={styles.later} testID="finish-done" />
        </Animated.View>

        {/* Never a dead end: tomorrow's idea, one tap to put it in the plan. */}
        {tomorrow && (
          <Animated.View entering={enter(7, reduceMotion)} style={{ alignSelf: 'stretch' }}>
            <PopCard color={pop.white} radius={20} contentStyle={styles.tomorrow} testID="finish-tomorrow">
              {/* Photo and name share the first row (the name gets all the room left); the button
                  has its own full-width row, so it can never squeeze the name. */}
              <View style={styles.tomorrowRow}>
                <PhotoFrame recipe={tomorrow.recipe} radius={14} iconSize={20} square style={styles.tomorrowThumb} />
                <View style={styles.tomorrowText}>
                  <Text style={[t.type.caption1, { color: pop.inkMuted }]}>Tomorrow</Text>
                  <Text style={[t.type.headline, { color: pop.ink }]} numberOfLines={3}>
                    {tomorrow.recipe.title}
                  </Text>
                </View>
              </View>
              <PopButton
                label={planned ? 'Planned' : 'Add to plan'}
                icon={planned ? 'check' : 'calendar'}
                size="small"
                color={planned ? pop.leaf : pop.sunshine}
                disabled={planned}
                onPress={() => {
                  setMeal(tomorrowIndex, 'Dinner', tomorrow.recipe.id);
                  setPlanned(true);
                  toast({ message: `${tomorrow.recipe.title} is in tomorrow’s plan`, icon: 'calendar' });
                }}
                testID="finish-add-tomorrow"
                style={{ alignSelf: 'stretch' }}
              />
            </PopCard>
          </Animated.View>
        )}
      </ScrollView>
      {/* The status bar keeps the screen's color: scrolled content slides under it, not over the clock. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: pop.sunshine }} />
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
/** The after-cook surprise. Gold for Lucky pan, a sticker for a new sticker, white for a chef tip. */
function BonusCard({ bonus }: { bonus: Bonus }) {
  const t = useTheme();
  if (bonus.kind === 'lucky') {
    return (
      <PopCard color={pop.sunshine} radius={20} contentStyle={styles.bonus} testID="bonus-lucky">
        <View style={[styles.bonusIcon, { backgroundColor: pop.white }]}>
          <Icon name="pot" size={22} color={pop.ink} weight="bold" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[t.type.headline, { color: pop.ink }]}>Lucky pan! Double XP</Text>
          <Text style={[t.type.subhead, { color: pop.ink }]}>{`+${nb(bonus.xp, 'XP')} extra for this cook.`}</Text>
        </View>
      </PopCard>
    );
  }
  if (bonus.kind === 'sticker') {
    const s = stickers.find((x) => x.id === bonus.id);
    return (
      <PopCard color={pop.lilacTint} radius={20} contentStyle={styles.bonus} testID="bonus-sticker">
        <View style={[styles.bonusIcon, { backgroundColor: s ? pop[s.color] : pop.sunshine }]}>
          <Icon name={s?.icon ?? 'sparkles'} size={22} color={pop.ink} weight="bold" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[t.type.headline, { color: pop.ink }]}>New sticker: {bonus.name}!</Text>
          <Text style={[t.type.subhead, { color: pop.ink }]}>It’s in your Sticker book on the You tab.</Text>
        </View>
      </PopCard>
    );
  }
  return (
    <PopCard color={pop.skyTint} radius={20} contentStyle={styles.bonus} testID="bonus-tip">
      <View style={[styles.bonusIcon, { backgroundColor: pop.white }]}>
        <Icon name="sparkles" size={20} color={pop.ink} weight="bold" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[t.type.headline, { color: pop.ink }]}>Chef tip</Text>
        <Text style={[t.type.subhead, { color: pop.ink }]}>{bonus.tip}</Text>
      </View>
    </PopCard>
  );
}

/** One step segment: white, then it fills from the left with a spring (sunshine = this step, leaf = done). */
function Segment({ state }: { state: 'todo' | 'current' | 'done' }) {
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(state === 'todo' ? 0 : 1);
  useEffect(() => {
    const to = state === 'todo' ? 0 : 1;
    fill.set(reduceMotion ? to : withSpring(to, spring));
  }, [state, reduceMotion, fill]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0, fill.get()) }], opacity: fill.get() > 0.01 ? 1 : 0 }));
  return (
    <View testID="cook-segment" style={[styles.segment, { backgroundColor: pop.white, overflow: 'hidden' }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: state === 'done' ? pop.leaf : pop.sunshine, transformOrigin: 'left' }, style]} />
    </View>
  );
}

/** The streak flame when the streak goes up: rises 4pt and settles back, once (no scaling). */
function Flare({ active, children }: { active: boolean; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (active && !reduceMotion) p.set(withDelay(500, withSequence(withTiming(1, { duration: 160, easing: EASE_CUBIC }), withTiming(0, { duration: 260, easing: EASE_CUBIC }))));
  }, [active, reduceMotion, p]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: p.get() * -4 }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/* ------------------------------------------------------------------ */

/** The same duration said twice in one step ("8 minutes … 8 minutes") gets one timer. */
const uniqueTimers = (list: { label: string; seconds: number }[]) => list.filter((x, i) => list.findIndex((y) => y.label === x.label) === i);

/** First sentence of a step, short enough for the Lock Screen. */
/** Step text size by length: under 80 characters 28, up to 160 22, longer 19 (the page scrolls). */
const stepSize = (text: string) => (text.length < 80 ? null : text.length <= 160 ? { fontSize: 22, lineHeight: 29 } : { fontSize: 19, lineHeight: 26 });

const shortStep = (step: string) => {
  const first = step.split(/(?<=[.!?])\s/)[0] ?? step;
  return first.length > 48 ? `${first.slice(0, 46).trimEnd()}…` : first;
};

const NOTE_KEY = 'pantry-pop-timer-note-seen';

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10, gap: 10 },
  headerCenter: { bottom: 13, alignItems: 'center', justifyContent: 'center' },
  readyPill: { alignSelf: 'center', minHeight: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 2, borderColor: pop.line, alignItems: 'center', justifyContent: 'center' },
  segments: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 4 },
  // A full 44pt tap area around each 12pt segment.
  segmentTap: { flex: 1, height: 44, marginVertical: -12, justifyContent: 'center' },
  segment: { height: 12, borderRadius: 6, borderWidth: 2, borderColor: pop.line },
  bonus: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  bonusIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: pop.line, alignItems: 'center', justifyContent: 'center' },
  tomorrow: { gap: 12, padding: 12 },
  tomorrowRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tomorrowText: { flex: 1, minWidth: 0 },
  tomorrowThumb: { width: 64, height: 64 },
  drainTrack: { height: 10, borderRadius: 5, borderWidth: 2, borderColor: pop.line, backgroundColor: pop.tomatoTint, overflow: 'hidden', marginVertical: 6 },
  drainFill: { flex: 1, backgroundColor: pop.white, transformOrigin: 'left' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginTop: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 2, borderColor: pop.line, paddingLeft: 12, paddingRight: 4, minHeight: 36 },
  pillMain: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingRight: 8 },
  pillStop: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: 24, paddingBottom: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tileShadow: { position: 'absolute', left: 0, right: 0, top: 5, bottom: 0, borderRadius: 20, backgroundColor: 'transparent' },
  // At least 92 tall; a long name makes the tile (and its row partner) taller instead of being cut.
  // Same height for every tile (room for a 2-line name + the amount), text top-aligned under the circle.
  tile: { flex: 1, height: 116, borderRadius: 20, borderWidth: 2.5, borderColor: pop.line, padding: 12, justifyContent: 'flex-start', gap: 8, borderCurve: 'continuous' },
  tileEmpty: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: pop.line },
  tileCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: pop.line, backgroundColor: pop.white, alignItems: 'center', justifyContent: 'center' },
  tileName: { fontFamily: fonts.black, fontSize: 17, lineHeight: 21, color: pop.ink },
  tileQty: { fontFamily: fonts.body, fontSize: 14, lineHeight: 18, color: pop.inkMuted },
  stepCard: { paddingHorizontal: 20, paddingTop: 36, paddingBottom: 20, gap: 16 },
  stepBadge: { position: 'absolute', top: -26, left: 18, width: 50, height: 50, borderRadius: 25, borderWidth: 2.5, borderColor: pop.line, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: fonts.headingSemi, fontSize: 28, lineHeight: 35 },
  // Long steps (over 120 characters) a little smaller; the step area scrolls if it still doesn't fit.
  stepChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tip: { borderWidth: 2, borderStyle: 'dashed', borderColor: pop.line, borderRadius: 18, padding: 14 },
  timerFace: { gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  timerClock: { fontFamily: fonts.heading, fontSize: 40, lineHeight: 46, fontVariant: ['tabular-nums'] },
  timerBtns: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stopFace: { minHeight: 48, paddingHorizontal: 18 },
  sheetHead: { flexDirection: 'row', alignItems: 'center' },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
  finish: { paddingHorizontal: 20, gap: 22, alignItems: 'center', width: '100%', maxWidth: 560, alignSelf: 'center' },
  finishTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, alignSelf: 'stretch' },
  finishPhoto: { width: 200, height: 200 },
  finishTitle: { fontFamily: fonts.heading, fontSize: 42, lineHeight: 48, textAlign: 'center' },
  rewards: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  reward: { alignItems: 'center', gap: 2, paddingVertical: 14, paddingHorizontal: 10 },
  ratings: { flexDirection: 'row', gap: 10 },
  rating: { minHeight: 48, paddingHorizontal: 8, borderRadius: 16, borderWidth: 2.5, borderColor: pop.line, alignItems: 'center', justifyContent: 'center' },
  ratingText: { fontFamily: fonts.black, fontSize: 16, lineHeight: 21, color: pop.ink, textAlign: 'center' },
  later: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});

export default withProfiler('Cook', CookMode);
