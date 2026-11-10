/**
 * Subscriptions.
 *
 * PRICES AND LINKS LIVE HERE. Change them in one place.
 *
 * This is a MOCK purchase layer so the paywall can be designed and tested without a store.
 * Before release: create the products in App Store Connect, then replace `purchase` and
 * `restore` with a real SDK (RevenueCat's `react-native-purchases` is the easiest with Expo)
 * and set `PURCHASES_ARE_MOCK` to false.
 */
export const PURCHASES_ARE_MOCK = true;

export type PlanId = 'yearly' | 'monthly';

export const PLANS: Record<PlanId, { productId: string; price: number; period: 'year' | 'month'; trialDays: number }> = {
  yearly: { productId: 'pro_yearly', price: 29.99, period: 'year', trialDays: 7 },
  monthly: { productId: 'pro_monthly', price: 4.99, period: 'month', trialDays: 0 },
};

export const CURRENCY = 'USD';
/** Replace with your real pages before submitting to the App Store (Apple requires both). */
export const TERMS_URL = 'https://example.com/terms';
export const PRIVACY_URL = 'https://example.com/privacy';
/** Apple's own page for managing subscriptions. */
export const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

export const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(n);

/** Honest comparisons only: computed from the real prices above. */
export const perWeek = (id: PlanId) => (PLANS[id].period === 'year' ? PLANS[id].price / 52 : (PLANS[id].price * 12) / 52);
export const yearlySavingsPct = () => Math.floor((1 - PLANS.yearly.price / (PLANS.monthly.price * 12)) * 100);

export type Entitlement = { plan: PlanId; since: string; trialEndsAt: string | null };

/** MOCK: pretends the store confirmed the purchase. */
export async function purchase(id: PlanId): Promise<Entitlement> {
  await new Promise((r) => setTimeout(r, 900));
  const now = new Date();
  const trial = PLANS[id].trialDays;
  return {
    plan: id,
    since: now.toISOString(),
    trialEndsAt: trial ? new Date(now.getTime() + trial * 24 * 3600 * 1000).toISOString() : null,
  };
}

/** MOCK: a real store would return the user's active subscription, if any. */
export async function restore(current: Entitlement | null): Promise<Entitlement | null> {
  await new Promise((r) => setTimeout(r, 700));
  return current;
}
