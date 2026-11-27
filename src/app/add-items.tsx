/**
 * "Add to groceries": the sheet behind the shopping list's + button. One big box: type or paste
 * what you need, one per line (commas work too), then Done. Each line becomes its own item.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PopButton } from '../components/pop/PopButton';
import { PressableScale } from '../components/PressableScale';
import { Text } from '../components/Text';
import { useToast } from '../components/Toast';
import { splitItems } from '../lib/groceries';
import { haptics } from '../lib/haptics';
import { isIOS } from '../navigation/screenOptions';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

export default function AddItems() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { addCustomItem } = useStore();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const items = splitItems(text);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/groceries'));
  const done = () => {
    if (!items.length) return;
    items.forEach((n) => addCustomItem(n));
    haptics.success();
    close();
    toast({ message: items.length === 1 ? `Added ${items[0]}` : `Added ${items.length} items`, icon: 'cart' });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <View style={[styles.header, { paddingTop: isIOS ? 14 : insets.top + 8, borderBottomColor: t.colors.separator }]}>
        <PressableScale onPress={close} style={styles.side} accessibilityLabel="Cancel">
          <Text style={[t.type.body, { color: t.colors.tint }]}>Cancel</Text>
        </PressableScale>
        <Text style={[t.type.headline, styles.title, { color: t.colors.label }]} accessibilityRole="header">
          Add to groceries
        </Text>
        <View style={styles.side} />
      </View>
      <View style={styles.body}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={'Type or paste what you need,\none per line'}
          placeholderTextColor={t.colors.tertiaryLabel}
          multiline
          autoFocus
          maxLength={2000}
          maxFontSizeMultiplier={1.3}
          accessibilityLabel="Groceries to add, one per line"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          // Like the "Add an item" box: a soft fill and a 2px border that turns sky while you type.
          style={[t.type.body, styles.box, { color: t.colors.label, backgroundColor: t.colors.fill, borderColor: focused ? t.pop.sky : t.colors.border }]}
          testID="add-items-input"
        />
        <PopButton label={items.length > 1 ? `Add ${items.length} items` : 'Done'} icon={items.length ? 'cartAdd' : undefined} onPress={done} disabled={!items.length} testID="add-items-done" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  side: { minWidth: 72, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  title: { flex: 1, textAlign: 'center' },
  body: { padding: 20, gap: 16 },
  box: { minHeight: 140, maxHeight: 260, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderRadius: 16, borderWidth: 2, borderCurve: 'continuous', textAlignVertical: 'top', outlineStyle: 'none' } as never,
});
