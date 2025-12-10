import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, easeInOut } from 'framer-motion';
import { PlusCircle, Repeat, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountCard } from '@/components/accounting/AccountCard';
import { api } from '@/lib/api-client';
import type { Account, Transaction, Budget } from '@shared/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AccountForm } from '@/components/accounting/AccountForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { useFormatCurrency } from '@/lib/formatCurrency';
import { useAppStore } from '@/stores/useAppStore';
import { getMonth, getYear, startOfMonth } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import t from '@/lib/i18n';
const motionVariants = {
  enter: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: easeInOut } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: easeInOut } },
};
export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const formatCurrency = useFormatCurrency();
  const refetchTrigger = useAppStore((state) => state.refetchData);
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [accs, txs, bgs] = await Promise.all([
        api<Account[]>('/api/finance/accounts'),
        api<{ items: Transaction[] }>('/api/finance/transactions').then(p => p.items),
        api<Budget[]>('/api/finance/budgets'),
      ]);
      setAccounts(accs);
      setTransactions(txs);
      setBudgets(bgs);
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast.error('Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData, refetchTrigger]);
  const accountData = useMemo(() => {
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthBudgets = budgets.filter(b => getMonth(new Date(b.month)) === getMonth(currentMonthStart) && getYear(new Date(b.month)) === getYear(currentMonthStart));
    return accounts.map(account => {
      const accountTransactions = transactions.filter(tx => tx.accountId === account.id);
      const recurrentCount = accountTransactions.filter(tx => tx.recurrent || tx.parentId).length;
      const spendingByCategory = accountTransactions
        .filter(tx => tx.type === 'expense' && new Date(tx.ts) >= currentMonthStart)
        .reduce((acc, tx) => {
          acc[tx.category] = (acc[tx.category] || 0) + Math.abs(tx.amount);
          return acc;
        }, {} as Record<string, number>);
      const relevantBudgets = currentMonthBudgets
        .filter(b => spendingByCategory[b.category] > 0)
        .map(b => ({
          ...b,
          actual: spendingByCategory[b.category],
        }));
      return {
        ...account,
        transactions: accountTransactions,
        recurrentCount,
        relevantBudgets,
      };
    });
  }, [accounts, transactions, budgets]);
  const handleCreateClick = () => { setSelectedAccount(null); setSheetOpen(true); };
  const handleEditClick = (account: Account) => { setSelectedAccount(account); setSheetOpen(true); };
  const handleDeleteClick = (accountId: string) => { setAccountToDelete(accountId); setAlertOpen(true); };
  const confirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      await api(`/api/finance/accounts/${accountToDelete}`, { method: 'DELETE' });
      toast.success('Cuenta eliminada correctamente.');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar la cuenta.');
    } finally {
      setAccountToDelete(null);
      setAlertOpen(false);
    }
  };
  const handleFormSubmit = async (values: Omit<Account, 'id' | 'createdAt' | 'balance'> & { balance?: number }) => {
    try {
      if (selectedAccount) {
        await api<Account>(`/api/finance/accounts/${selectedAccount.id}`, { method: 'PUT', body: JSON.stringify(values) });
        toast.success('Cuenta actualizada correctamente.');
      } else {
        await api<Account>('/api/finance/accounts', { method: 'POST', body: JSON.stringify(values) });
        toast.success('Cuenta creada correctamente.');
      }
      fetchData();
    } catch (error) {
      toast.error('Error al guardar la cuenta.');
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold">Cuentas</h1>
            <p className="text-muted-foreground mt-1">Administra tus cuentas de efectivo, banco y tarjetas.</p>
          </div>
          <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleCreateClick}>
            <PlusCircle className="mr-2 size-5" /> Crear Cuenta
          </Button>
        </header>
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : accountData.length > 0 ? (
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence>
              {accountData.map(account => (
                <motion.div key={account.id} variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }} layout>
                  <AccountCard account={account} onDelete={handleDeleteClick} onEdit={handleEditClick}>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="transactions">
                        <AccordionTrigger>Últimos Movimientos</AccordionTrigger>
                        <AccordionContent asChild>
                          <motion.div initial="exit" animate="enter" exit="exit" variants={motionVariants}>
                            {account.transactions.slice(0, 3).map(tx => (
                              <div key={tx.id} className="flex justify-between items-center text-sm py-1">
                                <span>{tx.category}</span>
                                <span className={tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}>{tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount, account.currency)}</span>
                              </div>
                            ))}
                            {account.transactions.length === 0 && <p className="text-sm text-muted-foreground">Sin movimientos.</p>}
                          </motion.div>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="recurrent">
                        <AccordionTrigger>Recurrentes</AccordionTrigger>
                        <AccordionContent asChild>
                          <motion.div initial="exit" animate="enter" exit="exit" variants={motionVariants}>
                            <Badge variant="outline"><Repeat className="mr-2 size-4" /> {account.recurrentCount} activas</Badge>
                          </motion.div>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="budgets">
                        <AccordionTrigger>Presupuestos (Este Mes)</AccordionTrigger>
                        <AccordionContent asChild>
                          <motion.div initial="exit" animate="enter" exit="exit" variants={motionVariants} className="space-y-2">
                            {account.relevantBudgets.length > 0 ? account.relevantBudgets.map(b => (
                              <div key={b.id} className="text-sm">
                                <div className="flex justify-between items-center">
                                  <span>{b.category}</span>
                                  <span className={cn(b.actual > b.limit && 'text-destructive')}>{formatCurrency(b.actual)} / {formatCurrency(b.limit)}</span>
                                </div>
                                <Progress value={(b.actual / b.limit) * 100} className={cn('h-1 mt-1', b.actual > b.limit && '[&>div]:bg-destructive')} />
                              </div>
                            )) : <p className="text-sm text-muted-foreground">Sin gastos contra presupuestos este mes.</p>}
                          </motion.div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </AccountCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">{t('common.emptyAccounts')}</h3>
            <p className="text-muted-foreground mt-2 mb-4">¡Empieza por agregar tu primera cuenta para llevar el control!</p>
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleCreateClick}>
              <PlusCircle className="mr-2 size-5" /> Crear Primera Cuenta
            </Button>
          </div>
        )}
      </div>
      <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg w-full p-0">
          <SheetHeader className="p-6 border-b"><SheetTitle>{selectedAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}</SheetTitle></SheetHeader>
          <AccountForm onSubmit={handleFormSubmit} onFinished={() => setSheetOpen(false)} defaultValues={selectedAccount || {}} isEditing={!!selectedAccount} />
        </SheetContent>
      </Sheet>
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>��Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará la cuenta permanentemente y se ajustará el balance de presupuestos relacionados.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Continuar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}