import { useEffect } from 'react';
import { setSoundsEnabled } from '../lib/sounds';
import { useStore } from '../state/store';

/** Keeps the sound player in step with Settings → Sounds (on by default). Renders nothing. */
export function SoundSync() {
  const { profile } = useStore();
  const on = profile.sounds !== false;
  useEffect(() => setSoundsEnabled(on), [on]);
  return null;
}
