import { router } from 'expo-router';
import { useState } from 'react';
import { FREE_LIMITS, useStore } from '../state/store';

export type PaywallSource = 'onboarding' | 'recipes' | 'cookbooks' | 'goals' | 'settings';

export const showPaywall = (source: PaywallSource) => router.push({ pathname: '/paywall', params: { source } });

/** What the current user may do, given the free limits in store.tsx. */
export function useProGate() {
  const { isPro, customRecipes, cookbooks, pro } = useStore();
  const [now] = useState(() => Date.now()); // read the clock once per screen, not on every render
  const trialDaysLeft = pro?.trialEndsAt ? Math.ceil((new Date(pro.trialEndsAt).getTime() - now) / (24 * 3600 * 1000)) : null;
  return {
    isPro,
    canAddRecipe: isPro || customRecipes.length < FREE_LIMITS.customRecipes,
    canAddCookbook: isPro || cookbooks.length < FREE_LIMITS.cookbooks,
    /** Days until the free trial ends (null when not in a trial). */
    trialDaysLeft,
  };
}
