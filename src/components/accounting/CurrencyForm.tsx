import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import t from '@/lib/i18n';
const schema = z.object({
  code: z.string().min(3, t('form.minChars', 3)).max(5, t('form.maxChars', 5)).transform(v => v.toUpperCase()),
  symbol: z.string().min(1, t('form.required')).max(5, t('form.maxChars', 5)),
  suffix: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;
interface Props {
  onSubmit: (values: FormValues) => Promise<void>;
  defaultValues?: Partial<FormValues>;
}
export function CurrencyForm({ onSubmit, defaultValues }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: defaultValues?.code || '',
      symbol: defaultValues?.symbol || '',
      suffix: defaultValues?.suffix ?? false,
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
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.currencies.code')}</FormLabel>
              <FormControl>
                <Input placeholder="USD" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.currencies.symbol')}</FormLabel>
              <FormControl>
                <Input placeholder="$" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="suffix"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>{t('settings.currencies.suffix')}</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues?.code ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </form>
    </Form>
  );
}