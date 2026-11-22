/**
 * First launch, in about a minute:
 *   Welcome → Name → Goal → Cooking for → Diet → Dinner moment → Reminder → Pantry
 *   → Building (the first pick is worked out here) → First pick → Paywall → that recipe.
 *
 * Rules: one-answer questions move on by themselves (no checkboxes, no Continue); several-answer
 * questions have checkmarks and a Continue. Every answer is saved as it's given, and the current
 * step is saved too, so closing the app mid-way resumes on the same step.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, SlideInLeft, SlideInRight, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../components/AppIcon';
import { BottomBar } from '../components/BottomBar';
import { Chunky } from '../components/Chunky';
import { AnimatedNumber } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';
import { PopButton, PopCard, PopIconButton, Sticker } from '../components/pop';
import { RecipePhoto } from '../components/RecipeCard';
import { Text } from '../components/Text';
import { useToast } from '../components/Toast';
import { recipes as builtInRecipes, type Recipe } from '../data/mock';
import { dietOptions, dinnerMoments, goalOptions, householdOptions, timeLabel, type Goal } from '../data/onboarding';
import { track } from '../lib/analytics';
import { askReminderPermission, reminderText } from '../lib/dinnerReminders';
import { haptics } from '../lib/haptics';
import { cookableCount, rankPicks, type Pick } from '../lib/onboardingPicks';
import { restore } from '../lib/purchases';
import { nb, noWidow } from '../lib/text';
import { duration, uiEase } from '../motion';
import { useStore } from '../state/store';
import { fonts, noWidows, pop, stroke } from '../theme';

const SCREENS = ['welcome', 'name', 'goal', 'household', 'diet', 'dinner', 'reminder', 'pantry', 'building', 'pick'] as const;
type Screen = (typeof SCREENS)[number];
/** Which of the 8 progress segments each screen fills (0 = no bar). */
const SEGMENT: Record<Screen, number> = { welcome: 0, name: 1, goal: 2, household: 3, diet: 4, dinner: 5, reminder: 6, pantry: 7, building: 0, pick: 8 };
const SEGMENTS = 8;

/** Where the current step is kept, so a closed app resumes on it. */
const STEP_KEY = 'pantry-pop-onboarding-step-v2';

/** The quick-add pantry items. Each name matches ingredients in the bundled recipes. */
export const QUICK_PANTRY = ['Eggs', 'Pasta', 'Rice', 'Garlic', 'Onions', 'Olive oil', 'Butter', 'Milk', 'Cheese', 'Tomatoes', 'Chicken', 'Potatoes', 'Bread', 'Flour', 'Peppers'];

