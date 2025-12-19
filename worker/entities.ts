import { IndexedEntity, Entity, Env, Index } from "./core-utils";
import { Account, Transaction, Budget, Settings, Currency, User, TransactionType } from "@shared/types";
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS } from "@shared/mock-data";
import { addDays, addMonths, addWeeks, isBefore, startOfToday, isWithinInterval } from 'date-fns';
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
    const users = await Promise.all(ids.map(id => new UserEntity(env, id).getState()));
    const hasAdmin = users.some(u => u.username.toLowerCase() === 'admin');
    if (!hasAdmin) {
      const adminPasswordHash = await hashPassword('admin');
      const adminUser: User = {
        id: crypto.randomUUID(),
        username: 'admin',
        passwordHash: adminPasswordHash,
        role: 'admin',
        email: 'admin@example.com'
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
export type Frequency = {
  id: string;
  name: string;
  interval: number;
  unit: 'days' | 'weeks' | 'months';
};
export class FrequencyEntity extends IndexedEntity<Frequency> {
  static readonly entityName = "frequency";
  static readonly indexName = "frequencies";
  static readonly initialState: Frequency = { id: "", name: "", interval: 1, unit: 'weeks' };
  static seedData = [
    { id: 'weekly', name: 'Semanal', interval: 1, unit: 'weeks' as const },
    { id: 'monthly', name: 'Mensual', interval: 1, unit: 'months' as const },
  ];
}
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
  async bulkAddTransactions(txs: Omit<Transaction, 'id'>[]): Promise<Transaction[]> {
    const newTxs: Transaction[] = txs.map(tx => ({ ...tx, id: crypto.randomUUID() }));
    const accountBalanceChanges = new Map<string, number>();
    for (const tx of newTxs) {
      const amount = tx.type === 'income' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
      accountBalanceChanges.set(tx.accountId, (accountBalanceChanges.get(tx.accountId) || 0) + amount);
    }
    const accountMutations = Array.from(accountBalanceChanges.entries()).map(([accountId, change]) => {
      const account = new AccountEntity(this.env, accountId);
      return account.mutate(acc => ({ ...acc, balance: acc.balance + change }));
    });
    await Promise.all([
      ...accountMutations,
      this.mutate(s => ({
        ...s,
        transactions: [...s.transactions, ...newTxs].sort((a, b) => b.ts - a.ts)
      }))
    ]);
    return newTxs;
  }
  async generateRecurrents(): Promise<Transaction[]> {
    try {
      const { transactions } = await this.getState();
      const { items: frequencies } = await FrequencyEntity.list(this.env);
      const freqMap = new Map(frequencies.map(f => [f.name, f]));
      const recurrentTemplates = transactions.filter(t => t.recurrent && t.frequency);
      const today = startOfToday();
      const generatedTxs: Omit<Transaction, 'id'>[] = [];
      for (const template of recurrentTemplates) {
        const freq = freqMap.get(template.frequency!);
        if (!freq) continue;
        let nextDate = new Date(template.ts);
        while (isBefore(nextDate, today)) {
          let nextDueDate: Date;
          switch (freq.unit) {
            case 'days': nextDueDate = addDays(nextDate, freq.interval); break;
            case 'weeks': nextDueDate = addWeeks(nextDate, freq.interval); break;
            case 'months': nextDueDate = addMonths(nextDate, freq.interval); break;
            default: nextDueDate = addMonths(nextDate, 1);
          }
          if (isBefore(nextDueDate, today)) {
            const alreadyGenerated = transactions.some(t => t.parentId === template.id && t.ts === nextDueDate.getTime());
            if (!alreadyGenerated) {
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
      if (generatedTxs.length > 0) return this.bulkAddTransactions(generatedTxs);
      return [];
    } catch (e) {
      console.error('Error generating recurrent transactions:', e);
      return [];
    }
  }
  async listTransactions(
    limit = 50,
    cursor = 0,
    filters: {
      accountId?: string;
      type?: string;
      dateFrom?: number;
      dateTo?: number;
      query?: string;
    } = {}
  ): Promise<{ items: Transaction[]; next: number | null; totalCount: number; }> {
    const { transactions } = await this.getState();
    const filtered = transactions.filter(tx => {
      if (filters.accountId && filters.accountId !== 'all' && tx.accountId !== filters.accountId) return false;
      if (filters.type && filters.type !== 'all' && tx.type !== (filters.type as TransactionType)) return false;
      if (filters.dateFrom && filters.dateTo) {
        if (!isWithinInterval(new Date(tx.ts), { start: new Date(filters.dateFrom), end: new Date(filters.dateTo) })) return false;
      }
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const categoryMatch = tx.category.toLowerCase().includes(q);
        const noteMatch = tx.note?.toLowerCase().includes(q);
        if (!categoryMatch && !noteMatch) return false;
      }
      return true;
    });
    const totalCount = filtered.length;
    const paginated = filtered.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < totalCount ? cursor + limit : null;
    return { items: paginated, next: nextCursor, totalCount };
  }
  async updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> {
    const { transactions } = await this.getState();
    const oldTx = transactions.find(t => t.id === id);
    if (!oldTx) throw new Error("Transaction not found");
    const newTx: Transaction = { ...oldTx, ...updates };
    // Skip balance updates for templates
    if (!oldTx.recurrent && !newTx.recurrent) {
      const oldAmount = oldTx.type === 'income' ? Math.abs(oldTx.amount) : -Math.abs(oldTx.amount);
      const newAmount = newTx.type === 'income' ? Math.abs(newTx.amount) : -Math.abs(newTx.amount);
      const mutations: Promise<any>[] = [];
      if (oldTx.accountId !== newTx.accountId) {
        // Account switched: Reverse old amount from old account, Apply new amount to new account
        mutations.push(new AccountEntity(this.env, oldTx.accountId).mutate(acc => ({ ...acc, balance: acc.balance - oldAmount })));
        mutations.push(new AccountEntity(this.env, newTx.accountId).mutate(acc => ({ ...acc, balance: acc.balance + newAmount })));
      } else if (oldAmount !== newAmount) {
        // Same account, different amount
        const balanceChange = newAmount - oldAmount;
        mutations.push(new AccountEntity(this.env, oldTx.accountId).mutate(acc => ({ ...acc, balance: acc.balance + balanceChange })));
      }
      await Promise.all(mutations);
    }
    await this.mutate(s => ({
      ...s,
      transactions: s.transactions.map(t => t.id === id ? newTx : t).sort((a, b) => b.ts - a.ts)
    }));
    return newTx;
  }
  async deleteTransaction(id: string): Promise<void> {
    const { transactions } = await this.getState();
    const txToDelete = transactions.find(t => t.id === id);
    if (!txToDelete) return;
    const mutations: Promise<any>[] = [];
    const idsToRemove = [id];
    const processTxDelete = (tx: Transaction) => {
      if (!tx.recurrent) {
        const amountToReverse = tx.type === 'income' ? -Math.abs(tx.amount) : Math.abs(tx.amount);
        mutations.push(new AccountEntity(this.env, tx.accountId).mutate(acc => ({ ...acc, balance: acc.balance + amountToReverse })));
      }
    };
    processTxDelete(txToDelete);
    if (txToDelete.recurrent) {
      const children = transactions.filter(t => t.parentId === id);
      children.forEach(child => {
        idsToRemove.push(child.id);
        processTxDelete(child);
      });
    }
    mutations.push(this.mutate(s => ({
      ...s,
      transactions: s.transactions.filter(t => !idsToRemove.includes(t.id))
    })));
    await Promise.all(mutations);
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
  static seedData = [];
}
export class SettingsEntity extends Entity<Settings> {
  static readonly entityName = "settings";
  static readonly initialState: Settings = { currency: 'EUR', fiscalMonthStart: 1, recurrentDefaultFrequency: 'monthly' };
  constructor(env: Env) {
    super(env, "global");
  }
}