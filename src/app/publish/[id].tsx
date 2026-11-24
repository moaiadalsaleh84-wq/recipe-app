/**
 * Admin only: publish one of your imported recipes to Discover. Before publishing you can change
 * the title, the photo crop (drag the photo, zoom), the tags, cuisine and diet. The server checks
 * admin mode again, rewrites the steps in the app's own words and stores the photo.
 */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { PageHeader } from '../../components/PageHeader';
import { PhotoFrame } from '../../components/PhotoFrame';
import { PopButton } from '../../components/pop/PopButton';
import { PopIconButton } from '../../components/pop/PopIconButton';
import { Text } from '../../components/Text';
import { useToast } from '../../components/Toast';
import { Button, Chip, EmptyState } from '../../components/ui';
import type { Recipe } from '../../data/mock';
import { cardCrop, dragCrop, type CropFrac } from '../../lib/crop';
import { CUISINES, DIETS, adminPublish, useAdminMode, type DiscoverSource } from '../../lib/discoverApi';
import { haptics } from '../../lib/haptics';
import { photoAsBase64, photoUri } from '../../lib/photos';
import { useStore } from '../../state/store';
import { pop, useTheme } from '../../theme';

const TAGS = ['Quick', 'Crispy', 'Spicy', 'Cheesy', 'Healthy', 'High protein', 'Comfort food', 'One pan', 'Budget', 'Meal prep', 'Sweet', 'Kid friendly'] as const;

/** The photo to publish: the full imported picture when that's what shows, else what shows. */
function photoSource(r: Recipe): string | null {
  if (!r.image || typeof r.image !== 'object') return null;
  if (r.importedImage && r.image.uri === r.importedImage.card) return r.importedImage.original;
  return r.image.uri;
}

/** What goes to Discover: the recipe, without anything that only belongs on this phone. */
function payload(r: Recipe, title: string) {
  const { id: _i, custom: _c, image: _im, importedImage: _ii, addedAt: _a, origin: _o, discoverId: _d, discover: _ds, photoCrop: _pc, imageCreditText: _ic, ...rest } = r;
  return { ...rest, title };
}

const dietDefaults = (r: Recipe) =>
  DIETS.filter((d) => (d === 'Vegetarian' ? r.diet?.vegetarian : d === 'Vegan' ? r.diet?.vegan : d === 'Gluten-free' ? r.diet?.glutenFree : r.diet?.dairyFree));

