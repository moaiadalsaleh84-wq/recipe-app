import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../Text';
import { EASE_CUBIC, pressOut } from '../../motion';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '../../lib/haptics';
import { edge, fonts, pop, radius } from '../../theme';
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
 * A chip: 36 tall, radius 18, a 2px light border, flat. Pressed: dims and settles to 97% (100 ms).
 * Selected: a sunshine fill with its darker sunshine edge and a check (no bounce).
 */
export function PopChip({ label, color = pop.white, icon, leading, trailing, selected = false, onPress, toggle = false, accessibilityLabel, style, small }: Props) {
  const reduceMotion = useReducedMotion();
  const down = useSharedValue(0);
  const faceMove = useAnimatedStyle(() => ({ opacity: 1 - down.get() * 0.15, transform: [{ scale: reduceMotion ? 1 : 1 - down.get() * 0.03 }] }));

  const content = (
    <>
      {selected ? <Icon name="check" size={13} color={pop.ink} weight="bold" /> : leading ? leading : icon ? <Icon name={icon} size={small ? 13 : 15} color={pop.ink} weight="bold" /> : null}
      <Text style={[styles.label, small && styles.labelSmall]}>
        {label}
      </Text>
      {trailing && <Icon name={trailing} size={12} color={pop.ink} weight="bold" />}
    </>
  );
  const faceStyle = [styles.face, small && styles.faceSmall, { backgroundColor: selected ? pop.sunshine : color }, selected && styles.selected];

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
      onPressIn={() => down.set(reduceMotion ? 1 : withTiming(1, { duration: 100, easing: EASE_CUBIC }))}
      onPressOut={() => down.set(reduceMotion ? 0 : withTiming(0, pressOut))}
      accessibilityRole={toggle ? 'togglebutton' : 'button'}
      aria-selected={toggle ? selected : undefined}
      accessibilityLabel={accessibilityLabel ?? label}
      // The chip is 36 tall (small: 30); the hit slop makes the tap area 44.
      hitSlop={small ? 7 : 4}
      style={style}
    >
      <Animated.View style={[faceStyle, faceMove]}>{content}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    borderWidth: 2,
    borderColor: pop.line,
    borderCurve: 'continuous',
  },
  selected: { borderColor: pop.sunshine, borderBottomColor: edge(pop.sunshine), borderBottomWidth: 3 },
  faceSmall: { minHeight: 30, paddingHorizontal: 10, gap: 5, borderRadius: 15 },
  tag: { alignSelf: 'flex-start' },
  label: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: pop.ink },
  labelSmall: { fontSize: 13, lineHeight: 17 },
});
