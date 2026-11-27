import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Share, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../../components/Text';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeOut, LinearTransition, FadeOutDown, FadeOutLeft, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { enter, uiEase } from '../../../motion';
import { Icon, type IconName } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { Reveal } from '../../../components/Reveal';
import { ConfettiBurst } from '../../../components/ConfettiBurst';
import { useToast } from '../../../components/Toast';
import { CheckCircle, HeaderButton, IconButton, ProgressBar, Section, Separator, TextButton } from '../../../components/ui';
import { PopButton, PopCard, PopChip } from '../../../components/pop';
import { aisleOrder, type GroceryItem } from '../../../data/mock';
import { splitItems } from '../../../lib/groceries';
import { haptics } from '../../../lib/haptics';
import { playSound } from '../../../lib/sounds';
import { useTonightPick } from '../../../lib/tonightPick';
import { TabScreen } from '../../../components/TabScreen';
import { useStore } from '../../../state/store';
import { showAmount } from '../../../lib/scale';
import { fonts, pop, useTheme } from '../../../theme';
import { Fox, foxReact } from '../../../components/mascot/Fox';

/** How an aisle is named on screen (saved data keeps the short names). */
/** Grocery-store names for the aisles. */
const AISLE_NAMES: Record<string, string> = { Produce: 'Produce', 'Meat & Fish': 'Meat, Poultry & Fish', 'Dairy & Eggs': 'Dairy & Refrigerated', Pantry: 'Pantry & Spices', Bakery: 'Bakery', Other: 'Other' };
const aisleName = (aisle: string) => AISLE_NAMES[aisle] ?? aisle;

export default function GroceriesScreen() {
  const t = useTheme();
  const toast = useToast();
  const { groceries, leftToBuy, toggleGrocery, removeGrocery, clearCompleted, undoGroceries, units } = useStore();
  // The empty list's one button adds what tonight's dinner needs.
  const { tonight } = useTonightPick();
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
      toast({ message: 'Nothing to share yet. Add a few items first.', tone: 'info' });
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

  // `quiet`: the row already ticked and played the sound itself (a tap); a swipe hasn't.
  const toggle = (item: GroceryItem, quiet = false) => {
    toggleGrocery(item.key);
    if (item.checked) return;
    // A soft tick when something goes in the basket (Settings → Sounds; follows the silent switch).
    if (!quiet) playSound('tick');
    // The last one: a small celebration (confetti, a chime, the fox cheers).
    if (done + 1 === total) {
      haptics.success();
      playSound('celebrate');
      foxReact('cheer');
      setParty((n) => n + 1);
    }
  };


  const remove = (item: GroceryItem) => {
    haptics.heavy();
    removeGrocery(item.key);
    toast({ message: `Removed ${item.name}`, icon: 'trash', tone: 'info', action: { label: 'Undo', onPress: undoGroceries } });
  };


  const toBuy = leftToBuy;

  return (
    <View style={{ flex: 1 }}>
    <TabScreen
      title="Shopping list"
      kicker={total === 0 ? undefined : toBuy === 0 ? 'All done' : `${toBuy} left to buy`}
      right={headerRight}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      {/* Type an item and press return; it lands on the list and the box stays ready for the next. */}
      <AddItemField />

      {/* Where you are: a leaf bar that fills as items go in the basket (only once one is in, so a
          new list never opens on "0 of 5"). */}
      {total > 0 && done > 0 && (
        <Reveal index={0} style={{ marginTop: 16 }}>
          <PopCard color={done === total ? t.pop.leafTint : t.pop.white} contentStyle={styles.hero}>
            <View style={styles.heroTop}>
              {/* All done: the bar is full and green, and the message slides in. */}
              <Animated.View key={done === total ? 'all-done' : 'counting'} entering={done === total ? enter(0, reduceMotion) : undefined} style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <Text style={[t.type.title2, { color: t.colors.label }]} testID="grocery-progress">
                  {done === total ? 'Everything’s in the\u00A0basket.' : `${done} of ${total} in your basket`}
                </Text>
                {done === total && <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{'Go get cooking!'}</Text>}
              </Animated.View>
            </View>
            {/* Room for the Clear done button only when it shows (no empty gap under the bar). */}
            <View style={[styles.heroBar, done > 0 && { minHeight: 44 }]}>
              <View style={{ flex: 1 }}>
                <ProgressBar value={done / total} color={t.pop.leaf} height={14} label="Shopping progress" />
              </View>
              {done > 0 && <PopChip label="Clear done" icon="trash" color={done === total ? t.pop.sunshine : t.pop.white} onPress={clearDone} accessibilityLabel={`Clear ${done} completed ${done === 1 ? 'item' : 'items'}`} />}
            </View>
          </PopCard>
        </Reveal>
      )}

      {total === 0 ? (
        // Empty: a small picture, one line, and one next step (nothing is ever added for you).
        <Animated.View entering={enter(0, reduceMotion)} style={styles.empty} testID="list-empty">
          <Fox pose="sleepy" size={96} />
          <Text style={[t.type.body, { color: t.colors.secondaryLabel, textAlign: 'center' }]}>Nothing on your list yet.</Text>
          {tonight && (
            <PopButton
              label="Add tonight’s ingredients"
              icon="cartAdd"
              onPress={() => router.push({ pathname: '/add-to-list', params: { recipe: tonight.recipe.id, servings: String(tonight.recipe.servings) } })}
              accessibilityLabel={`Add tonight’s ingredients: ${tonight.recipe.title}`}
              style={{ alignSelf: 'stretch', marginTop: 8 }}
              testID="list-empty-tonight"
            />
          )}
        </Animated.View>
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
                    <GroceryRow item={item} onToggle={(quiet) => toggle(item, quiet)} onDelete={() => remove(item)} />
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
                style={[styles.basketHead, { backgroundColor: t.pop.leafTint, borderColor: t.colors.border }]}
                testID="basket-toggle"
              >
                <Icon name="cart" size={18} color={t.pop.ink} weight="bold" />
                <Text style={[t.type.headline, { color: t.pop.ink, flex: 1 }]}>
                  In the basket{' '}
                  {/* The count fades in fresh each time something lands in the basket (no pop). */}
                  <Animated.Text key={basket.length} entering={reduceMotion ? undefined : FadeIn.duration(200)}>
                    ({basket.length})
                  </Animated.Text>
                </Text>
                <Icon name={basketOpen ? 'chevronDown' : 'chevronRight'} size={14} color={t.pop.ink} weight="bold" />
              </PressableScale>
              {basketOpen && (
                <Animated.View entering={FadeIn.duration(180)} style={{ marginTop: 12 }}>
                  <Section>
                    {basket.map((item, i) => (
                      // Cleared rows slide out to the left and fade (Reduce Motion: fade only).
                      <Animated.View key={item.key} entering={FadeIn.duration(200)} exiting={reduceMotion ? FadeOut.duration(150) : uiEase(FadeOutLeft.duration(220))}>
                        {i > 0 && <Separator inset={60} />}
                        <GroceryRow item={item} onToggle={() => toggle(item)} onDelete={() => remove(item)} />
                      </Animated.View>
                    ))}
                  </Section>
                </Animated.View>
              )}
            </Animated.View>
          )}
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 16 }]}>{'Swipe right to tick an item, left to delete it.'}</Text>
        </>
      )}
    </TabScreen>
    {party > 0 && done === total && <ConfettiBurst key={party} count={60} />}
    </View>
  );
}

