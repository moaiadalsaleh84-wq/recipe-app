import { router } from 'expo-router';
import { Linking, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { PressableScale } from '../components/PressableScale';
import { useToast } from '../components/Toast';
import { Section, Segmented } from '../components/ui';
import { PopIconButton } from '../components/pop';
import type { Units } from '../data/mock';
import { timeLabel } from '../data/onboarding';
import { askReminderPermission } from '../lib/dinnerReminders';
import { showPaywall, useProGate } from '../lib/pro';
import { MANAGE_SUBSCRIPTIONS_URL } from '../lib/purchases';
import { useStore } from '../state/store';
import { pop, useTheme } from '../theme';

/** Moves an "HH:MM" time by 30 minutes, kept between 3 pm and 9:30 pm. */
function shiftTime(hhmm: string, by: number) {
  const [h, m] = hhmm.split(':').map(Number);
  const mins = Math.min(21 * 60 + 30, Math.max(15 * 60, h * 60 + m + by));
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/** Settings: Pro, units, the daily dinner idea, privacy. Opened from the gear on the Progress tab. */
export default function Settings() {
  const t = useTheme();
  const toast = useToast();
  const { units, setUnits, pro, profile, setProfile } = useStore();
  const reminder = profile.reminder ?? { enabled: false, time: '18:00' };
  const setReminderOn = async (on: boolean) => {
    if (!on) return setProfile({ reminder: { ...reminder, enabled: false } });
    // Only asks iOS once the person turns it on.
    const granted = (await askReminderPermission()) || Platform.OS === 'web';
    if (granted) setProfile({ reminder: { ...reminder, enabled: true } });
    else toast({ message: 'Notifications are off for Pantry Pop. Turn them on in iOS Settings.', tone: 'warning' });
  };
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
          <View style={styles.row}>
            <Icon name="clock" size={18} color={t.colors.label} />
            <View style={{ flex: 1 }}>
              <Text style={[t.type.body, { color: t.colors.label }]}>Daily dinner idea</Text>
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>One nudge a day, skipped on days you cooked</Text>
            </View>
            <Switch
              value={reminder.enabled}
              onValueChange={setReminderOn}
              trackColor={{ true: pop.leaf, false: pop.lilacTint }}
              thumbColor={pop.white}
              ios_backgroundColor={pop.lilacTint}
              accessibilityLabel="Daily dinner idea"
              testID="reminder-switch"
            />
          </View>
          {reminder.enabled && (
            <View style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.colors.separator }]}>
              <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Time</Text>
              <PopIconButton icon="minus" accessibilityLabel="30 minutes earlier" onPress={() => setProfile({ reminder: { ...reminder, time: shiftTime(reminder.time, -30) } })} haptic="select" />
              <Text style={[t.type.headline, { color: t.colors.label, minWidth: 76, textAlign: 'center' }]} testID="reminder-time" accessibilityLiveRegion="polite">
                {timeLabel(reminder.time)}
              </Text>
              <PopIconButton icon="plus" accessibilityLabel="30 minutes later" onPress={() => setProfile({ reminder: { ...reminder, time: shiftTime(reminder.time, 30) } })} haptic="select" />
            </View>
          )}
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
