import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, fontSizes, radius, spacing } from '../theme';

type Variant = 'white' | 'ink' | 'accent' | 'glass' | 'glassDark' | 'outline';

const variantStyles: Record<Variant, { bg: string; fg: string; border?: string }> = {
  white: { bg: colors.white, fg: colors.ink },
  ink: { bg: colors.ink, fg: colors.white },
  accent: { bg: colors.accent, fg: colors.ink },
  glass: { bg: colors.overlayLight, fg: colors.white }, // for dark/saturated backgrounds
  glassDark: { bg: colors.overlayDark, fg: colors.ink }, // for light backgrounds like yellow
  outline: { bg: 'transparent', fg: colors.ink, border: colors.border },
};

type Props = {
  label: string;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

/** Rounded label used for tags, filters and meta info. */
export function Pill({ label, variant = 'white', icon, onPress, size = 'md', style }: Props) {
  const v = variantStyles[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        { backgroundColor: v.bg, borderColor: v.border ?? 'transparent', opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={size === 'sm' ? 13 : 16} color={v.fg} />}
      <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: v.fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  sm: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs + 2 },
  label: { fontFamily: fonts.bold, fontSize: fontSizes.sm },
  labelSm: { fontSize: fontSizes.xs },
});
