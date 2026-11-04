import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Confetti } from '../../components/Confetti';
import { Pill } from '../../components/Pill';
import { ProgressSegments } from '../../components/ProgressSegments';
import { aisleEmoji, aisleOrder, getRecipe, type GroceryItem } from '../../data/mock';
import { formatQty, useGroceries } from '../../state/GroceryContext';
import { colors, fonts, fontSizes, radius, shadow, spacing } from '../../theme';

const SEGMENTS = 8;

export default function GroceryScreen() {
  const insets = useSafeAreaInsets();
  const { items, toggle, clearChecked } = useGroceries();

  const done = items.filter((i) => i.checked).length;
  const total = items.length;
  const recipeCount = new Set(items.flatMap((i) => i.recipeIds)).size;

  const groups = useMemo(
    () =>
      aisleOrder
        .map((aisle) => ({ aisle, items: items.filter((i) => i.aisle === aisle) }))
        .filter((g) => g.items.length > 0),
    [items],
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <Confetti seed={4} />
        <ProgressSegments total={SEGMENTS} done={total ? Math.round((done / total) * SEGMENTS) : 0} />
        <Text style={styles.kicker}>This week’s shop</Text>
        <Text style={styles.title}>Grocery list</Text>
        <Text style={styles.sub}>
          {total === 0
            ? 'All clear. Add ingredients from any recipe.'
            : done === total
              ? 'Everything is in the basket. Nice work!'
              : `${done} of ${total} items in the basket.`}
        </Text>
        <View style={styles.pills}>
          <Pill label={`${total - done} to go`} variant="white" icon="basket-outline" />
          <Pill label={`From ${recipeCount} recipes`} variant="accent" />
          {done > 0 && <Pill label="Clear checked" variant="ink" icon="trash-outline" onPress={clearChecked} />}
        </View>
      </View>

      <View style={styles.groups}>
        {groups.map((g) => (
          <View key={g.aisle} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.aisleEmoji}>{aisleEmoji[g.aisle]}</Text>
              <Text style={styles.aisleTitle}>{g.aisle}</Text>
              <Text style={styles.aisleCount}>
                {g.items.filter((i) => i.checked).length}/{g.items.length}
              </Text>
            </View>
            {g.items.map((item, idx) => (
              <GroceryRow key={item.key} item={item} onToggle={() => toggle(item.key)} last={idx === g.items.length - 1} />
            ))}
          </View>
        ))}

        {total === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={styles.emptyTitle}>Your basket is empty</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function GroceryRow({ item, onToggle, last }: { item: GroceryItem; onToggle: () => void; last: boolean }) {
  const sources = item.recipeIds.map((id) => getRecipe(id)?.title).filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.checked }}
      style={[styles.row, !last && styles.rowBorder]}
    >
      <View style={[styles.check, item.checked && styles.checkOn]}>
        {item.checked && <Ionicons name="checkmark" size={16} color={colors.white} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemName, item.checked && styles.itemDone]}>{item.name}</Text>
        {!!sources && (
          <Text style={styles.itemSource} numberOfLines={1}>
            {sources}
          </Text>
        )}
      </View>
      <Text style={[styles.itemQty, item.checked && styles.itemDone]}>{formatQty(item.quantity, item.unit)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
  },
  kicker: { fontFamily: fonts.semibold, fontSize: fontSizes.md, color: colors.textOnColorMuted, marginTop: spacing.lg },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: fontSizes.display,
    lineHeight: fontSizes.display * 1.05,
    color: colors.white,
    letterSpacing: -1.2,
  },
  sub: { fontFamily: fonts.regular, fontSize: fontSizes.md, color: colors.textOnColorMuted, marginTop: spacing.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  groups: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  aisleEmoji: { fontSize: 20 },
  aisleTitle: { flex: 1, fontFamily: fonts.extrabold, fontSize: fontSizes.lg, color: colors.ink },
  aisleCount: { fontFamily: fonts.bold, fontSize: fontSizes.sm, color: colors.inkMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  itemName: { fontFamily: fonts.semibold, fontSize: fontSizes.md, color: colors.ink },
  itemSource: { fontFamily: fonts.regular, fontSize: fontSizes.xs, color: colors.inkMuted, marginTop: 2 },
  itemQty: { fontFamily: fonts.bold, fontSize: fontSizes.sm, color: colors.inkMuted },
  itemDone: { textDecorationLine: 'line-through', color: colors.inkMuted, opacity: 0.6 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.xs },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: fontSizes.lg, color: colors.ink },
});
