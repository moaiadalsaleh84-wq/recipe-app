import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { haptics } from './haptics';

const CHIME = require('../../assets/sounds/timer-chime.wav');
/** Stop ringing on its own after this long, in case nobody is in the kitchen. */
const MAX_RING_MS = 60_000;
const BUZZ_EVERY_MS = 1900;

/**
 * Kitchen-timer alarm: a looping chime plus repeated vibration until stopped.
 * Plays in silent mode (like the Clock app) and lowers other audio instead of cutting it off.
 */
export function useAlarm() {
  const player = useRef<AudioPlayer | null>(null);
  const buzz = useRef<ReturnType<typeof setInterval>>(undefined);
  const autoStop = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load once when the screen opens so the chime starts instantly; release on leave.
  useEffect(() => {
    try {
      player.current = createAudioPlayer(CHIME);
    } catch {
      player.current = null;
    }
    return () => {
      clearInterval(buzz.current);
      clearTimeout(autoStop.current);
      try {
        player.current?.remove();
      } catch {
        // already released
      }
      player.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    clearInterval(buzz.current);
    clearTimeout(autoStop.current);
    try {
      player.current?.pause();
    } catch {
      // nothing playing
    }
  }, []);

  const start = useCallback(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
    const p = player.current;
    if (p) {
      try {
        p.loop = true;
        p.seekTo(0).catch(() => {});
        p.play();
      } catch {
        // No sound available (e.g. a browser blocking autoplay); vibration and visuals still work.
      }
    }
    haptics.warning();
    clearInterval(buzz.current);
    buzz.current = setInterval(() => haptics.warning(), BUZZ_EVERY_MS);
    clearTimeout(autoStop.current);
    autoStop.current = setTimeout(stop, MAX_RING_MS);
  }, [stop]);

  return { start, stop };
}
