import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, ArrowRight, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import type { Account, Transaction } from '@shared/types';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
export function HomePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchData() {
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
    }
    fetchData();
  }, []);
  const { totalBalance, totalIncome, totalExpenses, monthlyData } = useMemo(() => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const recentTransactions = transactions.filter(tx => new Date(tx.ts) > oneMonthAgo);
    const income = recentTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = recentTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const balance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const dataForChart = recentTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((acc, tx) => {
        const day = new Date(tx.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!acc[day]) {
          acc[day] = 0;
        }
        acc[day] += tx.amount;
        return acc;
      }, {} as Record<string, number>);
    const chartData = Object.entries(dataForChart).map(([name, value]) => ({ name, expenses: value })).reverse();
    return { totalBalance: balance, totalIncome: income, totalExpenses: expenses, monthlyData: chartData };
  }, [accounts, transactions]);
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Resumen de tus finanzas.</p>
          </div>
          <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
            <Link to="/transactions">
              <PlusCircle className="mr-2 size-5" /> Agregar Transacción
            </Link>
          </Button>
        </header>
        <main className="space-y-8">
          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {loading ? (
              <>
                <Skeleton className="h-36" />
                <Skeleton className="h-36" />
                <Skeleton className="h-36" />
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
                    <p className="text-xs text-muted-foreground">En todas tus cuentas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos (Últ. 30 días)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalIncome)}</div>
                    <p className="text-xs text-muted-foreground">Flujo de entrada</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gastos (Últ. 30 días)</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</div>
                    <p className="text-xs text-muted-foreground">Flujo de salida</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          {/* Accounts and Chart */}
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-semibold mb-4">Cuentas</h2>
              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
                ) : (
                  accounts.map(acc => (
                    <Card key={acc.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{acc.name}</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(acc.balance)}</p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/accounts">Ver <ArrowRight className="ml-2 size-4" /></Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
            <div className="lg:col-span-3">
              <h2 className="text-2xl font-semibold mb-4">Gastos Recientes</h2>
              <Card>
                <CardContent className="pt-6">
                  {loading ? <Skeleton className="h-[250px]" /> : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={monthlyData}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 'var(--radius)',
                          }}
                          cursor={{ fill: 'hsl(var(--muted))' }}
                        />
                        <Bar dataKey="expenses" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
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