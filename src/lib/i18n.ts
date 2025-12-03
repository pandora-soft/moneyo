import { useCallback } from 'react';
const translations = {
  common: {
    add: 'Agregar',
    edit: 'Editar',
    delete: 'Eliminar',
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
  },
  pages: {
    dashboard: 'Dashboard',
    accounts: 'Cuentas',
    transactions: 'Transacciones',
    reports: 'Reportes',
    settings: 'Ajustes',
  },
  finance: {
    income: 'Ingreso',
    expense: 'Gasto',
    transfer: 'Transferencia',
    balance: 'Balance',
    currency: 'Moneda',
    mainCurrency: 'Moneda Principal',
  },
  labels: {
    monthlySummary: 'Resumen Mensual',
    categorySpending: 'Gastos por Categoría (Este Mes)',
  }
} as const;
type TranslationKey = 
  | `common.${keyof typeof translations.common}`
  | `pages.${keyof typeof translations.pages}`
  | `finance.${keyof typeof translations.finance}`
  | `labels.${keyof typeof translations.labels}`;
// A simple t function for demonstration. In a real app, this would be more robust.
const t = (key: TranslationKey): string => {
  const [namespace, subkey] = key.split('.');
  const dict = translations[namespace as keyof typeof translations];
  if (dict && subkey in dict) {
    return dict[subkey as keyof typeof dict];
  }
  return key;
};
export const useTranslations = () => {
  // In a real app, this would be connected to a context provider.
  // For this stub, we return the simple t function.
  return useCallback(t, []);
};
export default t;