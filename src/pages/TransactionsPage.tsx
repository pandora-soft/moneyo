import { useState, useEffect } from 'react';
import { PlusCircle, MoreHorizontal, ArrowUpDown, Banknote, Landmark, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { TransactionForm } from '@/components/accounting/TransactionForm';
import { api } from '@/lib/api-client';
import type { Account, Transaction } from '@shared/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const accountsById = new Map(accounts.map(a => [a.id, a]));
  const fetchData = async () => {
    try {
      setLoading(true);
      const [txs, accs] = await Promise.all([
        api<{ items: Transaction[] }>('/api/finance/transactions').then(p => p.items),
        api<Account[]>('/api/finance/accounts'),
      ]);
      setTransactions(txs);
      setAccounts(accs);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleAddTransaction = async (values: Omit<Transaction, 'id' | 'currency'>) => {
    const amount = values.type === 'income' ? Math.abs(values.amount) : -Math.abs(values.amount);
    const finalValues = { ...values, amount };
    const newTx = await api<Transaction>('/api/finance/transactions', {
      method: 'POST',
      body: JSON.stringify(finalValues),
    });
    // Optimistic update would be better, but for now we refetch
    fetchData();
  };
  const formatCurrency = (value: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  const accountIcons = {
    cash: <Banknote className="size-4 text-muted-foreground" />,
    bank: <Landmark className="size-4 text-muted-foreground" />,
    credit_card: <CreditCard className="size-4 text-muted-foreground" />,
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold">Transacciones</h1>
            <p className="text-muted-foreground mt-1">Tu historial de ingresos y gastos.</p>
          </div>
          <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
                <PlusCircle className="mr-2 size-5" /> Agregar Transacción
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-lg w-full p-0">
              <SheetHeader className="p-6 border-b">
                <SheetTitle>Nueva Transacción</SheetTitle>
              </SheetHeader>
              <TransactionForm accounts={accounts} onSubmit={handleAddTransaction} onFinished={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm">
                      Fecha <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => {
                    const account = accountsById.get(tx.accountId);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {account && accountIcons[account.type]}
                            <span className="font-medium">{account?.name || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.category}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(tx.ts), "d MMM, yyyy", { locale: es })}</TableCell>
                        <TableCell className={cn("text-right font-mono", tx.type === 'income' ? 'text-emerald-500' : 'text-foreground')}>
                          {formatCurrency(tx.amount, tx.currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No hay transacciones.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}