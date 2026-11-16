import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Share, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { useToast } from '../../../components/Toast';
import { CheckCircle, EmptyState, HeaderButton, IconButton, ProgressBar, Section, Separator } from '../../../components/ui';
import { aisleOrder, type GroceryItem } from '../../../data/mock';
import { MascotSays } from '../../../components/mascot/MascotSays';
import { say, type Line } from '../../../components/mascot/lines';
import { haptics } from '../../../lib/haptics';
import { ScreenTitle, useTabContent } from '../../../navigation/screenOptions';
import { formatQty, useStore } from '../../../state/store';
import { useTheme } from '../../../theme';

export default function GroceriesScreen() {
  const t = useTheme();
  const toast = useToast();
  const { groceries, toggleGrocery, removeGrocery, clearCompleted, addCustomItem, undoGroceries } = useStore();
  const [reaction, setReaction] = useState<{ line: Line; n: number } | null>(null);
  const [draft, setDraft] = useState('');
  const [surprise] = useState(() => Math.random());
  const content = useTabContent();

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

  const clearDone = () => {
    const n = clearCompleted();
    toast({ message: `Cleared ${n} completed ${n === 1 ? 'item' : 'items'}`, icon: 'trash', tone: 'info', action: { label: 'Undo', onPress: undoGroceries } });
  };
  const headerRight = <HeaderButton icon="share" accessibilityLabel="Share grocery list" onPress={shareList} />;

  const toggle = (item: GroceryItem) => {
    toggleGrocery(item.key);
    if (item.checked) return;
    if (done + 1 === total) haptics.success();
    const next = (reaction?.n ?? 0) + 1;
    const willBeDone = done + 1 === total;
    setReaction({ line: say(willBeDone ? 'listDone' : 'itemChecked', {}, next, (surprise + next * 0.31) % 1), n: next });
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


  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ backgroundColor: t.colors.background }}
      contentContainerStyle={content}
    >
      <ScreenTitle title="Groceries" right={headerRight} />

      {/* Quick add */}
      <View style={[styles.addRow, { backgroundColor: t.colors.cell, borderRadius: 16, ...t.chunky.card }]}>
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
              <Text style={[t.type.subhead, { color: t.colors.onTint, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>Add</Text>
            </PressableScale>
          </Animated.View>
        )}
      </View>

      {total === 0 ? (
        <EmptyState
          icon="cart"
          cat="thinking"
          title="Your list is empty"
          message={say('listEmpty').text}
          action={{ label: 'Browse recipes', icon: 'book', onPress: () => router.navigate('/') }}
        />
      ) : (
        <>
          <View style={styles.progressWrap}>
            <View style={styles.progressTop}>
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, flex: 1 }]} testID="grocery-progress">
                {done === total ? 'All done. Nice work!' : `${done} of ${total} items in your basket`}
              </Text>
              {done > 0 && (
                <PressableScale onPress={clearDone} accessibilityLabel={`Clear ${done} completed items`} style={styles.clear}>
                  <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>Clear done</Text>
                </PressableScale>
              )}
            </View>
            <ProgressBar value={total ? done / total : 0} height={12} label="Shopping progress" />
          </View>

          <MascotSays
            size={80}
            style={{ marginBottom: t.layout.section }}
            line={done === total ? say('listDone') : reaction?.line ?? say('addedToList')}
          />

          {groups.map((g) => (
            <Animated.View key={g.aisle} layout={LinearTransition.duration(220)}>
              <Section title={g.aisle}>
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
              { color: item.checked ? t.colors.secondaryLabel : t.colors.label },
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
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 4, minHeight: 50, borderCurve: 'continuous' },
  addInput: { flex: 1, paddingVertical: 12, outlineStyle: 'none' } as never,
  addButton: { minHeight: 40, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', borderCurve: 'continuous' },
  progressWrap: { gap: 4, marginTop: 16, marginBottom: 16 },
  progressTop: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  clear: { minHeight: 44, justifyContent: 'center', paddingLeft: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 60 },
  struck: { textDecorationLine: 'line-through' },
  delete: { width: 80, height: '100%' },
});
