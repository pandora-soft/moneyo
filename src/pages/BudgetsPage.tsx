import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { api } from '@/lib/api-client';
import type { Transaction, Budget } from '@shared/types';
import { format, getMonth, getYear, startOfMonth, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreVertical, Pencil, Trash2, Copy, Download } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { BudgetForm } from '@/components/accounting/BudgetForm';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/lib/formatCurrency';
import { useAppStore } from '@/stores/useAppStore';
import t from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getCategoryColor } from '@/hooks/useCategoryColor';
const tailwindColorToHex: Record<string, string> = {
  'bg-emerald-500': '#10b981', 'bg-orange-500': '#f97316', 'bg-blue-500': '#3b82f6',
  'bg-purple-500': '#8b5cf6', 'bg-red-500': '#ef4444', 'bg-yellow-500': '#eab308',
  'bg-green-500': '#22c55e', 'bg-indigo-500': '#6366f1', 'bg-rose-500': '#f43f5e',
  'bg-slate-500': '#64748b', 'bg-gray-500': '#6b7280',
};
type BudgetWithColor = Budget & { computedActual: number; color: string };
const BudgetCard = ({ budget, onEdit, onDuplicate, onDelete }: { 
  budget: BudgetWithColor; 
  onEdit: (b: Budget) => void; 
  onDuplicate: (b: Budget) => void;
  onDelete: (id: string) => void;
}) => {
  const formatCurrency = useFormatCurrency();
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 font-semibold">
          <span className={cn(budget.color, "text-white px-2 py-1 rounded-md text-sm")}>{budget.category}</span>
        </div>
        <div className="w-full sm:w-1/2">
          <div className="flex justify-between text-sm mb-1">
            <span className={cn(budget.computedActual > budget.limit && 'text-destructive font-bold')}>{formatCurrency(budget.computedActual)}</span>
            <span className="text-muted-foreground">{t('budget.limit')}: {formatCurrency(budget.limit)}</span>
          </div>
          <Progress value={(budget.computedActual / budget.limit) * 100} className={cn('h-2', budget.computedActual > budget.limit ? '[&>div]:bg-destructive' : `[&>div]:${budget.color}`)} />
        </div>
        <div className="flex gap-2 self-end sm:self-center items-center">
          <Badge variant={budget.computedActual > budget.limit ? 'destructive' : 'default'}>{budget.computedActual > budget.limit ? t('budget.over') : t('budget.under')}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(budget)}><Pencil className="mr-2 h-4 w-4" /> {t('common.edit')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(budget)}><Copy className="mr-2 h-4 w-4" /> {t('budget.duplicate')}</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(budget.id)}><Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};
