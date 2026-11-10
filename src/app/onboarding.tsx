/**
 * First-launch welcome quiz.
 *
 * Built on well-studied, honest persuasion principles:
 * - Endowed progress + goal gradient: the bar starts partly full; named sections make the length feel purposeful.
 * - Commitment & consistency: small, easy answers build momentum (single choices auto-advance),
 *   then a personal plan card the user commits to by holding a button (a deliberate commitment device).
 * - Personalization / self-reference: the cats use your name, react to answers, and echo your goal and "why" back.
 * - Recommendation + default effect: the buddy that fits your goals is preselected; the weekly target is suggested.
 * - Labor illusion: a short "building your plan" moment while the plan is really built.
 * - IKEA effect, reciprocity, peak-end rule: a celebrated plan and 4-week path are handed over BEFORE any price.
 * Every answer is used for real (see data/onboarding.ts).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
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
  achieveFor,
  achieveLabel,
  currentPerWeek,
  displayName,
  frequencyOptions,
  goalOptions,
  goalPhrase,
  householdOptions,
  pickRecipes,
  recommendBuddy,
  skillOptions,
  struggleOptions,
  suggestedTarget,
  timeOptions,
  whyLabel,
  whyOptions,
  type Achieve,
  type Frequency,
  type Goal,
  type Profile,
  type Skill,
  type Struggle,
  type Why,
} from '../data/onboarding';
import { haptics } from '../lib/haptics';
import { weekDays } from '../lib/week';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

const STEPS = [
  'welcome',
  'name',
  'goals',
  'achieve',
  'why',
  'frequency',
  'target',
  'struggles',
  'skill',
  'time',
  'diet',
  'household',
  'buddy',
  'commit',
  'building',
  'reveal',
] as const;
type Step = (typeof STEPS)[number];

/** Named sections make a longer quiz feel purposeful, not endless. */
const SECTION: Partial<Record<Step, string>> = {
  name: 'About you',
  goals: 'Your goals',
  achieve: 'Your goals',
  why: 'Your goals',
  frequency: 'Your habits',
  target: 'Your habits',
  struggles: 'Your habits',
  skill: 'Your kitchen',
  time: 'Your kitchen',
  diet: 'Your kitchen',
  household: 'Your kitchen',
  buddy: 'Your buddy',
  commit: 'Your plan',
  reveal: 'Your plan',
};

