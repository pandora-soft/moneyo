import React, { useEffect, useState, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, Variants } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api-client';
import { validateApiKey, testPrompt } from '@/lib/gemini-client';
import type { Settings, Currency, User } from '@shared/types';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2, BrainCircuit, Wallet, Repeat, Tags, Users } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useTranslations } from '@/lib/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CategoryForm } from '@/components/accounting/CategoryForm';
import { CurrencyForm } from '@/components/accounting/CurrencyForm';
import { FrequencyForm } from '@/components/accounting/FrequencyForm';
import { UserForm } from '@/components/accounting/UserForm';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
type Category = { id: string; name: string };
type Frequency = { id: string; name: string; interval: number; unit: 'days' | 'weeks' | 'months' };
type SafeUser = Omit<User, 'passwordHash'>;
const settingsSchema = z.object({
  currency: z.string().min(1),
  fiscalMonthStart: z.number().int().min(1).max(28),
  recurrentDefaultFrequency: z.string().min(1),
  geminiApiKey: z.string().optional(),
  geminiModel: z.string().optional(),
  geminiPrompt: z.string().optional(),
});
type SettingsFormValues = z.infer<typeof settingsSchema>;
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};
export function SettingsPage() {
  const { isDark } = useTheme();
  const t = useTranslations();
  const setSettings = useAppStore(s => s.setSettings);
  const triggerRefetch = useAppStore(s => s.triggerRefetch);
  const userRole = useAppStore(s => s.settings?.user?.role);
  const currentUserId = useAppStore(s => s.settings?.user?.id);
  const [loading, setLoading] = useState(true);
  const [testingKey, setTestingKey] = useState(false);
  const [testingPrompt, setTestingPrompt] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [frequencies, setFrequencies] = useState<Frequency[]>([]);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [mgmtSheet, setMgmtSheet] = useState<{ type: 'category' | 'currency' | 'frequency' | 'user' | null, open: boolean, data: any }>({ type: null, open: false, data: null });
  const [deleteAlert, setDeleteAlert] = useState<{ type: 'category' | 'currency' | 'frequency' | 'user' | null, open: boolean, id: string, name: string }>({ type: null, open: false, id: '', name: '' });
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
  });
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, cats, currs, freqs] = await Promise.all([
        api<Settings>('/api/finance/settings'),
        api<Category[]>('/api/finance/categories'),
        api<Currency[]>('/api/finance/currencies'),
        api<Frequency[]>('/api/finance/frequencies'),
      ]);
      if (userRole === 'admin') {
        const fetchedUsers = await api<SafeUser[]>('/api/finance/users');
        setUsers(fetchedUsers);
      }
      form.reset({
        ...settingsData,
        geminiApiKey: localStorage.getItem('gemini_api_key') || '',
        geminiModel: localStorage.getItem('gemini_model') || 'gemini-1.5-flash',
        geminiPrompt: localStorage.getItem('gemini_prompt') || '',
      });
      setSettings(settingsData);
      setCategories(cats);
      setCurrencies(currs);
      setFrequencies(freqs);
    } catch (error) {
      toast.error('Error al cargar ajustes');
    } finally {
      setLoading(false);
    }
  }, [form, setSettings, userRole]);
  useEffect(() => { fetchAllData(); }, [fetchAllData]);
  const onSaveSettings: SubmitHandler<SettingsFormValues> = async (data) => {
    try {
      const { geminiApiKey, geminiModel, geminiPrompt, ...rest } = data;
      await api('/api/finance/settings', { method: 'POST', body: JSON.stringify(rest) });
      localStorage.setItem('gemini_api_key', geminiApiKey || '');
      localStorage.setItem('gemini_model', geminiModel || 'gemini-1.5-flash');
      localStorage.setItem('gemini_prompt', geminiPrompt || '');
      toast.success('Ajustes guardados');
      setSettings(rest);
      triggerRefetch();
    } catch (e) {
      toast.error('Error al guardar ajustes');
    }
  };
  const handleTestKey = async () => {
    const key = form.getValues('geminiApiKey');
    if (!key) return toast.error('API Key requerida');
    setTestingKey(true);
    const valid = await validateApiKey(key);
    setTestingKey(false);
    if (valid) toast.success('API Key válida');
  };
  const handleTestPrompt = async () => {
    const key = form.getValues('geminiApiKey');
    const model = form.getValues('geminiModel');
    const prompt = form.getValues('geminiPrompt');
    if (!key) return toast.error('API Key requerida');
    setTestingPrompt(true);
    try {
      const result = await testPrompt(key, model || 'gemini-1.5-flash', prompt || '');
      toast.info(`Prueba exitosa: ${result.merchant} - ${result.amount}`);
    } catch (e) {
      toast.error('Error en prueba de IA');
    } finally {
      setTestingPrompt(false);
    }
  };
  const handleDelete = async () => {
    const { type, id } = deleteAlert;
    if (!type || !id) return;
    try {
      await api(`/api/finance/${type === 'category' ? 'categories' : type + 's'}/${id}`, { method: 'DELETE' });
      toast.success('Eliminado correctamente');
      fetchAllData();
      triggerRefetch();
    } catch (e) {
      toast.error('Error al eliminar');
    } finally {
      setDeleteAlert({ type: null, open: false, id: '', name: '' });
    }
  };
  const handleMgmtSubmit = async (values: any) => {
    const { type, data } = mgmtSheet;
    try {
      const method = data?.id ? 'PUT' : 'POST';
      const endpoint = `/api/finance/${type === 'category' ? 'categories' : type + 's'}${data?.id ? `/${data.id}` : ''}`;
      await api(endpoint, { method, body: JSON.stringify(values) });
      toast.success('Guardado correctamente');
      setMgmtSheet({ ...mgmtSheet, open: false });
      fetchAllData();
      triggerRefetch();
    } catch (e) {
      toast.error('Error al guardar');
    }
  };
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-display font-bold">{t('pages.settings')}</h1>
          <p className="text-muted-foreground mt-1">Configura tus preferencias de la aplicación.</p>
        </header>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSaveSettings)} className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
              <motion.div variants={cardVariants} initial="hidden" animate="visible">
                <Card className="h-full">
                  <CardHeader><CardTitle>Apariencia</CardTitle><CardDescription>Personaliza la interfaz.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                      <Label>Tema Visual</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{isDark ? 'Oscuro' : 'Claro'}</span>
                        <ThemeToggle className="relative top-0 right-0" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
                <Card className="h-full">
                  <CardHeader><CardTitle>Finanzas</CardTitle><CardDescription>Configuración global de moneda.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="currency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moneda Principal</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{currencies.map(c => <SelectItem key={c.id} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="fiscalMonthStart" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Día de inicio fiscal</FormLabel>
                        <FormControl><Input type="number" min={1} max={28} {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }} className="md:col-span-2">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="size-5 text-orange-500" /> AI & Gemini IA</CardTitle><CardDescription>Digitaliza tus recibos.</CardDescription></CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <FormField control={form.control} name="geminiApiKey" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clave API Gemini</FormLabel>
                          <div className="flex gap-2">
                            <FormControl><Input type="password" placeholder="AIza..." {...field} /></FormControl>
                            <Button type="button" variant="outline" onClick={handleTestKey} disabled={testingKey}>{testingKey ? <Loader2 className="animate-spin size-4" /> : 'Probar clave'}</Button>
                          </div>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="geminiModel" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modelo AI</FormLabel>
                          <FormControl><Input placeholder="gemini-1.5-flash" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <div className="space-y-4">
                      <FormField control={form.control} name="geminiPrompt" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instrucciones IA (Prompt)</FormLabel>
                          <FormControl><Textarea className="min-h-[120px]" placeholder="Instrucciones adicionales..." {...field} /></FormControl>
                          <div className="flex justify-end mt-2">
                            <Button type="button" variant="ghost" size="sm" onClick={handleTestPrompt} disabled={testingPrompt}>{testingPrompt ? <Loader2 className="animate-spin size-4" /> : 'Probar Prompt'}</Button>
                          </div>
                        </FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
            <div className="flex justify-end pb-8 border-b">
              <Button type="submit" size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">Guardar</Button>
            </div>
          </form>
        </Form>
        {userRole === 'admin' && (
          <div className="mt-12 space-y-12">
            <header>
              <h2 className="text-2xl font-display font-bold">Gestión de Sistema</h2>
              <p className="text-muted-foreground">Administración de usuarios y catálogos.</p>
            </header>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2"><Tags className="size-4" /> Categorías</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setMgmtSheet({ type: 'category', open: true, data: null })}><Plus className="size-4" /></Button>
                </CardHeader>
                <CardContent className="max-h-48 overflow-y-auto space-y-2">
                  {categories.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm group">
                      <span>{c.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="size-6" onClick={() => setMgmtSheet({ type: 'category', open: true, data: c })}><Edit className="size-3" /></Button>
                        <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => setDeleteAlert({ type: 'category', open: true, id: c.id, name: c.name })}><Trash2 className="size-3" /></Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2"><Wallet className="size-4" /> Monedas</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setMgmtSheet({ type: 'currency', open: true, data: null })}><Plus className="size-4" /></Button>
                </CardHeader>
                <CardContent className="max-h-48 overflow-y-auto space-y-2">
                  {currencies.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm group">
                      <span>{c.code} ({c.symbol})</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="size-6" onClick={() => setMgmtSheet({ type: 'currency', open: true, data: c })}><Edit className="size-3" /></Button>
                        <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => setDeleteAlert({ type: 'currency', open: true, id: c.id, name: c.code })}><Trash2 className="size-3" /></Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2"><Repeat className="size-4" /> Frecuencias</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setMgmtSheet({ type: 'frequency', open: true, data: null })}><Plus className="size-4" /></Button>
                </CardHeader>
                <CardContent className="max-h-48 overflow-y-auto space-y-2">
                  {frequencies.map(f => (
                    <div key={f.id} className="flex items-center justify-between text-sm group">
                      <span>{f.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="size-6" onClick={() => setMgmtSheet({ type: 'frequency', open: true, data: f })}><Edit className="size-3" /></Button>
                        <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => setDeleteAlert({ type: 'frequency', open: true, id: f.id, name: f.name })}><Trash2 className="size-3" /></Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="size-4" /> Usuarios</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setMgmtSheet({ type: 'user', open: true, data: null })}><Plus className="size-4" /></Button>
                </CardHeader>
                <CardContent className="max-h-48 overflow-y-auto space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center justify-between text-sm group">
                      <div className="flex flex-col">
                        <span>{u.username}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{u.role}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="size-6" onClick={() => setMgmtSheet({ type: 'user', open: true, data: u })}><Edit className="size-3" /></Button>
                        <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => setDeleteAlert({ type: 'user', open: true, id: u.id, name: u.username })} disabled={u.id === currentUserId}><Trash2 className="size-3" /></Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
      <Sheet open={mgmtSheet.open} onOpenChange={(open) => setMgmtSheet(s => ({ ...s, open }))}>
        <SheetContent className="sm:max-w-md p-0 overflow-y-auto" aria-describedby="mgmt-sheet-desc">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>{mgmtSheet.data ? 'Editar' : 'Agregar'} {mgmtSheet.type}</SheetTitle>
            <SheetDescription id="mgmt-sheet-desc">Completa los datos para continuar.</SheetDescription>
          </SheetHeader>
          <div className="py-4">
            {mgmtSheet.type === 'category' && <CategoryForm onSubmit={handleMgmtSubmit} defaultValues={mgmtSheet.data || {}} />}
            {mgmtSheet.type === 'currency' && <CurrencyForm onSubmit={handleMgmtSubmit} defaultValues={mgmtSheet.data || {}} />}
            {mgmtSheet.type === 'frequency' && <FrequencyForm onSubmit={handleMgmtSubmit} defaultValues={mgmtSheet.data || {}} />}
            {mgmtSheet.type === 'user' && <UserForm onSubmit={handleMgmtSubmit} defaultValues={mgmtSheet.data || {}} isEditing={!!mgmtSheet.data} />}
          </div>
        </SheetContent>
      </Sheet>
      <AlertDialog open={deleteAlert.open} onOpenChange={(open) => setDeleteAlert(s => ({ ...s, open }))}>
        <AlertDialogContent aria-describedby="delete-alert-desc">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription id="delete-alert-desc">¿Eliminar a {deleteAlert.name}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}