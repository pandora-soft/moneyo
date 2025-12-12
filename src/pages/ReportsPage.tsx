import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Pie, PieChart, Cell } from 'recharts';
import { api } from '@/lib/api-client';
import type { Transaction, Budget } from '@shared/types';
import { format, getMonth, getYear, startOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ArrowUpDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/lib/formatCurrency';
import { useAppStore } from '@/stores/useAppStore';
import t from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { TransactionFilters, Filters } from '@/components/accounting/TransactionFilters';
import type { DateRange } from 'react-day-picker';
const COLORS = ['#0F172A', '#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
export function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: 'category' | 'month'; direction: 'asc' | 'desc' }>({ key: 'month', direction: 'desc' });
  const [filters, setFilters] = useState<Filters>({ query: '', accountId: 'all', type: 'all', dateRange: undefined, preset: 'all' });
  const formatCurrency = useFormatCurrency();
  const barChartRef = useRef<HTMLDivElement | null>(null);
  const pieChartRef = useRef<HTMLDivElement | null>(null);
  const refetchTrigger = useAppStore((state) => state.refetchData);
  const svgToPngDataUrl = async (container: HTMLDivElement | null, defaultWidth = 600, defaultHeight = 300): Promise<string | null> => {
    try {
      if (!container) return null;
      const svgEl = container.querySelector('svg');
      if (!svgEl) return null;
      const cloned = svgEl.cloneNode(true) as SVGElement;
      if (!cloned.getAttribute('xmlns')) cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const svgString = new XMLSerializer().serializeToString(cloned);
      const data = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
      const img = new Image();
      const png = await new Promise<string | null>((resolve) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || defaultWidth;
            canvas.height = img.height || defaultHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } catch (err) { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = data;
      });
      return png;
    } catch (err) { return null; }
  };
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
      toast.error("Error al cargar los datos de reportes.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData, refetchTrigger]);
  const filteredTransactions = useMemo(() => {
    if (!filters.dateRange?.from) return transactions;
    return transactions.filter(t => isWithinInterval(new Date(t.ts), {
      start: filters.dateRange!.from!,
      end: filters.dateRange!.to ?? new Date(),
    }));
  }, [transactions, filters.dateRange]);
  const { monthlySummary, categorySpending, budgetsWithActuals } = useMemo(() => {
    const summary = filteredTransactions.reduce((acc, tx) => {
      const monthKey = format(new Date(tx.ts), 'yyyy-MM');
      if (!acc[monthKey]) acc[monthKey] = { income: 0, expense: 0, name: format(new Date(tx.ts), 'MMM yyyy', { locale: es }) };
      if (tx.type === 'income') acc[monthKey].income += tx.amount;
      else if (tx.type === 'expense') acc[monthKey].expense += Math.abs(tx.amount);
      return acc;
    }, {} as Record<string, { income: number; expense: number; name: string }>);
    const monthlyChartData = Object.values(summary).reverse();
    const currentMonthStart = startOfMonth(new Date());
    const spending = filteredTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((acc, tx) => {
        if (!acc[tx.category]) acc[tx.category] = 0;
        acc[tx.category] += Math.abs(tx.amount);
        return acc;
      }, {} as Record<string, number>);
    const categoryChartData = Object.entries(spending)
      .map(([name, value]) => {
        const budget = budgets.find(b => b.category === name && getMonth(new Date(b.month)) === getMonth(currentMonthStart) && getYear(new Date(b.month)) === getYear(currentMonthStart));
        return { name, value, limit: budget?.limit || 0, computedActual: value };
      })
      .sort((a, b) => b.value - a.value);
    const computedBudgets = budgets.map(b => {
      const monthStart = new Date(b.month);
      const actual = filteredTransactions
        .filter(t => t.type === 'expense' && getMonth(new Date(t.ts)) === getMonth(monthStart) && getYear(new Date(t.ts)) === getYear(monthStart) && t.category === b.category)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return { ...b, computedActual: actual };
    });
    computedBudgets.sort((a, b) => {
      const key = sortConfig.key;
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      if (a[key] < b[key]) return -1 * direction;
      if (a[key] > b[key]) return 1 * direction;
      return 0;
    });
    return { monthlySummary: monthlyChartData, categorySpending: categoryChartData, budgetsWithActuals: computedBudgets };
  }, [filteredTransactions, budgets, sortConfig]);
  const handleSort = (key: 'category' | 'month') => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };
  const getExportFilename = (extension: 'csv' | 'pdf') => {
    const base = 'moneyo-reporte';
    if (filters.dateRange?.from) {
      const from = format(filters.dateRange.from, 'yyyy-MM-dd');
      const to = format(filters.dateRange.to ?? new Date(), 'yyyy-MM-dd');
      return `${base}-${from}-a-${to}.${extension}`;
    }
    return `${base}-completo.${extension}`;
  };
  const handleExport = async (type: 'csv' | 'pdf') => {
    if (type === 'csv') {
        const headers = "Fecha,Cuenta ID,Tipo,Monto,Moneda,Categoría,Nota,Recurrente\n";
        const csvContent = filteredTransactions.map(tx => `${new Date(tx.ts).toISOString()},${tx.accountId},${tx.type},${tx.amount},${tx.currency},"${tx.category}","${tx.note || ''}",${tx.recurrent || false}`).join("\n");
        const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", getExportFilename('csv'));
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        setGeneratingPDF(true);
        toast.info('Generando reporte PDF...');
        try {
            const doc = new jsPDF({ unit: 'pt', format: 'a4' });
            (doc as any).autoTable = (await import('jspdf-autotable')).default;
            doc.setFontSize(18);
            doc.text('Reporte Financiero - Moneyo', 40, 40);
            doc.setFontSize(11);
            doc.text(`Generado el: ${format(new Date(), 'PPP', { locale: es })}`, 40, 60);
            doc.setFontSize(12);
            doc.text(t('labels.monthlySummary'), 40, 90);
            const [barImage, pieImage] = await Promise.all([svgToPngDataUrl(barChartRef.current), svgToPngDataUrl(pieChartRef.current)]);
            let currentY = 100;
            if (barImage) {
              const pageWidth = doc.internal.pageSize.getWidth();
              const maxWidth = pageWidth - 80;
              const imgHeight = (300 * maxWidth) / 600;
              doc.addImage(barImage, 'PNG', 40, currentY, maxWidth, imgHeight);
              currentY += imgHeight + 10;
            }
            (doc as any).autoTable({
              startY: currentY,
              head: [['Mes', t('finance.income'), t('finance.expense')]],
              body: monthlySummary.slice(0, 10).map(row => [row.name, formatCurrency(row.income), formatCurrency(row.expense)]),
            });
            currentY = (doc as any).lastAutoTable?.finalY ?? (currentY + 20);
            doc.addPage();
            doc.text(t('labels.categorySpending'), 40, 40);
            currentY = 50;
            if (pieImage) {
              const pageWidth = doc.internal.pageSize.getWidth();
              const maxWidth = pageWidth - 80;
              const imgHeight = (300 * maxWidth) / 600;
              doc.addImage(pieImage, 'PNG', 40, currentY, maxWidth, imgHeight);
              currentY += imgHeight + 10;
            }
            const categoryBody = categorySpending.slice(0, 10);
            (doc as any).autoTable({
              startY: currentY,
              head: [['Categoría', 'Gasto', 'Límite']],
              body: categoryBody.map(row => [row.name, formatCurrency(row.value), row.limit > 0 ? formatCurrency(row.limit) : 'N/A']),
              didParseCell: (data: any) => {
                if (data.section === 'body') {
                  const item = categoryBody[data.row.index];
                  if (item && item.limit > 0 && item.computedActual > item.limit) {
                    data.cell.styles.textColor = [255, 0, 0];
                  }
                }
              },
            });
            doc.save(getExportFilename('pdf'));
            toast.success('Reporte PDF generado.');
        } catch (e) {
            toast.error(`Error al generar el reporte: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setGeneratingPDF(false);
        }
    }
  };
  const exportBudgets = () => {
    const headers = "Mes,Categoría,Límite,Gasto Real\n";
    const csvContent = budgetsWithActuals.map(b => `${format(new Date(b.month), 'yyyy-MM')},"${b.category}",${b.limit},${b.computedActual}`).join("\n");
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `moneyo-presupuestos-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold">{t('pages.reports')}</h1>
            <p className="text-muted-foreground mt-1">{t('reports.description')}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleExport('csv')} disabled={loading || filteredTransactions.length === 0}><Download className="mr-2 size-4" /> {t('reports.exportTransactionsCSV')}</Button>
            <Button onClick={() => handleExport('pdf')} disabled={generatingPDF || loading}>
                {generatingPDF ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />} {t('reports.exportPDF')}</Button>
          </div>
        </header>
        <TransactionFilters filters={filters} setFilters={setFilters} accounts={[]} focus="date" />
        <p className="text-sm text-muted-foreground mb-4">
          {t('common.filteredXOfY', filteredTransactions.length, transactions.length)}
        </p>
        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>{t('labels.monthlySummary')}</CardTitle><CardDescription>Ingresos vs. Gastos por mes.</CardDescription></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[300px]" /> : (
                  <div ref={barChartRef} className="h-[300px]">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthlySummary}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} /><YAxis stroke="#888888" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(value: number) => formatCurrency(value)} /><Legend />
                        <Bar dataKey="income" fill="#10B981" name={t('finance.income')} radius={[4, 4, 0, 0]} /><Bar dataKey="expense" fill="#F97316" name={t('finance.expense')} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t('labels.categorySpending')}</CardTitle><CardDescription>Distribución de tus gastos y comparación con presupuestos.</CardDescription></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[300px]" /> : (
                  <div ref={pieChartRef} className="h-[300px]">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={categorySpending} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {categorySpending.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.limit > 0 && entry.computedActual > entry.limit ? '#EF4444' : COLORS[index % COLORS.length]} />))}
                        </Pie>
                        <Tooltip formatter={(value: number, name, props) => [formatCurrency(value), `${name} ${props.payload.limit > 0 ? `(${t('budget.actual')}: ${formatCurrency(props.payload.computedActual)} / ${t('budget.limit')}: ${formatCurrency(props.payload.limit)})` : ''}`]} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{t('budget.overview')}</CardTitle>
                    <CardDescription>{t('budget.overviewDesc')}</CardDescription>
                  </div>
                  <Button variant="outline" onClick={exportBudgets} disabled={budgetsWithActuals.length === 0}>
                    <Download className="mr-2 size-4" /> {t('common.exportBudgets')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex text-sm font-medium text-muted-foreground px-2">
                    <div className="w-1/4 cursor-pointer" onClick={() => handleSort('category')}>{t('budget.category')} <ArrowUpDown className="inline-block ml-1 size-3" /></div>
                    <div className="w-1/4 cursor-pointer" onClick={() => handleSort('month')}>{t('budget.month')} <ArrowUpDown className="inline-block ml-1 size-3" /></div>
                    <div className="w-1/2">{t('budget.progress')}</div>
                  </div>
                  {budgetsWithActuals.slice(0, 5).map(b => (
                    <div key={b.id} className="flex flex-col text-sm p-2 rounded-md hover:bg-muted/50">
                      <div className="flex items-center">
                        <div className="w-1/4 font-semibold">{b.category}</div>
                        <div className="w-1/4 text-muted-foreground">{format(new Date(b.month), 'MMM yyyy', { locale: es })}</div>
                        <div className="w-1/2">
                          <div className="flex justify-between">
                            <span className={cn('font-medium', b.computedActual > b.limit ? 'text-destructive' : 'text-emerald-500')}>{formatCurrency(b.computedActual)}</span>
                            <span>{formatCurrency(b.limit)}</span>
                          </div>
                          <Progress value={(b.computedActual / b.limit) * 100} className={cn('w-full mt-1 h-1', b.computedActual > b.limit ? '[&>div]:bg-destructive' : '[&>div]:bg-emerald-500')} />
                        </div>
                      </div>
                    </div>
                  ))}
                   {budgetsWithActuals.length === 0 && !loading && <p className="text-center text-muted-foreground py-4">No hay presupuestos para mostrar.</p>}
                  <Button asChild variant="link" className="mt-4 w-full p-0 h-auto">
                    <Link to="/budgets">{t('budget.viewAll')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}