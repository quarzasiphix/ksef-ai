// Treasury Summary Card - Shows overall treasury balance and account breakdown
// Balances are always computed, never stored

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  Landmark,
  Banknote,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTreasurySummary } from '@/hooks/useTreasury';

interface TreasurySummaryCardProps {
  showDetails?: boolean;
  className?: string;
}

export function TreasurySummaryCard({ showDetails = true, className }: TreasurySummaryCardProps) {
  const { summary, loading, refresh } = useTreasurySummary();

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardContent className="py-6 text-center text-muted-foreground">
          Brak danych o saldach
        </CardContent>
      </Card>
    );
  }

  const bankAccounts = summary.accounts.filter(a => a.account_type === 'BANK');
  const cashAccounts = summary.accounts.filter(a => a.account_type === 'CASH');

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Stan środków
            </CardTitle>
            <CardDescription>
              Salda wyliczane z historii ruchów (audit-safe)
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Balance */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg border">
          <p className="text-sm text-muted-foreground mb-1">Łączne saldo</p>
          <p className="text-3xl font-bold">
            {summary.total_balance.toFixed(2)} <span className="text-lg font-normal">{summary.currency}</span>
          </p>
        </div>

        {/* Bank vs Cash Split */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Banki</span>
            </div>
            <p className="text-xl font-semibold">{summary.total_bank_balance.toFixed(2)} {summary.currency}</p>
            <p className="text-xs text-muted-foreground">{bankAccounts.length} kont</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Kasy</span>
            </div>
            <p className="text-xl font-semibold">{summary.total_cash_balance.toFixed(2)} {summary.currency}</p>
            <p className="text-xs text-muted-foreground">{cashAccounts.length} kas</p>
          </div>
        </div>

        {/* Account Details */}
        {showDetails && summary.accounts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Szczegóły kont</p>
            <div className="space-y-1">
              {summary.accounts.map(account => (
                <div
                  key={account.payment_account_id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded"
                >
                  <div className="flex items-center gap-2">
                    {account.account_type === 'BANK' ? (
                      <Landmark className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Banknote className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-sm">{account.account_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {account.movement_count} ruchów
                    </Badge>
                  </div>
                  <span className={`text-sm font-medium ${
                    account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {account.current_balance.toFixed(2)} {account.currency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TreasurySummaryCard;
