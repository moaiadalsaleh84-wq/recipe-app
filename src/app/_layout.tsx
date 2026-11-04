import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '../components/Toast';
import { StoreProvider } from '../state/store';
import { useTheme } from '../theme';

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

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <ThemeProvider value={navTheme}>
        <StoreProvider>
          <ToastProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.background } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="recipe/[id]" />
              <Stack.Screen
                name="plan-picker"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [0.7, 1],
                  sheetGrabberVisible: true,
                  sheetCornerRadius: t.radius.xl,
                  contentStyle: { backgroundColor: t.colors.groupedBackground },
                }}
              />
            </Stack>
          </ToastProvider>
        </StoreProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