const ADVANCE_MS = 350;
/** Space between the progress row and each step's title. */
const TITLE_GAP = 24;

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { profile, setProfile, completeOnboarding, pantry, addPantry, removePantry, allRecipes, pro, setPro } = useStore();
  const toast = useToast();

  const [screen, setScreen] = useState<Screen | null>(null);
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [history, setHistory] = useState<Screen[]>([]);
  // Forward slides the next step in from the right; back slides the previous one in from the left.
  const [backwards, setBackwards] = useState(false);
  const reduceMotion = useReducedMotion();

  // Resume where the person left off.
  useEffect(() => {
    AsyncStorage.getItem(STEP_KEY)
      .then((v) => setScreen(SCREENS.includes(v as Screen) ? (v as Screen) : 'welcome'))
      .catch(() => setScreen('welcome'));
  }, []);
  useEffect(() => {
    if (!screen) return;
    AsyncStorage.setItem(STEP_KEY, screen).catch(() => {});
    track('onboarding_step_viewed', { step: screen });
  }, [screen]);

  const go = (to: Screen) => {
    if (!screen) return;
    track('onboarding_step_completed', { step: screen });
    setHistory((h) => [...h, screen]);
    setBackwards(false);
    setScreen(to);
  };
  const next = () => {
    if (!screen) return;
    go(SCREENS[SCREENS.indexOf(screen) + 1]);
  };
  const back = () => {
    if (!screen) return;
    const prev = history[history.length - 1] ?? SCREENS[Math.max(0, SCREENS.indexOf(screen) - 1)];
    setHistory((h) => h.slice(0, -1));
    setBackwards(true);
    // Never back into the "building" moment: straight to the step before it.
    setScreen(prev === 'building' ? 'pantry' : prev);
  };

  const name = profile.name.trim().split(/\s+/)[0] ?? '';
  const goal = profile.goals[0] as Goal | undefined;
  const servings = profile.household ?? 2;
  const dinnerTime = profile.dinnerTime ?? profile.reminder?.time ?? '18:00';

  const computePicks = () => rankPicks({ recipes: allRecipes, pantry, diets: profile.diets, goal });

  const finish = async (recipeId: string | undefined) => {
    track('onboarding_step_completed', { step: 'pick' });
    completeOnboarding();
    await AsyncStorage.removeItem(STEP_KEY).catch(() => {});
    haptics.success();
    router.replace({ pathname: '/paywall', params: { source: 'onboarding', ...(recipeId ? { then: recipeId } : {}) } });
  };

  const [restoring, setRestoring] = useState(false);
  const onRestore = async () => {
    setRestoring(true);
    try {
      const ent = await restore(pro);
      if (ent) {
        setPro(ent);
        completeOnboarding();
        await AsyncStorage.removeItem(STEP_KEY).catch(() => {});
        toast({ message: 'Welcome back! Pro is restored.', icon: 'crown' });
        router.replace('/');
      } else {
        toast({ message: 'No account found. Let’s set you up!', tone: 'info' });
      }
    } catch {
      toast({ message: 'Couldn’t reach the App Store. Check your connection.', tone: 'warning' });
    } finally {
      setRestoring(false);
    }
  };

  if (!screen) return <View style={{ flex: 1, backgroundColor: pop.sunshine }} />;

  const segment = SEGMENT[screen];
  const bg = screen === 'welcome' ? pop.sunshine : screen === 'reminder' ? pop.skyTint : screen === 'pick' ? pop.sunshineTint : pop.white;

  let body: ReactNode;
  switch (screen) {
    case 'welcome':
      body = <Welcome onStart={next} onRestore={onRestore} restoring={restoring} />;
      break;
    case 'name':
      body = <NameStep value={profile.name} onChange={(v) => setProfile({ name: v })} onDone={next} />;
      break;
    case 'goal':
      body = (
        <GoalStep
          name={name}
          selected={goal}
          onPick={(g) => {
            setProfile({ goals: [g] });
            setTimeout(next, ADVANCE_MS);
          }}
        />
      );
      break;
    case 'household':
      body = (
        <HouseholdStep
          selected={profile.household}
          onPick={(size) => {
            setProfile({ household: size });
            setTimeout(next, ADVANCE_MS);
          }}
        />
      );
      break;
    case 'diet':
      body = <DietStep diets={profile.diets} onChange={(diets) => setProfile({ diets })} onDone={next} />;
      break;
    case 'dinner':
      body = (
        <DinnerStep
          selected={profile.dinnerTime}
          onPick={(time) => {
            // The reminder is offered at the same time.
            setProfile({ dinnerTime: time, reminder: { enabled: profile.reminder?.enabled ?? false, time } });
            setTimeout(next, ADVANCE_MS);
          }}
        />
      );
      break;
    case 'reminder':
      body = (
        <ReminderStep
          time={dinnerTime}
          preview={computePicks()[0]}
          onYes={async () => {
            const granted = await askReminderPermission();
            setProfile({ reminder: { enabled: granted, time: dinnerTime } });
            if (!granted && Platform.OS !== 'web') toast({ message: 'No problem. You can turn it on later in Settings.', tone: 'info' });
            next();
          }}
          onNo={() => {
            setProfile({ reminder: { enabled: false, time: dinnerTime } });
            next();
          }}
        />
      );
      break;
    case 'pantry':
      body = (
        <PantryStep
          pantry={pantry}
          recipes={allRecipes}
          diets={profile.diets}
          onDone={(chosen) => {
            const have = new Set(pantry.map((p) => p.toLowerCase()));
            const want = new Set(chosen.map((p) => p.toLowerCase()));
            chosen.filter((c) => !have.has(c.toLowerCase())).forEach((c) => addPantry(c));
            // Quick-add items that were un-ticked come out of the pantry again.
            pantry.filter((p) => QUICK_PANTRY.some((q) => q.toLowerCase() === p.toLowerCase()) && !want.has(p.toLowerCase())).forEach((p) => removePantry(p));
            setPicks(null);
            next();
          }}
        />
      );
      break;
    case 'building':
      body = <Building servings={servings} onCompute={() => setPicks(computePicks())} onDone={() => go('pick')} />;
      break;
    case 'pick':
      body = <FirstPick name={name} servings={servings} picks={picks ?? computePicks()} onCook={(id) => finish(id)} />;
      break;
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {segment > 0 && (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <PopIconButton icon="back" accessibilityLabel={screen === 'name' ? 'Back to the start' : 'Previous question'} onPress={back} />
          {/* Setup is done on First pick: no progress bar there, just the way back. */}
          {screen !== 'pick' && <ProgressBar filled={segment} />}
        </View>
      )}
      <ScreenBg.Provider value={bg}>
        <Animated.View
          key={screen}
          entering={reduceMotion || screen === 'welcome' || screen === 'building' ? FadeIn.duration(duration.base) : uiEase((backwards ? SlideInLeft : SlideInRight).duration(duration.base))}
          style={{ flex: 1 }}
        >
          {body}
        </Animated.View>
      </ScreenBg.Provider>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                        */
/* ------------------------------------------------------------------ */

function ProgressBar({ filled }: { filled: number }) {
  return (
    <View style={styles.bar} accessibilityRole="progressbar" accessibilityLabel={`Step ${filled} of ${SEGMENTS}`} accessibilityValue={{ min: 0, max: SEGMENTS, now: filled }}>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <View key={i} testID={i < filled ? 'ob-seg-done' : 'ob-seg'} style={[styles.segment, { backgroundColor: i < filled ? pop.sunshine : pop.white }]} />
      ))}
    </View>
  );
}

