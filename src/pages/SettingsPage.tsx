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
import { validateApiKey } from '@/lib/gemini-client';
import type { Settings, Currency, User } from '@shared/types';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import t from '@/lib/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  const setSettings = useAppStore(s => s.setSettings);
  const triggerRefetch = useAppStore(s => s.triggerRefetch);
  const currentUser = useAppStore(s => s.settings.user);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [frequencies, setFrequencies] = useState<Frequency[]>([]);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [isCategorySheetOpen, setCategorySheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      geminiModel: localStorage.getItem('gemini_model') || 'gemini-2.5-flash-image',
    }
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
      if (currentUser?.role === 'admin') {
        const fetchedUsers = await api<SafeUser[]>('/api/finance/users');
        setUsers(fetchedUsers);
      }
      form.reset({
        ...settingsData,
        geminiApiKey: localStorage.getItem('gemini_api_key') || '',
        geminiModel: localStorage.getItem('gemini_model') || 'gemini-2.5-flash-image',
        geminiPrompt: localStorage.getItem('gemini_prompt') || '',
      });
      setSettings(settingsData);
      setCategories(cats);
      setCurrencies(currs);
      setFrequencies(freqs);
    } catch (error) {
      toast.error('Error cargando ajustes.');
    } finally {
      setLoading(false);
    }
  }, [form, setSettings, currentUser?.role]);
  useEffect(() => { fetchAllData(); }, [fetchAllData]);
  const onSubmit: SubmitHandler<SettingsFormValues> = async (data) => {
    try {
      const { geminiApiKey, geminiModel, geminiPrompt, ...rest } = data;
      await api('/api/finance/settings', { method: 'POST', body: JSON.stringify(rest) });
      localStorage.setItem('gemini_api_key', geminiApiKey || '');
      localStorage.setItem('gemini_model', geminiModel || 'gemini-2.5-flash-image');
      localStorage.setItem('gemini_prompt', geminiPrompt || '');
      toast.success('Ajustes guardados.');
      setSettings(rest);
      triggerRefetch();
    } catch (e) {
      toast.error('Error al guardar.');
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-display font-bold">Ajustes</h1>
          <p className="text-muted-foreground">Personaliza tu experiencia financiera.</p>
        </header>
        <motion.div initial="hidden" animate="visible" className="grid gap-8 md:grid-cols-2">
          <motion.div variants={cardVariants}>
            <Card>
              <CardHeader><CardTitle>Apariencia</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <Label>Modo {isDark ? 'Oscuro' : 'Claro'}</Label>
                <ThemeToggle className="relative top-0 right-0" />
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={cardVariants}>
            {loading ? <Skeleton className="h-64" /> : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <Card>
                    <CardHeader><CardTitle>IA & Gemini</CardTitle><CardDescription>Modelo y configuración de análisis.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="geminiApiKey" render={({ field }) => (<FormItem><FormLabel>API Key</FormLabel><Input type="password" {...field} /></FormItem>)} />
                      <FormField control={form.control} name="geminiModel" render={({ field }) => (<FormItem><FormLabel>Modelo</FormLabel><Input {...field} /></FormItem>)} />
                    </CardContent>
                    <CardContent className="border-t pt-4">
                      <Button type="submit" className="w-full">Guardar Ajustes</Button>
                    </CardContent>
                  </Card>
                </form>
              </Form>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}