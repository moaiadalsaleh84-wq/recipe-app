import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

type ToastOptions = {
  message: string;
  icon?: IconName;
  tone?: 'success' | 'info' | 'warning';
  action?: { label: string; onPress: () => void };
  /** Wait for the current toast to finish instead of replacing it (for celebrations). */
  queue?: boolean;
};
type ToastState = ToastOptions & { id: number };

const ToastContext = createContext<(t: ToastOptions) => void>(() => {});

/** `const toast = useToast(); toast({ message: 'Saved' })` */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const seq = useRef(0);

  const waiting = useRef<ToastOptions[]>([]);
  const current = useRef<ToastState | null>(null);

  const present = useCallback((t: ToastOptions) => {
    if (t.tone === 'warning') haptics.warning();
    else if (t.tone !== 'info') haptics.success();
    seq.current += 1;
    const next = { ...t, id: seq.current };
    current.current = next;
    setToast(next);
  }, []);

  const show = useCallback(
    (t: ToastOptions) => {
      if (t.queue && current.current) waiting.current.push(t);
      else present(t);
    },
    [present],
  );

  const finished = useCallback(
    (id: number) => {
      if (current.current?.id !== id) return;
      current.current = null;
      setToast(null);
      const queued = waiting.current.shift();
      if (queued) setTimeout(() => present(queued), 250);
    },
    [present],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <ToastView key={toast.id} toast={toast} onDone={() => finished(toast.id)} />}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDone }: { toast: ToastState; onDone: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const timer = setTimeout(onDone, t.motion.toastDuration);
    return () => clearTimeout(timer);
  }, [onDone, t.motion.toastDuration]);

  const toneColor =
    toast.tone === 'warning' ? t.colors.warning : toast.tone === 'info' ? t.colors.tint : t.colors.success;
  const icon: IconName = toast.icon ?? (toast.tone === 'warning' ? 'warning' : toast.tone === 'info' ? 'info' : 'checkCircle');

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + t.spacing.xs }]}>
      <Animated.View
        // A short drop-in from just above, no spring, so it never bounces.
        entering={FadeInDown.duration(220)}
        exiting={FadeOutUp.duration(160)}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.toast,
          { backgroundColor: t.colors.elevated, borderColor: t.colors.separator, ...t.shadow.floating },
        ]}
      >
        <PressableScale onPress={onDone} haptic={null} style={styles.main} accessibilityLabel={`${toast.message}. Dismiss`}>
          <Icon name={icon} size={22} color={toneColor} weight="semibold" />
          <Text style={[t.type.subhead, styles.message, { color: t.colors.label }]} numberOfLines={2}>
            {toast.message}
          </Text>
        </PressableScale>
        {toast.action && (
          <PressableScale
            onPress={() => {
              toast.action?.onPress();
              onDone();
            }}
            style={styles.action}
            accessibilityLabel={toast.action.label}
          >
            <Text style={[t.type.headline, { color: t.colors.tint }]}>{toast.action.label}</Text>
          </PressableScale>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    maxWidth: 440,
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 16,
    paddingRight: 6,
    minHeight: 52,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  message: { flex: 1, fontWeight: '500' },
  action: { minHeight: 44, minWidth: 60, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
});

