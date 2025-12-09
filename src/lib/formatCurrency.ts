import { useAppStore } from '@/stores/useAppStore';
import type { Currency } from '@shared/types';
import { useCallback } from 'react';
export function formatCurrency(value: number, currency?: Currency): string {
  const effectiveCurrency = currency || useAppStore.getState().currency || 'USD';
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: effectiveCurrency,
  }).format(value);
  if (effectiveCurrency === 'EUR') {
    // Post-process to move the symbol to the end for EUR
    // Intl.NumberFormat for 'en-US' locale produces "€1,234.56" or "-€500.00"
    if (formatted.startsWith('€')) {
      return formatted.slice(1).trim() + ' €';
    }
    if (formatted.startsWith('-€')) {
      return '-' + formatted.slice(2).trim() + ' €';
    }
  }
  return formatted;
}
export function useFormatCurrency() {
  const currency = useAppStore((state) => state.currency);
  const format = useCallback(
    (value: number, overrideCurrency?: Currency) => {
      return formatCurrency(value, overrideCurrency || currency);
    },
    [currency]
  );
  return format;
}