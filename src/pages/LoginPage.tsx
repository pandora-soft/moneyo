import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet } from 'lucide-react';
import { api } from '@/lib/api-client';
import t from '@/lib/i18n';
import { useAppStore } from '@/stores/useAppStore';
import type { User } from '@shared/types';
const loginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es requerido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});
type LoginFormValues = z.infer<typeof loginSchema>;
export default function LoginPage() {
  const navigate = useNavigate();
  const setSettings = useAppStore(s => s.setSettings);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });
  const { isSubmitting } = form.formState;
  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    try {
      const { token, user } = await api<{ token: string; user: Omit<User, 'passwordHash'> }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      localStorage.setItem('casaconta_token', token);
      setSettings({ user }); // Store user info in settings
      toast.success(t('auth.loginSuccess'));
      navigate('/');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : t('auth.loginError');
      form.setError('root', { message: errMsg });
      toast.error(errMsg);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Wallet className="mx-auto size-10 text-orange-500" />
            <CardTitle className="text-2xl font-bold">{t('app.name')}</CardTitle>
            <CardDescription>{t('auth.loginPrompt')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.username')}</FormLabel>
                      <FormControl>
                        <Input autoComplete="username" placeholder="" {...field} />
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
                      <FormLabel>{t('auth.password')}</FormLabel>
                      <FormControl>
                        <Input autoComplete="current-password" type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.formState.errors.root && (
                  <div className="border bg-destructive/5 border-destructive/30 text-destructive rounded-md p-3 text-sm">
                    {form.formState.errors.root.message}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.login')}
                </Button>
                <div className="mt-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 text-xs text-orange-800 dark:text-orange-300">
                  <p className="font-semibold mb-1">Demo Access:</p>
                  <p>User: <span className="font-mono bg-white/50 dark:bg-black/20 px-1 rounded">admin</span></p>
                  <p>Pass: <span className="font-mono bg-white/50 dark:bg-black/20 px-1 rounded">admin</span></p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}