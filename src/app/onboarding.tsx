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
import { Mascot } from '../components/mascot/Mascot';
import { MascotSays } from '../components/mascot/MascotSays';
import type { Line } from '../components/mascot/lines';
import type { IconName } from '../components/Icon';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { Button, CheckCircle, IconButton } from '../components/ui';
import { dietTags, type DietTag } from '../data/mock';
import { displayName, goalOptions, householdOptions, type Profile } from '../data/onboarding';
import { haptics } from '../lib/haptics';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

const STEPS = ['name', 'goal', 'diet', 'household'] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, setProfile, completeOnboarding } = useStore();

  const [i, setI] = useState(0);
  const step: Step = STEPS[i];
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
    completeOnboarding();
    haptics.success();
    // Value before price: import one of your own recipes first. Skippable.
    router.replace({ pathname: '/import', params: { from: 'onboarding' } });
  };

  const progress = (i + 1) / STEPS.length;
  const barStyle = useAnimatedStyle(() => ({ width: withTiming(`${progress * 100}%`, { duration: 300 }) }), [progress]);

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
              <Animated.View entering={FadeInDown.delay(80).duration(380)} style={styles.duo}>
                <Mascot mood="wave" size={150} />
              </Animated.View>
              <Animated.Text entering={FadeIn.delay(280).duration(380)} style={[t.type.largeTitle, { color: t.colors.label, textAlign: 'center' }]} accessibilityRole="header">
                Every recipe you save, ready to cook.
              </Animated.Text>
              <Text style={[t.type.body, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 8, marginBottom: 24 }]}>
                Import recipes from TikTok, YouTube, Instagram and any website. Plan your week, shop by aisle, and cook with Biscuit by your side.
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

          {step !== 'name' && <MascotSays line={narratorLine(step, profile)} size={96} style={{ marginBottom: 16 }} />}

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
                <OptionCard key={o.size} label={o.label} selected={profile.household === o.size} onPress={() => setProfile({ household: o.size })} />
              ))}
            </Question>
          )}

        </Animated.View>
      </ScrollView>

      {step !== 'goal' && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: t.colors.background }]}>
          {step === 'name' ? (
            <Button label={name ? `Nice to meet you, ${name}` : 'Skip for now'} icon="arrowRight" onPress={next} variant={name ? 'filled' : 'tinted'} accessibilityLabel={name ? 'Continue' : 'Skip name'} />
          ) : step === 'household' ? (
            <Button label="Let’s get cooking" icon="arrowRight" onPress={finish} accessibilityLabel="Finish and start" />
          ) : (
            <Button label="Continue" icon="arrowRight" onPress={next} />
          )}
        </View>
      )}
    </View>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Biscuit reacts to the answers so far. */
function narratorLine(step: Step, p: Profile): Line {
  const n = displayName(p, 'friend');
  switch (step) {
    case 'goal':
      return p.name.trim() ? { text: `Nice to meet you, ${n}!`, mood: 'wave' } : { text: 'Hi! I’m Biscuit.', mood: 'wave' };
    case 'diet':
      return p.diets.length ? { text: 'Got it! No sneaky surprises.', mood: 'proud' } : { text: 'Tell me what you love!', mood: 'excited' };
    case 'household':
      return (p.household ?? 0) >= 3 ? { text: 'A full table! My favorite kind.', mood: 'celebrating' } : { text: 'One plate or a feast?', mood: 'happy' };
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 8 },
  track: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
  count: { width: 44, textAlign: 'center', fontVariant: ['tabular-nums'] },
  content: { paddingHorizontal: 16, paddingTop: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
  duo: { alignItems: 'center', marginBottom: 4 },
  nameInput: { minHeight: 60, borderRadius: 18, borderWidth: 2.5, paddingHorizontal: 18, fontSize: 22, fontWeight: '700', borderCurve: 'continuous', outlineStyle: 'none' } as never,
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60, borderRadius: 18, borderWidth: 2, borderCurve: 'continuous' },
  optionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12 },
});
