import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import t from '@/lib/i18n';
const schema = z.object({
  name: z.string().min(2, t('form.minChars', 2)).max(50, t('form.maxChars', 50))
});
type FormValues = z.infer<typeof schema>;
interface Props {
  onSubmit: (values: { name: string }) => Promise<void>;
  defaultValues?: Partial<FormValues>;
}
export function CategoryForm({ onSubmit, defaultValues }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || { name: '' },
  });
  const { isSubmitting } = form.formState;
  const handleSubmit = async (values: FormValues) => {
    await onSubmit({ name: values.name.trim() });
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.categories.name')}</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Entretenimiento" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues?.name ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </form>
    </Form>
  );
}