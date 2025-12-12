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
import { CalendarIcon, Loader2, UploadCloud, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Account, Transaction } from '@shared/types';
import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api-client';
import { Combobox } from '@/components/ui/combobox';
import t from '@/lib/i18n';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
type Frequency = { id: string; name: string; interval: number; unit: 'days' | 'weeks' | 'months' };
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const formSchema = z.object({
  id: z.string().optional(),
  accountId: z.string().min(1, t('form.requiredAccount')),
  accountToId: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive(t('form.positive')),
  category: z.string().min(2, t('form.requiredCategory')).max(50),
  ts: z.date(),
  note: z.string().max(100).optional(),
  recurrent: z.boolean().optional(),
  frequency: z.string().optional(),
  attachmentDataUrl: z.string().url().optional().or(z.literal('')),
}).refine((data) => {
  if (data.type === 'transfer') {
    return !!data.accountToId && data.accountToId !== data.accountId;
  }
  return true;
}, {
  message: t('form.transferAccountError'),
  path: ["accountToId"]
}).refine((data) => {
    if (data.recurrent) {
        return !!data.frequency && data.frequency.length > 0;
    }
    return true;
}, {
    message: t('form.recurrentFreqError'),
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
  const refetchTrigger = useAppStore((state) => state.refetchData);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [frequencies, setFrequencies] = useState<Frequency[]>([]);
  // Removed previewUrl and isPdf state – attachment handling is now done via form field value
  const [isDragging, setIsDragging] = useState(false);
  useEffect(() => {
    api<{ id: string; name: string }[]>('/api/finance/categories')
      .then(cats => setCategories(cats.map(c => ({ value: c.name, label: c.name }))))
      .catch(() => setCategories([]));
    api<Frequency[]>('/api/finance/frequencies')
      .then(setFrequencies)
      .catch(() => setFrequencies([]));
  }, [refetchTrigger]);
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      amount: 0,
      type: 'expense',
      accountId: '',
      accountToId: '',
      category: '',
      ts: new Date(Date.now()),
      note: '',
      recurrent: false,
      frequency: '',
      attachmentDataUrl: '',
      ...defaultValues,
    }
  });
  // Removed effect – attachment data is now handled directly by the form field
  const { isSubmitting } = form.formState;
  const transactionType = form.watch('type');
  const isRecurrent = form.watch('recurrent');
  useEffect(() => {
    if (transactionType === 'transfer') {
      form.setValue('category', 'Transferencia');
      form.setValue('recurrent', false);
      form.setValue('frequency', undefined);
    } else if (form.getValues('category') === 'Transferencia') {
      form.setValue('category', '');
    }
  }, [transactionType, form]);
  const handleFileChange = useCallback(
    (file: File | null, onValueChange: (url: string) => void) => {
      if (!file) return;
      if (file.size > MAX_FILE_SIZE) {
        toast.error('El archivo es demasiado grande (máx 5MB).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onValueChange(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    []
  );
  // Removed handleRemoveAttachment – clearing is done via field.onChange('')
  const handleSubmit: SubmitHandler<TransactionFormValues> = async (values) => {
    const accountFound = accounts.find(a => a.id === values.accountId);
    const finalValues: Partial<Transaction> & { id?: string } = {
      id: values.id,
      accountId: values.accountId,
      type: values.type,
      amount: Number(values.amount),
      category: values.category,
      ts: values.ts.getTime(),
      note: values.note,
      accountTo: values.accountToId,
      recurrent: values.recurrent ?? false,
      frequency: values.recurrent ? values.frequency : undefined,
      currency: accountFound?.currency || 'EUR',
      attachmentDataUrl: values.attachmentDataUrl || undefined,
    };
    await onSubmit(finalValues);
    onFinished();
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-6">
        {/* Form fields for transaction details */}
        <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>{t('form.transaction.type')}</FormLabel><Select value={field.value ?? ''} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="expense">{t('finance.expense')}</SelectItem><SelectItem value="income">{t('finance.income')}</SelectItem><SelectItem value="transfer">{t('finance.transfer')}</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
        <FormField control={form.control} name="accountId" render={({ field }) => ( <FormItem><FormLabel>{transactionType === 'transfer' ? t('form.transaction.originAccount') : t('form.transaction.account')}</FormLabel><Select value={field.value ?? ''} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione una cuenta" /></SelectTrigger></FormControl><SelectContent>{accounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
        {transactionType === 'transfer' && ( <FormField control={form.control} name="accountToId" render={({ field }) => ( <FormItem><FormLabel>{t('form.transaction.destinationAccount')}</FormLabel><Select value={field.value ?? ''} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione una cuenta" /></SelectTrigger></FormControl><SelectContent>{accounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} /> )}
        <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem><FormLabel>{t('form.transaction.amount')}</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem> )} />
        <FormField control={form.control} name="category" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>{t('form.transaction.category')}</FormLabel><Combobox options={categories} value={field.value} onChange={(value) => field.onChange(value || '')} placeholder="Seleccione o escriba una categoría..." disabled={transactionType === 'transfer'} /><FormMessage /></FormItem> )} />
        <FormField control={form.control} name="ts" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>{t('form.transaction.date')}</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus locale={es} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
        <FormField control={form.control} name="note" render={({ field }) => ( <FormItem><FormLabel>{t('form.transaction.note')}</FormLabel><FormControl><Textarea placeholder="Detalles adicionales..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
        {/* Attachment Section – now a FormField */}
        <FormField
          control={form.control}
          name="attachmentDataUrl"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{t('form.attachment.optional') || 'Adjunto (Opcional)'}</FormLabel>

              {field.value ? (
                <div className="relative group">
                  {field.value.startsWith('data:application/pdf') ? (
                    <div className="flex items-center justify-center h-48 w-full bg-muted rounded-lg border-2 border-dashed">
                      <FileText className="size-16 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={field.value}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg shadow-md"
                    />
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => field.onChange('')}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFileChange(e.dataTransfer.files[0] ?? null, field.onChange);
                  }}
                  className={cn(
                    "flex justify-center items-center w-full h-32 px-6 py-10 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors",
                    isDragging && "border-primary bg-primary/10"
                  )}
                  onClick={() => document.getElementById('attachment-input')?.click()}
                >
                  <div className="text-center">
                    <UploadCloud className="mx-auto size-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Arrastra un archivo o haz clic para subirlo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, PNG, JPG, GIF hasta 5MB
                    </p>
                  </div>
                  <Input
                    id="attachment-input"
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) =>
                      handleFileChange(e.target.files?.[0] ?? null, field.onChange)
                    }
                  />
                </div>
              )}

              <FormMessage />
            </FormItem>
          )}
        />
        {transactionType !== 'transfer' && ( <> <FormField control={form.control} name="recurrent" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>{t('form.transaction.recurrent')}</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} /> {isRecurrent && ( <FormField control={form.control} name="frequency" render={({ field }) => ( <FormItem><FormLabel>{t('form.transaction.frequency')}</FormLabel><Select value={field.value ?? ''} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione una frecuencia" /></SelectTrigger></FormControl><SelectContent>{frequencies.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} /> )} </> )}
        <div className="flex justify-end pt-4 sticky bottom-0 z-10">
          <Button type="submit" variant="default" disabled={!form.formState.isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues?.id ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </form>
    </Form>
  );
}