export function BudgetsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Partial<Budget> | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<string | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterDate, setFilterDate] = useState<Date>(startOfMonth(new Date()));
  const formatCurrency = useFormatCurrency();
  const refetchData = useAppStore(s => s.refetchData);
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [txs, bgs, cats] = await Promise.all([
        api<{ items: Transaction[] }>('/api/finance/transactions?limit=1000').then(p => p.items),
        api<Budget[]>('/api/finance/budgets'),
        api<{ id: string; name: string }[]>('/api/finance/categories'),
      ]);
      setTransactions(txs);
      setBudgets(bgs);
      setCategories(cats.map(c => c.name));
    } catch (error) {
      toast.error("Error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData, refetchData]);
  const { uniqueMonths, filteredBudgetsWithActuals, chartData } = useMemo(() => {
    const allDates = [...budgets.map(b => b.month), ...transactions.map(t => t.ts), filterDate.getTime()];
    const uniqueMonthKeys = [...new Set(allDates.map(d => format(new Date(d), 'yyyy-MM')))].sort().reverse();
    const currentMonthBudgets = budgets.filter(b => format(new Date(b.month), 'yyyy-MM') === format(filterDate, 'yyyy-MM'));
    const budgetsWithActuals = currentMonthBudgets.map(b => {
      const monthStart = new Date(b.month);
      const actual = transactions
        .filter(t => t.type === 'expense' && getMonth(new Date(t.ts)) === getMonth(monthStart) && getYear(new Date(t.ts)) === getYear(monthStart) && t.category === b.category)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return { ...b, computedActual: actual, color: getCategoryColor(b.category) };
    }).sort((a, b) => a.category.localeCompare(b.category));
    return { uniqueMonths: uniqueMonthKeys, filteredBudgetsWithActuals: budgetsWithActuals, chartData: budgetsWithActuals };
  }, [budgets, transactions, filterDate]);
  const handleFormSubmit = async (values: Omit<Budget, 'id' | 'computedActual'>) => {
    try {
      if (editingBudget?.id) {
        await api(`/api/finance/budgets/${editingBudget.id}`, { method: 'PUT', body: JSON.stringify(values) });
        toast.success('Presupuesto actualizado.');
      } else {
        await api<Budget>('/api/finance/budgets', { method: 'POST', body: JSON.stringify(values) });
        toast.success('Presupuesto creado.');
      }
      fetchData();
    } catch (error) {
      toast.error('Error al guardar el presupuesto.');
    } finally {
      setSheetOpen(false);
      setEditingBudget(null);
    }
  };
  const handleDeleteBudget = async () => {
    if (!deletingBudget) return;
    try {
      await api(`/api/finance/budgets/${deletingBudget}`, { method: 'DELETE' });
      toast.success('Presupuesto eliminado.');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar el presupuesto.');
    } finally {
      setDeletingBudget(null);
      setDeleteDialogOpen(false);
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div><h1 className="text-4xl font-display font-bold">{t('budget.list')}</h1><p className="text-muted-foreground mt-1">{t('budget.description')}</p></div>
          <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setEditingBudget(null); setSheetOpen(true); }}><PlusCircle className="mr-2 size-5" /> {t('budget.create')}</Button>
        </header>
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="w-full sm:w-auto"><CardTitle>{t('budget.summary')}</CardTitle><CardDescription>{t('budget.summaryDesc')}</CardDescription></div>
            <Select value={format(filterDate, 'yyyy-MM')} onValueChange={(val) => setFilterDate(new Date(`${val}-01T12:00:00Z`))}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Mes" /></SelectTrigger>
              <SelectContent>{uniqueMonths.map(m => <SelectItem key={m} value={m}>{format(new Date(`${m}-01T12:00:00Z`), 'MMMM yyyy', { locale: es })}</SelectItem>)}</SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[300px]" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <XAxis dataKey="category" stroke="#888888" fontSize={12} /><YAxis stroke="#888888" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="limit" fill="#8884d8" name={t('budget.limit')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="computedActual" name={t('budget.actual')} radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={tailwindColorToHex[getCategoryColor(entry.category)] || '#8884d8'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        {loading ? <Skeleton className="h-40 w-full" /> : filteredBudgetsWithActuals.length > 0 ? (
          <div className="space-y-4">
            {filteredBudgetsWithActuals.map(b => (
              <BudgetCard 
                key={b.id} 
                budget={b as BudgetWithColor} 
                onEdit={setEditingBudget} 
                onDuplicate={(dup) => { setEditingBudget({ ...dup, id: undefined, month: addMonths(new Date(dup.month), 1).getTime() }); setSheetOpen(true); }}
                onDelete={(id) => { setDeletingBudget(id); setDeleteDialogOpen(true); }}
              />
            ))}
          </div>
        ) : <p className="text-center py-10 border border-dashed rounded-lg">No hay presupuestos para este mes.</p>}
      </div>
      <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg w-full p-0" aria-describedby="budget-sheet-desc">
          <SheetHeader className="p-6 border-b"><SheetTitle>{editingBudget?.id ? t('budget.sheet.editTitle') : t('budget.sheet.newTitle')}</SheetTitle><SheetDescription id="budget-sheet-desc">{t('budget.sheet.description')}</SheetDescription></SheetHeader>
          <BudgetForm
            categories={categories}
            onSubmit={handleFormSubmit}
            onFinished={() => setSheetOpen(false)}
            defaultValues={editingBudget ? {...editingBudget, month: new Date(editingBudget.month || Date.now())} : { month: filterDate }}
          />
        </SheetContent>
      </Sheet>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}><AlertDialogContent aria-describedby="delete-budget-desc"><AlertDialogHeader><AlertDialogTitle>{t('budget.deleteConfirm')}</AlertDialogTitle><AlertDialogDescription id="delete-budget-desc">{t('budget.deleteWarning')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteBudget}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}