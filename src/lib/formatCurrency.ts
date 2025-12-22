import { useAppStore } from '@/stores/useAppStore';
import { useCallback } from 'react';
/**
 * Pure utility to format currency based on global or overridden state.
 */
export function formatCurrency(value: number, currencyCode?: string): string {
  const state = useAppStore.getState();
  const effectiveCurrencyCode = currencyCode || state.currency || 'EUR';
  const currencyInfo = state.currencies[effectiveCurrencyCode] || { symbol: '€', suffix: true };
  const { symbol, suffix } = currencyInfo;
  // Use es-ES style for EUR as a convention if requested or if it's the default
  const locale = effectiveCurrencyCode === 'EUR' ? 'es-ES' : 'en-US';
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedValue = formatter.format(Math.abs(value));
  const sign = value < 0 ? '-' : '';
  if (suffix) {
    // Standard European style: 1.000,00 €
    return `${sign}${formattedValue} ${symbol}`;
  }
  // Standard Anglo style: $1,000.00
  return `${sign}${symbol}${formattedValue}`;
}
/**
 * Hook to get a stable formatting function that updates when the store changes.
 */
export function useFormatCurrency() {
  const currencyCode = useAppStore(s => s.currency);
  const currencies = useAppStore(s => s.currencies);
  const format = useCallback(
    (value: number, overrideCurrencyCode?: string) => {
      // By using values from the store, this callback is refreshed whenever 
      // the currency configuration changes globally.
      const effectiveCode = overrideCurrencyCode || currencyCode || 'EUR';
      const info = currencies[effectiveCode] || { symbol: '€', suffix: true };
      const { symbol, suffix } = info;
      const locale = effectiveCode === 'EUR' ? 'es-ES' : 'en-US';
      const formatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const formattedValue = formatter.format(Math.abs(value));
      const sign = value < 0 ? '-' : '';
      if (suffix) {
        return `${sign}${formattedValue} ${symbol}`;
      }
      return `${sign}${symbol}${formattedValue}`;
    },
    [currencyCode, currencies]
  );
  return format;
}