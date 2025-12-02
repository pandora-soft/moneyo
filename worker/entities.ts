import { IndexedEntity, Entity, Env } from "./core-utils";
import type { Account, Transaction, Budget, Settings } from "@shared/types";
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS } from "@shared/mock-data";
import { addMonths, addWeeks, isBefore, startOfToday } from 'date-fns';
export class AccountEntity extends IndexedEntity<Account> {
  static readonly entityName = "account";
  static readonly indexName = "accounts";
  static readonly initialState: Account = { id: "", name: "", type: 'bank', currency: 'USD', balance: 0, createdAt: 0 };
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
    const { transactions } = await this.getState();
    const recurrentTemplates = transactions.filter(t => t.recurrent);
    const today = startOfToday();
    const generatedTxs: Omit<Transaction, 'id'>[] = [];
    for (const template of recurrentTemplates) {
      let nextDate = new Date(template.ts);
      while (isBefore(nextDate, today)) {
        const nextDueDate = template.frequency === 'weekly' ? addWeeks(nextDate, 1) : addMonths(nextDate, 1);
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
    if (generatedTxs.length > 0) {
      return this.bulkAddTransactions(generatedTxs);
    }
    return [];
  }
  async listTransactions(limit = 50, cursor = 0): Promise<{ items: Transaction[]; next: number | null; }> {
    const { transactions } = await this.getState();
    const paginated = transactions.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < transactions.length ? cursor + limit : null;
    return { items: paginated, next: nextCursor };
  }
  async updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> {
    const { transactions } = await this.getState();
    const oldTx = transactions.find(t => t.id === id);
    if (!oldTx) throw new Error("Transaction not found");
    const newTx: Transaction = { ...oldTx, ...updates };
    const oldAmount = oldTx.type === 'income' ? Math.abs(oldTx.amount) : -Math.abs(oldTx.amount);
    const newAmount = newTx.type === 'income' ? Math.abs(newTx.amount) : -Math.abs(newTx.amount);
    const balanceChange = newAmount - oldAmount;
    if (balanceChange !== 0) {
      const account = new AccountEntity(this.env, oldTx.accountId);
      await account.mutate(acc => ({ ...acc, balance: acc.balance + balanceChange }));
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
    const amountToReverse = txToDelete.type === 'income' ? -Math.abs(txToDelete.amount) : Math.abs(txToDelete.amount);
    mutations.push(new AccountEntity(this.env, txToDelete.accountId).mutate(acc => ({ ...acc, balance: acc.balance + amountToReverse })));
    let idsToDelete = [id];
    // If deleting a recurrent template, also delete its children
    if (txToDelete.recurrent) {
        const children = transactions.filter(t => t.parentId === id);
        idsToDelete.push(...children.map(c => c.id));
    }
    mutations.push(this.mutate(s => ({
      ...s,
      transactions: s.transactions.filter(t => !idsToDelete.includes(t.id))
    })));
    await Promise.all(mutations);
  }
}
export class BudgetEntity extends IndexedEntity<Budget> {
  static readonly entityName = "budget";
  static readonly indexName = "budgets";
  static readonly initialState: Budget = { id: "", accountId: "", month: 0, category: "", limit: 0 };
  static seedData = [];
}
export class SettingsEntity extends Entity<Settings> {
  static readonly entityName = "settings";
  static readonly initialState: Settings = { currency: 'USD', fiscalMonthStart: 1, recurrentDefaultFrequency: 'monthly' };
  constructor(env: Env) {
    super(env, "global");
  }
}