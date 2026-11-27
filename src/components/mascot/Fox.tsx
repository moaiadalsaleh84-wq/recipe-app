/**
 * The fox. `<Fox pose="happy" size={64} />`
 *
 * Alive but calm: a gentle "breath" (up 2pt and back, 2.4 s, ease-in-out, forever) and a blink every
 * 4–7 seconds (a quick swap to the closed-eye frame, when there is one). No scale pops. With Reduce
 * Motion it's a still image.
 *
 * Artwork: the pose's PNG from assets/mascot/ (see foxImages.ts); until that exists, the drawn fox.
 *
 * `<FoxSays pose="happy" text="Dinner idea ready!" />` adds one short speech bubble beside him.
 */
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { PressableScale } from '../PressableScale';
import { Text } from '../Text';
import { FoxArt } from './FoxArt';
import { FOX_BLINK_IMAGES, FOX_IMAGES } from './foxImages';
import type { FoxPose } from './foxPoses';
import { onFoxReact } from './foxReact';

export type { FoxPose } from './foxPoses';
export { foxReact } from './foxReact';

export function Fox({ pose: basePose = 'idle', size = 64, style, still = false, reacts = false }: { pose?: FoxPose; size?: number; style?: StyleProp<ViewStyle>; /** No breathing or blinking (e.g. tiny inline foxes). */ still?: boolean; /** Shows a quick reaction (e.g. happy when you heart a recipe) for 1.2 s. */ reacts?: boolean }) {
  const reduceMotion = useReducedMotion();
  // A quick reaction from elsewhere in the app (foxReact), shown for a moment, then back.
  const [reaction, setReaction] = useState<FoxPose | null>(null);
  useEffect(() => {
    if (!reacts) return;
    let back: ReturnType<typeof setTimeout>;
    const off = onFoxReact((p) => {
      setReaction(p);
      clearTimeout(back);
      back = setTimeout(() => setReaction(null), 1200);
    });
    return () => {
      off();
      clearTimeout(back);
    };
  }, [reacts]);
  const pose = reaction ?? basePose;
  const calm = reduceMotion || still;
  const image = FOX_IMAGES[pose];
  const blinkImage = FOX_BLINK_IMAGES[pose];
  // The drawn fox can always blink; an image only when it has a closed-eye frame.
  const canBlink = !image || !!blinkImage;

  // Breathing: 0 → −2pt → 0, 2.4 s a cycle.
  const y = useSharedValue(0);
  useEffect(() => {
    if (calm) {
      y.set(0);
      return;
    }
    y.set(withRepeat(withTiming(-2, { duration: 1200, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(y);
  }, [calm, y]);
  const breathe = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  // Blinking: closed for 130 ms, every 4–7 seconds.
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (calm || !canBlink) return;
    let open: ReturnType<typeof setTimeout>;
    let next: ReturnType<typeof setTimeout>;
    const schedule = () => {
      next = setTimeout(() => {
        setBlink(true);
        open = setTimeout(() => {
          setBlink(false);
          schedule();
        }, 130);
      }, 4000 + Math.random() * 3000);
    };
    schedule();
    return () => {
      clearTimeout(next);
      clearTimeout(open);
    };
  }, [calm, canBlink]);

  return (
    <Animated.View style={[{ width: size, height: size }, breathe, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={`fox-${pose}`}>
      {image ? (
        <Image source={blink && blinkImage ? blinkImage : image} style={{ width: size, height: size }} contentFit="contain" cachePolicy="memory-disk" transition={0} />
      ) : (
        <FoxArt pose={pose} size={size} blink={blink} />
      )}
    </Animated.View>
  );
}

/**
 * The fox with one short speech bubble to his right. Keep the line short, warm and a little funny.
 * Tap the bubble (when `onPress` is given) to act on it.
 */
export function FoxSays({ pose = 'idle', text, size = 48, onPress, style, testID, reacts = false }: { pose?: FoxPose; text: string; size?: number; onPress?: () => void; style?: StyleProp<ViewStyle>; testID?: string; reacts?: boolean }) {
  const t = useTheme();
  const bubble = (
    <View style={[styles.bubble, { backgroundColor: t.colors.cell, borderColor: t.colors.border }]}>
      {/* The little tail pointing at the fox. */}
      <View style={[styles.tail, { backgroundColor: t.colors.cell, borderColor: t.colors.border }]} />
      <Text style={[t.type.subhead, { color: t.colors.label, fontFamily: t.fonts.bold }]} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
  return (
    <View style={[styles.says, style]} testID={testID} accessible={!onPress} accessibilityLabel={onPress ? undefined : text}>
      <Fox pose={pose} size={size} reacts={reacts} />
      {onPress ? (
        <PressableScale onPress={onPress} scaleTo={0.98} accessibilityLabel={text} style={{ flex: 1, minWidth: 0 }}>
          {bubble}
        </PressableScale>
      ) : (
        <View style={{ flex: 1, minWidth: 0 }}>{bubble}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  says: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bubble: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, borderWidth: 2, borderCurve: 'continuous' },
  // A small rotated square on the bubble's left edge, its outer two sides bordered.
  tail: { position: 'absolute', left: -6, top: '50%', marginTop: -5, width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }] },
});