/** The current step's background, so its bottom bar matches. */
const ScreenBg = createContext<string>(pop.white);

/**
 * Title block at the same place on every step (24pt under the progress row), a scrolling body, and
 * an optional bottom bar that sits under the scroll view, so nothing can hide behind it.
 */
function Step({ title, subtitle, children, footer, contentStyle }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const bg = useContext(ScreenBg);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[{ paddingTop: TITLE_GAP, paddingHorizontal: 20, paddingBottom: footer ? 24 : insets.bottom + 24 }, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, noWidows.style]} {...noWidows.props} accessibilityRole="header">
          {noWidow(title)}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={{ marginTop: 24 }}>{children}</View>
      </ScrollView>
      {footer ? (
        <BottomBar color={bg} direction="column" style={{ gap: 4 }}>
          {footer}
        </BottomBar>
      ) : null}
    </View>
  );
}

/** The white check in a circle on a picked option. */
function CheckBadge({ dark }: { dark?: boolean }) {
  return (
    <View style={[styles.badge, { backgroundColor: dark ? pop.ink : pop.white }]}>
      <Icon name="check" size={dark ? 13 : 16} color={dark ? pop.white : pop.ink} weight="bold" />
    </View>
  );
}

/** One-answer step: remembers the tap for the 350ms before moving on, and ignores further taps. */
function useOneTap<T>(initial: T | null | undefined, onPick: (v: T) => void) {
  const [picked, setPicked] = useState<T | null>(initial ?? null);
  const locked = useRef(false);
  return {
    picked,
    pick: (v: T) => {
      if (locked.current) return;
      locked.current = true;
      setPicked(v);
      haptics.tap();
      onPick(v);
    },
  };
}

/* ------------------------------------------------------------------ */
/* 0. Welcome                                                           */
/* ------------------------------------------------------------------ */

const COLLAGE_IDS = ['creamy-mushroom-spaghetti', 'pepper-feta-penne', 'chicken-fried-rice', 'margherita-pizza'];

