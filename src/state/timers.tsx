/**
 * Cook Mode timers for the whole app. They live here (not in the Cook Mode screen) so they keep
 * going when you leave Cook Mode, and they're saved so they survive the app being closed.
 *
 * - The countdown on screen ticks only while the app is open (iOS pauses JavaScript otherwise).
 * - Outside the app, a scheduled notification and the Live Activity take over (timerAlerts.ts).
 * - The first timer asks, through the cat, whether it may send notifications.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, usePathname } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatSays } from '../components/cats/CatSays';
import { buddyInfo } from '../components/cats/dialogue';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { Button } from '../components/ui';
import { useAlarm } from '../lib/alarm';
import * as engine from '../lib/cookTimers';
import { haptics } from '../lib/haptics';
import { applyAlerts, backgroundSupport, listen, notificationPermission, reconnect, requestNotificationPermission, type BackgroundSupport, type TimerControl } from '../lib/timerAlerts';
import { planAlerts } from '../lib/timerPlan';
import { useTheme } from '../theme';
import { useBuddy } from './store';

const STORAGE_KEY = 'pantry-pop-timers-v1';
const ASKED_KEY = 'pantry-pop-notifications-asked';

type TimersApi = {
  timers: engine.CookTimer[];
  /** Ticks while the app is open, so countdowns re-render. */
  now: number;
  support: BackgroundSupport;
  start: (input: engine.StartInput) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  restart: (id: string) => void;
  /** Stops a ringing timer or cancels a running one. */
  stop: (id: string) => void;
};

const TimersContext = createContext<TimersApi | null>(null);

export function useTimers() {
  const ctx = useContext(TimersContext);
  if (!ctx) throw new Error('useTimers must be used inside <TimersProvider>');
  return ctx;
}

export function TimersProvider({ children }: { children: ReactNode }) {
  const buddy = useBuddy();
  const alarm = useAlarm();
  const [timers, setTimers] = useState<engine.CookTimer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [askOpen, setAskOpen] = useState(false);
  const [support] = useState(backgroundSupport);
  const sent = useRef<engine.CookTimer[]>([]);

  /* ---------- load, save ---------- */
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const restored = engine.prune(engine.restore(raw ? JSON.parse(raw) : [], Date.now()), Date.now());
        sent.current = restored; // their notifications are already scheduled from last time
        setTimers(restored);
        reconnect(restored);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timers)).catch(() => {});
  }, [timers, loaded]);

  /* ---------- outside the app: notifications + Live Activity ---------- */
  useEffect(() => {
    if (!loaded) return;
    const ops = planAlerts(sent.current, timers);
    sent.current = timers;
    const info = buddyInfo[buddy];
    applyAlerts(ops, { buddy, buddyName: info.name, doneLine: buddy === 'tank' ? 'Go check it, champ.' : 'Come take a look!' });
  }, [timers, loaded, buddy]);

  /* ---------- the clock: only while the app is open ---------- */
  const latest = useRef(timers);
  useEffect(() => {
    latest.current = timers;
  }, [timers]);

  /** Moves the timers to the current time; rings for any that just finished. */
  const check = useCallback(() => {
    const t = Date.now();
    setNow(t);
    const { list, finished } = engine.tick(latest.current, t);
    if (!finished.length) return;
    latest.current = list;
    setTimers(list);
    if (finished.some((f) => f.ring)) alarm.start();
  }, [alarm]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      setActive(s === 'active');
      // Back in the app: check right away instead of waiting for the next tick.
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  const anyRunning = timers.some((t) => t.status === 'running');
  useEffect(() => {
    if (!active || !anyRunning) return;
    const id = setInterval(check, 250);
    return () => clearInterval(id);
  }, [active, anyRunning, check]);

  // No ringing timer left: quiet.
  const ringing = timers.filter((t) => t.status === 'ringing');
  useEffect(() => {
    if (!ringing.length) alarm.stop();
  }, [ringing.length, alarm]);

  /* ---------- actions ---------- */
  const start = useCallback(
    (input: engine.StartInput) => {
      alarm.stop();
      setTimers((l) => engine.start(l, input, Date.now()));
      if (!support.notifications) return;
      // First timer ever: the cat asks before iOS does.
      AsyncStorage.getItem(ASKED_KEY)
        .then(async (asked) => {
          if (asked) return;
          if ((await notificationPermission()) === 'undetermined') setAskOpen(true);
        })
        .catch(() => {});
    },
    [alarm, support.notifications],
  );
  const pause = useCallback((id: string) => setTimers((l) => engine.pause(l, id, Date.now())), []);
  const resume = useCallback((id: string) => setTimers((l) => engine.resume(l, id, Date.now())), []);
  const restart = useCallback(
    (id: string) => {
      alarm.stop();
      setTimers((l) => engine.restart(l, id, Date.now()));
    },
    [alarm],
  );
  const stop = useCallback((id: string) => setTimers((l) => engine.stop(l, id)), []);

  // Notification taps open Cook Mode; Lock Screen buttons pause, resume or stop.
  const controls = useRef({ pause, resume, stop });
  useEffect(() => {
    controls.current = { pause, resume, stop };
  }, [pause, resume, stop]);
  useEffect(
    () =>
      listen({
        onOpenRecipe: (recipeId) => router.push({ pathname: '/cook/[id]', params: { id: recipeId } }),
        onControl: (c: TimerControl) => controls.current[c.action](c.timerId),
      }),
    [],
  );

  const answerAsk = async (allow: boolean) => {
    setAskOpen(false);
    await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => {});
    if (allow) await requestNotificationPermission();
  };

  const value = useMemo<TimersApi>(() => ({ timers, now, support, start, pause, resume, restart, stop }), [timers, now, support, start, pause, resume, restart, stop]);

  return (
    <TimersContext.Provider value={value}>
      {children}
      <RingingBanner timers={ringing} onStop={stop} />
      <AskNotifications open={askOpen} onAnswer={answerAsk} />
    </TimersContext.Provider>
  );
}

