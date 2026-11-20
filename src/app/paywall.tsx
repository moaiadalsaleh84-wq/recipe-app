/**
 * Pro paywall. Persuasive, never deceptive.
 *
 * Uses: context-matched headline (why it opened), benefits ordered by the user's own goals,
 * Biscuit, a preselected yearly plan with truthful per-week anchoring and
 * savings computed from real prices, a transparent trial timeline with a reminder (risk reversal),
 * only two choices (Hick's law), and a celebratory success moment (peak-end rule).
 *
 * Deliberately NOT used (App Store guideline 3.1.2, EU consumer law, and they backfire):
 * fake timers or scarcity, invented reviews or user counts, guilt-tripping copy,
 * hidden or delayed close buttons, hidden prices or renewal terms.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mascot } from '../components/mascot/Mascot';
import { MascotSays } from '../components/mascot/MascotSays';
import type { Line } from '../components/mascot/lines';
import { Icon, type IconName } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import { PopChip, PopIconButton } from '../components/pop';
import { scheduleTrialReminder } from '../lib/trialReminder';
import { benefitsFor, goalPhrase } from '../data/onboarding';
import { haptics } from '../lib/haptics';
import { nb, noWidow } from '../lib/text';
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
  loadPlans,
  savingsPct,
  type Plan,
  type PlanId,
} from '../lib/purchases';
import { FREE_LIMITS, useStore } from '../state/store';
import { fonts, useTheme } from '../theme';
import { Lift } from '../components/pop/Lift';

type Source = PaywallSource;

export default function Paywall() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { source = 'settings' } = useLocalSearchParams<{ source?: Source }>();
  const { profile, pro, setPro } = useStore();

  const [plan, setPlan] = useState<PlanId>('yearly'); // default effect: the best value is preselected
  // Prices and trial lengths from the store when real purchases are on (test mode: PLANS).
  const [plans, setPlans] = useState<Record<PlanId, Plan>>(PLANS);
  useEffect(() => {
    let live = true;
    loadPlans().then((p) => live && setPlans(p));
    return () => {
      live = false;
    };
  }, []);
  // The top bar gets its ink line once the content scrolls under it; the scroll leaves room for both bars.
  const [scrolled, setScrolled] = useState(false);
  const [topH, setTopH] = useState(0);
  const [footH, setFootH] = useState(0);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [welcome, setWelcome] = useState(false);

  const close = () => {
    if (source === 'onboarding' || !router.canGoBack()) router.replace('/');
    else router.back();
  };

  const yearly = plans.yearly;
  const monthly = plans.monthly;
  const selected = plans[plan];
  const trial = selected.trialDays;

  const copy = headline(source, goalPhrase(profile), profile.name.trim().split(/\s+/)[0] ?? '');
  const line = mascotLine(source);
  const benefits = benefitsFor(profile);

  const buy = async () => {
    setBusy('buy');
    try {
      const ent = await purchase(plan);
      setPro(ent);
      // Day 5 of the trial: a real reminder (permission is asked now, only when a trial starts).
      if (ent.trialEndsAt) scheduleTrialReminder(ent.trialEndsAt).catch(() => {});
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
      <ScrollView
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 2)}
        scrollEventThrottle={32}
        contentContainerStyle={[styles.content, { paddingTop: topH + 8, paddingBottom: footH + 24 }]}
      >
        <MascotSays line={line} size={104} />

        <Animated.Text entering={FadeInDown.duration(320)} style={[t.type.largeTitle, { color: t.colors.label, marginTop: 14 }]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {noWidow(copy.title)}
        </Animated.Text>
        <Text style={[t.type.body, { color: t.colors.secondaryLabel, marginTop: 6 }]}>{noWidow(copy.subtitle)}</Text>

        {/* Benefits, most relevant first */}
        <Lift radius={22} style={styles.cardLift}>
          <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
            {benefits.map((b, k) => (
              <Animated.View key={b.title} entering={FadeInDown.delay(80 * k).duration(300)} style={styles.benefit}>
                <View style={[styles.benefitIcon, { backgroundColor: t.colors.tintSoft, borderColor: t.pop.ink }]}>
                  <Icon name={b.icon} size={18} color={t.colors.tint} weight="bold" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[t.type.headline, { color: t.colors.label }]}>{noWidow(b.title)}</Text>
                  <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 1 }]}>{noWidow(b.detail)}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </Lift>

        {/* Two clear choices */}
        <View style={{ gap: 16, marginTop: 24 }} accessibilityRole="radiogroup" accessibilityLabel="Choose a plan">
          <PlanCard
            id="yearly"
            selected={plan === 'yearly'}
            onPress={() => setPlan('yearly')}
            title="Yearly"
            price={`${money(yearly.price)}\u00A0/\u00A0year`}
            note={`${money(perWeek('yearly', plans))}/week${yearly.trialDays ? ` · ${nb(yearly.trialDays, 'days')} free` : ''}`}
            badge={savingsPct(yearly.price, monthly.price) > 0 ? `Save ${savingsPct(yearly.price, monthly.price)}%` : undefined}
          />
          <PlanCard
            id="monthly"
            selected={plan === 'monthly'}
            onPress={() => setPlan('monthly')}
            title="Monthly"
            price={`${money(monthly.price)}\u00A0/\u00A0month`}
            note={monthly.trialDays ? `${nb(monthly.trialDays, 'days')} free · cancel anytime` : 'Flexible, cancel anytime'}
          />
        </View>

        {/* Transparent trial timeline: knowing exactly what happens builds trust */}
        {trial > 0 && (
          <Lift radius={22} style={styles.cardLift}>
            <Animated.View entering={FadeIn.duration(250)} style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
              <Text style={[t.type.headline, { color: t.colors.label, marginBottom: 10 }]}>How your free trial works</Text>
              <TimelineRow icon="crown" title="Today" detail="Everything unlocked. Cook, plan and track with no limits." first />
              <TimelineRow icon="notes" title={`Day\u00A0${Math.max(1, trial - 2)}`} detail="We’ll send you a reminder that your trial is ending." />
              <TimelineRow icon="calendar" title={`Day\u00A0${trial}`} detail={`Your subscription starts at ${money(selected.price)} per ${selected.period}. Cancel before then and you pay nothing.`} last />
            </Animated.View>
          </Lift>
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
      <View onLayout={(e) => setFootH(e.nativeEvent.layout.height)} style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: t.colors.background, borderTopColor: t.pop.ink }]}>
        <Button
          label={busy === 'buy' ? 'One moment…' : trial ? `Start my ${trial}-day free trial` : `Subscribe for ${money(selected.price)}/${selected.period}`}
          accessibilityLabel={trial ? `Start my ${trial}-day free trial, then ${money(selected.price)} per ${selected.period}` : `Subscribe for ${money(selected.price)} per ${selected.period}`}
          onPress={buy}
          disabled={!!busy}
        />
        <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 8 }]} testID="price-terms">
          {noWidow(
            trial
              ? `${nb(trial, 'days')} free, then ${money(selected.price)} per ${selected.period}. Renews automatically. Cancel anytime in Settings at least 24 hours before the trial ends.`
              : `Renews ${selected.period === 'year' ? 'yearly' : 'monthly'}. Cancel anytime in Settings.`,
          )}
        </Text>
        <PressableScale onPress={close} style={styles.free} accessibilityLabel={source === 'onboarding' ? 'Continue with the free version' : 'Not now'}>
          <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.semibold }]}>{source === 'onboarding' ? 'Continue with the free version' : 'Not now'}</Text>
        </PressableScale>
      </View>

      {/* Top bar: solid white, above the content (which scrolls under it, hidden). An ink line once scrolled. */}
      <View
        onLayout={(e) => setTopH(e.nativeEvent.layout.height)}
        style={[styles.top, { paddingTop: insets.top + 6, backgroundColor: t.colors.background, borderBottomColor: scrolled ? t.pop.ink : 'transparent' }]}
      >
        <PopIconButton icon="close" accessibilityLabel="Close" accessibilityHint={source === 'onboarding' ? 'Continue with the free version' : undefined} onPress={close} />
        <PressableScale onPress={onRestore} style={styles.restore} accessibilityLabel="Restore purchases" disabled={!!busy}>
          {busy === 'restore' ? <ActivityIndicator color={t.colors.tint} /> : <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.black }]}>Restore</Text>}
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
      return { title: 'Set goals you can see', subtitle: 'Set daily protein and calorie targets and see your progress from every meal you cook.' };
    default:
      return { title: 'Cook with everything unlocked', subtitle: 'Unlimited imports, pantry and cookbooks, plus nutrition goals.' };
  }
}

