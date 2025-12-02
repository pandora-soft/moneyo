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
  name: z.string().min(2, t('form.minChars', 2)).max(50, t('form.maxChars', 50)),
  interval: z.number().int().min(1, 'Mínimo 1').max(365, 'Máximo 365').optional(),
  unit: z.enum(['days', 'weeks', 'months']).optional(),
});
type FormValues = z.infer<typeof schema>;
interface Props {
  onSubmit: (values: Omit<Frequency, 'id'>) => Promise<void>;
  defaultValues?: Partial<FormValues>;
}
export function FrequencyForm({ onSubmit, defaultValues }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: defaultValues?.name || '',
      interval: defaultValues?.interval ?? 1,
      unit: defaultValues?.unit ?? 'weeks',
    },
  });
  const { isSubmitting } = form.formState;
  const handleSubmit: SubmitHandler<FormValues> = async (values) => {
    const payload: Omit<Frequency, 'id'> = {
      name: values.name.trim(),
      interval: values.interval ?? 1,
      unit: values.unit ?? 'weeks',
    };
    await onSubmit(payload);
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
                <Input
                  type="number"
                  placeholder="15"
                  {...field}
                  onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                />
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
              <Select onValueChange={field.onChange} value={field.value || 'weeks'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una unidad" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="days">{t('common.days')}</SelectItem>
                  <SelectItem value="weeks">{t('common.weeks')}</SelectItem>
                  <SelectItem value="months">{t('common.months')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={!form.formState.isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues?.name ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </form>
    </Form>
  );
}