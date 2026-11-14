import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatSays } from '../../components/cats/CatSays';
import { ConfettiBurst } from '../../components/ConfettiBurst';
import { say, stepSituation, type Line } from '../../components/cats/dialogue';
import { Icon } from '../../components/Icon';
import { PressableScale } from '../../components/PressableScale';
import { useToast } from '../../components/Toast';
import { Button, CheckCircle, EmptyState, IconButton } from '../../components/ui';
import { haptics } from '../../lib/haptics';
import { clock, secondsLeft, type CookTimer } from '../../lib/cookTimers';
import { findTimers } from '../../lib/timers';
import { convertQty, convertStepText } from '../../lib/units';
import { formatQty, roundQty, useBuddy, useStore } from '../../state/store';
import { useTimers } from '../../state/timers';
import { useTheme } from '../../theme';

export default function CookMode() {
  // The screen stays on while you cook. Leaving quickly can deactivate before activation finishes; that's harmless.
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const buddy = useBuddy();
  const params = useLocalSearchParams<{ id: string; servings?: string }>();
  const { getRecipe, units, logCooked } = useStore();
  const recipe = getRecipe(params.id);
  const servings = Number(params.servings) || recipe?.servings || 1;

  const [page, setPage] = useState(0); // 0 = get ready, 1..n = steps, n+1 = done
  const [gathered, setGathered] = useState<Record<string, boolean>>({});
  const [override, setOverride] = useState<Line | null>(null);
  // Timers live app-wide (src/state/timers.tsx): they keep going outside Cook Mode and ring when the app is closed.
  const { timers, now, support, start, pause, resume, restart, stop } = useTimers();
  const ringing = timers.filter((tm) => tm.status === 'ringing');

  const steps = recipe?.steps ?? [];
  const last = steps.length + 1;

  // A ringing timer always gets the cat's attention.
  const line: Line = ringing.length
    ? say(buddy, 'timerDone')
    : override
      ? override
      : page === 0
        ? say(buddy, 'cookStart')
        : page === last
          ? say(buddy, 'cookDone')
          : say(buddy, stepSituation(steps[page - 1] ?? ''));

  if (!recipe) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.colors.background }}>
        <EmptyState icon="fork" cat={{ buddy, mood: 'worried' }} title="Recipe Not Found" message="It may have been removed." action={{ label: 'Close', onPress: () => router.back() }} />
      </View>
    );
  }

  const stopAlarm = (id: string) => {
    stop(id);
    setOverride(say(buddy, 'timerStopped'));
    haptics.success();
  };

  const go = (p: number) => {
    haptics.select();
    setOverride(null);
    // A finished timer doesn't follow you to the next step. Running ones keep counting.
    for (const tm of timers) if (tm.status === 'ringing' || tm.status === 'done') stop(tm.id);
    setPage(Math.max(0, Math.min(last, p)));
  };

  const startTimer = (label: string, seconds: number) => {
    start({ label, total: seconds, recipeId: recipe.id, recipeTitle: recipe.title, step: page, stepText: shortStep(steps[page - 1] ?? '') });
    setOverride(say(buddy, 'timerStart'));
    toast({ message: `Timer set for ${label}`, icon: 'timer', tone: 'info' });
  };

  const finish = () => {
    logCooked(recipe.id, servings);
    toast({ message: `Logged ${recipe.title}. +50 XP, nice cooking!`, icon: 'checkCircle' });
    close();
  };

  // Opened from a link there is nothing to go back to, so land on the recipe instead.
  const close = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } }));
  const stepText = page >= 1 && page <= steps.length ? convertStepText(steps[page - 1], units) : '';
  const stepTimers = stepText ? findTimers(stepText) : [];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <IconButton icon="close" accessibilityLabel="Exit cook mode" onPress={close} color={t.colors.label} background={t.colors.fill} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[t.type.headline, { color: t.colors.label }]} numberOfLines={1}>
            {recipe.title}
          </Text>
          <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]} testID="cook-progress">
            {page === 0 ? 'Get ready' : page === last ? 'Done!' : `Step ${page} of ${steps.length}`}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Progress segments */}
      <View style={styles.segments} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: last, now: page }}>
        {Array.from({ length: last + 1 }).map((_, i) => (
          <View key={i} style={[styles.segment, { backgroundColor: i <= page ? t.colors.tintFill : t.colors.fillStrong }]} />
        ))}
      </View>

      {/* Timers: ringing ones first, big and red with one obvious Stop button */}
      {[...ringing, ...timers.filter((tm) => tm.status !== 'ringing')].map((tm, i) => (
        <TimerBar
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
      {support.reason && timers.some((tm) => tm.status === 'running') && (
        <Text style={[t.type.caption1, styles.note, { color: t.colors.secondaryLabel }]} testID="timer-foreground-note">
          {support.reason === 'expo-go'
            ? 'In Expo Go timers only ring while Pantry Pop is open. The full app also rings when your phone is locked.'
            : 'On the web, timers only ring while this page is open.'}
        </Text>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View key={page} entering={FadeInRight.duration(240)} style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
          {page === 0 && (
            <>
              <Text style={[t.type.title2, { color: t.colors.label }]}>Gather your ingredients</Text>
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginBottom: 8 }]}>
                For {servings} {servings === 1 ? 'serving' : 'servings'}. Tap each one as you set it out.
              </Text>
              {recipe.ingredients.map((ing, i) => {
                const key = `${ing.id}-${i}`;
                const c = convertQty(roundQty(ing.quantity * (servings / recipe.servings)), ing.unit, units);
                const label = `${formatQty(c.quantity, c.unit)} ${ing.name}`.trim();
                return (
                  <PressableScale
                    key={key}
                    onPress={() => setGathered((g) => ({ ...g, [key]: !g[key] }))}
                    haptic="select"
                    scaleTo={0.99}
                    accessibilityRole="checkbox"
                    aria-checked={!!gathered[key]}
                    accessibilityLabel={label}
                    style={styles.gatherRow}
                  >
                    <CheckCircle checked={!!gathered[key]} color={t.colors.success} />
                    <Text style={[t.type.body, { color: gathered[key] ? t.colors.tertiaryLabel : t.colors.label, flex: 1 }]}>{label}</Text>
                  </PressableScale>
                );
              })}
            </>
          )}

          {page >= 1 && page <= steps.length && (
            <>
              <Text style={[t.type.footnote, { color: t.colors.tint, fontWeight: 'normal', fontFamily: t.fonts.rounded, letterSpacing: 0.6 }]}>STEP {page}</Text>
              <Text style={[styles.stepText, { color: t.colors.label }]} testID="cook-step">
                {stepText}
              </Text>
              {stepTimers.length > 0 && (
                <View style={styles.timerChips}>
                  {stepTimers.map((tm) => (
                    <PressableScale
                      key={tm.label}
                      onPress={() => startTimer(tm.label, tm.seconds)}
                      accessibilityLabel={`Start a ${tm.label} timer`}
                      style={[styles.timerChip, { backgroundColor: t.colors.tintSoft, borderColor: t.colors.border }]}
                    >
                      <Icon name="timer" size={16} color={t.colors.tint} weight="bold" />
                      <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: 'normal', fontFamily: t.fonts.rounded }]}>Start {tm.label}</Text>
                    </PressableScale>
                  ))}
                </View>
              )}
            </>
          )}

          {page === last && (
            <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
              <Text style={[t.type.title1, { color: t.colors.label, textAlign: 'center' }]}>You made it!</Text>
              <Text style={[t.type.body, { color: t.colors.secondaryLabel, textAlign: 'center' }]}>
                Log this meal to keep your cooking streak going.
              </Text>
            </View>
          )}
        </Animated.View>

        <CatSays buddy={buddy} line={line} size={128} style={{ marginTop: 20 }} />
      </ScrollView>

      {/* Celebrate the finish */}
      {page === last && <ConfettiBurst />}

      {/* Navigation */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), borderTopColor: t.colors.separator, backgroundColor: t.colors.background }]}>
        {page > 0 && <Button label="Back" icon="back" variant="tinted" onPress={() => go(page - 1)} style={{ flex: 1 }} accessibilityLabel="Previous step" />}
        {page < last ? (
          <Button label={page === 0 ? 'Let’s Cook' : page === steps.length ? 'Finish' : 'Next'} icon="arrowRight" onPress={() => go(page + 1)} style={{ flex: 2 }} accessibilityLabel={page === 0 ? 'Start the first step' : page === steps.length ? 'Finish cooking' : 'Next step'} />
        ) : (
          <Button label="Log Meal & Finish" icon="check" variant="success" onPress={finish} style={{ flex: 2 }} />
        )}
      </View>
    </View>
  );
}

