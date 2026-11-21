import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Share, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../../components/Text';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeOut, LinearTransition, FadeOutDown, ZoomIn, useAnimatedStyle, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import { enter, uiEase } from '../../../motion';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { Reveal } from '../../../components/Reveal';
import { ConfettiBurst } from '../../../components/ConfettiBurst';
import { useToast } from '../../../components/Toast';
import { CheckCircle, EmptyState, HeaderButton, IconButton, ProgressBar, Section, Separator } from '../../../components/ui';
import { PopCard, PopChip } from '../../../components/pop';
import { aisleOrder, type GroceryItem } from '../../../data/mock';
import { haptics } from '../../../lib/haptics';
import { pantryHas } from '../../../lib/pantry';
import { nb } from '../../../lib/text';
import { useTonightPick } from '../../../lib/tonightPick';
import { plainFractions } from '../../../lib/qty';
import { TabScreen } from '../../../components/TabScreen';
import { useStore } from '../../../state/store';
import { showAmount } from '../../../lib/scale';
import { fonts, useTheme } from '../../../theme';

/** How an aisle is named on screen. "Pantry" is shown as "Cupboard", so it doesn't clash with the Pantry tab (saved data keeps its name). */
const aisleName = (aisle: string) => (aisle === 'Pantry' ? 'Cupboard' : aisle);

