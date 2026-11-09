import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatSays } from '../../components/cats/CatSays';
import { say, stepSituation, type Line } from '../../components/cats/dialogue';
import { Icon } from '../../components/Icon';
import { PressableScale } from '../../components/PressableScale';
import { useToast } from '../../components/Toast';
import { Button, CheckCircle, EmptyState, IconButton } from '../../components/ui';
import { haptics } from '../../lib/haptics';
import { findTimers } from '../../lib/timers';
import { convertQty, convertStepText } from '../../lib/units';
import { formatQty, roundQty, useBuddy, useStore } from '../../state/store';
import { useTheme } from '../../theme';

type Timer = { label: string; total: number; endsAt: number | null; remaining: number };

const clock = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export default function CookMode() {
  useKeepAwake(); // the screen stays on while you cook
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
  const [timer, setTimer] = useState<Timer | null>(null);
  const [override, setOverride] = useState<Line | null>(null);
  const tick = useRef<ReturnType<typeof setInterval>>(undefined);
  const timerRef = useRef<Timer | null>(null);
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  const steps = recipe?.steps ?? [];
  const last = steps.length + 1;

  // Countdown
  useEffect(() => {
    clearInterval(tick.current);
    if (!timer?.endsAt) return;
    tick.current = setInterval(() => {
      const cur = timerRef.current;
      if (!cur?.endsAt) return;
      const remaining = Math.max(0, Math.round((cur.endsAt - Date.now()) / 1000));
      if (remaining === 0) {
        clearInterval(tick.current);
        setTimer({ ...cur, endsAt: null, remaining: 0 });
        setOverride(say(buddy, 'timerDone'));
        toast({ message: `${cur.label} timer is done!`, icon: 'timer', tone: 'warning' });
      } else if (remaining !== cur.remaining) {
        setTimer({ ...cur, remaining });
      }
    }, 250);
    return () => clearInterval(tick.current);
  }, [timer?.endsAt, buddy, toast]);

  const line: Line = override
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

  const go = (p: number) => {
    haptics.select();
    setOverride(null);
    setPage(Math.max(0, Math.min(last, p)));
  };

  const startTimer = (label: string, seconds: number) => {
    setTimer({ label, total: seconds, remaining: seconds, endsAt: Date.now() + seconds * 1000 });
    setOverride(say(buddy, 'timerStart'));
    toast({ message: `Timer set for ${label}`, icon: 'timer', tone: 'info' });
  };

  const finish = () => {
    logCooked(recipe.id, servings);
    toast({ message: `Logged ${recipe.title}. Nice cooking!`, icon: 'checkCircle' });
    router.back();
  };

  const close = () => router.back();
  const stepText = page >= 1 && page <= steps.length ? convertStepText(steps[page - 1], units) : '';
  const timers = stepText ? findTimers(stepText) : [];

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

      {/* Running timer */}
      {timer && (
        <Animated.View entering={FadeIn} layout={LinearTransition} style={[styles.timerBar, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
          <Icon name="timer" size={20} color={timer.remaining === 0 ? t.colors.destructive : t.colors.tint} weight="bold" />
          <Text style={[t.type.title2, { color: t.colors.label, fontVariant: ['tabular-nums'], flex: 1 }]} testID="timer-display">
            {clock(timer.remaining)}
          </Text>
          <IconButton
            icon={timer.endsAt ? 'pause' : 'play'}
            accessibilityLabel={timer.endsAt ? 'Pause timer' : 'Resume timer'}
            disabled={timer.remaining === 0}
            onPress={() =>
              setTimer((c) => (c ? (c.endsAt ? { ...c, endsAt: null } : { ...c, endsAt: Date.now() + c.remaining * 1000 }) : c))
            }
          />
          <IconButton icon="restart" accessibilityLabel="Restart timer" onPress={() => startTimer(timer.label, timer.total)} />
          <IconButton icon="close" accessibilityLabel="Stop timer" color={t.colors.secondaryLabel} onPress={() => setTimer(null)} />
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View key={page} entering={FadeInRight.springify().damping(18)} style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
          {page === 0 && (
            <>
              <Text style={[t.type.title2, { color: t.colors.label }]}>Gather your ingredients</Text>
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginBottom: 8 }]}>
                For {servings} {servings === 1 ? 'serving' : 'servings'}. Tap each one as you set it out.
              </Text>
              {recipe.ingredients.map((ing, i) => {
                const key = `${ing.id}-${i}`;
                const c = convertQty(roundQty(ing.quantity * (servings / recipe.servings)), ing.unit, units);
                const label = `${formatQty(c.quantity, c.unit)} ${ing.name}`;
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
              <Text style={[t.type.footnote, { color: t.colors.tint, fontWeight: '800', fontFamily: t.fonts.rounded, letterSpacing: 0.6 }]}>STEP {page}</Text>
              <Text style={[styles.stepText, { color: t.colors.label }]} testID="cook-step">
                {stepText}
              </Text>
              {timers.length > 0 && (
                <View style={styles.timerChips}>
                  {timers.map((tm) => (
                    <PressableScale
                      key={tm.label}
                      onPress={() => startTimer(tm.label, tm.seconds)}
                      accessibilityLabel={`Start a ${tm.label} timer`}
                      style={[styles.timerChip, { backgroundColor: t.colors.tintSoft, borderColor: t.colors.border }]}
                    >
                      <Icon name="timer" size={16} color={t.colors.tint} weight="bold" />
                      <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '700', fontFamily: t.fonts.rounded }]}>Start {tm.label}</Text>
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  segments: { flexDirection: 'row', gap: 5, paddingHorizontal: 16, marginBottom: 8 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  timerBar: { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 16, marginBottom: 4, paddingLeft: 14, paddingRight: 4, borderRadius: 18, borderCurve: 'continuous', minHeight: 56 },
  content: { padding: 16, paddingBottom: 140, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { borderRadius: 24, padding: 20, gap: 6, borderCurve: 'continuous' },
  stepText: { fontSize: 24, lineHeight: 33, fontWeight: '600', marginTop: 6 },
  timerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  timerChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  gatherRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