/** First sentence of a step, short enough for the Lock Screen. */
const shortStep = (step: string) => {
  const first = step.split(/(?<=[.!?])\s/)[0] ?? step;
  return first.length > 48 ? `${first.slice(0, 46).trimEnd()}…` : first;
};

function TimerBar({ timer: tm, now, first, page, recipeId, onStop, onPause, onResume, onRestart }: { timer: CookTimer; now: number; first: boolean; page: number; recipeId: string; onStop: () => void; onPause: () => void; onResume: () => void; onRestart: () => void }) {
  const t = useTheme();
  const where = tm.recipeId !== recipeId ? tm.recipeTitle : tm.step !== page ? `Timer from step ${tm.step}` : null;
  if (tm.status === 'ringing') {
    return (
      <Animated.View entering={FadeIn} layout={LinearTransition} style={[styles.timerBar, styles.ringing, { backgroundColor: t.colors.destructive }]} accessibilityRole="alert">
        <Icon name="timer" size={22} color="#FFFFFF" weight="bold" />
        <View style={{ flex: 1 }}>
          <Text style={[t.type.title3, { color: '#FFFFFF' }]} testID={first ? 'timer-done' : undefined}>
            Time’s up!
          </Text>
          <Text style={[t.type.footnote, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={1}>
            {tm.label} · {tm.recipeId !== recipeId ? tm.recipeTitle : `Step ${tm.step}`}
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
      <Animated.View entering={FadeIn} layout={LinearTransition} style={[styles.timerBar, { backgroundColor: t.colors.cell, ...t.chunky.card }]} testID="timer-finished-away">
        <Icon name="checkCircle" size={20} color={t.colors.success} weight="bold" />
        <View style={{ flex: 1 }}>
          <Text style={[t.type.headline, { color: t.colors.label }]}>{tm.label} timer finished</Text>
          <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]} numberOfLines={1}>
            {where ?? `Step ${tm.step}`} · while you were away
          </Text>
        </View>
        <IconButton icon="close" accessibilityLabel="Dismiss finished timer" color={t.colors.secondaryLabel} onPress={onStop} />
      </Animated.View>
    );
  }
  const running = tm.status === 'running';
  return (
    <Animated.View entering={FadeIn} layout={LinearTransition} style={[styles.timerBar, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
      <Icon name="timer" size={20} color={t.colors.tint} weight="bold" />
      <View style={{ flex: 1 }}>
        <Text style={[t.type.title2, { color: t.colors.label, fontVariant: ['tabular-nums'] }]} testID={first ? 'timer-display' : undefined}>
          {clock(secondsLeft(tm, now))}
        </Text>
        {where && <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]} numberOfLines={1}>{where}</Text>}
      </View>
      <IconButton icon={running ? 'pause' : 'play'} accessibilityLabel={running ? 'Pause timer' : 'Resume timer'} onPress={running ? onPause : onResume} />
      <IconButton icon="restart" accessibilityLabel="Restart timer" onPress={onRestart} />
      <IconButton icon="close" accessibilityLabel="Stop timer" color={t.colors.secondaryLabel} onPress={onStop} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  note: { marginHorizontal: 20, marginBottom: 6, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  segments: { flexDirection: 'row', gap: 5, paddingHorizontal: 16, marginBottom: 8 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  ringing: { paddingRight: 8, borderWidth: 0 },
  stopBtn: { minHeight: 44, minWidth: 84, paddingHorizontal: 18, borderRadius: 999, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  timerBar: { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 16, marginBottom: 4, paddingLeft: 14, paddingRight: 4, borderRadius: 18, borderCurve: 'continuous', minHeight: 56 },
  content: { padding: 16, paddingBottom: 140, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { borderRadius: 24, padding: 20, gap: 6, borderCurve: 'continuous' },
  stepText: { fontSize: 24, lineHeight: 33, fontWeight: '600', marginTop: 6 },
  timerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  timerChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  gatherRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
