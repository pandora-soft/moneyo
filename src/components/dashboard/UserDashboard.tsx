import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusCircle, BrainCircuit, PiggyBank, Receipt, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/stores/useAppStore';
import { useFormatCurrency } from '@/lib/formatCurrency';
import { useTranslations } from '@/lib/i18n';
import { api } from '@/lib/api-client';
import type { Budget, Transaction } from '@shared/types';
import { startOfMonth, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
export function UserDashboard() {
  const t = useTranslations();
  const formatCurrency = useFormatCurrency();
  const openModal = useAppStore(s => s.openModal);
  const refetchTrigger = useAppStore(s => s.refetchData);
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [bgs, txs] = await Promise.all([
          api<Budget[]>('/api/finance/budgets'),
          api<{ items: Transaction[] }>('/api/finance/transactions?limit=200').then(p => p.items),
        ]);
        setBudgets(bgs);
        setTransactions(txs);
      } catch (e) {
        console.error("Dashboard fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refetchTrigger]);
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    // Filter budgets for the current month
    const currentMonthBudgets = budgets.filter(b => {
      const bDate = new Date(b.month);
      return bDate.getMonth() === now.getMonth() && bDate.getFullYear() === now.getFullYear();
    });
    const totalBudgetLimit = currentMonthBudgets.reduce((sum, b) => sum + b.limit, 0);
    // Current month expenses
    const currentMonthExpenses = transactions.filter(tx => 
      tx.type === 'expense' && 
      isWithinInterval(new Date(tx.ts), { start: monthStart, end: now })
    ).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const progress = totalBudgetLimit > 0 ? (currentMonthExpenses / totalBudgetLimit) * 100 : 0;
    return {
      totalBudgetLimit,
      currentMonthExpenses,
      progress
    };
  }, [budgets, transactions]);
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <motion.header 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-display font-bold text-foreground">
            {t('dashboard.user.welcome')}
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tus gastos personales de forma sencilla.
          </p>
        </motion.header>
        <motion.div 
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Quick Actions Card */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-1">
            <Card className="h-full border-orange-100 dark:border-orange-900/30 bg-orange-50/30 dark:bg-orange-950/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="size-5 text-orange-500" />
                  Acciones Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full h-12 text-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => openModal()}
                >
                  <PlusCircle className="mr-2 size-5" />
                  {t('dashboard.user.addTransaction')}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-lg font-semibold"
                  asChild
                >
                  <Link to="/ia">
                    <BrainCircuit className="mr-2 size-5 text-orange-500" />
                    {t('dashboard.user.openIA')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
          {/* Budget Summary Card */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.user.budgetTotal')}
                </CardTitle>
                <PiggyBank className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div className="text-3xl font-bold">
                    {formatCurrency(stats.totalBudgetLimit)}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Límites configurados para este mes
                </p>
              </CardContent>
            </Card>
          </motion.div>
          {/* Current Spending Card */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.user.currentSpending')}
                </CardTitle>
                <Receipt className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div>
                    <div className="text-3xl font-bold text-red-500">
                      {formatCurrency(stats.currentMonthExpenses)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('dashboard.user.spendingVsBudget', formatCurrency(stats.currentMonthExpenses), formatCurrency(stats.totalBudgetLimit))}
                    </p>
                  </div>
                )}
                <Progress 
                  value={Math.min(stats.progress, 100)} 
                  className={cn("h-2", stats.progress > 100 && "[&>div]:bg-destructive")} 
                />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
        {/* Mini History Section */}
        <motion.div 
          variants={itemVariants}
          className="mt-12"
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold">Últimos Movimientos</h2>
            <Button variant="ghost" asChild>
              <Link to="/transactions">Ver todo</Link>
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))
                ) : transactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium">{tx.category}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(tx.ts).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={cn("font-mono font-bold", tx.type === 'income' ? 'text-emerald-500' : 'text-foreground')}>
                      {tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </div>
                ))}
                {!loading && transactions.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No hay transacciones registradas.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}