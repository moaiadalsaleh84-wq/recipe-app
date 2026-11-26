/**
 * "Getting started": one slim row (64 high) at the top of Recipes. It names the next step
 * ("Next: Create your first cookbook"), shows "2 of 4" with a progress bar, and tapping it goes
 * straight to that step. Each step ticks itself from what you've actually done (import, cookbook,
 * plan, cook). When all four are done, the row is gone.
 */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, useReducedMotion } from 'react-native-reanimated';
import { isImported } from './ImportCredit';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { ProgressBar } from './ui';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

type Props = {
  /** Opens importing (the same as the Import button). */
  onImport: () => void;
  /** Older prop (the example import lives on the import screen). */
  onExample?: () => void;
  /** Opens the first cookbook (respects the free limit). */
  onCookbook: () => void;
  /** Starts cooking tonight's pick. */
  onCook: () => void;
};

export function WelcomeChecklist({ onImport, onCookbook, onCook }: Props) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const { importsUsed, customRecipes, cookbooks, plan, cooked } = useStore();

  const steps: { id: string; label: string; icon: IconName; done: boolean; onPress: () => void }[] = [
    { id: 'import', label: 'Import a recipe', icon: 'link', done: importsUsed > 0 || customRecipes.some(isImported), onPress: onImport },
    { id: 'cookbook', label: 'Make a cookbook', icon: 'book', done: cookbooks.length > 0, onPress: onCookbook },
    { id: 'plan', label: 'Plan a meal', icon: 'calendar', done: Object.values(plan).some((day) => Object.values(day ?? {}).some(Boolean)), onPress: () => router.navigate('/plan') },
    { id: 'cook', label: 'Cook a recipe', icon: 'pot', done: cooked.length > 0, onPress: onCook },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  if (!next) return null;

  return (
    <Animated.View exiting={reduceMotion ? undefined : FadeOut.duration(160)} style={{ marginBottom: t.layout.section }}>
      <PressableScale
        onPress={next.onPress}
        scaleTo={0.98}
        accessibilityLabel={`Getting started, ${doneCount} of ${steps.length} done. Next: ${next.label}`}
        style={[styles.row, { backgroundColor: t.pop.sunshineTint }]}
        testID="welcome-checklist"
      >
        <View style={[styles.icon, { backgroundColor: t.pop.white }]}>
          <Icon name={next.icon} size={18} color={t.pop.ink} weight="bold" />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          {/* "Import a recipe · 0 of 4" on one line (it shrinks a little before it would wrap). */}
          <Text style={[t.type.headline, { color: t.colors.label }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {next.label}
            <Text style={{ color: t.colors.secondaryLabel }} testID="welcome-count">
              {` · ${doneCount} of ${steps.length}`}
            </Text>
          </Text>
          <ProgressBar value={doneCount / steps.length} color={t.pop.sunshine} track={t.pop.white} height={8} label="Getting started" />
        </View>
        <Icon name="chevronRight" size={14} color={t.colors.secondaryLabel} weight="bold" />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderCurve: 'continuous' },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
