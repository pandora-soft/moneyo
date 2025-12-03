import { useAppStore } from '@/stores/useAppStore';
import type { Currency } from '@shared/types';
import { useCallback } from 'react';
export function formatCurrency(value: number, currency?: Currency): string {
  const effectiveCurrency = currency || useAppStore.getState().currency || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: effectiveCurrency,
  }).format(value);
}
export function useFormatCurrency() {
  const currency = useAppStore((state) => state.currency);
  const format = useCallback(
    (value: number, overrideCurrency?: Currency) => {
      const effectiveCurrency = overrideCurrency || currency || 'USD';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: effectiveCurrency,
      }).format(value);
    },
    [currency]
  );
  return format;
}