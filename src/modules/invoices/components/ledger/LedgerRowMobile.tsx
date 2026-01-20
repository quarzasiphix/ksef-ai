import { Invoice } from '@/shared/types';
import { formatLedgerAmount } from '@/shared/lib/ledger-utils';
import { Badge } from '@/shared/ui/badge';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Button } from '@/shared/ui/button';

interface LedgerRowMobileProps {
  invoice: Invoice;
  isIncome?: boolean;
  onView?: (id: string) => void;
  onPreview?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onTogglePaid?: (id: string, invoice: Invoice) => void;
}

export function LedgerRowMobile({
  invoice,
  isIncome = true,
  onView,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  onShare,
  onDuplicate,
  onTogglePaid,
}: LedgerRowMobileProps) {
  const isVatExempt = invoice.fakturaBezVAT || invoice.vat === false;
  const amount = isVatExempt ? (invoice.totalNetValue || 0) : (invoice.totalGrossValue || invoice.totalAmount || 0);
  const isPaid = invoice.isPaid || invoice.paid;
  const isOverdue = new Date(invoice.dueDate) < new Date() && !isPaid;

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (onView) {
      onView(invoice.id);
    }
  };

  const getStatusBadge = () => {
    if (isPaid) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
          Opłacona
        </Badge>
      );
    }
    if (isOverdue) {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
          Przeterminowana
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
        Oczekuje
      </Badge>
    );
  };

  return (
    <div
      className={cn(
        "relative px-4 py-3 active:bg-muted/50 transition-colors",
        "border-b border-border/50"
      )}
      onClick={handleRowClick}
    >
      {/* Line 1: Contractor + Amount */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {invoice.customerName || 'Brak kontrahenta'}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-base font-mono font-semibold tabular-nums text-right whitespace-nowrap">
            {formatLedgerAmount(amount, invoice.currency || 'PLN')}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 -mt-1"
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onTogglePaid && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePaid(invoice.id, invoice); }}>
                  {isPaid ? 'Oznacz jako niezapłacone' : 'Oznacz jako zapłacone'}
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(invoice.id); }}>
                  Edytuj
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(invoice.id); }}>
                  Duplikuj
                </DropdownMenuItem>
              )}
              {onShare && isIncome && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(invoice.id); }}>
                  Udostępnij
                </DropdownMenuItem>
              )}
              {onDownload && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(invoice); }}>
                  Pobierz PDF
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(invoice.id); }}
                  className="text-red-600"
                >
                  Usuń
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Line 2: Doc number + date | Status */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {invoice.number} • {format(new Date(invoice.issueDate), 'dd.MM.yyyy', { locale: pl })}
        </div>
        <div>
          {getStatusBadge()}
        </div>
      </div>
    </div>
  );
}
