import { motion } from 'framer-motion';
import { Banknote, Landmark, CreditCard, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { Account } from '@shared/types';
import React from 'react';
const accountIcons = {
  cash: <Banknote className="size-5 text-muted-foreground" />,
  bank: <Landmark className="size-5 text-muted-foreground" />,
  credit_card: <CreditCard className="size-5 text-muted-foreground" />,
};
interface AccountCardProps {
  account: Account;
  onDelete: (accountId: string) => void;
  onEdit: (account: Account) => void;
  children?: React.ReactNode;
}
export function AccountCard({ account, onDelete, onEdit, children }: AccountCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency }).format(value);
  };
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              {accountIcons[account.type]}
              {account.name}
            </CardTitle>
            <CardDescription>{formatCurrency(account.balance)}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 flex-shrink-0">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(account)}><Pencil className="mr-2 size-4" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(account.id)} className="text-destructive"><Trash2 className="mr-2 size-4" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-end">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}