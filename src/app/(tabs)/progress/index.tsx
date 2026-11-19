import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { RecipeRow } from '../../../components/RecipeCard';
import { useToast } from '../../../components/Toast';
import { AnimatedNumber, Button, HeaderButton, ProgressBar, Ring, Section, SectionHeader, Separator, Stepper } from '../../../components/ui';
import { Reveal } from '../../../components/Reveal';
import { showPaywall, useProGate } from '../../../lib/pro';
import { BADGES, levelFor, nextBadge, streakOf, xpFor } from '../../../lib/progress';
import { TabScreen } from '../../../components/TabScreen';
import { totalsFor, useStore } from '../../../state/store';
import { noWidow } from '../../../lib/text';
import { brand, cook, fonts, useTheme } from '../../../theme';

const dayKey = (d: Date) => d.toDateString();
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** The way to earn a one-time badge, shown instead of a progress bar. */
const BADGE_ACTION: Record<string, { label: string; href: '/' | '/recipe/new' | '/groceries' } | undefined> = {
  'first-dish': { label: 'Cook any recipe in Cook Mode', href: '/' },
  writer: { label: 'Write a recipe', href: '/recipe/new' },
  shopper: { label: 'Open your grocery list', href: '/groceries' },
};

/** Your cooking progress: the streak, the next badge to aim for, your chef level, and settings. */
export default function ProgressScreen() {
  const t = useTheme();
  const toast = useToast();
  const { cooked, getRecipe, goals, setGoals, customRecipes, plan, favorites, fun, profile } = useStore();
  const { isPro } = useProGate();
  const [showAll, setShowAll] = useState(false);
  const [allHistory, setAllHistory] = useState(false);

  const now = new Date();
  const streak = streakOf(cooked.map((c) => c.date));
  const input = { cooked, customRecipes, plan, favorites, fun, streak };
  const xp = xpFor(input);
  const lvl = levelFor(xp);
  const next = nextBadge(input, fun.badges);
  const earned = BADGES.filter((b) => fun.badges.includes(b.id));
  const upcoming = BADGES.filter((b) => !fun.badges.includes(b.id)).slice(0, 2);
  const today = cooked.filter((c) => dayKey(new Date(c.date)) === dayKey(now));
  const eaten = totalsFor(
    today.map((c) => c.recipeId),
    getRecipe,
  );
  // Newest first. Five at a time unless you ask for everything.
  const history = useMemo(() => [...cooked].sort((a, b) => b.date.localeCompare(a.date)), [cooked]);
  const recent = allHistory ? history : history.slice(0, 5);
  const tried = new Set(cooked.map((c) => c.recipeId)).size;
  const saved = favorites.length + customRecipes.length;

  // This week, Monday to Sunday: which days had a cooked meal.
  const cookedDays = new Set(cooked.map((c) => dayKey(new Date(c.date))));
  const todayIndex = (now.getDay() + 6) % 7;
  const week = DAYS.map((label, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - todayIndex + i);
    return { label, done: cookedDays.has(dayKey(d)), today: i === todayIndex, future: i > todayIndex };
  });

  return (
    <TabScreen title="Your kitchen" kicker={profile.name.trim() ? `${profile.name.trim().split(/\s+/)[0]}’s progress` : 'Your progress'} right={<HeaderButton icon="gear" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />}>
      {/* Your chef level: the hero of this screen. A saffron ring fills toward the next level. */}
      <Reveal index={0}>
      <View
        style={[styles.hero, { backgroundColor: t.isDark ? '#1E3A2B' : cook.background, ...t.shadow.card }]}
        accessible
        accessibilityLabel={`Chef level ${lvl.level}, ${lvl.title}. ${xp} XP${lvl.next ? `, ${lvl.toNext} to the next level` : ''}`}
      >
        <Ring value={lvl.progress} size={92} stroke={9} color={cook.accent} track={cook.track}>
          <Text style={[styles.levelNum, { color: cook.label }]} testID="chef-level">
            {lvl.level}
          </Text>
        </Ring>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text style={[t.type.footnote, { color: cook.secondaryLabel, fontFamily: t.fonts.bold }]}>Chef level {lvl.level}</Text>
          <Text style={[t.type.title1, { color: cook.label }]}>{lvl.title}</Text>
          <Text style={[t.type.footnote, { color: cook.secondaryLabel }]} testID="xp-label">
            {lvl.next ? `${lvl.toNext} XP to ${lvl.next.title}` : 'Top level!'}
          </Text>
        </View>
      </View>
      </Reveal>

      {/* Bento: the streak, meals cooked and recipes tried as bold tiles, then this week. */}
      <Reveal index={1} style={styles.bento}>
        <View
          style={[styles.tile, styles.tall, { backgroundColor: t.colors.reward }]}
          accessible
          accessibilityLabel={streak > 0 ? `${streak} day cooking streak` : 'No streak yet. Cook a meal today to start one.'}
        >
          <View style={[styles.tileIcon, { backgroundColor: 'rgba(20,32,25,0.1)' }]}>
            <Icon name="flameFill" size={22} color={brand.ink} weight="bold" />
          </View>
          <View>
            {streak > 0 ? (
              <>
                <AnimatedNumber value={streak} style={[styles.big, { color: brand.ink }]} />
                <Text style={[t.type.headline, { color: brand.ink }]} testID="streak-count">
                  {streak === 1 ? 'day streak' : 'days in a row'}
                </Text>
              </>
            ) : (
              <>
                <Text style={[t.type.title2, { color: brand.ink }]} testID="streak-count">
                  Start a streak
                </Text>
                <Text style={[t.type.subhead, { color: 'rgba(20,32,25,0.75)' }]}>Cook a meal today</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.col}>
          <View style={[styles.tile, { backgroundColor: t.colors.tintFill }]} accessible accessibilityLabel={`${cooked.length} meals cooked`}>
            <AnimatedNumber value={cooked.length} style={[styles.mid, { color: '#FFFFFF' }]} />
            <Text style={[t.type.footnote, { color: 'rgba(255,255,255,0.88)', fontFamily: t.fonts.bold }]}>{cooked.length === 1 ? 'meal cooked' : 'meals cooked'}</Text>
          </View>
          <View style={[styles.tile, { backgroundColor: t.colors.cell, ...t.chunky.card }]} accessible accessibilityLabel={`${tried} recipes tried, ${saved} saved`}>
            <AnimatedNumber value={tried} style={[styles.mid, { color: t.colors.label }]} />
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, fontFamily: t.fonts.bold }]}>
              {tried === 1 ? 'recipe tried' : 'recipes tried'}
            </Text>
            <Text style={[t.type.caption1, { color: t.colors.tertiaryLabel }]}>{saved} saved</Text>
          </View>
        </View>
      </Reveal>

      <Reveal index={2}>
        <View style={[styles.weekTile, { backgroundColor: t.isDark ? t.colors.elevated : cook.background }]} accessible accessibilityLabel={`This week: cooked on ${week.filter((d) => d.done).length} days`}>
          <View style={styles.weekHead}>
            <Text style={[t.type.title3, { color: cook.label }]}>This week</Text>
            <Text style={[t.type.footnote, { color: cook.secondaryLabel, fontFamily: t.fonts.bold }]}>
              {week.filter((d) => d.done).length} of 7 days
            </Text>
          </View>
          <View style={styles.week}>
            {week.map((d, i) => (
              <View key={i} style={styles.day}>
                <Animated.View
                  entering={ZoomIn.duration(240).delay(200 + i * 45)}
                  style={[styles.dayDot, { backgroundColor: d.done ? cook.accent : 'transparent', borderColor: d.today ? cook.accent : d.done ? cook.accent : cook.track }, d.future && { opacity: 0.5 }]}
                >
                  {d.done && <Icon name="check" size={14} color={cook.onAccent} weight="bold" />}
                </Animated.View>
                <Text style={[t.type.caption1, { color: d.today ? cook.label : cook.secondaryLabel }]}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </Reveal>

      {/* Next badge */}
      {next && (
        <Reveal index={3}>
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
          {next.needed > 1 ? (
            <View style={styles.barRow}>
              <View style={{ flex: 1 }}>
                <ProgressBar value={next.done / next.needed} label={`${next.badge.title} progress`} />
              </View>
              <Text style={[t.type.subhead, { color: t.colors.label, fontFamily: t.fonts.display, fontWeight: 'normal', fontVariant: ['tabular-nums'] }]}>
                {next.done} of {next.needed}
              </Text>
            </View>
          ) : (
            // A one-time badge: no bar, just the way to get it.
            BADGE_ACTION[next.badge.id] && <Button label={BADGE_ACTION[next.badge.id]!.label} variant="tinted" onPress={() => router.navigate(BADGE_ACTION[next.badge.id]!.href)} />
          )}
        </View>
        </Reveal>
      )}

      {/* Badges: the ones you have, then the next two still to earn, softly faded. */}
      <SectionHeader title="Your badges" subtitle={`${earned.length} of ${BADGES.length} earned`} />
      <View style={styles.badges}>
        {earned.map((b, i) => (
          <Animated.View key={b.id} entering={ZoomIn.duration(260).delay(i * 50)} style={styles.badgeCell}>
            <PressableScale onPress={() => toast({ message: `${b.title}: ${b.hint}. Done!`, icon: b.icon, tone: 'info' })} accessibilityLabel={`${b.title}, earned`} style={[styles.badge, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
              <View style={[styles.badgeCoin, { backgroundColor: t.colors.reward }]}>
                <Icon name={b.icon} size={26} color={t.colors.onReward} weight="bold" />
              </View>
              <Text style={[t.type.caption1, { color: t.colors.label, textAlign: 'center', fontFamily: t.fonts.bold }]}>{b.title}</Text>
            </PressableScale>
          </Animated.View>
        ))}
        {upcoming.map((b) => (
          <View key={b.id} style={styles.badgeCell}>
            <PressableScale onPress={() => toast({ message: `${b.title}: ${b.hint} to earn it.`, icon: 'lock', tone: 'info' })} accessibilityLabel={`${b.title}, not earned yet. ${b.hint}.`} style={[styles.badge, { borderWidth: 1.5, borderColor: t.colors.fillStrong, borderStyle: 'dashed' }]}>
              <View style={[styles.badgeCoin, { backgroundColor: t.colors.fill }]}>
                <Icon name={b.icon} size={24} color={t.colors.tertiaryLabel} weight="bold" />
              </View>
              <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, textAlign: 'center', fontFamily: t.fonts.bold }]}>{b.title}</Text>
            </PressableScale>
          </View>
        ))}
      </View>
      <Button label={showAll ? 'Hide the other badges' : earned.length ? `See what else you can earn` : 'See all badges'} variant="plain" size="medium" onPress={() => setShowAll((v) => !v)} style={{ marginTop: 4 }} />
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
      <SectionHeader title="Daily goals" subtitle="Protein and calories from meals you cook" />
      {!isPro ? (
        <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
          <View style={styles.row}>
            <View style={[styles.badgeRowIcon, { backgroundColor: t.colors.rewardSoft }]}>
              <Icon name="crown" size={18} color={t.colors.rewardText} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[t.type.headline, { color: t.colors.label }]}>Daily protein and calories</Text>
              <Text style={[t.type.subhead, t.noWidows.style, { color: t.colors.secondaryLabel }]} {...t.noWidows.props}>
                {noWidow(today.length > 0 ? `Today so far: about ${eaten.protein} g protein and ${eaten.calories} kcal.` : 'Set a target and see each meal you cook count toward it.')}
              </Text>
            </View>
          </View>
          <Button label="Unlock goals with Pro" icon="crown" variant="tinted" size="medium" onPress={() => showPaywall('goals')} style={{ alignSelf: 'stretch' }} />
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
          <SectionHeader title="Cooking history" subtitle="Tap a meal to cook it again" />
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
          {history.length > 5 && <Button label={allHistory ? 'Show less' : `Show all ${history.length}`} variant="plain" size="medium" onPress={() => setAllHistory((v) => !v)} style={{ marginTop: -12 }} />}
        </>
      )}
    </TabScreen>
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
  bento: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  tile: { borderRadius: 24, padding: 16, gap: 4, justifyContent: 'flex-end', borderCurve: 'continuous' },
  tall: { flex: 1, minHeight: 200, justifyContent: 'space-between' },
  col: { flex: 1, gap: 12 },
  tileIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: fonts.serifBold, fontSize: 64, lineHeight: 68 },
  mid: { fontFamily: fonts.serifBold, fontSize: 36, lineHeight: 40 },
  weekTile: { borderRadius: 24, padding: 16, gap: 14, marginBottom: 16, borderCurve: 'continuous' },
  weekHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  stat: { flex: 1, borderRadius: 20, padding: 12, gap: 2, borderCurve: 'continuous' },
  card: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 16, borderCurve: 'continuous', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flame: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 4 },
  dayDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  medal: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  h: { marginTop: 16, marginBottom: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18, borderRadius: 28, marginBottom: 16, borderCurve: 'continuous' },
  levelNum: { fontFamily: fonts.serifBold, fontSize: 36, lineHeight: 40 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  badgeCell: { width: '33.33%', padding: 5 },
  badge: { alignItems: 'center', gap: 8, minHeight: 124, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 20, borderCurve: 'continuous' },
  badgeCoin: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 60 },
  badgeRowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  goal: { padding: 16, gap: 10 },
});