function Welcome({ onStart, onRestore, restoring }: { onStart: () => void; onRestore: () => void; restoring: boolean }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const photos = useMemo(() => {
    const byId = COLLAGE_IDS.map((id) => builtInRecipes.find((r) => r.id === id)).filter((r): r is Recipe => !!r?.image);
    return byId.length === 4 ? byId : builtInRecipes.filter((r) => r.image).slice(0, 4);
  }, []);
  // Four photos in two staggered columns, sized to leave room for the words on short phones.
  const tile = Math.min((Math.min(width, 500) - 40 - 16) / 2, (height - 430) / 2.2, 170);
  return (
    <View style={{ flex: 1, paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: 20 }}>
      <View style={styles.collage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={{ gap: 16 }}>
          <PhotoTile recipe={photos[0]} size={tile} />
          <PhotoTile recipe={photos[1]} size={tile} />
        </View>
        <View style={{ gap: 16, marginTop: tile * 0.28 }}>
          <PhotoTile recipe={photos[2]} size={tile} />
          <PhotoTile recipe={photos[3]} size={tile} />
        </View>
        <Sticker label={nb(25, 'min')} color={pop.tomato} style={{ position: 'absolute', top: tile - 14, left: tile - 24 }} />
      </View>
      <View style={{ flex: 1 }} />
      <Text style={styles.welcomeTitle} accessibilityRole="header">
        Never wonder what’s for dinner{' '}again.
      </Text>
      <Text style={[styles.subtitle, { color: pop.ink, marginTop: 10 }]}>Save recipes from anywhere. Cook with what you already have.</Text>
      <PopButton label="Let’s go" color={pop.ink} textColor={pop.white} onPress={onStart} style={{ marginTop: 24 }} testID="ob-start" />
      <Pressable onPress={onRestore} disabled={restoring} accessibilityRole="button" style={styles.link} hitSlop={6}>
        <Text style={styles.linkText}>{restoring ? 'Checking…' : 'I already have an account'}</Text>
      </Pressable>
    </View>
  );
}

function PhotoTile({ recipe, size }: { recipe: Recipe | undefined; size: number }) {
  const r = 22;
  return (
    <View style={{ width: size, height: size + 4 }}>
      <View style={{ position: 'absolute', top: 4, left: 0, width: size, height: size, borderRadius: r, backgroundColor: pop.ink }} />
      <View style={{ width: size, height: size, borderRadius: r, borderWidth: 3, borderColor: pop.ink, overflow: 'hidden', backgroundColor: pop.white }}>
        {recipe ? <RecipePhoto recipe={recipe} radius={r - 3} square /> : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Name                                                              */
/* ------------------------------------------------------------------ */

function NameStep({ value, onChange, onDone }: { value: string; onChange: (v: string) => void; onDone: () => void }) {
  const has = value.trim().length > 0;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Step title="What should we call you?" subtitle="So your kitchen feels like yours." footer={<PopButton label={has ? 'Continue' : 'Skip'} color={has ? pop.sunshine : pop.white} onPress={onDone} testID="ob-name-next" />}>
        <TextInput maxFontSizeMultiplier={1.3}
          value={value}
          onChangeText={onChange}
          placeholder="Your first name"
          placeholderTextColor={pop.inkMuted}
          autoFocus
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          onSubmitEditing={onDone}
          maxLength={30}
          accessibilityLabel="Your first name"
          style={styles.input}
          testID="ob-name"
        />
      </Step>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Goal                                                              */
/* ------------------------------------------------------------------ */

function GoalStep({ name, selected, onPick }: { name: string; selected: Goal | undefined; onPick: (g: Goal) => void }) {
  const { picked, pick } = useOneTap<Goal>(null, onPick);
  const shown = picked ?? selected;
  return (
    <Step
      title={name ? `What brings you here, ${name}?` : 'What brings you here?'}
      subtitle="Pick one. We’ll tailor every pick to it."
    >
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {goalOptions.map((g) => (
          <OptionRow key={g.id} label={g.label} icon={g.icon} tint={pop[g.tint]} selected={shown === g.id} onPress={() => pick(g.id)} />
        ))}
      </View>
      <Text style={[styles.hint, { marginTop: 16 }]}>Tap one to continue</Text>
    </Step>
  );
}

function OptionRow({ label, detail, icon, tint, selected, fill = pop.sunshine, onPress, testID }: { label: string; detail?: string; icon?: IconName; tint?: string; selected: boolean; fill?: string; onPress: () => void; testID?: string }) {
  return (
    <PopCard
      onPress={onPress}
      pressed={selected}
      haptic={null}
      color={selected ? fill : pop.white}
      radius={20}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      testID={testID}
      contentStyle={[styles.row, { minHeight: detail ? 74 : 70 }]}
    >
      {icon ? (
        <View style={[styles.iconCircle, { backgroundColor: tint }]}>
          <Icon name={icon} size={21} color={pop.ink} weight="bold" />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={[styles.rowDetail, selected && { color: pop.ink }]}>{detail}</Text> : null}
      </View>
      {selected ? <CheckBadge /> : null}
    </PopCard>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Cooking for                                                       */
/* ------------------------------------------------------------------ */

function HouseholdStep({ selected, onPick }: { selected: number | null; onPick: (n: number) => void }) {
  const { picked, pick } = useOneTap<number>(null, onPick);
  const shown = picked ?? selected;
  return (
    <Step title={'Who are you cooking for?'} subtitle="Every recipe opens sized for you.">
      <View style={styles.grid} accessibilityRole="radiogroup">
        {householdOptions.map((h) => (
          <PopCard
            key={h.size}
            onPress={() => pick(h.size)}
            pressed={shown === h.size}
            haptic={null}
            color={shown === h.size ? pop.sky : pop.white}
            radius={22}
            accessibilityLabel={`${h.label}, ${h.big}`}
            style={styles.tile}
            contentStyle={styles.tileInner}
          >
            <Text style={styles.big}>{h.big}</Text>
            <Text style={styles.rowLabel}>{h.label}</Text>
            {shown === h.size ? (
              <View style={{ position: 'absolute', top: 10, right: 10 }}>
                <CheckBadge />
              </View>
            ) : null}
          </PopCard>
        ))}
      </View>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Diet (several answers)                                            */
/* ------------------------------------------------------------------ */

function DietStep({ diets, onChange, onDone }: { diets: readonly string[]; onChange: (d: string[]) => void; onDone: () => void }) {
  const [none, setNone] = useState(false);
  const toggle = (d: string) => {
    haptics.select();
    setNone(false);
    onChange(diets.includes(d) ? diets.filter((x) => x !== d) : [...diets, d]);
  };
  return (
    <Step title="Anything we should keep in mind?" subtitle="Suggestions will only include recipes that fit." footer={<PopButton label="Continue" onPress={onDone} testID="ob-diet-next" />}>
      <DietChip
        label="No preference"
        checked={none && diets.length === 0}
        onPress={() => {
          haptics.select();
          setNone(true);
          onChange([]);
        }}
        style={{ alignSelf: 'stretch' }}
      />
      <View style={styles.wrap}>
        {dietOptions.map((d) => (
          <DietChip key={d} label={d} checked={diets.includes(d)} onPress={() => toggle(d)} />
        ))}
      </View>
    </Step>
  );
}

function DietChip({ label, checked, onPress, style }: { label: string; checked: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Chunky
      face={checked ? pop.sunshineTint : pop.white}
      depth={3}
      radius={16}
      haptic={null}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={style}
      faceStyle={styles.chip}
    >
      {checked ? <CheckBadge dark /> : null}
      <Text style={styles.chipText}>{label.replace(' ', ' ')}</Text>
    </Chunky>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Dinner moment                                                     */
/* ------------------------------------------------------------------ */

function DinnerStep({ selected, onPick }: { selected: string | null; onPick: (t: string) => void }) {
  const { picked, pick } = useOneTap<string>(null, onPick);
  const shown = picked ?? selected;
  return (
    <Step title={'When do you decide what’s for\u00A0dinner?'} subtitle="We’ll have an idea ready before it does.">
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {dinnerMoments.map((m) => (
          <OptionRow key={m.time} label={m.title} detail={m.detail} fill={pop.berry} selected={shown === m.time} onPress={() => pick(m.time)} />
        ))}
      </View>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Reminder (the friendly ask before iOS asks)                       */
/* ------------------------------------------------------------------ */

function ReminderStep({ time, preview, onYes, onNo }: { time: string; preview: Pick | undefined; onYes: () => void; onNo: () => void }) {
  const [busy, setBusy] = useState(false);
  const label = timeLabel(time);
  const text = preview ? reminderText(preview.recipe, preview.have, preview.needed) : null;
  return (
    <Step
      title={`Want tonight’s pick at ${label}?`}
      subtitle="One friendly nudge a day. Turn it off anytime."
      footer={
        <View style={{ gap: 4 }}>
          <PopButton
            label="Yes, remind me"
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              await onYes();
            }}
            testID="ob-remind-yes"
          />
          <Pressable onPress={onNo} accessibilityRole="button" style={styles.link} testID="ob-remind-no">
            <Text style={styles.linkText}>Not now</Text>
          </Pressable>
        </View>
      }
    >
      {text ? (
        <View style={styles.notif} accessibilityLabel={`Example notification: ${text.title}. ${text.body}`} accessible>
          <AppIcon size={38} />
          <View style={{ flex: 1 }}>
            <Text style={styles.notifApp}>PANTRY POP · {label.toUpperCase()}</Text>
            <Text style={styles.notifTitle}>{text.title}</Text>
            <Text style={styles.notifBody}>{text.body}</Text>
          </View>
        </View>
      ) : null}
      <View style={{ gap: 14, marginTop: 24 }}>
        {['A dinner idea that fits what you have', 'Quiet on days you already cooked', 'No “we miss you” spam. Ever.'].map((line) => (
          <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.badge, { backgroundColor: pop.leaf }]}>
              <Icon name="check" size={15} color={pop.ink} weight="bold" />
            </View>
            <Text style={[styles.rowLabel, { flex: 1, fontSize: 16 }]}>{line}</Text>
          </View>
        ))}
      </View>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Pantry quick add                                                  */
/* ------------------------------------------------------------------ */

function PantryStep({ pantry, recipes, diets, onDone }: { pantry: string[]; recipes: Recipe[]; diets: readonly string[]; onDone: (chosen: string[]) => void }) {
  const [chosen, setChosen] = useState<string[]>(() => QUICK_PANTRY.filter((q) => pantry.some((p) => p.toLowerCase() === q.toLowerCase())));
  // Count with everything already in the pantry, plus the ticked chips.
  const others = pantry.filter((p) => !QUICK_PANTRY.some((q) => q.toLowerCase() === p.toLowerCase()));
  const count = cookableCount(recipes, [...others, ...chosen], diets);
  const toggle = (item: string) => {
    haptics.tap();
    setChosen((c) => (c.includes(item) ? c.filter((x) => x !== item) : [...c, item]));
  };
  return (
    <Step title="Tap what’s in your kitchen" subtitle="Rough is fine. You can change it later." footer={<PopButton label="Continue" onPress={() => onDone(chosen)} testID="ob-pantry-next" />}>
      <PopCard color={pop.leafTint} radius={20} contentStyle={styles.counter}>
        {chosen.length === 0 && others.length === 0 ? (
          // Never a discouraging 0: a nudge until the first tap.
          <Text style={[styles.rowLabel, { flex: 1 }]}>Tap a few to see what you can cook</Text>
        ) : (
          <>
            <AnimatedNumber value={count} style={styles.counterNum} testID="ob-count" />
            <Text style={[styles.rowLabel, { flex: 1 }]} accessibilityLiveRegion="polite">
              {count === 1 ? 'recipe' : 'recipes'} you can cook right now with what you have
            </Text>
          </>
        )}
      </PopCard>
      <View style={[styles.wrap, { marginTop: 20 }]}>
        {QUICK_PANTRY.map((item) => {
          const on = chosen.includes(item);
          return (
            <Chunky
              key={item}
              face={on ? pop.leaf : pop.white}
              depth={3}
              radius={16}
              haptic={null}
              onPress={() => toggle(item)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={item}
              faceStyle={styles.chip}
            >
              {on ? <CheckBadge /> : null}
              <Text style={styles.chipText}>{item.replace(' ', ' ')}</Text>
            </Chunky>
          );
        })}
      </View>
    </Step>
  );
}


/* ------------------------------------------------------------------ */
/* Building                                                             */
/* ------------------------------------------------------------------ */

function Building({ servings, onCompute, onDone }: { servings: number; onCompute: () => void; onDone: () => void }) {
  const [done, setDone] = useState(0);
  const lines = ['Matching your goal', `Sizing recipes for ${servings === 1 ? nb(1, 'person') : nb(servings, 'people')}`, 'Checking your pantry'];
  const finished = useRef(false);
  useEffect(() => {
    // The first pick is worked out here, while the lines tick off.
    onCompute();
    const timers = [400, 800, 1200].map((ms, i) => setTimeout(() => setDone(i + 1), ms));
    timers.push(
      setTimeout(() => {
        if (finished.current) return;
        finished.current = true;
        onDone();
      }, 1600),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }} accessibilityLiveRegion="polite">
      <Text style={[styles.title, { textAlign: 'center' }]}>Setting up your kitchen…</Text>
      <View style={{ gap: 16, marginTop: 28, alignSelf: 'center' }}>
        {lines.map((line, i) => (
          <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.badge, { backgroundColor: i < done ? pop.leaf : pop.white }]}>{i < done ? <Icon name="check" size={15} color={pop.ink} weight="bold" /> : null}</View>
            <Text style={[styles.rowLabel, { fontSize: 17, color: i < done ? pop.ink : pop.inkMuted }]}>{line}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 8. First pick                                                        */
/* ------------------------------------------------------------------ */

const MAX_SHUFFLES = 5;

function FirstPick({ name, servings, picks, onCook }: { name: string; servings: number; picks: Pick[]; onCook: (id: string | undefined) => void }) {
  const reduceMotion = useReducedMotion();
  const [i, setI] = useState(0);
  const pool = picks.slice(0, MAX_SHUFFLES);
  const pick = pool[i % Math.max(1, pool.length)];
  const turn = useSharedValue(0);
  const flip = useAnimatedStyle(() => ({ transform: [{ perspective: 900 }, { rotateY: `${turn.get()}deg` }] }));
  const busy = useRef(false);

  const another = () => {
    if (busy.current || pool.length < 2) return;
    haptics.select();
    const nextI = (i + 1) % pool.length;
    if (reduceMotion) {
      setI(nextI);
      return;
    }
    busy.current = true;
    turn.set(withTiming(90, { duration: 160 }));
    setTimeout(() => {
      setI(nextI);
      turn.set(-90);
      turn.set(withTiming(0, { duration: 180 }));
      setTimeout(() => {
        busy.current = false;
      }, 190);
    }, 165);
  };

  const more = pick ? picks.filter((p) => p !== pick && p.needed > 0 && p.have / p.needed >= 0.5) : [];
  const thumbs = (more.length ? more : picks.filter((p) => p !== pick)).slice(0, 2);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: TITLE_GAP, paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.small}>{name ? `All set, ${name}. Your kitchen is ready.` : 'All set. Your kitchen is ready.'}</Text>
        <Text style={[styles.title, { marginTop: 4 }]} accessibilityRole="header">
          Here’s tonight’s pick
        </Text>
        {pick ? (
          <Animated.View style={[{ marginTop: 20 }, flip]}>
            <PopCard radius={24} contentStyle={{ padding: 0 }} testID="ob-pick-card">
              <View style={{ height: 190 }}>
                <RecipePhoto recipe={pick.recipe} radius={0} />
              </View>
              <View style={{ padding: 16, borderTopWidth: stroke.thick, borderColor: pop.ink }}>
                <Text style={styles.cardTitle} testID="ob-pick-title">
                  {pick.recipe.title}
                </Text>
                <View style={[styles.wrap, { marginTop: 12, gap: 8 }]}>
                  <Tag icon="clock" label={nb(pick.recipe.minutes, 'min')} color={pop.tomatoTint} />
                  <Tag icon="people" label={`For\u00A0${servings}`} color={pop.skyTint} />
                  <Tag icon="fridge" label={pick.have > 0 ? `You have ${pick.have} of\u00A0${pick.needed}` : nb(pick.needed, 'ingredients')} color={pop.leafTint} />
                </View>
              </View>
            </PopCard>
          </Animated.View>
        ) : (
          <Text style={[styles.subtitle, { marginTop: 20 }]}>Add a few recipes and we’ll pick one for you every night.</Text>
        )}
        {more.length > 0 && (
          <View style={styles.moreRow}>
            <View style={{ width: 44 + (thumbs.length - 1) * 22, height: 44 }}>
              {thumbs.map((p, k) => (
                <View key={p.recipe.id} style={[styles.thumb, { left: k * 22, zIndex: 2 - k }]}>
                  <RecipePhoto recipe={p.recipe} radius={10} iconSize={18} square />
                </View>
              ))}
            </View>
            <Text style={[styles.rowLabel, { flex: 1 }]}>+{more.length} more you can make this{' '}week</Text>
          </View>
        )}
      </ScrollView>
      <BottomBar color={pop.sunshineTint} direction="column">
        <PopButton label="Cook this tonight" icon="play" onPress={() => onCook(pick?.recipe.id)} testID="ob-cook" />
        {pool.length > 1 && <PopButton label="Show me another" icon="shuffle" color={pop.white} size="small" onPress={another} haptic={null} testID="ob-another" />}
      </BottomBar>
    </View>
  );
}

function Tag({ icon, label, color }: { icon: IconName; label: string; color: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: color }]}>
      <Icon name={icon} size={14} color={pop.ink} weight="bold" />
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  bar: { flex: 1, flexDirection: 'row', gap: 4, height: 14 },
  segment: { flex: 1, borderRadius: 7, borderWidth: 2, borderColor: pop.ink },
  title: { fontFamily: fonts.heading, fontSize: 32, lineHeight: 38, color: pop.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: pop.inkMuted, marginTop: 8 },
  small: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: pop.inkMuted },
  hint: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: pop.inkMuted, textAlign: 'center', paddingVertical: 6 },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  linkText: { fontFamily: fonts.bold, fontSize: 16, color: pop.ink, textDecorationLine: 'underline' },
  welcomeTitle: { fontFamily: fonts.heading, fontSize: 38, lineHeight: 44, color: pop.ink },
  collage: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  input: {
    height: 60,
    borderWidth: stroke.thick,
    borderColor: pop.ink,
    borderRadius: 18,
    paddingHorizontal: 18,
    fontFamily: fonts.bold,
    fontSize: 20,
    color: pop.ink,
    backgroundColor: pop.white,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 10 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: pop.ink, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: pop.ink },
  rowDetail: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: pop.inkMuted, marginTop: 1 },
  badge: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: pop.ink, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  tile: { width: '47%', flexGrow: 1 },
  tileInner: { height: 150, alignItems: 'center', justifyContent: 'center', gap: 2 },
  big: { fontFamily: fonts.heading, fontSize: 48, lineHeight: 56, color: pop.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 14, paddingVertical: 6 },
  chipText: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: pop.ink },
  notif: { flexDirection: 'row', gap: 12, backgroundColor: pop.white, borderWidth: stroke.thick, borderColor: pop.ink, borderRadius: 20, padding: 14, borderCurve: 'continuous' },
  notifApp: { fontFamily: fonts.black, fontSize: 12, lineHeight: 16, letterSpacing: 0.5, color: pop.inkMuted },
  notifTitle: { fontFamily: fonts.black, fontSize: 16, lineHeight: 21, color: pop.ink, marginTop: 2 },
  notifBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: pop.ink, marginTop: 2 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 14, minHeight: 78 },
  counterNum: { fontFamily: fonts.heading, fontSize: 44, lineHeight: 50, color: pop.ink, textAlign: 'left', fontVariant: ['tabular-nums'] },
  cardTitle: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 29, color: pop.ink },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 2, borderColor: pop.ink, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: pop.ink },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  thumb: { position: 'absolute', top: 0, width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: pop.ink, overflow: 'hidden', backgroundColor: pop.white },
});
