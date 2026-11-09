import type { Units } from '../data/mock';

/**
 * Converts a metric quantity to US kitchen units. Spoons and counts stay as they are.
 * Results are rounded later by formatQty (US units round to the nearest ¼).
 */
export function convertQty(quantity: number, unit: string, units: Units): { quantity: number; unit: string } {
  if (units === 'metric') return { quantity, unit };
  if (unit === 'g') return quantity >= 454 ? { quantity: quantity / 453.6, unit: 'lb' } : { quantity: quantity / 28.35, unit: 'oz' };
  if (unit === 'ml') return quantity >= 60 ? { quantity: quantity / 236.6, unit: 'cups' } : { quantity: quantity / 14.79, unit: 'tbsp' };
  return { quantity, unit };
}

/** Rewrites oven temperatures in a step, e.g. "220°C" → "425°F". */
export function convertStepText(step: string, units: Units): string {
  if (units === 'metric') return step;
  // Ovens use round numbers, so snap to the nearest 25°F (220°C → 425°F, 180°C → 350°F).
  return step.replace(/(\d+)\s*°C/g, (_, c: string) => `${Math.round(((Number(c) * 9) / 5 + 32) / 25) * 25}°F`);
}
