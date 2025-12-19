import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css';
import { HomePage } from '@/pages/HomePage';
import { AccountsPage } from '@/pages/AccountsPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { BudgetsPage } from '@/pages/BudgetsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { IAPage } from '@/pages/IAPage';
import LoginPage from '@/pages/LoginPage';
import { Toaster } from '@/components/ui/sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Home, Wallet, List, BarChart, Settings, PiggyBank, LogOut, Menu, Brain } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { cn } from './lib/utils';
import { useAppStore } from './stores/useAppStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './components/ui/sheet';
import { TransactionForm } from './components/accounting/TransactionForm';
import { api, verifyAuth, clearToken } from './lib/api-client';
import type { Account, Transaction } from '@shared/types';
import { toast } from 'sonner';
import { Button } from './components/ui/button';
import { Skeleton } from './components/ui/skeleton';
const GlobalTransactionSheet = () => {
  const isModalOpen = useAppStore(s => s.isModalOpen);
  const modalInitialValues = useAppStore(s => s.modalInitialValues);
  const closeModal = useAppStore(s => s.closeModal);
  const [accounts, setAccounts] = useState<Account[]>([]);
  useEffect(() => {
    if (isModalOpen) {
      api<Account[]>('/api/finance/accounts')
        .then(setAccounts)
        .catch(() => toast.error('No se pudieron cargar las cuentas.'));
    }
  }, [isModalOpen]);
  const handleFormSubmit = async (values: Partial<Transaction> & { id?: string }) => {
    try {
      const method = values.id ? 'PUT' : 'POST';
      const url = values.id ? `/api/finance/transactions/${values.id}` : '/api/finance/transactions';
      await api(url, { method, body: JSON.stringify(values) });
      toast.success(values.id ? 'Transacción actualizada.' : 'Transacción creada.');
      useAppStore.getState().triggerRefetch();
      closeModal();
    } catch (e) {
      toast.error('Error al guardar la transacción.');
    }
  };
  return (
    <Sheet open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <SheetContent className="sm:max-w-lg w-full p-0" aria-describedby="global-transaction-sheet-desc">
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
            /* Guard against undefined modalInitialValues */
            defaultValues={modalInitialValues ? {
              ...modalInitialValues,
              ts: new Date(modalInitialValues.ts || Date.now()),
              accountToId: modalInitialValues.accountTo,
            } : {}}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    const check = async () => {
      const authStatus = await verifyAuth();
      setIsAuthenticated(authStatus);
      if (!authStatus) {
        navigate('/login', { replace: true, state: { from: location } });
      }
    };
    check();
  }, [navigate, location]);
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }
  return isAuthenticated ? <>{children}</> : null;
};
export const AppRoot = () => {
  const navigate = useNavigate();
  const t = useTranslations();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    { href: '/accounts', label: t('pages.accounts'), icon: Wallet },
    { href: '/transactions', label: t('pages.transactions'), icon: List },
    { href: '/budgets', label: t('pages.budgets'), icon: PiggyBank },
    { href: '/reports', label: t('pages.reports'), icon: BarChart },
    { href: '/ia', label: 'IA', icon: Brain },
    { href: '/settings', label: t('pages.settings'), icon: Settings },
  ];
  const handleLogout = () => {
    clearToken();
    toast.info('Sesión cerrada.');
    navigate('/login');
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
              <Wallet className="size-6 text-orange-500" />
              Moneyo
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
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="size-4" /></Button>
            <ThemeToggle className="relative top-0 right-0" />
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="right" className="p-0 sm:max-w-sm" aria-describedby="mobile-menu-desc">
            <SheetHeader className="p-6 border-b">
              <SheetTitle>Menú</SheetTitle>
              <SheetDescription id="mobile-menu-desc">
                Menú de navegación móvil
              </SheetDescription>
          </SheetHeader>
          <motion.ul
            className="mt-6 flex flex-col space-y-2 px-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {navItems.map(({ href, label, icon: Icon }) => (
              <motion.li key={href} variants={itemVariants}>
                <NavLink
                  to={href}
                  className={({ isActive }) =>
                    cn(
                      "flex h-12 items-center gap-3 px-4 rounded-lg hover:bg-accent w-full justify-start text-base",
                      isActive ? "bg-accent text-foreground" : "text-muted-foreground"
                    )
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </NavLink>
              </motion.li>
            ))}
          </motion.ul>
          <div className="border-t p-6 pt-0">
            <Button
              variant="ghost"
              className="w-full h-12 justify-start gap-3 px-4 hover:bg-destructive/20 text-destructive font-medium"
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
            >
              <LogOut className="h-5 w-5" />
              <span>{t('auth.logout')}</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <GlobalTransactionSheet />
      <Toaster richColors position="top-right" />
      <footer className="border-t">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          Built with ❤️ at Cloudflare for Moneyo
        </div>
      </footer>
    </div>
  );
};
const router = createBrowserRouter(
  [
    {
      path: "/login",
      element: <LoginPage />,
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: "/",
      element: <AuthGuard><AppRoot /></AuthGuard>,
      errorElement: <RouteErrorBoundary />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "accounts", element: <AccountsPage /> },
        { path: "transactions", element: <TransactionsPage /> },
        { path: "budgets", element: <BudgetsPage /> },
        { path: "reports", element: <ReportsPage /> },
        { path: "ia", element: <IAPage /> },
        { path: "settings", element: <SettingsPage /> },
      ],
    },
  ],
  { future: {} }
);
const rootElement = document.getElementById('root');
if (rootElement) {
  if (!rootElement.innerHTML) {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </StrictMode>
    );
  }
} else {
    console.warn("Root element with id 'root' not found in the document. App could not be mounted.");
}