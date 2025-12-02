import { useState, useEffect } from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountCard } from '@/components/accounting/AccountCard';
import { api } from '@/lib/api-client';
import type { Account, Transaction } from '@shared/types';
export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchData() {
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
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  const getTransactionsForAccount = (accountId: string) => {
    return transactions.filter(tx => tx.accountId === accountId);
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold">Cuentas</h1>
            <p className="text-muted-foreground mt-1">Administra tus cuentas de efectivo, banco y tarjetas.</p>
          </div>
          <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
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
                onDelete={(id) => console.log('Delete', id)}
                onEdit={(acc) => console.log('Edit', acc)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">No has creado ninguna cuenta todavía.</h3>
            <p className="text-muted-foreground mt-2 mb-4">¡Empieza por agregar tu primera cuenta para llevar el control!</p>
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
              <PlusCircle className="mr-2 size-5" /> Crear Primera Cuenta
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}