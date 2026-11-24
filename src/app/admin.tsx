/**
 * Admin mode, for the owner only. Turning it on sends the code to the server, which compares it
 * with the DISCOVER_ADMIN_TOKEN secret (stored only there). Every admin action is checked again on
 * the server. Here: reports on Discover recipes, each to restore or remove.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { PhotoFrame } from '../components/PhotoFrame';
import { PopButton } from '../components/pop/PopButton';
import { PopCard } from '../components/pop/PopCard';
import { Text } from '../components/Text';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import type { Recipe } from '../data/mock';
import { REPORT_LABELS, adminReports, adminResolve, turnOffAdmin, turnOnAdmin, useAdminMode, type AdminReport } from '../lib/discoverApi';
import { haptics } from '../lib/haptics';
import { pop, useTheme } from '../theme';

export default function AdminScreen() {
  const t = useTheme();
  const toast = useToast();
  const admin = useAdminMode();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [reports, setReports] = useState<AdminReport[] | null>(null);

  const load = useCallback(() => {
    if (!admin) return;
    adminReports().then((res) => {
      if (res.ok) setReports(res.reports);
      else toast({ message: res.message, tone: 'warning' });
    });
  }, [admin, toast]);
  useFocusEffect(load);

  const turnOn = async () => {
    setBusy(true);
    const res = await turnOnAdmin(code);
    setBusy(false);
    if (res.ok) {
      haptics.success();
      setCode('');
      toast({ message: 'Admin mode is on', icon: 'check', tone: 'success' });
    } else toast({ message: res.message ?? 'That code isn’t right.', tone: 'warning' });
  };

  const resolve = async (r: AdminReport, what: 'restore' | 'remove') => {
    const res = await adminResolve(r.recipe.id, what);
    if (!res.ok) return toast({ message: res.message, tone: 'warning' });
    toast({ message: what === 'restore' ? 'Back in Discover' : 'Removed from Discover', icon: 'check' });
    load();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <PageHeader title="Admin" mode="cancel" cancelLabel="Done" inSheet />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!admin ? (
          <>
            <Text style={[t.type.body, { color: t.colors.label }]}>For the app’s owner. Type your admin code to publish recipes to Discover and review reports.</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Admin code"
              placeholderTextColor={t.colors.tertiaryLabel}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={[t.type.input, styles.input, { color: t.colors.label, backgroundColor: t.colors.cell, ...t.chunky.card }]}
              accessibilityLabel="Admin code"
              testID="admin-code"
            />
            <Button label={busy ? 'Checking…' : 'Turn on admin mode'} onPress={() => void turnOn()} disabled={!code.trim() || busy} />
          </>
        ) : (
          <>
            <Text style={[t.type.body, { color: t.colors.label }]}>Admin mode is on. Imported recipes show “Publish to Discover”. Only you see it.</Text>
            <Text style={[t.type.title2, { color: t.colors.label, marginTop: 8 }]} accessibilityRole="header">
              Reports
            </Text>
            {reports === null ? (
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>Loading…</Text>
            ) : reports.length === 0 ? (
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]} testID="no-reports">
                No reports. Nothing is hidden.
              </Text>
            ) : (
              reports.map((r) => (
                <PopCard key={r.id} radius={20} depth={4} contentStyle={styles.report} testID="admin-report">
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <PhotoFrame recipe={{ id: r.recipe.id, title: r.recipe.title, image: r.recipe.imageUrl ? { uri: r.recipe.imageUrl } : null, ingredients: [], steps: [] } as unknown as Recipe} radius={14} square style={{ width: 56, height: 56 }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[t.type.headline, { color: t.colors.label }]} numberOfLines={2}>
                        {r.recipe.title}
                      </Text>
                      <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{r.recipe.creatorHandle}</Text>
                    </View>
                  </View>
                  <Text style={[t.type.subhead, { color: t.colors.label }]}>
                    {REPORT_LABELS[r.reason]} · {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{r.status === 'reported' ? 'Hidden from Discover until you decide.' : `Now: ${r.status}`}</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <PopButton label="Restore" size="small" color={pop.leaf} onPress={() => void resolve(r, 'restore')} style={{ flex: 1 }} />
                    <PopButton label="Remove" size="small" color={pop.white} onPress={() => void resolve(r, 'remove')} style={{ flex: 1 }} />
                  </View>
                </PopCard>
              ))
            )}
            <Button
              label="Turn off admin mode"
              variant="plain"
              onPress={() => {
                void turnOffAdmin();
                router.back();
              }}
              style={{ marginTop: 16 }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  input: { borderRadius: 16, paddingHorizontal: 14, minHeight: 48 },
  report: { padding: 14, gap: 10 },
});
