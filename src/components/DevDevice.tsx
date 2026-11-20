/**
 * Test-only: makes the web build behave like an iPhone screen, so the layout audit can check that
 * nothing sits under the clock or the home indicator. Turned on with
 *   localStorage['pantry-pop-dev-device'] = '1'
 * and only in builds made with EXPO_PUBLIC_DEV_ROUTES=1. It does nothing in the real app.
 */
import { pop } from '../theme';
import { useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

const INSETS = { top: 59, bottom: 34, left: 0, right: 0 };

function enabled() {
  if (process.env.EXPO_PUBLIC_DEV_ROUTES !== '1' || Platform.OS !== 'web') return false;
  try {
    return window.localStorage.getItem('pantry-pop-dev-device') === '1';
  } catch {
    return false;
  }
}

export function DevDevice({ children }: { children: ReactNode }) {
  const [on] = useState(enabled);
  if (!on) return children;
  return (
    <SafeAreaInsetsContext.Provider value={INSETS}>
      {children}
      {/* A see-through status bar and home indicator, drawn on top. The audit ignores them when
          it looks at what is underneath. */}
      <View pointerEvents="none" style={[styles.status, { height: INSETS.top }]} testID="dev-status-bar">
        <Text style={styles.clock}>9:41</Text>
      </View>
      <View pointerEvents="none" style={[styles.home, { height: INSETS.bottom }]} testID="dev-home-indicator">
        <View style={styles.bar} />
      </View>
    </SafeAreaInsetsContext.Provider>
  );
}

const styles = StyleSheet.create({
  status: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, justifyContent: 'center', paddingLeft: 32 },
  clock: { fontSize: 17, fontWeight: '600', color: pop.ink, opacity: 0.85 },
  home: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 9999, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 },
  bar: { width: 134, height: 5, borderRadius: 3, backgroundColor: pop.ink, opacity: 0.85 },
});
