/**
 * Lets Biscuit's eyes follow your finger. The root layout wraps the app in <LookProvider>, which
 * records where the screen was last touched; each mascot turns its pupils toward that point for a
 * moment, then goes back to looking around by itself.
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

export type Look = {
  /** Last touch, in window coordinates. */
  x: SharedValue<number>;
  y: SharedValue<number>;
  /** Time of the last touch (ms). Eyes follow for a short while after it. */
  at: SharedValue<number>;
};

const LookContext = createContext<Look | null>(null);
export const useLook = () => useContext(LookContext);

/** How long the eyes stay on the last touch (kept with the other motion values). */
export { FOLLOW_MS } from './springs';

export function LookProvider({ children }: { children: ReactNode }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const at = useSharedValue(0);
  const look = useMemo(() => ({ x, y, at }), [x, y, at]);

  // On the web, follow the mouse too.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      at.set(Date.now());
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
    };
  }, [x, y, at]);

  const touch = (e: { nativeEvent: { pageX: number; pageY: number } }) => {
    x.set(e.nativeEvent.pageX);
    y.set(e.nativeEvent.pageY);
    at.set(Date.now());
  };

  return (
    <LookContext.Provider value={look}>
      {/* Watching touches here never blocks them: buttons and scrolling work as usual. */}
      <View style={{ flex: 1 }} onTouchStart={touch} onTouchMove={touch}>
        {children}
      </View>
    </LookContext.Provider>
  );
}
