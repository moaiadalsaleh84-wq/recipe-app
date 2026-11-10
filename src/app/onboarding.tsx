import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatBuddy } from '../components/cats/CatBuddy';
import { CatSays } from '../components/cats/CatSays';
import { buddyInfo, say } from '../components/cats/dialogue';
import type { BuddyId } from '../components/cats/types';
import { PressableScale } from '../components/PressableScale';
import { Button } from '../components/ui';
import { haptics } from '../lib/haptics';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

const order: BuddyId[] = ['tank', 'biscuit'];

/** First launch (and "Switch buddy"): meet both cats and pick one. */
export default function Onboarding() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { buddy, setBuddy } = useStore();
  const [picked, setPicked] = useState<BuddyId | null>(buddy);

  const confirm = () => {
    if (!picked) return;
    haptics.success();
    setBuddy(picked);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120 }]}>
        <Animated.Text entering={FadeInDown.duration(400)} style={[t.type.largeTitle, { color: t.colors.label, textAlign: 'center' }]} accessibilityRole="header">
          Pick your kitchen buddy
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(400)} style={[t.type.body, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 8 }]}>
          They’ll cook with you, plan with you and cheer you on. You can switch anytime.
        </Animated.Text>

        <View style={styles.cards}>
          {order.map((id, i) => {
            const info = buddyInfo[id];
            const selected = picked === id;
            return (
              <Animated.View key={id} entering={FadeInDown.delay(150 + i * 100).duration(320)} style={{ flex: 1 }}>
                <PressableScale
                  onPress={() => setPicked(id)}
                  haptic="select"
                  accessibilityRole="radio"
                  aria-checked={selected}
                  accessibilityLabel={`${info.title}. ${info.tagline}`}
                  style={[
                    styles.card,
                    { backgroundColor: t.colors.cell, borderColor: selected ? t.colors.tintFill : t.colors.border },
                    selected ? t.chunky.button() : t.chunky.lip,
                  ]}
                >
                  <CatBuddy buddy={id} mood={selected ? (id === 'tank' ? 'flex' : 'happy') : 'idle'} size={130} petable={false} />
                  <Text style={[t.type.title3, { color: t.colors.label }]}>{info.title}</Text>
                  {info.traits.map((tr) => (
                    <Text key={tr} style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center' }]}>
                      {tr}
                    </Text>
                  ))}
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>

        {picked && (
          <Animated.View key={picked} entering={FadeIn.duration(200)} style={{ marginTop: 20 }}>
            <CatSays buddy={picked} line={say(picked, 'intro')} layout="column" hideCat />
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: t.colors.background, borderTopColor: t.colors.separator }]}>
        <Button
          label={picked ? `Cook with ${buddyInfo[picked].name}` : 'Choose a buddy'}
          icon="paw"
          onPress={confirm}
          disabled={!picked}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  cards: { flexDirection: 'row', gap: 12, marginTop: 24 },
  card: { alignItems: 'center', gap: 4, padding: 12, paddingBottom: 16, borderRadius: 24, borderWidth: 2.5, borderCurve: 'continuous', minHeight: 260 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
