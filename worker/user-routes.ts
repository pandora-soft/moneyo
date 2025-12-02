import { Hono } from "hono";
import type { Env } from './core-utils';
import { AccountEntity, LedgerEntity, BudgetEntity, SettingsEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { Account, Transaction, AccountType, Budget, Settings } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  const finance = new Hono<{ Bindings: Env }>();
  finance.use('*', async (c, next) => {
    await Promise.all([
      AccountEntity.ensureSeed(c.env),
      LedgerEntity.ensureSeed(c.env),
      BudgetEntity.ensureSeed(c.env),
    ]);
    await next();
  });
  // ACCOUNTS API
  finance.get('/accounts', async (c) => {
    const { items } = await AccountEntity.list(c.env);
    return ok(c, items.sort((a, b) => a.createdAt - b.createdAt));
  });
  finance.post('/accounts', async (c) => {
    const { name, type, currency, balance } = await c.req.json<Partial<Account>>();
    if (!isStr(name) || !isStr(type)) return bad(c, 'Name and type are required');
    const newAccount: Account = {
      id: crypto.randomUUID(),
      name,
      type,
      currency: currency || 'USD',
      balance: balance || 0,
      createdAt: Date.now(),
    };
    await AccountEntity.create(c.env, newAccount);
    return ok(c, newAccount);
  });
  finance.delete('/accounts/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = await AccountEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });
  // TRANSACTIONS API
  finance.get('/transactions', async (c) => {
    const limit = Number(c.req.query('limit')) || 50;
    const cursor = Number(c.req.query('cursor')) || 0;
    const ledger = new LedgerEntity(c.env, 'main');
    const page = await ledger.listTransactions(limit, cursor);
    return ok(c, page);
  });
  finance.post('/transactions', async (c) => {
    const body = await c.req.json<Omit<Transaction, 'id' | 'currency'> & { currency?: 'USD' | 'EUR' | 'ARS' }>();
    if (!isStr(body.accountId) || !body.amount || !isStr(body.category)) {
      return bad(c, 'accountId, amount, and category are required');
    }
    const ledger = new LedgerEntity(c.env, 'main');
    const fromAccount = new AccountEntity(c.env, body.accountId);
    if (!await fromAccount.exists()) return notFound(c, 'Source account not found');
    if (body.type === 'transfer') {
      if (!body.accountTo) return bad(c, 'Destination account is required for transfers');
      const toAccount = new AccountEntity(c.env, body.accountTo);
      if (!await toAccount.exists()) return notFound(c, 'Destination account not found');
      const amount = Math.abs(body.amount);
      // Create two transactions for the ledger
      const expenseTxData: Omit<Transaction, 'id'> = { ...body, type: 'expense', amount: -amount };
      const incomeTxData: Omit<Transaction, 'id'> = { ...body, accountId: body.accountTo, accountTo: body.accountId, type: 'income', amount: amount };
      const [expenseTx, incomeTx] = await Promise.all([
        ledger.addTransaction(expenseTxData),
        ledger.addTransaction(incomeTxData),
        fromAccount.mutate(acc => ({ ...acc, balance: acc.balance - amount })),
        toAccount.mutate(acc => ({ ...acc, balance: acc.balance + amount })),
      ]);
      return ok(c, { expenseTx, incomeTx });
    }
    const amount = body.type === 'income' ? Math.abs(body.amount) : -Math.abs(body.amount);
    const newTxData: Omit<Transaction, 'id'> = { ...body, amount };
    const newTx = await ledger.addTransaction(newTxData);
    await fromAccount.mutate(acc => ({ ...acc, balance: acc.balance + amount }));
    return ok(c, newTx);
  });
  // BUDGETS API
  finance.get('/budgets', async (c) => {
    const { items } = await BudgetEntity.list(c.env);
    return ok(c, items);
  });
  finance.post('/budgets', async (c) => {
    const body = await c.req.json<Omit<Budget, 'id'>>();
    if (!body.accountId || !body.category || !body.limit || !body.month) {
      return bad(c, 'Missing required fields for budget');
    }
    const newBudget: Budget = { ...body, id: crypto.randomUUID() };
    await BudgetEntity.create(c.env, newBudget);
    return ok(c, newBudget);
  });
  // SETTINGS API
  finance.get('/settings', async (c) => {
    const settings = await new SettingsEntity(c.env).getState();
    return ok(c, settings);
  });
  finance.post('/settings', async (c) => {
    const body = await c.req.json<Partial<Settings>>();
    const settingsEntity = new SettingsEntity(c.env);
    await settingsEntity.patch(body);
    return ok(c, await settingsEntity.getState());
  });
  app.route('/api/finance', finance);
}