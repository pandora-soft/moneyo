import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Account, Budget } from '@shared/types';
const formSchema = z.object({
  accountId: z.string().min(1, "Debe seleccionar una cuenta."),
  category: z.string().min(2, "La categoría es requerida.").max(50),
  limit: z.coerce.number().positive("El límite debe ser un número positivo."),
  month: z.date({ required_error: "Debe seleccionar un mes." }),
});
type BudgetFormValues = z.infer<typeof formSchema>;
interface BudgetFormProps {
  onSubmit: (values: Omit<Budget, 'id'>) => Promise<void>;
  onFinished: () => void;
  accounts: Account[];
  categories: string[];
  defaultValues?: Partial<BudgetFormValues>;
}
export function BudgetForm({ onSubmit, onFinished, accounts, categories, defaultValues }: BudgetFormProps) {
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  const { isSubmitting } = form.formState;
  async function handleSubmit(values: BudgetFormValues) {
    await onSubmit({
      ...values,
      month: values.month.getTime(),
    });
    onFinished();
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 px-4 py-2">
        {/* Fields for account, category, limit, month will go here */}
        <p className="text-muted-foreground text-center py-8">
          La gestión de presupuestos se implementará en una fase futura.
        </p>
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={true || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Presupuesto
          </Button>
        </div>
      </form>
    </Form>
  );
}