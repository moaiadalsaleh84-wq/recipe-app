/**
 * Real purchases through RevenueCat. Only used when PURCHASES_MODE is 'revenuecat' (src/config.ts).
 * Needs a development or App Store build: Expo Go can't make real purchases.
 * Setup steps: SETUP.md.
 */
import Purchases, { PACKAGE_TYPE, type CustomerInfo } from 'react-native-purchases';
import { PRO_ENTITLEMENT, REVENUECAT_IOS_KEY } from '../config';
import { PurchaseCancelled, type Entitlement, type PlanId } from './purchases';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!REVENUECAT_IOS_KEY) throw new Error('RevenueCat key missing: set EXPO_PUBLIC_REVENUECAT_IOS_KEY.');
  Purchases.configure({ apiKey: REVENUECAT_IOS_KEY });
  configured = true;
}

/** The app's Entitlement, from RevenueCat's view of the customer. */
export function entitlementFrom(info: CustomerInfo): Entitlement | null {
  const e = info.entitlements.active[PRO_ENTITLEMENT];
  if (!e) return null;
  return {
    plan: /year|annual/i.test(e.productIdentifier) ? 'yearly' : 'monthly',
    since: e.originalPurchaseDate,
    trialEndsAt: e.periodType === 'TRIAL' ? e.expirationDate : null,
  };
}

export async function rcPurchase(id: PlanId): Promise<Entitlement> {
  ensureConfigured();
  const offerings = await Purchases.getOfferings();
  const want = id === 'yearly' ? PACKAGE_TYPE.ANNUAL : PACKAGE_TYPE.MONTHLY;
  const pkg = offerings.current?.availablePackages.find((p) => p.packageType === want);
  if (!pkg) throw new Error(`No ${id} package in the current RevenueCat offering.`);
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const ent = entitlementFrom(customerInfo);
    if (!ent) throw new Error('Purchase finished but the Pro entitlement is not active.');
    return ent;
  } catch (e) {
    if ((e as { userCancelled?: boolean | null }).userCancelled) throw new PurchaseCancelled('cancelled');
    throw e;
  }
}

export async function rcRestore(): Promise<Entitlement | null> {
  ensureConfigured();
  return entitlementFrom(await Purchases.restorePurchases());
}

/** Current status from RevenueCat, e.g. on launch, so cancellations and renewals are picked up. */
export async function rcCurrent(): Promise<Entitlement | null> {
  ensureConfigured();
  return entitlementFrom(await Purchases.getCustomerInfo());
}

/**
 * The real prices and free-trial lengths from the App Store, through RevenueCat's current
 * offering, so the paywall never shows a hard-coded price. Null for a plan the offering lacks.
 */
export async function rcPlans(): Promise<Partial<Record<PlanId, { price: number; priceString: string; trialDays: number }>>> {
  ensureConfigured();
  const offerings = await Purchases.getOfferings();
  const out: Partial<Record<PlanId, { price: number; priceString: string; trialDays: number }>> = {};
  for (const pkg of offerings.current?.availablePackages ?? []) {
    const id: PlanId | null = pkg.packageType === PACKAGE_TYPE.ANNUAL ? 'yearly' : pkg.packageType === PACKAGE_TYPE.MONTHLY ? 'monthly' : null;
    if (!id) continue;
    const p = pkg.product;
    const intro = p.introPrice;
    // A free intro period is the trial; its length in days.
    const unitDays: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };
    const trialDays = intro && intro.price === 0 ? intro.periodNumberOfUnits * (unitDays[intro.periodUnit] ?? 1) : 0;
    out[id] = { price: p.price, priceString: p.priceString, trialDays };
  }
  return out;
}
