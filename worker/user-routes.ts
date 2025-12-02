import { Hono } from "hono";
import type { Env } from './core-utils';
import { AccountEntity, LedgerEntity, BudgetEntity, SettingsEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { Account, Transaction, Budget, Settings, Currency, TransactionType } from "@shared/types";
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
  finance.put('/accounts/:id', async (c) => {
    const id = c.req.param('id');
    const { name, type, currency } = await c.req.json<Partial<Account>>();
    const account = new AccountEntity(c.env, id);
    if (!await account.exists()) return notFound(c, 'Account not found');
    const updatedAccount = await account.mutate(acc => ({ ...acc, name: name || acc.name, type: type || acc.type, currency: currency || acc.currency }));
    return ok(c, updatedAccount);
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
    const body = await c.req.json<Omit<Transaction, 'id' | 'currency'> & { currency?: Currency }>();
    if (!isStr(body.accountId) || !body.amount || !isStr(body.category)) {
      return bad(c, 'accountId, amount, and category are required');
    }
    const ledger = new LedgerEntity(c.env, 'main');
    const fromAccount = new AccountEntity(c.env, body.accountId);
    if (!await fromAccount.exists()) return notFound(c, 'Source account not found');
    const fromAccountState = await fromAccount.getState();
    const currency = fromAccountState.currency;
    if (body.type === 'transfer') {
      // Transfers cannot be recurrent in this implementation
      body.recurrent = false;
      if (!body.accountTo) return bad(c, 'Destination account is required for transfers');
      const toAccount = new AccountEntity(c.env, body.accountTo);
      if (!await toAccount.exists()) return notFound(c, 'Destination account not found');
      const amount = Math.abs(body.amount);
      const expenseTxData: Omit<Transaction, 'id'> = { ...body, type: 'transfer', amount, currency };
      const incomeTxData: Omit<Transaction, 'id'> = { ...body, accountId: body.accountTo, accountTo: body.accountId, type: 'transfer', amount, currency };
      const [expenseTx, incomeTx] = await Promise.all([
        ledger.addTransaction(expenseTxData),
        ledger.addTransaction(incomeTxData),
        fromAccount.mutate(acc => ({ ...acc, balance: acc.balance - amount })),
        toAccount.mutate(acc => ({ ...acc, balance: acc.balance + amount })),
      ]);
      return ok(c, { expenseTx, incomeTx });
    }
    const amount = body.type === 'income' ? Math.abs(body.amount) : -Math.abs(body.amount);
    const newTxData: Omit<Transaction, 'id'> = { ...body, amount: body.type === 'income' ? Math.abs(body.amount) : body.amount, currency };
    const newTx = await ledger.addTransaction(newTxData);
    if (!body.recurrent) {
        await fromAccount.mutate(acc => ({ ...acc, balance: acc.balance + amount }));
    }
    return ok(c, newTx);
  });
  finance.post('/transactions/import', async (c) => {
    const formData = await c.req.formData();
    const csvFile = formData.get('file') as File;
    if (!csvFile) return bad(c, 'CSV file is required');
    const csvText = await csvFile.text();
    const lines = csvText.split('\n').slice(1).filter(line => line.trim() !== '');
    const allAccounts = await AccountEntity.list(c.env).then(p => p.items);
    const accountsMap = new Map(allAccounts.map(a => [a.name.toLowerCase(), a]));
    const txs: Omit<Transaction, 'id'>[] = [];
    for (const line of lines) {
        const [date, accountName, type, amount, category, note] = line.split(',');
        const account = accountsMap.get(accountName?.trim().toLowerCase());
        if (!account) continue; // Skip if account not found
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) continue;
        txs.push({
            ts: new Date(date).getTime(),
            accountId: account.id,
            type: type.trim() as TransactionType,
            amount: parsedAmount,
            currency: account.currency,
            category: category.trim(),
            note: note?.trim(),
        });
    }
    const ledger = new LedgerEntity(c.env, 'main');
    const imported = await ledger.bulkAddTransactions(txs);
    return ok(c, { imported: imported.length });
  });
  finance.post('/transactions/generate', async (c) => {
    const ledger = new LedgerEntity(c.env, 'main');
    const generated = await ledger.generateRecurrents();
    return ok(c, { generated: generated.length });
  });
  finance.put('/transactions/:id', async (c) => {
    const id = c.req.param('id');
    if (!isStr(id)) return bad(c, 'Invalid ID');
    const updates = await c.req.json<Partial<Omit<Transaction, 'id'>>>();
    if (!Object.keys(updates).length) return bad(c, 'No updates provided');
    const ledger = new LedgerEntity(c.env, 'main');
    try {
      const updated = await ledger.updateTransaction(id, updates);
      return ok(c, updated);
    } catch (e: any) {
      if (e.message === "Transaction not found") return notFound(c, e.message);
      return bad(c, "Failed to update transaction");
    }
  });
  finance.delete('/transactions/:id', async (c) => {
    const id = c.req.param('id');
    if (!isStr(id)) return bad(c, 'Invalid ID');
    const ledger = new LedgerEntity(c.env, 'main');
    await ledger.deleteTransaction(id);
    return ok(c, { id, deleted: true });
  });
  // BUDGETS API
  finance.get('/budgets', async (c) => {
    let { items } = await BudgetEntity.list(c.env);
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