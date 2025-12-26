import React from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  FileText, 
  Receipt, 
  FileSignature, 
  ArrowDownRight, 
  ArrowUpRight,
  Link2,
  CheckCircle2,
  Clock,
  XCircle,
  Landmark,
  Wallet,
  ArrowLeftRight
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import type { LedgerEvent, DocumentType, MoneyDirection, CashChannel } from '../types/ledger';
import { useOpenTab } from '@/shared/hooks/useOpenTab';

interface LedgerEventRowProps {
  event: LedgerEvent;
  onNavigate?: (documentType: DocumentType, documentId: string) => void;
}

const getDocumentIcon = (type: DocumentType) => {
  switch (type) {
    case 'invoice':
      return FileText;
    case 'expense':
      return Receipt;
    case 'contract':
      return FileSignature;
    case 'payment':
    case 'bank_transaction':
      return ArrowDownRight;
    default:
      return FileText;
  }
};

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
    case 'pending':
      return <Clock className="h-3.5 w-3.5 text-amber-400" />;
    case 'cancelled':
      return <XCircle className="h-3.5 w-3.5 text-red-400" />;
    default:
      return null;
  }
};

export const LedgerEventRow: React.FC<LedgerEventRowProps> = ({ event, onNavigate }) => {
  const { openInvoiceTab, openExpenseTab, openContractTab } = useOpenTab();

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(event.documentType, event.documentId);
      return;
    }

    // Default navigation using workspace tabs
    switch (event.documentType) {
      case 'invoice':
        openInvoiceTab(event.documentId, event.documentNumber);
        break;
      case 'expense':
        openExpenseTab(event.documentId, event.documentNumber);
        break;
      case 'contract':
        openContractTab(event.documentId, event.documentNumber);
        break;
    }
  };

  const Icon = getDocumentIcon(event.documentType);
  const isIncoming = event.direction === 'incoming';
  const isOutgoing = event.direction === 'outgoing';
  const isNeutral = event.direction === 'neutral';
  const isPendingIncoming = isIncoming && event.status === 'pending';

  // Cash channel icon
  const getCashChannelIcon = () => {
    switch (event.cashChannel) {
      case 'bank':
        return <Landmark className="h-3.5 w-3.5" />;
      case 'cash':
        return <Wallet className="h-3.5 w-3.5" />;
      case 'mixed':
        return <ArrowLeftRight className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  const getCashChannelLabel = () => {
    switch (event.cashChannel) {
      case 'bank':
        return 'Bank';
      case 'cash':
        return 'Gotówka';
      case 'mixed':
        return 'Mieszane';
      default:
        return null;
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full group relative",
        "hover:bg-white/[0.02] transition-colors",
        "border-b border-white/5 last:border-0"
      )}
    >
      <div className="flex items-center gap-6 px-6 py-3.5">
        {/* Layer 1: Time - Anchor */}
        <div className="flex-shrink-0 w-20 text-left">
          <div className="text-xs text-muted-foreground">
            {format(new Date(event.timestamp), 'HH:mm')}
          </div>
        </div>

        {/* Layer 2: Event Type - What happened */}
        <div className="flex-shrink-0">
          <div className={cn(
            "w-9 h-9 rounded-md flex items-center justify-center border",
            isPendingIncoming && "bg-amber-500/10 text-amber-300 border-amber-500/30",
            !isPendingIncoming && isIncoming && "bg-green-500/10 text-green-400 border-green-500/20",
            isOutgoing && "bg-red-500/10 text-red-400",
            isNeutral && "bg-amber-500/10 text-amber-400"
          )}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Layer 3: Document Identity - Why it exists */}
        <div className="flex-1 min-w-0 text-left space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {event.eventLabel}
            </span>
            {event.status && getStatusIcon(event.status)}
            {isPendingIncoming && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                <Clock className="h-3 w-3" />
                Do wpływu
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{event.documentNumber}</span>
            <span className="opacity-50">•</span>
            <span className="truncate">{event.counterparty}</span>
          </div>
        </div>

        {/* Layer 4: Money Effect */}
        <div className="flex-shrink-0 text-right min-w-[140px]">
          {!isNeutral ? (
            <div className={cn(
              "text-base font-semibold tabular-nums",
              isPendingIncoming && "text-amber-300",
              !isPendingIncoming && isIncoming && "text-green-400",
              isOutgoing && "text-red-400"
            )}>
              {isIncoming && '+'}
              {isOutgoing && '−'}
              {formatCurrency(Math.abs(event.amount), event.currency)}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              —
            </div>
          )}
        </div>

        {/* Layer 5: Cash Channel - Reality layer */}
        {event.cashChannel !== 'none' && (
          <div className="flex-shrink-0 w-24">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {getCashChannelIcon()}
              <span>{getCashChannelLabel()}</span>
            </div>
          </div>
        )}

        {/* Layer 6: Contextual Links - Shown on hover */}
        {event.linkedDocuments.length > 0 && (
          <div className="flex-shrink-0 w-16 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1.5 text-xs text-blue-400">
              <Link2 className="h-3.5 w-3.5" />
              <span>{event.linkedDocuments.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Expanded linked documents - shown on hover */}
      {event.linkedDocuments.length > 0 && (
        <div className="hidden group-hover:block px-6 pb-3 pt-0">
          <div className="ml-32 space-y-1.5">
            {event.linkedDocuments.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <div className="w-1 h-1 rounded-full bg-blue-400/50" />
                <span className="text-muted-foreground">{link.relationship}:</span>
                <span className="text-blue-400 font-mono">{link.number}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </button>
  );
};

export default LedgerEventRow;
