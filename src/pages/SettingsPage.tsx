import { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api-client';
import type { Settings, Currency } from '@shared/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
const settingsSchema = z.object({
  currency: z.enum(['USD', 'EUR', 'ARS']),
  fiscalMonthStart: z.coerce.number().int().min(1).max(28),
});
type SettingsFormValues = z.infer<typeof settingsSchema>;
export function SettingsPage() {
  const { isDark } = useTheme();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
  });
  const { isSubmitting, isDirty } = form.formState;
  useEffect(() => {
    async function fetchSettings() {
      try {
        const settings = await api<Settings>('/api/finance/settings');
        form.reset(settings);
      } catch (error) {
        toast.error('No se pudieron cargar los ajustes.');
        console.error(error);
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
          <Card>
            <CardHeader>
              <CardTitle>Visual</CardTitle>
              <CardDescription>Personaliza la apariencia de CasaConta.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <FormLabel>Tema</FormLabel>
                <div className="flex items-center gap-2">
                  <span>{isDark ? 'Oscuro' : 'Claro'}</span>
                  <ThemeToggle className="relative top-0 right-0" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle>Finanzas</CardTitle>
                  <CardDescription>Ajustes relacionados con la moneda y fechas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {form.formState.isLoading ? (
                    <>
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </>
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Moneda Principal</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Seleccionar moneda" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="ARS">ARS</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fiscalMonthStart"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Inicio del Mes Fiscal</FormLabel>
                              <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                                <FormControl>
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Día del mes" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                    <SelectItem key={day} value={String(day)}>Día {day}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
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
        </div>
      </div>
    </div>
  );
}