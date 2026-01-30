import React from 'react';
import { CheckCircle, AlertTriangle, Copy, Info } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip';
import type { InvoiceAuditTrail } from '../../types/auditTrail';

interface ProofCardProps {
  auditTrail: InvoiceAuditTrail;
}

export const ProofCard: React.FC<ProofCardProps> = ({ auditTrail }) => {
  const { versions, verification, current_invoice_data } = auditTrail;

  // Find key versions
  const issuedVersion = versions?.find(v => v.change_type === 'issued');
  const paidVersion = versions?.find(v => v.change_type === 'paid');
  const lastVersion = versions?.[versions.length - 1];

  // Check if invoice is actually paid (from current data, not just versions)
  const isCurrentlyPaid = current_invoice_data?.is_paid || false;
  const paidAt = current_invoice_data?.paid_at;
  
  // Check if it's a ryczalt invoice
  const isRyczalt = !!current_invoice_data?.ryczalt_account_id;
  
  // Use paid version if exists, otherwise use current paid status
  const paidInfo = paidVersion || (isCurrentlyPaid ? {
    changed_at: paidAt || lastVersion?.changed_at || new Date().toISOString(),
    snapshot_hash: lastVersion?.snapshot_hash || '',
    change_type: 'paid'
  } : null);

  // Calculate changes after issue
  const changesAfterIssue = issuedVersion
    ? versions?.filter(v => 
        new Date(v.changed_at) > new Date(issuedVersion.changed_at) &&
        ['corrected', 'modified'].includes(v.change_type)
      ).length || 0
    : 0;

  // Calculate changes after payment
  const changesAfterPayment = paidInfo
    ? versions?.filter(v => 
        new Date(v.changed_at) > new Date(paidInfo.changed_at) &&
        ['corrected', 'modified'].includes(v.change_type)
      ).length || 0
    : 0;

  const copyHash = (hash: string, label: string) => {
    navigator.clipboard.writeText(hash);
    toast.success(`${label} skopiowany`);
  };

  const formatDateTime = (date: string) => {
    return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: pl });
  };

  return (
    <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-white/10 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Dowód niezmienności</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Info className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Łańcuch zdarzeń jest kryptograficznie powiązany. Zmiana lub usunięcie wpisu przerwie weryfikację.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Proof Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Issued */}
        {issuedVersion ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Wydano (Issued)</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(issuedVersion.changed_at)}
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-black/20 px-2 py-1 rounded font-mono">
                {issuedVersion.snapshot_hash.substring(0, 12)}...
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => copyHash(issuedVersion.snapshot_hash, 'Hash wersji wydanej')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Nie wystawiono</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Faktura w statusie roboczym
            </div>
          </div>
        )}

        {/* Paid */}
        {paidInfo ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">
                Opłacono (Paid) {isRyczalt && <Badge variant="secondary" className="ml-2 text-xs">Ryczałt</Badge>}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(paidInfo.changed_at)}
              {isRyczalt && <span className="ml-2">• Metoda: ryczałt</span>}
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-black/20 px-2 py-1 rounded font-mono">
                {paidInfo.snapshot_hash.substring(0, 12)}...
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => copyHash(paidInfo.snapshot_hash, 'Hash wersji opłaconej')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">
                Nieopłacona {isRyczalt && <Badge variant="secondary" className="ml-2 text-xs">Ryczałt</Badge>}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Oczekuje na płatność {isRyczalt && <span className="ml-2">• Metoda: ryczałt</span>}
            </div>
          </div>
        )}

        {/* Last content change after issue */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {changesAfterIssue === 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            <span className="text-sm font-medium">Ostatnia zmiana treści</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {changesAfterIssue === 0 ? (
              <span className="text-green-500">Brak po wydaniu ✓</span>
            ) : issuedVersion ? (
              <span>
                {changesAfterIssue} {changesAfterIssue === 1 ? 'zmiana' : 'zmian'} po wydaniu
              </span>
            ) : (
              'Nie dotyczy'
            )}
          </div>
        </div>

        {/* Changes after payment */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {changesAfterPayment === 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            <span className="text-sm font-medium">Zmiany po opłaceniu</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {paidVersion ? (
              changesAfterPayment === 0 ? (
                <span className="text-green-500">{changesAfterPayment} ✓</span>
              ) : (
                <span>
                  {changesAfterPayment} {changesAfterPayment === 1 ? 'zmiana' : 'zmian'}
                </span>
              )
            ) : (
              'Nie dotyczy'
            )}
          </div>
        </div>

        {/* Chain integrity */}
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center gap-2">
            {verification?.valid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">Integralność łańcucha</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Każda wersja jest połączona z poprzednią przez hash kryptograficzny.
                    Jakakolwiek modyfikacja przeszłych wpisów zostanie wykryta.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            {verification?.valid ? (
              <Badge variant="outline" className="text-green-500 border-green-500/30">
                Zweryfikowany ✓
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-500 border-red-500/30">
                Błąd weryfikacji ⚠
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {versions?.length || 0} {versions?.length === 1 ? 'wersja' : 'wersji'}
            </span>
          </div>
          {verification && !verification.valid && verification.errors && verification.errors.length > 0 && (
            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
              <div className="font-medium mb-1">Wykryto problemy:</div>
              <ul className="list-disc list-inside space-y-1">
                {verification.errors.slice(0, 3).map((error: any, idx: number) => (
                  <li key={idx}>{error.message || 'Nieznany błąd'}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Latest version hash */}
        {lastVersion && (
          <div className="space-y-2 md:col-span-2">
            <div className="text-sm font-medium">Hash aktualnej wersji</div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-black/20 px-3 py-2 rounded font-mono flex-1 overflow-x-auto">
                {lastVersion.chain_hash}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={() => copyHash(lastVersion.chain_hash, 'Hash łańcucha')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
