import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
const COLORS = ['#0F172A', '#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
export function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const monthlyChartRef = useRef<HTMLDivElement>(null);
  const categoryChartRef = useRef<HTMLDivElement>(null);
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
  }, [fetchData]);
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
  const handleExport = (type: 'csv' | 'pdf') => {
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
        toast.info("La exportación a PDF está en desarrollo y será una simulación simple.");
        setGeneratingPDF(true);
        // This is a simplified simulation as client-side PDF generation is complex without libraries.
        setTimeout(() => {
            const reportWindow = window.open('', '_blank');
            reportWindow?.document.write('<html><head><title>Reporte CasaConta</title></head><body>');
            reportWindow?.document.write('<h1>Reporte Financiero</h1>');
            reportWindow?.document.write('<h2>Resumen Mensual</h2><pre>' + JSON.stringify(monthlySummary, null, 2) + '</pre>');
            reportWindow?.document.write('<h2>Gastos por Categoría</h2><pre>' + JSON.stringify(categorySpending, null, 2) + '</pre>');
            reportWindow?.document.write('</body></html>');
            reportWindow?.document.close();
            reportWindow?.print();
            setGeneratingPDF(false);
        }, 1000);
    }
  };
  const handleAddBudget = async (values: Omit<Budget, 'id'>) => {
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
                <BudgetForm accounts={accounts} categories={uniqueCategories} onSubmit={handleAddBudget} onFinished={() => setSheetOpen(false)} />
              </SheetContent>
            </Sheet>
            <Button onClick={() => handleExport('csv')} disabled={loading || transactions.length === 0}><Download className="mr-2 size-4" /> CSV</Button>
            <Button onClick={() => handleExport('pdf')} disabled={generatingPDF || loading}>
                {generatingPDF ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />} PDF
            </Button>
          </div>
        </header>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Resumen Mensual</CardTitle><CardDescription>Ingresos vs. Gastos por mes.</CardDescription></CardHeader>
            <CardContent ref={monthlyChartRef}>
              {loading ? <Skeleton className="h-[300px]" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlySummary}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} /><YAxis stroke="#888888" fontSize={12} tickFormatter={(v) => `${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} cursor={{ fill: 'hsl(var(--muted))' }} /><Legend />
                    <Bar dataKey="income" fill="#10B981" name="Ingresos" radius={[4, 4, 0, 0]} /><Bar dataKey="expense" fill="#F97316" name="Gastos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Gastos por Categoría (Este Mes)</CardTitle><CardDescription>Distribución de tus gastos y comparación con presupuestos.</CardDescription></CardHeader>
            <CardContent ref={categoryChartRef}>
              {loading ? <Skeleton className="h-[300px]" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={categorySpending} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {categorySpending.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.limit > 0 && entry.value > entry.limit ? '#EF4444' : COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${value}`, `${name} ${props.payload.limit > 0 ? `(Límite: ${props.payload.limit})` : ''}`]} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
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