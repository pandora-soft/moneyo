import { useAppStore } from '@/stores/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useCallback } from 'react';
export function formatCurrency(value: number, currencyCode?: string): string {
  const state = useAppStore.getState();
  const effectiveCurrencyCode = currencyCode || state.currency || 'EUR';
  const currencyInfo = state.currencies[effectiveCurrencyCode] || { symbol: '€', suffix: true };
  const { symbol, suffix } = currencyInfo;
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedValue = formatter.format(Math.abs(value));
  const sign = value < 0 ? '-' : '';
  if (suffix) {
    return `${sign}${formattedValue} ${symbol}`;
  }
  return `${sign}${symbol}${formattedValue}`;
}
export function useFormatCurrency() {
  const currencyCode = useAppStore((state) => state.currency);
  const currencies = useAppStore(useShallow((state) => state.currencies));
  const format = useCallback(
    (value: number, overrideCurrencyCode?: string) => {
      // subscribing to currencyCode and currencies ensures re-renders on change
      return formatCurrency(value, overrideCurrencyCode || currencyCode);
    },
    [currencyCode, currencies]
  );
  return format;
}