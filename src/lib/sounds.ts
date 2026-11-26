import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Soft app sounds: a tick when you check something off, a chime when you finish a recipe, a short
 * arpeggio for celebrations (streak, level up, badge). They follow the phone's silent switch and
 * mix with your music (unlike the timer alarm). Settings → Sounds turns them off (on by default).
 * If sound isn't available (e.g. a browser blocking autoplay), nothing happens.
 */
const FILES = {
  success: require('../../assets/sounds/success.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  celebrate: require('../../assets/sounds/celebrate.wav'),
} as const;
export type SoundName = keyof typeof FILES;

const players: Partial<Record<SoundName, AudioPlayer>> = {};
let enabled = true;
let alarmRinging = false;
let modeReady = false;

/** Settings → Sounds. */
export function setSoundsEnabled(on: boolean) {
  enabled = on;
}

/** The timer alarm plays through the silent switch; while it rings, app sounds leave its audio mode alone. */
export function markAlarmRinging(on: boolean) {
  alarmRinging = on;
  if (!on) modeReady = false;
}

export function playSound(name: SoundName) {
  if (!enabled) return;
  try {
    if (!modeReady && !alarmRinging) {
      modeReady = true;
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    }
    const player = (players[name] ??= createAudioPlayer(FILES[name]));
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // No sound here: the visuals and haptics still happen.
  }
}

/** Finishing a recipe. */
export const playSuccess = () => playSound('success');
