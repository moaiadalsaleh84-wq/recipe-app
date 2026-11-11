import { router } from 'expo-router';
import { useState } from 'react';
import { FREE_LIMITS, useStore } from '../state/store';

export type PaywallSource = 'onboarding' | 'imports' | 'pantry' | 'recipes' | 'cookbooks' | 'goals' | 'settings';

export const showPaywall = (source: PaywallSource) => router.push({ pathname: '/paywall', params: { source } });

/** What the current user may do, given the free limits in store.tsx. */
export function useProGate() {
  const { isPro, manualRecipeCount, cookbooks, pro, importsUsed, pantry } = useStore();
  const [now] = useState(() => Date.now()); // read the clock once per screen, not on every render
  // Rounded, not ceil'd: the screen's clock may be read a moment before the trial started (would show 8 of 7 days).
  const trialDaysLeft = pro?.trialEndsAt ? Math.round((new Date(pro.trialEndsAt).getTime() - now) / (24 * 3600 * 1000)) : null;
  return {
    isPro,
    canAddRecipe: isPro || manualRecipeCount < FREE_LIMITS.customRecipes,
    canAddCookbook: isPro || cookbooks.length < FREE_LIMITS.cookbooks,
    canImport: isPro || importsUsed < FREE_LIMITS.imports,
    /** Free imports left (null with Pro). */
    importsLeft: isPro ? null : Math.max(0, FREE_LIMITS.imports - importsUsed),
    canAddPantry: isPro || pantry.length < FREE_LIMITS.pantry,
    /** Days until the free trial ends (null when not in a trial). */
    trialDaysLeft,
  };
}
