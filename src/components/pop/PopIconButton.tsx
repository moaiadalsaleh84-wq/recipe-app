import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../Text';
import { EASE_CUBIC, pressOut } from '../../motion';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics, type HapticKind } from '../../lib/haptics';
import { edge, fonts, pop } from '../../theme';
import { Icon, type IconName } from '../Icon';

type Props = {
  icon: IconName;
  onPress: () => void;
  /** Required: every icon-only button needs a name for VoiceOver. */
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** Face color (default white). */
  color?: string;
  iconColor?: string;
  /** Diameter (default 44, never smaller than the 44pt tap target). */
  size?: number;
  iconSize?: number;
  /** A small tomato count in the corner. */
  badge?: number;
  disabled?: boolean;
  haptic?: HapticKind | null;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Drawn in place of the icon (e.g. the animated heart). */
  children?: ReactNode;
};

/**
 * A round icon button, 3D like every button: white with a 2px light border on a light 3px edge (a
 * colored one sits on its darker shade). Presses down onto the edge in 100 ms. 40 to look at, 44+
 * to tap.
 */
export function PopIconButton({ icon, onPress, accessibilityLabel, accessibilityHint, color = pop.white, iconColor = pop.ink, size = 40, iconSize, badge, disabled, haptic = null, style, testID, children }: Props) {
  const reduceMotion = useReducedMotion();
  const down = useSharedValue(0);
  const depth = 3;
  const move = useAnimatedStyle(() => ({ transform: [{ translateY: down.get() * depth }] }));
  const d = size;
  const light = color.toUpperCase() === pop.white;
  const face = disabled ? pop.surface : color;
  const slop = Math.max(0, Math.ceil((44 - d) / 2));
  return (
    <Pressable
      onPress={() => {
        if (haptic) haptics[haptic]();
        onPress();
      }}
      onPressIn={() => down.set(reduceMotion ? 1 : withTiming(1, { duration: 100, easing: EASE_CUBIC }))}
      onPressOut={() => down.set(reduceMotion ? 0 : withTiming(0, pressOut))}
      disabled={disabled}
      aria-disabled={!!disabled}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${accessibilityLabel}, ${badge}` : accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      hitSlop={slop}
      style={[{ width: d, height: d + depth }, style]}
    >
      <View style={[styles.shadow, { top: depth, width: d, height: d, borderRadius: d / 2, backgroundColor: disabled ? pop.track : light ? pop.line : edge(color) }]} />
      <Animated.View style={[styles.face, { width: d, height: d, borderRadius: d / 2, backgroundColor: face, borderColor: light || disabled ? pop.line : face }, move]}>
        {children ?? <Icon name={icon} size={iconSize ?? Math.round(d * 0.42)} color={disabled ? pop.inkMuted : iconColor} weight="bold" />}
      </Animated.View>
      {badge ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: { position: 'absolute', left: 0 },
  face: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: pop.tomato,
    borderWidth: 2,
    borderColor: pop.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.black, fontSize: 12, lineHeight: 15, color: pop.ink },
});
