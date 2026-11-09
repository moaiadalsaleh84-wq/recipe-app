import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { PressableScale } from '../components/PressableScale';
import { CheckCircle, Section, Separator } from '../components/ui';
import { FAVORITES_ID } from '../data/mock';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

/** Sheet: tick the cookbooks a recipe belongs to. Changes apply immediately. */
export default function SaveToCookbook() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipe, cookbooks, favorites, toggleInCookbook } = useStore();
  const recipe = getRecipe(id);

  const rows = [{ id: FAVORITES_ID, name: 'Favorites', recipeIds: favorites }, ...cookbooks];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <PageHeader
        title="Save to Cookbook"
        subtitle={recipe?.title}
        mode="cancel"
        inSheet
        right={
          <PressableScale onPress={() => router.back()} style={styles.done} accessibilityLabel="Done">
            <Text style={[t.type.headline, { color: t.colors.tint }]}>Done</Text>
          </PressableScale>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {recipe && (
          <Section>
            {rows.map((cb, i) => {
              const inBook = cb.recipeIds.includes(recipe.id);
              return (
                <View key={cb.id}>
                  {i > 0 && <Separator inset={56} />}
                  <PressableScale
                    onPress={() => toggleInCookbook(cb.id, recipe.id)}
                    haptic="select"
                    scaleTo={0.99}
                    accessibilityRole="checkbox"
                    aria-checked={inBook}
                    accessibilityLabel={cb.name}
                    style={styles.row}
                  >
                    <CheckCircle checked={inBook} color={t.colors.success} />
                    <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>{cb.name}</Text>
                    <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>{cb.recipeIds.length}</Text>
                  </PressableScale>
                </View>
              );
            })}
            <Separator inset={56} />
            <PressableScale
              onPress={() => router.push({ pathname: '/cookbook-edit', params: { addRecipe: recipe.id } })}
              accessibilityLabel="New cookbook with this recipe"
              scaleTo={0.99}
              style={styles.row}
            >
              <View style={[styles.plus, { backgroundColor: t.colors.tintSoft }]}>
                <Icon name="plus" size={15} color={t.colors.tint} weight="bold" />
              </View>
              <Text style={[t.type.body, { color: t.colors.tint, fontWeight: '600' }]}>New cookbook…</Text>
            </PressableScale>
          </Section>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 52 },
  plus: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  done: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
