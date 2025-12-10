import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, ArrowUpDown, Banknote, Landmark, CreditCard, MoreVertical, Pencil, Copy, Trash2, Upload, Repeat, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TransactionFilters, Filters } from '@/components/accounting/TransactionFilters';
import { api } from '@/lib/api-client';
import type { Account, Transaction } from '@shared/types';
import { format, isWithinInterval, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/useAppStore';
import { useFormatCurrency } from '@/lib/formatCurrency';
import t from '@/lib/i18n';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({ query: '', accountId: 'all', type: 'all', dateRange: undefined });
  const [isImportSheetOpen, setImportSheetOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecurrentView, setIsRecurrentView] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openModal } = useAppStore();
  const refetchTrigger = useAppStore((state) => state.refetchData);
  const formatCurrency = useFormatCurrency();
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
  }, [fetchData, refetchTrigger]);
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (isRecurrentView && !tx.recurrent && !tx.parentId) {
        return false;
      }
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
  }, [transactions, filters, isRecurrentView]);
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
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    const text = await file.text();
    const lines = text.split('\n').slice(1).filter(l => l.trim());
    const preview = lines.map(line => {
        const [date, accountName, type, amount, category, note] = line.split(',');
        const isDateValid = isValid(new Date(date));
        return { date, accountName, type, amount, category, note, isDateValid };
    });
    setImportPreview(preview);
    setImportSheetOpen(true);
    event.target.value = ''; // Reset file input
  };
  const handleImport = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      const result = await api<{ imported: number }>('/api/finance/transactions/import', { method: 'POST', body: formData });
      toast.success(`${result.imported} transacciones importadas.`);
      fetchData();
    } catch (e) {
      toast.error('Error al importar el archivo.');
    } finally {
      setImportSheetOpen(false);
      setImportFile(null);
      setImportPreview([]);
    }
  };
  const handleGenerateRecurrents = async () => {
    setIsGenerating(true);
    toast.info('Generando transacciones recurrentes...');
    try {
        const result = await api<{ generated: number }>('/api/finance/transactions/generate', { method: 'POST' });
        if (result.generated > 0) {
            toast.success(`${result.generated} transacciones recurrentes generadas.`);
        } else {
            toast.info('No hay nuevas transacciones recurrentes para generar.');
        }
    } catch (e: any) {
        toast.error(e.message || 'Error al generar transacciones recurrentes.');
    } finally {
        setIsGenerating(false);
        fetchData();
    }
  };
  const accountIcons = { cash: <Banknote className="size-4 text-muted-foreground" />, bank: <Landmark className="size-4 text-muted-foreground" />, credit_card: <CreditCard className="size-4 text-muted-foreground" /> };
  const isDefaultFilter = filters.query === '' && filters.accountId === 'all' && filters.type === 'all' && !filters.dateRange;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold">{t('pages.transactions')}</h1>
            <p className="text-muted-foreground mt-1">Tu historial de ingresos y gastos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 size-4" /> Importar CSV</Button>
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => openModal()}>
              <PlusCircle className="mr-2 size-5" /> {t('common.add')} Transacción
            </Button>
          </div>
        </header>
        <TransactionFilters filters={filters} setFilters={setFilters} accounts={accounts} />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <p className="text-sm text-muted-foreground">
                Mostrando {filteredTransactions.length} de {transactions.length} transacciones.
            </p>
            <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={handleGenerateRecurrents} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Repeat className="mr-2 size-4" />}
                    Generar Todas
                </Button>
                <Switch id="recurrent-view" checked={isRecurrentView} onCheckedChange={setIsRecurrentView} />
                <Label htmlFor="recurrent-view">Ver solo recurrentes</Label>
            </div>
        </div>
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
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => {
                    const account = accountsById.get(tx.accountId);
                    return (
                      <TableRow key={tx.id} className={cn("hover:bg-muted/50 transition-colors duration-150", (tx.recurrent || tx.parentId) && 'bg-muted/30')}>
                        <TableCell><div className="flex items-center gap-2">{account && accountIcons[account.type]}<span className="font-medium">{account?.name || 'N/A'}</span></div></TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={tx.type === 'transfer' ? 'default' : 'outline'}>{tx.category}</Badge>
                                {tx.recurrent && <Badge variant="secondary">Plantilla</Badge>}
                                {tx.parentId && <Badge variant="secondary" className="text-xs">Generada</Badge>}
                            </div>
                        </TableCell>
                        <TableCell>{format(new Date(tx.ts), "d MMM, yyyy", { locale: es })}</TableCell>
                        <TableCell className={cn("text-right font-mono", tx.type === 'income' ? 'text-emerald-500' : 'text-foreground')}>{formatCurrency(tx.amount, tx.currency)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 border-transparent hover:border-input hover:bg-accent"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openModal(tx)}><Pencil className="mr-2 h-4 w-4" /> {t('common.edit')}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { const { id, ...copy } = tx; openModal({ ...copy, ts: Date.now(), recurrent: false, frequency: undefined, parentId: undefined }); }}><Copy className="mr-2 h-4 w-4" /> Duplicar</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { setDeletingId(tx.id); setDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        {isRecurrentView ? "No hay transacciones recurrentes." : !isDefaultFilter ? (
                          <>
                            <p>{t('common.noMatches')}</p>
                            <Button variant="link" onClick={() => setFilters({ query: '', accountId: 'all', type: 'all', dateRange: undefined })}>
                              Limpiar filtros
                            </Button>
                          </>
                        ) : (
                          "No hay transacciones todavía."
                        )}
                      </motion.div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Sheet open={isImportSheetOpen} onOpenChange={setImportSheetOpen}>
            <SheetContent className="sm:max-w-2xl w-full" aria-describedby="import-sheet-desc">
            <SheetHeader><SheetTitle>Importar Transacciones</SheetTitle></SheetHeader>
            <SheetDescription id="import-sheet-desc">Sube un archivo CSV para previsualizar y confirmar la importación de transacciones.</SheetDescription>
            <div className="py-4">
                <p className="text-sm text-muted-foreground mb-4">Previsualización de las transacciones a importar. Columnas requeridas: date, accountName, type, amount, category, note.</p>
                <div className="max-h-96 overflow-auto border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {importPreview[0] && Object.keys(importPreview[0]).filter(k => k !== 'isDateValid').map(key => <TableHead key={key}>{key}</TableHead>)}
                                <TableHead>Validación</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {importPreview.map((row, i) => (
                                <TableRow key={i}>
                                    {Object.entries(row).filter(([k]) => k !== 'isDateValid').map(([key, val], j) => <TableCell key={j}>{val as string}</TableCell>)}
                                    <TableCell>
                                        {!row.isDateValid && <Badge variant="destructive">Fecha Inv��lida</Badge>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleImport}>Confirmar Importación</Button>
                </div>
            </div>
        </SheetContent>
      </Sheet>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent aria-describedby="delete-transaction-description">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription id="delete-transaction-description">
              Esta acción no se puede deshacer. Se eliminará la transacción permanentemente y se ajustará el saldo de la cuenta. Si es una plantilla recurrente, se eliminarán también todas las transacciones generadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}