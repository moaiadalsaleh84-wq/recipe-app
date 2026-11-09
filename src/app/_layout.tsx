import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '../components/Toast';
import { StoreProvider, useStore } from '../state/store';
import { useTheme } from '../theme';

/** Waits for saved data to load so screens never flash default content. */
function Hydrated({ children }: { children: ReactNode }) {
  const { hydrated } = useStore();
  return hydrated ? children : null;
}

export default function RootLayout() {
  const t = useTheme();

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

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <ThemeProvider value={navTheme}>
        <StoreProvider>
          <ToastProvider>
            <StatusBar style="auto" />
            <Hydrated>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.background } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
                <Stack.Screen name="recipe/[id]" />
                <Stack.Screen name="recipe/new" options={{ presentation: 'modal', contentStyle: { backgroundColor: t.colors.groupedBackground } }} />
                <Stack.Screen name="cook/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
                <Stack.Screen name="cookbook/[id]" />
                <Stack.Screen name="plan-picker" options={sheet} />
                <Stack.Screen name="save-to-cookbook" options={sheet} />
                <Stack.Screen name="cookbook-edit" options={{ ...sheet, sheetAllowedDetents: [0.45] }} />
              </Stack>
            </Hydrated>
          </ToastProvider>
        </StoreProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
