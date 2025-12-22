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
import { CalendarIcon, Loader2, UploadCloud, X, FileText, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Account, Transaction } from '@shared/types';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Combobox } from '@/components/ui/combobox';
import t from '@/lib/i18n';
import { toast } from 'sonner';
type Frequency = { id: string; name: string; interval: number; unit: 'days' | 'weeks' | 'months' };
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const formSchema = z.object({
  id: z.string().optional(),
  accountId: z.string().min(1, t('form.requiredAccount')),
  accountToId: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.preprocess((val: any) => Number(val), z.number().min(0.01, t('form.positive'))),
  category: z.string().min(2, t('form.requiredCategory')),
  ts: z.date(),
  note: z.string().max(200).optional(),
  recurrent: z.boolean().optional(),
  frequency: z.string().optional(),
  attachmentDataUrl: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.type === 'transfer') return !!data.accountToId && data.accountToId !== data.accountId;
  return true;
}, { message: t('form.transferAccountError'), path: ["accountToId"] });
type TransactionFormValues = z.infer<typeof formSchema>;
export function TransactionForm({ accounts, onSubmit, onFinished, defaultValues }: {
  accounts: Account[];
  onSubmit: (values: Partial<Transaction> & { id?: string }) => Promise<void>;
  onFinished: () => void;
  defaultValues?: Partial<TransactionFormValues>;
}) {
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [frequencies, setFrequencies] = useState<Frequency[]>([]);
  useEffect(() => {
    api<{ id: string; name: string }[]>('/api/finance/categories')
      .then(cats => setCategories(cats.map(c => ({ value: c.name, label: c.name }))))
      .catch(() => {});
    api<Frequency[]>('/api/finance/frequencies')
      .then(setFrequencies)
      .catch(() => {});
  }, []);
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      type: 'expense',
      ts: new Date(),
      recurrent: false,
      ...defaultValues,
    }
  });
  const type = form.watch('type');
  const isRecurrent = form.watch('recurrent');
  // Reactive cleanup logic for transfer-specific fields
  useEffect(() => {
    if (type !== 'transfer') {
      form.setValue('accountToId', undefined);
    }
  }, [type, form]);
  const handleSubmit: SubmitHandler<TransactionFormValues> = async (values) => {
    const acc = accounts.find(a => a.id === values.accountId);
    const finalValues: Partial<Transaction> & { id?: string } = {
      ...values,
      ts: values.ts.getTime(),
      accountTo: values.accountToId,
      currency: acc?.currency || 'EUR',
    };
    await onSubmit(finalValues);
    onFinished();
  };
  const handleFile = (file: File | null, callback: (url: string) => void) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) return toast.error('Archivo demasiado grande.');
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-6 overflow-y-auto max-h-[75vh]">
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem><FormLabel>Tipo</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="expense">Gasto</SelectItem><SelectItem value="income">Ingreso</SelectItem><SelectItem value="transfer">Transferencia</SelectItem></SelectContent></Select></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="accountId" render={({ field }) => (
            <FormItem><FormLabel>Cuenta {type === 'transfer' ? 'Origen' : ''}</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></FormItem>
          )} />
          {type === 'transfer' && (
            <FormField control={form.control} name="accountToId" render={({ field }) => (
              <FormItem><FormLabel>Cuenta Destino</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></FormItem>
            )} />
          )}
        </div>
        <FormField control={form.control} name="amount" render={({ field }) => (
          <FormItem><FormLabel>Importe</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem><FormLabel>Categoría</FormLabel><Combobox options={categories} value={field.value} onChange={field.onChange} disabled={type === 'transfer'} /></FormItem>
        )} />
        <FormField control={form.control} name="ts" render={({ field }) => (
          <FormItem className="flex flex-col"><FormLabel>Fecha</FormLabel><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full text-left font-normal">{field.value ? format(field.value, "PPP", { locale: es }) : <span>Elegir fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={d => d > new Date()} locale={es} initialFocus /></PopoverContent></Popover></FormItem>
        )} />
        <FormField control={form.control} name="note" render={({ field }) => (
          <FormItem><FormLabel>Nota</FormLabel><FormControl><Textarea placeholder="Ej: Cena con amigos..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
          <FormField control={form.control} name="recurrent" render={({ field }) => (
            <FormItem className="flex items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Repeat className="size-4 text-orange-500" />
                <FormLabel className="cursor-pointer">Transacción Recurrente</FormLabel>
              </div>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
          )} />
          {isRecurrent && (
            <FormField control={form.control} name="frequency" render={({ field }) => (
              <FormItem>
                <FormLabel>Frecuencia</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccione frecuencia" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {frequencies.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
        <FormField control={form.control} name="attachmentDataUrl" render={({ field }) => (
          <FormItem>
            <FormLabel>Adjunto</FormLabel>
            {field.value ? (
              <div className="relative border rounded-lg overflow-hidden group">
                {field.value?.includes('application/pdf') ? <div className="p-8 flex items-center justify-center bg-muted"><FileText className="h-12 w-12" /></div> : <img src={field.value} className="max-h-48 w-full object-cover" />}
                <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => field.onChange('')}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted" onClick={() => document.getElementById('file-up')?.click()}>
                <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-sm mt-2">Arrastra o sube una foto</p>
                <input id="file-up" type="file" className="hidden" onChange={e => handleFile(e.target.files?.[0] || null, field.onChange)} />
              </div>
            )}
          </FormItem>
        )} />
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar</Button>
        </div>
      </form>
    </Form>
  );
}