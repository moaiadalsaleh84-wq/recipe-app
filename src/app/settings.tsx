import { router } from 'expo-router';
import { Linking, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { PressableScale } from '../components/PressableScale';
import { useToast } from '../components/Toast';
import { Chip, Section, Segmented } from '../components/ui';
import { PopIconButton } from '../components/pop';
import { goalsOn, type Units } from '../data/mock';
import { dietOptions, timeLabel } from '../data/onboarding';
import { askReminderPermission } from '../lib/dinnerReminders';
import { showPaywall, useProGate } from '../lib/pro';
import { MANAGE_SUBSCRIPTIONS_URL } from '../lib/purchases';
import { noWidow } from '../lib/text';
import { useStore } from '../state/store';
import { pop, useTheme } from '../theme';
import { useAdminMode } from '../lib/discoverApi';

/** Moves an "HH:MM" time by 30 minutes, kept between 3 pm and 9:30 pm. */
function shiftTime(hhmm: string, by: number) {
  const [h, m] = hhmm.split(':').map(Number);
  const mins = Math.min(21 * 60 + 30, Math.max(15 * 60, h * 60 + m + by));
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/** Settings: Pro, units, the daily dinner idea, privacy. Opened from the gear on the Progress tab. */
export default function Settings() {
  const t = useTheme();
  const admin = useAdminMode();
  const toast = useToast();
  const { units, setUnits, pro, profile, setProfile, goals, setGoals } = useStore();
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
        {/* Your diet from onboarding: Home and every pick only show recipes that fit it. */}
        <Section>
          <View style={styles.dietRow} testID="diet-setting">
            <Text style={[t.type.body, { color: t.colors.label }]}>Diet</Text>
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
              {profile.diets.length ? 'Only recipes that fit are shown.' : 'No preference: every recipe is shown.'}
            </Text>
            <View style={styles.chips}>
              {dietOptions.map((d) => (
                <Chip
                  key={d}
                  label={d}
                  selected={profile.diets.includes(d)}
                  onPress={() => setProfile({ diets: profile.diets.includes(d) ? profile.diets.filter((x) => x !== d) : [...profile.diets, d] })}
                />
              ))}
            </View>
          </View>
        </Section>
        {/* Pro: daily protein and calorie goals on the You page (moved here from You). */}
        {isPro && (
          <Section>
            <View style={styles.row}>
              <Icon name="target" size={18} color={t.colors.label} />
              <View style={{ flex: 1 }}>
                <Text style={[t.type.body, { color: t.colors.label }]}>Daily goals</Text>
                <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{noWidow('Protein and calories from the meals you cook')}</Text>
              </View>
              <Switch
                value={goalsOn(goals)}
                onValueChange={(on) => setGoals({ ...goals, on })}
                trackColor={{ true: pop.leaf, false: pop.lilacTint }}
                thumbColor={pop.white}
                ios_backgroundColor={pop.lilacTint}
                accessibilityLabel="Daily goals"
                testID="goals-switch"
              />
            </View>
          </Section>
        )}
        <Section>
          <View style={styles.row}>
            <Icon name="clock" size={18} color={t.colors.label} />
            <View style={{ flex: 1 }}>
              <Text style={[t.type.body, { color: t.colors.label }]}>Daily dinner idea</Text>
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{noWidow('One nudge a day, skipped on days you cooked')}</Text>
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
          <View style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.colors.separator }]}>
            <Icon name="flameFill" size={18} color={t.pop.tomato} />
            <View style={{ flex: 1 }}>
              <Text style={[t.type.body, { color: t.colors.label }]}>Streak saver</Text>
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{noWidow('At 8\u00A0pm, a quick idea when a 3\u2011day streak hasn’t had today’s cook')}</Text>
            </View>
            <Switch
              value={!!profile.streakSaver}
              onValueChange={async (on) => {
                if (!on) return setProfile({ streakSaver: false });
                const granted = (await askReminderPermission()) || Platform.OS === 'web';
                if (granted) setProfile({ streakSaver: true });
                else toast({ message: 'Notifications are off for Pantry Pop. Turn them on in iOS Settings.', tone: 'warning' });
              }}
              trackColor={{ true: pop.leaf, false: pop.lilacTint }}
              thumbColor={pop.white}
              ios_backgroundColor={pop.lilacTint}
              accessibilityLabel="Streak saver"
              testID="saver-switch"
            />
          </View>
        </Section>
        <Section>
          {/* Admin mode (the owner): a long press here opens the code screen; the server checks the code. */}
          <PressableScale onPress={() => router.push('/privacy')} onLongPress={() => router.push('/admin')} delayLongPress={1500} style={styles.row} accessibilityLabel="Privacy" scaleTo={0.99}>
            <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Privacy</Text>
            <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />
          </PressableScale>
          <PressableScale onPress={() => router.push('/photo-credits')} style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.colors.separator }]} accessibilityLabel="Photo credits" scaleTo={0.99} testID="photo-credits-row">
            <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Photo credits</Text>
            <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />
          </PressableScale>
          {admin && (
            <PressableScale onPress={() => router.push('/admin')} style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.colors.separator }]} accessibilityLabel="Admin: reports and Discover" scaleTo={0.99} testID="admin-row">
              <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Admin</Text>
              <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />
            </PressableScale>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, minHeight: 60, gap: 12 },
  dietRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});
