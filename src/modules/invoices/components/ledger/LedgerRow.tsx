import { Invoice } from '@/shared/types';
import { formatLedgerAmount } from '@/shared/lib/ledger-utils';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Badge } from '@/shared/ui/badge';
import { MoreVertical, Eye, Download, Edit, Trash2, Share2, Copy, CreditCard, BookOpen } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Button } from '@/shared/ui/button';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useState, useMemo, useEffect, useRef } from 'react';

interface LedgerRowProps {
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

export function LedgerRow({
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
}: LedgerRowProps) {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);
  const isProfileVatExempt = selectedProfile?.is_vat_exempt || false;
  
  const isVatExempt = invoice.fakturaBezVAT || invoice.vat === false;
  const amount = isVatExempt ? (invoice.totalNetValue || 0) : (invoice.totalGrossValue || invoice.totalAmount || 0);
  const isPaid = invoice.isPaid || invoice.paid;
  const isOverdue = new Date(invoice.dueDate) < new Date() && !isPaid;
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

  const handleRowClick = () => {
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

  return (
    <div
      className={cn(
        "group relative flex items-center justify-between px-5 py-4",
        "bg-card hover:bg-accent/50 focus-within:bg-accent/50 transition-all duration-150 cursor-pointer",
        "border-b border-border/30",
        "hover:shadow-sm hover:-translate-y-[1px]",
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px]",
        "before:bg-transparent before:transition-colors",
        isOverdue && "before:bg-red-500",
        !isPaid && !isOverdue && "before:bg-amber-400",
        isPaid && "before:bg-transparent hover:before:bg-green-400/30"
      )}
      onClick={handleRowClick}
      onContextMenu={handleContextMenu}
    >
      <div className="flex items-center gap-6 flex-1 min-w-0">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-semibold text-foreground leading-tight">
              {invoice.customerName || 'Brak kontrahenta'}
            </span>
            <span className="text-xs text-muted-foreground/70 font-medium">
              {invoice.number}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{format(new Date(invoice.issueDate), 'd MMM yyyy', { locale: pl })}</span>
            {invoice.dueDate && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span>Termin: {format(new Date(invoice.dueDate), 'd MMM', { locale: pl })}</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {invoice.ryczalt_account_id ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1 p-1.5">
              <BookOpen className="w-3 h-3" />
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1 p-1.5">
              <BookOpen className="w-3 h-3" />
            </Badge>
          )}
          
          {isPaid ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs font-semibold">
              Zapłacone
            </Badge>
          ) : isOverdue ? (
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-xs font-semibold">
              Przeterminowane
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-semibold">
              Do zapłaty
            </Badge>
          )}
          
          {isVatExempt && !isProfileVatExempt && (
            <Badge variant="outline" className="text-xs font-medium bg-muted/50">
              Bez VAT
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-lg font-mono font-semibold tabular-nums text-right min-w-[140px]">
          {formatLedgerAmount(amount, invoice.currency || 'PLN')}
        </div>
        
        <DropdownMenu open={isDropdownOpen} onOpenChange={handleDropdownOpenChange}>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              ref={dropdownButtonRef}
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 text-muted-foreground/40 group-hover:text-foreground/80 group-hover:bg-accent transition-all"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
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
