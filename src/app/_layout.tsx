import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { EntitlementSync } from '../components/EntitlementSync';
import { ProgressWatcher } from '../components/ProgressWatcher';
import { ReminderSync } from '../components/ReminderSync';
import { NotificationTaps } from '../components/NotificationTaps';
import { ToastProvider } from '../components/Toast';
import { ImportUpkeep } from '../components/ImportUpkeep';
import { StoreProvider, useStore } from '../state/store';
import { TimersProvider } from '../state/timers';
import { DevDevice } from '../components/DevDevice';
import { LookProvider } from '../components/mascot/look';
import { loadAppearance, useTheme } from '../theme';

// Keep the splash screen up until the fonts are loaded, so text never flashes in the wrong font.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Waits for saved data to load so screens never flash default content. */
function Hydrated({ children }: { children: ReactNode }) {
  const { hydrated } = useStore();
  return hydrated ? children : null;
}

export default function RootLayout() {
  const t = useTheme();
  // Titles use Fredoka, everything else Nunito. If they fail to load, the system font takes over.
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  useEffect(loadAppearance, []);
  const ready = fontsLoaded || !!fontError;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  const navTheme = useMemo(() => {
    const base = t.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: t.colors.tint,
        background: t.colors.background,
        card: t.colors.cell,
        text: t.colors.label,
        border: t.colors.separator,
        notification: t.colors.accent,
      },
    };
  }, [t]);

  const sheet = {
    presentation: 'formSheet' as const,
    sheetAllowedDetents: [0.75, 1],
    sheetGrabberVisible: true,
    sheetCornerRadius: t.radius.xl,
    contentStyle: { backgroundColor: t.colors.groupedBackground },
  };

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <ThemeProvider value={navTheme}>
        <DevDevice>
        <LookProvider>
        <StoreProvider>
          <ToastProvider>
            <StatusBar style={t.isDark ? 'light' : 'dark'} />
            <Hydrated>
              <TimersProvider>
              <ProgressWatcher />
              <ReminderSync />
              <NotificationTaps />
              <EntitlementSync />
              <ImportUpkeep />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.background } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
                <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
                <Stack.Screen name="recipe/[id]" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="recipe/new" options={{ presentation: 'modal', contentStyle: { backgroundColor: t.colors.groupedBackground } }} />
                <Stack.Screen name="import" options={{ presentation: 'modal', contentStyle: { backgroundColor: t.colors.groupedBackground } }} />
                <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
                <Stack.Screen name="privacy" options={{ presentation: 'modal', contentStyle: { backgroundColor: t.colors.groupedBackground } }} />
                <Stack.Screen name="photo-credits" options={{ presentation: 'modal', contentStyle: { backgroundColor: t.colors.groupedBackground } }} />
                <Stack.Screen name="cook/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
                <Stack.Screen name="cookbook/[id]" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="plan-picker" options={sheet} />
                <Stack.Screen name="add-to-list" options={sheet} />
                <Stack.Screen name="add-items" options={{ ...sheet, sheetAllowedDetents: [0.6, 1] }} />
                <Stack.Screen name="save-to-cookbook" options={sheet} />
                <Stack.Screen name="buddy-pick" options={{ ...sheet, sheetAllowedDetents: [0.85] }} />
                <Stack.Screen name="cookbook-edit" options={{ ...sheet, sheetAllowedDetents: [0.45] }} />
                <Stack.Screen name="progress" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="report/[id]" options={{ ...sheet, sheetAllowedDetents: [0.6] }} />
                <Stack.Screen name="publish/[id]" options={{ presentation: 'modal', contentStyle: { backgroundColor: t.colors.groupedBackground } }} />
                <Stack.Screen name="admin" options={{ presentation: 'modal', contentStyle: { backgroundColor: t.colors.groupedBackground } }} />
              </Stack>
              </TimersProvider>
            </Hydrated>
          </ToastProvider>
        </StoreProvider>
        </LookProvider>
        </DevDevice>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
