import { useCallback } from 'react';
const translations = {
  app: {
    name: 'Moneyo',
  },
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
    generateAll: 'Generar Todas',
    days: 'días',
    weeks: 'semanas',
    months: 'meses',
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
  transactions: {
    recurrent: {
      view: 'Ver solo recurrentes',
    }
  },
  settings: {
    categories: {
      title: 'Categorías',
      add: 'Agregar Categoría',
      edit: 'Editar Categoría',
      delete: 'Eliminar Categoría',
      description: 'Gestiona categorías para transacciones y presupuestos.',
    },
    currencies: {
        title: 'Monedas',
        description: 'Gestiona las monedas para tus cuentas.',
        add: 'Agregar Moneda',
        edit: 'Editar Moneda',
        delete: 'Eliminar Moneda',
        code: 'Código (ej. USD)',
        symbol: 'Símbolo (ej. $)',
        suffix: 'Símbolo al final (ej. 100 €)',
    },
    frequencies: {
        title: 'Frecuencias Recurrentes',
        description: 'Gestiona frecuencias para transacciones recurrentes.',
        add: 'Agregar Frecuencia',
        edit: 'Editar Frecuencia',
        delete: 'Eliminar Frecuencia',
        name: 'Nombre (ej. Quincenal)',
        interval: 'Intervalo (número)',
        unit: 'Unidad (días/semanas/meses)',
    }
  },
} as const;
type TranslationKey =
  | `app.${keyof typeof translations.app}`
  | `common.${keyof typeof translations.common}`
  | `pages.${keyof typeof translations.pages}`
  | `finance.${keyof typeof translations.finance}`
  | `labels.${keyof typeof translations.labels}`
  | `budget.${keyof typeof translations.budget}`
  | `transactions.recurrent.${keyof typeof translations.transactions.recurrent}`
  | `settings.categories.${keyof typeof translations.settings.categories}`
  | `settings.currencies.${keyof typeof translations.settings.currencies}`
  | `settings.frequencies.${keyof typeof translations.settings.frequencies}`;
// A simple t function for demonstration. In a real app, this would be more robust.
const t = (key: TranslationKey, fallback?: string): string => {
  const parts = key.split('.');
  let current: any = translations;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return fallback || key;
    }
  }
  return typeof current === 'string' ? current : fallback || key;
};
export const useTranslations = () => {
  // In a real app, this would be connected to a context provider.
  // For this stub, we return the simple t function.
  return useCallback(t, []);
};
export default t;