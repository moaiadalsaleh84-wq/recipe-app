import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Share, StyleSheet, Text, TextInput, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { Reveal } from '../../../components/Reveal';
import { ConfettiBurst } from '../../../components/ConfettiBurst';
import { useToast } from '../../../components/Toast';
import { CheckCircle, EmptyState, HeaderButton, IconButton, Ring, Section, Separator } from '../../../components/ui';
import { aisleOrder, type GroceryItem } from '../../../data/mock';
import { haptics } from '../../../lib/haptics';
import { plainFractions } from '../../../lib/qty';
import { TabScreen } from '../../../components/TabScreen';
import { formatQty, useStore } from '../../../state/store';
import { cook, useTheme } from '../../../theme';

export default function GroceriesScreen() {
  const t = useTheme();
  const toast = useToast();
  const { groceries, toggleGrocery, removeGrocery, clearCompleted, addCustomItem, undoGroceries } = useStore();
  const [draft, setDraft] = useState('');
  // Confetti once, when the last item goes in the basket.
  const [party, setParty] = useState(0);

  const done = groceries.filter((g) => g.checked).length;
  const total = groceries.length;

  const groups = useMemo(
    // Within each aisle, what's still to buy comes first; ticked items move to the bottom.
    () =>
      aisleOrder
        .map((aisle) => ({ aisle, items: groceries.filter((g) => g.aisle === aisle).sort((a, b) => Number(a.checked) - Number(b.checked)) }))
        .filter((g) => g.items.length),
    [groceries],
  );

  const shareList = useCallback(async () => {
    const lines = aisleOrder.flatMap((aisle) => {
      const items = groceries.filter((g) => g.aisle === aisle && !g.checked);
      return items.length ? [aisle, ...items.map((g) => `• ${g.name} (${formatQty(g.quantity, g.unit)})`), ''] : [];
    });
    if (lines.length === 0) {
      toast({ message: 'Nothing left to buy, nothing to share!', tone: 'info' });
      return;
    }
    try {
      await Share.share({ title: 'Grocery list', message: ['Grocery list', '', ...lines].join('\n').trim() });
    } catch {
      toast({ message: 'Sharing isn’t available on this device', tone: 'warning' });
    }
  }, [groceries, toast]);

  const clearDone = () => {
    const n = clearCompleted();
    toast({ message: `Cleared ${n} completed ${n === 1 ? 'item' : 'items'}`, icon: 'trash', tone: 'info', action: { label: 'Undo', onPress: undoGroceries } });
  };
  const headerRight = <HeaderButton icon="share" accessibilityLabel="Share grocery list" onPress={shareList} />;

  const toggle = (item: GroceryItem) => {
    toggleGrocery(item.key);
    if (item.checked) return;
    if (done + 1 === total) {
      haptics.success();
      setParty((n) => n + 1);
    }
  };

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    addCustomItem(name);
    setDraft('');
    toast({ message: `Added ${name}`, icon: 'cart' });
  };

  const remove = (item: GroceryItem) => {
    haptics.heavy();
    removeGrocery(item.key);
    toast({ message: `Removed ${item.name}`, icon: 'trash', tone: 'info', action: { label: 'Undo', onPress: undoGroceries } });
  };


  const fromRecipes = new Set(groceries.flatMap((g) => g.recipeIds)).size;
  const own = groceries.filter((g) => g.recipeIds.length === 0).length;
  const toBuy = total - done;

  return (
    <View style={{ flex: 1 }}>
    <TabScreen title="Grocery list" kicker={total === 0 ? 'Nothing to buy yet' : toBuy === 0 ? 'All done' : `${toBuy} ${toBuy === 1 ? 'thing' : 'things'} to buy`} right={headerRight} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
      {/* Where you are: a ring that fills as items go in the basket */}
      {total > 0 && (
        <Reveal index={0}>
        <View style={[styles.hero, { backgroundColor: t.isDark ? t.colors.elevated : cook.background, borderColor: t.isDark ? t.colors.border : cook.background }, t.shadow.card]}>
          <Ring value={done / total} size={64} stroke={7} color={done === total ? cook.done : cook.accent} track={cook.track} label="Shopping progress">
            {done === total ? (
              <Icon name="check" size={24} color={cook.done} weight="bold" />
            ) : (
              <Text style={[t.type.headline, { color: cook.label, fontVariant: ['tabular-nums'] }]}>
                {done}/{total}
              </Text>
            )}
          </Ring>
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text style={[t.type.title3, { color: cook.label }]} testID="grocery-progress">
              {done === total ? 'Everything’s in the basket' : `${done} of ${total} in your basket`}
            </Text>
            <Text style={[t.type.footnote, { color: cook.secondaryLabel }]}>
              {done === total
                ? 'Nice shopping. Clear the list when you’re ready.'
                : [fromRecipes ? `From ${fromRecipes} ${fromRecipes === 1 ? 'recipe' : 'recipes'}` : '', own ? `${own} of your own` : ''].filter(Boolean).join(' · ')}
            </Text>
            {done > 0 && (
            <PressableScale onPress={clearDone} hitSlop={6} accessibilityLabel={`Clear ${done} completed ${done === 1 ? 'item' : 'items'}`} style={[styles.clear, { backgroundColor: done === total ? cook.accent : cook.cardStrong }]}>
              <Text style={[t.type.footnote, { color: done === total ? cook.onAccent : cook.label, fontFamily: t.fonts.bold }]}>Clear done</Text>
            </PressableScale>
            )}
          </View>
        </View>
        </Reveal>
      )}

      {/* Quick add */}
      <View style={[styles.addRow, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
        <Icon name="plus" size={18} color={t.colors.tint} weight="bold" />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder="Add an item"
          placeholderTextColor={t.colors.tertiaryLabel}
          returnKeyType="done"
          blurOnSubmit={false}
          accessibilityLabel="New grocery item"
          style={[t.type.body, styles.addInput, { color: t.colors.label }]}
        />
        {draft.trim().length > 0 && (
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
            <PressableScale onPress={add} accessibilityLabel="Add item to list" style={[styles.addButton, { backgroundColor: t.colors.tintFill }]}>
              <Text style={[t.type.subhead, { color: t.colors.onTint, fontFamily: t.fonts.bold }]}>Add</Text>
            </PressableScale>
          </Animated.View>
        )}
      </View>

      {total === 0 ? (
        <EmptyState
          icon="cart"
          photos={['butter-chicken', 'pepper-feta-penne', 'apple-turnovers']}
          title="Your list is empty"
          message="Add items here, or add a recipe’s ingredients from its page or your weekly plan."
          action={{ label: 'Browse recipes', icon: 'book', onPress: () => router.navigate('/') }}
        />
      ) : (
        <>
          {/* Each aisle on its own card, with its name and count above it */}
          {groups.map((g, gi) => (
            <Animated.View key={g.aisle} layout={LinearTransition.duration(220)} entering={FadeInDown.duration(300).delay(gi * 50)}>
              <View style={styles.aisleHead}>
                <Text style={[t.type.headline, { color: t.colors.label }]} accessibilityRole="header">
                  {g.aisle}
                </Text>
                <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
                  {g.items.filter((i) => !i.checked).length ? `${g.items.filter((i) => !i.checked).length} left` : 'Done'}
                </Text>
              </View>
              <Section>
                {g.items.map((item, i) => (
                  <Animated.View key={item.key} layout={LinearTransition.duration(220)} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
                    {i > 0 && <Separator inset={60} />}
                    <GroceryRow item={item} onToggle={() => toggle(item)} onDelete={() => remove(item)} />
                  </Animated.View>
                ))}
              </Section>
            </Animated.View>
          ))}
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center' }]}>Swipe left on an item to delete it.</Text>
        </>
      )}
    </TabScreen>
    {party > 0 && done === total && <ConfettiBurst key={party} count={60} />}
    </View>
  );
}

function GroceryRow({ item, onToggle, onDelete }: { item: GroceryItem; onToggle: () => void; onDelete: () => void }) {
  const t = useTheme();
  const { getRecipe } = useStore();
  const sources = item.recipeIds.map((id) => getRecipe(id)?.title).filter(Boolean).join(', ');
  // A swipe must never also count as a tap that ticks the item.
  const swiping = useRef(false);
  const startSwipe = () => {
    swiping.current = true;
  };
  const endSwipe = () => {
    setTimeout(() => (swiping.current = false), 250);
  };

  return (
    <ReanimatedSwipeable
      friction={1.6}
      rightThreshold={44}
      overshootRight={false}
      onSwipeableOpenStartDrag={startSwipe}
      onSwipeableCloseStartDrag={startSwipe}
      onSwipeableWillOpen={() => haptics.select()}
      onSwipeableOpen={endSwipe}
      onSwipeableClose={endSwipe}
      // No close() before deleting: the row unmounts, and closing a gesture mid-unmount errors.
      renderRightActions={(progress) => <DeleteAction progress={progress} label={`Delete ${item.name}`} onPress={onDelete} />}
    >
      <PressableScale
        onPress={() => {
          if (swiping.current) return;
          haptics.select();
          onToggle();
        }}
        haptic={null}
        scaleTo={0.99}
        accessibilityRole="checkbox"
        aria-checked={item.checked}
        accessibilityLabel={`${item.name}, ${formatQty(item.quantity, item.unit)}`}
        accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}
        style={[styles.row, { backgroundColor: t.colors.cell }]}
      >
        <CheckCircle checked={item.checked} color={t.colors.success} />
        <View style={{ flex: 1 }}>
          <Text
            style={[
              t.type.body,
              { color: item.checked ? t.colors.secondaryLabel : t.colors.label },
              item.checked && styles.struck,
            ]}
          >
            {item.name}
          </Text>
          {!!sources && (
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 1 }]}>
              {sources}
            </Text>
          )}
        </View>
        {/* the amount fades and is crossed out together with the name */}
        <Text style={[t.type.subhead, { color: item.checked ? t.colors.secondaryLabel : t.colors.label, fontVariant: ['tabular-nums'] }, item.checked && styles.struck]}>
          {plainFractions(formatQty(item.quantity, item.unit))}
        </Text>
      </PressableScale>
    </ReanimatedSwipeable>
  );
}

