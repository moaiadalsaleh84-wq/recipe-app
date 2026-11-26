/**
 * On an imported recipe's page, in admin mode only: publish it to Discover, or take it off.
 * Admin mode is decided by the server (the code saved on this phone must match its secret);
 * everyone else never sees this card.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import type { Recipe } from '../data/mock';
import { adminStatus, adminUnpublish, useAdminMode, type DiscoverCardData } from '../lib/discoverApi';
import { pop, useTheme } from '../theme';
import { savesLabel } from './DiscoverCard';
import { Icon } from './Icon';
import { PopButton } from './pop/PopButton';
import { Text } from './Text';
import { useToast } from './Toast';

export function AdminPublishCard({ recipe }: { recipe: Recipe }) {
  const t = useTheme();
  const admin = useAdminMode();
  const toast = useToast();
  const [item, setItem] = useState<(DiscoverCardData & { status: string }) | null | undefined>(undefined);
  const load = useCallback(() => {
    if (!admin || !recipe.sourceUrl) return;
    adminStatus(recipe.sourceUrl).then((res) => setItem(res.ok ? res.item : null));
  }, [admin, recipe.sourceUrl]);
  // Again after coming back from the publish screen.
  useFocusEffect(load);

  if (!admin || !recipe.custom || !recipe.sourceUrl) return null;
  const published = item?.status === 'published';
  const openPublish = () => router.push({ pathname: '/publish/[id]', params: { id: recipe.id } });
  const unpublish = async () => {
    if (!item) return;
    const res = await adminUnpublish(item.id);
    if (res.ok) {
      toast({ message: 'Taken off Discover', icon: 'check' });
      load();
    } else toast({ message: res.message, tone: 'warning' });
  };

  return (
    <View style={[styles.card, { backgroundColor: t.pop.lilacTint, borderColor: t.colors.border }]} testID="admin-publish">
      <View style={styles.head}>
        <Icon name="crown" size={16} color={pop.ink} weight="bold" />
        <Text style={[t.type.footnote, { color: pop.ink, fontFamily: t.fonts.black, flex: 1 }]}>Admin · only you see this</Text>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[t.type.headline, { color: pop.ink }]}>Publish to Discover</Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} testID="admin-publish-status">
            {item === undefined
              ? 'Checking…'
              : published
                ? `Published · ${savesLabel(item!.saves)}`
                : item?.status === 'reported'
                  ? 'Hidden: reported (see Admin in Settings)'
                  : item?.status === 'unpublished' || item?.status === 'removed'
                    ? 'Not in Discover now'
                    : 'Not published'}
          </Text>
        </View>
        <Switch
          value={published}
          onValueChange={(on) => (on ? openPublish() : void unpublish())}
          trackColor={{ true: pop.leaf, false: pop.white }}
          ios_backgroundColor={pop.white}
          accessibilityLabel="Publish to Discover"
          testID="admin-publish-switch"
        />
      </View>
      {published && (
        <View style={styles.buttons}>
          <PopButton label="Edit" accessibilityLabel="Edit and publish again" size="small" color={pop.white} onPress={openPublish} style={{ flex: 1 }} />
          <PopButton label="Unpublish" size="small" color={pop.white} onPress={() => void unpublish()} testID="admin-unpublish" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, borderRadius: 20, borderWidth: 2.5, padding: 14, gap: 10, borderCurve: 'continuous' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttons: { flexDirection: 'row', gap: 10 },
});
