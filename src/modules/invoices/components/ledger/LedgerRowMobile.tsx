import React from 'react';
import { Invoice } from '@/shared/types';
import { formatLedgerAmount } from '@/shared/lib/ledger-utils';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';
import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Eye, Download, Edit, Copy, Share2, Trash2, CreditCard, BookOpen } from 'lucide-react';
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
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);
  const isProfileVatExempt = selectedProfile?.is_vat_exempt || false;
  
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
        "relative flex px-4 py-5 active:bg-accent/60 transition-all duration-150",
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
      {/* Content Column - Left side */}
      <div className="flex-1 min-w-0">
        {/* Line 1: Contractor */}
        <div className="text-base font-semibold text-foreground truncate leading-tight mb-2">
          {invoice.customerName || 'Brak kontrahenta'}
        </div>

        {/* Line 2: Doc number + date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className="font-medium">{invoice.number}</span>
          <span className="text-muted-foreground/40">•</span>
          <span>{format(new Date(invoice.issueDate), 'd MMM yyyy', { locale: pl })}</span>
        </div>

        {/* Line 3: Status + Amount */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {invoice.accountingStatus === 'posted' ? (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs font-semibold flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Rozliczona
              </Badge>
            ) : invoice.accountingStatus && invoice.accountingStatus !== 'unposted' ? (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-semibold flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {invoice.accountingStatus === 'needs_review' ? 'Do sprawdzenia' : invoice.accountingStatus === 'rejected' ? 'Odrzucona' : invoice.accountingStatus}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-xs font-semibold flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Nierozliczona
              </Badge>
            )}
            {getStatusBadge()}
            {isVatExempt && !isProfileVatExempt && (
              <Badge variant="outline" className="text-xs font-medium bg-muted/50">
                Bez VAT
              </Badge>
            )}
          </div>
          <div className="text-lg font-mono font-bold tabular-nums text-right whitespace-nowrap">
            {formatLedgerAmount(amount, invoice.currency || 'PLN')}
          </div>
        </div>
      </div>

      {/* Action Column - Right side, spans full height */}
      <div className="w-12 min-h-[44px] ml-3 flex items-center justify-center">
        <DropdownMenu open={isDropdownOpen} onOpenChange={handleDropdownOpenChange}>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button
              ref={dropdownButtonRef}
              className="h-11 w-11 rounded-lg bg-muted/30 hover:bg-muted/50 active:bg-muted/70 text-muted-foreground hover:text-foreground active:text-foreground transition-all flex items-center justify-center border border-border/20"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onView && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(invoice.id); }}>
                  <Eye className="mr-2 h-4 w-4" />
                  Podgląd
                </DropdownMenuItem>
              )}
              {onPreview && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(invoice); }}>
                  <Eye className="mr-2 h-4 w-4" />
                  Podgląd PDF
                </DropdownMenuItem>
              )}
              {onDownload && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(invoice); }}>
                  <Download className="mr-2 h-4 w-4" />
                  Pobierz PDF
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onTogglePaid && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePaid(invoice.id, invoice); }}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isPaid ? 'Oznacz jako niezapłacone' : 'Oznacz jako zapłacone'}
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(invoice.id); }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edytuj
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(invoice.id); }}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplikuj
                </DropdownMenuItem>
              )}
              {onShare && isIncome && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(invoice.id); }}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Udostępnij
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(invoice.id); }}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Usuń
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
    </div>
  );
}
