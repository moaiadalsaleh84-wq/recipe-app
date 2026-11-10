/**
 * First-launch welcome quiz.
 *
 * Built on well-studied, honest persuasion principles:
 * - Endowed progress + goal gradient: the bar starts partly full and moves fast.
 * - Commitment & consistency: small, easy answers build momentum (single choices auto-advance).
 * - Personalization / self-reference: the cats react to answers, and answers are echoed back later.
 * - Recommendation + default effect: the buddy that fits your goals is preselected.
 * - Labor illusion: a short "building your plan" moment while the plan is really built.
 * - IKEA effect, reciprocity, peak-end rule: a celebrated, personal plan is handed over BEFORE any price.
 * Every answer is used for real (see data/onboarding.ts).
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatBuddy } from '../components/cats/CatBuddy';
import { CatSays } from '../components/cats/CatSays';
import { buddyInfo, type Line } from '../components/cats/dialogue';
import type { BuddyId } from '../components/cats/types';
import { Icon, type IconName } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { RecipeRow } from '../components/RecipeCard';
import { Button, CheckCircle, IconButton, Section, Separator } from '../components/ui';
import { dietTags, type DietTag } from '../data/mock';
import {
  frequencyOptions,
  goalOptions,
  goalPhrase,
  householdOptions,
  pickRecipes,
  recommendBuddy,
  struggleOptions,
  type Frequency,
  type Goal,
  type Struggle,
} from '../data/onboarding';
import { haptics } from '../lib/haptics';
import { weekDays } from '../lib/week';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

const STEPS = ['welcome', 'goals', 'frequency', 'struggles', 'diet', 'household', 'buddy', 'building', 'reveal'] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { profile, setProfile, setBuddy, allRecipes, plan, setMeal, completeOnboarding } = store;

  const [i, setI] = useState(0);
  const step: Step = STEPS[i];
  const [buddy, setPickedBuddy] = useState<BuddyId | null>(store.buddy);
  const [addToWeek, setAddToWeek] = useState(true);

  const recommended = recommendBuddy(profile);
  const chosenBuddy = buddy ?? recommended;
  const picks = useMemo(() => pickRecipes(profile, allRecipes), [profile, allRecipes]);

  const next = () => {
    haptics.select();
    setI((n) => Math.min(STEPS.length - 1, n + 1));
  };
  const back = () => setI((n) => Math.max(0, n - 1));

  // Endowed progress: start at 12%, reach 100% on the reveal.
  const progress = 0.12 + (0.88 * i) / (STEPS.length - 1);
  const barStyle = useAnimatedStyle(() => ({ width: withTiming(`${progress * 100}%`, { duration: 350 }) }), [progress]);

  const finish = () => {
    setBuddy(chosenBuddy);
    if (addToWeek) {
      // Put the picks on the next empty dinner slots, starting today.
      const today = weekDays.find((d) => d.isToday)?.index ?? 0;
      let k = 0;
      for (let d = today; d < 7 && k < picks.length; d++) {
        if (!plan[d]?.Dinner) setMeal(d, 'Dinner', picks[k++].id);
      }
    }
    completeOnboarding();
    haptics.success();
    router.replace({ pathname: '/paywall', params: { source: 'onboarding' } });
  };

  /* ---------- the narrator cat reacts to answers ---------- */
  const fitness = profile.goals.includes('muscle') || profile.goals.includes('healthier');
  const narrator: BuddyId = step === 'buddy' || step === 'building' || step === 'reveal' ? chosenBuddy : fitness ? 'tank' : 'biscuit';
  const line = narratorLine(step, narrator, profile, picks.length);

  // Multi-choice questions need at least one answer.
  const canContinue = step === 'goals' ? profile.goals.length > 0 : step === 'struggles' ? profile.struggles.length > 0 : true;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      {/* Header: back + progress */}
      {step !== 'welcome' && (
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          {step !== 'building' ? (
            <IconButton icon="back" accessibilityLabel="Previous question" onPress={back} color={t.colors.tint} />
          ) : (
            <View style={{ width: 44 }} />
          )}
          <View style={[styles.track, { backgroundColor: t.colors.fillStrong }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
            <Animated.View style={[styles.bar, { backgroundColor: t.colors.tintFill }, barStyle]} />
          </View>
          <View style={{ width: 44 }} />
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120, paddingTop: step === 'welcome' ? insets.top + 24 : 8 }]} keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={FadeInRight.duration(260)}>
          {step === 'welcome' && <Welcome />}

          {step !== 'welcome' && step !== 'building' && step !== 'reveal' && step !== 'buddy' && (
            <CatSays buddy={narrator} line={line} size={96} style={{ marginBottom: 16 }} />
          )}

          {step === 'goals' && (
            <Question title="What would make cooking better for you?" subtitle="Pick all that apply.">
              {goalOptions.map((o) => (
                <OptionCard
                  key={o.id}
                  label={o.label}
                  icon={o.icon}
                  multi
                  selected={profile.goals.includes(o.id)}
                  onPress={() => setProfile({ goals: toggle(profile.goals, o.id) as Goal[] })}
                />
              ))}
            </Question>
          )}

          {step === 'frequency' && (
            <Question title="How often do you cook at home now?" subtitle="There’s no wrong answer.">
              {frequencyOptions.map((o) => (
                <OptionCard
                  key={o.id}
                  label={o.label}
                  hint={o.hint}
                  selected={profile.frequency === o.id}
                  onPress={() => {
                    setProfile({ frequency: o.id as Frequency });
                    setTimeout(next, 280); // single choice: keep the momentum going
                  }}
                />
              ))}
            </Question>
          )}

          {step === 'struggles' && (
            <Question title="What usually gets in the way?" subtitle="Pick all that apply. We’ll tackle these first.">
              {struggleOptions.map((o) => (
                <OptionCard
                  key={o.id}
                  label={o.label}
                  icon={o.icon}
                  multi
                  selected={profile.struggles.includes(o.id)}
                  onPress={() => setProfile({ struggles: toggle(profile.struggles, o.id) as Struggle[] })}
                />
              ))}
            </Question>
          )}

          {step === 'diet' && (
            <Question title="Anything we should keep in mind?" subtitle="We’ll only suggest recipes that fit.">
              <OptionCard label="No preference" selected={profile.diets.length === 0} onPress={() => setProfile({ diets: [] })} multi />
              {dietTags
                .filter((d) => d !== 'One pan' && d !== 'Kid friendly')
                .map((d) => (
                  <OptionCard key={d} label={d} multi selected={profile.diets.includes(d)} onPress={() => setProfile({ diets: toggle(profile.diets, d) as DietTag[] })} />
                ))}
              <OptionCard label="Kid friendly" multi selected={profile.diets.includes('Kid friendly')} onPress={() => setProfile({ diets: toggle(profile.diets, 'Kid friendly') as DietTag[] })} />
            </Question>
          )}

          {step === 'household' && (
            <Question title="Who are you cooking for?" subtitle="Every recipe will open sized for you.">
              {householdOptions.map((o) => (
                <OptionCard
                  key={o.size}
                  label={o.label}
                  selected={profile.household === o.size}
                  onPress={() => {
                    setProfile({ household: o.size });
                    setTimeout(next, 280);
                  }}
                />
              ))}
            </Question>
          )}

          {step === 'buddy' && (
            <BuddyStep recommended={recommended} chosen={chosenBuddy} onChoose={(b) => setPickedBuddy(b)} />
          )}

          {step === 'building' && <Building buddy={chosenBuddy} household={profile.household} diets={profile.diets} goal={goalPhrase(profile)} quick={profile.struggles.includes('time')} onDone={next} />}

          {step === 'reveal' && (
            <View>
              <CatSays buddy={chosenBuddy} line={line} layout="column" size={150} />
              <Text style={[t.type.largeTitle, { color: t.colors.label, textAlign: 'center', marginTop: 8 }]} accessibilityRole="header">
                Your first week is ready
              </Text>
              <View style={styles.summary}>
                <SummaryChip icon="sparkles" text={`Goal: ${goalPhrase(profile)}`} />
                {profile.household ? <SummaryChip icon="people" text={`Cooking for ${profile.household}`} /> : null}
                {profile.diets.map((d) => (
                  <SummaryChip key={d} icon="check" text={d} />
                ))}
              </View>
              <Section title="Picked for you">
                {picks.map((r, k) => (
                  <View key={r.id}>
                    {k > 0 && <Separator inset={84} />}
                    <RecipeRow recipe={r} />
                  </View>
                ))}
              </Section>
              <PressableScale
                onPress={() => setAddToWeek((v) => !v)}
                haptic="select"
                accessibilityRole="checkbox"
                aria-checked={addToWeek}
                accessibilityLabel="Add these dinners to my week"
                style={[styles.addWeek, { backgroundColor: t.colors.cell, ...t.chunky.card }]}
              >
                <CheckCircle checked={addToWeek} color={t.colors.success} />
                <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Add these dinners to my week</Text>
              </PressableScale>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      {step !== 'building' && step !== 'frequency' && step !== 'household' && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: t.colors.background }]}>
          {step === 'welcome' ? (
            <>
              <Button label="Let’s get cooking" icon="paw" onPress={next} />
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 10 }]}>Takes about a minute</Text>
            </>
          ) : step === 'reveal' ? (
            <Button label="Continue" icon="arrowRight" onPress={finish} accessibilityLabel="Continue to the app" />
          ) : step === 'buddy' ? (
            <Button
              label={`Cook with ${buddyInfo[chosenBuddy].name}`}
              icon="paw"
              onPress={() => {
                setBuddy(chosenBuddy); // so the plan reveal already speaks with your buddy's voice
                next();
              }}
            />
          ) : (
            <Button label="Continue" icon="arrowRight" onPress={next} disabled={!canContinue} />
          )}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function narratorLine(step: Step, b: BuddyId, p: { goals: Goal[]; frequency: Frequency | null; struggles: Struggle[] }, picks: number): Line {
  const tank = b === 'tank';
  switch (step) {
    case 'goals':
      if (p.goals.includes('muscle')) return { text: 'Get in shape? Now we’re talking, champ.', mood: 'flex' };
      if (p.goals.includes('healthier')) return { text: 'Eating healthier. Good call. I’ll keep you honest.', mood: 'proud' };
      if (p.goals.length) return { text: 'Ooh, good one! I’m writing all of this down. With my paw.', mood: 'happy' };
      return { text: 'Hi! Quick question first: what would make your kitchen life better?', mood: 'wave' };
    case 'frequency':
      return tank ? { text: 'Be honest. We start where you are, not where you think you should be.', mood: 'think' } : { text: 'No judgment here. I burned toast this morning. Twice.', mood: 'oops' };
    case 'struggles':
      return tank ? { text: 'Every champ has obstacles. Name yours and we’ll knock them out.', mood: 'lift' } : { text: 'Mine is the fridge. I keep opening it and forgetting why.', mood: 'think' };
    case 'diet':
      return tank ? { text: 'Fuel matters. Tell me what works for your body.', mood: 'idle' } : { text: 'Tell me what you love. Or what you don’t. I love everything.', mood: 'eat' };
    case 'household':
      return tank ? { text: 'Feeding a team or flying solo? I’ll size every recipe.', mood: 'proud' } : { text: 'Is it a table for one, or a big family feast? Both are cozy!', mood: 'happy' };
    case 'reveal':
      return tank
        ? { text: `Done. ${picks} meals that fit your goals. Your job: cook them. My job: cheer.`, mood: 'celebrate' }
        : { text: `Ta-da! ${picks} recipes picked just for you. I only taste-tested a little.`, mood: 'celebrate' };
    default:
      return { text: '', mood: 'idle' };
  }
}

