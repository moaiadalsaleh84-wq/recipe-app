import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Confetti } from '../../components/Confetti';
import { Pill } from '../../components/Pill';
import { RecipeCard } from '../../components/RecipeCard';
import { categories, recipes } from '../../data/mock';
import { colors, fonts, fontSizes, radius, spacing } from '../../theme';

const today = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<(typeof categories)[number]>('All');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter(
      (r) => (category === 'All' || r.category === category) && (!q || r.title.toLowerCase().includes(q)),
    );
  }, [category, query]);

  const quick = recipes.filter((r) => r.minutes <= 20);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <Confetti seed={2} />
        <View style={styles.heroTop}>
          <Pill label="My kitchen" icon="location-outline" variant="white" />
          <Pill label={today} variant="glass" />
        </View>
        <Text style={styles.heroTitle}>What’s cooking{'\n'}today?</Text>
        <Text style={styles.heroSub}>
          {recipes.length} saved recipes, 3 meals planned and one very hungry week ahead.
        </Text>

        <View style={styles.search}>
          <Ionicons name="search" size={20} color={colors.inkMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your recipes"
            placeholderTextColor={colors.inkMuted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Ionicons name="close-circle" size={20} color={colors.inkMuted} onPress={() => setQuery('')} />
          )}
        </View>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {categories.map((c) => (
          <Pill key={c} label={c} variant={c === category ? 'ink' : 'outline'} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>

      {/* Quick picks */}
      {category === 'All' && !query && (
        <>
          <SectionHeader title="Ready in 20 min" emoji="⚡️" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            {quick.map((r) => (
              <RecipeCard key={r.id} recipe={r} variant="compact" />
            ))}
          </ScrollView>
        </>
      )}

      <SectionHeader title={category === 'All' ? 'Your recipes' : category} count={filtered.length} />
      <View style={styles.list}>
        {filtered.map((r) => (
          <RecipeCard key={r.id} recipe={r} />
        ))}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🥄</Text>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySub}>Try another search or category.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function SectionHeader({ title, emoji, count }: { title: string; emoji?: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {title} {emoji}
      </Text>
      {count !== undefined && <Text style={styles.sectionCount}>{count}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  heroTitle: {
    fontFamily: fonts.extrabold,
    fontSize: fontSizes.display,
    lineHeight: fontSizes.display * 1.05,
    color: colors.white,
    letterSpacing: -1.2,
  },
  heroSub: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.4,
    color: colors.textOnColorMuted,
    marginTop: spacing.sm,
    maxWidth: 320,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 52,
    marginTop: spacing.lg,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: fontSizes.md, color: colors.ink, height: '100%' },
  chips: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontFamily: fonts.extrabold, fontSize: fontSizes.xl, color: colors.ink, letterSpacing: -0.4 },
  sectionCount: { fontFamily: fonts.bold, fontSize: fontSizes.sm, color: colors.inkMuted },
  quickRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  list: { gap: spacing.md, paddingHorizontal: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xxs },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: fontSizes.lg, color: colors.ink },
  emptySub: { fontFamily: fonts.regular, fontSize: fontSizes.sm, color: colors.inkMuted },
});
