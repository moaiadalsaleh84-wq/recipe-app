import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { pressSpring } from '../motion';
import { pop, stroke, useTheme } from '../theme';

/** iOS-like sheet curve: quick start, long soft landing. */
const EASE_DRAWER = Easing.bezier(0.32, 0.72, 0, 1);

type Props = {
  visible: boolean;
  /** Called once the sheet has finished sliding away. */
  onClose: () => void;
  /** Gets `close`, so buttons inside can slide the sheet away too. */
  children: (close: () => void) => ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * A sheet that slides up from the bottom and back down when it closes (✕, tap outside, Android back,
 * or dragging it down). The drag follows the finger 1:1, resists upward pulls, and a quick flick
 * closes it even from a short distance. With Reduce Motion it fades instead of sliding.
 */
export function BottomSheet({ visible, onClose, children, style, accessibilityLabel }: Props) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const { height: screenH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  // 0 = open, 1 = closed (off screen). Drag adds pixels on top.
  const closed = useSharedValue(1);
  const drag = useSharedValue(0);
  const sheetH = useSharedValue(screenH);

  const finish = () => {
    setMounted(false);
    onClose();
  };
  const close = () => {
    const done = (ok?: boolean) => {
      'worklet';
      if (ok) scheduleOnRN(finish);
    };
    closed.set(reduceMotion ? withTiming(1, { duration: 120 }, done) : withTiming(1, { duration: 220, easing: Easing.bezier(0.23, 1, 0.32, 1) }, done));
  };

  // Mount when asked to open; slide in after mounting.
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      drag.set(0);
      closed.set(reduceMotion ? withTiming(0, { duration: 150 }) : withTiming(0, { duration: 340, easing: EASE_DRAWER }));
    } else if (closed.get() < 1) {
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mounted]);

  const pan = usePanGesture({
    activeOffsetY: [-8, 8],
    onUpdate: (e) => {
      'worklet';
      // Down: 1:1 with the finger. Up: rubber-band resistance.
      drag.set(e.translationY > 0 ? e.translationY : e.translationY * 0.15);
    },
    onDeactivate: (e) => {
      'worklet';
      const flick = e.velocityY > 800;
      const far = e.translationY > sheetH.get() * 0.3;
      if (flick || far) {
        // Hand the drag over to the close animation from where the finger let go.
        const from = drag.get() / Math.max(1, sheetH.get());
        drag.set(0);
        closed.set(from);
        closed.set(withTiming(1, { duration: 200, easing: Easing.bezier(0.23, 1, 0.32, 1) }, (ok) => {
          if (ok) scheduleOnRN(finish);
        }));
      } else {
        drag.set(withSpring(0, pressSpring));
      }
    },
  });

  const sheetStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - closed.get() }
      : { transform: [{ translateY: closed.get() * (sheetH.get() + 40) + drag.get() }] },
  );
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(closed.get() + drag.get() / Math.max(1, sheetH.get()), [0, 1], [1, 0], 'clamp'),
  }));

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.scrim }, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        onLayout={(e) => sheetH.set(e.nativeEvent.layout.height)}
        style={[styles.sheet, style, sheetStyle]}
        accessibilityViewIsModal
        accessibilityLabel={accessibilityLabel}
      >
        {/* The grab area: the handle and the top of the sheet. */}
        <GestureDetector gesture={pan}>
          <View style={styles.grab} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.handle} />
          </View>
        </GestureDetector>
        {children(close)}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    backgroundColor: pop.white,
    borderWidth: stroke.thick,
    borderBottomWidth: 0,
    borderColor: pop.ink,
  },
  // A full 44pt grab area around the handle.
  grab: { height: 44, marginBottom: -12, alignItems: 'center', justifyContent: 'center', marginHorizontal: -20 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: pop.lilac },
});
