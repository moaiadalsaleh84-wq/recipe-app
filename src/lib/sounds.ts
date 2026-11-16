import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const SUCCESS = require('../../assets/sounds/success.wav');
let player: AudioPlayer | null = null;

/**
 * A short, happy chime for the best moment in the app: finishing a recipe.
 * It follows the phone's silent switch (unlike the timer alarm), and does nothing if sound
 * isn't available.
 */
export function playSuccess() {
  try {
    player ??= createAudioPlayer(SUCCESS);
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // No sound (e.g. a browser blocking autoplay): the confetti and haptic still happen.
  }
}
