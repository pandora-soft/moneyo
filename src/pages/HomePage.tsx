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
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
export function HomePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const openModal = useAppStore((state) => state.openModal);
  const formatCurrency = useFormatCurrency();
  const refetchTrigger = useAppStore((state) => state.refetchData);
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
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [refetchTrigger]);
  const { totalBalance, totalIncome, totalExpenses, balanceTrend } = useMemo(() => {
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
        if (tx.type === 'income') {
            runningBalance -= tx.amount;
        } else if (tx.type === 'expense') {
            runningBalance += Math.abs(tx.amount);
        } else if (tx.type === 'transfer' && tx.accountTo) {
            // This is a simplified transfer handling for trend, might not be perfect
            runningBalance += Math.abs(tx.amount);
        }
    }
    const trendData = recentTransactions.sort((a,b) => a.ts - b.ts).map(tx => {
        return { date: new Date(tx.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), balance: historicalBalances[tx.ts] || 0 };
    });
    return { totalBalance: balance, totalIncome: income, totalExpenses: expenses, balanceTrend: trendData };
  }, [accounts, transactions]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Resumen de tus finanzas.</p>
          </div>
          <Button onClick={() => openModal()} size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
            <PlusCircle className="mr-2 size-5" /> Agregar Transacción
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
                <motion.div variants={cardVariants}><Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Balance Total</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div><p className="text-xs text-muted-foreground">En todas tus cuentas</p></CardContent></Card></motion.div>
                <motion.div variants={cardVariants}><Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos (Últ. 30 d��as)</CardTitle><TrendingUp className="h-4 w-4 text-emerald-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalIncome)}</div><p className="text-xs text-muted-foreground">Flujo de entrada</p></CardContent></Card></motion.div>
                <motion.div variants={cardVariants}><Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gastos (Últ. 30 días)</CardTitle><TrendingDown className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</div><p className="text-xs text-muted-foreground">Flujo de salida</p></CardContent></Card></motion.div>
              </>
            )}
          </motion.div>
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-semibold mb-4">Cuentas</h2>
              <motion.div className="space-y-4" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
                ) : (
                  accounts.map(acc => (
                    <motion.div key={acc.id} variants={cardVariants}>
                      <Card className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4 flex justify-between items-center">
                          <div><p className="font-semibold">{acc.name}</p><p className="text-sm text-muted-foreground">{formatCurrency(acc.balance, acc.currency)}</p></div>
                          <Button variant="ghost" size="sm" asChild><Link to="/accounts">Ver <ArrowRight className="ml-2 size-4" /></Link></Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </motion.div>
            </div>
            <div className="lg:col-span-3">
              <h2 className="text-2xl font-semibold mb-4">Tendencia del Balance</h2>
              <Card>
                <CardContent className="pt-6">
                  {loading ? <Skeleton className="h-[250px]" /> : (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={balanceTrend}>
                        <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)} domain={['dataMin', 'dataMax']} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 2 }} formatter={(value: number) => [formatCurrency(value), 'Balance']} />
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