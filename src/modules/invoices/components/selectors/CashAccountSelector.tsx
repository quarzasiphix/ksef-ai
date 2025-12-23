import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/utils';
import type { CashAccount } from '@/shared/types/kasa';

interface CashAccountSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  cashAccounts: CashAccount[];
  disabled?: boolean;
}

export const CashAccountSelector: React.FC<CashAccountSelectorProps> = ({
  value,
  onChange,
  cashAccounts,
  disabled = false,
}) => {
  return (
    <Select onValueChange={onChange} value={value} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Wybierz kasę" />
      </SelectTrigger>
      <SelectContent>
        {cashAccounts && cashAccounts.length > 0 ? (
          cashAccounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex items-center justify-between w-full gap-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span>{account.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Stan: {formatCurrency(account.current_balance)} {account.currency}
                </span>
              </div>
            </SelectItem>
          ))
        ) : (
          <SelectItem value="no-accounts" disabled>
            Brak aktywnych kas
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

export default CashAccountSelector;
