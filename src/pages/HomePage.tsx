import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { PlusCircle, ArrowRight, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import type { Account, Transaction } from '@shared/types';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useAppStore } from '@/stores/useAppStore';
import { useFormatCurrency } from '@/lib/formatCurrency';
import { toast } from 'sonner';
import t from '@/lib/i18n';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
function AdminDashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const openModal = useAppStore((state) => state.openModal);
  const refetchTrigger = useAppStore((state) => state.refetchData);
  const formatCurrency = useFormatCurrency();
  const fetchData = async () => {
    try {
      setLoading(true);
      const [accs, txs] = await Promise.all([
        api<Account[]>('/api/finance/accounts'),
        api<{ items: Transaction[] }>('/api/finance/transactions?limit=100').then(p => p.items),
      ]);
      setAccounts(accs);
      setTransactions(txs);
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast.error('Error al cargar los datos del dashboard.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [refetchTrigger]);
  const stats = useMemo(() => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const recentTransactions = transactions.filter(tx => new Date(tx.ts) > oneMonthAgo);
    const income = recentTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = recentTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const balance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const sortedTx = [...transactions].sort((a, b) => a.ts - b.ts);
    let runningBalance = balance;
    const historicalBalances: { [key: number]: number } = {};
    for (let i = sortedTx.length - 1; i >= 0; i--) {
        historicalBalances[sortedTx[i].ts] = runningBalance;
        const tx = sortedTx[i];
        if (tx.type === 'income') runningBalance -= tx.amount;
        else if (tx.type === 'expense') runningBalance += Math.abs(tx.amount);
        else if (tx.type === 'transfer' && tx.accountTo) runningBalance += Math.abs(tx.amount);
    }
    const trendData = recentTransactions.sort((a,b) => a.ts - b.ts).map(tx => ({
        date: new Date(tx.ts).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        balance: historicalBalances[tx.ts] || 0 
    }));
    return { totalBalance: balance, totalIncome: income, totalExpenses: expenses, balanceTrend: trendData };
  }, [accounts, transactions]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12 relative">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 p-6 rounded-2xl bg-gradient-to-br from-orange-50/50 via-transparent to-transparent dark:from-orange-950/10 dark:to-transparent border border-orange-100/20">
          <div>
            <h1 className="text-4xl font-display font-bold">{t('pages.dashboard')}</h1>
            <p className="text-muted-foreground mt-1">{t('dashboard.summary')}</p>
          </div>
          <Button onClick={() => openModal()} size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
            <PlusCircle className="mr-2 size-5" /> {t('common.addTransaction')}
          </Button>
        </header>
        <main className="space-y-8">
          <motion.div
            className="grid gap-6 md:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)
            ) : (
              <>
                <motion.div variants={cardVariants}><Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t('dashboard.totalBalance')}</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</div><p className="text-xs text-muted-foreground">{t('dashboard.allAccounts')}</p></CardContent></Card></motion.div>
                <motion.div variants={cardVariants}><Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t('dashboard.incomeLast30')}</CardTitle><TrendingUp className="h-4 w-4 text-emerald-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-500">{formatCurrency(stats.totalIncome)}</div><p className="text-xs text-muted-foreground">{t('dashboard.inflow')}</p></CardContent></Card></motion.div>
                <motion.div variants={cardVariants}><Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t('dashboard.expensesLast30')}</CardTitle><TrendingDown className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-500">{formatCurrency(stats.totalExpenses)}</div><p className="text-xs text-muted-foreground">{t('dashboard.outflow')}</p></CardContent></Card></motion.div>
              </>
            )}
          </motion.div>
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-semibold mb-4">{t('dashboard.accounts')}</h2>
              <motion.div className="space-y-4" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton className="h-20" key={i} />)
                ) : accounts.length > 0 ? (
                  accounts.map(acc => (
                    <motion.div key={acc.id} variants={cardVariants} whileHover={{ y: -2, scale: 1.01 }}>
                      <Card className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4 flex justify-between items-center">
                          <div><p className="font-semibold">{acc.name}</p><p className="text-sm text-muted-foreground">{formatCurrency(acc.balance, acc.currency)}</p></div>
                          <Button variant="ghost" size="sm" asChild><Link to="/accounts">{t('dashboard.view')} <ArrowRight className="ml-2 size-4" /></Link></Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <motion.div variants={cardVariants} className="text-center p-6 border-2 border-dashed rounded-lg">
                    <Wallet className="mx-auto size-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">{t('common.emptyAccounts')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t('dashboard.emptyAccountsCTA')}</p>
                    <motion.div whileHover={{ scale: 1.05 }}>
                      <Button asChild size="sm" className="mt-4">
                        <Link to="/accounts">{t('common.createAccount')}</Link>
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            </div>
            <div className="lg:col-span-3">
              <h2 className="text-2xl font-semibold mb-4">{t('dashboard.balanceTrend')}</h2>
              <Card>
                <CardContent className="pt-6">
                  {loading ? <Skeleton className="h-[250px]" /> : (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={stats.balanceTrend}>
                        <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)} domain={['dataMin', 'dataMax']} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 2 }} formatter={(value: number) => [formatCurrency(value), t('finance.balance')]} />
                        <Line type="monotone" dataKey="balance" stroke="#F97316" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
export function HomePage() {
  const settings = useAppStore(s => s.settings);
  const user = settings?.user;
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }
  return <UserDashboard />;
}