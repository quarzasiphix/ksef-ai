import React, { useEffect, useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { BankAccount } from "@/types/bank";
import { getBankAccountsForProfile } from "@/integrations/supabase/repositories/bankAccountRepository";
import { Button } from "@/components/ui/button";

interface BankAccountSelectorProps {
  businessProfileId: string;
  value?: string | null;
  onChange: (id: string) => void;
  currency?: string;
  onAddAccount?: () => void;
}

export const BankAccountSelector: React.FC<BankAccountSelectorProps> = ({ businessProfileId, value, onChange, currency, onAddAccount }) => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessProfileId) return;
    setLoading(true);
    getBankAccountsForProfile(businessProfileId)
      .then(accs => {
        setAccounts(accs);
      })
      .finally(() => setLoading(false));
  }, [businessProfileId]);

  const matching = accounts.filter(a => a.currency === currency);
  const others = accounts.filter(a => a.currency !== currency);

  return (
    <div>
      <Select value={value || ''} onValueChange={onChange} disabled={loading || !businessProfileId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? "Ładowanie kont..." : "Wybierz konto bankowe"} />
        </SelectTrigger>
        <SelectContent>
          {matching.length > 0 && matching.map(acc => (
            <SelectItem key={acc.id} value={acc.id} className="text-green-700 font-semibold">
              {acc.accountName || acc.bankName} ({acc.accountNumber}) [{acc.currency}]{acc.type ? `, ${acc.type}` : ''}
            </SelectItem>
          ))}
          {others.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs text-muted-foreground">Konta w innych walutach:</div>
              {others.map(acc => (
                <SelectItem key={acc.id} value={acc.id} className="opacity-70">
                  {acc.accountName || acc.bankName} ({acc.accountNumber}) [{acc.currency}]{acc.type ? `, ${acc.type}` : ''} <span className="ml-1 text-xs">(inna waluta)</span>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
      {matching.length === 0 && !loading && (
        <div className="mt-2 flex flex-col gap-2">
          <div className="text-xs text-muted-foreground">Brak kont bankowych dla tej waluty/profilu.</div>
          {onAddAccount && (
            <Button size="sm" variant="outline" onClick={onAddAccount}>Dodaj konto bankowe</Button>
          )}
        </div>
      )}
    </div>
  );
}; 