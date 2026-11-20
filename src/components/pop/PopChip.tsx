import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../Text';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useEffect, useRef } from 'react';
import { haptics } from '../../lib/haptics';
import { fonts, motion, pop, radius, stroke } from '../../theme';
import { Icon, type IconName } from '../Icon';

type Props = {
  label: string;
  /** Background: a tint (default white). Selected chips turn sunshine. */
  color?: string;
  icon?: IconName;
  /** A small picture before the label instead of an icon. */
  leading?: ReactNode;
  /** A small icon after the label: "close" for removable items, "plus" to add. */
  trailing?: IconName;
  selected?: boolean;
  /** Without onPress the chip is a plain label (a tag), not a button. */
  onPress?: () => void;
  /** True for on/off filters (reads as a toggle to VoiceOver). */
  toggle?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Smaller text and padding, for chips inside cards. */
  small?: boolean;
};

/**
 * A chip: tint background, 2px ink outline, radius 12. As a button it sits on a 3pt solid shadow
 * and presses down; a selected filter turns sunshine with a check and gives a small bounce.
 */
export function PopChip({ label, color = pop.white, icon, leading, trailing, selected = false, onPress, toggle = false, accessibilityLabel, style, small }: Props) {
  const reduceMotion = useReducedMotion();
  const down = useSharedValue(0);
  const bounce = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (selected && !reduceMotion) bounce.set(withSequence(withTiming(1.1, { duration: 100 }), withSpring(1, motion.pop)));
  }, [selected, reduceMotion, bounce]);
  const faceMove = useAnimatedStyle(() => ({ transform: [{ translateY: down.get() * 3 }, { scale: bounce.get() }] }));

  const content = (
    <>
      {selected ? <Icon name="check" size={13} color={pop.ink} weight="bold" /> : leading ? leading : icon ? <Icon name={icon} size={small ? 13 : 15} color={pop.ink} weight="bold" /> : null}
      <Text style={[styles.label, small && styles.labelSmall]}>
        {label}
      </Text>
      {trailing && <Icon name={trailing} size={12} color={pop.ink} weight="bold" />}
    </>
  );
  const faceStyle = [styles.face, small && styles.faceSmall, { backgroundColor: selected ? pop.sunshine : color }];

  if (!onPress) {
    return (
      <View style={[faceStyle, styles.tag, style]} accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? label}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      onPressIn={() => down.set(reduceMotion ? 1 : withTiming(1, { duration: 60 }))}
      onPressOut={() => down.set(reduceMotion ? 0 : withTiming(0, { duration: 110 }))}
      accessibilityRole={toggle ? 'togglebutton' : 'button'}
      aria-selected={toggle ? selected : undefined}
      accessibilityLabel={accessibilityLabel ?? label}
      // The chip is 40 tall; the hit slop makes the tap area 44.
      hitSlop={{ top: 2, bottom: 4, left: 2, right: 2 }}
      style={[styles.wrap, style]}
    >
      <View style={styles.shadow} />
      <Animated.View style={[faceStyle, faceMove]}>{content}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 3 },
  shadow: { position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: radius.sm, backgroundColor: pop.ink },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: stroke.thin,
    borderColor: pop.ink,
    borderCurve: 'continuous',
  },
  faceSmall: { minHeight: 32, paddingHorizontal: 10, gap: 5 },
  tag: { alignSelf: 'flex-start' },
  label: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: pop.ink },
  labelSmall: { fontSize: 13, lineHeight: 17 },
});
