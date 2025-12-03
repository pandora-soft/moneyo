import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Pie, PieChart, Cell } from 'recharts';
import { api } from '@/lib/api-client';
import type { Transaction, Budget, Account } from '@shared/types';
import { format, getMonth, getYear, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BudgetForm } from '@/components/accounting/BudgetForm';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/lib/formatCurrency';
import { useAppStore } from '@/stores/useAppStore';
const COLORS = ['#0F172A', '#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
export function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const formatCurrency = useFormatCurrency();
  const refetchTrigger = useAppStore((state) => state.refetchData);
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [txs, bgs, accs] = await Promise.all([
        api<{ items: Transaction[] }>('/api/finance/transactions?limit=1000').then(p => p.items),
        api<Budget[]>('/api/finance/budgets'),
        api<Account[]>('/api/finance/accounts'),
      ]);
      setTransactions(txs);
      setBudgets(bgs);
      setAccounts(accs);
    } catch (error) {
      toast.error("Error al cargar los datos de reportes.");
      console.error("Failed to fetch report data", error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData, refetchTrigger]);
  const { monthlySummary, categorySpending, uniqueCategories } = useMemo(() => {
    const summary = transactions.reduce((acc, tx) => {
      const monthKey = format(new Date(tx.ts), 'yyyy-MM');
      if (!acc[monthKey]) {
        acc[monthKey] = { income: 0, expense: 0, name: format(new Date(tx.ts), 'MMM yyyy', { locale: es }) };
      }
      if (tx.type === 'income') acc[monthKey].income += tx.amount;
      else if (tx.type === 'expense') acc[monthKey].expense += Math.abs(tx.amount);
      return acc;
    }, {} as Record<string, { income: number; expense: number; name: string }>);
    const monthlyChartData = Object.values(summary).reverse();
    const currentMonthStart = startOfMonth(new Date());
    const spending = transactions
      .filter(tx => tx.type === 'expense' && new Date(tx.ts) >= currentMonthStart)
      .reduce((acc, tx) => {
        if (!acc[tx.category]) acc[tx.category] = 0;
        acc[tx.category] += Math.abs(tx.amount);
        return acc;
      }, {} as Record<string, number>);
    const categoryChartData = Object.entries(spending)
      .map(([name, value]) => {
        const budget = budgets.find(b => b.category === name && getMonth(new Date(b.month)) === getMonth(currentMonthStart) && getYear(new Date(b.month)) === getYear(currentMonthStart));
        return { name, value, limit: budget?.limit || 0 };
      })
      .sort((a, b) => b.value - a.value);
    const allCategories = [...new Set(transactions.filter(t => t.type === 'expense').map(t => t.category)), 'Salario', 'Alquiler', 'Comida', 'Transporte', 'Ocio'];
    const uniqueCategories = [...new Set(allCategories)];
    return { monthlySummary: monthlyChartData, categorySpending: categoryChartData, uniqueCategories };
  }, [transactions, budgets]);
  const handleExport = async (type: 'csv' | 'pdf') => {
    if (type === 'csv') {
        const headers = "Fecha,Cuenta ID,Tipo,Monto,Moneda,Categoría,Nota\n";
        const csvContent = transactions.map(tx => `${new Date(tx.ts).toISOString()},${tx.accountId},${tx.type},${tx.amount},${tx.currency},"${tx.category}","${tx.note || ''}"`).join("\n");
        const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `casaconta_reporte_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        setGeneratingPDF(true);
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 1120;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                toast.error("No se pudo generar el PDF.");
                return;
            }
            // Background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Header
            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 32px sans-serif';
            ctx.fillText('Reporte Financiero - CasaConta', 40, 60);
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#64748B';
            ctx.fillText(`Generado el: ${format(new Date(), 'PPP', { locale: es })}`, 40, 90);
            // Monthly Summary Table
            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('Resumen Mensual', 40, 150);
            const headers = ['Mes', 'Ingresos', 'Gastos'];
            let y = 190;
            ctx.font = 'bold 14px sans-serif';
            headers.forEach((header, i) => ctx.fillText(header, 40 + i * 200, y));
            ctx.font = '14px sans-serif';
            monthlySummary.slice(0, 5).forEach(row => {
                y += 30;
                ctx.fillText(row.name, 40, y);
                ctx.fillStyle = '#10B981';
                ctx.fillText(formatCurrency(row.income), 240, y);
                ctx.fillStyle = '#F97316';
                ctx.fillText(formatCurrency(row.expense), 440, y);
                ctx.fillStyle = '#0F172A';
            });
            // Category Spending Bars
            y += 60;
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('Gastos por Categoría (Este Mes)', 40, y);
            y += 40;
            const maxSpending = Math.max(...categorySpending.map(c => c.value), 1);
            categorySpending.slice(0, 8).forEach((cat, i) => {
                ctx.font = '14px sans-serif';
                ctx.fillStyle = '#0F172A';
                ctx.fillText(cat.name, 40, y);
                const barWidth = (cat.value / maxSpending) * 500;
                ctx.fillStyle = cat.limit > 0 && cat.value > cat.limit ? '#EF4444' : COLORS[i % COLORS.length];
                ctx.fillRect(200, y - 12, barWidth, 18);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText(formatCurrency(cat.value), 205, y + 2);
                y += 35;
            });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `casaconta_reporte_${new Date().toISOString().split('T')[0]}.png`;
                link.click();
            }
        } catch (e) {
            toast.error("Ocurrió un error al generar el reporte.");
        } finally {
            setGeneratingPDF(false);
        }
    }
  };
  const handleAddBudget = async (values: Omit<Budget, 'id' | 'accountId'>) => {
    try {
      await api<Budget>('/api/finance/budgets', { method: 'POST', body: JSON.stringify(values) });
      toast.success('Presupuesto guardado.');
      fetchData();
    } catch (error) {
      toast.error('Error al guardar el presupuesto.');
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold">Reportes</h1>
            <p className="text-muted-foreground mt-1">Visualiza tus patrones de ingresos y gastos.</p>
          </div>
          <div className="flex gap-2">
            <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild><Button variant="outline"><PlusCircle className="mr-2 size-4" /> Crear Presupuesto</Button></SheetTrigger>
              <SheetContent className="sm:max-w-lg w-full p-0">
                <SheetHeader className="p-6 border-b"><SheetTitle>Nuevo Presupuesto</SheetTitle></SheetHeader>
                <BudgetForm categories={uniqueCategories} onSubmit={handleAddBudget} onFinished={() => setSheetOpen(false)} />
              </SheetContent>
            </Sheet>
            <Button onClick={() => handleExport('csv')} disabled={loading || transactions.length === 0}><Download className="mr-2 size-4" /> CSV</Button>
            <Button onClick={() => handleExport('pdf')} disabled={generatingPDF || loading}>
                {generatingPDF ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />} Reporte Gráfico</Button>
          </div>
        </header>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Resumen Mensual</CardTitle><CardDescription>Ingresos vs. Gastos por mes.</CardDescription></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-[300px]" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlySummary}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} /><YAxis stroke="#888888" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(value: number) => formatCurrency(value)} /><Legend />
                    <Bar dataKey="income" fill="#10B981" name="Ingresos" radius={[4, 4, 0, 0]} /><Bar dataKey="expense" fill="#F97316" name="Gastos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Gastos por Categoría (Este Mes)</CardTitle><CardDescription>Distribución de tus gastos y comparación con presupuestos.</CardDescription></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-[300px]" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={categorySpending} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {categorySpending.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.limit > 0 && entry.value > entry.limit ? '#EF4444' : COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip formatter={(value: number, name, props) => [formatCurrency(value), `${name} ${props.payload.limit > 0 ? `(Límite: ${formatCurrency(props.payload.limit)})` : ''}`]} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}