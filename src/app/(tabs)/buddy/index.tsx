import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CatBuddy } from '../../../components/cats/CatBuddy';
import { CatSays } from '../../../components/cats/CatSays';
import { buddyInfo, say, type Line } from '../../../components/cats/dialogue';
import type { BuddyId } from '../../../components/cats/types';
import { Icon, type IconName } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { RecipeRow } from '../../../components/RecipeCard';
import { useToast } from '../../../components/Toast';
import { Button, Section, Segmented, Separator, Stepper } from '../../../components/ui';
import { MANAGE_SUBSCRIPTIONS_URL } from '../../../lib/purchases';
import { showPaywall, useProGate } from '../../../lib/pro';
import type { Units } from '../../../data/mock';
import { ScreenTitle } from '../../../navigation/screenOptions';
import { BADGES, levelFor, streakOf, xpFor } from '../../../lib/progress';
import { totalsFor, useBuddy, useStore } from '../../../state/store';
import { useTheme } from '../../../theme';

const dayKey = (d: Date) => d.toDateString();

export default function BuddyScreen() {
  const t = useTheme();
  const toast = useToast();
  const buddy = useBuddy();
  const { setBuddy, cooked, getRecipe, goals, setGoals, units, setUnits, pro, customRecipes, plan, favorites, fun } = useStore();
  const { isPro, trialDaysLeft } = useProGate();
  const info = buddyInfo[buddy];

  // Remember who said the line, so switching buddies elsewhere never shows the old cat's words.
  const [said, setSaid] = useState<{ by: BuddyId; line: Line }>(() => ({ by: buddy, line: say(buddy, 'tip', {}, 0) }));
  const line = said.by === buddy ? said.line : say(buddy, 'intro');
  const setLine = (l: Line, by: BuddyId = buddy) => setSaid({ by, line: l });
  const [n, setN] = useState(1);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const thisWeek = cooked.filter((c) => new Date(c.date) >= weekAgo).length;
  const streak = streakOf(cooked.map((c) => c.date));
  const xp = xpFor({ cooked, customRecipes, plan, favorites, fun, streak });
  const lvl = levelFor(xp);
  const today = cooked.filter((c) => dayKey(new Date(c.date)) === dayKey(now));
  const eaten = totalsFor(today.map((c) => c.recipeId), getRecipe);
  const recent = useMemo(() => cooked.slice(0, 5), [cooked]);

  const tip = () => {
    setLine(say(buddy, 'tip', {}, n));
    setN((x) => x + 1);
  };

  const tricks: { label: string; icon: IconName; line: Line }[] =
    buddy === 'tank'
      ? [
          { label: 'Flex!', icon: 'dumbbell', line: { text: 'Gun show. Tickets are free. Protein is not.', mood: 'flex' } },
          { label: 'Reps', icon: 'timer', line: { text: 'Curl with me. One… two… you’re not doing it, are you.', mood: 'lift' } },
        ]
      : [
          { label: 'Snack!', icon: 'heart', line: { text: 'Taste test! For science! Nom nom nom.', mood: 'eat' } },
          { label: 'Oopsie', icon: 'fork', line: { text: 'Whoa whoa whoa… I’m okay! The flour is not okay.', mood: 'oops' } },
        ];

  const switchTo = (b: BuddyId) => {
    if (b === buddy) return;
    setBuddy(b);
    setLine(say(b, 'intro'), b);
    toast({ message: `${buddyInfo[b].name} is your buddy now`, icon: 'paw' });
  };

  const proteinPct = Math.min(1, eaten.protein / goals.protein);
  const kcalPct = Math.min(1, eaten.calories / goals.calories);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: t.colors.groupedBackground }}
      contentContainerStyle={[styles.content, { paddingHorizontal: t.spacing.md }]}
    >
      <ScreenTitle title="Buddy" />

      {/* Stage */}
      <View style={[styles.stage, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
        <View style={[styles.floor, { backgroundColor: t.colors.imagePlaceholder }]} />
        <Text style={[t.type.title2, { color: t.colors.label, textAlign: 'center' }]}>{info.title}</Text>
        <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, textAlign: 'center', marginBottom: 8 }]}>{info.tagline}</Text>
        <CatSays buddy={buddy} line={line} layout="column" size={190} onNext={tip} hint="Tap for a tip" onPet={() => setLine(say(buddy, 'pet', {}, n))} />
        <View style={styles.tricks}>
          <Trick label="Tip" icon="chat" onPress={tip} />
          <Trick label="Pet" icon="paw" onPress={() => { setLine(say(buddy, 'pet', {}, n)); setN((x) => x + 1); }} />
          {tricks.map((tr) => (
            <Trick key={tr.label} label={tr.label} icon={tr.icon} onPress={() => setLine(tr.line)} />
          ))}
        </View>
      </View>

      {/* Switch buddy */}
      <Text style={[t.type.title3, styles.h, { color: t.colors.label }]} accessibilityRole="header">
        Your buddy
      </Text>
      <View style={styles.switchRow}>
        {(['tank', 'biscuit'] as const).map((b) => {
          const active = b === buddy;
          return (
            <PressableScale
              key={b}
              onPress={() => switchTo(b)}
              haptic="select"
              accessibilityRole="radio"
              aria-checked={active}
              accessibilityLabel={`${buddyInfo[b].title}${active ? ', current buddy' : ''}`}
              style={[
                styles.switchCard,
                { backgroundColor: t.colors.cell, borderColor: active ? t.colors.tintFill : t.colors.border },
                active ? t.chunky.button() : t.chunky.lip,
              ]}
            >
              <CatBuddy buddy={b} mood={active ? 'happy' : 'idle'} size={70} petable={false} />
              <View style={{ flex: 1 }}>
                <Text style={[t.type.headline, { color: t.colors.label }]}>{buddyInfo[b].name}</Text>
                <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{active ? 'Cooking with you' : 'Tap to switch'}</Text>
              </View>
            </PressableScale>
          );
        })}
      </View>

      {/* Stats */}
      <Text style={[t.type.title3, styles.h, { color: t.colors.label }]} accessibilityRole="header">
        Your cooking
      </Text>
      <View style={styles.stats}>
        <Stat value={thisWeek} label="cooked this week" icon="pot" />
        <Stat value={streak} label={streak === 1 ? 'day streak' : 'day streak'} icon="flame" />
        <Stat value={cooked.length} label="cooked total" icon="checkCircle" />
      </View>

      {/* Chef level */}
      <Text style={[t.type.title3, styles.h, { color: t.colors.label }]} accessibilityRole="header">
        Chef level
      </Text>
      <View style={[styles.levelCard, { backgroundColor: t.colors.cell, ...t.chunky.card }]} accessible accessibilityLabel={`Level ${lvl.level}, ${lvl.title}. ${xp} XP${lvl.next ? `, ${lvl.toNext} to the next level` : ''}`}>
        <View style={[styles.levelBadge, { backgroundColor: t.colors.tintFill }]}>
          <Text style={[t.type.title2, { color: t.colors.onTint }]} testID="chef-level">
            {lvl.level}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={[t.type.headline, { color: t.colors.label }]}>{lvl.title}</Text>
          <View style={[styles.track, { backgroundColor: t.colors.fill }]}>
            <View style={[styles.bar, { width: `${Math.max(3, lvl.progress * 100)}%`, backgroundColor: t.colors.warning }]} />
          </View>
          <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]} testID="xp-label">
            {xp} XP{lvl.next ? ` · ${lvl.toNext} XP to ${lvl.next.title}` : ' · Top level!'}
          </Text>
        </View>
      </View>

      {/* Badges */}
      <Text style={[t.type.title3, styles.h, { color: t.colors.label }]} accessibilityRole="header">
        Badges · {fun.badges.length}/{BADGES.length}
      </Text>
      <View style={styles.badges}>
        {BADGES.map((b) => {
          const got = fun.badges.includes(b.id);
          return (
            <PressableScale
              key={b.id}
              onPress={() => toast({ message: got ? `${b.title}: earned! ${b.hint}.` : `${b.title}: ${b.hint} to unlock it.`, icon: got ? b.icon : 'lock', tone: 'info' })}
              accessibilityLabel={`${b.title}, ${got ? 'earned' : 'locked'}`}
              style={[styles.badgeTile, { backgroundColor: got ? t.colors.cell : t.colors.fill, borderColor: got ? t.colors.warning : t.colors.border }, got && t.chunky.lip]}
            >
              <View style={[styles.badgeIcon, { backgroundColor: got ? t.colors.tintSoft : 'transparent' }]}>
                <Icon name={got ? b.icon : 'lock'} size={20} color={got ? t.colors.tint : t.colors.tertiaryLabel} weight="bold" />
              </View>
              <Text style={[t.type.caption1, { color: got ? t.colors.label : t.colors.tertiaryLabel, fontWeight: '700', textAlign: 'center' }]} numberOfLines={2}>
                {b.title}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {/* Goals */}
      <Text style={[t.type.title3, styles.h, { color: t.colors.label }]} accessibilityRole="header">
        Daily goals
      </Text>
      {!isPro ? (
        <View style={[styles.locked, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
          <View style={styles.lockedTop}>
            <View style={[styles.lockIcon, { backgroundColor: t.colors.tintSoft }]}>
              <Icon name="lock" size={16} color={t.colors.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.headline, { color: t.colors.label }]}>Set goals, see your progress</Text>
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 1 }]}>
                Today so far (estimated): {eaten.protein} g protein, {eaten.calories} kcal. With Pro, {buddy === 'tank' ? 'Tank tracks' : 'you track'} these against daily targets.
              </Text>
            </View>
          </View>
          <Button label="Unlock Goals with Pro" icon="crown" size="medium" onPress={() => showPaywall('goals')} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
      <Section footer={buddy === 'tank' ? 'Tank tracks meals you log at the end of Cook Mode, one serving each. Recipe nutrition is estimated.' : 'Meals you log at the end of Cook Mode count toward today, one serving each. Recipe nutrition is estimated.'}>
        <GoalRow label="Protein" unit="g" eaten={eaten.protein} goal={goals.protein} pct={proteinPct} color={t.colors.protein}>
          <Stepper value={goals.protein} onChange={(v) => setGoals({ ...goals, protein: v })} min={40} max={300} step={5} label="protein goal" />
        </GoalRow>
        <Separator />
        <GoalRow label="Calories" unit="kcal" eaten={eaten.calories} goal={goals.calories} pct={kcalPct} color={t.colors.carbs}>
          <Stepper value={goals.calories} onChange={(v) => setGoals({ ...goals, calories: v })} min={1000} max={5000} step={50} label="calorie goal" />
        </GoalRow>
      </Section>
      )}

      {/* Recently cooked */}
      {recent.length > 0 && (
        <>
          <Text style={[t.type.title3, styles.h, { color: t.colors.label, marginTop: 0 }]} accessibilityRole="header">
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
      <Text style={[t.type.title3, styles.h, { color: t.colors.label, marginTop: 0 }]} accessibilityRole="header">
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
                {trialDaysLeft !== null && trialDaysLeft >= 0
                  ? `Free trial · ${trialDaysLeft} ${trialDaysLeft === 1 ? 'day' : 'days'} left`
                  : `${pro?.plan === 'yearly' ? 'Yearly' : 'Monthly'} plan`}
              </Text>
            </View>
            <Text style={[t.type.subhead, { color: t.colors.tint }]}>Manage</Text>
          </PressableScale>
        ) : (
          <PressableScale onPress={() => showPaywall('settings')} style={styles.settingRow} accessibilityLabel="Upgrade to Pro" scaleTo={0.99}>
            <Icon name="crown" size={18} color={t.colors.warning} />
            <Text style={[t.type.body, { color: t.colors.tint, flex: 1 }]}>Upgrade to Pro</Text>
            <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />
          </PressableScale>
        )}
        <Separator />
        <View style={styles.settingRow}>
          <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Units</Text>
          <Segmented label="Units" value={units} onChange={(u: Units) => setUnits(u)} options={[{ label: 'Metric', value: 'metric' }, { label: 'US', value: 'us' }]} />
        </View>
        <Separator />
        <PressableScale onPress={() => router.push('/buddy-picker')} style={styles.settingRow} accessibilityLabel="Meet the buddies again" scaleTo={0.99}>
          <Text style={[t.type.body, { color: t.colors.tint, flex: 1 }]}>Meet the buddies again</Text>
          <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />
        </PressableScale>
        <Separator />
        <PressableScale onPress={() => router.push('/privacy')} style={styles.settingRow} accessibilityLabel="Privacy" scaleTo={0.99}>
          <Text style={[t.type.body, { color: t.colors.tint, flex: 1 }]}>Privacy</Text>
          <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />
        </PressableScale>
      </Section>
    </ScrollView>
  );
}

