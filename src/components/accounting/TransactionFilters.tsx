import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { format, startOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import type { Account } from '@shared/types';
import t from '@/lib/i18n';
export interface Filters {
  query: string;
  accountId: string;
  type: string;
  dateRange?: DateRange;
  preset?: 'all' | 'this_month' | 'last_3_months';
}
interface TransactionFiltersProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  accounts: Account[];
  focus?: 'full' | 'date';
}
export function TransactionFilters({ filters, setFilters, accounts, focus = 'full' }: TransactionFiltersProps) {
  const handleReset = () => {
    setFilters({ query: '', accountId: 'all', type: 'all', dateRange: undefined, preset: 'all' });
  };
  const handlePresetChange = (value: 'all' | 'this_month' | 'last_3_months') => {
    let dateRange: DateRange | undefined;
    if (value === 'this_month') {
      const now = new Date();
      dateRange = { from: startOfMonth(now), to: now };
    } else if (value === 'last_3_months') {
      const now = new Date();
      dateRange = { from: subMonths(now, 3), to: now };
    }
    setFilters(prev => ({ ...prev, dateRange, preset: value }));
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg bg-card">
      {focus === 'full' && (
        <>
          <Input
            placeholder={t('filters.search')}
            value={filters.query}
            onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
          />
          <Select value={filters.accountId} onValueChange={(value) => setFilters(prev => ({ ...prev, accountId: value }))}>
            <SelectTrigger>
              <SelectValue placeholder={t('filters.allAccounts')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allAccounts')}</SelectItem>
              {accounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue placeholder={t('filters.allTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
              <SelectItem value="income">{t('finance.income')}</SelectItem>
              <SelectItem value="expense">{t('finance.expense')}</SelectItem>
              <SelectItem value="transfer">{t('finance.transfer')}</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
      {focus === 'date' && (
        <Select value={filters.preset} onValueChange={handlePresetChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allTime')}</SelectItem>
            <SelectItem value="this_month">{t('filters.thisMonth')}</SelectItem>
            <SelectItem value="last_3_months">{t('filters.last3Months')}</SelectItem>
          </SelectContent>
        </Select>
      )}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange?.from ? (
                filters.dateRange.to ? (
                  `${format(filters.dateRange.from, "LLL dd, y", { locale: es })} - ${format(filters.dateRange.to, "LLL dd, y", { locale: es })}`
                ) : (
                  format(filters.dateRange.from, "LLL dd, y", { locale: es })
                )
              ) : (
                <span>{t('filters.dateRange')}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filters.dateRange?.from}
              selected={filters.dateRange}
              onSelect={(range) => setFilters(prev => ({ ...prev, dateRange: range, preset: 'all' }))}
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