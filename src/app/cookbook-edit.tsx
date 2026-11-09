import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

/**
 * Sheet to create a cookbook (no id) or rename one (?id=).
 * With ?addRecipe=<id>, the new cookbook starts with that recipe in it.
 */
export default function CookbookEdit() {
  const t = useTheme();
  const toast = useToast();
  const { id, addRecipe } = useLocalSearchParams<{ id?: string; addRecipe?: string }>();
  const { cookbooks, addCookbook, renameCookbook, toggleInCookbook } = useStore();
  const existing = cookbooks.find((c) => c.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const valid = name.trim().length > 0;

  const save = () => {
    if (!valid) return;
    if (existing) {
      renameCookbook(existing.id, name);
      toast({ message: `Renamed to ${name.trim()}`, icon: 'edit' });
    } else {
      const newId = addCookbook(name);
      if (addRecipe) toggleInCookbook(newId, addRecipe);
      toast({ message: `Created ${name.trim()}`, icon: 'book' });
    }
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <PageHeader title={existing ? 'Rename Cookbook' : 'New Cookbook'} mode="cancel" inSheet />
      <View style={styles.body}>
        <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginBottom: 6, marginLeft: 4 }]}>NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Meal prep, Date night"
          placeholderTextColor={t.colors.tertiaryLabel}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={save}
          maxLength={40}
          accessibilityLabel="Cookbook name"
          style={[t.type.body, styles.input, { color: t.colors.label, backgroundColor: t.colors.cell, ...t.chunky.card }]}
        />
        <Button label={existing ? 'Save' : 'Create Cookbook'} icon={existing ? 'check' : 'plus'} onPress={save} disabled={!valid} style={{ marginTop: 20 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16 },
  input: { minHeight: 50, borderRadius: 14, paddingHorizontal: 14, borderCurve: 'continuous', outlineStyle: 'none' } as never,
});
