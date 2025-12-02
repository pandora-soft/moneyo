import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Account, Currency } from '@shared/types';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import t from '@/lib/i18n';
const formSchema = z.object({
  name: z.string().min(2, t('form.minChars', 2)).max(50),
  type: z.enum(['cash', 'bank', 'credit_card']),
  currency: z.string().min(1, t('form.required')),
  balance: z.preprocess(
    (val: unknown) => (val === '' || val === undefined ? 0 : Number(val)),
    z.number().default(0)
  ),
}).refine((data) => {
  if (data.type === 'credit_card') return true;
  return data.balance >= 0;
}, {
  path: ['balance'],
  message: t('form.account.negativeBalanceError'),
});
type AccountFormValues = z.infer<typeof formSchema>;
interface AccountFormProps {
  onSubmit: (values: Omit<Account, 'id' | 'createdAt'>) => Promise<void>;
  onFinished: () => void;
  defaultValues?: Partial<AccountFormValues>;
  isEditing?: boolean;
}
export function AccountForm({ onSubmit, onFinished, defaultValues, isEditing = false }: AccountFormProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  useEffect(() => {
    api<Currency[]>('/api/finance/currencies')
      .then(setCurrencies)
      .catch(() => setCurrencies([
        { id: 'eur', code: 'EUR', symbol: '€', suffix: true },
        { id: 'usd', code: 'USD', symbol: '$', suffix: false },
        { id: 'ars', code: 'ARS', symbol: '$', suffix: false },
      ]));
  }, []);
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      currency: 'EUR',
      balance: 0,
      ...defaultValues,
    },
  });
  const { isSubmitting } = form.formState;
  const handleSubmit: SubmitHandler<AccountFormValues> = async (values) => {
    const payload: Omit<Account, 'id' | 'createdAt'> = {
      ...values,
      balance: values.balance ?? 0,
      currency: values.currency || 'EUR',
    };
    await onSubmit(payload);
    onFinished();
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.account.name')}</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Ahorros" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.account.type')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="bank">{t('form.account.bank')}</SelectItem>
                  <SelectItem value="cash">{t('form.account.cash')}</SelectItem>
                  <SelectItem value="credit_card">{t('form.account.credit_card')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.account.currency')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una moneda" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {currencies.map(c => <SelectItem key={c.id} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="balance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.account.initialBalance')}</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} disabled={isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? t('common.save') : t('common.createAccount')}
          </Button>
        </div>
      </form>
    </Form>
  );
}