/**
 * Report a Discover recipe: wrong recipe, not food, or "I'm the creator and want this removed".
 * Only the reason is sent. The recipe is hidden for everyone until the owner reviews it.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PageHeader } from '../../components/PageHeader';
import { PressableScale } from '../../components/PressableScale';
import { Text } from '../../components/Text';
import { useToast } from '../../components/Toast';
import { Button, CheckCircle, Section, Separator } from '../../components/ui';
import { REPORT_LABELS, discoverReport, type ReportReason } from '../../lib/discoverApi';
import { haptics } from '../../lib/haptics';
import { useTheme } from '../../theme';

const REASONS: ReportReason[] = ['wrong_recipe', 'not_food', 'creator'];

export default function ReportScreen() {
  const t = useTheme();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const send = async () => {
    if (!reason || !id) return;
    setBusy(true);
    const res = await discoverReport(id, reason);
    setBusy(false);
    if (!res.ok) return toast({ message: res.message, tone: 'warning' });
    haptics.success();
    toast({ message: 'Thanks for the heads-up. It’s hidden while we check.', icon: 'check' });
    close();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <PageHeader title="Report this recipe" mode="cancel" inSheet />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginBottom: 12 }]}>What’s wrong? We hide it from Discover until we’ve checked.</Text>
        <Section>
          {REASONS.map((r, i) => (
            <View key={r}>
              {i > 0 && <Separator inset={56} />}
              <PressableScale onPress={() => setReason(r)} haptic="select" scaleTo={0.99} accessibilityRole="radio" aria-checked={reason === r} accessibilityLabel={REPORT_LABELS[r]} style={styles.row} testID={`report-${r}`}>
                <CheckCircle checked={reason === r} color={t.colors.success} />
                <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>{REPORT_LABELS[r]}</Text>
              </PressableScale>
            </View>
          ))}
        </Section>
        <Button label={busy ? 'Sending…' : 'Send report'} onPress={() => void send()} disabled={!reason || busy} style={{ marginTop: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
});