function Welcome() {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={styles.duo}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <CatBuddy buddy="tank" mood="wave" size={150} petable={false} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <CatBuddy buddy="biscuit" mood="happy" size={150} petable={false} />
        </Animated.View>
      </View>
      <Animated.Text entering={FadeIn.delay(350).duration(400)} style={[t.type.largeTitle, { color: t.colors.label, textAlign: 'center', marginTop: 8 }]} accessibilityRole="header">
        Cook more.{'\n'}Stress less.
      </Animated.Text>
      <Animated.Text entering={FadeIn.delay(500).duration(400)} style={[t.type.body, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 10, maxWidth: 320 }]}>
        Two cats, one kitchen, and a plan built around you. Answer a few quick questions and we’ll set up your first week.
      </Animated.Text>
      <Animated.View entering={FadeIn.delay(650).duration(400)} style={styles.perks}>
        {[
          ['calendar', 'A week of meals, planned'],
          ['cart', 'Grocery list sorted by aisle'],
          ['paw', 'A buddy who cheers you on'],
        ].map(([icon, text]) => (
          <View key={text} style={styles.perk}>
            <Icon name={icon as IconName} size={18} color={t.colors.tint} weight="bold" />
            <Text style={[t.type.subhead, { color: t.colors.label }]}>{text}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function Question({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View>
      <Text style={[t.type.title1, { color: t.colors.label }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginTop: 4, marginBottom: 16 }]}>{subtitle}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function OptionCard({ label, hint, icon, selected, onPress, multi }: { label: string; hint?: string; icon?: IconName; selected: boolean; onPress: () => void; multi?: boolean }) {
  const t = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      haptic="select"
      scaleTo={0.98}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      accessibilityLabel={label}
      style={[
        styles.option,
        { backgroundColor: selected ? t.colors.tintSoft : t.colors.cell, borderColor: selected ? t.colors.tintFill : t.colors.border },
        selected ? t.chunky.button() : t.chunky.lip,
      ]}
    >
      {icon && (
        <View style={[styles.optionIcon, { backgroundColor: selected ? t.colors.tintFill : t.colors.fill }]}>
          <Icon name={icon} size={18} color={selected ? t.colors.onTint : t.colors.tint} weight="bold" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[t.type.headline, { color: t.colors.label }]}>{label}</Text>
        {hint && <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 1 }]}>{hint}</Text>}
      </View>
      <CheckCircle checked={selected} color={t.colors.tintFill} />
    </PressableScale>
  );
}

function BuddyStep({ recommended, chosen, onChoose }: { recommended: BuddyId; chosen: BuddyId; onChoose: (b: BuddyId) => void }) {
  const t = useTheme();
  const intro: Record<BuddyId, Line> = {
    tank: { text: 'I’m Tank. I’ll help you eat well and get strong. No crash diets, no excuses. Deal?', mood: 'flex' },
    biscuit: { text: 'Hiii! I’m Biscuit, your chef! Great at cooking, only a little bit at dropping things.', mood: 'wave' },
  };
  return (
    <View>
      <Text style={[t.type.title1, { color: t.colors.label, textAlign: 'center' }]} accessibilityRole="header">
        Meet your kitchen buddy
      </Text>
      <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 4 }]}>Based on your answers. You can switch anytime.</Text>
      <View style={styles.cards}>
        {(['tank', 'biscuit'] as const).map((id) => {
          const info = buddyInfo[id];
          const selected = chosen === id;
          return (
            <PressableScale
              key={id}
              onPress={() => onChoose(id)}
              haptic="select"
              accessibilityRole="radio"
              aria-checked={selected}
              accessibilityLabel={`${info.title}${id === recommended ? ', best for your goals' : ''}`}
              style={[styles.buddyCard, { backgroundColor: t.colors.cell, borderColor: selected ? t.colors.tintFill : t.colors.border }, selected ? t.chunky.button() : t.chunky.lip]}
            >
              {id === recommended && (
                <View style={[styles.badge, { backgroundColor: t.colors.success }]}>
                  <Text style={[t.type.caption1, { color: '#fff', fontWeight: '800', fontFamily: t.fonts.rounded }]}>Best for your goals</Text>
                </View>
              )}
              <CatBuddy buddy={id} mood={selected ? (id === 'tank' ? 'flex' : 'happy') : 'idle'} size={120} petable={false} />
              <Text style={[t.type.title3, { color: t.colors.label }]}>{info.title}</Text>
              {info.traits.map((tr) => (
                <Text key={tr} style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center' }]}>
                  {tr}
                </Text>
              ))}
            </PressableScale>
          );
        })}
      </View>
      <Animated.View key={chosen} entering={FadeIn.duration(200)} style={{ marginTop: 18 }}>
        <CatSays buddy={chosen} line={intro[chosen]} layout="column" hideCat />
      </Animated.View>
    </View>
  );
}

