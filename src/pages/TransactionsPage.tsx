import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, Banknote, Landmark, CreditCard, MoreVertical, Pencil, Copy, Trash2, Upload, Repeat, Loader2, Download, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TransactionFilters, Filters } from '@/components/accounting/TransactionFilters';
import { api } from '@/lib/api-client';
import type { Account, Transaction, PaginatedTransactions } from '@shared/types';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/useAppStore';
import { useFormatCurrency } from '@/lib/formatCurrency';
import t from '@/lib/i18n';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategoryColor } from '@/hooks/useCategoryColor';
const accountIcons = {
  cash: <Banknote className="size-4 text-muted-foreground" />,
  bank: <Landmark className="size-4 text-muted-foreground" />,
  credit_card: <CreditCard className="size-4 text-muted-foreground" />
};
interface TransactionRowProps {
  tx: Transaction;
  account?: Account;
  formatCurrency: (value: number, currencyCode?: string) => string;
  onEdit: (tx: Transaction) => void;
  onCopy: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onShowAttachment: (url: string) => void;
}
const TransactionRow = React.memo(({ tx, account, formatCurrency, onEdit, onCopy, onDelete, onShowAttachment }: TransactionRowProps) => {
  const categoryColor = useCategoryColor(tx.category);
  const isPdf = tx.attachmentDataUrl?.startsWith('data:application/pdf');
  return (
    <TableRow className={cn("hover:bg-muted/50 transition-colors duration-150", (tx.recurrent || tx.parentId) && 'bg-muted/30')}>
      <TableCell>
        <div className="flex items-center gap-2">
          {account && accountIcons[account.type as keyof typeof accountIcons]}
          <span className="font-medium">{account?.name || 'N/A'}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn(categoryColor, "text-white hover:scale-105 hover:shadow-md transition-all duration-200 font-medium border-transparent")}>{tx.category}</Badge>
          {tx.recurrent && <Badge variant="secondary">{t('transactions.recurrent.template')}</Badge>}
          {tx.parentId && <Badge variant="secondary" className="text-xs">{t('transactions.recurrent.generated')}</Badge>}
        </div>
      </TableCell>
      <TableCell>{format(new Date(tx.ts), "d MMM, yyyy", { locale: es })}</TableCell>
      <TableCell className={cn("text-right font-mono", tx.type === 'income' ? 'text-emerald-500' : 'text-foreground')}>
        {formatCurrency(tx.amount, tx.currency)}
      </TableCell>
      <TableCell className="flex items-center justify-end gap-1">
        {tx.attachmentDataUrl && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onShowAttachment(tx.attachmentDataUrl!)}>
            {isPdf ? <FileText className="size-4" /> : <img src={tx.attachmentDataUrl} alt="adjunto" className="w-6 h-6 object-cover rounded" />}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 border-transparent hover:border-input hover:bg-accent"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(tx)}><Pencil className="mr-2 h-4 w-4" /> {t('common.edit')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopy(tx)}><Copy className="mr-2 h-4 w-4" /> {t('budget.duplicate')}</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(tx.id)}><Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});
TransactionRow.displayName = "TransactionRow";
export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({ query: '', accountId: 'all', type: 'all', dateRange: undefined, preset: 'all' });
  const [isImportSheetOpen, setImportSheetOpen] = useState(false);
  const [isRecurrentView, setIsRecurrentView] = useState(false);
  const [attachmentModal, setAttachmentModal] = useState<{ open: boolean; url: string | null }>({ open: false, url: null });
  const [pagination, setPagination] = useState({
    cursor: 0,
    history: [0],
    rowsPerPage: 25,
    totalCount: 0,
    hasNextPage: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatCurrency = useFormatCurrency();
  const openModal = useAppStore(s => s.openModal);
  const refetchData = useAppStore(s => s.refetchData);
  const triggerRefetch = useAppStore(s => s.triggerRefetch);
  const accountsById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const fetchData = useCallback(async (newCursor = 0, newRowsPerPage?: number) => {
    setLoading(true);
    const rpp = newRowsPerPage ?? pagination.rowsPerPage;
    try {
      const params = new URLSearchParams();
      params.append('limit', String(rpp));
      params.append('cursor', String(newCursor));
      if (filters.accountId !== 'all') params.append('accountId', filters.accountId);
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.query) params.append('query', filters.query);
      if (filters.dateRange?.from) params.append('dateFrom', String(filters.dateRange.from.getTime()));
      if (filters.dateRange?.to) params.append('dateTo', String(filters.dateRange.to.getTime()));
      const [txsData, accs] = await Promise.all([
        api<PaginatedTransactions>(`/api/finance/transactions?${params.toString()}`),
        accounts.length === 0 ? api<Account[]>('/api/finance/accounts') : Promise.resolve(accounts),
      ]);
      setTransactions(txsData.items);
      setPagination(prev => ({ ...prev, cursor: newCursor, totalCount: txsData.totalCount, hasNextPage: txsData.next !== null, rowsPerPage: rpp }));
      if (accounts.length === 0) setAccounts(accs);
    } catch (error) {
      toast.error('Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, [filters, accounts, pagination.rowsPerPage]);
  useEffect(() => {
    fetchData(0);
  }, [filters, refetchData, isRecurrentView, fetchData]);
  const filteredTransactions = useMemo(() => {
    return isRecurrentView ? transactions.filter(tx => tx.recurrent) : transactions;
  }, [transactions, isRecurrentView]);
  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await api(`/api/finance/transactions/${deletingId}`, { method: 'DELETE' });
      toast.success('Transacción eliminada.');
      fetchData(0);
    } catch (e) {
      toast.error('Error al eliminar la transacción.');
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
    }
  }, [deletingId, fetchData]);
  const handleCopy = useCallback((tx: Transaction) => {
    const { id, ...copy } = tx;
    openModal({ ...copy, ts: Date.now(), recurrent: false, frequency: undefined, parentId: undefined });
  }, [openModal]);
  const handleGenerateRecurrents = async () => {
    setIsGenerating(true);
    try {
      const res = await api<{ generated: number }>('/api/finance/transactions/generate', { method: 'POST' });
      toast.success(`Se han generado ${res.generated} transacciones recurrentes.`);
      triggerRefetch();
    } catch (e) {
      toast.error('Error al generar transacciones recurrentes.');
    } finally {
      setIsGenerating(false);
    }
  };
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = "Fecha,Cuenta,Tipo,Monto,Moneda,Categoría,Nota,Recurrente\n";
    const csvContent = filteredTransactions.map(tx => {
      const acc = accountsById.get(tx.accountId);
      return `${format(new Date(tx.ts), 'yyyy-MM-dd')},${acc?.name || 'N/A'},${tx.type},${tx.amount},${tx.currency},"${tx.category}","${tx.note || ''}",${tx.recurrent || false}`;
    }).join("\n");
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `moneyo-transacciones-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleRowsPerPageChange = useCallback((value: string) => {
    const newRows = parseInt(value, 10);
    setPagination(p => ({ ...p, rowsPerPage: newRows, cursor: 0, history: [0] }));
    fetchData(0, newRows);
  }, [fetchData]);
  const handleNextPage = useCallback(() => {
    const nextCursor = pagination.cursor + pagination.rowsPerPage;
    setPagination(p => ({ ...p, history: [...p.history, nextCursor] }));
    fetchData(nextCursor);
  }, [pagination.cursor, pagination.rowsPerPage, fetchData]);
  const handlePrevPage = useCallback(() => {
    const newHistory = [...pagination.history];
    newHistory.pop();
    const prevCursor = newHistory[newHistory.length - 1] ?? 0;
    setPagination(p => ({ ...p, history: newHistory }));
    fetchData(prevCursor);
  }, [pagination.history, fetchData]);
  const pageStart = pagination.cursor + 1;
  const pageEnd = Math.min(pagination.cursor + pagination.rowsPerPage, pagination.totalCount);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div><h1 className="text-4xl font-display font-bold">{t('pages.transactions')}</h1><p className="text-muted-foreground mt-1">{t('transactions.history')}</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportCSV} disabled={loading || filteredTransactions.length === 0}>
              <Download className="mr-2 size-4" /> {t('transactions.exportCSV')}
            </Button>
            <Button variant="outline" onClick={handleGenerateRecurrents} disabled={isGenerating || loading}>
              {isGenerating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Repeat className="mr-2 size-4" />} {t('common.generateAll')}
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 size-4" /> {t('transactions.importCSV')}
            </Button>
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => openModal()}>
              <PlusCircle className="mr-2 size-5" /> {t('common.addTransaction')}
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" />
          </div>
        </header>
        <TransactionFilters filters={filters} setFilters={setFilters} accounts={accounts} />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <div className="flex items-center space-x-2"><Switch id="recurrent-view" checked={isRecurrentView} onCheckedChange={setIsRecurrentView} /><Label htmlFor="recurrent-view">{t('transactions.recurrent.view')}</Label></div>
        </div>
        <Card>
          <CardContent className="p-0"><div className="overflow-auto h-[60vh]"><div className="min-w-full overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10"><TableRow><TableHead>{t('table.account')}</TableHead><TableHead>{t('table.category')}</TableHead><TableHead>{t('table.date')}</TableHead><TableHead className="text-right">{t('table.amount')}</TableHead><TableHead className="w-[100px] text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? ( Array.from({ length: 10 }).map((_, i) => ( <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow> )) ) : filteredTransactions.length > 0 ? ( filteredTransactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    account={accountsById.get(tx.accountId)}
                    formatCurrency={formatCurrency}
                    onEdit={openModal}
                    onCopy={handleCopy}
                    onDelete={(id) => { setDeletingId(id); setDeleteDialogOpen(true); }}
                    onShowAttachment={(url) => setAttachmentModal({ open: true, url })}
                  />
                ))) : ( <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay transacciones.</TableCell></TableRow> )}
              </TableBody>
            </Table>
          </div></div></CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground mb-2 sm:mb-0">{t('pagination.showingXofY', pageStart, pageEnd, pagination.totalCount)}</div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
              <div className="flex items-center space-x-2"><p className="text-sm font-medium">{t('pagination.rowsPerPage')}</p><Select value={String(pagination.rowsPerPage)} onValueChange={handleRowsPerPageChange}><SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger><SelectContent>{[25, 50, 100].map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex items-center space-x-2"><Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevPage} disabled={pagination.history.length <= 1 || loading}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextPage} disabled={!pagination.hasNextPage || loading}><ChevronRight className="h-4 w-4" /></Button></div>
            </div>
          </CardFooter>
        </Card>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}><AlertDialogContent aria-describedby="delete-transaction-desc"><AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription id="delete-transaction-desc">{t('transactions.deleteWarning')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={attachmentModal.open} onOpenChange={(open) => setAttachmentModal({ open, url: open ? attachmentModal.url : null })}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-2">
          {attachmentModal.url && (
            attachmentModal.url.startsWith('data:application/pdf') ? (
              <iframe src={attachmentModal.url} className="w-full h-full" title="Attachment Preview" />
            ) : (
              <img src={attachmentModal.url} alt="Attachment Preview" className="max-w-full max-h-full object-contain mx-auto" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}