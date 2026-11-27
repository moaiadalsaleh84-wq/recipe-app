/**
 * Full-screen celebrations for the big moments: the streak grows, you level up, you earn a badge.
 * A soft dimmed backdrop, one card with a big colored circle, the news and a Continue button.
 * Smooth, never bouncy: the card fades in and rises 12pt (320 ms, ease-out), the circle settles from
 * 92% to full size, a confetti shower, the celebration chime (Settings → Sounds) and a success haptic.
 * Reduce Motion: a plain fade, no confetti.
 *
 * Several at once (first dish: streak, badge, level) queue and show one after another. They wait
 * while you're in Cook Mode, onboarding, the paywall or a sheet, and show once you're back.
 */
import { useSegments } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { EASE_OUT } from '../motion';
import { haptics } from '../lib/haptics';
import { playSound } from '../lib/sounds';
import { edge, fonts, pop, useTheme } from '../theme';
import { ConfettiBurst } from './ConfettiBurst';
import { Icon, type IconName } from './Icon';
import { Fox } from './mascot/Fox';
import { PopButton } from './pop/PopButton';
import { Text } from './Text';
import { Odometer } from './ui';

export type CelebrationInfo = {
  kind: 'streak' | 'level' | 'badge';
  /** "2 day streak!", "Level 3!", "New badge!" */
  title: string;
  /** One friendly line under the title. */
  message: string;
  icon: IconName;
  /** The circle's color. */
  color: string;
  /** The streak: shown big on odometer wheels. */
  number?: number;
};

const CelebrationContext = createContext<(c: CelebrationInfo) => void>(() => {});

/** `const celebrate = useCelebrate(); celebrate({ kind: 'badge', … })` */
export const useCelebrate = () => useContext(CelebrationContext);

/** Screens where a celebration may appear right away (everything else: it waits). */
const SHOW_ON = new Set(['(tabs)', 'progress', 'recipe', 'cookbook']);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<(CelebrationInfo & { id: number })[]>([]);
  const seq = useRef(0);
  const segments = useSegments();
  const canShow = SHOW_ON.has(segments[0] ?? '(tabs)');

  const celebrate = useCallback((c: CelebrationInfo) => {
    seq.current += 1;
    const id = seq.current;
    setQueue((q) => [...q, { ...c, id }]);
  }, []);
  const done = useCallback((id: number) => setQueue((q) => q.filter((c) => c.id !== id)), []);

  const current = canShow ? queue[0] : undefined;
  return (
    <CelebrationContext.Provider value={celebrate}>
      {children}
      {current && <CelebrationView key={current.id} info={current} onDone={() => done(current.id)} />}
    </CelebrationContext.Provider>
  );
}

function CelebrationView({ info, onDone }: { info: CelebrationInfo; onDone: () => void }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const rise = useSharedValue(reduceMotion ? 0 : 12);
  const fade = useSharedValue(0);
  const grow = useSharedValue(reduceMotion ? 1 : 0.92);

  useEffect(() => {
    // The chime and the haptic land with the card.
    haptics.success();
    playSound('celebrate');
    fade.set(withTiming(1, { duration: reduceMotion ? 180 : 320, easing: EASE_OUT }));
    if (!reduceMotion) {
      rise.set(withTiming(0, { duration: 320, easing: EASE_OUT }));
      grow.set(withDelay(60, withTiming(1, { duration: 420, easing: EASE_OUT })));
    }
  }, [fade, rise, grow, reduceMotion]);

  const card = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ translateY: rise.get() }] }));
  const circle = useAnimatedStyle(() => ({ transform: [{ scale: grow.get() }] }));

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(180)} style={[StyleSheet.absoluteFill, styles.backdrop]} accessibilityViewIsModal>
      {!reduceMotion && <ConfettiBurst count={48} />}
      <Animated.View style={[styles.card, { width: Math.min(340, width - 48), backgroundColor: t.pop.white }, card]} accessibilityRole="alert" accessibilityLiveRegion="assertive" testID={`celebration-${info.kind}`}>
        {/* The fox cheers from the card's top edge. */}
        <Fox pose="cheer" size={84} style={styles.fox} />
        <Animated.View style={[styles.circle, { backgroundColor: info.color, borderBottomColor: edge(info.color) }, circle]}>
          {info.number != null ? (
            <Odometer value={info.number} style={styles.big} />
          ) : (
            <Icon name={info.icon} size={52} color={pop.ink} weight="bold" />
          )}
        </Animated.View>
        <Text style={[t.type.hero, styles.center, { color: t.colors.label }]} accessibilityRole="header">
          {info.title}
        </Text>
        <Text style={[t.type.body, styles.center, { color: t.colors.secondaryLabel }]}>{info.message}</Text>
        <PopButton label="Continue" onPress={onDone} style={{ alignSelf: 'stretch', marginTop: 8 }} testID="celebration-continue" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(27, 19, 64, 0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  fox: { position: 'absolute', top: -58, alignSelf: 'center' },
  card: { alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 36, paddingBottom: 20, borderRadius: 24, borderCurve: 'continuous' },
  circle: { width: 112, height: 112, borderRadius: 56, borderBottomWidth: 5, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  big: { fontFamily: fonts.heading, fontSize: 52, lineHeight: 60, color: pop.ink },
  center: { textAlign: 'center' },
});
