import { useEffect, useState, type ComponentRef, type RefObject } from 'react';
import { AppState, Dimensions, type View } from 'react-native';

/** How often to check whether the mascot is on screen (ms). Cheap: one layout read. */
const CHECK_MS = 700;

/**
 * True while the view is (at least partly) inside the window and the app is in the foreground.
 * The rig uses it to stop breathing, blinks and loops when nobody can see them.
 */
export function useOnScreen(ref: RefObject<ComponentRef<typeof View> | null>) {
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [inside, setInside] = useState(true);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!active) return;
    const check = () => {
      ref.current?.measureInWindow((x, y, w, h) => {
        const win = Dimensions.get('window');
        // A view that isn't laid out (or is in a hidden screen) reports zero size.
        const on = w > 0 && h > 0 && x + w > 0 && y + h > 0 && x < win.width && y < win.height;
        setInside((prev) => (prev === on ? prev : on));
      });
    };
    check();
    const id = setInterval(check, CHECK_MS);
    return () => clearInterval(id);
  }, [active, ref]);

  return active && inside;
}