function Trick({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  const t = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} style={[styles.trick, { backgroundColor: t.colors.tintSoft, borderColor: t.colors.border }]}>
      <Icon name={icon} size={16} color={t.colors.tint} weight="bold" />
      <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '700', fontFamily: t.fonts.rounded }]}>{label}</Text>
    </PressableScale>
  );
}

function Stat({ value, label, icon }: { value: number; label: string; icon: IconName }) {
  const t = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: t.colors.cell, ...t.chunky.card }]} accessible accessibilityLabel={`${value} ${label}`}>
      <Icon name={icon} size={18} color={t.colors.tint} />
      <Animated.Text key={value} entering={FadeIn} style={[t.type.title1, { color: t.colors.label }]}>
        {value}
      </Animated.Text>
      <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}

function GoalRow({ label, unit, eaten, goal, pct, color, children }: { label: string; unit: string; eaten: number; goal: number; pct: number; color: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.goal}>
      <View style={styles.goalTop}>
        <View style={{ flex: 1 }}>
          <Text style={[t.type.headline, { color: t.colors.label }]}>{label}</Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
            {eaten} of {goal} {unit} today
          </Text>
        </View>
        {children}
      </View>
      <View style={[styles.track, { backgroundColor: t.colors.fill }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: goal, now: eaten }}>
        <View style={[styles.bar, { width: `${Math.max(2, pct * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 120, width: '100%', maxWidth: 700, alignSelf: 'center' },
  stage: { borderRadius: 28, padding: 16, paddingTop: 20, overflow: 'visible', borderCurve: 'continuous' },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, opacity: 0.6 },
  tricks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 },
  trick: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  h: { marginTop: 28, marginBottom: 10, paddingHorizontal: 4 },
  switchRow: { flexDirection: 'row', gap: 10 },
  switchCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, borderRadius: 20, borderWidth: 2.5, borderCurve: 'continuous' },
  stats: { flexDirection: 'row', gap: 10 },
  levelCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, borderCurve: 'continuous' },
  levelBadge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeTile: { width: '31%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 16, borderWidth: 2, minHeight: 92, borderCurve: 'continuous' },
  badgeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 18, borderCurve: 'continuous' },
  goal: { padding: 16, gap: 10 },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
  locked: { borderRadius: 18, padding: 16, gap: 14, borderCurve: 'continuous', marginBottom: 24 },
  lockedTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lockIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 56, gap: 10 },
});
