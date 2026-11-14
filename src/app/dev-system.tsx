import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, CheckCircle, Chip, Segmented, Stepper } from '../components/ui';
import { useTheme } from '../theme';

/**
 * Dev tool, not part of the app: one page that shows the design system (colors, type, buttons).
 * Only enabled in builds made with EXPO_PUBLIC_DEV_ROUTES=1.
 */
export default function DevSystem() {
  const t = useTheme();
  const [chip, setChip] = useState(true);
  const [seg, setSeg] = useState<'a' | 'b'>('a');
  const [n, setN] = useState(2);
  if (process.env.EXPO_PUBLIC_DEV_ROUTES !== '1') return null;
  const c = t.colors;
  const swatches: [string, string, string, string, string][] = [
    ['Tomato', 'The main action', c.tintFill, c.tintDeep, c.tintSoft],
    ['Green', 'Success, progress', c.success, c.successDeep, c.successSoft],
    ['Yellow', 'Rewards', c.reward, c.rewardDeep, c.rewardSoft],
    ['Blue', 'Information', c.info, c.infoDeep, c.infoSoft],
  ];
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: t.spacing.lg, gap: t.spacing.lg }}>
      <Text style={[t.type.largeTitle, { color: c.label }]}>Pantry Pop</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {swatches.map(([name, job, face, lip, soft]) => (
          <View key={name} style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 64, borderRadius: t.radius.md, backgroundColor: face, ...t.chunky.button(lip) }} />
            <View style={{ height: 14, borderRadius: 7, backgroundColor: soft, marginTop: 4 }} />
            <Text style={[t.type.headline, { color: c.label, fontSize: 15 }]}>{name}</Text>
            <Text style={[t.type.caption1, { color: c.secondaryLabel }]}>{job}</Text>
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: c.cell, borderRadius: t.radius.lg, padding: t.spacing.lg, gap: 6, ...t.chunky.card }}>
        <Text style={[t.type.title1, { color: c.label }]}>What’s for dinner?</Text>
        <Text style={[t.type.title3, { color: c.label }]}>Creamy tomato pasta</Text>
        <Text style={[t.type.body, { color: c.secondaryLabel }]}>Reading text uses the system font, so recipes stay easy to read at the stove.</Text>
      </View>
      <View style={{ gap: 12 }}>
        <Button label="Start cooking" icon="play" onPress={() => {}} />
        <Button label="Add to shopping list" icon="cartAdd" variant="tinted" onPress={() => {}} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button label="Done" icon="check" variant="success" onPress={() => {}} style={{ flex: 1 }} />
          <Button label="Claim" icon="sparkles" variant="reward" onPress={() => {}} style={{ flex: 1 }} />
        </View>
        <Button label="Not now" variant="plain" onPress={() => {}} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip label="Vegetarian" selected={chip} onPress={() => setChip(!chip)} />
        <Chip label="Under 30 min" selected={false} onPress={() => {}} icon="clock" />
        <CheckCircle checked color={c.success} />
        <CheckCircle checked={false} color={c.success} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Segmented label="Demo" value={seg} onChange={setSeg} options={[{ label: 'Metric', value: 'a' }, { label: 'US', value: 'b' }]} />
        <Stepper label="servings" value={n} onChange={setN} />
      </View>
    </ScrollView>
  );
}
