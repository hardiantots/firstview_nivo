/**
 * Utility functions for money calculations
 */

/**
 * Format money to Indonesian Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatNumberShort(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Calculate money saved based on consumption and pricing
 */
export function calculateMoneySaved(
  baselineCigarettesPerDay: number,
  currentCigarettesPerDay: number,
  pricePerPack: number,
  cigarettesPerPack: number = 20
): number {
  const cigarettesSaved = Math.max(0, baselineCigarettesPerDay - currentCigarettesPerDay);
  const pricePerCigarette = pricePerPack / cigarettesPerPack;
  return cigarettesSaved * pricePerCigarette;
}

/**
 * Calculate total money saved over period
 */
export function calculateTotalMoneySaved(
  dailySavings: number,
  days: number
): number {
  return dailySavings * days;
}
