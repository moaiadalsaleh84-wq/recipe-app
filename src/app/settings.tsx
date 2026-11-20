import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { PressableScale } from '../components/PressableScale';
import { useToast } from '../components/Toast';
import { Section, Segmented } from '../components/ui';
import type { Units } from '../data/mock';
import { showPaywall, useProGate } from '../lib/pro';
import { MANAGE_SUBSCRIPTIONS_URL } from '../lib/purchases';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

/** Settings: Pro, units, privacy. Opened from the gear on the Progress tab. */
export default function Settings() {
  const t = useTheme();
  const toast = useToast();
  const { units, setUnits, pro } = useStore();
  const { isPro, trialDaysLeft } = useProGate();
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <PageHeader title="Settings" mode="cancel" cancelLabel="Done" inSheet />
      <ScrollView contentContainerStyle={{ padding: t.layout.screen }}>
        <Section>
          {isPro ? (
            <PressableScale
              onPress={() => Linking.openURL(MANAGE_SUBSCRIPTIONS_URL).catch(() => toast({ message: 'Couldn’t open the link', tone: 'warning' }))}
              style={styles.row}
              accessibilityLabel="Manage your Pro subscription"
              scaleTo={0.99}
            >
              <Icon name="crown" size={18} color={t.colors.rewardText} />
              <View style={{ flex: 1 }}>
                <Text style={[t.type.body, { color: t.colors.label }]}>Pro</Text>
                <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} testID="pro-status">
                  {trialDaysLeft !== null && trialDaysLeft >= 0 ? `Free trial, ${trialDaysLeft} ${trialDaysLeft === 1 ? 'day' : 'days'} left` : `${pro?.plan === 'yearly' ? 'Yearly' : 'Monthly'} plan`}
                </Text>
              </View>
              <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>Manage</Text>
            </PressableScale>
          ) : (
            <PressableScale onPress={() => showPaywall('settings')} style={styles.row} accessibilityLabel="Upgrade to Pro" scaleTo={0.99}>
              <Icon name="crown" size={18} color={t.colors.rewardText} />
              <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Upgrade to Pro</Text>
              <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />
            </PressableScale>
          )}
        </Section>
        <Section>
          {/* The name on the left, the choices on the right. (The app is light only, so no Look row.) */}
          <View style={styles.row}>
            <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Units</Text>
            <Segmented label="Units" value={units} onChange={(u: Units) => setUnits(u)} options={[{ label: 'Metric', value: 'metric' }, { label: 'US', value: 'us' }]} />
          </View>
        </Section>
        <Section>
          <PressableScale onPress={() => router.push('/privacy')} style={styles.row} accessibilityLabel="Privacy" scaleTo={0.99}>
            <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Privacy</Text>
            <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />
          </PressableScale>
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 60, gap: 12 },
});
