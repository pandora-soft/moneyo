import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet, NavLink } from "react-router-dom";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css';
import { HomePage } from '@/pages/HomePage';
import { AccountsPage } from '@/pages/AccountsPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { Toaster } from '@/components/ui/sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Home, Wallet, List, BarChart, Settings, PiggyBank } from 'lucide-react';
import { cn } from './lib/utils';
import { useAppStore } from './stores/useAppStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './components/ui/sheet';
import { TransactionForm } from './components/accounting/TransactionForm';
import { api } from './lib/api-client';
import type { Account, Transaction } from '@shared/types';
import { toast } from 'sonner';
const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/accounts', label: 'Cuentas', icon: Wallet },
  { href: '/transactions', label: 'Transacciones', icon: List },
  { href: '/reports', label: 'Reportes', icon: BarChart },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];
const GlobalTransactionSheet = () => {
  const { isModalOpen, modalInitialValues, closeModal } = useAppStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  useEffect(() => {
    if (isModalOpen) {
      api<Account[]>('/api/finance/accounts')
        .then(setAccounts)
        .catch(() => toast.error('No se pudieron cargar las cuentas.'));
    }
  }, [isModalOpen]);
  const handleFormSubmit = async (values: Omit<Transaction, 'currency'> & { id?: string }) => {
    try {
      const method = values.id ? 'PUT' : 'POST';
      const url = values.id ? `/api/finance/transactions/${values.id}` : '/api/finance/transactions';
      await api(url, { method, body: JSON.stringify(values) });
      toast.success(values.id ? 'Transacción actualizada.' : 'Transacción creada.');
      useAppStore.getState().triggerRefetch(); // Trigger global refetch
      closeModal();
    } catch (e) {
      toast.error('Error al guardar la transacción.');
    }
  };
  return (
    <Sheet open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <SheetContent className="sm:max-w-lg w-full p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle>{modalInitialValues?.id ? 'Editar Transacción' : 'Nueva Transacción'}</SheetTitle>
          <SheetDescription id="global-transaction-sheet-desc">
            Completa los campos para registrar un nuevo movimiento.
          </SheetDescription>
        </SheetHeader>
        {accounts.length > 0 && (
          <TransactionForm
            accounts={accounts}
            onSubmit={handleFormSubmit}
            onFinished={closeModal}
            defaultValues={{ ...modalInitialValues, ts: new Date(modalInitialValues.ts || Date.now()), accountToId: modalInitialValues.accountTo }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
export const AppRoot = () => (
  <div className="min-h-screen bg-background font-sans antialiased">
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <PiggyBank className="size-6 text-orange-500" />
            CasaConta
          </NavLink>
          <nav className="hidden md:flex items-center gap-4">
            {navItems.map(item => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) => cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <ThemeToggle className="relative top-0 right-0" />
      </div>
    </header>
    <main>
      <Outlet />
    </main>
    <GlobalTransactionSheet />
    <Toaster richColors position="top-right" />
    <footer className="border-t">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
        Built with ❤️ at Cloudflare
      </div>
    </footer>
  </div>
);
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppRoot />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "accounts", element: <AccountsPage /> },
      { path: "transactions", element: <TransactionsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);