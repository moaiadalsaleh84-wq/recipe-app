import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { RecipePhoto } from '../../../components/RecipeCard';
import { PopCard, PopChip, PopIconButton } from '../../../components/pop';
import { Image } from 'expo-image';
import { photoUri } from '../../../lib/photos';
import { useToast } from '../../../components/Toast';
import { Button, ProgressBar, Section, SectionHeader, Separator, Stepper } from '../../../components/ui';
import { Reveal } from '../../../components/Reveal';
import { showPaywall, useProGate } from '../../../lib/pro';
import { BADGES, levelFor, streakOf, xpFor } from '../../../lib/progress';
import { TabScreen } from '../../../components/TabScreen';
import { totalsFor, useStore } from '../../../state/store';
import { pop, popCycle, useTheme } from '../../../theme';

const dayKey = (d: Date) => d.toDateString();
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** You: your chef level and XP, the streak, badges, cooking history and settings. */
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
  const earned = BADGES.filter((b) => fun.badges.includes(b.id));
  const today = cooked.filter((c) => dayKey(new Date(c.date)) === dayKey(now));
  const eaten = totalsFor(
    today.map((c) => c.recipeId),
    getRecipe,
  );
  // Newest first. Five at a time unless you ask for everything.
  const history = useMemo(() => [...cooked].sort((a, b) => b.date.localeCompare(a.date)), [cooked]);

  // This week, Monday to Sunday: which days had a cooked meal.
  const cookedDays = new Set(cooked.map((c) => dayKey(new Date(c.date))));
  const todayIndex = (now.getDay() + 6) % 7;
  const week = DAYS.map((label, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - todayIndex + i);
    return { label, done: cookedDays.has(dayKey(d)), today: i === todayIndex, future: i > todayIndex };
  });

  // One row per dish, newest first: when you last made it and how it tasted.
  const dishes = useMemo(() => {
    const seen = new Set<string>();
    return history.filter((c) => (seen.has(c.recipeId) ? false : (seen.add(c.recipeId), true)));
  }, [history]);
  const shownDishes = allHistory ? dishes : dishes.slice(0, 5);
  const cookedToday = today.length > 0;
  // Three round badges: the ones you have first, then the next ones to earn.
  const badgeRow = [...earned, ...BADGES.filter((b) => !fun.badges.includes(b.id))].slice(0, 3);
  const firstName = profile.name.trim().split(/\s+/)[0] ?? '';

  const header = (
    <View style={styles.header}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: t.pop.berry }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={[t.type.title1, { color: t.pop.ink }]}>{(firstName[0] ?? '?').toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[t.type.largeTitle, { color: t.colors.label, fontSize: 30, lineHeight: 36 }]} numberOfLines={1} accessibilityRole="header">
            {firstName || 'You'}
          </Text>
          <Text style={[t.type.headline, { color: t.colors.secondaryLabel }]} testID="chef-level">
            Lv {lvl.level} · {lvl.title}
          </Text>
        </View>
        <PopIconButton icon="gear" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
      </View>
      {/* A chunky XP bar toward the next level */}
      <View style={{ gap: 6, marginTop: 16 }} accessible accessibilityLabel={`${xp} XP. ${lvl.next ? `${lvl.toNext} XP to ${lvl.next.title}` : 'Top level'}`}>
        <ProgressBar value={lvl.progress} color={t.pop.lilac} height={14} label="Level progress" />
        <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]} testID="xp-label">
          {lvl.next ? `${xp} XP · ${lvl.toNext} XP to ${lvl.next.title}` : `${xp} XP · Top level!`}
        </Text>
      </View>
    </View>
  );

  return (
    <TabScreen title="You" header={header}>
      {/* The streak: one big sunshine card with this week underneath */}
      <Reveal index={0}>
        <PopCard color={t.pop.sunshine} contentStyle={styles.streakCard} testID="streak-card">
          <View style={styles.row} accessible accessibilityLabel={`${streak} day streak. ${cookedToday ? 'You cooked today.' : `Cook tonight to make it ${streak + 1}.`}`}>
            <View style={[styles.flame, { backgroundColor: t.pop.white, borderColor: t.pop.ink }]}>
              <Icon name="flameFill" size={30} color={t.pop.tomato} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.title1, { color: t.pop.ink }]} testID="streak-count">
                {streak} day streak
              </Text>
              <Text style={[t.type.subhead, { color: t.pop.ink }]}>{cookedToday ? `You cooked today. Come back tomorrow for ${streak + 1}!` : `Cook tonight to make it ${streak + 1}!`}</Text>
            </View>
          </View>
          <View style={styles.week} accessibilityLabel={`This week: cooked on ${week.filter((d) => d.done).length} of 7 days`}>
            {week.map((d, i) => (
              <View key={i} style={styles.day}>
                <Animated.View
                  entering={ZoomIn.duration(240).delay(i * 40)}
                  style={[
                    styles.dayDot,
                    { borderColor: t.pop.ink, backgroundColor: d.done ? t.pop.tomato : t.pop.white },
                    d.today && !d.done && { borderStyle: 'dashed', backgroundColor: 'transparent' },
                  ]}
                >
                  {d.done && <Icon name="check" size={15} color={t.pop.ink} weight="bold" />}
                </Animated.View>
                <Text style={[t.type.caption1, { color: t.pop.ink, fontFamily: d.today ? t.fonts.black : t.fonts.bold }]}>{d.label}</Text>
              </View>
            ))}
          </View>
        </PopCard>
      </Reveal>

      {/* Badges: three round ones; locked ones show how close you are */}
      <SectionHeader
        title="Badges"
        subtitle={`${earned.length} of ${BADGES.length} earned`}
        right={<PopChip label={showAll ? 'Hide' : `See all ${BADGES.length}`} onPress={() => setShowAll((v) => !v)} accessibilityLabel={showAll ? 'Hide all badges' : `See all ${BADGES.length} badges`} />}
      />
      <View style={styles.badges}>
        {badgeRow.map((b, i) => {
          const got = fun.badges.includes(b.id);
          const [done, needed] = b.count(input);
          const tone = popCycle[i % popCycle.length];
          return (
            <PressableScale
              key={b.id}
              onPress={() => toast({ message: got ? `${b.title}: ${b.hint}. Done!` : `${b.title}: ${b.hint} to earn it.`, icon: got ? b.icon : 'lock', tone: 'info' })}
              accessibilityLabel={got ? `${b.title}, earned` : `${b.title}, not earned yet. ${Math.min(done, needed)} of ${needed}. ${b.hint}.`}
              style={styles.badgeCell}
            >
              <View
                style={[
                  styles.badgeCoin,
                  got ? { backgroundColor: tone.fill, borderColor: t.pop.ink, ...t.chunky.lip } : { backgroundColor: tone.tint, borderColor: t.pop.ink, borderStyle: 'dashed' },
                ]}
              >
                <Icon name={b.icon} size={30} color={t.pop.ink} weight="bold" />
                {!got && (
                  <View style={[styles.badgeTag, { backgroundColor: t.pop.ink }]}>
                    <Text style={[t.type.caption2, { color: t.pop.white, fontFamily: t.fonts.black }]}>
                      {Math.min(done, needed)}/{needed}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[t.type.caption1, { color: t.colors.label, textAlign: 'center' }]} numberOfLines={2}>
                {b.title}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      {showAll && (
        <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 16 }}>
          <Section>
            {BADGES.map((b, i) => {
              const got = fun.badges.includes(b.id);
              const [done, needed] = b.count(input);
              return (
                <View key={b.id}>
                  {i > 0 && <Separator inset={64} />}
                  <View style={styles.badgeRow} accessible accessibilityLabel={`${b.title}. ${b.hint}. ${got ? 'Earned' : `${Math.min(done, needed)} of ${needed}`}.`}>
                    <View style={[styles.badgeRowIcon, { backgroundColor: got ? t.pop.sunshine : t.pop.lilacTint, borderColor: t.pop.ink }]}>
                      <Icon name={got ? 'check' : b.icon} size={18} color={t.pop.ink} weight="bold" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.type.headline, { color: t.colors.label }]}>{b.title}</Text>
                      <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{b.hint}</Text>
                    </View>
                    {!got && needed > 1 && (
                      <Text style={[t.type.footnote, { color: t.colors.label, fontVariant: ['tabular-nums'] }]}>
                        {Math.min(done, needed)}/{needed}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </Section>
        </Animated.View>
      )}

      {/* Cooking history: one outlined row per dish */}
      <SectionHeader title="Cooking history" subtitle={dishes.length ? 'Your dishes, newest first' : undefined} />
      {dishes.length === 0 ? (
        <PopCard color={t.pop.lilacTint} contentStyle={styles.emptyHistory}>
          <Icon name="pot" size={26} color={t.pop.ink} weight="bold" />
          <Text style={[t.type.subhead, { color: t.colors.label, flex: 1 }]}>Cook any recipe in Cook Mode and it shows up here.</Text>
        </PopCard>
      ) : (
        <View style={{ gap: 12 }}>
          {shownDishes.map((c) => {
            const r = getRecipe(c.recipeId);
            if (!r) return null;
            const when = new Date(c.date);
            const day = dayKey(when) === dayKey(now) ? 'today' : when.toLocaleDateString('en-US', { weekday: 'long' });
            const old = now.getTime() - when.getTime() > 6 * 86400000;
            const said = c.rating === 'amazing' ? ' · loved it' : c.rating === 'yum' ? ' · yum' : c.rating === 'meh' ? ' · it was okay' : '';
            return (
              <PopCard key={c.recipeId} radius={20} depth={4} contentStyle={styles.historyRow}>
                <PressableScale onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} scaleTo={0.98} accessibilityLabel={`${r.title}, last cooked ${old ? when.toDateString() : day}${said}`} style={styles.historyMain}>
                  <View style={[styles.historyThumb, { borderColor: t.pop.ink, backgroundColor: t.colors.imagePlaceholder }]}>
                    {c.photo ? <Image source={{ uri: photoUri(c.photo) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <RecipePhoto recipe={r} iconSize={20} />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[t.type.title3, { color: t.colors.label, fontSize: 17, lineHeight: 21 }]} numberOfLines={2}>
                      {r.title}
                    </Text>
                    <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]} numberOfLines={1}>
                      Last cooked {old ? when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : day}
                      {said}
                    </Text>
                  </View>
                </PressableScale>
                <PopChip label="Again" icon="restart" color={t.pop.sunshine} onPress={() => router.push({ pathname: '/cook/[id]', params: { id: r.id } })} accessibilityLabel={`Cook ${r.title} again`} />
              </PopCard>
            );
          })}
          {dishes.length > 5 && <Button label={allHistory ? 'Show less' : `Show all ${dishes.length}`} variant="plain" size="medium" onPress={() => setAllHistory((v) => !v)} />}
        </View>
      )}

      {/* Pro goals: small, at the bottom */}
      <SectionHeader title="Daily goals" />
      {!isPro ? (
        <PopCard color={t.pop.skyTint} radius={20} depth={4} contentStyle={styles.goalsSmall}>
          <Icon name="crown" size={20} color={t.pop.ink} />
          <Text style={[t.type.subhead, { color: t.colors.label, flex: 1 }]}>
            {cookedToday ? `Today: about ${eaten.protein} g protein, ${eaten.calories} kcal.` : 'Protein and calorie goals for the meals you cook.'}
          </Text>
          <PopChip label="Pro" icon="lock" color={t.pop.white} onPress={() => showPaywall('goals')} accessibilityLabel="Unlock daily goals with Pro" />
        </PopCard>
      ) : (
        <Section footer="Meals you finish in Cook Mode count toward today, one serving each. Recipe nutrition is estimated.">
          <GoalRow label="Protein" unit="g" eaten={eaten.protein} goal={goals.protein} color={t.colors.protein}>
            <Stepper value={goals.protein} onChange={(v) => setGoals({ ...goals, protein: v })} min={40} max={300} step={5} label="protein goal" />
          </GoalRow>
          <Separator />
          <GoalRow label="Calories" unit="kcal" eaten={eaten.calories} goal={goals.calories} color={t.colors.carbs}>
            <Stepper value={goals.calories} onChange={(v) => setGoals({ ...goals, calories: v })} min={1000} max={5000} step={50} label="calorie goal" />
          </GoalRow>
        </Section>
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
  header: { marginBottom: 20 },
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: pop.ink, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  streakCard: { padding: 18, gap: 18 },
  flame: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 5 },
  dayDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  badgeCell: { flex: 1, alignItems: 'center', gap: 8, minHeight: 44 },
  badgeCoin: { width: 84, height: 84, borderRadius: 42, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  badgeTag: { position: 'absolute', bottom: -10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 60 },
  badgeRowIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  emptyHistory: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 12 },
  historyMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, minHeight: 76 },
  historyThumb: { width: 56, height: 56, borderRadius: 14, borderWidth: 2, overflow: 'hidden' },
  goalsSmall: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  goal: { padding: 16, gap: 10 },
});