export default function GroceriesScreen() {
  const t = useTheme();
  const toast = useToast();
  const { groceries, toggleGrocery, removeGrocery, clearCompleted, addCustomItem, undoGroceries, addIngredients, pantry, profile, units } = useStore();
  const [draft, setDraft] = useState('');
  // Confetti once, when the last item goes in the basket.
  const [party, setParty] = useState(0);

  const done = groceries.filter((g) => g.checked).length;
  const total = groceries.length;

  // What's still to buy, by aisle. Ticked items move into "In the basket" below.
  const groups = useMemo(
    () => aisleOrder.map((aisle) => ({ aisle, items: groceries.filter((g) => g.aisle === aisle && !g.checked) })).filter((g) => g.items.length),
    [groceries],
  );
  const basket = useMemo(() => groceries.filter((g) => g.checked), [groceries]);
  const reduceMotion = useReducedMotion();
  // Rows glide into place as items move, but not on long lists (over 20 items): too much motion.
  const glide = groceries.length <= 20 ? LinearTransition.duration(220) : undefined;
  const [basketOpen, setBasketOpen] = useState(false);

  const shareList = useCallback(async () => {
    const lines = aisleOrder.flatMap((aisle) => {
      const items = groceries.filter((g) => g.aisle === aisle && !g.checked);
      return items.length ? [aisleName(aisle), ...items.map((g) => `• ${g.name} (${showAmount(g.quantity, g.unit, g.name, units, g.aisle).text})`), ''] : [];
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
  }, [groceries, toast, units]);

  const clearDone = () => {
    const n = clearCompleted();
    toast({ message: `Cleared ${n} completed ${n === 1 ? 'item' : 'items'}`, icon: 'trash', tone: 'info', action: { label: 'Undo', onPress: undoGroceries } });
  };
  // Nothing to share on an empty list: no share button then.
  const headerRight = groceries.length > 0 ? <HeaderButton icon="share" accessibilityLabel="Share grocery list" onPress={shareList} /> : undefined;

  // The empty list's one-tap next step: what's missing for tonight's pick (sized for your household).
  const { tonight } = useTonightPick();
  const addTonight = () => {
    if (!tonight) return;
    const r = tonight.recipe;
    const missing = r.ingredients.filter((i) => !pantryHas(pantry, i.name));
    const items = missing.length ? missing : r.ingredients;
    addIngredients(r.id, items, (profile.household ?? r.servings) / r.servings);
    haptics.success();
    toast({ message: `Added ${nb(items.length, items.length === 1 ? 'item' : 'items')} for ${r.title}`, icon: 'cart' });
  };

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


  const toBuy = total - done;

  return (
    <View style={{ flex: 1 }}>
    <TabScreen title="Shopping list" kicker={total === 0 ? 'Nothing to buy yet' : toBuy === 0 ? 'All done' : `${toBuy} left to buy`} right={headerRight} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
      {/* Where you are: a leaf bar that fills as items go in the basket */}
      {total > 0 && (
        <Reveal index={0}>
          <PopCard color={done === total ? t.pop.leafTint : t.pop.white} contentStyle={styles.hero}>
            <View style={styles.heroTop}>
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <Text style={[t.type.title2, { color: t.colors.label }]} testID="grocery-progress">
                  {done === total ? 'Everything’s in the\u00A0basket!' : `${done} of ${total} in your basket`}
                </Text>
                {done === total && <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{'Nice shopping. Clear the list when you’re ready.'}</Text>}
              </View>
            </View>
            <View style={styles.heroBar}>
              <View style={{ flex: 1 }}>
                <ProgressBar value={done / total} color={t.pop.leaf} height={14} label="Shopping progress" />
              </View>
              {done > 0 && <PopChip label="Clear done" icon="trash" color={done === total ? t.pop.sunshine : t.pop.white} onPress={clearDone} accessibilityLabel={`Clear ${done} completed ${done === 1 ? 'item' : 'items'}`} />}
            </View>
          </PopCard>
        </Reveal>
      )}

      {/* Quick add */}
      <View style={[styles.addRow, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
        <Icon name="plus" size={18} color={t.colors.tint} weight="bold" />
        <TextInput maxFontSizeMultiplier={1.3}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder="Add an item"
          placeholderTextColor={t.colors.tertiaryLabel}
          returnKeyType="done"
          blurOnSubmit={false}
          accessibilityLabel="New grocery item"
          style={[t.type.input, styles.addInput, { color: t.colors.label }]}
        />
        {draft.trim().length > 0 && (
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
            <PressableScale onPress={add} accessibilityLabel="Add item to list" style={[styles.addButton, { backgroundColor: t.colors.tintFill, borderColor: t.pop.ink }]}>
              <Text style={[t.type.subhead, { color: t.colors.onTint, fontFamily: t.fonts.black }]}>Add</Text>
            </PressableScale>
          </Animated.View>
        )}
      </View>

      {total === 0 ? (
        <EmptyState
          icon="cart"
          title="Your list is empty"
          message={tonight ? `Tonight’s pick is ${tonight.recipe.title}. Add what you’re missing in one tap.` : 'Add items here, or add a recipe’s ingredients from its page or your weekly plan.'}
          action={tonight ? { label: 'Add tonight’s pick ingredients', icon: 'cartAdd', onPress: addTonight } : { label: 'Browse recipes', icon: 'book', onPress: () => router.navigate('/') }}
          secondary={tonight ? { label: 'Browse recipes', onPress: () => router.navigate('/') } : undefined}
        />
      ) : (
        <>
          {/* Each aisle on its own outlined card, with its name and count above it */}
          {groups.map((g, gi) => (
            <Animated.View key={g.aisle} layout={glide} entering={enter(gi, reduceMotion)}>
              <View style={styles.aisleHead}>
                <Text style={[t.type.title3, { color: t.colors.label }]} accessibilityRole="header">
                  {aisleName(g.aisle)}
                </Text>
                <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{g.items.length} left</Text>
              </View>
              <Section>
                {g.items.map((item, i) => (
                  <Animated.View key={item.key} layout={glide} entering={FadeIn.duration(200)} exiting={reduceMotion ? FadeOut.duration(150) : uiEase(FadeOutDown.duration(200))}>
                    {i > 0 && <Separator inset={60} />}
                    <GroceryRow item={item} onToggle={() => toggle(item)} onDelete={() => remove(item)} />
                  </Animated.View>
                ))}
              </Section>
            </Animated.View>
          ))}

          {/* In the basket: ticked items, folded away until you open it */}
          {basket.length > 0 && (
            <Animated.View layout={glide} style={{ marginTop: groups.length ? 0 : 16 }}>
              <PressableScale
                onPress={() => setBasketOpen((o) => !o)}
                haptic="select"
                scaleTo={0.98}
                aria-expanded={basketOpen}
                accessibilityLabel={`In the basket, ${basket.length} ${basket.length === 1 ? 'item' : 'items'}. ${basketOpen ? 'Hide' : 'Show'}`}
                style={[styles.basketHead, { backgroundColor: t.pop.leafTint, borderColor: t.pop.ink }]}
                testID="basket-toggle"
              >
                <Icon name="cart" size={18} color={t.pop.ink} weight="bold" />
                <Text style={[t.type.headline, { color: t.pop.ink, flex: 1 }]}>
                  In the basket{' '}
                  {/* The count pops each time something lands in the basket. */}
                  <Animated.Text key={basket.length} entering={reduceMotion ? undefined : ZoomIn.springify().damping(9)}>
                    ({basket.length})
                  </Animated.Text>
                </Text>
                <Icon name={basketOpen ? 'chevronDown' : 'chevronRight'} size={14} color={t.pop.ink} weight="bold" />
              </PressableScale>
              {basketOpen && (
                <Animated.View entering={FadeIn.duration(180)} style={{ marginTop: 12 }}>
                  <Section>
                    {basket.map((item, i) => (
                      <Animated.View key={item.key} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
                        {i > 0 && <Separator inset={60} />}
                        <GroceryRow item={item} onToggle={() => toggle(item)} onDelete={() => remove(item)} />
                      </Animated.View>
                    ))}
                  </Section>
                </Animated.View>
              )}
            </Animated.View>
          )}
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 16 }]}>{'Swipe left on an item to delete it.'}</Text>
        </>
      )}
    </TabScreen>
    {party > 0 && done === total && <ConfettiBurst key={party} count={60} />}
    </View>
  );
}

function GroceryRow({ item, onToggle, onDelete }: { item: GroceryItem; onToggle: () => void; onDelete: () => void }) {
  const t = useTheme();
  const { getRecipe, units } = useStore();
  const names = item.recipeIds.map((id) => getRecipe(id)?.title).filter((n): n is string => !!n);
  // One recipe: its name. Several: "For 2 recipes", which opens the list of names.
  const [showSources, setShowSources] = useState(false);
  const tick = () => {
    if (swiping.current) return;
    haptics.select();
    onToggle();
  };
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
      {/* The checkbox only ticks. The rest of the row ticks too, unless the item is for several
          recipes: then it opens the list of recipe names. */}
      <View style={[styles.row, { backgroundColor: t.colors.cell }]}>
        <PressableScale
          onPress={tick}
          haptic={null}
          scaleTo={0.96}
          accessibilityRole="checkbox"
          aria-checked={item.checked}
          accessibilityLabel={`${item.name}, ${showAmount(item.quantity, item.unit, item.name, units, item.aisle).text}`}
          accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}
          style={styles.checkTap}
        >
          <CheckCircle checked={item.checked} color={t.pop.leaf} />
        </PressableScale>
        <PressableScale
          onPress={() => {
            if (swiping.current) return;
            if (names.length > 1) {
              haptics.select();
              setShowSources((v) => !v);
            } else tick();
          }}
          haptic={null}
          scaleTo={0.99}
          accessibilityRole="button"
          aria-expanded={names.length > 1 ? showSources : undefined}
          accessibilityLabel={names.length > 1 ? `For ${names.length} recipes. ${showSources ? 'Hide' : 'Show'} which` : `${item.checked ? 'Untick' : 'Tick'} ${item.name}`}
          style={styles.rowMain}
        >
          <View style={{ flex: 1 }}>
            {/* A name you typed can be long: it gets two lines, then "…". */}
            <Text style={[t.type.body, { color: item.checked ? t.colors.secondaryLabel : t.colors.label }, item.checked && styles.struck]} numberOfLines={2}>
              {item.name}
            </Text>
            {names.length === 1 && <Text style={[styles.sub, { color: t.colors.secondaryLabel }]}>{names[0]}</Text>}
            {names.length > 1 && (
              <Text style={[styles.sub, { color: t.colors.secondaryLabel }]}>
                {showSources ? names.join(', ') : `For\u00A0${names.length}\u00A0recipes\u00A0›`}
              </Text>
            )}
          </View>
          {/* The amount fades and is crossed out together with the name. */}
          <Text style={[t.type.subhead, { color: item.checked ? t.colors.secondaryLabel : t.colors.label, fontVariant: ['tabular-nums'] }, item.checked && styles.struck]}>
            {plainFractions(showAmount(item.quantity, item.unit, item.name, units, item.aisle).text)}
          </Text>
        </PressableScale>
      </View>
    </ReanimatedSwipeable>
  );
}

