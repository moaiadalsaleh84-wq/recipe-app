/**
 * Home: "Most popular this week" (most saved in the last 7 days) from Discover, opening the full
 * Discover screen. With no saves this week yet: "New in Discover". With nothing published, or
 * offline: the section isn't shown at all.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { discoverHome, type DiscoverCardData } from '../lib/discoverApi';
import { useTheme } from '../theme';
import { DiscoverCard } from './DiscoverCard';
import { SectionHeader } from './ui';

export function DiscoverRow({ width }: { width: number }) {
  const t = useTheme();
  const [row, setRow] = useState<{ kind: 'popular' | 'new'; items: DiscoverCardData[] } | null>(null);
  // Fresh each time Home is shown (saves change the order).
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      discoverHome().then((res) => {
        if (alive) setRow(res.ok ? { kind: res.kind, items: res.items } : null);
      });
      return () => {
        alive = false;
      };
    }, []),
  );
  if (!row || row.items.length === 0) return null;
  return (
    <View testID="discover-row">
      <SectionHeader
        title={row.kind === 'popular' ? 'Most popular this week' : 'New in Discover'}
        subtitle="Recipes from creators we love"
        action={{ label: 'See all', onPress: () => router.push('/discover') }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -t.layout.screen }} contentContainerStyle={[styles.rail, { paddingHorizontal: t.layout.screen, gap: t.spacing.sm }]}>
        {row.items.map((c) => (
          <DiscoverCard key={c.id} card={c} width={width} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { alignItems: 'stretch', paddingBottom: 4 },
});
