export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
// CasaConta specific types
export type AccountType = 'cash' | 'bank' | 'credit_card';
export type TransactionType = 'expense' | 'income' | 'transfer';
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: 'USD' | 'EUR' | 'ARS'; // Example currencies
  balance: number;
  createdAt: number;
}
export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  currency: 'USD' | 'EUR' | 'ARS';
  category: string;
  note?: string;
  ts: number; // epoch millis
}
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