/** Single-choice and auto-advancing steps don't need a Continue button. */
const AUTO: Step[] = ['achieve', 'frequency', 'skill', 'time', 'household', 'building', 'commit'];

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
  /** Single choice: show the selection for a beat, then move on. */
  const pickThenNext = (p: Partial<Profile>) => {
    setProfile(p);
    setTimeout(next, 280);
  };

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
  const narrator: BuddyId = ['buddy', 'commit', 'building', 'reveal'].includes(step) ? chosenBuddy : fitness ? 'tank' : 'biscuit';
  const line = narratorLine(step, narrator, profile, picks.length);

  const canContinue = step === 'goals' ? profile.goals.length > 0 : step === 'struggles' ? profile.struggles.length > 0 : step === 'why' ? profile.why.length > 0 : true;
  const name = profile.name.trim();
  const section = SECTION[step];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      {/* Header: back + section + progress */}
      {step !== 'welcome' && (
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          {step !== 'building' ? (
            <IconButton icon="back" accessibilityLabel="Previous question" onPress={back} color={t.colors.tint} />
          ) : (
            <View style={{ width: 44 }} />
          )}
          <View style={{ flex: 1, gap: 6 }}>
            {section && (
              <Text style={[t.type.caption1, { color: t.colors.tint, fontWeight: '800', letterSpacing: 0.8, fontFamily: t.fonts.rounded, textAlign: 'center' }]} testID="ob-section">
                {section.toUpperCase()}
              </Text>
            )}
            <View style={[styles.track, { backgroundColor: t.colors.fillStrong }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
              <Animated.View style={[styles.bar, { backgroundColor: t.colors.tintFill }, barStyle]} />
            </View>
          </View>
          <View style={{ width: 44 }} />
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 130, paddingTop: step === 'welcome' ? insets.top + 24 : 8 }]} keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={FadeInRight.duration(260)}>
          {step === 'welcome' && <Welcome />}

          {!['welcome', 'building', 'reveal', 'buddy', 'commit'].includes(step) && <CatSays buddy={narrator} line={line} size={96} style={{ marginBottom: 16 }} />}

          {step === 'name' && (
            <Question title="First, what should we call you?" subtitle="Your buddy will cheer you on by name.">
              <TextInput
                value={profile.name}
                onChangeText={(v) => setProfile({ name: v })}
                placeholder="Your first name"
                placeholderTextColor={t.colors.tertiaryLabel}
                autoFocus
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                maxLength={24}
                onSubmitEditing={next}
                accessibilityLabel="Your first name"
                style={[styles.nameInput, { color: t.colors.label, backgroundColor: t.colors.cell, borderColor: name ? t.colors.tintFill : t.colors.border }]}
              />
            </Question>
          )}

          {step === 'goals' && (
            <Question title={name ? `${name}, what would make cooking better for you?` : 'What would make cooking better for you?'} subtitle="Pick all that apply.">
              {goalOptions.map((o) => (
                <OptionCard key={o.id} label={o.label} icon={o.icon} multi selected={profile.goals.includes(o.id)} onPress={() => setProfile({ goals: toggle(profile.goals, o.id) as Goal[] })} />
              ))}
            </Question>
          )}

          {step === 'achieve' && (
            <Question title="What do you most want to achieve in the next 4 weeks?" subtitle="Pick the one that matters most. One clear target beats five vague ones.">
              {achieveFor(profile.goals).map((o) => (
                <OptionCard key={o.id} label={o.label} hint={o.hint} icon={o.icon} selected={profile.achieve === o.id} onPress={() => pickThenNext({ achieve: o.id as Achieve })} />
              ))}
            </Question>
          )}

          {step === 'why' && (
            <Question title="Why does this matter to you?" subtitle="This is your reason on busy days. Pick all that ring true.">
              {whyOptions.map((o) => (
                <OptionCard key={o.id} label={o.label} icon={o.icon} multi selected={profile.why.includes(o.id)} onPress={() => setProfile({ why: toggle(profile.why, o.id) as Why[] })} />
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
                  onPress={() => pickThenNext({ frequency: o.id as Frequency, weeklyTarget: suggestedTarget(o.id as Frequency) })}
                />
              ))}
            </Question>
          )}

          {step === 'target' && <TargetStep value={profile.weeklyTarget} now={currentPerWeek(profile.frequency)} onChange={(n) => setProfile({ weeklyTarget: n })} />}

          {step === 'struggles' && (
            <Question title="What usually gets in the way?" subtitle="Pick all that apply. We’ll tackle these first.">
              {struggleOptions.map((o) => (
                <OptionCard key={o.id} label={o.label} icon={o.icon} multi selected={profile.struggles.includes(o.id)} onPress={() => setProfile({ struggles: toggle(profile.struggles, o.id) as Struggle[] })} />
              ))}
            </Question>
          )}

          {step === 'skill' && (
            <Question title="How comfortable are you in the kitchen?" subtitle="We’ll match recipes to your level.">
              {skillOptions.map((o) => (
                <OptionCard key={o.id} label={o.label} hint={o.hint} selected={profile.skill === o.id} onPress={() => pickThenNext({ skill: o.id as Skill })} />
              ))}
            </Question>
          )}

          {step === 'time' && (
            <Question title="How much time do you have for a weeknight meal?" subtitle="We’ll favor recipes that fit.">
              {timeOptions.map((o) => (
                <OptionCard key={o.label} label={o.label} hint={o.hint} icon="clock" selected={profile.maxMinutes === o.minutes} onPress={() => pickThenNext({ maxMinutes: o.minutes })} />
              ))}
            </Question>
          )}

          {step === 'diet' && (
            <Question title="Anything we should keep in mind?" subtitle="We’ll only suggest recipes that fit.">
              <OptionCard label="No preference" selected={profile.diets.length === 0} onPress={() => setProfile({ diets: [] })} multi />
              {dietTags
                .filter((d) => d !== 'One pan')
                .map((d) => (
                  <OptionCard key={d} label={d} multi selected={profile.diets.includes(d)} onPress={() => setProfile({ diets: toggle(profile.diets, d) as DietTag[] })} />
                ))}
            </Question>
          )}

          {step === 'household' && (
            <Question title="Who are you cooking for?" subtitle="Every recipe will open sized for you.">
              {householdOptions.map((o) => (
                <OptionCard key={o.size} label={o.label} selected={profile.household === o.size} onPress={() => pickThenNext({ household: o.size })} />
              ))}
            </Question>
          )}

          {step === 'buddy' && <BuddyStep recommended={recommended} chosen={chosenBuddy} onChoose={(b) => setPickedBuddy(b)} />}

          {step === 'commit' && <CommitStep profile={profile} buddy={chosenBuddy} onCommit={next} />}

          {step === 'building' && <Building buddy={chosenBuddy} profile={profile} onDone={next} />}

          {step === 'reveal' && (
            <View>
              <CatSays buddy={chosenBuddy} line={line} layout="column" size={150} />
              <Text style={[t.type.largeTitle, { color: t.colors.label, textAlign: 'center', marginTop: 8 }]} accessibilityRole="header">
                {name ? `${name}, your first week is ready` : 'Your first week is ready'}
              </Text>
              <View style={styles.summary}>
                <SummaryChip icon="check" text={`Goal: ${goalPhrase(profile)}`} />
                <SummaryChip icon="pot" text={`${profile.weeklyTarget} meals a week`} />
                {profile.household ? <SummaryChip icon="people" text={`Cooking for ${profile.household}`} /> : null}
                {profile.diets.map((d) => (
                  <SummaryChip key={d} icon="check" text={d} />
                ))}
              </View>
              <PathChart now={currentPerWeek(profile.frequency)} target={profile.weeklyTarget} />
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
      {!AUTO.includes(step) && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: t.colors.background }]}>
          {step === 'welcome' ? (
            <>
              <Button label="Let’s get cooking" icon="paw" onPress={next} />
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 10 }]}>About 2 minutes to a plan made for you</Text>
            </>
          ) : step === 'name' ? (
            <Button label={name ? `Nice to meet you, ${name}` : 'Skip for now'} icon="arrowRight" onPress={next} variant={name ? 'filled' : 'tinted'} accessibilityLabel={name ? 'Continue' : 'Skip name'} />
          ) : step === 'reveal' ? (
            <Button label="Continue" icon="arrowRight" onPress={finish} accessibilityLabel="Continue to the app" />
          ) : step === 'buddy' ? (
            <Button
              label={`Cook with ${buddyInfo[chosenBuddy].name}`}
              icon="paw"
              onPress={() => {
                setBuddy(chosenBuddy); // so the next screens speak with your buddy's voice
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

function narratorLine(step: Step, b: BuddyId, p: Profile, picks: number): Line {
  const tank = b === 'tank';
  const n = displayName(p, tank ? 'champ' : 'friend');
  const named = !!p.name.trim();
  switch (step) {
    case 'name':
      return { text: 'Hi! I’m Biscuit, and the big one is Tank. He’s shy. What’s your name?', mood: 'wave' };
    case 'goals':
      if (p.goals.includes('muscle')) return { text: `Get in shape? Now we’re talking, ${n}.`, mood: 'flex' };
      if (p.goals.includes('healthier')) return { text: `Eating healthier. Good call, ${n}. I’ll keep you honest.`, mood: 'proud' };
      if (p.goals.length) return { text: 'Ooh, good one! I’m writing all of this down. With my paw.', mood: 'happy' };
      return { text: named ? `Nice to meet you, ${n}! Now, what would make your kitchen life better?` : 'What would make your kitchen life better? Pick as many as you like.', mood: 'wave' };
    case 'achieve':
      return tank ? { text: 'Pick one target. We hit it, then we pick the next.', mood: 'think' } : { text: 'The big dream! Pick the one that makes your tail wag.', mood: 'happy' };
    case 'why':
      if (p.why.length) return tank ? { text: `That’s your fuel, ${n}. I’ll remind you of it on tough days.`, mood: 'proud' } : { text: 'Aww. I like you already.', mood: 'love' };
      return tank ? { text: 'Goals fade. Reasons don’t. Why does this matter?', mood: 'idle' } : { text: 'Everyone has a reason. Mine is snacks. What’s yours?', mood: 'eat' };
    case 'frequency':
      return tank ? { text: 'Be honest. We start where you are, not where you think you should be.', mood: 'think' } : { text: 'No judgment here. I burned toast this morning. Twice.', mood: 'oops' };
    case 'target':
      return tank
        ? { text: p.weeklyTarget >= 6 ? 'Ambitious. I like it. We’ll build up to it.' : `${p.weeklyTarget} a week? Good. Achievable beats heroic.`, mood: p.weeklyTarget >= 6 ? 'flex' : 'proud' }
        : { text: p.weeklyTarget >= 6 ? 'Wow, a kitchen champion! I’ll bring the spoons.' : `${p.weeklyTarget} cozy home-cooked meals a week? Perfect!`, mood: 'happy' };
    case 'struggles':
      return tank ? { text: 'Every champ has obstacles. Name yours and we’ll knock them out.', mood: 'lift' } : { text: 'Mine is the fridge. I keep opening it and forgetting why.', mood: 'think' };
    case 'skill':
      return tank ? { text: 'Every pro started as a beginner. No shame in any answer.', mood: 'idle' } : { text: 'I’m “confident”. My smoke alarm disagrees.', mood: 'oops' };
    case 'time':
      return tank ? { text: 'Time is the real ingredient. How much have you got?', mood: 'wait' } : { text: 'Quick meals or slow cozy ones? Both are delicious!', mood: 'stir' };
    case 'diet':
      return tank ? { text: 'Fuel matters. Tell me what works for your body.', mood: 'idle' } : { text: 'Tell me what you love. Or what you don’t. I love everything.', mood: 'eat' };
    case 'household':
      return tank ? { text: 'Feeding a team or flying solo? I’ll size every recipe.', mood: 'proud' } : { text: 'A table for one, or a big family feast? Both are cozy!', mood: 'happy' };
    case 'reveal':
      return tank
        ? { text: `Done, ${n}. ${picks} meals that fit your goals. Your job: cook them. My job: cheer.`, mood: 'celebrate' }
        : { text: `Ta-da, ${n}! ${picks} recipes picked just for you. I only taste-tested a little.`, mood: 'celebrate' };
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
        Two cats, one kitchen, and a plan built entirely around you. Tell us a little about yourself and we’ll set up your first week.
      </Animated.Text>
      <Animated.View entering={FadeIn.delay(650).duration(400)} style={styles.perks}>
        {[
          ['calendar', 'A week of meals, planned for you'],
          ['cart', 'Grocery list sorted by aisle'],
          ['chart', 'Goals you can actually track'],
          ['paw', 'A buddy who cheers you on by name'],
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

/** Big, friendly number picker for the weekly cooking target. */
function TargetStep({ value, now, onChange }: { value: number; now: number; onChange: (n: number) => void }) {
  const t = useTheme();
  const more = Math.max(0, Math.round(value - now));
  const set = (n: number) => {
    haptics.select();
    onChange(Math.max(1, Math.min(14, n)));
  };
  return (
    <Question title="How many home-cooked meals a week is your goal?" subtitle="Start small and build up. You can change it anytime.">
      <View style={[styles.target, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
        <PressableScale onPress={() => set(value - 1)} haptic={null} disabled={value <= 1} accessibilityLabel="Fewer meals a week" style={[styles.bigStep, { backgroundColor: t.colors.fill }]}>
          <Icon name="minus" size={26} color={t.colors.label} weight="bold" />
        </PressableScale>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Animated.Text key={value} entering={FadeIn.duration(160)} style={[styles.bigNumber, { color: t.colors.label, fontFamily: t.fonts.rounded }]} testID="target-value">
            {value}
          </Animated.Text>
          <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>meals a week</Text>
        </View>
        <PressableScale onPress={() => set(value + 1)} haptic={null} disabled={value >= 14} accessibilityLabel="More meals a week" style={[styles.bigStep, { backgroundColor: t.colors.fill }]}>
          <Icon name="plus" size={26} color={t.colors.label} weight="bold" />
        </PressableScale>
      </View>
      <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center' }]}>
        {more > 0 ? `About ${more} more than you cook now.` : 'Right where you are now. Consistency is a win.'}
      </Text>
    </Question>
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

/**
 * The personal plan, laid out like a membership card, plus a hold-to-commit button.
 * Holding (instead of tapping) makes the commitment a small, deliberate act.
 */
function CommitStep({ profile, buddy, onCommit }: { profile: Profile; buddy: BuddyId; onCommit: () => void }) {
  const t = useTheme();
  const name = profile.name.trim();
  const why = whyLabel(profile.why);
  const rows: [IconName, string, string][] = [
    ['check', 'Goal', achieveLabel(profile.achieve) ?? goalPhrase(profile)],
    ['heart', 'Because', why.length ? why.join(', ') : 'it matters to me'],
    ['pot', 'Target', `${profile.weeklyTarget} home-cooked meals a week`],
    ['clock', 'Weeknights', profile.maxMinutes ? `${profile.maxMinutes} minutes or less` : 'no rush'],
  ];
  if (profile.household) rows.push(['people', 'Cooking for', profile.household === 1 ? 'just me' : `${profile.household} people`]);
  if (profile.diets.length) rows.push(['fork', 'Diet', profile.diets.join(', ')]);

  return (
    <View>
      <Text style={[t.type.title1, { color: t.colors.label, textAlign: 'center' }]} accessibilityRole="header">
        {name ? `${name}’s cooking plan` : 'Your cooking plan'}
      </Text>
      <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 4, marginBottom: 16 }]}>Here’s everything you told us. Look right?</Text>
      <Animated.View entering={FadeInDown.duration(380)} style={[styles.planCard, t.chunky.button(t.colors.tintDeep)]}>
        <LinearGradient colors={[t.colors.tintFill, t.colors.tintDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.planTop}>
          <View style={{ flex: 1 }}>
            <Text style={[t.type.caption1, { color: 'rgba(255,255,255,0.8)', fontWeight: '800', letterSpacing: 1, fontFamily: t.fonts.rounded }]}>PERSONAL PLAN</Text>
            <Text style={[t.type.title2, { color: '#fff' }]}>{name || 'You'} × {buddyInfo[buddy].name}</Text>
          </View>
          <CatBuddy buddy={buddy} mood="proud" size={76} petable={false} />
        </View>
        {rows.map(([icon, label, value]) => (
          <View key={label} style={styles.planRow}>
            <Icon name={icon} size={15} color="rgba(255,255,255,0.9)" weight="bold" />
            <Text style={[t.type.footnote, { color: 'rgba(255,255,255,0.8)', width: 86 }]}>{label}</Text>
            <Text style={[t.type.subhead, { color: '#fff', fontWeight: '700', flex: 1 }]}>{value}</Text>
          </View>
        ))}
      </Animated.View>
      <Text style={[t.type.body, { color: t.colors.label, textAlign: 'center', marginTop: 22, fontStyle: 'italic' }]} testID="pledge">
        “I’ll cook {profile.weeklyTarget} meals a week to {goalPhrase(profile)}.”
      </Text>
      <HoldToCommit onDone={onCommit} />
      <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 8 }]}>Press and hold to commit</Text>
    </View>
  );
}

function HoldToCommit({ onDone }: { onDone: () => void }) {
  const t = useTheme();
  const fill = useSharedValue(0);
  const ticks = useRef<ReturnType<typeof setInterval>>(undefined);
  const done = useRef(false);
  const HOLD = 1300;
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  useEffect(() => () => clearInterval(ticks.current), []);

  const commit = () => {
    if (done.current) return;
    done.current = true;
    clearInterval(ticks.current);
    fill.set(withTiming(1, { duration: 120 }));
    haptics.success();
    setTimeout(onDone, 450);
  };

  return (
    <PressableScale
      haptic={null}
      scaleTo={0.97}
      delayLongPress={HOLD}
      onPressIn={() => {
        if (done.current) return;
        fill.set(withTiming(1, { duration: HOLD }));
        clearInterval(ticks.current);
        ticks.current = setInterval(() => haptics.select(), 220);
      }}
      onPressOut={() => {
        clearInterval(ticks.current);
        if (!done.current) fill.set(withDelay(0, withTiming(0, { duration: 220 })));
      }}
      onLongPress={commit}
      accessibilityLabel="Hold to commit to your plan"
      accessibilityHint="Press and hold. With VoiceOver, double tap."
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'activate' && commit()}
      style={[styles.hold, { backgroundColor: t.colors.fill, borderColor: t.colors.tintFill }, t.chunky.button()]}
    >
      <Animated.View style={[styles.holdFill, { backgroundColor: t.colors.tintFill }, fillStyle]} />
      <Icon name="paw" size={20} color={t.colors.label} weight="bold" />
      <Text style={[t.type.headline, { color: t.colors.label }]}>Hold to commit</Text>
    </PressableScale>
  );
}

/** A short, honest "working" moment: these steps really happen while it plays. */
function Building({ buddy, profile, onDone }: { buddy: BuddyId; profile: Profile; onDone: () => void }) {
  const t = useTheme();
  const items = [
    `Matching recipes to “${goalPhrase(profile)}”`,
    profile.diets.length ? `Leaving out anything not ${profile.diets.join(', ').toLowerCase()}` : 'Mixing easy and exciting recipes',
    profile.maxMinutes ? `Favoring meals under ${profile.maxMinutes} minutes` : 'Including some slow-cooked favorites',
    profile.skill === 'beginner' ? 'Starting with beginner-friendly steps' : 'Adding a few new techniques',
    profile.household ? `Sizing recipes for ${profile.household === 1 ? 'one' : profile.household}` : 'Setting serving sizes',
    `Spreading ${profile.weeklyTarget} meals across your week`,
  ];
  const [done, setDone] = useState(0);
  const finished = useRef(false);
  useEffect(() => {
    const id = setInterval(() => setDone((n) => n + 1), 550);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (done > items.length && !finished.current) {
      finished.current = true;
      onDone();
    }
  }, [done, items.length, onDone]);
  return (
    <View style={{ alignItems: 'center', paddingTop: 12 }}>
      <CatBuddy buddy={buddy} mood="stir" size={180} petable={false} />
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

/** The 4-week path from where they are to their own target. Honest: it shows their goal, not a promise. */
function PathChart({ now, target }: { now: number; target: number }) {
  const t = useTheme();
  const weeks = [1, 2, 3, 4].map((w) => Math.max(1, Math.round(now + ((target - now) * w) / 4)));
  const max = Math.max(target, ...weeks, 1);
  return (
    <View style={[styles.chart, { backgroundColor: t.colors.cell, ...t.chunky.card }]} accessible accessibilityLabel={`Your 4-week path: from about ${Math.round(now)} to ${target} home-cooked meals a week`}>
      <Text style={[t.type.headline, { color: t.colors.label }]}>Your 4-week path</Text>
      <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginBottom: 12 }]}>Home-cooked meals a week, building up to your target</Text>
      <View style={styles.bars}>
        {weeks.map((v, k) => (
          <View key={k} style={styles.barCol}>
            <Text style={[t.type.caption1, { color: t.colors.label, fontWeight: '700' }]}>{v}</Text>
            <Animated.View
              entering={FadeInDown.delay(150 + k * 120).duration(400)}
              style={[styles.barFill, { height: 18 + (v / max) * 90, backgroundColor: k === 3 ? t.colors.tintFill : t.colors.tintSoft, borderColor: t.colors.border }]}
            />
            <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>Week {k + 1}</Text>
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
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
  content: { paddingHorizontal: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  duo: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  perks: { gap: 10, marginTop: 22, alignSelf: 'center' },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameInput: { minHeight: 60, borderRadius: 18, borderWidth: 2.5, paddingHorizontal: 18, fontSize: 22, fontWeight: '700', borderCurve: 'continuous', outlineStyle: 'none' } as never,
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60, borderRadius: 18, borderWidth: 2, borderCurve: 'continuous' },
  optionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  target: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, borderCurve: 'continuous' },
  bigStep: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  bigNumber: { fontSize: 64, lineHeight: 72, fontWeight: '800', fontVariant: ['tabular-nums'] },
  cards: { flexDirection: 'row', gap: 12, marginTop: 18 },
  buddyCard: { flex: 1, alignItems: 'center', gap: 3, padding: 10, paddingTop: 26, paddingBottom: 14, borderRadius: 24, borderWidth: 2.5, borderCurve: 'continuous' },
  badge: { position: 'absolute', top: -11, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, zIndex: 2 },
  planCard: { borderRadius: 26, padding: 18, gap: 10, overflow: 'hidden', borderCurve: 'continuous' },
  planTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hold: { marginTop: 16, minHeight: 60, borderRadius: 999, borderWidth: 2.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden' },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.35 },
  buildRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 34 },
  chart: { borderRadius: 22, padding: 16, marginBottom: 20, borderCurve: 'continuous' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', minHeight: 140 },
  barCol: { alignItems: 'center', gap: 6, flex: 1 },
  barFill: { width: 34, borderRadius: 10, borderWidth: 1.5, borderCurve: 'continuous' },
  summary: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12, marginBottom: 20 },
  summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5 },
  addWeek: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56, borderRadius: 18, borderCurve: 'continuous', marginTop: -8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12 },
});
