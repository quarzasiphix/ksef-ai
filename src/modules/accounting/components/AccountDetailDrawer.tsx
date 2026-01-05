import React from 'react';
import { X, TrendingUp, FileText, Edit } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Separator } from '@/shared/ui/separator';
import { cn } from '@/shared/lib/utils';

interface AccountDetailDrawerProps {
  account: {
    id: string;
    code: string;
    name: string;
    account_type: string;
    is_synthetic: boolean;
    is_active: boolean;
    description: string | null;
    default_vat_rate: number | null;
  } | null;
  balance: {
    current_balance: number;
    month_delta: number;
    ytd_delta: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onViewLedger?: () => void;
  onEdit?: () => void;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: 'Aktywa',
  liability: 'Pasywa',
  equity: 'Kapitał',
  revenue: 'Przychody',
  expense: 'Koszty',
  off_balance: 'Pozabilansowe',
};

export function AccountDetailDrawer({
  account,
  balance,
  isOpen,
  onClose,
  onViewLedger,
  onEdit,
}: AccountDetailDrawerProps) {
  if (!isOpen || !account) return null;

  const isDebitNature = ['asset', 'expense'].includes(account.account_type);
  const currentBalance = balance?.current_balance || 0;
  const balanceColor = currentBalance === 0 
    ? 'text-muted-foreground' 
    : (isDebitNature ? (currentBalance > 0 ? 'text-green-600' : 'text-red-600') : (currentBalance > 0 ? 'text-red-600' : 'text-green-600'));

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl">
        <div className="flex h-full flex-col overflow-hidden rounded-l-3xl border border-slate-800 bg-[#030712] text-slate-50 shadow-2xl">
          {/* Header */}
          <div className="border-b border-white/5 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/30 px-8 py-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm text-slate-400">{account.code}</span>
                  <Badge variant="outline" className="text-xs">
                    {ACCOUNT_TYPE_LABELS[account.account_type]}
                  </Badge>
                  {account.is_synthetic && (
                    <Badge variant="outline" className="text-xs">
                      Syntetyczne
                    </Badge>
                  )}
                  {!account.is_active && (
                    <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600">
                      Nieaktywne
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-semibold text-white">{account.name}</h2>
                {account.description && (
                  <p className="mt-2 text-sm text-slate-400">{account.description}</p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose} 
                className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-8 py-6">
            {/* Balance Section */}
            <div className="mb-8">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-4">Saldo</h3>
              <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-sm text-slate-400">Bieżące saldo:</span>
                  <span className={cn('text-3xl font-bold font-mono', balanceColor)}>
                    {currentBalance >= 0 ? '+' : ''}{currentBalance.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN
                  </span>
                </div>

                <Separator className="border-white/5 mb-6" />

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs text-slate-400 mb-2">Ten miesiąc</div>
                    <div className="font-mono text-lg font-semibold text-slate-300">
                      {(balance?.month_delta || 0) >= 0 ? '+' : ''}{(balance?.month_delta || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-2">Rok do daty (YTD)</div>
                    <div className="font-mono text-lg font-semibold text-slate-300">
                      {(balance?.ytd_delta || 0) >= 0 ? '+' : ''}{(balance?.ytd_delta || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-4">Szybkie akcje</h3>
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  className="w-full justify-start border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  onClick={onViewLedger}
                >
                  <FileText className="h-4 w-4 mr-3" />
                  Zobacz księgę główną
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start border border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  <TrendingUp className="h-4 w-4 mr-3" />
                  Zobacz analizę
                </Button>
              </div>
            </div>

            {/* Account Details */}
            <div className="mb-8">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-4">Szczegóły konta</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Kod konta:</span>
                  <span className="font-mono text-white">{account.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Typ:</span>
                  <span className="text-white">{ACCOUNT_TYPE_LABELS[account.account_type]}</span>
                </div>
                {account.default_vat_rate !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Domyślna stawka VAT:</span>
                    <span className="text-white">{account.default_vat_rate}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-white">{account.is_active ? 'Aktywne' : 'Nieaktywne'}</span>
                </div>
              </div>
            </div>

            {/* Advanced Section */}
            {onEdit && (
              <div>
                <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-4">Zaawansowane</h3>
                <Button
                  variant="outline"
                  className="w-full justify-start border-white/10 text-slate-300 hover:bg-white/5"
                  onClick={onEdit}
                >
                  <Edit className="h-4 w-4 mr-3" />
                  Edytuj konto
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
