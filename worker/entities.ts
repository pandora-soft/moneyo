import { IndexedEntity, Entity, Env } from "./core-utils";
import type { Account, Transaction, Budget, Settings } from "@shared/types";
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS } from "@shared/mock-data";
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
    // For simplicity in this phase, we assume transfers are not editable in a way that changes accounts/type.
    // A full implementation would require more complex logic to handle linked transactions.
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
    // Reverse balance for the primary transaction
    const primaryAccount = new AccountEntity(this.env, txToDelete.accountId);
    const amountToReverse = txToDelete.type === 'income' ? -Math.abs(txToDelete.amount) : Math.abs(txToDelete.amount);
    mutations.push(primaryAccount.mutate(acc => ({ ...acc, balance: acc.balance + amountToReverse })));
    let idsToDelete = [id];
    // If it's a transfer, find and delete the linked transaction
    if (txToDelete.type === 'transfer' && txToDelete.accountTo) {
      const linkedTx = transactions.find(t =>
        t.type === 'transfer' &&
        t.accountTo === txToDelete.accountId &&
        t.accountId === txToDelete.accountTo &&
        Math.abs(t.amount - txToDelete.amount) < 0.01 && // floating point comparison
        Math.abs(t.ts - txToDelete.ts) < 2000 // assume they happen close together
      );
      if (linkedTx) {
        idsToDelete.push(linkedTx.id);
        const linkedAccount = new AccountEntity(this.env, linkedTx.accountId);
        const linkedAmountToReverse = linkedTx.type === 'income' ? -Math.abs(linkedTx.amount) : Math.abs(linkedTx.amount);
        mutations.push(linkedAccount.mutate(acc => ({ ...acc, balance: acc.balance + linkedAmountToReverse })));
      }
    }
    // Update ledger state
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
  static readonly initialState: Settings = { currency: 'USD', fiscalMonthStart: 1 };
  constructor(env: Env) {
    super(env, "global");
  }
}