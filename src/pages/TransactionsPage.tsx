import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, Banknote, Landmark, CreditCard, MoreVertical, Pencil, Copy, Trash2, Upload, Repeat, Loader2, Download, ChevronLeft, ChevronRight, FileText, Paperclip } from 'lucide-react';
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
  const [attachmentModal, setAttachmentModal] = useState<{ open: boolean; url: string | null }>({ open: false, url: null });
  const [pagination, setPagination] = useState({
    cursor: 0,
    history: [0],
    rowsPerPage: 25,
    totalCount: 0,
    hasNextPage: false,
  });
  const rowsPerPageRef = useRef(pagination.rowsPerPage);
  useEffect(() => { rowsPerPageRef.current = pagination.rowsPerPage; }, [pagination.rowsPerPage]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openModal } = useAppStore();
  const refetchTrigger = useAppStore((state) => state.refetchData);
  const formatCurrency = useFormatCurrency();
  const accountsById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const fetchData = useCallback(async (newCursor = 0, newRowsPerPage?: number) => {
    setLoading(true);
    const rpp = newRowsPerPage ?? rowsPerPageRef.current;
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
  }, [filters, accounts]);
  useEffect(() => {
    setPagination(p => ({ ...p, cursor: 0, history: [0] }));
    fetchData(0);
  }, [filters, refetchTrigger, isRecurrentView, fetchData]);
  const filteredTransactions = useMemo(() => {
    return isRecurrentView ? transactions.filter(tx => tx.recurrent) : transactions;
  }, [transactions, isRecurrentView]);
  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api(`/api/finance/transactions/${deletingId}`, { method: 'DELETE' });
      toast.success('Transacción eliminada.');
      fetchData(pagination.cursor);
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
        return { date, accountName, type, amount, category, note, isDateValid: isValid(new Date(date)) };
    });
    setImportPreview(preview);
    setImportSheetOpen(true);
    event.target.value = '';
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
        fetchData();
    } catch (e: any) {
        toast.error(e.message || 'Error al generar transacciones recurrentes.');
    } finally {
        setIsGenerating(false);
    }
  };
  const exportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.warning('No hay transacciones para exportar.');
      return;
    }
    const headers = 'Fecha,Cuenta,Tipo,Monto,Categoría,Nota,Recurrente,Adjunto\n';
    const csv = filteredTransactions.map(tx => {
      const account = accountsById.get(tx.accountId);
      const row = [
        `"${format(new Date(tx.ts), 'dd/MM/yyyy', { locale: es })}"`,
        `"${account?.name || ''}"`, `"${tx.type}"`, `"${tx.amount}"`, `"${tx.category}"`, `"${tx.note || ''}"`,
        tx.recurrent || tx.parentId ? 'Sí' : 'No',
        tx.attachmentDataUrl ? 'Sí' : 'No'
      ];
      return row.join(',');
    }).join('\n');
    const blob = new Blob([headers + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `moneyo-transacciones-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV exportado correctamente.');
  };
  const handleNextPage = () => {
    const nextCursor = pagination.cursor + pagination.rowsPerPage;
    setPagination(p => ({ ...p, history: [...p.history, nextCursor] }));
    fetchData(nextCursor);
  };
  const handlePrevPage = () => {
    const newHistory = [...pagination.history];
    newHistory.pop();
    const prevCursor = newHistory[newHistory.length - 1] ?? 0;
    setPagination(p => ({ ...p, history: newHistory }));
    fetchData(prevCursor);
  };
  const handleRowsPerPageChange = (value: string) => {
    const newRows = value === 'all' ? 10000 : parseInt(value, 10);
    setPagination(p => ({ ...p, rowsPerPage: newRows, cursor: 0, history: [0] }));
    fetchData(0, newRows);
  };
  const accountIcons = { cash: <Banknote className="size-4 text-muted-foreground" />, bank: <Landmark className="size-4 text-muted-foreground" />, credit_card: <CreditCard className="size-4 text-muted-foreground" /> };
  const isDefaultFilter = filters.query === '' && filters.accountId === 'all' && filters.type === 'all' && !filters.dateRange;
  const deleteDescriptionId = 'delete-transaction-description';
  const pageStart = pagination.cursor + 1;
  const pageEnd = Math.min(pagination.cursor + pagination.rowsPerPage, pagination.totalCount);
  const TransactionRow = ({ tx }: { tx: Transaction }) => {
    const categoryColor = useCategoryColor(tx.category);
    const account = accountsById.get(tx.accountId);
    const isPdf = tx.attachmentDataUrl?.startsWith('data:application/pdf');
    return (
      <TableRow className={cn("hover:bg-muted/50 transition-colors duration-150", (tx.recurrent || tx.parentId) && 'bg-muted/30')}>
        <TableCell><div className="flex items-center gap-2">{account && accountIcons[account.type]}<span className="font-medium">{account?.name || 'N/A'}</span></div></TableCell>
        <TableCell>
            <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn(categoryColor, "text-white hover:scale-105 hover:shadow-md transition-all duration-200 font-medium border-transparent")}>{tx.category}</Badge>
                {tx.recurrent && <Badge variant="secondary">{t('transactions.recurrent.template')}</Badge>}
                {tx.parentId && <Badge variant="secondary" className="text-xs">{t('transactions.recurrent.generated')}</Badge>}
            </div>
        </TableCell>
        <TableCell>{format(new Date(tx.ts), "d MMM, yyyy", { locale: es })}</TableCell>
        <TableCell className={cn("text-right font-mono", tx.type === 'income' ? 'text-emerald-500' : 'text-foreground')}>{formatCurrency(tx.amount, tx.currency)}</TableCell>
        <TableCell className="flex items-center justify-end gap-1">
          {tx.attachmentDataUrl && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAttachmentModal({ open: true, url: tx.attachmentDataUrl! })}>
              {isPdf ? <FileText className="size-4" /> : <img src={tx.attachmentDataUrl} alt="adjunto" className="w-6 h-6 object-cover rounded" />}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 border-transparent hover:border-input hover:bg-accent"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openModal(tx)}><Pencil className="mr-2 h-4 w-4" /> {t('common.edit')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { const { id, ...copy } = tx; openModal({ ...copy, ts: Date.now(), recurrent: false, frequency: undefined, parentId: undefined }); }}><Copy className="mr-2 h-4 w-4" /> {t('budget.duplicate')}</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => { setDeletingId(tx.id); setDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div><h1 className="text-4xl font-display font-bold">{t('pages.transactions')}</h1><p className="text-muted-foreground mt-1">{t('transactions.history')}</p></div>
          <div className="flex flex-wrap gap-2"><input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" /><Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 size-4" /> {t('transactions.importCSV')}</Button><Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => openModal()}><PlusCircle className="mr-2 size-5" /> {t('common.addTransaction')}</Button></div>
        </header>
        <TransactionFilters filters={filters} setFilters={setFilters} accounts={accounts} />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <div className="flex items-center space-x-2"><Switch id="recurrent-view" checked={isRecurrentView} onCheckedChange={setIsRecurrentView} /><Label htmlFor="recurrent-view">{t('transactions.recurrent.view')}</Label></div>
            <div className="flex items-center space-x-2"><Button variant="outline" onClick={exportCSV} disabled={loading || filteredTransactions.length === 0}><Download className="mr-2 size-4" /> {t('transactions.exportCSV')}</Button><Button variant="outline" onClick={handleGenerateRecurrents} disabled={isGenerating}>{isGenerating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Repeat className="mr-2 size-4" />} {t('common.generateAll')}</Button></div>
        </div>
        <Card>
          <CardContent className="p-0"><div className="overflow-auto h-[60vh]"><div className="min-w-full overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10"><TableRow><TableHead>{t('table.account')}</TableHead><TableHead>{t('table.category')}</TableHead><TableHead>{t('table.date')}</TableHead><TableHead className="text-right">{t('table.amount')}</TableHead><TableHead className="w-[100px] text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? ( Array.from({ length: 10 }).map((_, i) => ( <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow> )) ) : filteredTransactions.length > 0 ? ( filteredTransactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />) ) : ( <TableRow><TableCell colSpan={5} className="h-24 text-center"><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>{isRecurrentView ? "No hay transacciones recurrentes." : !isDefaultFilter ? ( <><p>{t('common.noMatches')}</p><Button variant="link" onClick={() => setFilters({ query: '', accountId: 'all', type: 'all', dateRange: undefined })}>{t('filters.clear')}</Button></> ) : ( "No hay transacciones todavía." )}</motion.div></TableCell></TableRow> )}
              </TableBody>
            </Table>
          </div></div></CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground mb-2 sm:mb-0">{t('pagination.showingXofY', pageStart, pageEnd, pagination.totalCount)}</div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
              <div className="flex items-center space-x-2"><p className="text-sm font-medium">{t('pagination.rowsPerPage')}</p><Select value={String(pagination.rowsPerPage)} onValueChange={handleRowsPerPageChange}><SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger><SelectContent>{[25, 50, 100].map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}<SelectItem value="10000">{t('pagination.all')}</SelectItem></SelectContent></Select></div>
              <div className="flex items-center space-x-2"><Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevPage} disabled={pagination.history.length <= 1 || loading}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextPage} disabled={!pagination.hasNextPage || loading}><ChevronRight className="h-4 w-4" /></Button></div>
            </div>
          </CardFooter>
        </Card>
      </div>
      <Sheet open={isImportSheetOpen} onOpenChange={setImportSheetOpen}><SheetContent className="sm:max-w-2xl w-full" aria-describedby="import-sheet-desc"><SheetHeader><SheetTitle>{t('transactions.importSheet.title')}</SheetTitle><SheetDescription id="import-sheet-desc">{t('transactions.importSheet.description')}</SheetDescription></SheetHeader><div className="py-4"><p className="text-sm text-muted-foreground mb-2">{t('transactions.importSheet.preview')}</p><p className="text-xs text-muted-foreground mb-4">{t('transactions.importSheet.columns')}</p><div className="max-h-96 overflow-auto border rounded-md"><Table><TableHeader><TableRow>{importPreview[0] && Object.keys(importPreview[0]).filter(k => k !== 'isDateValid').map(key => <TableHead key={key}>{key}</TableHead>)}<TableHead>{t('transactions.importSheet.validation')}</TableHead></TableRow></TableHeader><TableBody>{importPreview.map((row, i) => ( <TableRow key={i}>{Object.entries(row).filter(([k]) => k !== 'isDateValid').map(([key, val], j) => <TableCell key={j}>{val as string}</TableCell>)}<TableCell>{!row.isDateValid && <Badge variant="destructive">{t('transactions.importSheet.invalidDate')}</Badge>}</TableCell></TableRow> ))}</TableBody></Table></div><div className="mt-6 flex justify-end"><Button onClick={handleImport}>{t('transactions.importSheet.confirm')}</Button></div></div></SheetContent></Sheet>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}><AlertDialogContent aria-describedby={deleteDescriptionId}><AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription id={deleteDescriptionId}>{t('transactions.deleteWarning')} {t('transactions.deleteCascade')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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