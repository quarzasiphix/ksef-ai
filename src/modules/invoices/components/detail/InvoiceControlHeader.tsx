import React from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  ExternalLink, 
  Download, 
  Edit, 
  MoreHorizontal,
  Eye,
  Share2,
  Trash2,
  FilePlus,
  DollarSign,
  FileText,
  History
} from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { cn } from '@/shared/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Button } from '@/shared/ui/button';

interface InvoiceControlHeaderProps {
  invoiceNumber: string;
  sellerName: string;
  buyerName: string;
  totalGross: number;
  currency: string;
  dueDate: string;
  isPaid: boolean;
  isOverdue: boolean;
  isBooked?: boolean;
  lifecycleStatus?: string;
  onEdit?: () => void;
  onDownload?: () => void;
  onPreview?: () => void;
  onShare?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onTogglePaid?: () => void;
  onPost?: () => void;
  onHistory?: () => void;
  isOwner?: boolean;
  showActions?: boolean;
}

const StatusChip: React.FC<{
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
  icon?: React.ReactNode;
}> = ({ label, variant, icon }) => {
  const colors = {
    success: 'text-green-400 bg-green-500/10',
    warning: 'text-amber-400 bg-amber-500/10',
    danger: 'text-red-400 bg-red-500/10',
    neutral: 'text-blue-400 bg-blue-500/10',
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
      colors[variant]
    )}>
      {icon}
      {label}
    </div>
  );
};

export const InvoiceControlHeader: React.FC<InvoiceControlHeaderProps> = ({
  invoiceNumber,
  sellerName,
  buyerName,
  totalGross,
  currency,
  dueDate,
  isPaid,
  isOverdue,
  isBooked,
  lifecycleStatus,
  onEdit,
  onDownload,
  onPreview,
  onShare,
  onDuplicate,
  onDelete,
  onTogglePaid,
  onPost,
  onHistory,
  isOwner,
  showActions = true,
}) => {
  return (
    <div className="space-y-4">
      {/* Main header - Identity & State */}
      <div className="flex items-start justify-between gap-6">
        {/* Left: Document identity */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Invoice number - Hero */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {invoiceNumber}
            </h1>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Otwórz w nowym oknie"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>

          {/* Parties - Secondary */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{sellerName}</span>
            <span>→</span>
            <span className="font-medium text-foreground">{buyerName}</span>
          </div>

          {/* Status chips - Inline, muted, colored */}
          <div className="flex items-center gap-2 flex-wrap">
            {isPaid ? (
              <StatusChip
                label="Opłacona"
                variant="success"
                icon={<div className="h-1.5 w-1.5 rounded-full bg-green-400" />}
              />
            ) : isOverdue ? (
              <StatusChip
                label="Po terminie"
                variant="danger"
                icon={<div className="h-1.5 w-1.5 rounded-full bg-red-400" />}
              />
            ) : (
              <StatusChip
                label="Nieopłacona"
                variant="warning"
                icon={<div className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
              />
            )}

            {isBooked && (
              <StatusChip
                label="Zaksięgowana"
                variant="neutral"
                icon={<div className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
              />
            )}

            {lifecycleStatus && lifecycleStatus !== 'issued' && (
              <StatusChip
                label={lifecycleStatus}
                variant="neutral"
              />
            )}
          </div>
        </div>

        {/* Right: Financial truth */}
        <div className="flex-shrink-0 text-right space-y-2">
          {/* Amount - Large but neutral */}
          <div className="text-3xl font-semibold tabular-nums">
            {formatCurrency(totalGross, currency)}
          </div>

          {/* Due date - Secondary */}
          <div className="text-sm text-muted-foreground">
            Termin: {dueDate && !isNaN(new Date(dueDate).getTime()) ? format(new Date(dueDate), 'dd MMM yyyy', { locale: pl }) : 'Brak terminu'}
          </div>

          {/* Quick actions - Small icons */}
          {showActions && (
            <div className="flex items-center justify-end gap-1">
              {onPreview && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onPreview}
                  title="Podgląd PDF"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onDownload}
                  title="Pobierz PDF"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {isOwner && onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onEdit}
                  title="Edytuj"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onHistory && (
                      <DropdownMenuItem onClick={() => {
                        console.log('History menu item clicked');
                        onHistory?.();
                      }}>
                        <History className="h-4 w-4 mr-2" />
                        Historia / Audit trail
                      </DropdownMenuItem>
                    )}
                    {onHistory && <DropdownMenuSeparator />}
                    {onShare && (
                      <DropdownMenuItem onClick={onShare}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Udostępnij
                      </DropdownMenuItem>
                    )}
                    {onDuplicate && (
                      <DropdownMenuItem onClick={onDuplicate}>
                        <FilePlus className="h-4 w-4 mr-2" />
                        Duplikuj
                      </DropdownMenuItem>
                    )}
                    {isPaid && onTogglePaid && (
                      <DropdownMenuItem onClick={onTogglePaid}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Cofnij płatność
                      </DropdownMenuItem>
                    )}
                    {!isBooked && onPost && (
                      <DropdownMenuItem onClick={onPost}>
                        <FileText className="h-4 w-4 mr-2" />
                        Zaksięguj
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onDelete} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Usuń
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subtle divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
};

export default InvoiceControlHeader;
