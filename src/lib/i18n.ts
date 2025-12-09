import { useCallback } from 'react';
const translations = {
  common: {
    add: 'Agregar',
    edit: 'Editar',
    delete: 'Eliminar',
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    emptyAccounts: 'No hay cuentas. ¡Crea tu primera!',
    noMatches: 'No hay coincidencias. Intenta ajustar los filtros.',
    exportBudgets: 'Exportar Presupuestos',
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
    budgetList: 'Lista de Presupuestos',
    overBudget: 'Excedido',
    emptyBudgets: 'No hay presupuestos. ¡Crea uno!',
  },
  budget: {
    list: 'Presupuestos',
    actual: 'Gasto Real',
    limit: 'Límite',
    status: 'Estado',
    under: 'Bajo Límite',
    over: 'Sobre Límite',
    duplicate: 'Duplicar',
  },
} as const;
type TranslationKey =
  | `common.${keyof typeof translations.common}`
  | `pages.${keyof typeof translations.pages}`
  | `finance.${keyof typeof translations.finance}`
  | `labels.${keyof typeof translations.labels}`
  | `budget.${keyof typeof translations.budget}`;
// A simple t function for demonstration. In a real app, this would be more robust.
const t = (key: TranslationKey): string => {
  const parts = key.split('.');
  const namespace = parts[0] as keyof typeof translations;
  const subkey = parts[1] as any;
  const dict = translations[namespace];
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