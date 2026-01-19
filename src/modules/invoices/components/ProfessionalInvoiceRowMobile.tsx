import React from 'react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { 
  MoreVertical, 
  Eye, 
  Download, 
  Edit, 
  Trash2, 
  Share2,
  FilePlus,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { Invoice } from '@/shared/types';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';

interface ProfessionalInvoiceRowMobileProps {
  invoice: Invoice;
  isIncome: boolean;
  onView: (id: string) => void;
  onPreview: (invoice: Invoice) => void;
  onDownload: (invoice: Invoice) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onShare?: (id: string) => void;
  onDuplicate: (id: string) => void;
  onTogglePaid: (id: string, invoice: Invoice) => void;
}

const ProfessionalInvoiceRowMobile: React.FC<ProfessionalInvoiceRowMobileProps> = ({
  invoice,
  isIncome,
  onView,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  onShare,
  onDuplicate,
  onTogglePaid,
}) => {
  // Get business profile context
  const { profiles: businessProfiles } = useBusinessProfile();
  
  // Calculate state
  const isPaid = invoice.isPaid || invoice.paid;
  const isBooked = (invoice as any).booked_to_ledger;
  const hasDecision = !!invoice.decisionId;
  const isOverdue = invoice.dueDate && !isPaid && new Date(invoice.dueDate) < new Date();
  const isVatExempt = invoice.fakturaBezVAT || invoice.vat === false;
  
  // Check if this is a JDG entity
  const businessProfile = businessProfiles.find(p => p.id === invoice.businessProfileId);
  const isJDG = businessProfile?.entityType === 'dzialalnosc';
  
  // Calculate time pressure
  const getDueDateStatus = () => {
    if (!invoice.dueDate || isPaid) return null;
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return { label: 'Zaległa', color: 'text-red-600 dark:text-red-400', urgent: true };
    }
    if (daysUntilDue <= 7) {
      return { label: `Termin za ${daysUntilDue}d`, color: 'text-amber-600 dark:text-amber-400', urgent: false };
    }
    return { label: `Termin: ${format(dueDate, 'dd.MM.yyyy', { locale: pl })}`, color: 'text-muted-foreground', urgent: false };
  };
  
  const dueDateStatus = getDueDateStatus();

  // Get payment status
  const getPaymentStatus = () => {
    if (isPaid && isBooked) {
      return { label: 'Rozliczona', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle };
    }
    if (isPaid && !isBooked) {
      return { label: 'Opłacona', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircle };
    }
    if (isOverdue) {
      return { label: 'Po terminie', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: AlertCircle };
    }
    return { label: 'Nieopłacona', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock };
  };

  const paymentStatus = getPaymentStatus();
  const StatusIcon = paymentStatus.icon;

  // Get contractor name
  const contractorName = isIncome ? invoice.customerName : invoice.businessName;

  return (
    <div
      className="relative py-3 px-4 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border last:border-0"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[role="menu"]') || (e.target as HTMLElement).closest('button')) {
          return;
        }
        onView(invoice.id);
      }}
    >
      {/* Compact 2-line mobile layout */}
      <div className="space-y-1.5">
        {/* TOP LINE: Number, Amount */}
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-sm">{invoice.number}</span>
          <div className="flex-shrink-0 text-right">
            <div className="text-xl font-semibold">
              {formatCurrency(isVatExempt ? (invoice.totalNetValue || 0) : (invoice.totalGrossValue || invoice.totalAmount || 0), invoice.currency || 'PLN')}
            </div>
            {invoice.currency && invoice.currency !== 'PLN' && invoice.exchangeRate && (
              <div className="text-xs text-muted-foreground">
                {formatCurrency((isVatExempt ? (invoice.totalNetValue || 0) : (invoice.totalGrossValue || invoice.totalAmount || 0)) * invoice.exchangeRate, 'PLN')}
              </div>
            )}
          </div>
        </div>
        
        {/* Counterparty */}
        <div className="text-sm text-muted-foreground">
          {contractorName}
          {isVatExempt && <span className="ml-1">• Bez VAT</span>}
        </div>

        {/* BOTTOM LINE: Dates, Status, System State */}
        <div className="flex flex-wrap items-center gap-2 text-xs opacity-75">
          <span className="text-muted-foreground">
            {format(new Date(invoice.issueDate), 'dd.MM.yyyy', { locale: pl })}
          </span>
          {dueDateStatus && (
            <span className={`flex items-center gap-1 ${dueDateStatus.color}`}>
              {dueDateStatus.urgent && <AlertCircle className="h-3 w-3" />}
              {dueDateStatus.label}
            </span>
          )}
        </div>
        
        {/* Status badges row */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`${paymentStatus.color} flex items-center gap-1 text-xs`}>
            <StatusIcon className="h-3 w-3" />
            {paymentStatus.label}
          </Badge>
          {isPaid && !isBooked && (
            <span className="flex items-center gap-1 text-yellow-700 dark:text-yellow-400 text-xs">
              <Clock className="h-3 w-3" />
              <span>Niezaksięgowana</span>
            </span>
          )}
          {isBooked && (
            <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 text-xs">
              <BookOpen className="h-3 w-3" />
              <span>Zaksięgowane</span>
            </span>
          )}
          {!hasDecision && (invoice.totalGrossValue || 0) >= 3500 && !isJDG && (
            <span className="flex items-center gap-1 text-orange-700 dark:text-orange-400 text-xs">
              <AlertCircle className="h-3 w-3" />
              <span>Wymaga decyzji</span>
            </span>
          )}
        </div>
      </div>

      {/* Actions (always visible on mobile, top-right) */}
      <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onView(invoice.id)}>
              <Eye className="h-4 w-4 mr-2" />
              Otwórz
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPreview(invoice)}>
              <Eye className="h-4 w-4 mr-2" />
              Podgląd PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(invoice)}>
              <Download className="h-4 w-4 mr-2" />
              Pobierz PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(invoice.id)}>
              <Edit className="h-4 w-4 mr-2" />
              Edytuj
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(invoice.id)}>
              <FilePlus className="h-4 w-4 mr-2" />
              Duplikuj
            </DropdownMenuItem>
            {onShare && isIncome && (
              <DropdownMenuItem onClick={() => onShare(invoice.id)}>
                <Share2 className="h-4 w-4 mr-2" />
                Udostępnij
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onTogglePaid(invoice.id, invoice)}>
              <DollarSign className="h-4 w-4 mr-2" />
              {isPaid ? 'Cofnij płatność' : 'Oznacz jako opłaconą'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(invoice.id)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Usuń
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default ProfessionalInvoiceRowMobile;
