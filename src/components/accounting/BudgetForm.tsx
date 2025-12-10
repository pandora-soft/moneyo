import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Budget } from '@shared/types';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/stores/useAppStore';
const formSchema = z.object({
  category: z.string().min(2, "La categoría es requerida.").max(50),
  limit: z.preprocess(
    (val: unknown) => (val === '' ? 0 : Number(val)),
    z.number().positive("El límite debe ser positivo.")
  ),
  month: z.date(),
});
type BudgetFormValues = z.infer<typeof formSchema>;
interface BudgetFormProps {
  onSubmit: (values: Omit<Budget, 'id' | 'accountId'>) => Promise<void>;
  onFinished: () => void;
  defaultValues?: Partial<BudgetFormValues>;
}
export function BudgetForm({ onSubmit, onFinished, defaultValues }: BudgetFormProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const refetchTrigger = useAppStore((state) => state.refetchData);
  useEffect(() => {
    api<{ id: string; name: string }[]>('/api/finance/categories')
      .then(cats => setCategories(cats.map(c => c.name)))
      .catch(() => setCategories(['Comida', 'Transporte', 'Alquiler', 'Salario', 'Otro']));
  }, [refetchTrigger]);
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      month: new Date(),
      limit: 0,
      ...defaultValues,
    },
  });
  const { isSubmitting } = form.formState;
  const handleSubmit: SubmitHandler<BudgetFormValues> = async (values) => {
    const startOfMonth = new Date(values.month.getFullYear(), values.month.getMonth(), 1);
    await onSubmit({
      ...values,
      limit: values.limit ?? 0,
      month: startOfMonth.getTime(),
    });
    onFinished();
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-6">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Seleccione una categoría" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Límite de Gasto</FormLabel>
              <FormControl><Input type="number" placeholder="500.00" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="month"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Mes</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "MMMM yyyy", { locale: es }) : <span>Seleccione un mes</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date("2000-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Presupuesto
          </Button>
        </div>
      </form>
    </Form>
  );
}