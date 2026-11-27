/**
 * A tiny signal for "the fox should react": anything (a heart, a checked list) can call
 * `foxReact('happy')`, and a visible fox with `reacts` shows that pose for a moment.
 */
import type { FoxPose } from './foxPoses';

type Listener = (pose: FoxPose) => void;
const listeners = new Set<Listener>();

export function foxReact(pose: FoxPose) {
  listeners.forEach((l) => l(pose));
}

export function onFoxReact(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