function mascotLine(source: Source): Line {
  if (source === 'recipes' || source === 'imports') return { text: 'Our recipe box is full!', mood: 'oops' };
  if (source === 'pantry') return { text: 'The pantry shelf is full!', mood: 'watch' };
  return { text: 'Pro is the big kitchen!', mood: 'happy' };
}

/**
 * One plan: radio on the left (centered); then the name (and a badge on the right), the price big,
 * and a muted line. Selected: sunshine tint on a 4pt shadow; not selected: white on a 3pt shadow.
 */
function PlanCard({ id, selected, onPress, title, price, note, badge }: { id: PlanId; selected: boolean; onPress: () => void; title: string; price: string; note: string; badge?: string }) {
  const t = useTheme();
  const depth = selected ? t.depth.card : t.depth.small;
  return (
    <Lift radius={20} offset={depth}>
      <PressableScale
        onPress={onPress}
        haptic="select"
        scaleTo={0.98}
        accessibilityRole="radio"
        aria-checked={selected}
        accessibilityLabel={`${title} plan, ${price}. ${note}${badge ? `. ${badge}` : ''}`}
        testID={`plan-${id}`}
        style={[styles.plan, { backgroundColor: selected ? t.pop.sunshineTint : t.colors.cell, borderColor: t.pop.ink }]}
      >
        <View style={[styles.radio, { borderColor: t.pop.ink, backgroundColor: t.colors.cell }]}>
          {selected && <View style={[styles.radioDot, { backgroundColor: t.pop.sunshine, borderColor: t.pop.ink }]} />}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.planTop}>
            <Text style={[t.type.headline, { color: t.colors.label, flex: 1 }]}>{title}</Text>
            {badge && <PopChip label={badge} color={t.pop.leaf} small />}
          </View>
          <Text style={[styles.planPrice, { color: t.colors.label }]}>{price}</Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{noWidow(note)}</Text>
        </View>
      </PressableScale>
    </Lift>
  );
}

