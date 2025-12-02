import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/hooks/use-theme';
export function SettingsPage() {
  const { isDark } = useTheme();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-display font-bold">Ajustes</h1>
          <p className="text-muted-foreground mt-1">Configura tus preferencias de la aplicación.</p>
        </header>
        <div className="max-w-2xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Visual</CardTitle>
              <CardDescription>Personaliza la apariencia de CasaConta.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="theme-toggle">Tema</Label>
                <div className="flex items-center gap-2">
                  <span>{isDark ? 'Oscuro' : 'Claro'}</span>
                  <ThemeToggle className="relative top-0 right-0" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Finanzas</CardTitle>
              <CardDescription>Ajustes relacionados con la moneda y fechas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="currency-select">Moneda Principal</Label>
                <Select defaultValue="USD">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="ARS">ARS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="fiscal-month-start">Inicio del Mes Fiscal</Label>
                <Select defaultValue="1">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Día del mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={String(day)}>Día {day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}