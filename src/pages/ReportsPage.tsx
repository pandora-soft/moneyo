import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
import { getCategoryColor } from '@/hooks/useCategoryColor';
const tailwindColorToHex: Record<string, string> = {
  'bg-emerald-500': '#10b981', 'bg-orange-500': '#f97316', 'bg-blue-500': '#3b82f6',
  'bg-purple-500': '#8b5cf6', 'bg-red-500': '#ef4444', 'bg-yellow-500': '#eab308',
  'bg-green-500': '#22c55e', 'bg-indigo-500': '#6366f1', 'bg-rose-500': '#f43f5e',
  'bg-slate-500': '#64748b', 'bg-gray-500': '#6b7280',
};
type BudgetWithColor = Budget & { computedActual: number; color: string };
const BudgetRow = ({ budget }: { budget: BudgetWithColor }) => {
  const formatCurrency = useFormatCurrency();
  return (
    <div className="flex flex-col text-sm p-2 rounded-md hover:bg-muted/50">
      <div className="flex items-center">
        <div className="w-1/4 font-semibold">
          <span className={cn(budget.color, "text-white px-2 py-1 rounded-md text-sm")}>{budget.category}</span>
        </div>
        <div className="w-1/4 text-muted-foreground">{format(new Date(budget.month), 'MMM yyyy', { locale: es })}</div>
        <div className="w-1/2">
          <div className="flex justify-between">
            <span className={cn('font-medium', budget.computedActual > budget.limit ? 'text-destructive' : 'text-emerald-500')}>{formatCurrency(budget.computedActual)}</span>
            <span>{formatCurrency(budget.limit)}</span>
          </div>
          <Progress value={(budget.computedActual / budget.limit) * 100} className={cn('w-full mt-1 h-1', budget.computedActual > budget.limit ? '[&>div]:bg-destructive' : `[&>div]:${budget.color}`)} />
        </div>
      </div>
    </div>
  );
};
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

    // Clone the SVG element
    const cloned = svgEl.cloneNode(true) as SVGElement;
    if (!cloned.getAttribute('xmlns')) cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // -------------------------------------------------------------------------
    // 1️⃣ Compute bounding box and set width/height/viewBox on the clone
    // -------------------------------------------------------------------------
    const rect = svgEl.getBoundingClientRect();
    if (!cloned.getAttribute('viewBox')) {
      cloned.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    }
    cloned.setAttribute('width', `${rect.width}`);
    cloned.setAttribute('height', `${rect.height}`);

    // -------------------------------------------------------------------------
    // 2️⃣ Inline all computed styles so the SVG renders correctly when exported
    // -------------------------------------------------------------------------
    const inlineComputedStyles = (original: Element, clone: Element) => {
      const computed = getComputedStyle(original);
      let styleStr = '';
      for (let i = 0; i < computed.length; i++) {
        const prop = computed[i];
        const value = computed.getPropertyValue(prop);
        styleStr += `${prop}:${value} !important;`;
      }
      if (styleStr.trim()) {
        clone.setAttribute('style', styleStr);
      }
      const origChildren = original.children;
      const cloneChildren = clone.children;
      for (let i = 0; i < origChildren.length; i++) {
        inlineComputedStyles(origChildren[i] as Element, cloneChildren[i] as Element);
      }
    };
    inlineComputedStyles(svgEl, cloned);
    // -------------------------------------------------------------------------

    const svgString = new XMLSerializer().serializeToString(cloned);
    const data = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    const img = new Image();

    const png = await new Promise<string | null>((resolve) => {
      // -------------------------------------------------------------------------
      /* 3️⃣ Load timeout (5 seconds) – prevents hanging forever on broken SVGs */
      // -------------------------------------------------------------------------
      const timeoutId = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        resolve(null);
      }, 5000);

      img.onload = () => {
        clearTimeout(timeoutId);
        try {
          const canvas = document.createElement('canvas');
          // -------------------------------------------------------------------------
          // 4️⃣ Use natural dimensions when available, fall back to defaults
          // -------------------------------------------------------------------------
          canvas.width = img.naturalWidth || defaultWidth;
          canvas.height = img.naturalHeight || defaultHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          resolve(null);
        }
      };
      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(null);
      };
      img.src = data;
    });

    return png;
  } catch (err) {
    return null;
  }
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
  // Removed: useCategoryColor hook is no longer needed; we use getCategoryColor directly.
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
            return { name, value, limit: budget?.limit || 0, computedActual: value, color: getCategoryColor(name) };
          })
      .sort((a, b) => b.value - a.value);
