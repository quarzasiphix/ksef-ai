import React, { useEffect, useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/ui/select";
import { BankAccount } from "@/modules/banking/bank";
import { getBankAccountsForProfile } from "@/integrations/supabase/repositories/bankAccountRepository";
import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";

interface BankAccountSelectorProps {
  businessProfileId: string;
  value?: string | null;
  onChange: (id: string) => void;
  currency?: string;
  onAddAccount?: () => void;
  onAddVatAccount?: () => void;
  showVatRecommendation?: boolean;
}

export const BankAccountSelector: React.FC<BankAccountSelectorProps> = ({ 
  businessProfileId, 
  value, 
  onChange, 
  currency, 
  onAddAccount,
  onAddVatAccount,
  showVatRecommendation = false
}) => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessProfileId) return;
    setLoading(true);
    getBankAccountsForProfile(businessProfileId)
      .then(accs => {
        setAccounts(accs);
        
        // Automatycznie wybierz domyślne konto jeśli nie ma wybranej wartości
        if (!value && accs.length > 0) {
          // Najpierw szukaj konta w tej samej walucie
          const matchingAccount = accs.find(a => a.currency === currency && a.type !== 'vat');
          if (matchingAccount) {
            onChange(matchingAccount.id);
          } else {
            // Jeśli nie ma konta w tej walucie, wybierz pierwsze dostępne (nie VAT)
            const firstAccount = accs.find(a => a.type !== 'vat');
            if (firstAccount) {
              onChange(firstAccount.id);
            }
          }
        }
      })
      .finally(() => setLoading(false));
  }, [businessProfileId, value, currency, onChange]);

  // Filtruj tylko konta główne (nie VAT) dla selektora
  const matching = accounts.filter(a => a.currency === currency && a.type !== 'vat');
  const others = accounts.filter(a => a.currency !== currency && a.type !== 'vat');
  
  // Sprawdź czy ma konto VAT
  const vatAccount = accounts.find(acc => acc.type === 'vat');
  const hasVatAccount = !!vatAccount;
  const shouldShowVatRecommendation = showVatRecommendation && !hasVatAccount && accounts.length > 0;

  return (
    <div>
      <Select value={value || ''} onValueChange={onChange} disabled={loading || !businessProfileId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? "Ładowanie kont..." : "Wybierz konto bankowe"} />
        </SelectTrigger>
        <SelectContent>
          {matching.length > 0 && matching.map(acc => (
            <SelectItem key={acc.id} value={acc.id} className="text-green-700 font-semibold">
              <span style={{ whiteSpace: 'pre-wrap' }}>{acc.accountName || acc.bankName}</span> ({acc.accountNumber}) [{acc.currency}]{acc.type ? `, ${acc.type}` : ''}
            </SelectItem>
          ))}
          {others.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs text-muted-foreground">Konta w innych walutach:</div>
              {others.map(acc => (
                <SelectItem key={acc.id} value={acc.id} className="opacity-70">
                  <span style={{ whiteSpace: 'pre-wrap' }}>{acc.accountName || acc.bankName}</span> ({acc.accountNumber}) [{acc.currency}]{acc.type ? `, ${acc.type}` : ''} <span className="ml-1 text-xs">(inna waluta)</span>
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

      {/* Status konta VAT */}
      {showVatRecommendation && (
        <div className="mt-2">
          {hasVatAccount ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600">✓ Konto VAT dodane</span>
              <span className="text-muted-foreground text-xs">
                {vatAccount?.accountName || vatAccount?.bankName} ({vatAccount?.accountNumber})
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-600">✗ Brak konta VAT - zalecane dodanie</span>
              {onAddVatAccount && (
                <Button size="sm" variant="ghost" onClick={onAddVatAccount} className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Plus className="h-3 w-3 mr-1" />
                  Dodaj
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 