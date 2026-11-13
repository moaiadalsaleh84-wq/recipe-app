/**
 * First launch: five quick screens, then the user imports their first recipe, then the paywall.
 *
 * Kept short on purpose. Value comes before the price: the user sees the app turn one of their
 * own saved recipes into something cookable before Pro is mentioned. Every step can be skipped
 * or answered in one tap, and every answer is used (see data/onboarding.ts).
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatBuddy } from '../components/cats/CatBuddy';
import { CatSays } from '../components/cats/CatSays';
import { buddyInfo, type Line } from '../components/cats/dialogue';
import type { BuddyId } from '../components/cats/types';
import type { IconName } from '../components/Icon';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { Button, CheckCircle, IconButton } from '../components/ui';
import { dietTags, type DietTag } from '../data/mock';
import { displayName, goalOptions, householdOptions, recommendBuddy, type Profile } from '../data/onboarding';
import { haptics } from '../lib/haptics';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

const STEPS = ['name', 'goal', 'diet', 'household', 'buddy'] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { profile, setProfile, setBuddy, completeOnboarding } = store;

  const [i, setI] = useState(0);
  const step: Step = STEPS[i];
  const [picked, setPicked] = useState<BuddyId | null>(store.buddy);
  const recommended = recommendBuddy(profile);
  const chosen = picked ?? recommended;
  const name = profile.name.trim();

  const next = () => {
    haptics.select();
    setI((n) => Math.min(STEPS.length - 1, n + 1));
  };
  const back = () => setI((n) => Math.max(0, n - 1));
  /** Single choice: show the selection for a beat, then move on. */
  const pickThenNext = (p: Partial<Profile>) => {
    setProfile(p);
    setTimeout(next, 260);
  };

  const finish = () => {
    setBuddy(chosen);
    completeOnboarding();
    haptics.success();
    // Value before price: import one of your own recipes first. Skippable.
    router.replace({ pathname: '/import', params: { from: 'onboarding' } });
  };

  const progress = (i + 1) / STEPS.length;
  const barStyle = useAnimatedStyle(() => ({ width: withTiming(`${progress * 100}%`, { duration: 300 }) }), [progress]);
  const narrator: BuddyId = step === 'buddy' ? chosen : profile.goals.includes('muscle') || profile.goals.includes('healthier') ? 'tank' : 'biscuit';

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        {i > 0 ? <IconButton icon="back" accessibilityLabel="Previous question" onPress={back} color={t.colors.tint} /> : <View style={{ width: 44 }} />}
        <View
          style={[styles.track, { backgroundColor: t.colors.fillStrong }]}
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${i + 1} of ${STEPS.length}`}
          accessibilityValue={{ min: 1, max: STEPS.length, now: i + 1 }}
        >
          <Animated.View style={[styles.bar, { backgroundColor: t.colors.tintFill }, barStyle]} />
        </View>
        <Text style={[t.type.footnote, styles.count, { color: t.colors.secondaryLabel }]} testID="ob-step">
          {i + 1}/{STEPS.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 130 }]} keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={FadeInRight.duration(240)}>
          {step === 'name' && (
            <View>
              <View style={styles.duo}>
                <Animated.View entering={FadeInDown.delay(80).duration(380)}>
                  <CatBuddy buddy="tank" mood="wave" size={128} petable={false} />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(200).duration(380)}>
                  <CatBuddy buddy="biscuit" mood="happy" size={128} petable={false} />
                </Animated.View>
              </View>
              <Animated.Text entering={FadeIn.delay(280).duration(380)} style={[t.type.largeTitle, { color: t.colors.label, textAlign: 'center' }]} accessibilityRole="header">
                Every recipe you save, ready to cook.
              </Animated.Text>
              <Text style={[t.type.body, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 8, marginBottom: 24 }]}>
                Import recipes from TikTok, YouTube, Instagram and any website. Plan your week, shop by aisle, and cook with a buddy.
              </Text>
              <Text style={[t.type.headline, { color: t.colors.label, marginBottom: 8 }]}>What should we call you?</Text>
              <TextInput
                value={profile.name}
                onChangeText={(v) => setProfile({ name: v })}
                placeholder="Your first name"
                placeholderTextColor={t.colors.tertiaryLabel}
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                maxLength={24}
                onSubmitEditing={next}
                accessibilityLabel="Your first name"
                style={[styles.nameInput, { color: t.colors.label, backgroundColor: t.colors.cell, borderColor: name ? t.colors.tintFill : t.colors.border }]}
              />
            </View>
          )}

          {step !== 'name' && step !== 'buddy' && <CatSays buddy={narrator} line={narratorLine(step, narrator, profile)} size={92} style={{ marginBottom: 16 }} />}

          {step === 'goal' && (
            <Question title={name ? `What’s your main goal, ${name}?` : 'What’s your main goal?'} subtitle="Pick one. You can change it later.">
              {goalOptions.map((o) => (
                <OptionCard key={o.id} label={o.label} icon={o.icon} selected={profile.goals[0] === o.id} onPress={() => pickThenNext({ goals: [o.id] })} />
              ))}
            </Question>
          )}

          {step === 'diet' && (
            <Question title="Anything we should keep in mind?" subtitle="Suggestions will only include recipes that fit.">
              <OptionCard label="No preference" selected={profile.diets.length === 0} onPress={() => setProfile({ diets: [] })} multi />
              {dietTags
                .filter((d) => d !== 'One pan')
                .map((d) => (
                  <OptionCard key={d} label={d} multi selected={profile.diets.includes(d)} onPress={() => setProfile({ diets: toggle(profile.diets, d) as DietTag[] })} />
                ))}
            </Question>
          )}

          {step === 'household' && (
            <Question title="How many are you cooking for?" subtitle="Recipes will open sized for you.">
              {householdOptions.map((o) => (
                <OptionCard key={o.size} label={o.label} selected={profile.household === o.size} onPress={() => pickThenNext({ household: o.size })} />
              ))}
            </Question>
          )}

          {step === 'buddy' && <BuddyStep recommended={recommended} chosen={chosen} onChoose={setPicked} />}
        </Animated.View>
      </ScrollView>

      {step !== 'goal' && step !== 'household' && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: t.colors.background }]}>
          {step === 'name' ? (
            <Button label={name ? `Nice to meet you, ${name}` : 'Skip for now'} icon="arrowRight" onPress={next} variant={name ? 'filled' : 'tinted'} accessibilityLabel={name ? 'Continue' : 'Skip name'} />
          ) : step === 'buddy' ? (
            <Button label={`Cook with ${buddyInfo[chosen].name}`} icon="paw" onPress={finish} />
          ) : (
            <Button label="Continue" icon="arrowRight" onPress={next} />
          )}
        </View>
      )}
    </View>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function narratorLine(step: Step, b: BuddyId, p: Profile): Line {
  const tank = b === 'tank';
  const n = displayName(p, tank ? 'champ' : 'friend');
  switch (step) {
    case 'goal':
      return p.name.trim() ? { text: `Nice to meet you, ${n}! What are we cooking for?`, mood: 'wave' } : { text: 'Hi! I’m Biscuit, and the big one is Tank. What are we cooking for?', mood: 'wave' };
    case 'diet':
      return tank ? { text: 'Fuel matters. Tell me what works for your body.', mood: 'nod' } : { text: 'Tell me what you love. Or what you don’t. I love everything.', mood: 'eat' };
    case 'household':
      return tank ? { text: 'Feeding a team or flying solo? I’ll size every recipe.', mood: 'proud' } : { text: 'A table for one, or a big family feast? Both are cozy!', mood: 'happy' };
    default:
      return { text: '', mood: 'idle' };
  }
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

function OptionCard({ label, icon, selected, onPress, multi }: { label: string; icon?: IconName; selected: boolean; onPress: () => void; multi?: boolean }) {
  const t = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      haptic="select"
      scaleTo={0.98}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      accessibilityLabel={label}
      style={[styles.option, { backgroundColor: selected ? t.colors.tintSoft : t.colors.cell, borderColor: selected ? t.colors.tintFill : t.colors.border }, selected ? t.chunky.button() : t.chunky.lip]}
    >
      {icon && (
        <View style={[styles.optionIcon, { backgroundColor: selected ? t.colors.tintFill : t.colors.fill }]}>
          <Icon name={icon} size={18} color={selected ? t.colors.onTint : t.colors.tint} weight="bold" />
        </View>
      )}
      <Text style={[t.type.headline, { color: t.colors.label, flex: 1 }]}>{label}</Text>
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
        Pick your kitchen buddy
      </Text>
      <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 4 }]}>You can switch anytime.</Text>
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
              accessibilityLabel={`${info.title}${id === recommended ? ', best for your goal' : ''}`}
              style={[styles.buddyCard, { backgroundColor: t.colors.cell, borderColor: selected ? t.colors.tintFill : t.colors.border }, selected ? t.chunky.button() : t.chunky.lip]}
            >
              {id === recommended && (
                <View style={[styles.badge, { backgroundColor: t.colors.success }]}>
                  <Text style={[t.type.caption1, { color: '#fff', fontWeight: '800', fontFamily: t.fonts.rounded }]}>Fits your goal</Text>
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 8 },
  track: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
  count: { width: 44, textAlign: 'center', fontVariant: ['tabular-nums'] },
  content: { paddingHorizontal: 16, paddingTop: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
  duo: { flexDirection: 'row', justifyContent: 'center' },
  nameInput: { minHeight: 60, borderRadius: 18, borderWidth: 2.5, paddingHorizontal: 18, fontSize: 22, fontWeight: '700', borderCurve: 'continuous', outlineStyle: 'none' } as never,
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60, borderRadius: 18, borderWidth: 2, borderCurve: 'continuous' },
  optionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cards: { flexDirection: 'row', gap: 12, marginTop: 18 },
  buddyCard: { flex: 1, alignItems: 'center', gap: 3, padding: 10, paddingTop: 26, paddingBottom: 14, borderRadius: 24, borderWidth: 2.5, borderCurve: 'continuous' },
  badge: { position: 'absolute', top: -11, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, zIndex: 2 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12 },
});
