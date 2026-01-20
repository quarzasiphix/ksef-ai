import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { PeriodStatus } from './PeriodControlBar';

interface PeriodActionBannerProps {
  status: PeriodStatus;
  periodName: string;
  taxAmount?: number;
  taxDeadline: Date;
  invoiceCount?: number;
  postedCount?: number;
  unpostedCount?: number;
  onViewDocuments?: () => void;
  onMarkAsPaid?: () => void;
  onClosePeriod?: () => void;
  onAssignAccounts?: () => void;
}

export function PeriodActionBanner({
  status,
  periodName,
  taxAmount,
  taxDeadline,
  invoiceCount = 0,
  postedCount = 0,
  unpostedCount = 0,
  onViewDocuments,
  onMarkAsPaid,
  onClosePeriod,
  onAssignAccounts,
}: PeriodActionBannerProps) {
  // Don't show banner for future periods
  if (status === 'future') {
    return null;
  }

  const renderLateBanner = () => (
    <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-lg shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-destructive-foreground mb-1">
            {periodName} nie został rozliczony
          </h3>
          <div className="space-y-1 text-sm text-destructive-foreground">
            {taxAmount !== undefined && (
              <p>Podatek do zapłaty: <span className="font-bold">{taxAmount.toFixed(2)} PLN</span></p>
            )}
            <p>
              Termin minął: <span className="font-bold">
                {format(taxDeadline, 'dd MMMM yyyy', { locale: pl })}
              </span>
            </p>
            {unpostedCount > 0 && (
              <p className="text-red-700 font-medium">
                {unpostedCount} {unpostedCount === 1 ? 'faktura wymaga' : 'faktury wymagają'} zaksięgowania
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            {unpostedCount > 0 && onAssignAccounts && (
              <Button
                onClick={onAssignAccounts}
                variant="default"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                Przypisz konta
              </Button>
            )}
            {onViewDocuments && (
              <Button
                onClick={onViewDocuments}
                variant="outline"
                size="sm"
              >
                Przejdź do dokumentów
              </Button>
            )}
            {taxAmount !== undefined && onMarkAsPaid && (
              <Button
                onClick={onMarkAsPaid}
                variant="outline"
                size="sm"
              >
                Oznacz jako zapłacone
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDueBanner = () => (
    <div className="bg-amber-50 dark:bg-amber-950 border-l-4 border-amber-500 dark:border-amber-600 p-4 rounded-lg shadow-sm">
      <div className="flex items-start gap-3">
        <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-1">
            {periodName} wymaga rozliczenia
          </h3>
          <div className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
            {taxAmount !== undefined && (
              <p>Podatek do zapłaty: <span className="font-bold">{taxAmount.toFixed(2)} PLN</span></p>
            )}
            <p>
              Termin płatności: <span className="font-bold">
                {format(taxDeadline, 'dd MMMM yyyy', { locale: pl })}
              </span>
            </p>
            {unpostedCount > 0 && (
              <p className="text-amber-700 font-medium">
                {unpostedCount} {unpostedCount === 1 ? 'faktura wymaga' : 'faktury wymagają'} zaksięgowania
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            {unpostedCount > 0 && onAssignAccounts && (
              <Button
                onClick={onAssignAccounts}
                variant="default"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700"
              >
                Przypisz konta
              </Button>
            )}
            {onViewDocuments && (
              <Button
                onClick={onViewDocuments}
                variant="outline"
                size="sm"
              >
                Przejdź do dokumentów
              </Button>
            )}
            {taxAmount !== undefined && onMarkAsPaid && (
              <Button
                onClick={onMarkAsPaid}
                variant="outline"
                size="sm"
              >
                Oznacz jako zapłacone
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderOpenBanner = () => (
    <div className="bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500 dark:border-blue-600 p-4 rounded-lg shadow-sm">
      <div className="flex items-start gap-3">
        <Info className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
            Trwa bieżący okres: {periodName}
          </h3>
          <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <p>
              {postedCount} {postedCount === 1 ? 'faktura zaksięgowana' : 'faktury zaksięgowane'}
            </p>
            {unpostedCount > 0 && (
              <p>
                {unpostedCount} {unpostedCount === 1 ? 'faktura oczekuje' : 'faktury oczekują'} na zaksięgowanie
              </p>
            )}
            <p>
              Termin rozliczenia: <span className="font-bold">
                {format(taxDeadline, 'dd MMMM yyyy', { locale: pl })}
              </span>
            </p>
          </div>
          {unpostedCount > 0 && (
            <div className="flex gap-2 mt-3">
              {onAssignAccounts && (
                <Button
                  onClick={onAssignAccounts}
                  variant="default"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Przypisz konta
                </Button>
              )}
              {onViewDocuments && (
                <Button
                  onClick={onViewDocuments}
                  variant="outline"
                  size="sm"
                >
                  Przejdź do dokumentów
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderClosedBanner = () => (
    <div className="bg-green-50 dark:bg-green-950 border-l-4 border-green-500 dark:border-green-600 p-4 rounded-lg shadow-sm">
      <div className="flex items-start gap-3">
        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-1">
            {periodName} - okres zamknięty
          </h3>
          <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
            <p>
              {invoiceCount} {invoiceCount === 1 ? 'faktura zaksięgowana' : 'faktury zaksięgowane'}
            </p>
            {taxAmount !== undefined && (
              <p>Podatek rozliczony: <span className="font-bold">{taxAmount.toFixed(2)} PLN</span></p>
            )}
            <p className="text-green-700 dark:text-green-300">
              Okres zablokowany - dokumenty są niezmienne
            </p>
          </div>
          {onViewDocuments && (
            <div className="mt-3">
              <Button
                onClick={onViewDocuments}
                variant="outline"
                size="sm"
              >
                Zobacz dokumenty
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  switch (status) {
    case 'late':
      return renderLateBanner();
    case 'due':
      return renderDueBanner();
    case 'open':
      return renderOpenBanner();
    case 'closed':
      return renderClosedBanner();
    default:
      return null;
  }
}
