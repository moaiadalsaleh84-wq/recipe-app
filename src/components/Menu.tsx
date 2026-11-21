import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { popoverIn } from '../motion';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Lift } from './pop/Lift';

export type MenuRow = {
  label: string;
  hint?: string;
  icon?: IconName;
  /** Shows a check: the current choice (e.g. the sort order). */
  selected?: boolean;
  onPress: () => void;
};

/**
 * A small floating menu anchored near the top right of the screen (the + menu, sort options).
 * Tapping outside closes it.
 */
export function Menu({ visible, onClose, rows, top = 64, label }: { visible: boolean; onClose: () => void; rows: MenuRow[]; top?: number; label: string }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.scrim }]} onPress={onClose} accessibilityLabel="Close menu" />
      {/* Grows out of the button's corner (top right), not out of nowhere. */}
      <Animated.View entering={popoverIn(reduceMotion)} style={[styles.menu, { top: insets.top + top, transformOrigin: 'top right' }]}>
      <Lift radius={20}>
        <View style={[styles.menuFace, { backgroundColor: t.colors.elevated, ...t.chunky.card }]} accessibilityRole="menu" accessibilityLabel={label}>
          {rows.map((r, i) => (
            <PressableScale
              key={r.label}
              onPress={r.onPress}
              accessibilityLabel={r.label}
              accessibilityRole="menuitem"
              aria-selected={r.selected}
              style={[styles.row, i > 0 && { borderTopWidth: 1.5, borderTopColor: t.colors.separator }]}
              scaleTo={0.98}
            >
              {r.icon && (
                <View style={[styles.icon, { backgroundColor: t.colors.tintSoft }]}>
                  <Icon name={r.icon} size={18} color={t.colors.tint} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[t.type.headline, { color: t.colors.label }]}>{r.label}</Text>
                {r.hint && <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{r.hint}</Text>}
              </View>
              {r.selected && <Icon name="check" size={16} color={t.colors.tint} weight="bold" />}
            </PressableScale>
          ))}
        </View>
      </Lift>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menu: { position: 'absolute', right: 16, width: 300, maxWidth: '92%' },
  menuFace: { borderRadius: 20, overflow: 'hidden', borderCurve: 'continuous' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
