import { Hono } from "hono";
import type { Env } from './core-utils';
import { AccountEntity, LedgerEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { Account, Transaction, AccountType, TransactionType } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // Ensure seed data on first request to any finance route
  const finance = new Hono<{ Bindings: Env }>();
  finance.use('*', async (c, next) => {
    await Promise.all([
      AccountEntity.ensureSeed(c.env),
      LedgerEntity.ensureSeed(c.env),
    ]);
    await next();
  });
  // ACCOUNTS API
  finance.get('/accounts', async (c) => {
    const { items } = await AccountEntity.list(c.env);
    return ok(c, items.sort((a, b) => a.createdAt - b.createdAt));
  });
  finance.post('/accounts', async (c) => {
    const { name, type, currency, balance } = await c.req.json<{ name: string; type: AccountType; currency: 'USD' | 'EUR' | 'ARS', balance: number }>();
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
    // Note: In a real app, you'd also delete associated transactions or reassign them.
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
    const body = await c.req.json<Omit<Transaction, 'id' | 'currency' | 'ts'> & { currency?: 'USD' | 'EUR' | 'ARS', ts?: number }>();
    if (!isStr(body.accountId) || !body.amount || !isStr(body.category)) {
      return bad(c, 'accountId, amount, and category are required');
    }
    const account = new AccountEntity(c.env, body.accountId);
    if (!await account.exists()) {
      return notFound(c, 'Account not found');
    }
    const ledger = new LedgerEntity(c.env, 'main');
    const newTxData: Omit<Transaction, 'id'> = {
      ...body,
      amount: Number(body.amount),
      currency: body.currency || 'USD',
      ts: body.ts || Date.now(),
    };
    const newTx = await ledger.addTransaction(newTxData);
    // Atomicity is not guaranteed, but it's acceptable for this phase.
    await account.mutate(acc => {
      const newBalance = newTx.type === 'income' ? acc.balance + newTx.amount : acc.balance - newTx.amount;
      return { ...acc, balance: newBalance };
    });
    return ok(c, newTx);
  });
  app.route('/api/finance', finance);
  // --- Keep existing demo routes for template compatibility if needed ---
  app.get('/api/health', (c) => c.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() }}));
}