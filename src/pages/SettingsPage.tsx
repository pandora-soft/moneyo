import { useEffect, useState } from 'react';
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
import type { Settings } from '@shared/types';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import t from '@/lib/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CategoryForm } from '@/components/accounting/CategoryForm';
type Category = { id: string; name: string };
const settingsSchema = z.object({
  currency: z.enum(['USD', 'EUR', 'ARS']),
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
  const { setCurrency, setSettings, triggerRefetch } = useAppStore.getState();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as any,
  });
  const { isSubmitting, isDirty } = form.formState;
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategorySheetOpen, setCategorySheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const fetchSettingsAndCategories = async () => {
    setLoading(true);
    try {
      const [settings, cats] = await Promise.all([
        api<Settings>('/api/finance/settings'),
        api<Category[]>('/api/finance/categories'),
      ]);
      form.reset(settings);
      setSettings(settings);
      setCategories(cats);
    } catch (error) {
      toast.error('No se pudieron cargar los datos de configuración.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchSettingsAndCategories();
  }, [form, setSettings]);
  const onSubmit: SubmitHandler<SettingsFormValues> = async (data) => {
    try {
      const updatedSettings = await api<Settings>('/api/finance/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      toast.success('Ajustes guardados correctamente.');
      if (form.getValues('currency') !== updatedSettings.currency) {
        toast.info('Moneda actualizada - actualizando vistas.');
      }
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
      const updatedCats = await api<Category[]>('/api/finance/categories');
      setCategories(updatedCats);
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
      const updatedCats = await api<Category[]>('/api/finance/categories');
      setCategories(updatedCats);
      triggerRefetch();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar la categoría.');
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-display font-bold">{t('pages.settings')}</h1>
          <p className="text-muted-foreground mt-1">Configura tus preferencias de la aplicación.</p>
        </header>
        <div className="max-w-2xl mx-auto space-y-8">
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
                      <FormField control={form.control} name="currency" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><FormLabel>{t('finance.mainCurrency')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Seleccionar moneda" /></SelectTrigger></FormControl><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="ARS">ARS</SelectItem></SelectContent></Select></div><FormMessage /></FormItem>)} />
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
          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader><CardTitle>{t('settings.categories.title')}</CardTitle><CardDescription>{t('settings.categories.description')}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {loading ? <Skeleton className="h-20 w-full" /> : categories.length > 0 ? (
                  <div className="space-y-2">
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
        </div>
      </div>
      <Sheet open={isCategorySheetOpen} onOpenChange={setCategorySheetOpen}>
        <SheetContent>
          <SheetHeader className="p-6 border-b"><SheetTitle>{editingCategory ? t('settings.categories.edit') : t('settings.categories.add')}</SheetTitle></SheetHeader>
          <CategoryForm onSubmit={handleCategorySubmit} defaultValues={editingCategory ? { name: editingCategory.name } : {}} />
        </SheetContent>
      </Sheet>
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Eliminar Categoría</AlertDialogTitle><AlertDialogDescription>¿Estás seguro de que quieres eliminar la categoría '{deletingCategory?.name}'? Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleCategoryDelete}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}