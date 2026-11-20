import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics, type HapticKind } from '../../lib/haptics';
import { depth as DEPTH, pop, radius, stroke, type as typeScale } from '../../theme';
import { Icon, type IconName } from '../Icon';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  /** The text on the button. Use `children` instead for custom content. */
  label?: string;
  children?: ReactNode;
  /** An icon before the label, or after it with `iconRight`. */
  icon?: IconName;
  iconRight?: IconName;
  /** Face color. Default sunshine: THE main action. */
  color?: string;
  /** Label color. Ink on every color; pass white only on an ink button. */
  textColor?: string;
  /** large = 56 tall (main actions), small = 44 tall. */
  size?: 'large' | 'small';
  /** Corner radius (default 18). */
  radius?: number;
  /** How far the solid shadow sits below (default 4). */
  depth?: number;
  /** Layout of the whole button (margins, flex, width). */
  style?: StyleProp<ViewStyle>;
  /** Layout inside the face (padding, row, height). */
  faceStyle?: StyleProp<ViewStyle>;
  /** Haptic on press. Default: a light impact. */
  haptic?: HapticKind | null;
};

/**
 * The app's button: a colored face with a thick ink outline, sitting on a solid ink "shadow" (a
 * real View, so it looks the same on every phone). While your finger is down, the face moves down
 * onto the shadow, so the button looks physically pressed. Light haptic on press.
 */
export function PopButton({
  label,
  children,
  icon,
  iconRight,
  color = pop.sunshine,
  textColor = pop.ink,
  size = 'large',
  radius: r = radius.md,
  depth = DEPTH.button,
  style,
  faceStyle,
  haptic = 'tap',
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  accessibilityLabel,
  ...rest
}: Props) {
  const reduceMotion = useReducedMotion();
  const down = useSharedValue(0);
  // Only plain numbers in here: this runs on the UI thread.
  const faceMove = useAnimatedStyle(() => ({ transform: [{ translateY: down.get() * depth }] }));
  const large = size === 'large';
  const press = (to: number) => down.set(reduceMotion ? to : withTiming(to, { duration: to ? 60 : 110 }));

  return (
    <Pressable
      {...rest}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      aria-disabled={!!disabled}
      onPressIn={(e) => {
        press(1);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        press(0);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      style={[{ paddingBottom: depth }, disabled && styles.disabled, style]}
    >
      <View style={[styles.shadow, { top: depth, borderRadius: r }]} />
      <Animated.View
        style={[
          styles.face,
          { backgroundColor: color, borderRadius: r, minHeight: large ? 56 : 44, paddingHorizontal: large ? 22 : 16 },
          faceStyle,
          faceMove,
        ]}
      >
        {children ?? (
          <>
            {icon && <Icon name={icon} size={large ? 20 : 17} color={textColor} weight="bold" />}
            {label ? (
              <Text style={[large ? typeScale.buttonLarge : typeScale.button, { color: textColor }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                {label}
              </Text>
            ) : null}
            {iconRight && <Icon name={iconRight} size={large ? 20 : 17} color={textColor} weight="bold" />}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: pop.ink, borderCurve: 'continuous' },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: stroke.thick,
    borderColor: pop.ink,
    borderCurve: 'continuous',
  },
  disabled: { opacity: 0.45 },
});
