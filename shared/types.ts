export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
// CasaConta specific types
export type AccountType = 'cash' | 'bank' | 'credit_card';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type Currency = 'USD' | 'EUR' | 'ARS';
export type BudgetCategory = 'food' | 'transport' | 'rent' | 'salary' | 'other';
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  createdAt: number;
}
export interface Transaction {
  id: string;
  accountId: string;
  accountTo?: string; // For transfers
  type: TransactionType;
  amount: number; // Can be positive or negative
  currency: Currency;
  category: string;
  note?: string;
  ts: number; // epoch millis
}
export interface Budget {
  id: string;
  accountId: string;
  month: number; // epoch millis for start of month
  category: string;
  limit: number;
}
export interface Settings {
  currency: Currency;
  fiscalMonthStart: number; // Day of the month (1-28)
}
export type SettingsUpdate = Partial<Settings>;
// Demo types from template (can be removed later)
export interface User {
  id: string;
  name: string;
}
export interface Chat {
  id: string;
  title: string;
}
export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  ts: number; // epoch millis
}