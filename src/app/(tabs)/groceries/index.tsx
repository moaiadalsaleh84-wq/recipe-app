import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Share, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, withTiming, type SharedValue } from 'react-native-reanimated';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { useToast } from '../../../components/Toast';
import { CheckCircle, EmptyState, IconButton, Section, Separator } from '../../../components/ui';
import { aisleOrder, type GroceryItem } from '../../../data/mock';
import { CatSays } from '../../../components/cats/CatSays';
import { say, type Line } from '../../../components/cats/dialogue';
import { haptics } from '../../../lib/haptics';
import { ScreenTitle } from '../../../navigation/screenOptions';
import { formatQty, useBuddy, useStore } from '../../../state/store';
import { useTheme } from '../../../theme';

export default function GroceriesScreen() {
  const t = useTheme();
  const toast = useToast();
  const buddy = useBuddy();
  const { groceries, toggleGrocery, removeGrocery, clearCompleted, addCustomItem, undoGroceries } = useStore();
  const [reaction, setReaction] = useState<{ line: Line; n: number } | null>(null);
  const [draft, setDraft] = useState('');

  const done = groceries.filter((g) => g.checked).length;
  const total = groceries.length;

  const groups = useMemo(
    () => aisleOrder.map((aisle) => ({ aisle, items: groceries.filter((g) => g.aisle === aisle) })).filter((g) => g.items.length),
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

  // Memoized: ScreenTitle pushes this into the native header on iOS.
  const headerRight = useMemo(() => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <IconButton icon="share" accessibilityLabel="Share grocery list" iconSize={19} onPress={shareList} />
      {done > 0 && (
        <PressableScale
          onPress={() => {
            const n = clearCompleted();
            toast({
              message: `Cleared ${n} completed ${n === 1 ? 'item' : 'items'}`,
              icon: 'trash',
              tone: 'info',
              action: { label: 'Undo', onPress: undoGroceries },
            });
          }}
          accessibilityLabel={`Clear ${done} completed items`}
          style={styles.headerButton}
        >
          <Text style={[t.type.body, { color: t.colors.tint }]}>Clear Done</Text>
        </PressableScale>
      )}
    </View>
  ), [shareList, done, clearCompleted, toast, undoGroceries, t]);

  const toggle = (item: GroceryItem) => {
    toggleGrocery(item.key);
    if (item.checked) return;
    const next = (reaction?.n ?? 0) + 1;
    const willBeDone = done + 1 === total;
    setReaction({ line: say(buddy, willBeDone ? 'listDone' : 'itemChecked', {}, next), n: next });
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

  const progress = total ? done / total : 0;
  const barStyle = useAnimatedStyle(() => ({ width: withTiming(`${progress * 100}%`, { duration: 300 }) }), [progress]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ backgroundColor: t.colors.groupedBackground }}
      contentContainerStyle={[styles.content, { paddingHorizontal: t.spacing.md }]}
    >
      <ScreenTitle title="Groceries" right={headerRight} />

      {/* Quick add */}
      <View style={[styles.addRow, { backgroundColor: t.colors.cell, borderRadius: t.radius.lg, ...t.chunky.card }]}>
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
              <Text style={[t.type.subhead, { color: t.colors.onTint, fontWeight: '600' }]}>Add</Text>
            </PressableScale>
          </Animated.View>
        )}
      </View>

      {total === 0 ? (
        <EmptyState
          icon="cart"
          cat={{ buddy, mood: 'worried' }}
          title="Your List Is Empty"
          message={say(buddy, 'listEmpty').text}
          action={{ label: 'Browse Recipes', icon: 'book', onPress: () => router.navigate('/') }}
        />
      ) : (
        <>
          <View style={styles.progressWrap} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: done }} accessibilityLabel="Shopping progress">
            <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]} testID="grocery-progress">
              {done === total ? 'All done. Nice work!' : `${done} of ${total} items in your basket`}
            </Text>
            <View style={[styles.track, { backgroundColor: t.colors.fill }]}>
              <Animated.View style={[styles.bar, { backgroundColor: t.colors.success }, barStyle]} />
            </View>
          </View>

          <CatSays
            buddy={buddy}
            size={90}
            style={{ marginBottom: 20 }}
            line={done === total ? say(buddy, 'listDone') : reaction?.line ?? say(buddy, 'addedToList')}
          />

          {groups.map((g) => (
            <Animated.View key={g.aisle} layout={LinearTransition.duration(220)}>
              <Section title={g.aisle}>
                {g.items.map((item, i) => (
                  <Animated.View key={item.key} layout={LinearTransition.duration(220)} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
                    {i > 0 && <Separator inset={58} />}
                    <GroceryRow item={item} onToggle={() => toggle(item)} onDelete={() => remove(item)} />
                  </Animated.View>
                ))}
              </Section>
            </Animated.View>
          ))}
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center' }]}>Swipe left on an item to delete it.</Text>
        </>
      )}
    </ScrollView>
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
              { color: item.checked ? t.colors.tertiaryLabel : t.colors.label },
              item.checked && styles.struck,
            ]}
          >
            {item.name}
          </Text>
          {!!sources && (
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 1 }]} numberOfLines={1}>
              {sources}
            </Text>
          )}
        </View>
        <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, fontVariant: ['tabular-nums'] }]}>{formatQty(item.quantity, item.unit)}</Text>
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
  content: { paddingTop: 8, paddingBottom: 120, width: '100%', maxWidth: 700, alignSelf: 'center' },
  headerButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 6, minHeight: 52, borderCurve: 'continuous' },
  addInput: { flex: 1, paddingVertical: 12, outlineStyle: 'none' } as never,
  addButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center', borderCurve: 'continuous' },
  progressWrap: { gap: 8, marginTop: 20, marginBottom: 24, paddingHorizontal: 4 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 11, minHeight: 56 },
  struck: { textDecorationLine: 'line-through' },
  delete: { width: 80, height: '100%' },
});
