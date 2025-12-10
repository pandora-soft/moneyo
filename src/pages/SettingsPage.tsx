import { useEffect, useState, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, Variants } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api-client';
import type { Settings, Currency } from '@shared/types';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import t from '@/lib/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CategoryForm } from '@/components/accounting/CategoryForm';
import { CurrencyForm } from '@/components/accounting/CurrencyForm';
import { Badge } from '@/components/ui/badge';
type Category = { id: string; name: string };
const settingsSchema = z.object({
  currency: z.string().min(1, "Debe seleccionar una moneda."),
  fiscalMonthStart: z.preprocess(
    (val: unknown) => Number(val),
    z.number().int().min(1, "Mínimo 1").max(28, "Máximo 28")
  ),
  recurrentDefaultFrequency: z.enum(['monthly', 'weekly']),
});
type SettingsFormValues = z.infer<typeof settingsSchema>;
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
export function SettingsPage() {
  const { isDark } = useTheme();
  const { setCurrency, setSettings, triggerRefetch, setCurrencies: setStoreCurrencies } = useAppStore.getState();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as any,
  });
  const { isSubmitting, isDirty } = form.formState;
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isCategorySheetOpen, setCategorySheetOpen] = useState(false);
  const [isCurrencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deletingCurrency, setDeletingCurrency] = useState<Currency | null>(null);
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, cats, currs] = await Promise.all([
        api<Settings>('/api/finance/settings'),
        api<Category[]>('/api/finance/categories'),
        api<Currency[]>('/api/finance/currencies'),
      ]);
      form.reset(settings);
      setSettings(settings);
      setCategories(cats);
      setCurrencies(currs);
      setStoreCurrencies(currs);
    } catch (error) {
      toast.error('No se pudieron cargar los datos de configuración.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [form, setSettings, setStoreCurrencies]);
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  const onSubmit: SubmitHandler<SettingsFormValues> = async (data) => {
    try {
      const updatedSettings = await api<Settings>('/api/finance/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      toast.success('Ajustes guardados correctamente.');
      form.reset(updatedSettings);
      setCurrency(updatedSettings.currency);
      setSettings(updatedSettings);
      triggerRefetch();
    } catch (error) {
      toast.error('Error al guardar los ajustes.');
    }
  };
  const handleCategorySubmit = async (values: { name: string }) => {
    try {
      if (editingCategory) {
        await api(`/api/finance/categories/${editingCategory.id}`, { method: 'PUT', body: JSON.stringify(values) });
        toast.success('Categoría actualizada.');
      } else {
        await api('/api/finance/categories', { method: 'POST', body: JSON.stringify(values) });
        toast.success('Categoría creada.');
      }
      setCategorySheetOpen(false);
      setEditingCategory(null);
      fetchAllData();
      triggerRefetch();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar la categoría.');
    }
  };
  const handleCategoryDelete = async () => {
    if (!deletingCategory) return;
    try {
      await api(`/api/finance/categories/${deletingCategory.id}`, { method: 'DELETE' });
      toast.success('Categoría eliminada.');
      setDeletingCategory(null);
      fetchAllData();
      triggerRefetch();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar la categoría.');
    }
  };
  const handleCurrencySubmit = async (values: { code: string; symbol: string; suffix: boolean }) => {
    try {
      if (editingCurrency) {
        await api(`/api/finance/currencies/${editingCurrency.id}`, { method: 'PUT', body: JSON.stringify(values) });
        toast.success('Moneda actualizada.');
      } else {
        await api('/api/finance/currencies', { method: 'POST', body: JSON.stringify(values) });
        toast.success('Moneda creada.');
      }
      setCurrencySheetOpen(false);
      setEditingCurrency(null);
      fetchAllData();
      triggerRefetch();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar la moneda.');
    }
  };
  const handleCurrencyDelete = async () => {
    if (!deletingCurrency) return;
    try {
      await api(`/api/finance/currencies/${deletingCurrency.id}`, { method: 'DELETE' });
      toast.success('Moneda eliminada.');
      setDeletingCurrency(null);
      fetchAllData();
      triggerRefetch();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar la moneda.');
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-display font-bold">{t('pages.settings')}</h1>
          <p className="text-muted-foreground mt-1">Configura tus preferencias de la aplicación.</p>
        </header>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-8">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader><CardTitle>Visual</CardTitle><CardDescription>Personaliza la apariencia de CasaConta.</CardDescription></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Label>Tema</Label>
                    <div className="flex items-center gap-2">
                      <span>{isDark ? 'Oscuro' : 'Claro'}</span>
                      <motion.div key={isDark ? 'dark' : 'light'} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                        <ThemeToggle className="relative top-0 right-0" />
                      </motion.div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
              {loading ? (
                <Card>
                  <CardHeader><CardTitle>Finanzas</CardTitle><CardDescription>Ajustes relacionados con la moneda y fechas.</CardDescription></CardHeader>
                  <CardContent className="space-y-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent>
                  <div className="flex justify-end p-6 border-t"><Button disabled>{t('common.save')} Cambios</Button></div>
                </Card>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Card>
                      <CardHeader><CardTitle>Finanzas</CardTitle><CardDescription>Ajustes relacionados con la moneda y fechas.</CardDescription></CardHeader>
                      <CardContent className="space-y-6">
                        <FormField control={form.control} name="currency" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><FormLabel>{t('finance.mainCurrency')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Seleccionar moneda" /></SelectTrigger></FormControl><SelectContent>{currencies.map(c => <SelectItem key={c.id} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}</SelectContent></Select></div><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="fiscalMonthStart" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><FormLabel>Inicio del Mes Fiscal</FormLabel><Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}><FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Día del mes" /></SelectTrigger></FormControl><SelectContent>{Array.from({ length: 28 }, (_, i) => i + 1).map(day => (<SelectItem key={day} value={String(day)}>Día {day}</SelectItem>))}</SelectContent></Select></div><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="recurrentDefaultFrequency" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><FormLabel>Frecuencia Recurrente</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Seleccionar frecuencia" /></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Mensual</SelectItem><SelectItem value="weekly">Semanal</SelectItem></SelectContent></Select></div><FormMessage /></FormItem>)} />
                      </CardContent>
                      <div className="flex justify-end p-6 border-t">
                        <Button type="submit" disabled={isSubmitting || !isDirty}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('common.save')} Cambios
                        </Button>
                      </div>
                    </Card>
                  </form>
                </Form>
              )}
            </motion.div>
          </div>
          <div className="space-y-8">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader><CardTitle>{t('settings.categories.title')}</CardTitle><CardDescription>{t('settings.categories.description')}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {loading ? <Skeleton className="h-20 w-full" /> : categories.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                          <span>{cat.name}</span>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCategory(cat); setCategorySheetOpen(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingCategory(cat)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-muted-foreground text-sm text-center py-4">No hay categorías personalizadas.</p>}
                  <Button variant="outline" onClick={() => { setEditingCategory(null); setCategorySheetOpen(true); }} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> {t('settings.categories.add')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
              <Card>
                <CardHeader><CardTitle>{t('settings.currencies.title')}</CardTitle><CardDescription>{t('settings.currencies.description')}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {loading ? <Skeleton className="h-20 w-full" /> : currencies.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {currencies.map(cur => (
                        <div key={cur.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                          <div><span className="font-medium">{cur.code}</span><span className="ml-2 text-sm text-muted-foreground">({cur.symbol})</span><Badge variant={cur.suffix ? 'secondary' : 'outline'} className="ml-2">{cur.suffix ? 'Sufijo' : 'Prefijo'}</Badge></div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCurrency(cur); setCurrencySheetOpen(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingCurrency(cur)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-muted-foreground text-sm text-center py-4">No hay monedas personalizadas.</p>}
                  <Button variant="outline" onClick={() => { setEditingCurrency(null); setCurrencySheetOpen(true); }} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> {t('settings.currencies.add')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
      <Sheet open={isCategorySheetOpen} onOpenChange={setCategorySheetOpen}>
        <SheetContent>
          <SheetHeader className="p-6 border-b"><SheetTitle>{editingCategory ? t('settings.categories.edit') : t('settings.categories.add')}</SheetTitle><SheetDescription id="category-sheet-desc">Crea o modifica una categoría para tus transacciones.</SheetDescription></SheetHeader>
          <CategoryForm onSubmit={handleCategorySubmit} defaultValues={editingCategory ? { name: editingCategory.name } : {}} />
        </SheetContent>
      </Sheet>
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Eliminar Categoría</AlertDialogTitle><AlertDialogDescription>¿Estás seguro de que quieres eliminar la categoría '{deletingCategory?.name}'? Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleCategoryDelete}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Sheet open={isCurrencySheetOpen} onOpenChange={setCurrencySheetOpen}>
        <SheetContent>
          <SheetHeader className="p-6 border-b"><SheetTitle>{editingCurrency ? t('settings.currencies.edit') : t('settings.currencies.add')}</SheetTitle><SheetDescription id="currency-sheet-desc">Define una nueva moneda para usar en tus cuentas.</SheetDescription></SheetHeader>
          <CurrencyForm onSubmit={handleCurrencySubmit} defaultValues={editingCurrency || {}} />
        </SheetContent>
      </Sheet>
      <AlertDialog open={!!deletingCurrency} onOpenChange={() => setDeletingCurrency(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Eliminar Moneda</AlertDialogTitle><AlertDialogDescription>¿Estás seguro de que quieres eliminar la moneda '{deletingCurrency?.code}'? Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleCurrencyDelete}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}