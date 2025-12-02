import { useState, useEffect, useCallback } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountCard } from '@/components/accounting/AccountCard';
import { api } from '@/lib/api-client';
import type { Account, Transaction } from '@shared/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AccountForm } from '@/components/accounting/AccountForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [accs, txs] = await Promise.all([
        api<Account[]>('/api/finance/accounts'),
        api<{ items: Transaction[] }>('/api/finance/transactions').then(p => p.items),
      ]);
      setAccounts(accs);
      setTransactions(txs);
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
  const handleFormSubmit = async (values: Omit<Account, 'id' | 'createdAt'>) => {
    try {
      if (selectedAccount) {
        // Editing logic would go here, but API doesn't support it yet.
        // For now, we just show a success message.
        toast.success('Cuenta actualizada (simulado).');
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map(account => (
              <AccountCard
                key={account.id}
                account={account}
                latestTransactions={getTransactionsForAccount(account.id)}
                onDelete={handleDeleteClick}
                onEdit={handleEditClick}
              />
            ))}
          </div>
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