import { useEffect } from 'react';
import { refreshEntitlement } from '../lib/purchases';
import { useStore } from '../state/store';

/** With real purchases on, asks the store for the current subscription once per launch (renewals, cancellations). Renders nothing. */
export function EntitlementSync() {
  const { setPro } = useStore();
  useEffect(() => {
    refreshEntitlement().then((ent) => {
      if (ent !== undefined) setPro(ent);
    });
  }, [setPro]);
  return null;
}
