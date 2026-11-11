/**
 * App-wide settings. Values come from EXPO_PUBLIC_* environment variables (see .env.example),
 * so nothing secret lives here: anything in the app can be read by anyone who downloads it.
 */

/**
 * The recipe import backend (the Supabase Edge Function in supabase/functions/import-recipe).
 * Empty = import isn't set up in this build, and the app says so.
 */
export const IMPORT_URL = process.env.EXPO_PUBLIC_IMPORT_URL ?? '';

/**
 * Purchases: 'mock' (default, test mode, nothing is charged) or 'revenuecat' (real App Store
 * purchases through RevenueCat). Switch only after following SETUP.md.
 */
export const PURCHASES_MODE: 'mock' | 'revenuecat' = process.env.EXPO_PUBLIC_PURCHASES_MODE === 'revenuecat' ? 'revenuecat' : 'mock';

/** RevenueCat's public iOS SDK key (starts with "appl_"). Public by design, not a secret. */
export const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

/** The RevenueCat entitlement that unlocks Pro. */
export const PRO_ENTITLEMENT = 'pro';
