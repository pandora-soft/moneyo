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
  const seedingMiddleware = async (c: Context<{ Bindings: Env, Variables: { user?: User } }>, next: () => Promise<void>) => {
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
  };
  // --- AUTH MIDDLEWARE ---
  const authGuard = async (c: Context<{ Bindings: Env, Variables: { user?: User } }>, next: () => Promise<void>) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!isStr(token)) return bad(c, 'Unauthorized');
    const sessionEntity = new SessionEntity(c.env, token);
    const session = await sessionEntity.getState();
    if (!session || !session.id || Date.now() >= session.expires) {
      if (session?.id) await SessionEntity.delete(c.env, token);
      return bad(c, 'Session expired or invalid');
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
    const user: User | undefined = c.get('user');
    if (!user || user.role !== 'admin') return bad(c, 'Forbidden: Admin access required');
    await next();
  };
  // --- AUTH ROUTES ---
  const auth = new Hono<{ Bindings: Env, Variables: { user?: User } }>();
  auth.use('*', seedingMiddleware);
  auth.post('/login', async (c) => {
    const { username, password } = await c.req.json<{username: string, password: string}>();
    if (!isStr(username) || !isStr(password)) return bad(c, 'Username and password required');
    const { items: users } = await UserEntity.list(c.env);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user || !await verifyPassword(password, user.passwordHash)) return bad(c, 'Invalid credentials');
    const token = crypto.randomUUID();
    await SessionEntity.create(c.env, { id: token, userId: user.id, expires: Date.now() + SESSION_DURATION });
    const { passwordHash, ...safeUser } = user;
    return ok(c, { token, user: safeUser });
  });
  auth.get('/verify', authGuard, (c) => {
    const user = c.get('user')! as User;
    const { passwordHash, ...safeUser } = user;
    return ok(c, { user: safeUser });
  });
  app.route('/api/auth', auth);
  // --- FINANCE ROUTES ---
  const finance = new Hono<{ Bindings: Env, Variables: { user?: User } }>();
  finance.use('*', seedingMiddleware);
  finance.use('*', authGuard);
  // ADMIN: Users
  finance.get('/users', adminGuard, async (c) => {
    const { items } = await UserEntity.list(c.env);
    return ok(c, items.map(({ passwordHash, ...user }) => user));
  });
  finance.post('/users', adminGuard, async (c) => {
    const body = await c.req.json<Partial<User> & { password?: string }>();
    if (!isStr(body.username) || !isStr(body.password) || !body.role) return bad(c, 'Missing data');
    const passwordHash = await hashPassword(body.password);
    const newUser: User = { id: crypto.randomUUID(), username: body.username, passwordHash, role: body.role as any, email: body.email };
    await UserEntity.create(c.env, newUser);
    return ok(c, newUser);
  });
  finance.put('/users/:id', adminGuard, async (c) => {
    const id = c.req.param('id');
    const { password, ...bodyUpdates } = await c.req.json<Partial<User> & { password?: string }>();
    const user = new UserEntity(c.env, id);
    if (!await user.exists()) return notFound(c);
    const updates: Partial<User> = { ...bodyUpdates };
    if (password) {
      updates.passwordHash = await hashPassword(password);
    }
    const updated = await user.mutate(u => ({ ...u, ...updates }));
    return ok(c, updated);
  });
  finance.delete('/users/:id', adminGuard, async (c) => ok(c, { deleted: await UserEntity.delete(c.env, c.req.param('id')) }));
  // ADMIN: Currencies
  finance.get('/currencies', async (c) => ok(c, (await CurrencyEntity.list(c.env)).items));
  finance.post('/currencies', adminGuard, async (c) => {
    const body = await c.req.json<Omit<Currency, 'id'>>();
    if (!isStr(body.code) || !isStr(body.symbol)) return bad(c, 'Code and symbol required');
    const newCurr = { id: crypto.randomUUID(), ...body, code: body.code.toUpperCase() };
    await CurrencyEntity.create(c.env, newCurr);
    return ok(c, newCurr);
  });
  finance.put('/currencies/:id', adminGuard, async (c) => {
    const curr = new CurrencyEntity(c.env, c.req.param('id'));
    if (!await curr.exists()) return notFound(c);
    const body = await c.req.json<Partial<Currency>>();
    return ok(c, await curr.mutate(s => ({ ...s, ...body })));
  });
  finance.delete('/currencies/:id', adminGuard, async (c) => ok(c, { deleted: await CurrencyEntity.delete(c.env, c.req.param('id')) }));
  // ADMIN: Frequencies
  finance.get('/frequencies', async (c) => ok(c, (await FrequencyEntity.list(c.env)).items));
  finance.post('/frequencies', adminGuard, async (c) => {
    const body = await c.req.json<any>();
    const newFreq = { id: crypto.randomUUID(), name: body.name, interval: body.interval, unit: body.unit };
    await FrequencyEntity.create(c.env, newFreq);
    return ok(c, newFreq);
  });
  finance.put('/frequencies/:id', adminGuard, async (c) => {
    const freq = new FrequencyEntity(c.env, c.req.param('id'));
    if (!await freq.exists()) return notFound(c);
    const body = await c.req.json<any>();
    return ok(c, await freq.mutate(s => ({ ...s, ...body })));
  });
  finance.delete('/frequencies/:id', adminGuard, async (c) => ok(c, { deleted: await FrequencyEntity.delete(c.env, c.req.param('id')) }));
  // ADMIN: Categories
  finance.get('/categories', async (c) => ok(c, (await CategoryEntity.list(c.env)).items));
  finance.post('/categories', adminGuard, async (c) => {
    const { name } = await c.req.json<{name: string}>();
    if (!isStr(name)) return bad(c, 'Name required');
    const newCat = { id: crypto.randomUUID(), name };
    await CategoryEntity.create(c.env, newCat);
    return ok(c, newCat);
  });
  finance.put('/categories/:id', adminGuard, async (c) => {
    const cat = new CategoryEntity(c.env, c.req.param('id'));
    if (!await cat.exists()) return notFound(c);
    const { name } = await c.req.json<{name: string}>();
    return ok(c, await cat.mutate(s => ({ ...s, name })));
  });
  finance.delete('/categories/:id', adminGuard, async (c) => ok(c, { deleted: await CategoryEntity.delete(c.env, c.req.param('id')) }));
  // Accounts
  finance.get('/accounts', async (c) => ok(c, (await AccountEntity.list(c.env)).items));
  finance.post('/accounts', async (c) => {
    const body = await c.req.json<Partial<Account>>();
    const newAcc: Account = { id: crypto.randomUUID(), name: body.name!, type: body.type!, currency: body.currency!, balance: body.balance || 0, createdAt: Date.now() };
    await AccountEntity.create(c.env, newAcc);
    return ok(c, newAcc);
  });
  finance.put('/accounts/:id', async (c) => {
    const acc = new AccountEntity(c.env, c.req.param('id'));
    if (!await acc.exists()) return notFound(c);
    const body = await c.req.json();
    return ok(c, await acc.mutate(s => ({ ...s, ...body })));
  });
  finance.delete('/accounts/:id', async (c) => ok(c, { deleted: await AccountEntity.delete(c.env, c.req.param('id')) }));
  // Transactions
  finance.get('/transactions', async (c) => {
    const q = c.req.query();
    const ledger = new LedgerEntity(c.env, 'main');
    return ok(c, await ledger.listTransactions(Number(q.limit) || 25, Number(q.cursor) || 0, { accountId: q.accountId, type: q.type, query: q.query, dateFrom: Number(q.dateFrom), dateTo: Number(q.dateTo) }));
  });
  finance.post('/transactions/generate', async (c) => {
    const ledger = new LedgerEntity(c.env, 'main');
    const generated = await ledger.generateRecurrents();
    return ok(c, generated);
  });
  finance.post('/transactions', async (c) => {
    const body = await c.req.json<Transaction>();
    const ledger = new LedgerEntity(c.env, 'main');
    if (body.type === 'transfer') {
      const amount = Math.abs(body.amount);
      const expense = await ledger.addTransaction({ ...body, amount: -amount });
      const income = await ledger.addTransaction({ ...body, accountId: body.accountTo!, accountTo: body.accountId, amount });
      await new AccountEntity(c.env, body.accountId).mutate(a => ({ ...a, balance: a.balance - amount }));
      await new AccountEntity(c.env, body.accountTo!).mutate(a => ({ ...a, balance: a.balance + amount }));
      return ok(c, { expense, income });
    }
    const tx = await ledger.addTransaction(body);
    if (!body.recurrent) await new AccountEntity(c.env, body.accountId).mutate(a => ({ ...a, balance: a.balance + (body.type === 'income' ? body.amount : -body.amount) }));
    return ok(c, tx);
  });
  finance.put('/transactions/:id', async (c) => ok(c, await new LedgerEntity(c.env, 'main').updateTransaction(c.req.param('id'), await c.req.json())));
  finance.delete('/transactions/:id', async (c) => {
    await new LedgerEntity(c.env, 'main').deleteTransaction(c.req.param('id'));
    return ok(c, { deleted: true });
  });
  // Budgets
  finance.get('/budgets', async (c) => ok(c, (await BudgetEntity.list(c.env)).items));
  finance.post('/budgets', async (c) => {
    const body = await c.req.json<Budget>();
    const newB = { ...body, id: crypto.randomUUID() };
    await BudgetEntity.create(c.env, newB);
    return ok(c, newB);
  });
  finance.put('/budgets/:id', async (c) => {
    const b = new BudgetEntity(c.env, c.req.param('id'));
    if (!await b.exists()) return notFound(c);
    const body = await c.req.json();
    return ok(c, await b.mutate(s => ({ ...s, ...body })));
  });
  finance.delete('/budgets/:id', async (c) => ok(c, { deleted: await BudgetEntity.delete(c.env, c.req.param('id')) }));
  // Settings
  finance.get('/settings', async (c) => ok(c, await new SettingsEntity(c.env).getState()));
  finance.post('/settings', adminGuard, async (c) => {
    const settings = new SettingsEntity(c.env);
    await settings.patch(await c.req.json());
    return ok(c, await settings.getState());
  });
  app.route('/api/finance', finance);
}