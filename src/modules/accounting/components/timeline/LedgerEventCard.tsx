import React from 'react';
import { cn } from '@/shared/lib/utils';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { 
  FileText, 
  Receipt, 
  FileSignature, 
  Landmark,
  Wallet,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { TimelineLedgerEvent } from '../../types/timeline';

interface LedgerEventCardProps {
  event: TimelineLedgerEvent;
  onClick?: () => void;
  onShowAudit?: () => void;
  auditHint?: {
    recordedAt: string;
    actorName: string;
    isDelayed?: boolean;
    isBackdated?: boolean;
  };
}

const getSourceIcon = (source: string) => {
  switch (source) {
    case 'invoice':
      return FileText;
    case 'expense':
      return Receipt;
    case 'contract':
      return FileSignature;
    case 'bank':
      return Landmark;
    case 'cash':
      return Wallet;
    case 'payment':
      return ArrowDownRight;
    default:
      return FileText;
  }
};

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'posted':
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case 'pending':
      return <Clock className="h-3 w-3 text-amber-500" />;
    case 'failed':
      return <XCircle className="h-3 w-3 text-red-500" />;
    case 'cancelled':
      return <XCircle className="h-3 w-3 text-slate-400" />;
    default:
      return null;
  }
};

const getSourceLabel = (source: string) => {
  const labels: Record<string, string> = {
    bank: 'Bank',
    cash: 'Kasa',
    invoice: 'Faktura',
    expense: 'Wydatek',
    contract: 'Umowa',
    payment: 'Płatność',
    adjustment: 'Korekta',
  };
  return labels[source] || source;
};

export const LedgerEventCard: React.FC<LedgerEventCardProps> = ({ event, onClick, onShowAudit, auditHint }) => {
  const Icon = getSourceIcon(event.source);
  const isPending = event.status === 'pending';
  const isIn = event.direction === 'in';
  const isOut = event.direction === 'out';

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border transition-all",
        "hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm",
        "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800",
        "p-4"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Icon + Title/Subtitle */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
            isPending && isIn && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            !isPending && isIn && "bg-green-500/10 text-green-600 dark:text-green-400",
            isOut && "bg-red-500/10 text-red-600 dark:text-red-400",
            event.direction === 'neutral' && "bg-slate-500/10 text-slate-600 dark:text-slate-400"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                {event.title}
              </span>
              {event.status && getStatusIcon(event.status)}
              {isPending && isIn && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <Clock className="h-2.5 w-2.5" />
                  Do wpływu
                </span>
              )}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
              {event.subtitle}
            </div>
            
            {/* Decision reference for spółka */}
            {event.meta?.decisionReference && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                <FileSignature className="h-3 w-3" />
                <span>Decyzja: {event.meta.decisionReference}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Amount + Source */}
        <div className="flex-shrink-0 text-right space-y-1">
          <div className={cn(
            "text-xl font-semibold tabular-nums",
            isPending && isIn && "text-amber-600 dark:text-amber-400",
            !isPending && isIn && "text-green-600 dark:text-green-400",
            isOut && "text-red-600 dark:text-red-400",
            event.direction === 'neutral' && "text-slate-600 dark:text-slate-400"
          )}>
            {isIn && '+'}
            {isOut && '−'}
            {formatCurrency(Math.abs(event.amount.value), event.amount.currency)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {getSourceLabel(event.source)}
          </div>
        </div>
      </div>

      {/* Linked documents */}
      {event.linkedDocuments && event.linkedDocuments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
          {event.linkedDocuments.map((doc, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <div className="w-1 h-1 rounded-full bg-slate-400" />
              <span>{doc.relationship}:</span>
              <span className="font-mono text-slate-600 dark:text-slate-300">{doc.number}</span>
            </div>
          ))}
        </div>
      )}

      {/* Audit hint line */}
      {auditHint && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
            <span>Dodano: {format(new Date(auditHint.recordedAt), 'dd MMMM yyyy HH:mm', { locale: pl })} • {auditHint.actorName}</span>
            {auditHint.isDelayed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-medium">
                Opóźnione
              </span>
            )}
            {auditHint.isBackdated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-medium">
                Wstecz
              </span>
            )}
          </div>
          {onShowAudit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowAudit();
              }}
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <FileText className="h-3 w-3" />
              Pokaż audyt
            </button>
          )}
        </div>
      )}
    </button>
  );
};

export default LedgerEventCard;