/** "Add an item": a 48-high box at the top of the list. Return adds it (commas add several). */
function AddItemField() {
  const t = useTheme();
  const { addCustomItem } = useStore();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const add = () => {
    const items = splitItems(text);
    if (!items.length) return;
    items.forEach((n) => addCustomItem(n));
    haptics.select();
    setText('');
  };
  return (
    <View style={[styles.addField, { backgroundColor: t.colors.fill, borderColor: focused ? t.pop.sky : 'transparent' }]}>
      <Icon name="plus" size={18} color={t.colors.label} weight="bold" />
      <TextInput
        maxFontSizeMultiplier={1.3}
        value={text}
        onChangeText={setText}
        placeholder="Add an item"
        placeholderTextColor={t.colors.secondaryLabel}
        style={[t.type.input, styles.addInput, { color: t.colors.label }]}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={add}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="Add an item"
        testID="add-item-input"
      />
      {/* Empty: "Paste a list" opens the paste screen (one item per line). Typing: "Add". */}
      {text.trim().length > 0 ? (
        <TextButton label="Add" small onPress={add} accessibilityLabel={`Add ${text.trim()}`} />
      ) : (
        <TextButton label="Paste a list" small onPress={() => router.push('/add-items')} accessibilityLabel="Paste a list of groceries" testID="paste-list" />
      )}
    </View>
  );
}

