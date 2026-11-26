/**
 * "Let's get cooking!": the first steps, at the top of Recipes (the ReciMe-style welcome card).
 * Each step ticks itself from what you've actually done (import, cookbook, plan, cook). Tap the
 * header to fold it away; once every step is done, a ✕ hides it for good. Remembered on the phone.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { isImported } from './ImportCredit';
import { Icon, type IconName } from './Icon';
import { PopCard } from './pop/PopCard';
import { PopChip } from './pop/PopChip';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { CheckCircle } from './ui';
import { EASE_CUBIC } from '../motion';
import { useStore } from '../state/store';
import { pop, useTheme } from '../theme';

const KEY = 'pantry-pop-welcome-v1';
type Saved = 'open' | 'folded' | 'hidden';

type Props = {
  /** Opens importing (the same as the + Import button). */
  onImport: () => void;
  /** Imports the example TikTok recipe. */
  onExample: () => void;
  /** Opens the first cookbook (respects the free limit). */
  onCookbook: () => void;
  /** Starts cooking tonight's pick. */
  onCook: () => void;
};

export function WelcomeChecklist({ onImport, onExample, onCookbook, onCook }: Props) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const { importsUsed, customRecipes, cookbooks, plan, cooked } = useStore();
  const [state, setState] = useState<Saved | null>(null);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(KEY)
      .then((v) => live && setState(v === 'folded' || v === 'hidden' ? v : 'open'))
      .catch(() => live && setState('open'));
    return () => {
      live = false;
    };
  }, []);
  const save = (next: Saved) => {
    setState(next);
    AsyncStorage.setItem(KEY, next).catch(() => {});
  };

  const steps: { id: string; label: string; hint: string; icon: IconName; done: boolean; onPress: () => void }[] = [
    { id: 'import', label: 'Import your first recipe', hint: 'Paste a TikTok, YouTube or website link', icon: 'link', done: importsUsed > 0 || customRecipes.some(isImported), onPress: onImport },
    { id: 'cookbook', label: 'Create your first cookbook', hint: 'Like ‘Weeknights’ or ‘Date night’', icon: 'book', done: cookbooks.length > 0, onPress: onCookbook },
    { id: 'plan', label: 'Plan a meal', hint: 'Pick tonight’s dinner on the Plan tab', icon: 'calendar', done: Object.values(plan).some((day) => Object.values(day ?? {}).some(Boolean)), onPress: () => router.navigate('/plan') },
    { id: 'cook', label: 'Cook your first recipe', hint: 'Step by step, with timers', icon: 'pot', done: cooked.length > 0, onPress: onCook },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const folded = state === 'folded';

  // The chevron turns as the card folds (200 ms, no bounce).
  const turn = useSharedValue(folded ? 1 : 0);
  useEffect(() => {
    turn.set(reduceMotion ? (folded ? 1 : 0) : withTiming(folded ? 1 : 0, { duration: 200, easing: EASE_CUBIC }));
  }, [folded, reduceMotion, turn]);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * -90}deg` }] }));

  if (state === null || state === 'hidden') return null;

  return (
    <Animated.View layout={reduceMotion ? undefined : LinearTransition.duration(220)} exiting={reduceMotion ? undefined : FadeOut.duration(160)} style={{ marginBottom: t.spacing.lg }}>
      <PopCard color={pop.sunshineTint} radius={24} contentStyle={styles.card} testID="welcome-checklist">
        {/* Header: tap to fold or unfold. */}
        <PressableScale
          onPress={() => save(folded ? 'open' : 'folded')}
          haptic="select"
          scaleTo={0.99}
          accessibilityLabel={`Let’s get cooking: ${doneCount} of ${steps.length} done. ${folded ? 'Show steps' : 'Hide steps'}`}
          style={styles.head}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, fontFamily: t.fonts.black, letterSpacing: 0.4 }]}>WELCOME</Text>
            <Text style={[t.type.title2, { color: t.colors.label }]}>{allDone ? 'You’re all set!' : 'Let’s get cooking!'}</Text>
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} testID="welcome-count">
              {doneCount} of {steps.length} done
            </Text>
          </View>
          {allDone ? (
            <PressableScale onPress={() => save('hidden')} accessibilityLabel="Hide the welcome card" style={[styles.round, { borderColor: t.pop.ink, backgroundColor: t.pop.white }]}>
              <Icon name="close" size={14} color={t.pop.ink} weight="bold" />
            </PressableScale>
          ) : (
            <Animated.View style={[styles.round, { borderColor: t.pop.ink, backgroundColor: t.pop.white }, chevron]}>
              <Icon name="chevronDown" size={16} color={t.pop.ink} weight="bold" />
            </Animated.View>
          )}
        </PressableScale>

        {/* The steps: done ones are ticked and struck through; open ones lead somewhere. */}
        {!folded && (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(200)} exiting={reduceMotion ? undefined : FadeOut.duration(120)} style={{ gap: 8 }}>
            {steps.map((s) => (
              <PressableScale
                key={s.id}
                onPress={s.onPress}
                disabled={s.done}
                scaleTo={0.98}
                accessibilityLabel={`${s.label}${s.done ? ', done' : ''}`}
                style={[styles.row, { backgroundColor: s.done ? 'transparent' : t.pop.white, borderColor: s.done ? 'transparent' : t.pop.ink }]}
                testID={`welcome-${s.id}`}
              >
                {s.done ? (
                  <CheckCircle checked color={t.pop.leaf} />
                ) : (
                  <View style={[styles.stepIcon, { backgroundColor: t.pop.sunshineTint, borderColor: t.pop.ink }]}>
                    <Icon name={s.icon} size={16} color={t.pop.ink} weight="bold" />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[t.type.headline, { color: s.done ? t.colors.secondaryLabel : t.colors.label }, s.done && styles.struck]}>{s.label}</Text>
                  {!s.done && <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{s.hint}</Text>}
                </View>
                {!s.done && <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="bold" />}
              </PressableScale>
            ))}
            {!steps[0].done && <PopChip label="Try an example recipe" icon="sparkles" small onPress={onExample} style={{ alignSelf: 'flex-start', marginTop: 4 }} />}
          </Animated.View>
        )}
      </PopCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  round: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 2, borderCurve: 'continuous' },
  stepIcon: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  struck: { textDecorationLine: 'line-through' },
});
