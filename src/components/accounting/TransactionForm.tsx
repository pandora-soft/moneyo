import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Account, Transaction } from '@shared/types';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api-client';
import { Combobox } from '@/components/ui/combobox';
type Frequency = { id: string; name: string; interval: number; unit: 'days' | 'weeks' | 'months' };
const formSchema = z.object({
  id: z.string().optional(),
  accountId: z.string().min(1, "Debe seleccionar una cuenta de origen."),
  accountToId: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.coerce.number().positive("El monto debe ser positivo."),
  category: z.string().min(2, "La categoría es requerida.").max(50),
  ts: z.date(),
  note: z.string().max(100).optional(),
  recurrent: z.boolean().default(false),
  frequency: z.string().optional(),
}).refine((data) => {
  if (data.type === 'transfer') {
    return !!data.accountToId && data.accountToId !== data.accountId;
  }
  return true;
}, {
  message: "Debe seleccionar una cuenta de destino diferente a la de origen.",
  path: ["accountToId"]
}).refine((data) => {
    if (data.recurrent) {
        return !!data.frequency;
    }
    return true;
}, {
    message: "Debe seleccionar una frecuencia para transacciones recurrentes.",
    path: ["frequency"],
});
type TransactionFormValues = z.infer<typeof formSchema>;
interface TransactionFormProps {
  accounts: Account[];
  onSubmit: (values: Partial<Transaction> & { id?: string }) => Promise<void>;
  onFinished: () => void;
  defaultValues?: Partial<TransactionFormValues>;
}
export function TransactionForm({ accounts, onSubmit, onFinished, defaultValues }: TransactionFormProps) {
  const settings = useAppStore((state) => state.settings);
  const refetchTrigger = useAppStore((state) => state.refetchData);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [frequencies, setFrequencies] = useState<Frequency[]>([]);
  useEffect(() => {
    api<{ id: string; name: string }[]>('/api/finance/categories')
      .then(cats => setCategories(cats.map(c => ({ value: c.name, label: c.name }))))
      .catch(() => setCategories([
        { value: 'Comida', label: 'Comida' },
        { value: 'Transporte', label: 'Transporte' },
        { value: 'Alquiler', label: 'Alquiler' },
        { value: 'Salario', label: 'Salario' },
        { value: 'Otro', label: 'Otro' },
      ]));
    api<Frequency[]>('/api/finance/frequencies')
      .then(setFrequencies)
      .catch(() => setFrequencies([
        { id: 'weekly', name: 'Semanal', interval: 1, unit: 'weeks' },
        { id: 'monthly', name: 'Mensual', interval: 1, unit: 'months' },
      ]));
  }, [refetchTrigger]);
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      type: 'expense',
      accountId: '',
      accountToId: '',
      amount: 0,
      category: '',
      ts: new Date(defaultValues?.ts || Date.now()),
      note: '',
      recurrent: false,
      frequency: settings.recurrentDefaultFrequency as 'monthly' | 'weekly' || 'monthly',
      ...defaultValues,
    }
  });
  const { isSubmitting } = form.formState;
  const transactionType = form.watch('type');
  const isRecurrent = form.watch('recurrent') ?? false;
  useEffect(() => {
    if (transactionType === 'transfer') {
      form.setValue('category', 'Transferencia');
      form.setValue('recurrent', false);
      form.setValue('frequency', undefined);
    } else if (form.getValues('category') === 'Transferencia') {
      form.setValue('category', '');
    }
  }, [transactionType, form]);
  const handleSubmit: SubmitHandler<TransactionFormValues> = async (values) => {
    const accountFound = accounts.find(a => a.id === values.accountId);
    const finalValues: Partial<Transaction> & { id?: string } = {
      id: values.id,
      accountId: values.accountId,
      type: values.type,
      amount: values.amount,
      category: values.category,
      ts: values.ts.getTime(),
      note: values.note,
      accountTo: values.accountToId,
      recurrent: values.recurrent ?? false,
      frequency: values.recurrent ? values.frequency : undefined,
      currency: accountFound?.currency,
    };
    await onSubmit(finalValues);
    onFinished();
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="expense">Gasto</SelectItem>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{transactionType === 'transfer' ? 'Cuenta de Origen' : 'Cuenta'}</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione una cuenta" /></SelectTrigger></FormControl>
                <SelectContent>
                  {accounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {transactionType === 'transfer' && (
          <FormField
            control={form.control}
            name="accountToId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuenta de Destino</FormLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccione una cuenta" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {accounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto</FormLabel>
              <FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Categoría</FormLabel>
              <Combobox
                options={categories}
                value={field.value}
                onChange={(value) => field.onChange(value || '')}
                placeholder="Seleccione o escriba una categoría..."
                disabled={transactionType === 'transfer'}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ts"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nota (Opcional)</FormLabel>
              <FormControl><Textarea placeholder="Detalles adicionales..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {transactionType !== 'transfer' && (
            <>
                <FormField
                    control={form.control}
                    name="recurrent"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Transacción Recurrente</FormLabel>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                {isRecurrent && (
                    <FormField
                        control={form.control}
                        name="frequency"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Frecuencia</FormLabel>
                                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Seleccione una frecuencia" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {frequencies.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </>
        )}
        <div className="flex justify-end pt-4 sticky bottom-0 z-10">
          <Button type="submit" variant="default" disabled={!form.formState.isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues?.id ? 'Actualizar Transacción' : 'Guardar Transacción'}
          </Button>
        </div>
      </form>
    </Form>
  );
}