/** Red delete button revealed by swiping. Hidden until the swipe starts so it never peeks past rounded corners. */
function DeleteAction({ progress, label, onPress }: { progress: SharedValue<number>; label: string; onPress: () => void }) {
  const t = useTheme();
  const style = useAnimatedStyle(() => ({ opacity: progress.get() > 0.01 ? 1 : 0 }));
  return (
    <Animated.View style={[styles.delete, { backgroundColor: t.colors.destructive }, style]}>
      <IconButton icon="trash" accessibilityLabel={label} color="#FFFFFF" haptic={null} onPress={onPress} style={{ width: '100%', height: '100%', borderRadius: 0 }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 24, borderWidth: 1, marginBottom: 14, borderCurve: 'continuous' },
  aisleHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 8, paddingHorizontal: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 18, paddingRight: 4, minHeight: 52, borderRadius: 999, borderCurve: 'continuous' },
  addInput: { flex: 1, paddingVertical: 12, outlineStyle: 'none' } as never,
  addButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 999, justifyContent: 'center', borderCurve: 'continuous' },
  progressWrap: { gap: 4, marginTop: 16, marginBottom: 16 },
  doneTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  done: { marginTop: 16, marginBottom: 24, padding: 16, gap: 16, borderRadius: 20, borderCurve: 'continuous' },
  aisle: { paddingHorizontal: 16, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  progressTop: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  clear: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 60 },
  struck: { textDecorationLine: 'line-through' },
  delete: { width: 80, height: '100%' },
});
