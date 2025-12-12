export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
// CasaConta specific types
export type AccountType = 'cash' | 'bank' | 'credit_card';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type BudgetCategory = 'food' | 'transport' | 'rent' | 'salary' | 'other';
export interface Currency {
  id: string;
  code: string;
  symbol: string;
  suffix: boolean;
}
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string; // Currency code, e.g., 'USD'
  balance: number;
  createdAt: number;
}
export interface Transaction {
  id: string;
  accountId: string;
  accountTo?: string; // For transfers
  type: TransactionType;
  amount: number; // Can be positive or negative
  currency: string; // Currency code
  category: string;
  note?: string;
  ts: number; // epoch millis
  recurrent?: boolean;
  frequency?: string;
  parentId?: string; // To link generated transactions to their recurrent template
  attachmentDataUrl?: string; // Base64 data URL for attachment preview (image/PDF)
}
export interface Budget {
  id:string;
  month: number; // epoch millis for start of month
  category: string;
  limit: number;
  computedActual?: number; // Optional field for frontend-computed values
}
export interface PaginatedTransactions {
  items: Transaction[];
  next: number | null | string;
  totalCount: number;
  prev?: string | number;
}
// Auth types
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'user' | 'admin';
  email?: string;
}
export type SessionToken = string;
export interface Settings {
  currency: string; // Currency code
  fiscalMonthStart: number; // Day of the month (1-28)
  recurrentDefaultFrequency: string;
  user?: Omit<User, 'passwordHash'>;
}
export type SettingsUpdate = Partial<Settings>;
// Demo types from template (can be removed later)
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