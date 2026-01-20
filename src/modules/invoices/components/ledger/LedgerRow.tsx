import { Invoice } from '@/shared/types';
import { formatLedgerAmount } from '@/shared/lib/ledger-utils';
import { Badge } from '@/shared/ui/badge';
import { MoreVertical, Eye, Download, Edit, Trash2, Share2, Copy, CreditCard } from 'lucide-react';
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
  const isVatExempt = invoice.fakturaBezVAT || invoice.vat === false;
  const amount = isVatExempt ? (invoice.totalNetValue || 0) : (invoice.totalGrossValue || invoice.totalAmount || 0);
  const isPaid = invoice.isPaid || invoice.paid;
  const isOverdue = new Date(invoice.dueDate) < new Date() && !isPaid;

  const handleRowClick = () => {
    if (onView) {
      onView(invoice.id);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center justify-between px-4 py-3",
        "hover:bg-muted/30 transition-colors cursor-pointer",
        "border-b border-border/50"
      )}
      onClick={handleRowClick}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {invoice.number}
          </span>
          <span className="text-sm text-muted-foreground truncate">
            {invoice.customerName || 'Brak kontrahenta'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isPaid ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Zapłacone
            </Badge>
          ) : isOverdue ? (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              Przeterminowane
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Do zapłaty
            </Badge>
          )}
          
          {isVatExempt && (
            <Badge variant="outline" className="text-xs">
              Bez VAT
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-base font-mono font-medium tabular-nums text-right min-w-[120px]">
          {formatLedgerAmount(amount, invoice.currency || 'PLN')}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
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
