import { IndexedEntity, Entity, Env, Index } from "./core-utils";
import { Account, Transaction, Budget, Settings, Currency, User } from "@shared/types";
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS } from "@shared/mock-data";
import { addMonths, addWeeks, isBefore, startOfToday } from 'date-fns';
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password);
  return newHash === hash;
}
export class UserEntity extends IndexedEntity<User> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static readonly initialState: User = { id: "", username: "", passwordHash: "", role: 'user' };
  static seedData = [];
  static async ensureSeed(env: Env): Promise<void> {
    const idx = new Index<string>(env, this.indexName);
    const ids = await idx.list();
    if (ids.length === 0) {
      const adminPasswordHash = await hashPassword('admin');
      const adminUser: User = {
        id: crypto.randomUUID(),
        username: 'admin',
        passwordHash: adminPasswordHash,
        role: 'admin',
        email: 'admin@moneyo.com'
      };
      await UserEntity.create(env, adminUser);
    }
  }
}
export class AccountEntity extends IndexedEntity<Account> {
  static readonly entityName = "account";
  static readonly indexName = "accounts";
  static readonly initialState: Account = { id: "", name: "", type: 'bank', currency: 'EUR', balance: 0, createdAt: 0 };
  static seedData = MOCK_ACCOUNTS;
}
export type LedgerState = {
  id: string;
  transactions: Transaction[];
};
export class LedgerEntity extends IndexedEntity<LedgerState> {
  static readonly entityName = "ledger";
  static readonly indexName = "ledgers";
  static readonly initialState: LedgerState = { id: "main", transactions: [] };
  static seedData = [{ id: "main", transactions: MOCK_TRANSACTIONS }];
  async addTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    const newTx: Transaction = { ...tx, id: crypto.randomUUID() };
    await this.mutate((s) => {
      const updatedTransactions = [...s.transactions, newTx].sort((a, b) => b.ts - a.ts);
      return { ...s, transactions: updatedTransactions };
    });
    return newTx;
  }
  async generateRecurrents(): Promise<Transaction[]> {
    const { transactions } = await this.getState();
    const recurrentTemplates = transactions.filter(t => t.recurrent && t.frequency);
    const today = startOfToday();
    const generatedTxs: Omit<Transaction, 'id'>[] = [];
    for (const template of recurrentTemplates) {
      let nextDate = new Date(template.ts);
      while (isBefore(nextDate, today)) {
        let nextDueDate: Date;
        if (template.frequency === 'Semanal') nextDueDate = addWeeks(nextDate, 1);
        else nextDueDate = addMonths(nextDate, 1);
        if (isBefore(nextDueDate, today)) {
          const alreadyExists = transactions.some(t => t.parentId === template.id && t.ts === nextDueDate.getTime());
          if (!alreadyExists) {
            generatedTxs.push({
              ...template,
              ts: nextDueDate.getTime(),
              recurrent: false,
              frequency: undefined,
              parentId: template.id,
              note: `${template.note || ''} (Recurrente)`.trim(),
            });
          }
        }
        nextDate = nextDueDate;
      }
    }
    if (generatedTxs.length > 0) {
      return Promise.all(generatedTxs.map(tx => this.addTransaction(tx)));
    }
    return [];
  }
  async listTransactions(
    limit = 50,
    cursor = 0,
    filters: any = {}
  ): Promise<{ items: Transaction[]; next: number | null; totalCount: number; }> {
    const { transactions } = await this.getState();
    const filtered = transactions.filter(tx => {
      if (filters.accountId && filters.accountId !== 'all' && tx.accountId !== filters.accountId) return false;
      if (filters.type && filters.type !== 'all' && tx.type !== filters.type) return false;
      if (filters.dateFrom && tx.ts < filters.dateFrom) return false;
      if (filters.dateTo && tx.ts > filters.dateTo) return false;
      if (filters.query && !tx.category?.toLowerCase().includes(filters.query.toLowerCase()) && !tx.note?.toLowerCase().includes(filters.query.toLowerCase())) return false;
      return true;
    });
    const totalCount = filtered.length;
    const paginated = filtered.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < totalCount ? cursor + limit : null;
    return { items: paginated, next: nextCursor, totalCount };
  }
  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const { transactions } = await this.getState();
    const oldTx = transactions.find(t => t.id === id);
    if (!oldTx) throw new Error("Transaction not found");
    const newTx: Transaction = { ...oldTx, ...updates };
    await this.mutate(s => ({
      ...s,
      transactions: s.transactions.map(t => t.id === id ? newTx : t).sort((a, b) => b.ts - a.ts)
    }));
    return newTx;
  }
  async deleteTransaction(id: string): Promise<void> {
    await this.mutate(s => ({
      ...s,
      transactions: s.transactions.filter(t => t.id !== id)
    }));
  }
}
export class BudgetEntity extends IndexedEntity<Budget> {
  static readonly entityName = "budget";
  static readonly indexName = "budgets";
  static readonly initialState: Budget = { id: "", month: 0, category: "", limit: 0 };
  static seedData = [];
}
export class CategoryEntity extends IndexedEntity<{id: string, name: string}> {
  static readonly entityName = "category";
  static readonly indexName = "categories";
  static readonly initialState = { id: "", name: "" };
  static seedData = [
    {id: 'cat_food', name: 'Comida'},
    {id: 'cat_transport', name: 'Transporte'},
    {id: 'cat_rent', name: 'Alquiler'},
    {id: 'cat_salary', name: 'Salario'},
    {id: 'cat_other', name: 'Otro'}
  ];
}
export class CurrencyEntity extends IndexedEntity<Currency> {
    static readonly entityName = "currency";
    static readonly indexName = "currencies";
    static readonly initialState: Currency = { id: "", code: "", symbol: "", suffix: false };
    static seedData = [
        { id: 'usd', code: 'USD', symbol: '$', suffix: false },
        { id: 'eur', code: 'EUR', symbol: '€', suffix: true },
        { id: 'ars', code: 'ARS', symbol: '$', suffix: false },
    ];
}
export class FrequencyEntity extends IndexedEntity<{id: string, name: string, interval: number, unit: string}> {
  static readonly entityName = "frequency";
  static readonly indexName = "frequencies";
  static readonly initialState = { id: "", name: "", interval: 1, unit: 'weeks' };
  static seedData = [
    { id: 'weekly', name: 'Semanal', interval: 1, unit: 'weeks' },
    { id: 'monthly', name: 'Mensual', interval: 1, unit: 'months' },
  ];
}
export interface Session {
  id: string;
  userId: string;
  expires: number;
}
export class SessionEntity extends IndexedEntity<Session> {
  static readonly entityName = 'session';
  static readonly indexName = 'sessions';
  static readonly initialState: Session = { id: '', userId: '', expires: 0 };
}
export class SettingsEntity extends Entity<Settings> {
  static readonly entityName = "settings";
  static readonly initialState: Settings = { currency: 'EUR', fiscalMonthStart: 1, recurrentDefaultFrequency: 'monthly' };
  constructor(env: Env) {
    super(env, "global");
  }
}