export default function PublishScreen() {
  const t = useTheme();
  const toast = useToast();
  const admin = useAdminMode();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipe } = useStore();
  const recipe = getRecipe(id);
  const src = recipe ? photoSource(recipe) : null;

  const [title, setTitle] = useState(recipe?.title ?? '');
  const [creator, setCreator] = useState(recipe?.creatorHandle ?? '');
  const [tags, setTags] = useState<string[]>(() => (recipe?.tags ?? []).filter((x) => (TAGS as readonly string[]).includes(x)));
  const [cuisine, setCuisine] = useState<string | null>(recipe?.cuisine && (CUISINES as readonly string[]).includes(recipe.cuisine) ? recipe.cuisine : null);
  const [diet, setDiet] = useState<string[]>(() => (recipe ? dietDefaults(recipe) : []));
  const [aspect, setAspect] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState<CropFrac | null>(null);
  const [busy, setBusy] = useState(false);

  const frameWidth = Math.min(width - 32, 520);
  // The drag moves the photo under the 4:3 frame (the card's view of it), step by step.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onChange((e) => setCrop((c) => (c ? dragCrop(c, e.changeX, e.changeY, frameWidth) : c)));

  if (!admin) return <EmptyState icon="info" title="Admin mode is off" message="Turn it on in Settings." action={{ label: 'Close', onPress: () => router.back() }} />;
  if (!recipe) return <EmptyState icon="fork" title="Recipe not found" message="It may have been removed." action={{ label: 'Close', onPress: () => router.back() }} />;

  const zoomTo = (z: number) => {
    if (!aspect) return;
    const next = Math.min(3, Math.max(1, z));
    const c = crop ?? cardCrop(aspect, 1);
    setZoom(next);
    setCrop(cardCrop(aspect, next, c.x + c.w / 2, c.y + c.h / 2));
  };
  const preview: Recipe = { ...recipe, image: src ? { uri: src } : null, importedImage: undefined, ...(crop ? { photoCrop: crop } : {}) };
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const publish = async () => {
    if (!recipe.sourceUrl) return toast({ message: 'This recipe has no link to its original.', tone: 'warning' });
    if (!creator.trim()) return toast({ message: 'Add the creator’s @name first.', tone: 'warning' });
    setBusy(true);
    const photo = src ? await photoAsBase64(src) : null;
    const res = await adminPublish({
      sourceUrl: recipe.sourceUrl,
      source: (recipe.source ?? 'web') as DiscoverSource,
      title: title.trim() || recipe.title,
      creatorHandle: creator.trim(),
      creatorUrl: recipe.creatorUrl,
      tags,
      cuisine,
      diet,
      crop,
      recipe: payload(recipe, title.trim() || recipe.title) as unknown as Record<string, unknown>,
      ...(photo ? { photo } : src && /^https:\/\//.test(src) ? { imageUrl: src } : {}),
    });
    setBusy(false);
    if (!res.ok) return toast({ message: res.message, tone: 'warning' });
    haptics.success();
    toast({ message: 'Published to Discover', icon: 'check', tone: 'success' });
    router.back();
  };

  const label = (text: string) => <Text style={[t.type.headline, { color: t.colors.label, marginTop: 20, marginBottom: 8 }]}>{text}</Text>;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <PageHeader title="Publish to Discover" mode="cancel" inSheet />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" scrollEnabled>
        <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>Only you see this. The steps are rewritten in the app’s own words when you publish, and “Recipe by {creator || '@creator'}” with a Watch button always shows.</Text>

        {label('Title')}
        <TextInput value={title} onChangeText={setTitle} maxLength={120} style={[t.type.input, styles.input, { color: t.colors.label, backgroundColor: t.colors.cell, ...t.chunky.card }]} accessibilityLabel="Title" testID="publish-title" />

        {label('Creator')}
        <TextInput value={creator} onChangeText={setCreator} autoCapitalize="none" placeholder="@creator" placeholderTextColor={t.colors.tertiaryLabel} style={[t.type.input, styles.input, { color: t.colors.label, backgroundColor: t.colors.cell, ...t.chunky.card }]} accessibilityLabel="Creator" />

        {label('Photo')}
        {src ? (
          <>
            {/* Measures the photo once; the frame below shows what cards will show. */}
            <Image source={{ uri: photoUri(src) }} style={styles.measure} onLoad={(e) => {
              const a = e.source.width / e.source.height;
              if (!aspect && Number.isFinite(a) && a > 0) {
                setAspect(a);
                setCrop(recipe.photoCrop ?? cardCrop(a, 1));
              }
            }} />
            <GestureDetector gesture={pan}>
              <View accessibilityLabel="Photo crop. Drag to move the photo" testID="publish-crop">
                <PhotoFrame recipe={preview} radius={24} style={{ width: frameWidth, height: (frameWidth * 3) / 4 }} />
              </View>
            </GestureDetector>
            <View style={styles.zoomRow}>
              <PopIconButton icon="minus" accessibilityLabel="Zoom out" onPress={() => zoomTo(zoom - 0.25)} />
              <Text style={[t.type.headline, { color: t.colors.label, minWidth: 64, textAlign: 'center' }]}>{`${zoom.toFixed(2).replace(/0$/, '').replace(/\.0$/, '')}×`}</Text>
              <PopIconButton icon="plus" accessibilityLabel="Zoom in" onPress={() => zoomTo(zoom + 0.25)} />
              <PopButton label="Reset" size="small" color={pop.white} onPress={() => aspect && (setZoom(1), setCrop(cardCrop(aspect, 1)))} />
            </View>
            <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>Drag the photo to choose what the card shows.</Text>
          </>
        ) : (
          <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>No photo yet: use “Retry photo” in the ⋯ menu first.</Text>
        )}

        {label('Cuisine')}
        <View style={styles.wrap}>
          {CUISINES.map((c) => (
            <Chip key={c} label={c} selected={cuisine === c} onPress={() => setCuisine(cuisine === c ? null : c)} />
          ))}
        </View>

        {label('Tags')}
        <View style={styles.wrap}>
          {TAGS.map((x) => (
            <Chip key={x} label={x} selected={tags.includes(x)} onPress={() => setTags(toggle(tags, x))} />
          ))}
        </View>

        {label('Diet')}
        <View style={styles.wrap}>
          {DIETS.map((d) => (
            <Chip key={d} label={d} selected={diet.includes(d)} onPress={() => setDiet(toggle(diet, d))} />
          ))}
        </View>

        <Button label={busy ? 'Publishing…' : 'Publish to Discover'} onPress={() => void publish()} disabled={busy} style={{ marginTop: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  input: { borderRadius: 16, paddingHorizontal: 14, minHeight: 48 },
  measure: { width: 1, height: 1, opacity: 0, position: 'absolute' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
