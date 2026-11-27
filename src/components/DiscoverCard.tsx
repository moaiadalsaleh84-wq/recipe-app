/**
 * A Discover recipe card, in the app's card style: the photo (the owner's crop), a small letter
 * circle + "@creator", the title (up to 2 lines), "X saves" and a save (bookmark) button.
 * Saving copies the recipe into your own recipes and adds one to its save count.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Recipe } from '../data/mock';
import { discoverGet, discoverSave, discoverToRecipe, savedCopy, type DiscoverCardData } from '../lib/discoverApi';
import { haptics } from '../lib/haptics';
import { useStore, useStoreGetter } from '../state/store';
import { fonts, pop, useTheme } from '../theme';
import { PhotoFrame } from './PhotoFrame';
import { CardText, HeartIcon } from './RecipeCard';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { useToast } from './Toast';

/** "New" before the first save, then "1 save", "12 saves", "1.2k saves". */
export const savesLabel = (n: number) => n === 0 ? 'New' : `${n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : n} ${n === 1 ? 'save' : 'saves'}`;

/** Save a Discover recipe into your recipes (once: the same link is never saved twice). */
export function useDiscoverSave() {
  const { addRecipe, findBySource } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const saved = (sourceUrl: string) => findBySource(sourceUrl);
  const save = async (id: string, sourceUrl: string): Promise<string | null> => {
    const already = findBySource(sourceUrl);
    if (already) return already.id;
    setBusy(id);
    const res = await discoverSave(id);
    setBusy(null);
    if (!res.ok) {
      toast({ message: res.message, tone: 'warning' });
      return null;
    }
    const newId = addRecipe(savedCopy(res.item));
    haptics.success();
    toast({ message: 'Saved to your recipes', icon: 'bookmarkFill', tone: 'success', action: { label: 'Open', onPress: () => router.push({ pathname: '/recipe/[id]', params: { id: newId } }) } });
    return newId;
  };
  return { save, saved, busy };
}

/** Opens a Discover recipe on the recipe page (your saved copy, if you have one). */
export function useOpenDiscover() {
  // Read at tap time: opening a card doesn't need the card to re-render on every store change.
  const getStore = useStoreGetter();
  const toast = useToast();
  return async (card: DiscoverCardData) => {
    const { findBySource, rememberDiscover } = getStore();
    const mine = findBySource(card.sourceUrl);
    if (mine) return router.push({ pathname: '/recipe/[id]', params: { id: mine.id } });
    const res = await discoverGet(card.id);
    if (!res.ok) return toast({ message: res.message, tone: 'warning' });
    const recipe = discoverToRecipe(res.item);
    rememberDiscover(recipe);
    router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } });
  };
}

/** The card's photo comes from the card data (no recipe yet): a minimal recipe for RecipePhoto. */
const photoRecipe = (c: DiscoverCardData): Recipe =>
  ({ id: `discover-${c.id}`, title: c.title, image: c.imageUrl ? { uri: c.imageUrl } : null, ...(c.crop ? { photoCrop: c.crop } : {}), ingredients: [], steps: [] }) as unknown as Recipe;

export function CreatorLine({ handle, size = 'small' }: { handle: string; size?: 'small' | 'medium' }) {
  const t = useTheme();
  const letter = (handle.replace(/^@/, '').match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase();
  const d = size === 'small' ? 22 : 28;
  return (
    <View style={styles.creator}>
      <View style={[styles.letter, { width: d, height: d, borderRadius: d / 2, backgroundColor: t.pop.berry }]}>
        <Text style={[styles.letterText, { fontSize: size === 'small' ? 11 : 13 }]} maxFontSizeMultiplier={1.2}>
          {letter}
        </Text>
      </View>
      <Text style={[t.type.caption1, { color: t.colors.label, fontFamily: t.fonts.black, flexShrink: 1 }]} numberOfLines={1}>
        {handle}
      </Text>
    </View>
  );
}

export function DiscoverCard({ card, width }: { card: DiscoverCardData; width: number }) {
  const open = useOpenDiscover();
  const { save, saved, busy } = useDiscoverSave();
  const mine = saved(card.sourceUrl);
  const [count, setCount] = useState(card.saves);
  return (
    <View style={{ width }} testID={`discover-card-${card.id}`}>
      {/* The same card as every recipe: the photo (the owner's crop), then the title and one meta
          line ("@creator · 3 saves") underneath, no box. */}
      <PressableScale onPress={() => void open(card)} haptic={null} accessibilityLabel={`${card.title}, by ${card.creatorHandle}, ${savesLabel(count)}`} accessibilityHint="Opens the recipe">
        <PhotoFrame recipe={photoRecipe(card)} radius={16} style={styles.photo} />
        <CardText title={card.title} meta={`${card.creatorHandle}\u00A0· ${savesLabel(count)}`} metaTestID="discover-saves" />
      </PressableScale>
      {/* The save button sits on top of the card, beside its button (not inside it). */}
      <PressableScale
        onPress={async () => {
          if (mine) return router.push({ pathname: '/recipe/[id]', params: { id: mine.id } });
          const id = await save(card.id, card.sourceUrl);
          if (id) setCount((c) => c + 1);
        }}
        disabled={busy === card.id}
        haptic={null}
        scaleTo={0.94}
        accessibilityLabel={mine ? `Saved. Open ${card.title}` : `Save ${card.title} to your recipes`}
        style={styles.saveTap}
        testID="discover-save"
      >
        {/* The same white heart circle as every recipe card; a filled berry heart = saved. */}
        <View style={styles.saveDot}>
          <HeartIcon on={!!mine} size={17} offColor={pop.ink} />
        </View>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 5 },
  creator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  letter: { alignItems: 'center', justifyContent: 'center' },
  letterText: { fontFamily: fonts.black, color: pop.ink },
  saveTap: { position: 'absolute', top: 2, right: 2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  // The same white heart circle as recipe cards: a soft shadow, no outline.
  saveDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: pop.white, boxShadow: '0 2px 8px rgba(27, 19, 64, 0.18)', alignItems: 'center', justifyContent: 'center' },
});
