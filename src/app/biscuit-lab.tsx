import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mascot } from '../components/mascot/Mascot';
import { MOODS, REACTIONS, isReaction, type Mood } from '../components/mascot/moods';
import { REACTION_MS } from '../components/mascot/springs';
import { biscuit, useTheme, type Theme } from '../theme';

/**
 * Biscuit lab (developer tool, not part of the app). Open /biscuit-lab while running `npx expo start`.
 * Shows Biscuit at 4 sizes, with buttons for every mood and reaction, and switches for Reduce
 * Motion, talking, the black silhouette and a dark background. Tap near Biscuit: the eyes follow.
 */
export default function BiscuitLab() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [emotion, setEmotion] = useState<Mood>('idle');
  const [reaction, setReaction] = useState<{ mood: Mood; n: number } | null>(null);
  const [reduce, setReduce] = useState(false);
  const [talking, setTalking] = useState(false);
  const [silhouette, setSilhouette] = useState(false);
  const [dark, setDark] = useState(false);
  // Biscuit returns to the mood by itself; the label follows.
  useEffect(() => {
    if (!reaction) return;
    const id = setTimeout(() => setReaction(null), REACTION_MS);
    return () => clearTimeout(id);
  }, [reaction]);
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_ROUTES !== '1') return null;

  const mood = reaction?.mood ?? emotion;
  const key = reaction ? `r${reaction.n}` : emotion;
  const bg = dark ? '#211713' : '#FFF8EE';
  const ink = dark ? '#FFF3E4' : '#3D2314';
  const emotions = MOODS.filter((m) => !isReaction(m));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.colors.background }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <Text style={[t.type.largeTitle, { color: t.colors.label }]}>Biscuit lab</Text>

      <View testID="lab-stage" style={[styles.stage, { backgroundColor: bg }]}>
        {[240, 120, 64, 40].map((s) => (
          <View key={s} style={{ alignItems: 'center', gap: 4 }}>
            <Mascot mood={mood} playKey={key} size={s} talking={talking} reduceMotion={reduce} silhouette={silhouette} petable={false} />
            <Text style={[t.type.caption1, { color: ink }]}>{s} pt</Text>
          </View>
        ))}
      </View>
      <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} testID="lab-state">
        Mood: {emotion}
        {reaction ? ` · reaction: ${reaction.mood} (plays once, then back to ${emotion})` : ''}
      </Text>

      <Text style={[t.type.headline, { color: t.colors.label }]}>Moods (they stay)</Text>
      <View style={styles.wrap}>
        {emotions.map((m) => (
          <Btn t={t}
            key={m}
            label={m}
            on={!reaction && emotion === m}
            onPress={() => {
              setReaction(null);
              setEmotion(m);
            }}
          />
        ))}
      </View>

      <Text style={[t.type.headline, { color: t.colors.label }]}>Reactions (play once)</Text>
      <View style={styles.wrap}>
        {REACTIONS.map((m) => (
          <Btn t={t} key={m} label={m} tone="reaction" onPress={() => setReaction((r) => ({ mood: m, n: (r?.n ?? 0) + 1 }))} />
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: t.colors.cell }]}>
        <Toggle t={t} label="Reduce Motion" value={reduce} onChange={setReduce} />
        <Toggle t={t} label="Talking" value={talking} onChange={setTalking} />
        <Toggle t={t} label="Silhouette (all black)" value={silhouette} onChange={setSilhouette} />
        <Toggle t={t} label="Dark background" value={dark} onChange={setDark} />
      </View>
    </ScrollView>
  );
}

function Btn({ t, label, on, onPress, tone }: { t: Theme; label: string; on?: boolean; onPress: () => void; tone?: 'reaction' }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-selected={on}
      style={[styles.btn, { backgroundColor: on ? t.colors.tintFill : tone ? biscuit.cream : t.colors.cell, borderColor: tone ? biscuit.scarf : t.colors.border }]}
    >
      <Text style={[t.type.subhead, { color: on ? t.colors.onTint : t.colors.label, fontFamily: t.fonts.display }]}>{label}</Text>
    </Pressable>
  );
}

function Toggle({ t, label, value, onChange }: { t: Theme; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'center', gap: 16, padding: 16, borderRadius: 20 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 2, justifyContent: 'center' },
  card: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4 },
  toggle: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
});
