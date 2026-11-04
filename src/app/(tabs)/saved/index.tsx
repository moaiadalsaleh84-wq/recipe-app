import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { FavoriteButton, RecipeRow } from '../../../components/RecipeCard';
import { EmptyState, Section, Separator } from '../../../components/ui';
import { getRecipe, type Recipe } from '../../../data/mock';
import { ScreenTitle } from '../../../navigation/screenOptions';
import { useStore } from '../../../state/store';
import { useTheme } from '../../../theme';

export default function SavedScreen() {
  const t = useTheme();
  const { favorites } = useStore();
  const saved = favorites.map((id) => getRecipe(id)).filter((r): r is Recipe => !!r);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: t.colors.groupedBackground }}
      contentContainerStyle={[styles.content, { paddingHorizontal: t.spacing.md }]}
    >
      <ScreenTitle title="Saved" />
      {saved.length === 0 ? (
        <EmptyState
          icon="heart"
          title="No Saved Recipes"
          message="Tap the heart on any recipe to keep it here for later."
          action={{ label: 'Browse Recipes', icon: 'book', onPress: () => router.navigate('/') }}
        />
      ) : (
        <Section footer={`${saved.length} saved ${saved.length === 1 ? 'recipe' : 'recipes'}. Tap the heart to remove one.`}>
          {saved.map((r, i) => (
            <Animated.View key={r.id} layout={LinearTransition.duration(220)} exiting={FadeOut.duration(160)}>
              {i > 0 && <Separator inset={84} />}
              <RecipeRow recipe={r} trailing={<FavoriteButton recipe={r} />} />
            </Animated.View>
          ))}
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 120, width: '100%', maxWidth: 700, alignSelf: 'center' },
});
