import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import type { Account } from '@shared/types';
export interface Filters {
  query: string;
  accountId: string;
  type: string;
  dateRange?: DateRange;
}
interface TransactionFiltersProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  accounts: Account[];
}
export function TransactionFilters({ filters, setFilters, accounts }: TransactionFiltersProps) {
  const handleReset = () => {
    setFilters({ query: '', accountId: 'all', type: 'all', dateRange: undefined });
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg bg-card">
      <Input
        placeholder="Buscar por categoría o nota..."
        value={filters.query}
        onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
      />
      <Select value={filters.accountId} onValueChange={(value) => setFilters(prev => ({ ...prev, accountId: value }))}>
        <SelectTrigger>
          <SelectValue placeholder="Todas las cuentas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las Cuentas</SelectItem>
          {accounts.map(acc => (
            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
        <SelectTrigger>
          <SelectValue placeholder="Todos los tipos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los Tipos</SelectItem>
          <SelectItem value="income">Ingreso</SelectItem>
          <SelectItem value="expense">Gasto</SelectItem>
          <SelectItem value="transfer">Transferencia</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange?.from ? (
                filters.dateRange.to ? (
                  `${format(filters.dateRange.from, "LLL dd, y")} - ${format(filters.dateRange.to, "LLL dd, y")}`
                ) : (
                  format(filters.dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Rango de Fechas</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filters.dateRange?.from}
              selected={filters.dateRange}
              onSelect={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
              numberOfMonths={2}
              locale={es}
            />
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" onClick={handleReset} className="flex-shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}