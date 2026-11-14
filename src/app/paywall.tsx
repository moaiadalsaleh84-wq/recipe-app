/**
 * Pro paywall. Persuasive, never deceptive.
 *
 * Uses: context-matched headline (why it opened), benefits ordered by the user's own goals,
 * the buddy they bonded with, a preselected yearly plan with truthful per-week anchoring and
 * savings computed from real prices, a transparent trial timeline with a reminder (risk reversal),
 * only two choices (Hick's law), and a celebratory success moment (peak-end rule).
 *
 * Deliberately NOT used (App Store guideline 3.1.2, EU consumer law, and they backfire):
 * fake timers or scarcity, invented reviews or user counts, guilt-tripping copy,
 * hidden or delayed close buttons, hidden prices or renewal terms.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatBuddy } from '../components/cats/CatBuddy';
import { CatSays } from '../components/cats/CatSays';
import type { Line } from '../components/cats/dialogue';
import { Icon, type IconName } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { useToast } from '../components/Toast';
import { Button, IconButton } from '../components/ui';
import { benefitsFor, goalPhrase } from '../data/onboarding';
import { haptics } from '../lib/haptics';
import type { PaywallSource } from '../lib/pro';
import {
  MANAGE_SUBSCRIPTIONS_URL,
  PLANS,
  PURCHASES_ARE_MOCK,
  PurchaseCancelled,
  TERMS_URL,
  money,
  perWeek,
  purchase,
  restore,
  yearlySavingsPct,
  type PlanId,
} from '../lib/purchases';
import { FREE_LIMITS, useBuddy, useStore } from '../state/store';
import { useTheme } from '../theme';

type Source = PaywallSource;

export default function Paywall() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const buddy = useBuddy();
  const { source = 'settings' } = useLocalSearchParams<{ source?: Source }>();
  const { profile, pro, setPro } = useStore();

  const [plan, setPlan] = useState<PlanId>('yearly'); // default effect: the best value is preselected
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [welcome, setWelcome] = useState(false);

  const close = () => {
    if (source === 'onboarding' || !router.canGoBack()) router.replace('/');
    else router.back();
  };

  const yearly = PLANS.yearly;
  const monthly = PLANS.monthly;
  const selected = PLANS[plan];
  const trial = selected.trialDays;

  const copy = headline(source, goalPhrase(profile), profile.name.trim().split(/\s+/)[0] ?? '');
  const line = buddyLine(buddy, source, profile.name.trim().split(/\s+/)[0] ?? '');
  const benefits = benefitsFor(profile);

  const buy = async () => {
    setBusy('buy');
    try {
      const ent = await purchase(plan);
      setPro(ent);
      haptics.success();
      setWelcome(true);
    } catch (e) {
      if (!(e instanceof PurchaseCancelled)) toast({ message: 'The purchase didn’t go through. You weren’t charged.', tone: 'warning' });
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    setBusy('restore');
    let ent: Awaited<ReturnType<typeof restore>> = null;
    try {
      ent = await restore(pro);
    } catch {
      setBusy(null);
      toast({ message: 'Couldn’t reach the App Store. Check your connection.', tone: 'warning' });
      return;
    }
    setBusy(null);
    if (ent) {
      setPro(ent);
      toast({ message: 'Pro restored. Welcome back!', icon: 'crown' });
      close();
    } else {
      toast({ message: 'No previous purchase found on this account', tone: 'info' });
    }
  };

  const open = (url: string) => Linking.openURL(url).catch(() => toast({ message: 'Couldn’t open the link', tone: 'warning' }));

  if (welcome) return <Welcome onDone={close} trialEndsAt={pro?.trialEndsAt ?? null} />;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      {/* Always-visible, full-size close button and restore */}
      <View style={[styles.top, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="close" accessibilityLabel={source === 'onboarding' ? 'Close and continue with the free version' : 'Close'} onPress={close} color={t.colors.label} background={t.colors.fill} />
        <PressableScale onPress={onRestore} style={styles.restore} accessibilityLabel="Restore purchases" disabled={!!busy}>
          {busy === 'restore' ? <ActivityIndicator color={t.colors.tint} /> : <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '600' }]}>Restore</Text>}
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 210 }]}>
        <CatSays buddy={buddy} line={line} size={104} />

        <Animated.Text entering={FadeInDown.duration(320)} style={[t.type.largeTitle, { color: t.colors.label, marginTop: 14 }]} accessibilityRole="header">
          {copy.title}
        </Animated.Text>
        <Text style={[t.type.body, { color: t.colors.secondaryLabel, marginTop: 6 }]}>{copy.subtitle}</Text>

        {/* Benefits, most relevant first */}
        <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
          {benefits.map((b, k) => (
            <Animated.View key={b.title} entering={FadeInDown.delay(80 * k).duration(300)} style={styles.benefit}>
              <View style={[styles.benefitIcon, { backgroundColor: t.colors.tintSoft }]}>
                <Icon name={b.icon} size={18} color={t.colors.tint} weight="bold" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[t.type.headline, { color: t.colors.label }]}>{b.title}</Text>
                <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 1 }]}>{b.detail}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Two clear choices */}
        <View style={{ gap: 10, marginTop: 18 }} accessibilityRole="radiogroup" accessibilityLabel="Choose a plan">
          <PlanCard
            id="yearly"
            selected={plan === 'yearly'}
            onPress={() => setPlan('yearly')}
            title="Yearly"
            price={`${money(yearly.price)} / year`}
            note={`Just ${money(perWeek('yearly'))} a week${yearly.trialDays ? ` · ${yearly.trialDays} days free` : ''}`}
            badge={`Best value · Save ${yearlySavingsPct()}%`}
          />
          <PlanCard id="monthly" selected={plan === 'monthly'} onPress={() => setPlan('monthly')} title="Monthly" price={`${money(monthly.price)} / month`} note="Flexible, cancel anytime" />
        </View>

        {/* Transparent trial timeline: knowing exactly what happens builds trust */}
        {trial > 0 && (
          <Animated.View entering={FadeIn.duration(250)} style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
            <Text style={[t.type.headline, { color: t.colors.label, marginBottom: 10 }]}>How your free trial works</Text>
            <TimelineRow icon="crown" title="Today" detail="Everything unlocked. Cook, plan and track with no limits." first />
            <TimelineRow icon="notes" title={`Day ${Math.max(1, trial - 2)}`} detail="We’ll remind you in the app that your trial is ending." />
            <TimelineRow icon="calendar" title={`Day ${trial}`} detail={`Your subscription starts at ${money(selected.price)} per ${selected.period}. Cancel before then and you pay nothing.`} last />
          </Animated.View>
        )}

        <View style={styles.links}>
          <PressableScale onPress={() => open(TERMS_URL)} style={styles.link} accessibilityRole="link" accessibilityLabel="Terms of use">
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textDecorationLine: 'underline' }]}>Terms</Text>
          </PressableScale>
          <PressableScale onPress={() => router.push('/privacy')} style={styles.link} accessibilityRole="link" accessibilityLabel="Privacy policy">
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textDecorationLine: 'underline' }]}>Privacy</Text>
          </PressableScale>
          <PressableScale onPress={() => open(MANAGE_SUBSCRIPTIONS_URL)} style={styles.link} accessibilityRole="link" accessibilityLabel="Manage subscriptions">
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textDecorationLine: 'underline' }]}>Manage subscriptions</Text>
          </PressableScale>
        </View>
        {PURCHASES_ARE_MOCK && (
          <Text style={[t.type.caption1, { color: t.colors.tertiaryLabel, textAlign: 'center', marginTop: 4 }]} testID="test-mode">
            Test mode: no real payment is made.
          </Text>
        )}
      </ScrollView>

      {/* Sticky purchase area: price and renewal terms are always visible next to the button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: t.colors.background, borderTopColor: t.colors.separator }]}>
        <Button
          label={busy === 'buy' ? 'One moment…' : trial ? `Start My ${trial}-Day Free Trial` : `Subscribe for ${money(selected.price)}/${selected.period}`}
          onPress={buy}
          disabled={!!busy}
        />
        <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 8 }]} testID="price-terms">
          {trial
            ? `${trial} days free, then ${money(selected.price)} per ${selected.period}. Renews automatically. Cancel anytime in Settings at least 24 hours before the trial ends.`
            : `${money(selected.price)} per ${selected.period}. Renews automatically. Cancel anytime in Settings at least 24 hours before renewal.`}
        </Text>
        <PressableScale onPress={close} style={styles.free} accessibilityLabel={source === 'onboarding' ? 'Continue with the free version' : 'Not now'}>
          <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '600' }]}>{source === 'onboarding' ? 'Continue with the free version' : 'Not now'}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

function headline(source: Source, goal: string, name: string): { title: string; subtitle: string } {
  switch (source) {
    case 'onboarding':
      return {
        title: name ? `${name}, save every recipe you find` : 'Save every recipe you find',
        subtitle: `The free version includes ${FREE_LIMITS.imports} imports. Pro imports without limits and adds the tools to help you ${goal}.`,
      };
    case 'imports':
      return { title: 'Import without limits', subtitle: `You’ve used your ${FREE_LIMITS.imports} free imports. Pro imports as many recipes as you like from TikTok, YouTube, Instagram and any website.` };
    case 'pantry':
      return { title: 'Your whole pantry, working for you', subtitle: `The free pantry holds ${FREE_LIMITS.pantry} items. Pro has no limit, and shows which one item would let you cook the most recipes.` };
    case 'recipes':
      return { title: 'Keep every recipe you love', subtitle: `You’ve written ${FREE_LIMITS.customRecipes} recipes by hand, the free limit. Pro saves as many as you like.` };
    case 'cookbooks':
      return { title: 'Organize without limits', subtitle: `The free version holds ${FREE_LIMITS.cookbooks} cookbooks. Pro lets you make as many as you need.` };
    case 'goals':
      return { title: 'Hit your goals with Tank', subtitle: 'Set daily protein and calorie targets and see your progress from every meal you cook.' };
    default:
      return { title: 'Cook with everything unlocked', subtitle: 'Unlimited imports, pantry and cookbooks, plus nutrition goals.' };
  }
}

function buddyLine(buddy: string, source: Source, name: string): Line {
  const n = name || (buddy === 'tank' ? 'champ' : 'friend');
  if (buddy === 'tank') {
    if (source === 'goals') return { text: `Goals you can see are goals you hit. Let’s track them, ${n}.`, mood: 'flex' };
    if (source === 'imports') return { text: `Good taste, ${n}. That’s three already. Pro keeps the playbook growing.`, mood: 'proud' };
    return { text: `You did the warm-up, ${n}. Pro is the full workout. No pressure.`, mood: 'proud' };
  }
  if (source === 'recipes' || source === 'imports') return { text: 'Our recipe box is full! I tried to squeeze one more in. It didn’t fit.', mood: 'oops' };
  if (source === 'pantry') return { text: 'The pantry shelf is full! I’m guarding the snacks, just in case.', mood: 'eat' };
  return { text: 'Pro is like the big kitchen! All the recipes, all the cookbooks, all the fun.', mood: 'happy' };
}

function PlanCard({ id, selected, onPress, title, price, note, badge }: { id: PlanId; selected: boolean; onPress: () => void; title: string; price: string; note: string; badge?: string }) {
  const t = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      haptic="select"
      scaleTo={0.98}
      accessibilityRole="radio"
      aria-checked={selected}
      accessibilityLabel={`${title} plan, ${price}. ${note}`}
      testID={`plan-${id}`}
      style={[styles.plan, { backgroundColor: selected ? t.colors.tintSoft : t.colors.cell, borderColor: selected ? t.colors.tintFill : t.colors.border }, selected ? t.chunky.button() : t.chunky.lip]}
    >
      <View style={[styles.radio, { borderColor: selected ? t.colors.tintFill : t.colors.tertiaryLabel }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: t.colors.tintFill }]} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[t.type.headline, { color: t.colors.label }]}>{title}</Text>
        <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 1 }]}>{note}</Text>
      </View>
      <Text style={[t.type.headline, { color: t.colors.label }]}>{price}</Text>
      {badge && (
        <View style={[styles.planBadge, { backgroundColor: t.colors.success }]}>
          <Text style={[t.type.caption2, { color: '#fff', fontWeight: 'normal', fontFamily: t.fonts.rounded }]}>{badge}</Text>
        </View>
      )}
    </PressableScale>
  );
}

function TimelineRow({ icon, title, detail, first, last }: { icon: IconName; title: string; detail: string; first?: boolean; last?: boolean }) {
  const t = useTheme();
  return (
    <View style={styles.tlRow}>
      <View style={styles.tlRail}>
        {!first && <View style={[styles.tlLine, { backgroundColor: t.colors.tintSoft, top: 0, height: 10 }]} />}
        <View style={[styles.tlDot, { backgroundColor: first ? t.colors.tintFill : t.colors.tintSoft }]}>
          <Icon name={icon} size={14} color={first ? t.colors.onTint : t.colors.tint} weight="bold" />
        </View>
        {!last && <View style={[styles.tlLine, { backgroundColor: t.colors.tintSoft, top: 38, bottom: -4 }]} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 14 }}>
        <Text style={[t.type.subhead, { color: t.colors.label, fontWeight: '700' }]}>{title}</Text>
        <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 1 }]}>{detail}</Text>
      </View>
    </View>
  );
}

/** Peak-end: the purchase ends on a happy, celebrated moment. */
function Welcome({ onDone, trialEndsAt }: { onDone: () => void; trialEndsAt: string | null }) {
  const t = useTheme();
  const buddy = useBuddy();
  const insets = useSafeAreaInsets();
  const ends = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : null;
  return (
    <View style={[styles.welcome, { backgroundColor: t.colors.background, paddingTop: insets.top + 40, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <CatBuddy buddy={buddy} mood="celebrate" size={220} petable={false} />
        <Text style={[t.type.largeTitle, { color: t.colors.label, textAlign: 'center', marginTop: 12 }]} accessibilityRole="header">
          Welcome to Pro!
        </Text>
        <Text style={[t.type.body, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 8, maxWidth: 320 }]}>
          {ends ? `Everything is unlocked. Your free trial runs until ${ends}, and we’ll remind you before it ends.` : 'Everything is unlocked. Happy cooking!'}
        </Text>
      </View>
      <Button label="Start Cooking" icon="pot" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12 },
  restore: { minHeight: 44, minWidth: 64, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 8 },
  content: { paddingHorizontal: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  card: { borderRadius: 22, padding: 16, gap: 12, marginTop: 18, borderCurve: 'continuous' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 72, borderRadius: 20, borderWidth: 2.5, borderCurve: 'continuous' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  planBadge: { position: 'absolute', top: -10, right: 16, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tlRow: { flexDirection: 'row', gap: 12 },
  tlRail: { width: 30, alignItems: 'center' },
  tlDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  tlLine: { position: 'absolute', width: 3, borderRadius: 2 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 16, flexWrap: 'wrap' },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  free: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  welcome: { flex: 1, paddingHorizontal: 16 },
});
