import { useState, useEffect, useMemo, useCallback } from 'react';
import { PlusCircle, ArrowUpDown, Banknote, Landmark, CreditCard, MoreVertical, Pencil, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TransactionForm } from '@/components/accounting/TransactionForm';
import { TransactionFilters, Filters } from '@/components/accounting/TransactionFilters';
import { api } from '@/lib/api-client';
import type { Account, Transaction } from '@shared/types';
import { format, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Partial<Transaction> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    query: '',
    accountId: 'all',
    type: 'all',
    dateRange: undefined,
  });
  const accountsById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [txs, accs] = await Promise.all([
        api<{ items: Transaction[] }>('/api/finance/transactions?limit=1000').then(p => p.items),
        api<Account[]>('/api/finance/accounts'),
      ]);
      setTransactions(txs);
      setAccounts(accs);
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
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const queryMatch = filters.query.length > 1 ?
        tx.category.toLowerCase().includes(filters.query.toLowerCase()) ||
        tx.note?.toLowerCase().includes(filters.query.toLowerCase()) : true;
      const accountMatch = filters.accountId === 'all' || tx.accountId === filters.accountId;
      const typeMatch = filters.type === 'all' || tx.type === filters.type;
      const dateMatch = filters.dateRange?.from ?
        isWithinInterval(new Date(tx.ts), {
          start: filters.dateRange.from,
          end: filters.dateRange.to || new Date(),
        }) : true;
      return queryMatch && accountMatch && typeMatch && dateMatch;
    });
  }, [transactions, filters]);
  const handleFormSubmit = async (values: Omit<Transaction, 'currency'> & { id?: string }) => {
    try {
      const method = values.id ? 'PUT' : 'POST';
      const url = values.id ? `/api/finance/transactions/${values.id}` : '/api/finance/transactions';
      await api(url, { method, body: JSON.stringify(values) });
      toast.success(values.id ? 'Transacción actualizada.' : 'Transacción creada.');
      fetchData();
    } catch (e) {
      toast.error('Error al guardar la transacción.');
    }
  };
  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api(`/api/finance/transactions/${deletingId}`, { method: 'DELETE' });
      toast.success('Transacción eliminada.');
      fetchData();
    } catch (e) {
      toast.error('Error al eliminar la transacción.');
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
    }
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
          <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setEditingTxn({}); setSheetOpen(true); }}>
            <PlusCircle className="mr-2 size-5" /> Agregar Transacción
          </Button>
        </header>
        <TransactionFilters filters={filters} setFilters={setFilters} accounts={accounts} />
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => {
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
                          <Badge variant={tx.type === 'transfer' ? 'default' : 'outline'}>{tx.category}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(tx.ts), "d MMM, yyyy", { locale: es })}</TableCell>
                        <TableCell className={cn("text-right font-mono", tx.type === 'income' ? 'text-emerald-500' : 'text-foreground')}>
                          {formatCurrency(tx.amount, tx.currency)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingTxn(tx); setSheetOpen(true); }}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { const { id, ...copy } = tx; setEditingTxn({ ...copy, ts: Date.now() }); setSheetOpen(true); }}>
                                <Copy className="mr-2 h-4 w-4" /> Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { setDeletingId(tx.id); setDeleteDialogOpen(true); }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No hay transacciones que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) setEditingTxn(null); setSheetOpen(open); }}>
        <SheetContent className="sm:max-w-lg w-full p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>{editingTxn?.id ? 'Editar Transacción' : 'Nueva Transacción'}</SheetTitle>
          </SheetHeader>
          {editingTxn && (
            <TransactionForm
              accounts={accounts}
              onSubmit={handleFormSubmit}
              onFinished={() => { setSheetOpen(false); setEditingTxn(null); }}
              defaultValues={{ ...editingTxn, ts: new Date(editingTxn.ts || Date.now()), accountToId: editingTxn.accountTo }}
            />
          )}
        </SheetContent>
      </Sheet>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la transacción permanentemente y se ajustará el saldo de la cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}