function GroceryRow({ item, onToggle, onDelete }: { item: GroceryItem; onToggle: (quiet?: boolean) => void; onDelete: () => void }) {
  const t = useTheme();
  const { getRecipe, units } = useStore();
  const names = item.recipeIds.map((id) => getRecipe(id)?.title).filter((n): n is string => !!n);
  // Amounts from two or more recipes, added up.
  const combined = item.recipeIds.length > 1 && item.quantity > 0;
  // One recipe: its name. Several: "For 2 recipes", which opens the list of names.
  const [showSources, setShowSources] = useState(false);
  // Ticking: the check fills and the name fades to muted right away (with a soft tick and a light
  // haptic), then a moment later the item moves into the basket. Unticking is immediate.
  const [ticking, setTicking] = useState(false);
  const shown = item.checked || ticking;
  const muted = useSharedValue(item.checked ? 1 : 0);
  useEffect(() => {
    muted.set(withTiming(shown ? 1 : 0, { duration: 200 }));
  }, [shown, muted]);
  const nameStyle = useAnimatedStyle(() => ({ color: interpolateColor(muted.get(), [0, 1], [pop.ink, pop.inkMuted]) }));
  const tickTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(tickTimer.current), []);
  const tick = () => {
    if (swiping.current || ticking) return;
    haptics.select();
    if (item.checked) return onToggle();
    setTicking(true);
    playSound('tick');
    tickTimer.current = setTimeout(() => onToggle(true), 380);
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
    // Swipe right to tick it (green), swipe left to delete it (red, with Undo). The row follows the
    // finger and the colored panel shows underneath; letting go past the threshold does it.
    <ReanimatedSwipeable
      friction={1.6}
      leftThreshold={72}
      rightThreshold={72}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableOpenStartDrag={startSwipe}
      onSwipeableCloseStartDrag={startSwipe}
      onSwipeableWillOpen={() => haptics.select()}
      onSwipeableOpen={(direction) => {
        endSwipe();
        // No close() first: the row moves to the basket (or is removed), and closing a gesture
        // mid-unmount errors.
        if (direction === 'right') onToggle();
        else onDelete();
      }}
      onSwipeableClose={endSwipe}
      renderLeftActions={(progress) => <SwipeAction progress={progress} side="left" color={t.pop.leaf} icon={item.checked ? 'close' : 'check'} label={item.checked ? `Untick ${item.name}` : `Tick ${item.name}`} onPress={onToggle} />}
      renderRightActions={(progress) => <SwipeAction progress={progress} side="right" color={t.pop.tomato} icon="trash" label={`Delete ${item.name}`} onPress={onDelete} />}
    >
      {/* The checkbox only ticks. The rest of the row ticks too, unless the item is for several
          recipes: then it opens the list of recipe names. */}
      <View style={[styles.row, { backgroundColor: t.colors.cell }]}>
        <PressableScale
          onPress={tick}
          haptic={null}
          scaleTo={0.96}
          accessibilityRole="checkbox"
          aria-checked={shown}
          accessibilityLabel={`${item.name}, ${showAmount(item.quantity, item.unit, item.name, units, item.aisle).text}${combined ? ' total' : ''}`}
          accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}
          style={styles.checkTap}
        >
          <CheckCircle checked={shown} color={t.pop.leaf} />
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
          <View style={{ flex: 1, minWidth: 0 }}>
            {/* A name you typed can be long: it gets two lines, then "…". */}
            <Animated.Text style={[t.type.body, nameStyle, shown && styles.struck]} numberOfLines={2}>
              {item.name}
            </Animated.Text>
            {/* "For <recipe>" (up to 2 lines, so the name isn't cut short) or "For 2 recipes". */}
            {names.length === 1 && (
              <Text style={[styles.sub, { color: t.colors.secondaryLabel }]} numberOfLines={2}>
                For {names[0]}
              </Text>
            )}
            {names.length > 1 && (
              <Text style={[styles.sub, { color: t.colors.secondaryLabel }]} numberOfLines={showSources ? undefined : 1}>
                {showSources ? names.join(', ') : `For\u00A0${names.length}\u00A0recipes\u00A0›`}
              </Text>
            )}
          </View>
          {/* The amount fades and is crossed out together with the name. */}
          <Text style={[t.type.subhead, { color: item.checked ? t.colors.secondaryLabel : t.colors.label, fontVariant: ['tabular-nums'] }, item.checked && styles.struck]}>
            {/* The same amounts as recipes ("⅔ cup"); "total" when 2+ recipes were added up. */}
            {showAmount(item.quantity, item.unit, item.name, units, item.aisle).text}
            {combined ? ' total' : ''}
          </Text>
        </PressableScale>
      </View>
    </ReanimatedSwipeable>
  );
}

/**
 * The colored panel under a swiped row: green with a check on the left (tick), red with a bin on
 * the right (delete). Hidden until the swipe starts so it never peeks past rounded corners.
 */
function SwipeAction({ progress, side, color, icon, label, onPress }: { progress: SharedValue<number>; side: 'left' | 'right'; color: string; icon: IconName; label: string; onPress: () => void }) {
  const t = useTheme();
  const style = useAnimatedStyle(() => ({ opacity: progress.get() > 0.01 ? 1 : 0 }));
  return (
    <Animated.View style={[styles.swipeAction, { backgroundColor: color, alignItems: side === 'left' ? 'flex-start' : 'flex-end' }, style]}>
      <IconButton icon={icon} accessibilityLabel={label} color={t.pop.ink} haptic={null} onPress={onPress} style={{ width: 80, height: '100%', borderRadius: 0 }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 16, gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Lined up with the card's edges: the name at its left, the count at its right.
  aisleHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 8 },
  addField: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingLeft: 14, paddingRight: 4, borderRadius: 16, borderWidth: 2, borderCurve: 'continuous' },
  addInput: { flex: 1, minHeight: 44, paddingVertical: 10 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 40, paddingHorizontal: 12 },
  emptyArt: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  basketHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 16, minHeight: 60 },
  checkTap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 4, paddingVertical: 10, minHeight: 60 },
  // Under the name: the same style for one recipe or "For 2 recipes ›".
  sub: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, marginTop: 1 },
  struck: { textDecorationLine: 'line-through' },
  swipeAction: { width: 96, height: '100%', justifyContent: 'center' },
});
