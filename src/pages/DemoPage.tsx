import { AppLayout } from '@/components/layout/AppLayout';
export function DemoPage() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <h1 className="text-4xl font-display font-bold">Página de Demostración</h1>
          <p className="text-muted-foreground mt-1">Esta página es un marcador de posición.</p>
        </div>
      </div>
    </AppLayout>
  );
}