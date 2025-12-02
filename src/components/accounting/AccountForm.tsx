import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Account, AccountType, Currency } from '@shared/types';
const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres.").max(50),
  type: z.enum(['cash', 'bank', 'credit_card']),
  currency: z.enum(['USD', 'EUR', 'ARS']),
  balance: z.preprocess(
    (val) => (val === '' || val === undefined ? 0 : Number(val)),
    z.number().min(0, "El saldo no puede ser negativo.").default(0)
  ),
});
type AccountFormValues = z.infer<typeof formSchema>;
interface AccountFormProps {
  onSubmit: (values: Omit<Account, 'id' | 'createdAt'>) => Promise<void>;
  onFinished: () => void;
  defaultValues?: Partial<AccountFormValues>;
  isEditing?: boolean;
}
export function AccountForm({ onSubmit, onFinished, defaultValues, isEditing = false }: AccountFormProps) {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currency: 'USD',
      balance: 0,
      ...defaultValues,
    },
  });
  const { isSubmitting } = form.formState;
  const handleSubmit: SubmitHandler<AccountFormValues> = async (values) => {
    await onSubmit(values);
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
              <FormLabel>Nombre de la Cuenta</FormLabel>
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
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="bank">Cuenta Bancaria</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
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
              <FormLabel>Moneda</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una moneda" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
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
              <FormLabel>Saldo Inicial</FormLabel>
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
            {isEditing ? 'Guardar Cambios' : 'Crear Cuenta'}
          </Button>
        </div>
      </form>
    </Form>
  );
}