import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Icon } from '../../../components/Icon';
import { say, type Line } from '../../../components/mascot/lines';
import { MascotSays } from '../../../components/mascot/MascotSays';
import { PressableScale } from '../../../components/PressableScale';
import { RecipeRow } from '../../../components/RecipeCard';
import { useToast } from '../../../components/Toast';
import { Button, ProgressBar, Section, Segmented, Separator, Stepper } from '../../../components/ui';
import type { Units } from '../../../data/mock';
import { showPaywall, useProGate } from '../../../lib/pro';
import { BADGES, levelFor, nextBadge, streakOf, xpFor } from '../../../lib/progress';
import { MANAGE_SUBSCRIPTIONS_URL } from '../../../lib/purchases';
import { ScreenTitle } from '../../../navigation/screenOptions';
import { totalsFor, useStore } from '../../../state/store';
import { setAppearance, useAppearance, useTheme } from '../../../theme';

const dayKey = (d: Date) => d.toDateString();
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Your cooking progress: the streak, the next badge to aim for, your chef level, and settings. */
export default function ProgressScreen() {
  const t = useTheme();
  const appearance = useAppearance();
  const toast = useToast();
  const { cooked, getRecipe, goals, setGoals, units, setUnits, pro, customRecipes, plan, favorites, fun } = useStore();
  const { isPro, trialDaysLeft } = useProGate();
  const [showAll, setShowAll] = useState(false);
  const [petLine, setPetLine] = useState<Line | null>(null);
  const [pets, setPets] = useState(0);

  const now = new Date();
  const streak = streakOf(cooked.map((c) => c.date));
  const input = { cooked, customRecipes, plan, favorites, fun, streak };
  const xp = xpFor(input);
  const lvl = levelFor(xp);
  const next = nextBadge(input, fun.badges);
  const earned = BADGES.filter((b) => fun.badges.includes(b.id));
  const today = cooked.filter((c) => dayKey(new Date(c.date)) === dayKey(now));
  const eaten = totalsFor(today.map((c) => c.recipeId), getRecipe);
  const recent = useMemo(() => cooked.slice(0, 5), [cooked]);

  // This week, Monday to Sunday: which days had a cooked meal.
  const cookedDays = new Set(cooked.map((c) => dayKey(new Date(c.date))));
  const todayIndex = (now.getDay() + 6) % 7;
  const week = DAYS.map((label, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - todayIndex + i);
    return { label, done: cookedDays.has(dayKey(d)), today: i === todayIndex, future: i > todayIndex };
  });
  const cookedToday = week[todayIndex].done;

  const line: Line =
    petLine ??
    (streak >= 3
      ? { text: `${streak} days in a row! You’re on fire.`, mood: 'cheering' }
      : cookedToday
        ? { text: 'You cooked today! I’m so proud.', mood: 'proud' }
        : streak > 0
          ? { text: 'Cook today to keep your streak!', mood: 'excited' }
          : { text: 'Cook one meal to start a streak!', mood: 'wave' });

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: t.colors.background }} contentContainerStyle={[styles.content, { paddingHorizontal: t.spacing.lg }]}>
      <ScreenTitle title="Progress" />

      <MascotSays
        line={line}
        size={104}
        onPet={() => {
          setPetLine(say('pet', {}, pets));
          setPets((n) => n + 1);
        }}
        style={{ marginBottom: t.spacing.md }}
      />

      {/* Streak */}
      <View
        style={[styles.card, { backgroundColor: t.colors.rewardSoft, borderColor: t.colors.reward, ...t.chunky.button(t.colors.reward) }]}
        accessible
        accessibilityLabel={streak > 0 ? `${streak} day cooking streak` : 'No streak yet. Cook a meal today to start one.'}
      >
        <View style={styles.streakTop}>
          <View style={[styles.flame, { backgroundColor: streak > 0 ? t.colors.reward : t.colors.cell }]}>
            <Icon name="flameFill" size={30} color={streak > 0 ? t.colors.tintFill : t.colors.tertiaryLabel} weight="bold" />
          </View>
          <View style={{ flex: 1 }}>
            {streak > 0 ? (
              <>
                <Text style={[t.type.largeTitle, { color: t.colors.label }]} testID="streak-count">
                  {streak}
                </Text>
                <Text style={[t.type.headline, { color: t.colors.rewardText, marginTop: -4 }]}>day streak</Text>
              </>
            ) : (
              <>
                <Text style={[t.type.title2, { color: t.colors.label }]} testID="streak-count">
                  Start a streak
                </Text>
                <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>Cook a meal today</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.week}>
          {week.map((d, i) => (
            <View key={i} style={styles.day}>
              <View
                style={[
                  styles.dayDot,
                  { backgroundColor: d.done ? t.colors.reward : t.colors.cell, borderColor: d.today ? t.colors.tintFill : d.done ? t.colors.rewardDeep : t.colors.border },
                  d.future && { opacity: 0.55 },
                ]}
              >
                {d.done && <Icon name="check" size={14} color={t.colors.onReward} weight="bold" />}
              </View>
              <Text style={[t.type.caption1, { color: d.today ? t.colors.label : t.colors.secondaryLabel, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>{d.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Next badge */}
      {next && (
        <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]} accessible accessibilityLabel={`Next badge: ${next.badge.title}. ${next.badge.hint}. ${next.done} of ${next.needed}.`}>
          <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>Next badge</Text>
          <View style={styles.row}>
            <View style={[styles.medal, { backgroundColor: t.colors.rewardSoft }]}>
              <Icon name={next.badge.icon} size={24} color={t.colors.rewardText} weight="bold" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.title3, { color: t.colors.label }]} testID="next-badge">
                {next.badge.title}
              </Text>
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>{next.badge.hint}</Text>
            </View>
          </View>
          <View style={styles.barRow}>
            <View style={{ flex: 1 }}>
              <ProgressBar value={next.done / next.needed} label={`${next.badge.title} progress`} />
            </View>
            {next.done > 0 && (
              <Text style={[t.type.subhead, { color: t.colors.label, fontFamily: t.fonts.display, fontWeight: 'normal', fontVariant: ['tabular-nums'] }]}>
                {next.done} of {next.needed}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Chef level */}
      <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]} accessible accessibilityLabel={`Chef level ${lvl.level}, ${lvl.title}. ${xp} XP${lvl.next ? `, ${lvl.toNext} to the next level` : ''}`}>
        <View style={styles.row}>
          <View style={[styles.medal, { backgroundColor: t.colors.reward, ...t.chunky.button(t.colors.rewardDeep) }]}>
            <Text style={[t.type.title2, { color: t.colors.onReward }]} testID="chef-level">
              {lvl.level}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>Chef level</Text>
            <Text style={[t.type.title3, { color: t.colors.label }]}>{lvl.title}</Text>
          </View>
        </View>
        <ProgressBar value={lvl.progress} color={t.colors.reward} label="Progress to the next chef level" />
        <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} testID="xp-label">
          {lvl.next ? `${lvl.toNext} XP to ${lvl.next.title}` : 'Top level!'}
          {cooked.length > 0 ? ` · ${cooked.length} ${cooked.length === 1 ? 'meal' : 'meals'} cooked` : ''}
        </Text>
      </View>

      {/* Badges: the ones you have. The rest stay out of the way until you ask. */}
      {earned.length > 0 && (
        <>
          <Text style={[t.type.title3, styles.h, { color: t.colors.label }]} accessibilityRole="header">
            Your badges
          </Text>
          <View style={styles.badges}>
            {earned.map((b) => (
              <PressableScale key={b.id} onPress={() => toast({ message: `${b.title}: ${b.hint}. Done!`, icon: b.icon, tone: 'info' })} accessibilityLabel={`${b.title}, earned`} style={styles.badge}>
                <View style={[styles.badgeCoin, { backgroundColor: t.colors.reward, ...t.chunky.button(t.colors.rewardDeep) }]}>
                  <Icon name={b.icon} size={26} color={t.colors.onReward} weight="bold" />
                </View>
                <Text style={[t.type.caption1, { color: t.colors.label, textAlign: 'center', fontFamily: t.fonts.display, fontWeight: 'normal' }]} numberOfLines={2}>
                  {b.title}
                </Text>
              </PressableScale>
            ))}
          </View>
        </>
      )}
      <Button
        label={showAll ? 'Hide the other badges' : earned.length ? `See what else you can earn` : 'See all badges'}
        variant="plain"
        size="medium"
        onPress={() => setShowAll((v) => !v)}
        style={{ marginTop: 4 }}
      />
      {showAll && (
        <Animated.View entering={FadeIn.duration(200)}>
          <Section>
            {BADGES.filter((b) => !fun.badges.includes(b.id)).map((b, i) => {
              const [done, needed] = b.count(input);
              return (
                <View key={b.id}>
                  {i > 0 && <Separator inset={64} />}
                  <View style={styles.badgeRow} accessible accessibilityLabel={`${b.title}. ${b.hint}. ${Math.min(done, needed)} of ${needed}.`}>
                    <View style={[styles.badgeRowIcon, { backgroundColor: t.colors.fill }]}>
                      <Icon name={b.icon} size={18} color={t.colors.secondaryLabel} weight="bold" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.type.headline, { color: t.colors.label }]}>{b.title}</Text>
                      <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{b.hint}</Text>
                    </View>
                    {needed > 1 && done > 0 && (
                      <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, fontVariant: ['tabular-nums'] }]}>
                        {Math.min(done, needed)} of {needed}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </Section>
        </Animated.View>
      )}

      {/* Goals */}
      <Text style={[t.type.title3, styles.h, { color: t.colors.label }]} accessibilityRole="header">
        Daily goals
      </Text>
      {!isPro ? (
        <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
          <View style={styles.row}>
            <View style={[styles.badgeRowIcon, { backgroundColor: t.colors.rewardSoft }]}>
              <Icon name="crown" size={18} color={t.colors.rewardText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.headline, { color: t.colors.label }]}>Set goals, see your progress</Text>
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 1 }]}>
                {today.length > 0 ? `Today so far (estimated): ${eaten.protein} g protein, ${eaten.calories} kcal. ` : ''}With Pro, you track protein and calories against daily targets.
              </Text>
            </View>
          </View>
          <Button label="Unlock Goals with Pro" icon="crown" variant="tinted" size="medium" onPress={() => showPaywall('goals')} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        <Section footer="Meals you log at the end of Cook Mode count toward today, one serving each. Recipe nutrition is estimated.">
          <GoalRow label="Protein" unit="g" eaten={eaten.protein} goal={goals.protein} color={t.colors.protein}>
            <Stepper value={goals.protein} onChange={(v) => setGoals({ ...goals, protein: v })} min={40} max={300} step={5} label="protein goal" />
          </GoalRow>
          <Separator />
          <GoalRow label="Calories" unit="kcal" eaten={eaten.calories} goal={goals.calories} color={t.colors.carbs}>
            <Stepper value={goals.calories} onChange={(v) => setGoals({ ...goals, calories: v })} min={1000} max={5000} step={50} label="calorie goal" />
          </GoalRow>
        </Section>
      )}

      {/* Recently cooked */}
      {recent.length > 0 && (
        <>
          <Text style={[t.type.title3, styles.h, { color: t.colors.label }]} accessibilityRole="header">
            Recently cooked
          </Text>
          <Section>
            {recent.map((c, i) => {
              const r = getRecipe(c.recipeId);
              if (!r) return null;
              return (
                <View key={`${c.date}-${i}`}>
                  {i > 0 && <Separator inset={84} />}
                  <RecipeRow recipe={r} subtitle={`${new Date(c.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${c.servings} servings`} />
                </View>
              );
            })}
          </Section>
        </>
      )}

      {/* Settings */}
      <Text style={[t.type.title3, styles.h, { color: t.colors.label }]} accessibilityRole="header">
        Settings
      </Text>
      <Section>
        {isPro ? (
          <PressableScale
            onPress={() => Linking.openURL(MANAGE_SUBSCRIPTIONS_URL).catch(() => toast({ message: 'Couldn’t open the link', tone: 'warning' }))}
            style={styles.settingRow}
            accessibilityLabel="Manage your Pro subscription"
            scaleTo={0.99}
          >
            <Icon name="crown" size={18} color={t.colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[t.type.body, { color: t.colors.label }]}>Pro</Text>
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} testID="pro-status">
                {trialDaysLeft !== null && trialDaysLeft >= 0 ? `Free trial, ${trialDaysLeft} ${trialDaysLeft === 1 ? 'day' : 'days'} left` : `${pro?.plan === 'yearly' ? 'Yearly' : 'Monthly'} plan`}
              </Text>
            </View>
            <Text style={[t.type.subhead, { color: t.colors.tint }]}>Manage</Text>
          </PressableScale>
        ) : (
          <PressableScale onPress={() => showPaywall('settings')} style={styles.settingRow} accessibilityLabel="Upgrade to Pro" scaleTo={0.99}>
            <Icon name="crown" size={18} color={t.colors.warning} />
            <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Upgrade to Pro</Text>
            <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />
          </PressableScale>
        )}
        <Separator />
        <View style={styles.settingRow}>
          <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Units</Text>
          <Segmented label="Units" value={units} onChange={(u: Units) => setUnits(u)} options={[{ label: 'Metric', value: 'metric' }, { label: 'US', value: 'us' }]} />
        </View>
        <Separator />
        <View style={[styles.settingRow, styles.settingStack]}>
          <Text style={[t.type.body, { color: t.colors.label }]}>Look</Text>
          <Segmented label="Look" value={appearance} onChange={setAppearance} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }, { label: 'Auto', value: 'system' }]} />
        </View>
        <Separator />
        <PressableScale onPress={() => router.push('/privacy')} style={styles.settingRow} accessibilityLabel="Privacy" scaleTo={0.99}>
          <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Privacy</Text>
          <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />
        </PressableScale>
      </Section>
    </ScrollView>
  );
}

function GoalRow({ label, unit, eaten, goal, color, children }: { label: string; unit: string; eaten: number; goal: number; color: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.goal}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[t.type.headline, { color: t.colors.label }]}>{label}</Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
            {eaten} of {goal} {unit} today
          </Text>
        </View>
        {children}
      </View>
      <ProgressBar value={eaten / goal} color={color} height={10} label={`${label} today`} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 48, width: '100%', maxWidth: 700, alignSelf: 'center' },
  card: { borderRadius: 24, borderWidth: 2, padding: 18, gap: 14, borderCurve: 'continuous', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flame: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 4 },
  dayDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  medal: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  h: { marginTop: 16, marginBottom: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  badge: { width: 92, alignItems: 'center', gap: 8, minHeight: 44 },
  badgeCoin: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 60 },
  badgeRowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  goal: { padding: 16, gap: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 56, gap: 10 },
  // The three-way switch gets its own line, so it never squeezes its label.
  settingStack: { flexDirection: 'column', alignItems: 'stretch', paddingVertical: 12, gap: 8 },
});
