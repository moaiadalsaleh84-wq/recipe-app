import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { isIOS } from '../navigation/screenOptions';
import { useTheme } from '../theme';

/**
 * PLACEHOLDER privacy policy. Apple requires a privacy policy link in the app and in App Store
 * Connect. Have this reviewed, publish it at a public URL (set PRIVACY_URL in src/lib/purchases.ts),
 * and keep it in sync with what the app and the import server actually do.
 */
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'The short version',
    body: [
      'Pantry Pop has no accounts, no ads and no tracking. Your recipes, plans, pantry and lists are stored on your phone only.',
      'The only time data leaves your phone is when you import a recipe, and (once real payments are on) when you buy Pro through Apple.',
    ],
  },
  {
    title: 'When you import a recipe',
    body: [
      'We send the link or text you pasted to the Pantry Pop import server.',
      'The server downloads that public page (or the public caption from TikTok, YouTube or Instagram) and sends the recipe text to Anthropic’s Claude API, which turns it into ingredients and steps. Anthropic processes it under its commercial terms and does not use it to train models.',
      'With each import the app also sends a random install ID made on your phone. It isn’t linked to your name, email or Apple ID. The server uses it, and your IP address, only to limit how many imports can be made in a row. Both are stored only as one-way scrambled codes (hashes), and deleted after 2 days.',
      'To avoid paying twice for the same page, the server keeps the result for a link for up to 7 days. Pasted text that isn’t a link is not kept.',
    ],
  },
  {
    title: 'Purchases',
    body: ['Subscriptions are handled by Apple. When real payments are switched on, purchase status is checked through RevenueCat, using an anonymous ID. We never see your card details.'],
  },
  {
    title: 'Your choices',
    body: ['Deleting the app deletes everything stored on your phone. Questions or deletion requests: contact@example.com (placeholder: replace with your real address).'],
  },
];

export default function Privacy() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <PageHeader title="Privacy" mode="cancel" inSheet={isIOS} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.placeholder, { borderColor: t.colors.warning, backgroundColor: t.colors.cell }]}>
          <Text style={[t.type.footnote, { color: t.colors.label }]} testID="privacy-placeholder">
            Placeholder policy for testing. It describes what this version of the app does, but it hasn’t been reviewed by a lawyer yet.
          </Text>
        </View>
        {SECTIONS.map((s) => (
          <View key={s.title} style={{ marginTop: 22, gap: 8 }}>
            <Text style={[t.type.title3, { color: t.colors.label }]} accessibilityRole="header">
              {s.title}
            </Text>
            {s.body.map((p, i) => (
              <Text key={i} style={[t.type.body, { color: t.colors.secondaryLabel, lineHeight: 23 }]}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60, width: '100%', maxWidth: 640, alignSelf: 'center' },
  placeholder: { borderWidth: 1.5, borderRadius: 14, padding: 12 },
});