const computedBudgets = budgets.map(b => {
  const monthStart = new Date(b.month);
  const actual = transactions
    .filter(t => t.type === 'expense' && getMonth(new Date(t.ts)) === getMonth(monthStart) && getYear(new Date(t.ts)) === getYear(monthStart) && t.category === b.category)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  return { ...b, computedActual: actual, color: getCategoryColor(b.category) };
});
    computedBudgets.sort((a, b) => {
      const key = sortConfig.key;
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      if (a[key] < b[key]) return -1 * direction;
      if (a[key] > b[key]) return 1 * direction;
      return 0;
    });
    return { monthlySummary: monthlyChartData, categorySpending: categoryChartData, budgetsWithActuals: computedBudgets };
  }, [filteredTransactions, budgets, sortConfig, transactions]);
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
        try {
            const doc = new jsPDF({ unit: 'pt', format: 'a4' });

            // Header
            doc.setFontSize(18);
            doc.text('Reporte Financiero - Moneyo', 40, 40);
            doc.setFontSize(11);
            doc.text(`Generado el: ${format(new Date(), 'PPP', { locale: es })}`, 40, 60);
            doc.setFontSize(12);
            doc.text(t('labels.monthlySummary'), 40, 90);

            // Charts
            const [barImage, pieImage] = await Promise.all([
                svgToPngDataUrl(barChartRef.current),
                svgToPngDataUrl(pieChartRef.current),
            ]);

            // Bar chart
            let chartY = 110;
            if (barImage) {
                const pageWidth = doc.internal.pageSize.getWidth();
                const maxWidth = pageWidth - 80;
                const imgHeight = (300 * maxWidth) / 600;
                doc.addImage(barImage, 'PNG', 40, chartY, maxWidth, imgHeight);
                chartY += imgHeight + 10;
            }

            // Monthly summary table
            const monthlyBody = monthlySummary.slice(0, 10).map(row => [
                row.name,
                formatCurrency(row.income),
                formatCurrency(row.expense),
            ]);
            if (monthlyBody.length === 0) {
                doc.text('No hay datos para este período.', 40, chartY, { maxWidth: 400 });
                chartY += 40;
            } else {
                doc.setFont('helvetica');
                doc.setFontSize(11);
            autoTable(doc, {
                startY: chartY,
                head: [['Mes', t('finance.income'), t('finance.expense')]],
                body: monthlyBody,
            });
                chartY = (doc as any).lastAutoTable?.finalY ?? (chartY + 120);
            }

            // Category spending (pie) page
            doc.addPage();
            doc.text(t('labels.categorySpending'), 40, 40);
            let pieY = 70;
            if (pieImage) {
                const pageWidth = doc.internal.pageSize.getWidth();
                const maxWidth = pageWidth - 80;
                const imgHeight = (300 * maxWidth) / 600;
                doc.addImage(pieImage, 'PNG', 40, pieY, maxWidth, imgHeight);
                pieY += imgHeight + 10;
            }

            const categoryBody = categorySpending.slice(0, 10);
            if (categoryBody.length === 0) {
                doc.text('No hay datos para este período.', 40, pieY, { maxWidth: 400 });
                pieY += 40;
            } else {
                doc.setFont('helvetica');
                doc.setFontSize(11);
                autoTable(doc, {
                    startY: pieY,
                    head: [['Categoría', 'Gasto', 'Límite']],
                    body: categoryBody.map(row => [
                        row.name,
                        formatCurrency(row.value),
                        row.limit > 0 ? formatCurrency(row.limit) : 'N/A',
                    ]),
                    didParseCell: (data: any) => {
                        if (data.section === 'body') {
                            const item = categoryBody[data.row.index];
                            if (item && item.limit > 0 && item.computedActual > item.limit) {
                                data.cell.styles.textColor = [255, 0, 0];
                            }
                        }
                    },
                });
                pieY = (doc as any).lastAutoTable?.finalY ?? (pieY + 10);
            }

            // Budgets summary page
            doc.addPage();
            doc.setFontSize(16);
            doc.text('Resumen de Presupuestos', 40, 40);
            let budgetsY = 70;
            doc.setFont('helvetica');
            doc.setFontSize(11);
            const budgetsBody = budgetsWithActuals.slice(0, 10).map(b => [
                b.category,
                format(new Date(b.month), 'MMM yyyy', { locale: es }),
                formatCurrency(b.computedActual),
                formatCurrency(b.limit),
            ]);
            if (budgetsBody.length === 0) {
                doc.text('No hay datos para este período.', 40, budgetsY, { maxWidth: 400 });
                budgetsY += 40;
            } else {
                autoTable(doc, {
                    startY: budgetsY,
                    head: [['Categoría', 'Mes', 'Actual', 'Límite']],
                    body: budgetsBody,
                    didParseCell: (data: any) => {
                        if (data.section === 'body') {
                            const budget = budgetsWithActuals[data.row.index];
                            if (budget && budget.computedActual > budget.limit) {
                                data.cell.styles.textColor = [255, 0, 0];
                            }
                        }
                    },
                });
                budgetsY = (doc as any).lastAutoTable?.finalY ?? (budgetsY + 120);
            }

            // Save PDF
            const pdfBlob = doc.output('blob');
            if (!pdfBlob || !(pdfBlob instanceof Blob) || pdfBlob.size === 0) {
                throw new Error('PDF blob inválido o vacío');
            }
            const pdfLink = document.createElement('a');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            pdfLink.setAttribute('href', pdfUrl);
            pdfLink.setAttribute('download', getExportFilename('pdf'));
            document.body.appendChild(pdfLink);
            pdfLink.click();
            document.body.removeChild(pdfLink);
            URL.revokeObjectURL(pdfUrl);
            toast.success('Reporte PDF generado.');
} catch (e) {
    console.error('PDF gen error:', e);
    console.error('Error details:', e instanceof Error ? e.stack : JSON.stringify(e, null, 2));
    toast.error('Error al generar el PDF.');
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
                          {categorySpending.map((entry, index) => {
  const colorKey = entry.color.split(' ')[0];
  return <Cell key={`cell-${index}`} fill={tailwindColorToHex[colorKey] || '#6b7280'} />;
})}
```
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
                    <BudgetRow key={b.id} budget={b} />
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
 
 