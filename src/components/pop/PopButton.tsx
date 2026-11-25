import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../Text';
import { pressIn, pressOut } from '../../motion';
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
  /** How far the solid shadow sits below (default: 4 for large, 3 for small). */
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
  depth: depthProp,
  style,
  faceStyle,
  haptic: hapticProp,
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  accessibilityLabel,
  ...rest
}: Props) {
  const reduceMotion = useReducedMotion();
  // A light tap only on primary actions (sunshine or ink); quieter buttons are silent unless asked.
  const haptic = hapticProp === undefined ? (color === pop.sunshine || color === pop.ink ? 'tap' : null) : hapticProp;
  // 4pt under big buttons, 3pt under small ones.
  const depth = depthProp ?? (size === 'small' ? DEPTH.small : DEPTH.button);
  const down = useSharedValue(0);
  // Only plain numbers in here: this runs on the UI thread.
  const faceMove = useAnimatedStyle(() => ({ transform: [{ translateY: down.get() * depth }] }));
  const large = size === 'large';
  // Down onto the shadow in 120 ms, back up in 160 ms (ease-out cubic). No bounce.
  const press = (to: number) => down.set(reduceMotion ? to : withTiming(to, to ? pressIn : pressOut));

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
      style={[{ paddingBottom: depth }, style]}
    >
      <View style={[styles.shadow, { top: depth, borderRadius: r }]} />
      <Animated.View
        style={[
          styles.face,
          // Disabled: solid muted colors, never see-through (that would tint the ink border).
          { backgroundColor: disabled ? pop.lilacTint : color, borderRadius: r, minHeight: large ? 56 : 44, paddingHorizontal: large ? 22 : 16 },
          faceStyle,
          faceMove,
        ]}
      >
        {children ?? (
          <>
            {icon && <Icon name={icon} size={large ? 20 : 17} color={disabled ? pop.inkMuted : textColor} weight="bold" />}
            {label ? (
              <Text style={[large ? typeScale.buttonLarge : typeScale.button, { color: disabled ? pop.inkMuted : textColor, textAlign: 'center', flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {label}
              </Text>
            ) : null}
            {iconRight && <Icon name={iconRight} size={large ? 20 : 17} color={disabled ? pop.inkMuted : textColor} weight="bold" />}
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
});
