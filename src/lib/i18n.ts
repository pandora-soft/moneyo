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
    createAccount: 'Crear Cuenta',
    addTransaction: 'Agregar Transacción',
    noMatches: 'No hay coincidencias. Intenta ajustar los filtros.',
    exportBudgets: 'Exportar Presupuestos',
    generateAll: 'Generar Recurrentes',
    days: 'días',
    weeks: 'semanas',
    months: 'meses',
    confirmDelete: '¿Estás seguro?',
    filteredXOfY: (filtered: number, total: number) => `Mostrando ${filtered} de ${total} transacciones.`,
  },
  pages: {
    dashboard: 'Dashboard',
    accounts: 'Cuentas',
    transactions: 'Transacciones',
    budgets: 'Presupuestos',
    reports: 'Reportes',
    settings: 'Ajustes',
  },
  dashboard: {
    summary: 'Resumen de tus finanzas.',
    totalBalance: 'Balance Total',
    allAccounts: 'En todas tus cuentas',
    incomeLast30: 'Ingresos (Últ. 30 días)',
    expensesLast30: 'Gastos (Últ. 30 días)',
    inflow: 'Flujo de entrada',
    outflow: 'Flujo de salida',
    balanceTrend: 'Tendencia del Balance',
    accounts: 'Cuentas',
    view: 'Ver',
    emptyAccountsCTA: '¡Comienza a controlar tus finanzas hoy!',
  },
  accounts: {
    description: 'Administra tus cuentas de efectivo, banco y tarjetas.',
    manage: 'Administra tus cuentas de efectivo, banco y tarjetas.',
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
    deleteWarning: 'Esta acción no se puede deshacer. Se eliminará la transacción permanentemente y se ajustará el saldo de la cuenta.',
    deleteCascade: 'Si es una plantilla recurrente, se eliminarán también todas las transacciones generadas.',
    importSheet: {
      title: 'Importar Transacciones',
      description: 'Sube un archivo CSV para previsualizar y confirmar la importación.',
      preview: 'Previsualización de las transacciones a importar.',
      columns: 'Columnas requeridas: date, accountName, type, amount, category, note.',
      validation: 'Validación',
      invalidDate: 'Fecha Inválida',
      confirm: 'Confirmar Importación',
    },
  },
  finance: {
    income: 'Ingreso',
    expense: 'Gasto',
    transfer: 'Transferencia',
    balance: 'Balance',
    currency: 'Moneda',
    mainCurrency: 'Moneda Principal',
  },
  reports: {
    description: 'Visualiza tus patrones de ingresos y gastos.',
    exportPDF: 'Reporte PDF',
    exportTransactionsCSV: 'Transacciones CSV',
    thisMonth: 'Este Mes',
    last3Months: 'Últimos 3 Meses',
  },
  labels: {
    monthlySummary: 'Resumen Mensual',
    categorySpending: 'Gastos por Categoría',
    budgetList: 'Lista de Presupuestos',
    overBudget: 'Excedido',
    emptyBudgets: 'No hay presupuestos. ¡Crea uno!',
  },
  budget: {
    list: 'Presupuestos',
    description: 'Define y sigue tus límites de gasto mensuales.',
    create: 'Crear Presupuesto',
    summary: 'Resumen de Presupuestos',
    summaryDesc: 'Planificado vs. Gasto real para el mes seleccionado.',
    actual: 'Gasto Real',
    limit: 'Límite',
    status: 'Estado',
    under: 'Bajo Límite',
    over: 'Sobre Límite',
    duplicate: 'Duplicar',
    viewAll: 'Ver Todos los Presupuestos',
    overview: 'Resumen de Presupuestos',
    overviewDesc: 'Un vistazo rápido a tus presupuestos activos.',
    category: 'Categoría',
    month: 'Mes',
    progress: 'Progreso',
    save: 'Guardar Presupuesto',
    spendingLimit: 'Límite de Gasto',
    sheet: {
      editTitle: 'Editar Presupuesto',
      newTitle: 'Nuevo Presupuesto',
      description: 'Define un límite de gasto para una categoría en un mes específico.',
    },
    deleteConfirm: '¿Confirmar eliminación?',
    deleteWarning: 'Esta acción no se puede deshacer. Se eliminará el presupuesto permanentemente.',
  },
  auth: {
    login: 'Iniciar Sesión',
    username: 'Usuario',
    password: 'Contraseña',
    loginSuccess: 'Sesión iniciada correctamente. ¡Bienvenido!',
    loginError: 'Credenciales inválidas. Por favor, inténtalo de nuevo.',
    register: 'Registrarse',
    logout: 'Cerrar Sesión',
    loginPrompt: 'Ingresa a tu cuenta para continuar.',
    defaultCredentials: 'Usuario por defecto: admin, contraseña: admin',
  },
  settings: {
    description: 'Configura tus preferencias de la aplicación.',
    visual: 'Visual',
    visualDesc: 'Personaliza la apariencia de Moneyo.',
    theme: 'Tema',
    themeDark: 'Oscuro',
    themeLight: 'Claro',
    finances: 'Finanzas',
    financesDesc: 'Ajustes relacionados con la moneda y fechas.',
    fiscalMonthStart: 'Inicio del Mes Fiscal',
    recurrentDefaultFreq: 'Frecuencia Recurrente por Defecto',
    users: {
      title: 'Usuarios',
      description: 'Gestiona los usuarios y sus permisos en la aplicación.',
      add: 'Agregar Usuario',
      edit: 'Editar Usuario',
      delete: 'Eliminar Usuario',
      username: 'Nombre de Usuario',
      password: 'Contraseña (dejar en blanco para no cambiar)',
      role: 'Rol',
      roleUser: 'Usuario',
      roleAdmin: 'Administrador',
      email: 'Email (Opcional)',
      confirmDelete: (name: string) => `¿Estás seguro de que quieres eliminar al usuario '${name}'? Esta acción no se puede deshacer.`,
      sheet: {
        titleEdit: 'Editar Usuario',
        titleNew: 'Agregar Usuario',
        description: 'Gestiona los detalles y permisos del usuario.',
      },
    },
    categories: {
      title: 'Categorías',
      add: 'Agregar Categoría',
      edit: 'Editar Categoría',
      delete: 'Eliminar Categoría',
      description: 'Gestiona categorías para transacciones y presupuestos.',
      name: 'Nombre de Categoría',
      confirmDelete: (name: string) => `¿Estás seguro de que quieres eliminar la categoría '${name}'? Esta acción no se puede deshacer.`,
      sheet: {
        description: 'Crea o modifica una categoría para tus transacciones.',
      },
    },
    currencies: {
        title: 'Monedas',
        description: 'Gestiona las monedas para tus cuentas.',
        add: 'Agregar Moneda',
        edit: 'Editar Moneda',
        delete: 'Eliminar Moneda',
        code: 'Código (ej. USD)',
        symbol: 'Símbolo (ej. $)',
        suffix: 'Símbolo al final',
        prefix: 'Prefijo',
        confirmDelete: (code: string) => `¿Estás seguro de que quieres eliminar la moneda '${code}'? Esta acción no se puede deshacer.`,
        sheet: {
          description: 'Define una nueva moneda para usar en tus cuentas.',
        },
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
        confirmDelete: (name: string) => `¿Estás seguro de que quieres eliminar la frecuencia '${name}'? Esta acción no se puede deshacer.`,
        sheet: {
          description: 'Define una nueva frecuencia para transacciones recurrentes.',
        },
    }
  },
  form: {
    required: 'Este campo es requerido.',
    minChars: (count: number) => `Mínimo ${count} caracteres.`,
    maxChars: (count: number) => `Máximo ${count} caracteres.`,
    positive: 'Debe ser un número positivo.',
    email: 'Email inválido.',
    requiredAccount: 'Debe seleccionar una cuenta de origen.',
    requiredCategory: 'La categoría es requerida.',
    transferAccountError: 'Debe seleccionar una cuenta de destino diferente a la de origen.',
    recurrentFreqError: 'Debe seleccionar una frecuencia para transacciones recurrentes.',
    account: {
      name: 'Nombre de la Cuenta',
      type: 'Tipo',
      currency: 'Moneda',
      initialBalance: 'Saldo Inicial',
      bank: 'Cuenta Bancaria',
      cash: 'Efectivo',
      credit_card: 'Tarjeta de Crédito',
      negativeBalanceError: 'El saldo no puede ser negativo.',
    },
    transaction: {
      type: 'Tipo',
      account: 'Cuenta',
      originAccount: 'Cuenta de Origen',
      destinationAccount: 'Cuenta de Destino',
      amount: 'Monto',
      category: 'Categoría',
      date: 'Fecha',
      note: 'Nota (Opcional)',
      recurrent: 'Transacción Recurrente',
      frequency: 'Frecuencia',
      sheet: {
        editTitle: 'Editar Transacción',
        newTitle: 'Nueva Transacción',
        description: 'Completa los campos para registrar un nuevo movimiento.',
      },
    },
  },
  filters: {
    search: 'Buscar por categoría o nota...',
    allAccounts: 'Todas las Cuentas',
    allTypes: 'Todos los Tipos',
    allTime: 'Todo el tiempo',
    dateRange: 'Rango de Fechas',
    thisMonth: 'Este Mes',
    last3Months: 'Últimos 3 Meses',
    clear: 'Limpiar filtros',
  },
  table: {
    account: 'Cuenta',
    category: 'Categoría',
    date: 'Fecha',
    amount: 'Monto',
  },
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