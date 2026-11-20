/**
 * Subscriptions.
 *
 * PRICES AND LINKS LIVE HERE. Change them in one place.
 *
 * One switch decides how purchases work: PURCHASES_MODE in src/config.ts (set with the
 * EXPO_PUBLIC_PURCHASES_MODE environment variable).
 *   'mock'        (default) test mode: nothing is charged, Pro is granted locally.
 *   'revenuecat'  real App Store purchases through RevenueCat (src/lib/revenuecat.ts).
 * Real payments need the App Store Connect and RevenueCat setup in SETUP.md and a development
 * or App Store build. Until then the paywall says "Test mode" and nothing is charged.
 */
import { PURCHASES_MODE } from '../config';

export const PURCHASES_ARE_MOCK = PURCHASES_MODE === 'mock';

export type PlanId = 'yearly' | 'monthly';

export const PLANS: Record<PlanId, { productId: string; price: number; period: 'year' | 'month'; trialDays: number }> = {
  yearly: { productId: 'pro_yearly', price: 29.99, period: 'year', trialDays: 7 },
  monthly: { productId: 'pro_monthly', price: 4.99, period: 'month', trialDays: 0 },
};

export const CURRENCY = 'USD';
/**
 * Replace with your real pages before submitting to the App Store (Apple requires both).
 * The in-app Privacy screen (src/app/privacy.tsx) has the current wording to publish.
 */
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'; // Apple's standard EULA, until you have your own
export const PRIVACY_URL = 'https://example.com/privacy';
/** Apple's own page for managing subscriptions. */
export const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

export const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(n);

/** Honest comparisons only: computed from the real prices above. */
export const perWeek = (id: PlanId, plans: Record<PlanId, { price: number; period: 'year' | 'month' }> = PLANS) => (plans[id].period === 'year' ? plans[id].price / 52 : (plans[id].price * 12) / 52);
/** How much the yearly plan saves against 12 monthly payments, rounded: $29.99 vs $4.99 → 50. */
export const savingsPct = (yearly: number, monthly: number) => (monthly > 0 ? Math.round((1 - yearly / (monthly * 12)) * 100) : 0);
export const yearlySavingsPct = () => savingsPct(PLANS.yearly.price, PLANS.monthly.price);

export type Plan = { productId: string; price: number; period: 'year' | 'month'; trialDays: number };

/**
 * The plans as the store sells them: real prices and trial lengths from RevenueCat when real
 * purchases are on; the PLANS above in test mode (or if the store can't be reached).
 */
export async function loadPlans(): Promise<Record<PlanId, Plan>> {
  if (PURCHASES_ARE_MOCK) return PLANS;
  try {
    const live = await (await import('./revenuecat')).rcPlans();
    return {
      yearly: { ...PLANS.yearly, ...(live.yearly ? { price: live.yearly.price, trialDays: live.yearly.trialDays } : null) },
      monthly: { ...PLANS.monthly, ...(live.monthly ? { price: live.monthly.price, trialDays: live.monthly.trialDays } : null) },
    };
  } catch {
    return PLANS;
  }
}

export type Entitlement = { plan: PlanId; since: string; trialEndsAt: string | null };

/** Thrown when the person closes Apple's purchase sheet. Not an error to show. */
export class PurchaseCancelled extends Error {}

export async function purchase(id: PlanId): Promise<Entitlement> {
  if (!PURCHASES_ARE_MOCK) return (await import('./revenuecat')).rcPurchase(id);
  // MOCK: pretends the store confirmed the purchase.
  await new Promise((r) => setTimeout(r, 900));
  const now = new Date();
  const trial = PLANS[id].trialDays;
  return {
    plan: id,
    since: now.toISOString(),
    trialEndsAt: trial ? new Date(now.getTime() + trial * 24 * 3600 * 1000).toISOString() : null,
  };
}

export async function restore(current: Entitlement | null): Promise<Entitlement | null> {
  if (!PURCHASES_ARE_MOCK) return (await import('./revenuecat')).rcRestore();
  // MOCK: a real store would return the user's active subscription, if any.
  await new Promise((r) => setTimeout(r, 700));
  return current;
}

/** The subscription as the store sees it now (null in mock mode: keep what's saved). */
export async function refreshEntitlement(): Promise<Entitlement | null | undefined> {
  if (PURCHASES_ARE_MOCK) return undefined;
  try {
    return await (await import('./revenuecat')).rcCurrent();
  } catch {
    return undefined; // offline or not configured: keep what's saved
  }
}
