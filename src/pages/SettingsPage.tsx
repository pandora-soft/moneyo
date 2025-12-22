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
import { validateApiKey, analyzeReceipt } from '@/lib/gemini-client';
import type { Settings, Currency, User } from '@shared/types';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import t from '@/lib/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CategoryForm } from '@/components/accounting/CategoryForm';
import { CurrencyForm } from '@/components/accounting/CurrencyForm';
import { FrequencyForm } from '@/components/accounting/FrequencyForm';
import { UserForm } from '@/components/accounting/UserForm';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
type Category = { id: string; name: string };
type Frequency = { id: string; name: string; interval: number; unit: 'days' | 'weeks' | 'months' };
type SafeUser = Omit<User, 'passwordHash'>;
const settingsSchema = z.object({
  currency: z.string().min(1, "Debe seleccionar una moneda."),
  fiscalMonthStart: z.number().int().min(1, "Mínimo 1").max(28, "Máximo 28").optional(),
  recurrentDefaultFrequency: z.string().min(1, "Debe seleccionar una frecuencia."),
  geminiApiKey: z.string().optional(),
  geminiModel: z.string().optional(),
  geminiPrompt: z.string().optional(),
});
type SettingsFormValues = z.infer<typeof settingsSchema>;
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};
export function SettingsPage() {
  const { isDark } = useTheme();
  const setSettings = useAppStore(s => s.setSettings);
  const triggerRefetch = useAppStore(s => s.triggerRefetch);
  const setStoreCurrencies = useAppStore(s => s.setCurrencies);
  const currentUser = useAppStore(s => s.settings.user);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [frequencies, setFrequencies] = useState<Frequency[]>([]);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [isCategorySheetOpen, setCategorySheetOpen] = useState(false);
  const [isCurrencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [isFrequencySheetOpen, setFrequencySheetOpen] = useState(false);
  const [isUserSheetOpen, setUserSheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [editingFrequency, setEditingFrequency] = useState<Frequency | null>(null);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deletingCurrency, setDeletingCurrency] = useState<Currency | null>(null);
  const [deletingFrequency, setDeletingFrequency] = useState<Frequency | null>(null);
  const [deletingUser, setDeletingUser] = useState<SafeUser | null>(null);
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      geminiApiKey: localStorage.getItem('gemini_api_key') || '',
      geminiModel: localStorage.getItem('gemini_model') || 'gemini-1.5-flash-latest',
      geminiPrompt: localStorage.getItem('gemini_prompt') || '',
    }
  });
  const isSubmitting = form.formState.isSubmitting;
  const isDirty = form.formState.isDirty;
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, cats, currs, freqs] = await Promise.all([
        api<Settings>('/api/finance/settings'),
        api<Category[]>('/api/finance/categories'),
        api<Currency[]>('/api/finance/currencies'),
        api<Frequency[]>('/api/finance/frequencies'),
      ]);
      if (currentUser?.role === 'admin') {
        const fetchedUsers = await api<SafeUser[]>('/api/finance/users');
        setUsers(fetchedUsers);
      }
      form.reset({
        ...settingsData,
        fiscalMonthStart: settingsData.fiscalMonthStart ?? 1,
        geminiApiKey: localStorage.getItem('gemini_api_key') || '',
        geminiModel: localStorage.getItem('gemini_model') || 'gemini-1.5-flash-latest',
        geminiPrompt: localStorage.getItem('gemini_prompt') || '',
      });
      setSettings(settingsData);
      setCategories(cats);
      setCurrencies(currs);
      setFrequencies(freqs);
      setStoreCurrencies(currs);
    } catch (error) {
      toast.error('No se pudieron cargar los datos de configuración.');
    } finally {
      setLoading(false);
    }
  }, [form, setSettings, setStoreCurrencies, currentUser?.role]);
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  const handleValidateApiKey = async () => {
    const key = form.getValues('geminiApiKey') || '';
    setIsVerifyingKey(true);
    await validateApiKey(key);
    setIsVerifyingKey(false);
  };
  const handleTestPrompt = async () => {
    const apiKey = form.getValues('geminiApiKey');
    if (!apiKey) {
      toast.error('Se necesita una clave API de Gemini para probar el prompt.');
      return;
    }
    setIsVerifyingKey(true);
    try {
      const mockImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD86P8Ag5T/AOT5P2cv+z8f2XP/AFsDVq/5/wD/2Q==';
      const result = await analyzeReceipt(mockImage, apiKey);
      toast.success('✅ El prompt funciona correctamente', {
        description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4"><code className="text-white">{JSON.stringify(result, null, 2)}</code></pre>,
      });
    } catch (e: any) {
      toast.error('Error al probar el prompt.', { description: e.message });
    } finally {
      setIsVerifyingKey(false);
    }
  };
  const onSubmit: SubmitHandler<SettingsFormValues> = async (data) => {
    try {
      const { geminiApiKey, geminiModel, geminiPrompt, ...settingsData } = data;
      const updatedSettings = await api<Settings>('/api/finance/settings', {
        method: 'POST',
        body: JSON.stringify(settingsData),
      });
      if (geminiApiKey) localStorage.setItem('gemini_api_key', geminiApiKey);
      else localStorage.removeItem('gemini_api_key');
      if (geminiModel) localStorage.setItem('gemini_model', geminiModel);
      else localStorage.removeItem('gemini_model');
      if (geminiPrompt) localStorage.setItem('gemini_prompt', geminiPrompt);
      else localStorage.removeItem('gemini_prompt');
      toast.success('Ajustes guardados correctamente.');
      form.reset({ ...updatedSettings, geminiApiKey, geminiModel, geminiPrompt });
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
      await fetchAllData();
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
      await fetchAllData();
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
      await fetchAllData();
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
      await fetchAllData();
      triggerRefetch();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar la moneda.');
    }
  };
  const handleFrequencySubmit = async (values: Omit<Frequency, 'id'>) => {
    try {
      if (editingFrequency) {
        await api(`/api/finance/frequencies/${editingFrequency.id}`, { method: 'PUT', body: JSON.stringify(values) });
        toast.success('Frecuencia actualizada.');
      } else {
        await api('/api/finance/frequencies', { method: 'POST', body: JSON.stringify(values) });
        toast.success('Frecuencia creada.');
      }
      setFrequencySheetOpen(false);
      setEditingFrequency(null);
      await fetchAllData();
      triggerRefetch();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar la frecuencia.');
    }
  };
  const handleFrequencyDelete = async () => {
    if (!deletingFrequency) return;
    try {
      await api(`/api/finance/frequencies/${deletingFrequency.id}`, { method: 'DELETE' });
      toast.success('Frecuencia eliminada.');
      setDeletingFrequency(null);
      await fetchAllData();
      triggerRefetch();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar la frecuencia.');
    }
  };
  const handleUserSubmit = async (values: Partial<User> & { password?: string }) => {
    try {
      if (editingUser) {
        await api(`/api/finance/users/${editingUser.id}`, { method: 'PUT', body: JSON.stringify(values) });
        toast.success('Usuario actualizado.');
      } else {
        await api('/api/finance/users', { method: 'POST', body: JSON.stringify(values) });
        toast.success('Usuario creado.');
      }
      setUserSheetOpen(false);
      setEditingUser(null);
      await fetchAllData();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar el usuario.');
    }
  };
  const handleUserDelete = async () => {
    if (!deletingUser) return;
    try {
      await api(`/api/finance/users/${deletingUser.id}`, { method: 'DELETE' });
      toast.success('Usuario eliminado.');
      setDeletingUser(null);
      await fetchAllData();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar el usuario.');
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-display font-bold">{t('pages.settings')}</h1>
          <p className="text-muted-foreground mt-1">{t('settings.description')}</p>
        </header>
        <motion.div
          className="grid gap-8 md:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="space-y-8">
            <motion.div variants={cardVariants}>
              <Card>
                <CardHeader><CardTitle>{t('settings.visual')}</CardTitle><CardDescription>{t('settings.visualDesc')}</CardDescription></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Label>{t('settings.theme')}</Label>
                    <div className="flex items-center gap-2">
                      <span>{isDark ? t('settings.themeDark') : t('settings.themeLight')}</span>
                      <ThemeToggle className="relative top-0 right-0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={cardVariants}>
              {loading ? (
                <Card><CardHeader><CardTitle>{t('settings.finances')}</CardTitle></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Card>
                      <CardHeader><CardTitle>{t('settings.finances')}</CardTitle><CardDescription>{t('settings.financesDesc')}</CardDescription></CardHeader>
                      <CardContent className="space-y-6">
                        <FormField control={form.control} name="currency" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><FormLabel>{t('finance.mainCurrency')}</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Seleccionar moneda" /></SelectTrigger></FormControl><SelectContent>{currencies.map(c => <SelectItem key={c.id} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}</SelectContent></Select></div></FormItem>)} />
                        <FormField control={form.control} name="fiscalMonthStart" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><FormLabel>{t('settings.fiscalMonthStart')}</FormLabel><Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}><FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Día del mes" /></SelectTrigger></FormControl><SelectContent>{Array.from({ length: 28 }, (_, i) => i + 1).map(day => (<SelectItem key={day} value={String(day)}>Día {day}</SelectItem>))}</SelectContent></Select></div></FormItem>)} />
                        <FormField control={form.control} name="recurrentDefaultFrequency" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><FormLabel>{t('settings.recurrentDefaultFreq')}</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Seleccionar frecuencia" /></SelectTrigger></FormControl><SelectContent>{frequencies.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}</SelectContent></Select></div></FormItem>)} />
                        <FormField control={form.control} name="geminiApiKey" render={({ field }) => (<FormItem><FormLabel>{t('settings.gemini.key')}</FormLabel><FormControl><Input type="password" placeholder="AIza..." {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="geminiModel" render={({ field }) => (<FormItem><FormLabel>{t('settings.gemini.model')}</FormLabel><FormControl><Input placeholder="gemini-1.5-flash-latest" {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="geminiPrompt" render={({ field }) => (<FormItem><FormLabel>{t('settings.gemini.prompt')}</FormLabel><FormControl><Textarea rows={6} placeholder="Analiza el recibo..." {...field} /></FormControl></FormItem>)} />
                      </CardContent>
                      <div className="flex flex-wrap justify-between items-center p-6 border-t gap-2">
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={handleValidateApiKey} disabled={isVerifyingKey || isSubmitting}>{isVerifyingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Probar Clave</Button>
                          <Button type="button" variant="outline" onClick={handleTestPrompt} disabled={isVerifyingKey || isSubmitting}>Probar Prompt</Button>
                        </div>
                        <Button type="submit" disabled={isSubmitting || !isDirty}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('common.save')}</Button>
                      </div>
                    </Card>
                  </form>
                </Form>
              )}
            </motion.div>
            <motion.div variants={cardVariants}>
              <Card>
                <CardHeader><CardTitle>{t('settings.frequencies.title')}</CardTitle><CardDescription>{t('settings.frequencies.description')}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {loading ? <Skeleton className="h-20 w-full" /> : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {frequencies.map(freq => (
                        <div key={freq.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                          <span>{freq.name} (Cada {freq.interval} {t(`common.${freq.unit}` as any)})</span>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingFrequency(freq); setFrequencySheetOpen(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingFrequency(freq)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" onClick={() => { setEditingFrequency(null); setFrequencySheetOpen(true); }} className="w-full"><Plus className="mr-2 h-4 w-4" /> {t('settings.frequencies.add')}</Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          <div className="space-y-8">
            <motion.div variants={cardVariants}>
              <Card>
                <CardHeader><CardTitle>{t('settings.categories.title')}</CardTitle><CardDescription>{t('settings.categories.description')}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {loading ? <Skeleton className="h-20 w-full" /> : (
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
                  )}
                  <Button variant="outline" onClick={() => { setEditingCategory(null); setCategorySheetOpen(true); }} className="w-full"><Plus className="mr-2 h-4 w-4" /> {t('settings.categories.add')}</Button>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={cardVariants}>
              <Card>
                <CardHeader><CardTitle>{t('settings.currencies.title')}</CardTitle><CardDescription>{t('settings.currencies.description')}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {loading ? <Skeleton className="h-20 w-full" /> : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {currencies.map(cur => (
                        <div key={cur.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                          <div><span className="font-medium">{cur.code}</span><span className="ml-2 text-sm text-muted-foreground">({cur.symbol})</span><Badge variant={cur.suffix ? 'secondary' : 'outline'} className="ml-2">{cur.suffix ? t('settings.currencies.suffix') : t('settings.currencies.prefix')}</Badge></div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCurrency(cur); setCurrencySheetOpen(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingCurrency(cur)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" onClick={() => { setEditingCurrency(null); setCurrencySheetOpen(true); }} className="w-full"><Plus className="mr-2 h-4 w-4" /> {t('settings.currencies.add')}</Button>
                </CardContent>
              </Card>
            </motion.div>
            {currentUser?.role === 'admin' && (
              <motion.div variants={cardVariants}>
                <Card>
                  <CardHeader><CardTitle>{t('settings.users.title')}</CardTitle><CardDescription>{t('settings.users.description')}</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    {loading ? <Skeleton className="h-20 w-full" /> : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {users.map(user => (
                          <div key={user.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                            <div><span className="font-medium">{user.username}</span><Badge variant="outline" className="ml-2">{user.role}</Badge></div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingUser(user); setUserSheetOpen(true); }}><Edit className="h-4 w-4" /></Button>
                              {user.id !== currentUser.id && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingUser(user)}><Trash2 className="h-4 w-4" /></Button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button variant="outline" onClick={() => { setEditingUser(null); setUserSheetOpen(true); }} className="w-full"><Plus className="mr-2 h-4 w-4" /> {t('settings.users.add')}</Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
      <Sheet open={isCategorySheetOpen} onOpenChange={setCategorySheetOpen}>
        <SheetContent><SheetHeader className="p-6 border-b"><SheetTitle>{editingCategory ? t('settings.categories.edit') : t('settings.categories.add')}</SheetTitle></SheetHeader><CategoryForm onSubmit={handleCategorySubmit} defaultValues={editingCategory ? { name: editingCategory.name } : {}} /></SheetContent>
      </Sheet>
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('settings.categories.delete')}</AlertDialogTitle><AlertDialogDescription>{t('settings.categories.confirmDelete', deletingCategory?.name || '')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleCategoryDelete}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <Sheet open={isCurrencySheetOpen} onOpenChange={setCurrencySheetOpen}>
        <SheetContent><SheetHeader className="p-6 border-b"><SheetTitle>{editingCurrency ? t('settings.currencies.edit') : t('settings.currencies.add')}</SheetTitle></SheetHeader><CurrencyForm onSubmit={handleCurrencySubmit} defaultValues={editingCurrency || {}} /></SheetContent>
      </Sheet>
      <AlertDialog open={!!deletingCurrency} onOpenChange={() => setDeletingCurrency(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('settings.currencies.delete')}</AlertDialogTitle><AlertDialogDescription>{t('settings.currencies.confirmDelete', deletingCurrency?.code || '')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleCurrencyDelete}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <Sheet open={isFrequencySheetOpen} onOpenChange={setFrequencySheetOpen}>
        <SheetContent><SheetHeader className="p-6 border-b"><SheetTitle>{editingFrequency ? t('settings.frequencies.edit') : t('settings.frequencies.add')}</SheetTitle></SheetHeader><FrequencyForm onSubmit={handleFrequencySubmit} defaultValues={editingFrequency || {}} /></SheetContent>
      </Sheet>
      <AlertDialog open={!!deletingFrequency} onOpenChange={() => setDeletingFrequency(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('settings.frequencies.delete')}</AlertDialogTitle><AlertDialogDescription>{t('settings.frequencies.confirmDelete', deletingFrequency?.name || '')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleFrequencyDelete}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <Sheet open={isUserSheetOpen} onOpenChange={setUserSheetOpen}>
        <SheetContent><SheetHeader className="p-6 border-b"><SheetTitle>{editingUser ? t('settings.users.sheet.titleEdit') : t('settings.users.sheet.titleNew')}</SheetTitle></SheetHeader><UserForm onSubmit={handleUserSubmit} defaultValues={editingUser || {}} isEditing={!!editingUser} /></SheetContent>
      </Sheet>
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('settings.users.delete')}</AlertDialogTitle><AlertDialogDescription>{t('settings.users.confirmDelete', deletingUser?.username || '')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleUserDelete}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}