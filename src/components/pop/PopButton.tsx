import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../Text';
import { EASE_CUBIC, pressOut } from '../../motion';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics, type HapticKind } from '../../lib/haptics';
import { depth as DEPTH, edge, pop, radius, type as typeScale } from '../../theme';
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
  /** large = 52 tall (main actions), small = 40 tall; plus the 4px edge. */
  size?: 'large' | 'small';
  /** Corner radius (default 16). */
  radius?: number;
  /** Height of the 3D edge (default 4). */
  depth?: number;
  /** Layout of the whole button (margins, flex, width). */
  style?: StyleProp<ViewStyle>;
  /** Layout inside the face (padding, row, height). */
  faceStyle?: StyleProp<ViewStyle>;
  /** Haptic on press. Default: a light impact. */
  haptic?: HapticKind | null;
};

/**
 * The app's button, Duolingo style: a colored face sitting on a 4px "edge" in a darker shade of
 * its own color (sunshine → #E2A400; a white secondary button has a 2px light border and a light
 * edge). While your finger is down the face moves down 4px onto the edge and the edge disappears
 * (100 ms in, 160 ms out, no bounce). Light haptic on primary actions.
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
  const depth = depthProp ?? DEPTH.button;
  const down = useSharedValue(0);
  // Only plain numbers in here: this runs on the UI thread.
  const faceMove = useAnimatedStyle(() => ({ transform: [{ translateY: down.get() * depth }] }));
  const large = size === 'large';
  // Down onto the edge in 100 ms, back up in 160 ms (ease-out cubic). No bounce.
  const press = (to: number) => down.set(reduceMotion ? to : withTiming(to, to ? { duration: 100, easing: EASE_CUBIC } : pressOut));
  // White (or very light) faces are "secondary": a light border and a light edge.
  const light = color.toUpperCase() === pop.white || color.toUpperCase() === pop.surface.toUpperCase();
  const face = disabled ? pop.surface : color;
  const edgeColor = disabled ? pop.track : light ? pop.line : edge(color);

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
      <View style={[styles.edge, { top: depth, borderRadius: r, backgroundColor: edgeColor }]} />
      <Animated.View
        style={[
          styles.face,
          // Disabled: solid muted colors, never see-through.
          { backgroundColor: face, borderRadius: r, minHeight: large ? 52 : 40, paddingHorizontal: large ? 22 : 16, borderColor: light || disabled ? (disabled ? pop.track : pop.line) : face },
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
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, borderCurve: 'continuous' },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderCurve: 'continuous',
  },
});
