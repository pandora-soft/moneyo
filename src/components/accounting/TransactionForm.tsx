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
import { useEffect } from 'react';
const formSchema = z.object({
  id: z.string().optional(),
  accountId: z.string().min(1, "Debe seleccionar una cuenta de origen."),
  accountToId: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.preprocess(
    (val: unknown) => {
      if (val === null || val === undefined) return 0;
      const strVal = String(val).trim();
      if (strVal === '') return 0;
      return Math.abs(Number(strVal));
    },
    z.number().positive("El monto debe ser positivo.")
  ),
  category: z.string().min(2, "La categoría es requerida.").max(50),
  ts: z.date(),
  note: z.string().max(100).optional(),
  recurrent: z.boolean().default(false),
  frequency: z.enum(['monthly', 'weekly']).optional(),
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
  onSubmit: (values: Omit<Transaction, 'currency'> & { id?: string }) => Promise<void>;
  onFinished: () => void;
  defaultValues?: Partial<TransactionFormValues>;
}
export function TransactionForm({ accounts, onSubmit, onFinished, defaultValues }: TransactionFormProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      type: 'expense',
      ts: new Date(),
      amount: 0,
      recurrent: false,
      ...defaultValues,
    }
  });
  const { isSubmitting } = form.formState;
  const transactionType = form.watch('type');
  const isRecurrent = form.watch('recurrent');
  useEffect(() => {
    if (transactionType === 'transfer') {
      form.setValue('category', 'Transferencia');
      form.setValue('recurrent', false);
    } else if (form.getValues('category') === 'Transferencia') {
      form.setValue('category', '');
    }
  }, [transactionType, form]);
  const handleSubmit: SubmitHandler<TransactionFormValues> = async (values) => {
    const finalValues: Omit<Transaction, 'currency'> & { id?: string } = {
      id: values.id,
      accountId: values.accountId,
      type: values.type,
      amount: values.amount,
      category: values.category,
      ts: values.ts.getTime(),
      note: values.note,
      accountTo: values.accountToId,
      recurrent: values.recurrent,
      frequency: values.recurrent ? values.frequency : undefined,
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <FormControl><Input placeholder="Ej: Supermercado" {...field} disabled={transactionType === 'transfer'} /></FormControl>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Seleccione una frecuencia" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="monthly">Mensual</SelectItem>
                                        <SelectItem value="weekly">Semanal</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </>
        )}
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues?.id ? 'Actualizar Transacción' : 'Guardar Transacción'}
          </Button>
        </div>
      </form>
    </Form>
  );
}