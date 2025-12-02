import type { Account, Transaction } from './types';
export const MOCK_ACCOUNTS: Account[] = [
  { id: 'acc_cash', name: 'Efectivo', type: 'cash', currency: 'USD', balance: 150.75, createdAt: Date.now() - 200000000 },
  { id: 'acc_bank', name: 'Cuenta Bancaria', type: 'bank', currency: 'USD', balance: 2345.12, createdAt: Date.now() - 100000000 },
  { id: 'acc_card', name: 'Tarjeta de Crédito', type: 'credit_card', currency: 'USD', balance: -450.20, createdAt: Date.now() - 50000000 },
];
export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'txn_1', accountId: 'acc_bank', type: 'income', amount: 3000, currency: 'USD', category: 'Salario', ts: Date.now() - 86400000 * 15 },
  { id: 'txn_2', accountId: 'acc_card', type: 'expense', amount: 75.50, currency: 'USD', category: 'Restaurantes', note: 'Almuerzo de trabajo', ts: Date.now() - 86400000 * 10 },
  { id: 'txn_3', accountId: 'acc_bank', type: 'expense', amount: 1200, currency: 'USD', category: 'Alquiler', ts: Date.now() - 86400000 * 8 },
  { id: 'txn_4', accountId: 'acc_cash', type: 'expense', amount: 25, currency: 'USD', category: 'Transporte', ts: Date.now() - 86400000 * 5 },
  { id: 'txn_5', accountId: 'acc_card', type: 'expense', amount: 150, currency: 'USD', category: 'Compras', ts: Date.now() - 86400000 * 3 },
  { id: 'txn_6', accountId: 'acc_bank', type: 'expense', amount: 55.30, currency: 'USD', category: 'Supermercado', ts: Date.now() - 86400000 * 2 },
  { id: 'txn_7', accountId: 'acc_cash', type: 'income', amount: 100, currency: 'USD', category: 'Regalo', ts: Date.now() - 86400000 * 1 },
];