/** "Time's up" on any screen except Cook Mode (which shows its own big bar). */
function RingingBanner({ timers, onStop }: { timers: engine.CookTimer[]; onStop: (id: string) => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const first = timers[0];
  if (!first || path.startsWith('/cook/')) return null;
  return (
    <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)} style={[styles.banner, { top: insets.top + 8, backgroundColor: t.colors.destructive }]} accessibilityRole="alert" testID="global-timer-done">
      <PressableScale onPress={() => router.push({ pathname: '/cook/[id]', params: { id: first.recipeId } })} style={styles.bannerMain} accessibilityLabel={`Time’s up: ${first.label}, ${first.recipeTitle}. Open Cook Mode`}>
        <Icon name="timer" size={20} color="#FFFFFF" weight="bold" />
        <View style={{ flex: 1 }}>
          <Text style={[t.type.headline, { color: '#FFFFFF' }]}>Time’s up: {first.label}</Text>
          <Text style={[t.type.footnote, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={1}>
            {first.recipeTitle} · Step {first.step}
          </Text>
        </View>
      </PressableScale>
      <PressableScale onPress={() => onStop(first.id)} accessibilityLabel="Stop alarm" style={styles.stopBtn}>
        <Text style={[t.type.headline, { color: t.colors.destructive }]}>Stop</Text>
      </PressableScale>
    </Animated.View>
  );
}

/** The cat explains why notifications help, before iOS asks. */
export function AskNotifications({ open, onAnswer }: { open: boolean; onAnswer: (allow: boolean) => void }) {
  const t = useTheme();
  const buddy = useBuddy();
  const line =
    buddy === 'tank'
      ? { text: 'Want me to call you even when your phone’s locked? Allow notifications and I’ll ring when the timer’s done. Nothing else, promise.', mood: 'think' as const }
      : { text: 'Can I ring you when the timer’s done, even if your phone is locked? Allow notifications and I’ll only use them for timers!', mood: 'happy' as const };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => onAnswer(false)}>
      <View style={[styles.scrim, { backgroundColor: t.colors.scrim }]}>
        <View style={[styles.sheet, { backgroundColor: t.colors.background, ...t.chunky.card }]} testID="ask-notifications">
          <CatSays buddy={buddy} line={line} size={100} layout="column" />
          <Button label="Allow notifications" icon="timer" onPress={() => { haptics.select(); onAnswer(true); }} style={{ marginTop: 16 }} />
          <Button label="Not now" variant="plain" onPress={() => onAnswer(false)} accessibilityLabel="Not now, keep the timer in the app" />
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center' }]}>You can change this anytime in Settings → Notifications.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 18, paddingLeft: 14, paddingRight: 8, minHeight: 60, borderCurve: 'continuous', zIndex: 1000 },
  bannerMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
  stopBtn: { minHeight: 44, minWidth: 76, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  scrim: { flex: 1, justifyContent: 'center', padding: 20 },
  sheet: { borderRadius: 26, padding: 20, gap: 8, width: '100%', maxWidth: 440, alignSelf: 'center', borderCurve: 'continuous' },
});
