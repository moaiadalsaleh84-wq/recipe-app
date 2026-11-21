import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../Text';
import { pressSpring } from '../../motion';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptics, type HapticKind } from '../../lib/haptics';
import { fonts, pop, stroke } from '../../theme';
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
};

/**
 * A round icon button: white, thick ink outline, a 3px solid shadow. Presses down onto its shadow.
 */
export function PopIconButton({ icon, onPress, accessibilityLabel, accessibilityHint, color = pop.white, iconColor = pop.ink, size = 44, iconSize, badge, disabled, haptic = null, style, testID }: Props) {
  const reduceMotion = useReducedMotion();
  const down = useSharedValue(0);
  const depth = 3;
  const move = useAnimatedStyle(() => ({ transform: [{ translateY: down.get() * depth }] }));
  const d = Math.max(44, size);
  return (
    <Pressable
      onPress={() => {
        if (haptic) haptics[haptic]();
        onPress();
      }}
      onPressIn={() => down.set(reduceMotion ? 1 : withSpring(1, pressSpring))}
      onPressOut={() => down.set(reduceMotion ? 0 : withSpring(0, pressSpring))}
      disabled={disabled}
      aria-disabled={!!disabled}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${accessibilityLabel}, ${badge}` : accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={[{ width: d, height: d + depth }, style]}
    >
      <View style={[styles.shadow, { top: depth, width: d, height: d, borderRadius: d / 2 }]} />
      <Animated.View style={[styles.face, { width: d, height: d, borderRadius: d / 2, backgroundColor: disabled ? pop.lilacTint : color }, move]}>
        <Icon name={icon} size={iconSize ?? Math.round(d * 0.42)} color={disabled ? pop.inkMuted : iconColor} weight="bold" />
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
  shadow: { position: 'absolute', left: 0, backgroundColor: pop.ink },
  face: { alignItems: 'center', justifyContent: 'center', borderWidth: stroke.thick, borderColor: pop.ink },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: pop.tomato,
    borderWidth: stroke.thin,
    borderColor: pop.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.black, fontSize: 12, lineHeight: 15, color: pop.ink },
});