/** Red delete button revealed by swiping. Hidden until the swipe starts so it never peeks past rounded corners. */
function DeleteAction({ progress, label, onPress }: { progress: SharedValue<number>; label: string; onPress: () => void }) {
  const t = useTheme();
  const style = useAnimatedStyle(() => ({ opacity: progress.get() > 0.01 ? 1 : 0 }));
  return (
    <Animated.View style={[styles.delete, { backgroundColor: t.pop.tomato }, style]}>
      <IconButton icon="trash" accessibilityLabel={label} color={t.pop.ink} haptic={null} onPress={onPress} style={{ width: '100%', height: '100%', borderRadius: 0 }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 16, gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroBar: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  // Lined up with the card's edges: the name at its left, the count at its right.
  aisleHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 4, minHeight: 54, borderRadius: 18, marginTop: 14, borderCurve: 'continuous' },
  addInput: { flex: 1, paddingVertical: 12, outlineStyle: 'none' } as never,
  addButton: { minHeight: 42, paddingHorizontal: 18, borderRadius: 14, borderWidth: 2, justifyContent: 'center', borderCurve: 'continuous' },
  basketHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 16, borderRadius: 18, borderWidth: 2.5, marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 16, minHeight: 60 },
  checkTap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 4, paddingVertical: 10, minHeight: 60 },
  // Under the name: the same style for one recipe or "For 2 recipes ›".
  sub: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, marginTop: 1 },
  struck: { textDecorationLine: 'line-through' },
  delete: { width: 80, height: '100%' },
});
