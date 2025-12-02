import { IndexedEntity, Entity } from "./core-utils";
import type { Account, Transaction, Budget, Settings, Currency } from "@shared/types";
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS } from "@shared/mock-data";

interface Env {
  id?: string | number;

  [key: string]: unknown;
}export class AccountEntity extends IndexedEntity<Account> {static readonly entityName = "account";static readonly indexName = "accounts";static readonly initialState: Account = { id: "", name: "", type: 'bank', currency: 'USD', balance: 0, createdAt: 0 };static seedData = MOCK_ACCOUNTS;
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
  async listTransactions(limit = 50, cursor = 0): Promise<{items: Transaction[];next: number | null;}> {
    const { transactions } = await this.getState();
    const paginated = transactions.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < transactions.length ? cursor + limit : null;
    return { items: paginated, next: nextCursor };
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