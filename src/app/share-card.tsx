import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { Mascot } from '../components/mascot/Mascot';
import { PageHeader } from '../components/PageHeader';
import { RecipePhoto } from '../components/RecipeCard';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import { haptics } from '../lib/haptics';
import { streakOf } from '../lib/progress';
import { useStore } from '../state/store';
import { brand, fonts, useTheme } from '../theme';

/** The story card is drawn at this size and saved at 3x (1080 x 1920, the TikTok and Instagram story size). */
const CARD_W = 300;
const CARD_H = (CARD_W * 16) / 9;

/**
 * "I cooked this": a story-sized card with your dish, your streak and Biscuit cheering,
 * made to post on TikTok or Instagram. Opened from the end of Cook Mode.
 */
export default function ShareCard() {
  const t = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipe, cooked, profile } = useStore();
  const card = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);
  const recipe = getRecipe(id);
  if (!recipe) return null;

  // Counting today's cook, even if it isn't logged yet.
  const streak = streakOf([...cooked.map((c) => c.date), new Date().toISOString()]);
  const name = profile.name.trim().split(/\s+/)[0];

  const share = async () => {
    if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
      toast({ message: 'Sharing works in the app on your phone', tone: 'info' });
      return;
    }
    setBusy(true);
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, width: CARD_W * 3, height: CARD_H * 3 });
      haptics.success();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `I cooked ${recipe.title}`, UTI: 'public.png' });
    } catch {
      toast({ message: 'Couldn’t make the picture. Try again.', tone: 'warning' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <PageHeader title="Share your dish" mode="cancel" cancelLabel="Done" inSheet />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {/* The card itself: this exact view becomes the picture, so its text keeps a fixed size. */}
        <View ref={card} collapsable={false} style={styles.card} testID="share-card" accessible accessibilityLabel={`Share card: I cooked ${recipe.title}. ${streak}-day streak.`}>
          <View style={styles.photo}>
            <RecipePhoto recipe={recipe} iconSize={48} />
          </View>
          <Text style={styles.kicker} allowFontScaling={false}>{name ? `${name} cooked` : 'I cooked'}</Text>
          <Text style={styles.title} numberOfLines={3} allowFontScaling={false}>
            {recipe.title}
          </Text>
          <View style={styles.row}>
            <View style={styles.pill}>
              <Text style={styles.pillText} allowFontScaling={false}>{streak === 1 ? 'Day 1 of my streak' : `${streak}-day streak`}</Text>
            </View>
            <Text style={styles.meta} allowFontScaling={false}>{recipe.minutes} min</Text>
          </View>
          <View style={styles.buddy}>
            <Mascot mood="celebrating" size={118} petable={false} hold />
          </View>
          <Text style={styles.footer} allowFontScaling={false}>Pantry Pop</Text>
        </View>

        <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, textAlign: 'center', maxWidth: 300 }]}>
          Made for Stories, TikTok and Reels.
        </Text>
        <Button label={busy ? 'Making your picture…' : 'Share'} icon="share" onPress={share} disabled={busy} style={{ alignSelf: 'stretch' }} accessibilityLabel="Share the card" />
        <Button label="Not now" variant="plain" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 8 },
  card: { width: CARD_W, height: CARD_H, borderRadius: 28, backgroundColor: brand.aubergine, padding: 18, overflow: 'hidden', borderCurve: 'continuous' },
  photo: { height: CARD_W * 0.92, borderRadius: 20, overflow: 'hidden', backgroundColor: '#3F1F44', transform: [{ rotate: '-2deg' }], borderCurve: 'continuous' },
  kicker: { marginTop: 18, color: brand.saffron, fontFamily: fonts.display, fontSize: 17, lineHeight: 22 },
  title: { color: '#FFFFFF', fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 33, letterSpacing: -0.6, marginTop: 2, maxWidth: CARD_W - 110 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  pill: { backgroundColor: brand.saffron, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { color: brand.ink, fontWeight: '700', fontSize: 13 },
  meta: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  buddy: { position: 'absolute', right: 2, bottom: 26 },
  footer: { position: 'absolute', left: 18, bottom: 16, color: 'rgba(255,255,255,0.75)', fontFamily: fonts.display, fontSize: 14 },
});
