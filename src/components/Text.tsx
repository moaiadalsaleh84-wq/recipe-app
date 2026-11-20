import type { ComponentProps } from 'react';
import { Text as RNText } from 'react-native';

/** Largest the iOS text size setting may make any text, so bigger text never breaks a layout. */
export const MAX_FONT_SCALE = 1.3;

/**
 * The app's Text: React Native's Text with the text size capped at 1.3x the normal size.
 * Use it everywhere instead of importing Text from react-native. (A ref passes straight through.)
 */
export function Text({ maxFontSizeMultiplier, ...rest }: ComponentProps<typeof RNText>) {
  return <RNText {...rest} maxFontSizeMultiplier={Math.min(maxFontSizeMultiplier ?? MAX_FONT_SCALE, MAX_FONT_SCALE)} />;
}
