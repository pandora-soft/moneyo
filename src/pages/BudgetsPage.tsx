import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
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
export function BudgetsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Partial<Budget> | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<string | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterDate, setFilterDate] = useState<Date>(startOfMonth(new Date()));
  const formatCurrency = useFormatCurrency();
  const refetchTrigger = useAppStore((state) => state.refetchData);
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [txs, bgs] = await Promise.all([
        api<{ items: Transaction[] }>('/api/finance/transactions?limit=1000').then(p => p.items),
        api<Budget[]>('/api/finance/budgets'),
      ]);
      setTransactions(txs);
      setBudgets(bgs);
    } catch (error) {
      toast.error("Error al cargar los datos de presupuestos.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData, refetchTrigger]);
  const { uniqueMonths, uniqueCategories, filteredBudgetsWithActuals, chartData } = useMemo(() => {
    const allDates = [...budgets.map(b => b.month), ...transactions.map(t => t.ts)];
    const uniqueMonthKeys = [...new Set(allDates.map(d => format(new Date(d), 'yyyy-MM')))].sort().reverse();
    const allCategories = [...new Set(transactions.filter(t => t.type === 'expense').map(t => t.category)), 'Salario', 'Alquiler', 'Comida', 'Transporte', 'Ocio'];
    const uniqueCategories = [...new Set(allCategories)];
    const currentMonthBudgets = budgets.filter(b => format(new Date(b.month), 'yyyy-MM') === format(filterDate, 'yyyy-MM'));
    const budgetsWithActuals = currentMonthBudgets.map(b => {
      const monthStart = new Date(b.month);
      const actual = transactions
        .filter(t => t.type === 'expense' && getMonth(new Date(t.ts)) === getMonth(monthStart) && getYear(new Date(t.ts)) === getYear(monthStart) && t.category === b.category)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return { ...b, computedActual: actual };
    }).sort((a, b) => a.category.localeCompare(b.category));
    const chartData = budgetsWithActuals.map(b => ({
      name: b.category,
      limit: b.limit,
      actual: b.computedActual,
    }));
    return { uniqueMonths: uniqueMonthKeys, uniqueCategories, filteredBudgetsWithActuals: budgetsWithActuals, chartData };
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
  const handleDuplicate = (budget: Budget) => {
    const { id, computedActual, ...newBudget } = budget;
    let nextMonth = addMonths(new Date(budget.month), 1);
    const existingBudgetsForCategory = budgets
      .filter(b => b.category === budget.category)
      .map(b => format(new Date(b.month), 'yyyy-MM'));
    while (existingBudgetsForCategory.includes(format(nextMonth, 'yyyy-MM'))) {
      nextMonth = addMonths(nextMonth, 1);
    }
    setEditingBudget({ ...newBudget, month: nextMonth.getTime() });
    setSheetOpen(true);
  };
  const exportFilteredBudgets = () => {
    const headers = "Mes,Categoría,Límite,Gasto Real,Estado\n";
    const csvContent = filteredBudgetsWithActuals.map(b => {
      const status = b.computedActual > b.limit ? t('budget.over') : t('budget.under');
      return `${format(new Date(b.month), 'yyyy-MM')},"${b.category}",${b.limit},${b.computedActual},${status}`;
    }).join("\n");
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `casaconta_presupuestos_${format(filterDate, 'yyyy-MM')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold">{t('budget.list')}</h1>
            <p className="text-muted-foreground mt-1">Define y sigue tus límites de gasto mensuales.</p>
          </div>
          <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setEditingBudget(null); setSheetOpen(true); }}>
            <PlusCircle className="mr-2 size-5" /> Crear Presupuesto
          </Button>
        </header>
        <Card className="mb-8">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Resumen de Presupuestos</CardTitle>
              <CardDescription>Planificado vs. Gasto real para el mes seleccionado.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={format(filterDate, 'yyyy-MM')} onValueChange={(val) => setFilterDate(new Date(`${val}-02`))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueMonths.map(monthKey => (
                    <SelectItem key={monthKey} value={monthKey}>
                      {format(new Date(`${monthKey}-02`), 'MMMM yyyy', { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportFilteredBudgets} disabled={filteredBudgetsWithActuals.length === 0}>
                <Download className="mr-2 size-4" /> Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[300px]" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} /><YAxis stroke="#888888" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    formatter={(value: number, name, props) => {
                      const safeName = typeof name === 'string' ? name : String(name);
                      const { payload } = props;
                      if (!payload) return [formatCurrency(value), safeName];
                      const status = payload.actual > payload.limit ? `(${t('budget.over')})` : `(${t('budget.under')})`;
                      return [formatCurrency(value), `${safeName.charAt(0).toUpperCase() + safeName.slice(1)} ${status}`];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="limit" fill="#8884d8" name={t('budget.limit')} radius={[4, 4, 0, 0]} /><Bar dataKey="actual" fill="#82ca9d" name={t('budget.actual')} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : filteredBudgetsWithActuals.length > 0 ? (
          <motion.div className="space-y-4" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="show">
            <AnimatePresence>
              {filteredBudgetsWithActuals.map(budget => (
                <motion.div key={budget.id} layout variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }} exit={{ opacity: 0, y: -20 }}>
                  <Card className="hover:shadow-lg transition-shadow duration-200">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1 font-semibold">{budget.category}</div>
                      <div className="w-full sm:w-1/2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className={cn(budget.computedActual > budget.limit && 'text-destructive font-bold')}>{formatCurrency(budget.computedActual)}</span>
                          <span className="text-muted-foreground">{t('budget.limit')}: {formatCurrency(budget.limit)}</span>
                        </div>
                        <Progress value={(budget.computedActual / budget.limit) * 100} className={cn('h-2', budget.computedActual > budget.limit && '[&>div]:bg-destructive')} />
                      </div>
                      <div className="flex gap-2 self-end sm:self-center items-center">
                        <Badge variant={budget.computedActual > budget.limit ? 'destructive' : 'default'}>{budget.computedActual > budget.limit ? t('budget.over') : t('budget.under')}</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingBudget(budget); setSheetOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> {t('common.edit')}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(budget)}><Copy className="mr-2 h-4 w-4" /> {t('budget.duplicate')}</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => { setDeletingBudget(budget.id); setDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">{t('labels.emptyBudgets')}</h3>
            <p className="text-muted-foreground mt-2 mb-4">Crea un presupuesto para empezar a controlar tus gastos.</p>
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setEditingBudget(null); setSheetOpen(true); }}>
              <PlusCircle className="mr-2 size-5" /> Crear Presupuesto
            </Button>
          </div>
        )}
      </div>
      <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) { setSheetOpen(false); setEditingBudget(null); } else { setSheetOpen(true); } }}>
        <SheetContent className="sm:max-w-lg w-full p-0" aria-describedby="budget-sheet-desc">
          <SheetHeader className="p-6 border-b"><SheetTitle>{editingBudget?.id ? 'Editar' : 'Nuevo'} Presupuesto</SheetTitle><SheetDescription id="budget-sheet-desc">Define un límite de gasto para una categoría en un mes específico.</SheetDescription></SheetHeader>
          <BudgetForm
            categories={uniqueCategories}
            onSubmit={handleFormSubmit}
            onFinished={() => { setSheetOpen(false); setEditingBudget(null); }}
            defaultValues={editingBudget ? {...editingBudget, month: new Date(editingBudget.month || Date.now())} : { month: filterDate }}
          />
        </SheetContent>
      </Sheet>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent aria-describedby="delete-budget-desc">
          <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription id="delete-budget-desc">Esta acción no se puede deshacer. Se eliminará el presupuesto permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteBudget}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}