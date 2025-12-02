import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import t from '@/lib/i18n';
import type { User } from '@shared/types';
const userSchema = z.object({
  username: z.string().min(3, t('form.minChars', 3)).max(20, t('form.maxChars', 20)),
  password: z.string().optional(),
  role: z.enum(['user', 'admin']),
  email: z.string().email(t('form.email')).optional().or(z.literal('')),
});
type UserFormValues = z.infer<typeof userSchema>;
interface UserFormProps {
  onSubmit: (values: Partial<User> & { password?: string }) => Promise<void>;
  defaultValues?: Partial<User>;
  isEditing?: boolean;
}
export function UserForm({ onSubmit, defaultValues, isEditing = false }: UserFormProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: defaultValues?.username || '',
      password: '',
      role: defaultValues?.role || 'user',
      email: defaultValues?.email || '',
    },
  });
  const { isSubmitting } = form.formState;
  const handleSubmit: SubmitHandler<UserFormValues> = async (values) => {
    // Manual validation logic based on editing state
    if (!isEditing && (!values.password || values.password.length < 5)) {
      form.setError('password', { message: t('form.minChars', 5) });
      return;
    }
    if (isEditing && values.password && values.password.length > 0 && values.password.length < 5) {
      form.setError('password', { message: t('form.minChars', 5) });
      return;
    }
    const payload: Partial<User> & { password?: string } = {
      username: values.username.trim(),
      role: values.role,
      email: values.email ? values.email.trim() : undefined,
    };
    if (values.password && values.password.length >= 5) {
      payload.password = values.password;
    }
    await onSubmit(payload);
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.users.username')}</FormLabel>
              <FormControl>
                <Input placeholder="usuario123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.users.password')}</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormDescription>
                {isEditing
                  ? "Deja en blanco para mantener la contraseña actual (mín. 5 caracteres)."
                  : "Mínimo 5 caracteres."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.users.email')}</FormLabel>
              <FormControl>
                <Input type="email" placeholder="usuario@ejemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.users.role')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="user">{t('settings.users.roleUser')}</SelectItem>
                  <SelectItem value="admin">{t('settings.users.roleAdmin')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </form>
    </Form>
  );
}