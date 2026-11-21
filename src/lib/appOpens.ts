/**
 * Counts app opens (once per launch) and remembers if the Home import tip was closed, so the tip
 * shows on the first 3 opens only, and never again once dismissed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const OPENS_KEY = 'pantry-pop-app-opens';
const TIP_KEY = 'pantry-pop-import-tip-dismissed';
const TIP_OPENS = 3;

let opens: Promise<number> | null = null;
/** This launch's open number (1 on the first launch). Counted once per launch. */
function countOpen() {
  opens ??= (async () => {
    try {
      const n = Number(await AsyncStorage.getItem(OPENS_KEY)) + 1 || 1;
      await AsyncStorage.setItem(OPENS_KEY, String(n));
      return n;
    } catch {
      return 1;
    }
  })();
  return opens;
}

export function useImportTip() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([countOpen(), AsyncStorage.getItem(TIP_KEY).catch(() => null)]).then(([n, dismissed]) => {
      if (live) setShow(n <= TIP_OPENS && dismissed !== '1');
    });
    return () => {
      live = false;
    };
  }, []);
  const dismiss = () => {
    setShow(false);
    AsyncStorage.setItem(TIP_KEY, '1').catch(() => {});
  };
  return { show, dismiss };
}
