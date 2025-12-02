import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Pie, PieChart, Cell } from 'recharts';
import { api } from '@/lib/api-client';
import type { Transaction } from '@shared/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
const COLORS = ['#0F172A', '#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
export function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const txs = await api<{ items: Transaction[] }>('/api/finance/transactions?limit=500').then(p => p.items);
        setTransactions(txs);
      } catch (error) {
        console.error("Failed to fetch transactions", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  const { monthlySummary, categorySpending } = useMemo(() => {
    const summary = transactions.reduce((acc, tx) => {
      const month = format(new Date(tx.ts), 'MMM yyyy', { locale: es });
      if (!acc[month]) {
        acc[month] = { income: 0, expense: 0 };
      }
      if (tx.type === 'income') {
        acc[month].income += tx.amount;
      } else if (tx.type === 'expense') {
        acc[month].expense += Math.abs(tx.amount);
      }
      return acc;
    }, {} as Record<string, { income: number; expense: number }>);
    const monthlyChartData = Object.entries(summary)
      .map(([name, values]) => ({ name, ...values }))
      .reverse();
    const spending = transactions
      .filter(tx => tx.type === 'expense')
      .reduce((acc, tx) => {
        if (!acc[tx.category]) {
          acc[tx.category] = 0;
        }
        acc[tx.category] += Math.abs(tx.amount);
        return acc;
      }, {} as Record<string, number>);
    const categoryChartData = Object.entries(spending)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return { monthlySummary: monthlyChartData, categorySpending: categoryChartData };
  }, [transactions]);
  const handleExport = () => {
    const headers = "Fecha,Cuenta ID,Tipo,Monto,Moneda,Categoría,Nota\n";
    const csvContent = transactions
      .map(tx => `${new Date(tx.ts).toISOString()},${tx.accountId},${tx.type},${tx.amount},${tx.currency},${tx.category},"${tx.note || ''}"`)
      .join("\n");
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `casaconta_reporte_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
          <Button onClick={handleExport} disabled={loading || transactions.length === 0}>
            <Download className="mr-2 size-4" /> Exportar a CSV
          </Button>
        </header>
        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumen Mensual</CardTitle>
              <CardDescription>Ingresos vs. Gastos por mes.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-[300px]" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlySummary}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                    <Legend />
                    <Bar dataKey="income" fill="#10B981" name="Ingresos" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#F97316" name="Gastos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Categoría</CardTitle>
              <CardDescription>Distribución de tus gastos totales.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-[300px]" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categorySpending}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categorySpending.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}