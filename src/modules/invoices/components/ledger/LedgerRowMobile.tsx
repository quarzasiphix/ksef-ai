import { Invoice } from '@/shared/types';
import { formatLedgerAmount } from '@/shared/lib/ledger-utils';
import { Badge } from '@/shared/ui/badge';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useState, useMemo, useRef } from 'react';
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
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (onView) {
      onView(invoice.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Open dropdown by setting state directly
    setIsDropdownOpen(true);
  };

  const handleDropdownOpenChange = (open: boolean) => {
    setIsDropdownOpen(open);
  };

  const getStatusBadge = () => {
    if (isPaid) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs font-semibold">
          Opłacona
        </Badge>
      );
    }
    if (isOverdue) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-xs font-semibold">
          Przeterminowana
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-semibold">
        Oczekuje
      </Badge>
    );
  };

  return (
    <div
      className={cn(
        "relative px-4 py-5 active:bg-accent/60 transition-all duration-150",
        "border-b border-border/30 bg-card",
        "active:scale-[0.98]",
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px]",
        "before:bg-transparent before:transition-colors",
        isOverdue && "before:bg-red-500",
        !isPaid && !isOverdue && "before:bg-amber-400",
        isPaid && "before:bg-transparent active:before:bg-green-400/30"
      )}
      onClick={handleRowClick}
      onContextMenu={handleContextMenu}
    >
      {/* Line 1: Contractor + Amount */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-foreground truncate leading-tight">
            {invoice.customerName || 'Brak kontrahenta'}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-lg font-mono font-bold tabular-nums text-right whitespace-nowrap">
            {formatLedgerAmount(amount, invoice.currency || 'PLN')}
          </div>
          <DropdownMenu open={isDropdownOpen} onOpenChange={handleDropdownOpenChange}>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                ref={dropdownButtonRef}
                variant="ghost"
                size="sm"
                className="h-auto w-10 px-1 py-1 -mt-1 rounded-md bg-muted/60 group-hover:bg-muted/80 active:bg-muted/90 text-foreground/60 group-hover:text-foreground/80 transition-all flex flex-col justify-center"
              >
                <MoreVertical className="h-5 w-5 flex-shrink-0" />
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{invoice.number}</span>
          <span className="text-muted-foreground/40">•</span>
          <span>{format(new Date(invoice.issueDate), 'd MMM yyyy', { locale: pl })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {getStatusBadge()}
          {isVatExempt && (
            <Badge variant="outline" className="text-xs font-medium bg-muted/50">
              Bez VAT
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
