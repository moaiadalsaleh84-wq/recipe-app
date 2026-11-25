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
import { useStore } from '../state/store';
import { fonts, pop, stroke, useTheme } from '../theme';
import { PhotoFrame } from './PhotoFrame';
import { PopCard } from './pop/PopCard';
import { CARD_DEPTH, CardText, HeartIcon } from './RecipeCard';
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
  const { findBySource, rememberDiscover } = useStore();
  const toast = useToast();
  return async (card: DiscoverCardData) => {
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
      <PopCard
        onPress={() => void open(card)}
        accessibilityLabel={`${card.title}, by ${card.creatorHandle}, ${savesLabel(count)}`}
        accessibilityHint="Opens the recipe"
        // Ink behind the photo, so its soft edges never show a light hairline (see PhotoFrame).
        color={pop.ink}
        radius={24}
        depth={CARD_DEPTH}
        style={{ flexGrow: 1 }}
        contentStyle={{ flexGrow: 1 }}
      >
        <PhotoFrame recipe={photoRecipe(card)} radius={21.5} corners="top" edge="bottom" style={styles.photo} />
        {/* The same text as every recipe card: @creator, title, one meta line. */}
        <View style={[styles.body, { backgroundColor: pop.white }]}>
          <CardText creator={card.creatorHandle} title={card.title} meta={savesLabel(count)} metaTestID="discover-saves" />
        </View>
      </PopCard>
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
  body: { flexGrow: 1, borderBottomLeftRadius: 21.5, borderBottomRightRadius: 21.5 },
  creator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  letter: { borderWidth: stroke.thin, borderColor: pop.ink, alignItems: 'center', justifyContent: 'center' },
  letterText: { fontFamily: fonts.black, color: pop.ink },
  saveTap: { position: 'absolute', top: 2, right: 2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  saveDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: pop.ink, backgroundColor: pop.white, alignItems: 'center', justifyContent: 'center' },
});
