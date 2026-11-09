import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { PageHeader } from '../../components/PageHeader';
import { RecipeRow } from '../../components/RecipeCard';
import { useToast } from '../../components/Toast';
import { EmptyState, IconButton, Section, Separator } from '../../components/ui';
import { say } from '../../components/cats/dialogue';
import { FAVORITES_ID, type Recipe } from '../../data/mock';
import { useBuddy, useStore } from '../../state/store';
import { useTheme } from '../../theme';

export default function CookbookScreen() {
  const t = useTheme();
  const toast = useToast();
  const buddy = useBuddy();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { favorites, cookbooks, getRecipe, toggleInCookbook, deleteCookbook, restoreCookbook } = useStore();

  const isFavorites = id === FAVORITES_ID;
  const book = isFavorites ? { id: FAVORITES_ID, name: 'Favorites', recipeIds: favorites } : cookbooks.find((c) => c.id === id);
  const recipes = (book?.recipeIds ?? []).map((rid) => getRecipe(rid)).filter((r): r is Recipe => !!r);

  if (!book) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
        <PageHeader title="Cookbook" />
        <EmptyState icon="book" cat={{ buddy, mood: 'worried' }} title="Cookbook Not Found" message="It may have been deleted." />
      </View>
    );
  }

  const remove = (r: Recipe) => {
    toggleInCookbook(book.id, r.id);
    toast({
      message: `Removed from ${book.name}`,
      tone: 'info',
      icon: 'book',
      action: { label: 'Undo', onPress: () => toggleInCookbook(book.id, r.id) },
    });
  };

  const actions = isFavorites ? null : (
    <>
      <IconButton icon="edit" accessibilityLabel={`Rename ${book.name}`} iconSize={18} onPress={() => router.push({ pathname: '/cookbook-edit', params: { id: book.id } })} />
      <IconButton
        icon="trash"
        accessibilityLabel={`Delete ${book.name}`}
        color={t.colors.destructive}
        iconSize={18}
        onPress={() => {
          const removed = deleteCookbook(book.id);
          router.back();
          if (removed) toast({ message: `Deleted ${removed.name}`, icon: 'trash', tone: 'info', action: { label: 'Undo', onPress: () => restoreCookbook(removed) } });
        }}
      />
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <PageHeader title={book.name} subtitle={`${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}`} right={actions} />
      <ScrollView contentContainerStyle={styles.content}>
        {recipes.length === 0 ? (
          <EmptyState
            icon="book"
            cat={{ buddy, mood: isFavorites ? 'love' : 'think' }}
            title={isFavorites ? 'No Favorites Yet' : 'This Cookbook Is Empty'}
            message={isFavorites ? say(buddy, 'savedEmpty').text : 'Open a recipe and tap the bookmark to add it here.'}
            action={{ label: 'Browse Recipes', icon: 'book', onPress: () => router.dismissTo('/') }}
          />
        ) : (
          <Section>
            {recipes.map((r, i) => (
              <Animated.View key={r.id} layout={LinearTransition.duration(220)} exiting={FadeOut.duration(160)}>
                {i > 0 && <Separator inset={84} />}
                <RecipeRow
                  recipe={r}
                  trailing={
                    <IconButton
                      icon={isFavorites ? 'heartFill' : 'close'}
                      accessibilityLabel={`Remove ${r.title} from ${book.name}`}
                      color={isFavorites ? t.colors.accent : t.colors.secondaryLabel}
                      iconSize={isFavorites ? 20 : 15}
                      onPress={() => remove(r)}
                    />
                  }
                />
              </Animated.View>
            ))}
          </Section>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 80, width: '100%', maxWidth: 700, alignSelf: 'center' },
});
