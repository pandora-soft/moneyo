import { Hono } from "hono";
import type { Env } from './core-utils';
import {
  AccountEntity,
  LedgerEntity,
  BudgetEntity,
  SettingsEntity,
  CategoryEntity,
  CurrencyEntity,
  FrequencyEntity,
  UserEntity,
  SessionEntity,
  verifyPassword,
  hashPassword
} from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { Account, Transaction, Budget, Settings, TransactionType, Currency, User } from "@shared/types";
import type { Context } from "hono";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
export type AppHono = Hono<{ Bindings: Env, Variables: { user?: User } }>;
export function userRoutes(app: AppHono) {
  // --- SEEDING MIDDLEWARE ---
  app.use('/api/*', async (c, next) => {
    await Promise.all([
      UserEntity.ensureSeed(c.env),
      AccountEntity.ensureSeed(c.env),
      LedgerEntity.ensureSeed(c.env),
      BudgetEntity.ensureSeed(c.env),
      CategoryEntity.ensureSeed(c.env),
      CurrencyEntity.ensureSeed(c.env),
      FrequencyEntity.ensureSeed(c.env),
    ]);
    await next();
  });
  // --- AUTH MIDDLEWARE ---
  const authGuard = async (c: Context<{ Bindings: Env, Variables: { user?: User } }>, next: () => Promise<void>) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!isStr(token)) {
      return bad(c, 'Unauthorized');
    }
    const sessionEntity = new SessionEntity(c.env, token);
    const session = await sessionEntity.getState();
    if (!session || !session.id) {
      return bad(c, 'Session expired or invalid');
    }
    if (Date.now() >= session.expires) {
      await SessionEntity.delete(c.env, token);
      return bad(c, 'Session expired');
    }
    const userEntity = new UserEntity(c.env, session.userId);
    const user = await userEntity.getState();
    if (!user || !user.id) {
      await sessionEntity.delete();
      return bad(c, 'Invalid session');
    }
    c.set('user', user);
    await next();
  };
  const adminGuard = async (c: Context<{ Bindings: Env, Variables: { user?: User } }>, next: () => Promise<void>) => {
    const user = c.get('user');
    if (!user || user.role !== 'admin') {
      return bad(c, 'Forbidden: Admin access required');
    }
    await next();
  };
  // --- AUTH ROUTES ---
  const auth = new Hono<{ Bindings: Env, Variables: { user?: User } }>();
  auth.post('/login', async (c) => {
    const { username, password } = await c.req.json<{username: string, password: string}>();
    if (!isStr(username) || !isStr(password)) return bad(c, 'Username and password required');
    const { items: users } = await UserEntity.list(c.env);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user || !user.id) return bad(c, 'Invalid credentials');
    if (!await verifyPassword(password, user.passwordHash)) return bad(c, 'Invalid credentials');
    const token = crypto.randomUUID();
    const sessionData = { id: token, userId: user.id, expires: Date.now() + SESSION_DURATION };
    await SessionEntity.create(c.env, sessionData);
    const { passwordHash, ...userWithoutPassword } = user;
    return ok(c, { token, user: userWithoutPassword });
  });
  auth.get('/verify', authGuard, (c) => {
    const user = c.get('user') as User;
    if (!user) return bad(c, 'Unauthorized');
    const { passwordHash, ...userWithoutPassword } = user;
    return ok(c, { user: userWithoutPassword });
  });
  app.route('/api/auth', auth);
  // --- FINANCE ROUTES (PROTECTED) ---
  const finance = new Hono<{ Bindings: Env, Variables: { user?: User } }>();
  finance.use('*', authGuard);
  // USERS API (ADMIN ONLY)
  finance.get('/users', adminGuard, async (c) => {
    const { items } = await UserEntity.list(c.env);
    const usersWithoutPasswords = items.map(({ passwordHash, ...user }) => user);
    return ok(c, usersWithoutPasswords);
  });
  finance.post('/users', adminGuard, async (c) => {
    const { username, password, role, email } = await c.req.json<Partial<User> & { password?: string }>();
    if (!isStr(username) || !isStr(password) || !role) return bad(c, 'Username, password, and role are required');
    const { items: existingUsers } = await UserEntity.list(c.env);
    if (existingUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return bad(c, 'El nombre de usuario ya existe');
    }
    const passwordHash = await hashPassword(password);
    const newUser: User = { id: crypto.randomUUID(), username, passwordHash, role, email };
    await UserEntity.create(c.env, newUser);
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return ok(c, userWithoutPassword);
  });
  finance.put('/users/:id', adminGuard, async (c) => {
    const id = c.req.param('id');
    const { username, password, role, email } = await c.req.json<Partial<User> & { password?: string }>();
    const userEntity = new UserEntity(c.env, id);
    if (!await userEntity.exists()) return notFound(c, 'User not found');
    const updates: Partial<User> = {};
    if (isStr(username)) {
      const { items: existingUsers } = await UserEntity.list(c.env);
      if (existingUsers.some(u => u.id !== id && u.username.toLowerCase() === username.toLowerCase())) {
        return bad(c, 'El nombre de usuario ya existe');
      }
      updates.username = username;
    }
    if (password && isStr(password)) {
      updates.passwordHash = await hashPassword(password);
    }
    if (role) updates.role = role;
    if (email !== undefined) updates.email = email;
    const updatedUser = await userEntity.mutate(u => ({ ...u, ...updates }));
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return ok(c, userWithoutPassword);
  });
  finance.delete('/users/:id', adminGuard, async (c) => {
    const id = c.req.param('id');
    const deleted = await UserEntity.delete(c.env, id);
    return ok(c, { id, deleted });
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
    const updatedAccount = await account.mutate(acc => ({
      ...acc,
      name: name || acc.name,
      type: type || acc.type,
      currency: currency || acc.currency
    }));
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
    const accountId = c.req.query('accountId');
    const type = c.req.query('type');
    const dateFrom = c.req.query('dateFrom') ? Number(c.req.query('dateFrom')) : undefined;
    const dateTo = c.req.query('dateTo') ? Number(c.req.query('dateTo')) : undefined;
    const query = c.req.query('query');
    const ledger = new LedgerEntity(c.env, 'main');
    const page = await ledger.listTransactions(limit, cursor, { accountId, type, dateFrom, dateTo, query });
    return ok(c, page);
  });
  finance.post('/transactions', async (c) => {
    const body = await c.req.json<Omit<Transaction, 'id'>>();
    if (!isStr(body.accountId) || !body.amount || !isStr(body.category)) {
      return bad(c, 'accountId, amount, and category are required');
    }
    const ledger = new LedgerEntity(c.env, 'main');
    const fromAccount = new AccountEntity(c.env, body.accountId);
    if (!await fromAccount.exists()) return notFound(c, 'Source account not found');
    const fromAccountState = await fromAccount.getState();
    const currency = fromAccountState.currency;
    if (body.type === 'transfer') {
      const transferBody = { ...body, recurrent: false };
      if (!transferBody.accountTo) return bad(c, 'Destination account is required for transfers');
      const toAccount = new AccountEntity(c.env, body.accountTo!);
      if (!await toAccount.exists()) return notFound(c, 'Destination account not found');
      const amount = Math.abs(body.amount);
      const expenseTxData: Omit<Transaction, 'id'> = { ...transferBody, type: 'transfer', amount: -amount, currency };
      const incomeTxData: Omit<Transaction, 'id'> = { ...transferBody, accountId: transferBody.accountTo, accountTo: transferBody.accountId, type: 'transfer', amount, currency };
      const [expenseTx, incomeTx] = await Promise.all([
        ledger.addTransaction(expenseTxData),
        ledger.addTransaction(incomeTxData),
        fromAccount.mutate(acc => ({ ...acc, balance: acc.balance - amount })),
        toAccount.mutate(acc => ({ ...acc, balance: acc.balance + amount })),
      ]);
      return ok(c, { expenseTx, incomeTx });
    }
    const amount = body.type === 'income' ? Math.abs(body.amount) : -Math.abs(body.amount);
    const newTxData: Omit<Transaction, 'id'> = { ...body, amount, currency };
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
        if (!account) continue;
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) continue;
        const ts = new Date(date).getTime();
        if (isNaN(ts)) continue;
        txs.push({
            ts,
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
    try {
      const ledger = new LedgerEntity(c.env, 'main');
      const generated = await ledger.generateRecurrents();
      return ok(c, { generated: generated.length });
    } catch (e: any) {
      return bad(c, e.message || "Failed to generate recurrent transactions");
    }
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
    const { items } = await BudgetEntity.list(c.env);
    return ok(c, items);
  });
  finance.post('/budgets', async (c) => {
    const { month, category, limit } = await c.req.json<Omit<Budget, 'id'>>();
    if (!month || !category || !limit) {
      return bad(c, 'Missing required fields for budget');
    }
    const newBudget: Budget = { id: crypto.randomUUID(), month, category, limit };
    await BudgetEntity.create(c.env, newBudget);
    return ok(c, newBudget);
  });
  finance.put('/budgets/:id', async (c) => {
    const id = c.req.param('id');
    if (!isStr(id)) return bad(c, 'Invalid ID');
    const { month, category, limit } = await c.req.json<Omit<Budget, 'id'>>();
    const budget = new BudgetEntity(c.env, id);
    if (!await budget.exists()) return notFound(c, 'Budget not found');
    const updated = await budget.mutate(b => ({ ...b, month: month || b.month, category: category || b.category, limit: limit || b.limit }));
    return ok(c, updated);
  });
  finance.delete('/budgets/:id', async (c) => {
    const id = c.req.param('id');
    if (!isStr(id)) return bad(c, 'Invalid ID');
    const deleted = await BudgetEntity.delete(c.env, id);
    return deleted ? ok(c, { id, deleted: true }) : notFound(c, 'Budget not found');
  });
  // CATEGORIES API
  finance.get('/categories', async (c) => {
    const { items } = await CategoryEntity.list(c.env);
    return ok(c, items.sort((a, b) => a.name.localeCompare(b.name)));
  });
  finance.post('/categories', adminGuard, async (c) => {
    const { name } = await c.req.json<{name: string}>();
    if (!isStr(name) || name.length < 2) return bad(c, 'Nombre requerido (m��n. 2 chars)');
    const { items } = await CategoryEntity.list(c.env);
    if (items.find(cat => cat.name.toLowerCase() === name.toLowerCase())) return bad(c, 'Categoría ya existe');
    const newCat = { id: crypto.randomUUID(), name: name.trim() };
    await CategoryEntity.create(c.env, newCat);
    return ok(c, newCat);
  });
  finance.delete('/categories/:id', adminGuard, async (c) => {
    const id = c.req.param('id');
    const deleted = await CategoryEntity.delete(c.env, id);
    return deleted ? ok(c, { id, deleted: true }) : notFound(c);
  });
  // CURRENCIES API
  finance.get('/currencies', async (c) => {
    const { items } = await CurrencyEntity.list(c.env);
    return ok(c, items.sort((a, b) => a.code.localeCompare(b.code)));
  });
  // FREQUENCIES API
  finance.get('/frequencies', async (c) => {
    const { items } = await FrequencyEntity.list(c.env);
    return ok(c, items);
  });
  // SETTINGS API
  finance.get('/settings', async (c) => {
    const settings = await new SettingsEntity(c.env).getState();
    return ok(c, settings);
  });
  finance.post('/settings', adminGuard, async (c) => {
    const body = await c.req.json<Partial<Settings>>();
    const settingsEntity = new SettingsEntity(c.env);
    await settingsEntity.patch(body);
    return ok(c, await settingsEntity.getState());
  });
  app.route('/api/finance', finance);
}