/**
 * One step of the trial timeline. Every icon is a 44pt circle with an ink border (Today sunshine,
 * the rest white). A 3pt ink line runs from the center of each icon to the next, unbroken.
 */
function TimelineRow({ icon, title, detail, first, last }: { icon: IconName; title: string; detail: string; first?: boolean; last?: boolean }) {
  const t = useTheme();
  return (
    <View style={styles.tlRow}>
      <View style={styles.tlRail}>
        {!last && <View style={[styles.tlLine, { backgroundColor: t.pop.ink }]} />}
        <View style={[styles.tlDot, { backgroundColor: first ? t.pop.sunshine : t.colors.cell, borderColor: t.pop.ink }]}>
          <Icon name={icon} size={18} color={t.pop.ink} weight="bold" />
        </View>
      </View>
      <View style={{ flex: 1, paddingTop: 2, paddingBottom: last ? 0 : 18 }}>
        <Text style={[t.type.subhead, { color: t.colors.label, fontFamily: t.fonts.black }]}>{title}</Text>
        <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 1 }]}>{noWidow(detail)}</Text>
      </View>
    </View>
  );
}

/** Peak-end: the purchase ends on a happy, celebrated moment. */
function Welcome({ onDone, trialEndsAt }: { onDone: () => void; trialEndsAt: string | null }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const ends = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : null;
  return (
    <View style={[styles.welcome, { backgroundColor: t.colors.background, paddingTop: insets.top + 40, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <Mascot mood="celebrating" size={220} petable={false} />
        <Text style={[t.type.largeTitle, { color: t.colors.label, textAlign: 'center', marginTop: 12 }]} accessibilityRole="header">
          Welcome to Pro!
        </Text>
        <Text style={[t.type.body, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 8, maxWidth: 320 }]}>
          {ends ? `Everything is unlocked. Your free trial runs until ${ends}, and we’ll remind you before it ends.` : 'Everything is unlocked. Happy cooking!'}
        </Text>
      </View>
      <Button label="Start cooking" icon="pot" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Above the scroll content, solid white, so nothing shows through it.
  top: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 2 },
  restore: { minHeight: 44, minWidth: 64, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 8 },
  content: { paddingHorizontal: 20, width: '100%', maxWidth: 560, alignSelf: 'center' },
  card: { borderRadius: 22, padding: 16, gap: 14, borderCurve: 'continuous' },
  cardLift: { marginTop: 24 },
  // Icons line up with the top of the title, not the middle of the block.
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  benefitIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, borderWidth: 2.5, borderCurve: 'continuous' },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planPrice: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 29 },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
  tlRow: { flexDirection: 'row', gap: 14 },
  tlRail: { width: 44, alignItems: 'center' },
  tlDot: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  // From this icon's center down past the row's end into the next row, to the next icon's center.
  tlLine: { position: 'absolute', top: 22, bottom: -22, width: 3, left: 20.5 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 16, flexWrap: 'wrap' },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 2 },
  free: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  welcome: { flex: 1, paddingHorizontal: 20 },
});
