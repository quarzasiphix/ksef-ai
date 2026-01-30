import React from 'react';
import { X, Download } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import type { InvoiceVersion, InvoiceSnapshot } from '../../types/auditTrail';

interface VersionPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: InvoiceVersion;
  invoiceNumber: string;
}

export const VersionPreviewDrawer: React.FC<VersionPreviewDrawerProps> = ({
  open,
  onOpenChange,
  version,
  invoiceNumber,
}) => {
  const snapshot = version.snapshot_data as InvoiceSnapshot;

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'created': return 'Utworzono';
      case 'draft_saved': return 'Wersja robocza';
      case 'issued': return 'Wystawiono';
      case 'paid': return 'Opłacono';
      case 'unpaid': return 'Cofnięto płatność';
      case 'cancelled': return 'Anulowano';
      case 'corrected': return 'Skorygowano';
      case 'modified': return 'Zmodyfikowano';
      default: return changeType;
    }
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download for this specific version
    console.log('Download PDF for version:', version.version_id);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="border-b border-white/5 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">
                Podgląd wersji v{version.version_number}
              </SheetTitle>
              <div className="text-sm text-muted-foreground mt-1">
                {invoiceNumber} • {format(new Date(version.changed_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
            >
              <Download className="h-4 w-4 mr-2" />
              Pobierz PDF
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline">
              {getChangeTypeLabel(version.change_type)}
            </Badge>
            {['issued', 'paid'].includes(version.change_type) && (
              <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                locked
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Snapshot Content */}
        <div className="space-y-6">
          {/* Warning for read-only */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
            <div className="font-medium text-blue-400 mb-1">Wersja tylko do odczytu</div>
            <div className="text-muted-foreground">
              To jest historyczna wersja faktury v{version.version_number} ({getChangeTypeLabel(version.change_type)}).
              Nie można jej edytować.
            </div>
          </div>

          {/* Invoice Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Szczegóły faktury
            </h3>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Numer</div>
                  <div className="font-medium">{snapshot.invoice_number || 'Brak'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Typ</div>
                  <div className="font-medium">{snapshot.type || 'Brak'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Data wystawienia</div>
                  <div className="font-medium">
                    {snapshot.issue_date ? format(new Date(snapshot.issue_date), 'dd.MM.yyyy', { locale: pl }) : 'Brak'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Data sprzedaży</div>
                  <div className="font-medium">
                    {snapshot.sale_date ? format(new Date(snapshot.sale_date), 'dd.MM.yyyy', { locale: pl }) : 'Brak'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Termin płatności</div>
                  <div className="font-medium">
                    {snapshot.due_date ? format(new Date(snapshot.due_date), 'dd.MM.yyyy', { locale: pl }) : 'Brak'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Metoda płatności</div>
                  <div className="font-medium">
                    {snapshot.payment_method === 'transfer' ? 'Przelew' :
                     snapshot.payment_method === 'cash' ? 'Gotówka' :
                     snapshot.payment_method === 'card' ? 'Karta' : 'Inne'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Status płatności</div>
                  <div className="font-medium">
                    {snapshot.is_paid ? 'Opłacona' : 'Nieopłacona'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Waluta</div>
                  <div className="font-medium">{snapshot.currency || 'PLN'}</div>
                </div>
              </div>

              {snapshot.comments && (
                <div className="pt-3 border-t border-white/5">
                  <div className="text-muted-foreground mb-1 text-sm">Uwagi</div>
                  <div className="text-sm">{snapshot.comments}</div>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          {snapshot.items && snapshot.items.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Pozycje ({snapshot.items.length})
              </h3>

              <div className="space-y-2">
                {snapshot.items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white/[0.02] border border-white/5 rounded-lg p-3 space-y-2"
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Ilość:</span>{' '}
                        {item.quantity} {item.unit}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cena jedn.:</span>{' '}
                        {formatCurrency(item.unit_price, snapshot.currency || 'PLN')}
                      </div>
                      <div>
                        <span className="text-muted-foreground">VAT:</span>{' '}
                        {item.vat_rate}%
                      </div>
                      <div>
                        <span className="text-muted-foreground">Netto:</span>{' '}
                        {formatCurrency(item.net_amount, snapshot.currency || 'PLN')}
                      </div>
                      <div>
                        <span className="text-muted-foreground">VAT:</span>{' '}
                        {formatCurrency(item.vat_amount, snapshot.currency || 'PLN')}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Brutto:</span>{' '}
                        {formatCurrency(item.gross_amount, snapshot.currency || 'PLN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Podsumowanie
            </h3>

            <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-white/10 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Wartość netto</span>
                <span className="font-medium">
                  {formatCurrency(snapshot.total_net, snapshot.currency || 'PLN')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT</span>
                <span className="font-medium">
                  {formatCurrency(snapshot.total_vat, snapshot.currency || 'PLN')}
                </span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Wartość brutto</span>
                <span>
                  {formatCurrency(snapshot.total_amount, snapshot.currency || 'PLN')}
                </span>
              </div>
            </div>
          </div>

          {/* Version metadata */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Metadane wersji
            </h3>

            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Numer wersji</span>
                <span className="font-mono">v{version.version_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Typ zmiany</span>
                <span>{getChangeTypeLabel(version.change_type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data zmiany</span>
                <span>{format(new Date(version.changed_at), 'dd.MM.yyyy HH:mm:ss', { locale: pl })}</span>
              </div>
              {version.change_reason && (
                <div className="pt-2 border-t border-white/5">
                  <div className="text-muted-foreground mb-1">Powód zmiany</div>
                  <div className="italic">{version.change_reason}</div>
                </div>
              )}
              <div className="pt-2 border-t border-white/5">
                <div className="text-muted-foreground mb-1">Hash snapshot</div>
                <code className="text-xs bg-black/20 px-2 py-1 rounded font-mono break-all">
                  {version.snapshot_hash}
                </code>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
