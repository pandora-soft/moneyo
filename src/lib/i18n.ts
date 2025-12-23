import { useCallback } from 'react';
const translations = {
  app: {
    name: 'Moneyo',
  },
  auth: {
    login: 'Iniciar Sesión',
    logout: 'Cerrar Sesión',
    username: 'Nombre de usuario',
    password: 'Contraseña',
    loginPrompt: 'Ingresa tus credenciales para continuar.',
    loginSuccess: 'Sesión iniciada correctamente.',
    loginError: 'Error al iniciar sesión. Revisa tus credenciales.',
  },
  common: {
    add: 'Agregar',
    edit: 'Editar',
    delete: 'Eliminar',
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    emptyAccounts: 'No hay cuentas. ¡Crea tu primera!',
    createAccount: 'Crear Cuenta',
    addTransaction: 'Agregar Transacción',
    noMatches: 'No hay coincidencias. Intenta ajustar los filtros.',
    exportBudgets: 'Exportar Presupuestos',
    generateAll: 'Generar Recurrentes',
    days: 'días',
    weeks: 'semanas',
    months: 'meses',
    confirmDelete: '¿Estás seguro?',
    saveSuccess: 'Cambios guardados correctamente.',
    deleteSuccess: 'Eliminado con éxito.',
    errorSaving: 'Error al intentar guardar los cambios.',
    errorDeleting: 'No se pudo eliminar el elemento.',
    filteredXOfY: (filtered: number, total: number) => `Mostrando ${filtered} de ${total} transacciones.`,
  },
  access: {
    adminOnly: 'Acceso restringido: Se requieren permisos de administrador.',
    unauthorized: 'No tienes autorización para ver esta página.',
  },
  labels: {
    monthlySummary: 'Resumen Mensual',
    categorySpending: 'Gasto por Categoría',
  },
  pages: {
    dashboard: 'Dashboard',
    accounts: 'Cuentas',
    transactions: 'Transacciones',
    budgets: 'Presupuestos',
    reports: 'Reportes',
    settings: 'Ajustes',
    ia: 'IA Moneyo',
  },
  dashboard: {
    summary: 'Resumen de tus finanzas.',
    totalBalance: 'Balance Total',
    allAccounts: 'En todas tus cuentas',
    incomeLast30: 'Ingresos (Últ. 30 días)',
    expensesLast30: 'Gastos (Últ. 30 días)',
    balanceTrend: 'Tendencia del Balance',
    accounts: 'Cuentas',
    view: 'Ver',
    emptyAccountsCTA: '¡Comienza a controlar tus finanzas hoy!',
    inflow: 'Entradas de dinero',
    outflow: 'Salidas de dinero',
    user: {
      welcome: 'Bienvenido a Moneyo',
      budgetTotal: 'Suma de Presupuestos',
      currentSpending: 'Gasto Mensual',
      openIA: 'Escanear con IA',
      addTransaction: 'Nueva Transacción',
      spendingVsBudget: (spent: string, total: string) => `${spent} de ${total} presupuestado`,
      history: 'Últimos Movimientos',
      description: 'Gestiona tus gastos personales de forma sencilla.',
    }
  },
  accounts: {
    description: 'Administra tus cuentas de efectivo, banco y tarjetas.',
    lastTransactions: 'Últimos Movimientos',
    recurrent: 'Recurrentes',
    budgetsThisMonth: 'Presupuestos (Este Mes)',
    noTransactions: 'Sin movimientos.',
    activeRecurrent: (count: number) => `${count} activas`,
    noBudgetExpenses: 'Sin gastos contra presupuestos este mes.',
    deleteWarning: 'Esta acción no se puede deshacer. Se eliminará la cuenta permanentemente.',
    sheet: {
      editTitle: 'Editar Cuenta',
      newTitle: 'Nueva Cuenta',
      description: 'Crea o modifica los detalles de tu cuenta.',
    },
  },
  transactions: {
    history: 'Tu historial de ingresos y gastos.',
    importCSV: 'Importar CSV',
    exportCSV: 'Exportar CSV',
    recurrent: {
      view: 'Ver solo plantillas',
      template: 'Plantilla',
      generated: 'Generada',
    },
    deleteWarning: 'Esta acción no se puede deshacer y se ajustarán los saldos.',
  },
  finance: {
    income: 'Ingreso',
    expense: 'Gasto',
    transfer: 'Transferencia',
    balance: 'Balance',
    mainCurrency: 'Moneda Principal',
  },
  reports: {
    description: 'Visualiza tus patrones de ingresos y gastos.',
    exportPDF: 'Reporte PDF',
    exportTransactionsCSV: 'Transacciones CSV',
  },
  budget: {
    category: 'Categoría',
    month: 'Mes',
    progress: 'Progreso',
    save: 'Guardar Presupuesto',
    spendingLimit: 'L��mite de Gasto',
    overview: 'Resumen de Presupuestos',
    overviewDesc: 'Límites activos este mes.',
    viewAll: 'Ver todos',
    status: 'Estado',
    actual: 'Real',
    limit: 'Límite',
    duplicate: 'Duplicar',
  },
  settings: {
    description: 'Configura tus preferencias de la aplicación.',
    errorLoading: 'Error al cargar los ajustes.',
    visual: 'Apariencia',
    visualDesc: 'Personaliza la interfaz.',
    theme: 'Tema Visual',
    themeDark: 'Oscuro',
    themeLight: 'Claro',
    finances: 'Finanzas',
    financesDesc: 'Configuración global de moneda.',
    fiscalMonthStart: 'Día de inicio fiscal',
    githubUpdate: {
      title: 'Actualizar desde GitHub',
      description: 'Mantén tu instancia de Moneyo al día con las últimas mejoras del repositorio original.',
      button: 'Instrucciones de Actualización',
      instructions: '1. Exportar GitHub (botón superior derecho).\n2. Pull latest commits repo.\n3. Redeploy your fork.',
    },
    gemini: {
      key: 'Clave API Gemini',
      keyRequired: 'Se requiere una Clave API para la prueba.',
      testKey: 'Probar clave',
      validKey: 'La clave es válida.',
      invalidKey: 'La clave parece inválida.',
      model: 'Modelo AI',
      modelPlaceholder: 'gemini-1.5-flash',
      prompt: 'Instrucciones IA (Prompt)',
      promptPlaceholder: 'Agrega instrucciones adicionales...',
      testPrompt: 'Probar Prompt',
      testError: 'Error al ejecutar la prueba de IA.',
    },
    users: {
      title: 'Usuarios',
      description: 'Gestión de acceso y roles.',
      username: 'Usuario',
      password: 'Password',
      role: 'Rol',
      roleAdmin: 'Admin',
      roleUser: 'Usuario',
      email: 'Email',
      confirmDelete: (name: string) => `¿Eliminar al usuario '${name}'?`,
      sheet: { description: 'Administra credenciales y permisos.' },
    },
    categories: {
      title: 'Categorías',
      name: 'Nombre',
      confirmDelete: (name: string) => `¿Eliminar la categoría '${name}'?`,
      sheet: { description: 'Gestiona etiquetas de gastos e ingresos.' },
    },
    currencies: {
      title: 'Monedas',
      code: 'Código (ISO)',
      symbol: 'Símbolo',
      suffix: 'Usar sufijo',
      confirmDelete: (name: string) => `¿Eliminar la moneda '${name}'?`,
      sheet: { description: 'Configura las divisas disponibles.' },
    },
    frequencies: {
      title: 'Frecuencias',
      name: 'Nombre',
      interval: 'Intervalo',
      unit: 'Unidad',
      confirmDelete: (name: string) => `¿Eliminar la frecuencia '${name}'?`,
      sheet: { description: 'Define periodos para movimientos recurrentes.' },
    }
  },
  form: {
    required: 'Campo obligatorio.',
    minChars: (n: number) => `Mín. ${n} caracteres.`,
    maxChars: (n: number) => `M��x. ${n} caracteres.`,
    positive: 'Debe ser mayor a 0.',
    email: 'Email no válido.',
    requiredAccount: 'Cuenta requerida.',
    requiredCategory: 'Categoría requerida.',
    transferAccountError: 'Cuentas origen/destino deben ser distintas.',
    account: {
      name: 'Nombre de Cuenta',
      type: 'Tipo de Cuenta',
      currency: 'Moneda',
      initialBalance: 'Saldo Inicial',
      bank: 'Banco',
      cash: 'Efectivo',
      credit_card: 'Crédito',
      negativeBalanceError: 'Balance insuficiente.',
    }
  },
  filters: {
    search: 'Buscar...',
    allAccounts: 'Todas las Cuentas',
    allTypes: 'Todos los tipos',
    allTime: 'Todo el tiempo',
    dateRange: 'Rango de fechas',
    thisMonth: 'Este mes',
    last3Months: 'Últimos 3 meses',
  },
  table: {
    account: 'Cuenta',
    category: 'Categoría',
    date: 'Fecha',
    amount: 'Monto',
  },
  pagination: {
    showingXofY: (s: number, e: number, t: number) => `${s}-${e} de ${t}`,
    rowsPerPage: 'Filas:',
  }
} as const;
type PathImpl<T, K extends keyof T> =
  K extends string
  ? T[K] extends (...args: any[]) => string
    ? K
    : T[K] extends Record<string, any>
      ? `${K}.${PathImpl<T[K], keyof T[K]>}`
      : K
  : never;
type TranslationKey = PathImpl<typeof translations, keyof typeof translations>;
const t = (key: TranslationKey, ...args: any[]): string => {
  const parts = key.split('.');
  let current: any = translations;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return key;
    }
  }
  if (typeof current === 'function') {
    return current(...args);
  }
  return typeof current === 'string' ? current : key;
};
export const useTranslations = () => {
  return useCallback(t, []);
};
export default t;