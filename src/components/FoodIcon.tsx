/**
 * Ingredient photos for ingredient lists, the pantry and the grocery list.
 *
 *   <FoodIcon name="Red peppers" aisle="Produce" />
 *
 * Each ingredient is matched to a kind (lib/foodKind.ts: "Red peppers" → pepper) and shown with a
 * real photo of that kind from assets/ingredients (see INGREDIENT_PHOTOS). Kinds without a photo
 * yet show nothing, so lists stay clean typography instead of falling back to drawings or emoji.
 */
import { Image } from 'expo-image';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { foodKind } from '../lib/foodKind';
import { INGREDIENT_PHOTOS } from './ingredientPhotos';

export { foodKind };

export function FoodIcon({ name, aisle, size = 32, bare = false }: { name: string; aisle?: string; size?: number; /** Smaller corner, no ring (inside chips). */ bare?: boolean }) {
  const t = useTheme();
  const photo = INGREDIENT_PHOTOS[foodKind(name, aisle)];
  if (!photo) return null;
  return (
    <View
      style={{ width: size, height: size, borderRadius: bare ? size / 2 : size * 0.3, overflow: 'hidden', backgroundColor: t.colors.imagePlaceholder, borderWidth: bare ? 0 : 1, borderColor: t.colors.border }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Image source={photo} style={{ width: size, height: size }} contentFit="cover" transition={150} cachePolicy="memory-disk" recyclingKey={foodKind(name, aisle)} accessibilityIgnoresInvertColors />
    </View>
  );
}
