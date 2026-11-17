/**
 * <Mascot> is the only way the app shows Biscuit.
 *
 *   <Mascot mood="happy" talking size={120} />
 *
 * Swapping in a Rive animation later: this file is the seam. The app passes a mood name
 * (see MOODS in moods.ts), whether Biscuit is talking, and a size; taps are handled here.
 * A Rive version would be a second renderer next to BiscuitRig, e.g.
 *
 *   <Rive resourceName="biscuit" stateMachineName="Biscuit" />
 *   // inputs: "mood" (number, the index in MOODS), "talking" (boolean),
 *   //         "lookX" / "lookY" (numbers, -1 to 1), "pet" (trigger)
 *
 * and nothing else in the app would change. react-native-rive needs a development build
 * (it doesn't run in Expo Go), which is why the SVG rig is the default.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { haptics } from '../../lib/haptics';
import { useStore } from '../../state/store';
import { BiscuitRig } from './BiscuitRig';
import type { Mood } from './moods';

export type MascotProps = {
  mood?: Mood;
  /** Moves the mouth, for while a speech bubble is typing. */
  talking?: boolean;
  size?: number;
  /** Called when Biscuit is tapped (it always reacts with hearts first). */
  onPet?: () => void;
  /** Set to false where Biscuit is decoration and shouldn't be a button. */
  petable?: boolean;
  /** Change this (e.g. to the line being said) to play the same mood again. */
  playKey?: string;
  /** Keep the mood's pose instead of relaxing afterwards (for still images). */
  hold?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Lab only: force Reduce Motion on, or draw the black silhouette. */
  reduceMotion?: boolean;
  silhouette?: boolean;
};

export const MASCOT_NAME = 'Biscuit';

export function Mascot({ mood = 'idle', talking = false, size = 160, onPet, petable = true, playKey = '', hold = false, style, accessibilityLabel, reduceMotion, silhouette }: MascotProps) {
  const { addPet } = useStore();
  // Each tap restarts the delighted reaction.
  const [pets, setPets] = useState(0);
  const [petted, setPetted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const rig = <BiscuitRig mood={petted ? 'love' : mood} talking={talking} size={size} playKey={petted ? `pet-${pets}` : playKey} hold={hold} reduceMotion={reduceMotion} silhouette={silhouette} />;
  if (!petable) return <View style={style}>{rig}</View>;

  return (
    <Pressable
      onPress={() => {
        haptics.select();
        addPet();
        setPets((n) => n + 1);
        setPetted(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setPetted(false), 2200);
        onPet?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Pet ${MASCOT_NAME}`}
      style={style}
    >
      {rig}
    </Pressable>
  );
}