/** A short, honest "working" moment: these steps really happen while it plays. */
function Building({ buddy, household, diets, goal, quick, onDone }: { buddy: BuddyId; household: number | null; diets: DietTag[]; goal: string; quick: boolean; onDone: () => void }) {
  const t = useTheme();
  const items = [
    `Matching recipes to “${goal}”`,
    diets.length ? `Leaving out anything not ${diets.join(', ').toLowerCase()}` : quick ? 'Favoring quick weeknight meals' : 'Mixing easy and fun recipes',
    household ? `Sizing recipes for ${household === 1 ? 'one' : household}` : 'Setting serving sizes',
    'Sorting your grocery list by aisle',
  ];
  const [done, setDone] = useState(0);
  const finished = useRef(false);
  useEffect(() => {
    const id = setInterval(() => setDone((n) => n + 1), 650);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (done > items.length && !finished.current) {
      finished.current = true;
      onDone();
    }
  }, [done, items.length, onDone]);
  return (
    <View style={{ alignItems: 'center', paddingTop: 20 }}>
      <CatBuddy buddy={buddy} mood="stir" size={190} petable={false} />
      <Text style={[t.type.title1, { color: t.colors.label, textAlign: 'center', marginTop: 8 }]} accessibilityRole="header">
        Building your plan…
      </Text>
      <View style={{ gap: 12, marginTop: 20, alignSelf: 'stretch' }} accessibilityLiveRegion="polite">
        {items.map((label, k) => (
          <View key={label} style={[styles.buildRow, { opacity: k < done ? 1 : 0.35 }]}>
            <CheckCircle checked={k < done} color={t.colors.success} />
            <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryChip({ icon, text }: { icon: IconName; text: string }) {
  const t = useTheme();
  return (
    <View style={[styles.summaryChip, { backgroundColor: t.colors.tintSoft, borderColor: t.colors.border }]}>
      <Icon name={icon} size={13} color={t.colors.tint} weight="bold" />
      <Text style={[t.type.footnote, { color: t.colors.tint, fontWeight: '700' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 8 },
  track: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
  content: { paddingHorizontal: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  duo: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  perks: { gap: 10, marginTop: 22, alignSelf: 'center' },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60, borderRadius: 18, borderWidth: 2, borderCurve: 'continuous' },
  optionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cards: { flexDirection: 'row', gap: 12, marginTop: 18 },
  buddyCard: { flex: 1, alignItems: 'center', gap: 3, padding: 10, paddingTop: 26, paddingBottom: 14, borderRadius: 24, borderWidth: 2.5, borderCurve: 'continuous' },
  badge: { position: 'absolute', top: -11, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, zIndex: 2 },
  buildRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 36 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12, marginBottom: 20 },
  summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5 },
  addWeek: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56, borderRadius: 18, borderCurve: 'continuous', marginTop: -8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12 },
});
