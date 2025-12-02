import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountCard } from '@/components/accounting/AccountCard';
import { api } from '@/lib/api-client';
import type { Account, Transaction, Budget } from '@shared/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AccountForm } from '@/components/accounting/AccountForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { startOfMonth, getMonth, getYear } from 'date-fns';
export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
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
  }, [fetchData]);
  const getTransactionsForAccount = (accountId: string) => {
    return transactions.filter(tx => tx.accountId === accountId);
  };
  const handleCreateClick = () => {
    setSelectedAccount(null);
    setSheetOpen(true);
  };
  const handleEditClick = (account: Account) => {
    setSelectedAccount(account);
    setSheetOpen(true);
  };
  const handleDeleteClick = (accountId: string) => {
    setAccountToDelete(accountId);
    setAlertOpen(true);
  };
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
        await api<Account>(`/api/finance/accounts/${selectedAccount.id}`, {
          method: 'PUT',
          body: JSON.stringify(values),
        });
        toast.success('Cuenta actualizada correctamente.');
      } else {
        await api<Account>('/api/finance/accounts', {
          method: 'POST',
          body: JSON.stringify(values),
        });
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
        ) : accounts.length > 0 ? (
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence>
              {accounts.map(account => (
                <motion.div key={account.id} variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }} layout>
                  <AccountCard
                    account={account}
                    latestTransactions={getTransactionsForAccount(account.id)}
                    onDelete={handleDeleteClick}
                    onEdit={handleEditClick}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">No has creado ninguna cuenta todavía.</h3>
            <p className="text-muted-foreground mt-2 mb-4">¡Empieza por agregar tu primera cuenta para llevar el control!</p>
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleCreateClick}>
              <PlusCircle className="mr-2 size-5" /> Crear Primera Cuenta
            </Button>
          </div>
        )}
      </div>
      <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg w-full p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>{selectedAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}</SheetTitle>
          </SheetHeader>
          <AccountForm
            onSubmit={handleFormSubmit}
            onFinished={() => setSheetOpen(false)}
            defaultValues={selectedAccount || {}}
            isEditing={!!selectedAccount}
          />
        </SheetContent>
      </Sheet>
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la cuenta permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}