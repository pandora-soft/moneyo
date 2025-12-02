import { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
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
import { Loader2 } from 'lucide-react';
const settingsSchema = z.object({
  currency: z.enum(['USD', 'EUR', 'ARS']),
  fiscalMonthStart: z.preprocess(
    (val: unknown) => Number(val),
    z.number().int().min(1, "Mínimo 1").max(28, "Máximo 28")
  ),
  recurrentDefaultFrequency: z.enum(['monthly', 'weekly']),
});
type SettingsFormValues = z.infer<typeof settingsSchema>;
export function SettingsPage() {
  const { isDark } = useTheme();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as any,
  });
  const { isSubmitting, isDirty } = form.formState;
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const settings = await api<Settings>('/api/finance/settings');
        form.reset(settings);
      } catch (error) {
        toast.error('No se pudieron cargar los ajustes.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [form]);
  const onSubmit: SubmitHandler<SettingsFormValues> = async (data) => {
    try {
      await api<Settings>('/api/finance/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      toast.success('Ajustes guardados correctamente.');
      form.reset(data);
    } catch (error) {
      toast.error('Error al guardar los ajustes.');
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-display font-bold">Ajustes</h1>
          <p className="text-muted-foreground mt-1">Configura tus preferencias de la aplicación.</p>
        </header>
        <div className="max-w-2xl mx-auto space-y-8">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader><CardTitle>Visual</CardTitle><CardDescription>Personaliza la apariencia de CasaConta.</CardDescription></CardHeader>
              <CardContent><div className="flex items-center justify-between"><Label>Tema</Label><div className="flex items-center gap-2"><span>{isDark ? 'Oscuro' : 'Claro'}</span><ThemeToggle className="relative top-0 right-0" /></div></div></CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            {loading ? (
              <Card>
                <CardHeader><CardTitle>Finanzas</CardTitle><CardDescription>Ajustes relacionados con la moneda y fechas.</CardDescription></CardHeader>
                <CardContent className="space-y-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent>
                <div className="flex justify-end p-6 border-t"><Button disabled>Guardar Cambios</Button></div>
              </Card>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <Card>
                    <CardHeader><CardTitle>Finanzas</CardTitle><CardDescription>Ajustes relacionados con la moneda y fechas.</CardDescription></CardHeader>
                    <CardContent className="space-y-6">
                      <FormField control={form.control} name="currency" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><FormLabel>Moneda Principal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Seleccionar moneda" /></SelectTrigger></FormControl><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="ARS">ARS</SelectItem></SelectContent></Select></div><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="fiscalMonthStart" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><FormLabel>Inicio del Mes Fiscal</FormLabel><Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}><FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Día del mes" /></SelectTrigger></FormControl><SelectContent>{Array.from({ length: 28 }, (_, i) => i + 1).map(day => (<SelectItem key={day} value={String(day)}>Día {day}</SelectItem>))}</SelectContent></Select></div><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="recurrentDefaultFrequency" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><FormLabel>Frecuencia Recurrente</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Seleccionar frecuencia" /></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Mensual</SelectItem><SelectItem value="weekly">Semanal</SelectItem></SelectContent></Select></div><FormMessage /></FormItem>)} />
                    </CardContent>
                    <div className="flex justify-end p-6 border-t">
                      <Button type="submit" disabled={isSubmitting || !isDirty}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                      </Button>
                    </div>
                  </Card>
                </form>
              </Form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}