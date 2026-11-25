import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { enter } from '../../../motion';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { Lift, PopButton, PopCard, PopChip, PopIconButton } from '../../../components/pop';
import { useTonightPick } from '../../../lib/tonightPick';
import { stickers } from '../../../data/stickers';
import { nb } from '../../../lib/text';
import { weekDotSize } from '../../../lib/weekDots';
import { useToast } from '../../../components/Toast';
import { AnimatedNumber, Button, ProgressBar, Section, SectionHeader, Separator, Stepper, TextButton } from '../../../components/ui';
import { Reveal } from '../../../components/Reveal';
import { showPaywall, useProGate } from '../../../lib/pro';
import { BADGES, levelFor, streakOf, xpFor } from '../../../lib/progress';
import { TabScreen } from '../../../components/TabScreen';
import { totalsFor, useStore } from '../../../state/store';
import { fonts, pop, popCycle, useTheme } from '../../../theme';
import { PhotoFrame } from '../../../components/PhotoFrame';

const dayKey = (d: Date) => d.toDateString();
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** You: your chef level and XP, the streak, badges, cooking history and settings. */
export default function ProgressScreen() {
  const reduceMotion = useReducedMotion();
  const t = useTheme();
  const toast = useToast();
  const { cooked, getRecipe, goals, setGoals, customRecipes, plan, favorites, fun, profile } = useStore();
  const { tonight } = useTonightPick();
  const { isPro } = useProGate();
  const [showAll, setShowAll] = useState(false);
  const [allStickers, setAllStickers] = useState(false);
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
    return { label, done: cookedDays.has(dayKey(d)), today: i === todayIndex, past: i < todayIndex };
  });

  // Week circles: 32pt, shrinking only if 7 of them plus 8pt gaps wouldn't fit.
  const [weekW, setWeekW] = useState(0);
  const dot = weekW ? weekDotSize(weekW) : 32;
  const streakLine = today.length > 0
    ? streak <= 1
      ? 'Day one, done. The pan’s warming\u00A0up.'
      : 'Back again! Your streak is\u00A0sizzling.'
    : streak > 0
      ? 'Cook anything today to keep it\u00A0going.'
      : 'Fresh start today. Every chef takes a day\u00A0off.';

  // "Your kitchen" numbers and the photo gallery.
  const minutesCooked = history.reduce((n, c) => n + (getRecipe(c.recipeId)?.minutes ?? 0), 0);
  const favorite = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of history) counts.set(c.recipeId, (counts.get(c.recipeId) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? getRecipe(top[0]) : undefined;
  }, [history, getRecipe]);
  const myPhotos = history.filter((c) => !!c.photo);

  // One row per dish, newest first: when you last made it and how it tasted.
  const dishes = useMemo(() => {
    const seen = new Set<string>();
    return history.filter((c) => (seen.has(c.recipeId) ? false : (seen.add(c.recipeId), true)));
  }, [history]);
  const shownDishes = allHistory ? dishes : dishes.slice(0, 5);
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
          <Text style={[t.type.largeTitle, { color: t.colors.label, fontSize: 30, lineHeight: 36 }]} accessibilityRole="header">
            {firstName || 'You'}
          </Text>
          <Text style={[styles.level, { color: t.colors.secondaryLabel }]} testID="chef-level">
            {`Lv\u00A0${lvl.level}\u00A0· ${lvl.title.replace(' ', '\u00A0')}`}
          </Text>
        </View>
        <PopIconButton icon="gear" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
      </View>
      {/* A chunky XP bar toward the next level */}
      <View style={{ gap: 6, marginTop: 16 }} accessible accessibilityLabel={`${xp} XP. ${lvl.next ? `${lvl.toNext} XP to ${lvl.next.title}` : 'Top level'}`}>
        <ProgressBar value={lvl.progress} color={t.pop.lilac} height={14} label="Level progress" />
        <View style={{ flexDirection: 'row', alignItems: 'center' }} testID="xp-label">
          <AnimatedNumber value={xp} suffix={'\u00A0XP'} style={[t.type.caption1, { color: t.colors.secondaryLabel }]} />
          <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, flexShrink: 1 }]} numberOfLines={1}>
            {lvl.next ? `\u00A0·\u00A0${nb(lvl.toNext, 'XP')} to ${lvl.next.title}` : '\u00A0·\u00A0Top level!'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <TabScreen title="You" header={header}>
      {/* The streak: one big sunshine card with this week underneath */}
      <Reveal index={0}>
        <PopCard color={t.pop.sunshine} contentStyle={styles.streakCard} testID="streak-card">
          <View style={styles.row} accessible accessibilityLabel={`${streak > 0 ? `${streak} day streak` : 'No streak yet'}. ${streakLine}`}>
            <View style={[styles.flame, { backgroundColor: t.pop.white, borderColor: t.pop.ink }]}>
              <Icon name="flameFill" size={30} color={t.pop.tomato} />
            </View>
            <View style={{ flex: 1 }}>
              {streak > 0 ? (
                <AnimatedNumber value={streak} suffix={'\u00A0day streak'} style={[t.type.title1, { color: t.pop.ink }]} testID="streak-count" />
              ) : (
                // Smaller than the streak number and never split: no word ends up alone on a line.
                <Text style={[t.type.title2, { color: t.pop.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} testID="streak-count">
                  {'No\u00A0streak\u00A0yet'}
                </Text>
              )}
              <Text style={[t.type.subhead, { color: t.pop.ink }]}>{streakLine}</Text>
            </View>
          </View>
          <View style={styles.week} onLayout={(e) => setWeekW(e.nativeEvent.layout.width)} accessibilityLabel={`This week: cooked on ${week.filter((d) => d.done).length} of 7 days`}>
            {week.map((d, i) => (
              <View key={i} style={styles.day}>
                <Animated.View
                  entering={enter(i, reduceMotion)}
                  style={[
                    styles.dayDot,
                    { width: dot, height: dot, borderRadius: dot / 2 },
                    // Solid colors only (no see-through): cooked = tomato with a check; missed = soft
                    // yellow; today, not cooked yet = dashed; still to come = white.
                    { borderColor: t.pop.ink, backgroundColor: d.done ? t.pop.tomato : d.past ? t.pop.sunshineTint : t.pop.white },
                    d.today && !d.done && { borderStyle: 'dashed', backgroundColor: t.pop.white },
                  ]}
                >
                  {d.done && <Icon name="check" size={14} color={t.pop.ink} weight="bold" />}
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
              <Lift radius={42} pressed={!got}>
              <View
                style={[
                  styles.badgeCoin,
                  got ? { backgroundColor: tone.fill, borderColor: t.pop.ink } : { backgroundColor: tone.tint, borderColor: t.pop.ink, borderStyle: 'dashed' },
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
              </Lift>
              {/* Two lines of room for every name, so the row stays level. */}
              <Text style={[t.type.caption1, styles.badgeName, { color: t.colors.label }]} numberOfLines={2}>
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

      {/* Your kitchen: what you've built up so far (only real numbers, nothing invented). */}
      {history.length > 0 && (
        <>
          <SectionHeader title="Your kitchen" />
          {/* Three equal columns: a big number (or the favorite's photo) above a one-line label. */}
          <PopCard color={t.pop.sunshineTint} contentStyle={styles.kitchen} testID="your-kitchen">
            <KitchenStat value={history.length} label={history.length === 1 ? 'meal cooked' : 'meals cooked'} />
            <KitchenStat value={minutesCooked} label="minutes" />
            {favorite && (
              <PressableScale onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: favorite.id } })} accessibilityLabel={`Your favorite: ${favorite.title}`} style={styles.kitchenCol}>
                <PhotoFrame recipe={favorite} radius={12} iconSize={16} square style={{ width: 40, height: 40 }} />
                <Text style={[t.type.caption1, { color: t.pop.ink }]} numberOfLines={1}>
                  Favorite
                </Text>
              </PressableScale>
            )}
          </PopCard>
        </>
      )}

      {/* My dishes: every plate you snapped, newest first. */}
      {myPhotos.length > 0 && (
        <>
          <SectionHeader title="My dishes" subtitle={nb(myPhotos.length, myPhotos.length === 1 ? 'photo' : 'photos')} />
          <View style={styles.gallery} testID="my-dishes">
            {myPhotos.slice(0, 9).map((c) => (
              <PressableScale key={c.date} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: c.recipeId } })} accessibilityLabel={`Your ${getRecipe(c.recipeId)?.title ?? 'dish'}`} style={styles.galleryItem}>
                <PhotoFrame uri={c.photo!} radius={14} style={StyleSheet.absoluteFill} />
              </PressableScale>
            ))}
          </View>
        </>
      )}

      {/* Sticker book: 12 to find, one sometimes turns up after cooking. Locked ones are silhouettes. */}
      <SectionHeader title="Sticker book" />
      {/* A compact row: the 4 nearest stickers (found ones first, then the next to find). "See all"
          opens the whole book. */}
      <PopCard contentStyle={allStickers ? styles.stickerBook : styles.stickerRow} testID="sticker-book">
        {(allStickers ? stickers : [...stickers].sort((a, b) => Number((fun.stickers ?? []).includes(b.id)) - Number((fun.stickers ?? []).includes(a.id))).slice(0, 4)).map((st) => {
          const got = (fun.stickers ?? []).includes(st.id);
          return (
            <View key={st.id} style={allStickers ? styles.stickerCell : styles.stickerSmall} accessible accessibilityLabel={got ? `${st.name} sticker` : 'Sticker not found yet'}>
              <View style={[styles.stickerDisc, !allStickers && styles.stickerDiscSmall, got ? { backgroundColor: t.pop[st.color], borderColor: t.pop.ink } : { backgroundColor: t.pop.lilacTint, borderColor: t.pop.lilac, borderStyle: 'dashed' }]}>
                <Icon name={st.icon} size={allStickers ? 22 : 18} color={got ? t.pop.ink : t.pop.lilac} weight="bold" />
              </View>
              {allStickers && (
                <Text style={[t.type.caption2, { color: got ? t.pop.ink : t.pop.inkMuted, textAlign: 'center' }]} numberOfLines={2}>
                  {got ? st.name : '?'}
                </Text>
              )}
            </View>
          );
        })}
        {!allStickers && (
          <TextButton
            label={`${(fun.stickers ?? []).length}\u00A0of\u00A0${stickers.length} · See\u00A0all`}
            onPress={() => setAllStickers(true)}
            accessibilityLabel={`${(fun.stickers ?? []).length} of ${stickers.length} stickers found. See all`}
            style={{ marginLeft: 'auto', paddingHorizontal: 4, flexShrink: 1 }}
            testID="stickers-see-all"
          />
        )}
      </PopCard>

      {/* Cooking history: one outlined row per dish */}
      <SectionHeader title="Cooking history" subtitle={dishes.length ? 'Your dishes, newest first' : undefined} />
      {dishes.length === 0 ? (
        // One card, with the obvious next step pre-picked: tonight's pick.
        <PopCard color={t.pop.lilacTint} contentStyle={[styles.emptyHistory, { flexDirection: 'column', alignItems: 'stretch' }]} testID="history-empty">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="pot" size={26} color={t.pop.ink} weight="bold" />
            <Text style={[t.type.subhead, { color: t.colors.label, flex: 1 }]}>Your first dish lands here. Pick something tasty!</Text>
          </View>
          {tonight && (
            <PopButton
              label="Cook tonight’s pick"
              icon="pot"
              size="small"
              onPress={() => router.push({ pathname: '/cook/[id]', params: { id: tonight.recipe.id } })}
              accessibilityHint={`Cooks ${tonight.recipe.title}`}
              testID="history-cook-pick"
            />
          )}
        </PopCard>
      ) : (
        <View style={{ gap: 12 }}>
          {shownDishes.map((c) => {
            const r = getRecipe(c.recipeId);
            if (!r) return null;
            const when = new Date(c.date);
            // Short: "Thu · loved it", "Today", "Nov 12 · yum".
            const old = now.getTime() - when.getTime() > 6 * 86400000;
            const day = dayKey(when) === dayKey(now) ? 'Today' : old ? when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : when.toLocaleDateString('en-US', { weekday: 'short' });
            const said = c.rating === 'amazing' ? ' · loved it' : c.rating === 'yum' ? ' · good' : c.rating === 'meh' ? ' · meh' : '';
            return (
              <PopCard key={c.recipeId} radius={20} depth={4} contentStyle={styles.historyRow}>
                <PressableScale onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} scaleTo={0.98} accessibilityLabel={`${r.title}, last cooked ${old ? when.toDateString() : day}${said}. Opens the recipe`} style={styles.historyMain}>
                  {c.photo ? <PhotoFrame uri={c.photo} radius={14} style={styles.historyThumb} /> : <PhotoFrame recipe={r} iconSize={20} radius={14} square style={styles.historyThumb} />}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[t.type.title3, { color: t.colors.label, fontSize: 17, lineHeight: 21 }]} numberOfLines={3}>
                      {r.title}
                    </Text>
                    <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>
                      {day}
                      {said}
                    </Text>
                  </View>
                </PressableScale>
                <PopIconButton icon="restart" color={t.pop.sunshine} onPress={() => router.push({ pathname: '/cook/[id]', params: { id: r.id } })} accessibilityLabel="Cook again" accessibilityHint={`Cooks ${r.title} again`} />
              </PopCard>
            );
          })}
          {dishes.length > 5 && <Button label={allHistory ? 'Show less' : `Show all ${dishes.length}`} variant="plain" size="medium" onPress={() => setAllHistory((v) => !v)} />}
        </View>
      )}

      {/* Pro goals: small, at the bottom */}
      <SectionHeader title="Daily goals" />
      {!isPro ? (
        <PopCard color={t.pop.skyTint} radius={20} contentStyle={styles.goalsSmall}>
          {/* Row 1: the crown and the text, using the full width. Row 2: the Pro button under the text. */}
          <View style={styles.goalsRow}>
            <View style={[styles.crown, { backgroundColor: t.pop.white, borderColor: t.pop.ink }]}>
              <Icon name="crown" size={20} color={t.pop.ink} />
            </View>
            <Text style={[styles.goalsText, { color: t.colors.label }]} numberOfLines={2}>
              Set protein &amp; calorie goals
            </Text>
          </View>
          <PopButton label="Pro" icon="lock" size="small" color={t.pop.white} onPress={() => showPaywall('goals')} accessibilityLabel="Unlock daily goals with Pro" style={styles.goalsBtn} />
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

function KitchenStat({ value, label }: { value: number; label: string }) {
  const t = useTheme();
  return (
    <View style={styles.kitchenCol}>
      <AnimatedNumber value={value} style={[styles.kitchenNum, { color: t.pop.ink }]} />
      <Text style={[t.type.caption1, { color: t.pop.ink, textAlign: 'center' }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function GoalRow({ label, unit, eaten, goal, color, children }: { label: string; unit: string; eaten: number; goal: number; color: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.goal}>
      {/* The goal stepper beside the name; "520 of 2,200 kcal" on its own full-width line, never cut. */}
      <View style={styles.row}>
        <Text style={[t.type.headline, { color: t.colors.label, flex: 1, minWidth: 0 }]}>{label}</Text>
        {children}
      </View>
      <AnimatedNumber value={eaten} suffix={` of ${nb(goal, unit)}`} style={[t.type.footnote, { color: t.colors.secondaryLabel }]} />
      <ProgressBar value={eaten / goal} color={color} height={10} label={`${label} today`} />
    </View>
  );
}

const styles = StyleSheet.create({
  kitchen: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, padding: 16 },
  kitchenCol: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 4 },
  kitchenNum: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 34 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  galleryItem: { width: '31.5%', aspectRatio: 1 },
  stickerBook: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, rowGap: 12 },
  stickerCell: { width: '25%', alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  stickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12 },
  stickerSmall: { alignItems: 'center' },
  stickerDiscSmall: { width: 40, height: 40, borderRadius: 20 },
  stickerDisc: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 20 },
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: pop.ink, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  streakCard: { padding: 18, gap: 18 },
  flame: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 5 },
  dayDot: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  level: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  badges: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  badgeCell: { flex: 1, alignItems: 'center', gap: 8, minHeight: 44 },
  badgeName: { textAlign: 'center', minHeight: 34 },
  badgeCoin: { width: 84, height: 84, borderRadius: 42, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  badgeTag: { position: 'absolute', bottom: -10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 60 },
  badgeRowIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  emptyHistory: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 12 },
  historyMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, minHeight: 76 },
  historyThumb: { width: 56, height: 56 },
  goalsSmall: { padding: 16, gap: 10 },
  goalsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalsBtn: { alignSelf: 'flex-start', marginLeft: 56 },
  crown: { width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  goalsText: { flex: 1, fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  goal: { padding: 16, gap: 10 },
});
