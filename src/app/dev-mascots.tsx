import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONCEPTS, type Concept } from '../components/mascot/concepts';
import { POSES } from '../components/mascot/concepts/kit';
import { useTheme, type Theme } from '../theme';

/**
 * Mascot concepts (developer tool, not part of the app). Open /dev-mascots while running
 * `npx expo start`, or /dev-mascots?c=saffy for one concept sheet.
 * Each sheet: idle, happy and excited at 120pt, a 48pt version, the black silhouette and a dark tile.
 */
export default function DevMascots() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { c } = useLocalSearchParams<{ c?: string }>();
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_ROUTES !== '1') return null;
  const list = c ? CONCEPTS.filter((x) => x.id === c) : CONCEPTS;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, gap: 24, maxWidth: 520, width: '100%', alignSelf: 'center' }}
    >
      {list.map((concept) => (
        <Sheet key={concept.id} concept={concept} t={t} />
      ))}
    </ScrollView>
  );
}

function Sheet({ concept, t }: { concept: Concept; t: Theme }) {
  const { Art } = concept;
  const c = t.colors;
  return (
    <View testID={`sheet-${concept.id}`} style={{ backgroundColor: c.cell, borderRadius: t.radius.lg, padding: 16, gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Text style={[t.type.footnote, { color: c.secondaryLabel }]}>
          Concept {concept.letter}: {concept.species}
        </Text>
        <Text style={[t.type.title1, { color: c.label }]}>{concept.name}</Text>
        <Text style={[t.type.subhead, { color: c.label }]}>{concept.personality}</Text>
        <Text style={[t.type.subhead, { color: c.secondaryLabel, marginTop: 4 }]}>Signature: {concept.signature}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {POSES.map((pose) => (
          <View key={pose} style={{ alignItems: 'center' }}>
            <Art pose={pose} size={120} />
            <Text style={[t.type.caption1, { color: c.secondaryLabel }]}>{pose}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ alignItems: 'center', width: 120 }}>
          <View style={{ height: 120, justifyContent: 'center' }}>
            <Art pose="idle" size={48} />
          </View>
          <Text style={[t.type.caption1, { color: c.secondaryLabel }]}>48pt</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Art pose="idle" size={120} silhouette />
          <Text style={[t.type.caption1, { color: c.secondaryLabel }]}>silhouette</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <View style={{ backgroundColor: '#1C1520', borderRadius: 16 }}>
            <Art pose="happy" size={120} />
          </View>
          <Text style={[t.type.caption1, { color: c.secondaryLabel }]}>dark mode</Text>
        </View>
      </View>
    </View>
  );
}
