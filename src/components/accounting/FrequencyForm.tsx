import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import t from '@/lib/i18n';
type Frequency = { id: string; name: string; interval: number; unit: 'days' | 'weeks' | 'months' };
const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(50, 'Máximo 50 caracteres'),
  interval: z.coerce.number({ invalid_type_error: "Debe ser un número" }).int().min(1, 'Mínimo 1').max(365, 'Máximo 365'),
  unit: z.enum(['days', 'weeks', 'months']),
});
type FormValues = z.infer<typeof schema>;
interface Props {
  onSubmit: (values: Omit<Frequency, 'id'>) => Promise<void>;
  defaultValues?: Partial<FormValues>;
}
export function FrequencyForm({ onSubmit, defaultValues }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name || '',
      interval: defaultValues?.interval || 1,
      unit: defaultValues?.unit || 'weeks',
    },
  });
  const { isSubmitting } = form.formState;
  const handleSubmit: SubmitHandler<FormValues> = async (values) => {
    await onSubmit(values);
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.frequencies.name')}</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Quincenal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="interval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.frequencies.interval')}</FormLabel>
              <FormControl>
                <Input type="number" placeholder="15" {...field} step="1" min="1" max="365" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.frequencies.unit')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una unidad" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="days">Días</SelectItem>
                  <SelectItem value="weeks">Semanas</SelectItem>
                  <SelectItem value="months">Meses</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues?.name ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Form>
  );
}