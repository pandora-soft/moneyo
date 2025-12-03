import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Pie, PieChart, Cell } from 'recharts';
import { api } from '@/lib/api-client';
import type { Transaction, Budget } from '@shared/types';
import { format, getMonth, getYear, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { BudgetForm } from '@/components/accounting/BudgetForm';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/lib/formatCurrency';
import { useAppStore } from '@/stores/useAppStore';
import t from '@/lib/i18n';
import { cn } from '@/lib/utils';
const COLORS = ['#0F172A', '#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
export function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<string | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const formatCurrency = useFormatCurrency();
  const barChartRef = useRef<HTMLDivElement | null>(null);
  const pieChartRef = useRef<HTMLDivElement | null>(null);
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
      toast.error("Error al cargar los datos de reportes.");
      console.error("Failed to fetch report data", error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData, refetchTrigger]);
  const { monthlySummary, categorySpending, uniqueCategories, budgetsWithActuals } = useMemo(() => {
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
        return { name, value, limit: budget?.limit || 0, computedActual: value };
      })
      .sort((a, b) => b.value - a.value);
    const allCategories = [...new Set(transactions.filter(t => t.type === 'expense').map(t => t.category)), 'Salario', 'Alquiler', 'Comida', 'Transporte', 'Ocio'];
    const uniqueCategories = [...new Set(allCategories)];
    const budgetsWithActuals = budgets.map(b => {
      const monthStart = new Date(b.month);
      const actual = transactions
        .filter(t => t.type === 'expense' && getMonth(new Date(t.ts)) === getMonth(monthStart) && getYear(new Date(t.ts)) === getYear(monthStart) && t.category === b.category)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return { ...b, computedActual: actual };
    }).sort((a, b) => b.month - a.month);
    return { monthlySummary: monthlyChartData, categorySpending: categoryChartData, uniqueCategories, budgetsWithActuals };
  }, [transactions, budgets]);
  const handleAddBudget = async (values: Omit<Budget, 'id' | 'accountId'>) => {
    try {
      const newBudget = await api<Budget>('/api/finance/budgets', { method: 'POST', body: JSON.stringify(values) });
      toast.success('Presupuesto guardado.');
      setBudgets(prev => [...prev, newBudget]); // Optimistic update
      setSheetOpen(false);
    } catch (error) {
      toast.error('Error al guardar el presupuesto.');
    }
  };
  const handleEditBudget = async (values: Omit<Budget, 'id' | 'accountId'>) => {
    if (!editingBudget) return;
    try {
      await api(`/api/finance/budgets/${editingBudget.id}`, { method: 'PUT', body: JSON.stringify(values) });
      toast.success('Presupuesto actualizado.');
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar el presupuesto.');
    } finally {
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
            // Helper: convert an SVG element to a PNG data URL by inlining styles and drawing to canvas
            const svgToPngDataUrl = async (svgEl: SVGSVGElement | null, width = 800, height = 400) => {
              if (!svgEl) return null;
              const clone = svgEl.cloneNode(true) as SVGSVGElement;

              const traverse = (node: Element) => {
                const computed = window.getComputedStyle(node);
                let styleText = '';
                for (let i = 0; i < computed.length; i++) {
                  const prop = computed[i];
                  styleText += `${prop}:${computed.getPropertyValue(prop)};`;
                }
                node.setAttribute('style', styleText);
                Array.from(node.children).forEach(child => traverse(child as Element));
              };
              traverse(clone as Element);

              const svgString = new XMLSerializer().serializeToString(clone);
              const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const img = new Image();
              img.width = width;
              img.height = height;
              await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('SVG to PNG conversion failed'));
                img.src = url;
              });
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) return null;
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              URL.revokeObjectURL(url);
              return canvas.toDataURL('image/png');
            };

            // Capture SVGs from the rendered chart containers
            const barSvg = barChartRef.current?.querySelector('svg') as SVGSVGElement | undefined;
            const pieSvg = pieChartRef.current?.querySelector('svg') as SVGSVGElement | undefined;
            const barImg = await svgToPngDataUrl(barSvg || null, 800, 400);
            const pieImg = await svgToPngDataUrl(pieSvg || null, 600, 400);

            // Compose PDF
            const doc = new jsPDF({ unit: 'pt', format: 'a4' });
            doc.setFontSize(18);
            doc.setTextColor('#0F172A');
            doc.text('Reporte Financiero - CasaConta', 40, 40);
            doc.setFontSize(11);
            doc.setTextColor('#64748B');
            doc.text(`Generado el: ${format(new Date(), 'PPP', { locale: es })}`, 40, 60);

            // Monthly summary table
            doc.setTextColor('#0F172A');
            doc.setFontSize(12);
            doc.text(t('labels.monthlySummary'), 40, 90);
            let y = 110;
            const headers = ['Mes', t('finance.income'), t('finance.expense')];
            doc.setFont('helvetica', 'bold');
            doc.text(headers.join('    '), 40, y);
            doc.setFont('helvetica', 'normal');
            monthlySummary.slice(0, 5).forEach(row => {
              y += 16;
              doc.text(row.name, 40, y);
              doc.text(formatCurrency(row.income), 240, y);
              doc.text(formatCurrency(row.expense), 420, y);
            });

            // Add bar chart image
            if (barImg) {
              doc.addPage();
              doc.text(t('labels.monthlySummary'), 40, 40);
              doc.addImage(barImg, 'PNG', 40, 60, 520, 260);
            }

            // Add pie chart image
            if (pieImg) {
              doc.addPage();
              doc.text(t('labels.categorySpending'), 40, 40);
              doc.addImage(pieImg, 'PNG', 40, 60, 480, 260);
            }

            doc.save(`casaconta-reporte.pdf`);
            toast.success('Reporte PDF generado.');
        } catch (e) {
            toast.error("Ocurrió un error al generar el reporte.");
        } finally {
            setGeneratingPDF(false);
        }
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold">{t('pages.reports')}</h1>
            <p className="text-muted-foreground mt-1">Visualiza tus patrones de ingresos y gastos.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleExport('csv')} disabled={loading || transactions.length === 0}><Download className="mr-2 size-4" /> CSV</Button>
            <Button onClick={() => handleExport('pdf')} disabled={generatingPDF || loading}>
                {generatingPDF ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />} Reporte Gráfico</Button>
          </div>
        </header>
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
              <CardHeader><CardTitle>{t('budget.list')} Overview</CardTitle><CardDescription>Un vistazo rápido a tus presupuestos activos.</CardDescription></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budgetsWithActuals.slice(0, 5).map(b => (
                    <div key={b.id} className="flex flex-col text-sm">
                      <div className="flex justify-between">
                        <span>{b.category} - {format(new Date(b.month), 'MMM yyyy', { locale: es })}</span>
                        <span className={cn('font-medium', b.computedActual > b.limit ? 'text-destructive' : 'text-emerald-500')}>{formatCurrency(b.computedActual)} / {formatCurrency(b.limit)}</span>
                      </div>
                      <Progress value={(b.computedActual / b.limit) * 100} className={cn('w-full mt-1 h-1', b.computedActual > b.limit ? '[&>div]:bg-destructive' : '[&>div]:bg-emerald-500')} />
                    </div>
                  ))}
                   {budgetsWithActuals.length === 0 && !loading && <p className="text-center text-muted-foreground py-4">No hay presupuestos para mostrar.</p>}
                  <Button asChild variant="link" className="mt-4 w-full p-0 h-auto">
                    <Link to="/budgets">Ver Todos los Presupuestos</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      <Sheet open={!!editingBudget} onOpenChange={(open) => !open && setEditingBudget(null)}>
        <SheetContent className="sm:max-w-lg w-full p-0">
          <SheetHeader className="p-6 border-b"><SheetTitle>Editar Presupuesto</SheetTitle></SheetHeader>
          {editingBudget && <BudgetForm categories={uniqueCategories} onSubmit={handleEditBudget} onFinished={() => setEditingBudget(null)} defaultValues={{...editingBudget, month: new Date(editingBudget.month)}} />}
        </SheetContent>
      </Sheet>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará el presupuesto permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteBudget}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}