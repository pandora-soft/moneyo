import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { api } from '@/lib/api-client';
import type { Transaction, Budget } from '@shared/types';
import { format, getMonth, getYear, startOfMonth, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreVertical, Pencil, Trash2, Copy } from 'lucide-react';
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
    } catch (e) {
      toast.error("Error al cargar presupuestos.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData, refetchData]);
  const { uniqueMonths, filteredBudgetsWithActuals } = useMemo(() => {
    const monthsSet = new Set<string>();
    const today = startOfMonth(new Date());
    monthsSet.add(format(today, 'yyyy-MM'));
    monthsSet.add(format(addMonths(today, 1), 'yyyy-MM'));
    monthsSet.add(format(addMonths(today, -1), 'yyyy-MM'));
    budgets.forEach(b => monthsSet.add(format(new Date(b.month), 'yyyy-MM')));
    const sortedMonths = Array.from(monthsSet).sort().reverse();
    const currentBudgets = budgets.filter(b => format(new Date(b.month), 'yyyy-MM') === format(filterDate, 'yyyy-MM'));
    const withActuals = currentBudgets.map(b => {
      const actual = transactions
        .filter(t => t.type === 'expense' && format(new Date(t.ts), 'yyyy-MM') === format(new Date(b.month), 'yyyy-MM') && t.category === b.category)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return { ...b, computedActual: actual, color: getCategoryColor(b.category) };
    });
    return { uniqueMonths: sortedMonths, filteredBudgetsWithActuals: withActuals };
  }, [budgets, transactions, filterDate]);
  const handleMonthChange = (val: string) => {
    const [year, month] = val.split('-').map(Number);
    setFilterDate(new Date(year, month - 1, 1));
  };
  const handleFormSubmit = async (values: Omit<Budget, 'id' | 'computedActual'>) => {
    try {
      const method = editingBudget?.id ? 'PUT' : 'POST';
      const path = editingBudget?.id ? `/api/finance/budgets/${editingBudget.id}` : '/api/finance/budgets';
      await api(path, { method, body: JSON.stringify(values) });
      toast.success('Presupuesto guardado.');
      fetchData();
    } catch { toast.error('Error al guardar.'); }
    setSheetOpen(false);
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold">Presupuestos</h1>
            <p className="text-muted-foreground">Controla tus gastos por categoría.</p>
          </div>
          <Button size="lg" className="bg-orange-500" onClick={() => { setEditingBudget(null); setSheetOpen(true); }}><PlusCircle className="mr-2" /> Nuevo Presupuesto</Button>
        </header>
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Estado Mensual</CardTitle>
            <Select value={format(filterDate, 'yyyy-MM')} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {uniqueMonths.map(m => (
                  <SelectItem key={m} value={m}>{format(new Date(Number(m.split('-')[0]), Number(m.split('-')[1]) - 1, 1), 'MMMM yyyy', { locale: es })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={filteredBudgetsWithActuals}>
                  <XAxis dataKey="category" />
                  <YAxis tickFormatter={v => formatCurrency(v)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="limit" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="computedActual" radius={[4, 4, 0, 0]}>
                    {filteredBudgetsWithActuals.map((entry, i) => <Cell key={i} fill={tailwindColorToHex[entry.color] || '#f97316'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          {filteredBudgetsWithActuals.map(b => (
            <Card key={b.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                  <Badge className={cn(b.color, "text-white")}>{b.category}</Badge>
                </div>
                <div className="w-full sm:w-1/2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={cn(b.computedActual > b.limit && "text-red-500 font-bold")}>{formatCurrency(b.computedActual)}</span>
                    <span className="text-muted-foreground">de {formatCurrency(b.limit)}</span>
                  </div>
                  <Progress value={(b.computedActual / b.limit) * 100} className={cn("h-2", b.computedActual > b.limit && "[&>div]:bg-red-500")} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingBudget(b); setSheetOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500" onClick={() => { setDeletingBudget(b.id); setDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
          {!loading && filteredBudgetsWithActuals.length === 0 && <p className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">No hay presupuestos definidos para este mes.</p>}
        </div>
      </div>
      <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent aria-describedby="budget-sheet-desc">
          <SheetHeader>
            <SheetTitle>{editingBudget?.id ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</SheetTitle>
            <SheetDescription id="budget-sheet-desc">
              Define los límites de gasto para tus categorías preferidas.
            </SheetDescription>
          </SheetHeader>
          <BudgetForm 
            categories={categories} 
            onSubmit={handleFormSubmit} 
            onFinished={() => setSheetOpen(false)} 
            defaultValues={editingBudget ? { ...editingBudget, month: new Date(editingBudget.month!) } : { month: filterDate }} 
          />
        </SheetContent>
      </Sheet>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent aria-describedby="delete-budget-desc">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription id="delete-budget-desc">
              Esta acción no se puede deshacer y el presupuesto será eliminado de tus registros mensuales.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deletingBudget) { await api(`/api/finance/budgets/${deletingBudget}`, { method: 'DELETE' }); fetchData(); setDeleteDialogOpen(false); } }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}