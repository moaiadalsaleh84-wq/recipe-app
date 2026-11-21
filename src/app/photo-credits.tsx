import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { PressableScale } from '../components/PressableScale';
import { Text } from '../components/Text';
import { useToast } from '../components/Toast';
import { bundledPhotoNote, photoCredits } from '../data/photoCredits';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

/** Settings → Photo credits: who took each recipe photo, where it's from, and its license. */
export default function PhotoCredits() {
  const t = useTheme();
  const toast = useToast();
  const { getRecipe } = useStore();
  const open = (url: string) => Linking.openURL(url).catch(() => toast({ message: 'Couldn’t open the link', tone: 'warning' }));
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <PageHeader title="Photo credits" mode="cancel" inSheet />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[t.type.body, { color: t.colors.secondaryLabel }]}>Recipe photos are from Unsplash and Pexels, free for commercial use. Thank you to these photographers.</Text>
        {photoCredits.length === 0 ? (
          <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginTop: 16 }]} testID="credits-empty">
            New recipe photos are still being chosen.
          </Text>
        ) : (
          photoCredits.map((c) => (
            <PressableScale key={c.recipeId} onPress={() => open(c.url)} accessibilityRole="link" accessibilityLabel={`${getRecipe(c.recipeId)?.title ?? c.recipeId}, photo by ${c.photographer} on ${c.site}`} style={[styles.row, { backgroundColor: t.colors.cell, borderColor: t.pop.ink }]} scaleTo={0.99}>
              <Text style={[t.type.headline, { color: t.colors.label }]}>{getRecipe(c.recipeId)?.title ?? c.recipeId}</Text>
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>
                Photo by {c.photographer} on {c.site} · {c.license}
              </Text>
            </PressableScale>
          ))
        )}
        <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 20 }]}>{bundledPhotoNote}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60, width: '100%', maxWidth: 640, alignSelf: 'center' },
  row: { marginTop: 12, padding: 14, borderRadius: 16, borderWidth: 2, gap: 2 },
});
