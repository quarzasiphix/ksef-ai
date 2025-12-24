import React from 'react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  ArrowDownCircle
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

interface FinancialControlStripProps {
  // Primary action
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'destructive' | 'success';
  };
  
  // Status
  status: 'issued' | 'sent' | 'payment_received' | 'booked' | 'closed';
  
  // Deadline
  dueDate: string;
  
  // Risk
  isPaid: boolean;
  
  // VAT/JPK
  isVatExempt: boolean;
  isBooked: boolean;
  
  // Company type for JPK logic
  companyType?: 'jdg' | 'spolka';
}

const FinancialControlStrip: React.FC<FinancialControlStripProps> = ({
  primaryAction,
  status,
  dueDate,
  isPaid,
  isVatExempt,
  isBooked,
  companyType = 'jdg',
}) => {
  const today = new Date();
  const deadline = new Date(dueDate);
  const daysUntilDue = differenceInDays(deadline, today);
  const isOverdue = daysUntilDue < 0 && !isPaid;
  const isDueToday = daysUntilDue === 0 && !isPaid;
  const isDueSoon = daysUntilDue > 0 && daysUntilDue <= 3 && !isPaid;

  // Status configuration
  const statusConfig = {
    issued: { label: 'Wystawiona', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: FileText },
    sent: { label: 'Wysłana', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: ArrowDownCircle },
    payment_received: { label: 'Płatność otrzymana', color: 'text-green-700', bgColor: 'bg-green-100', icon: DollarSign },
    booked: { label: 'Zaksięgowana', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
    closed: { label: 'Zamknięta', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
  };

  const currentStatus = statusConfig[status] || statusConfig.issued;
  const StatusIcon = currentStatus.icon;

  // Deadline color logic
  const deadlineColor = isOverdue 
    ? 'text-red-700 bg-red-50' 
    : isDueToday 
    ? 'text-yellow-700 bg-yellow-50' 
    : isDueSoon
    ? 'text-orange-700 bg-orange-50'
    : 'text-gray-700 bg-gray-50';

  // VAT/JPK logic
  const getVatJpkStatus = () => {
    if (isVatExempt) {
      return {
        vatLabel: 'Nie dotyczy',
        jpkLabel: 'Na żądanie',
        vatColor: 'text-gray-600',
        jpkColor: 'text-gray-600',
        tooltip: 'JPK_V7 nie dotyczy. Inne struktury JPK tylko na żądanie US.',
      };
    } else {
      return {
        vatLabel: 'Aktywny',
        jpkLabel: isBooked ? 'Zaksięgowane' : 'Do ujęcia',
        vatColor: 'text-blue-700',
        jpkColor: isBooked ? 'text-green-700' : 'text-orange-700',
        tooltip: isBooked 
          ? 'Dokument ujęty w JPK_V7' 
          : 'Dokument wymaga ujęcia w JPK_V7',
      };
    }
  };

  const vatJpkStatus = getVatJpkStatus();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Desktop: Single Row */}
      <div className="hidden md:flex items-stretch divide-x">
        {/* Primary Action Block */}
        {primaryAction && (
          <div className="flex items-center px-4 py-3 min-w-[200px]">
            <Button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className={cn(
                "w-full h-full",
                primaryAction.variant === 'success' && "bg-green-600 hover:bg-green-700",
                primaryAction.variant === 'destructive' && "bg-red-600 hover:bg-red-700"
              )}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {primaryAction.label}
            </Button>
          </div>
        )}

        {/* Status Block */}
        <div className="flex flex-col justify-center px-4 py-3 min-w-[160px]">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon className={cn("h-4 w-4", currentStatus.color)} />
            <span className="text-xs text-muted-foreground">Status</span>
          </div>
          <div className={cn("text-sm font-semibold px-2 py-0.5 rounded inline-block", currentStatus.bgColor, currentStatus.color)}>
            {currentStatus.label}
          </div>
        </div>

        {/* Deadline Block */}
        <div className="flex flex-col justify-center px-4 py-3 min-w-[160px]">
          <div className="flex items-center gap-2 mb-1">
            <Clock className={cn("h-4 w-4", isOverdue ? "text-red-600" : "text-gray-500")} />
            <span className="text-xs text-muted-foreground">Termin płatności</span>
          </div>
          <div className={cn("text-sm font-semibold px-2 py-0.5 rounded inline-block", deadlineColor)}>
            {format(deadline, 'dd.MM.yyyy', { locale: pl })}
          </div>
        </div>

        {/* Overdue Risk Block */}
        {!isPaid && (
          <div className="flex flex-col justify-center px-4 py-3 min-w-[140px]">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={cn("h-4 w-4", isOverdue ? "text-red-600" : "text-gray-400")} />
              <span className="text-xs text-muted-foreground">Po terminie</span>
            </div>
            <div className={cn(
              "text-sm font-semibold px-2 py-0.5 rounded inline-block",
              isOverdue ? "text-red-700 bg-red-50" : "text-gray-500"
            )}>
              {isOverdue ? `${Math.abs(daysUntilDue)} dni` : '—'}
            </div>
          </div>
        )}

        {/* VAT/JPK Block */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col justify-center px-4 py-3 min-w-[160px] cursor-help">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-muted-foreground">
                    {isVatExempt ? 'Status VAT' : 'JPK'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <div className={cn("text-xs font-medium", vatJpkStatus.vatColor)}>
                    VAT: {vatJpkStatus.vatLabel}
                  </div>
                  <div className={cn("text-xs font-medium", vatJpkStatus.jpkColor)}>
                    JPK: {vatJpkStatus.jpkLabel}
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-[250px]">{vatJpkStatus.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Mobile: 2 Rows */}
      <div className="md:hidden">
        {/* Row 1: Primary Action */}
        {primaryAction && (
          <div className="p-3 border-b">
            <Button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className={cn(
                "w-full",
                primaryAction.variant === 'success' && "bg-green-600 hover:bg-green-700",
                primaryAction.variant === 'destructive' && "bg-red-600 hover:bg-red-700"
              )}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {primaryAction.label}
            </Button>
          </div>
        )}

        {/* Row 2: Status Grid (2x2) */}
        <div className="grid grid-cols-2 divide-x divide-y">
          {/* Status */}
          <div className="flex flex-col justify-center px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <StatusIcon className={cn("h-3.5 w-3.5", currentStatus.color)} />
              <span className="text-xs text-muted-foreground">Status</span>
            </div>
            <div className={cn("text-xs font-semibold px-1.5 py-0.5 rounded inline-block", currentStatus.bgColor, currentStatus.color)}>
              {currentStatus.label}
            </div>
          </div>

          {/* Deadline */}
          <div className="flex flex-col justify-center px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className={cn("h-3.5 w-3.5", isOverdue ? "text-red-600" : "text-gray-500")} />
              <span className="text-xs text-muted-foreground">Termin</span>
            </div>
            <div className={cn("text-xs font-semibold px-1.5 py-0.5 rounded inline-block", deadlineColor)}>
              {format(deadline, 'dd.MM.yyyy', { locale: pl })}
            </div>
          </div>

          {/* Overdue */}
          {!isPaid && (
            <div className="flex flex-col justify-center px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className={cn("h-3.5 w-3.5", isOverdue ? "text-red-600" : "text-gray-400")} />
                <span className="text-xs text-muted-foreground">Po terminie</span>
              </div>
              <div className={cn(
                "text-xs font-semibold px-1.5 py-0.5 rounded inline-block",
                isOverdue ? "text-red-700 bg-red-50" : "text-gray-500"
              )}>
                {isOverdue ? `${Math.abs(daysUntilDue)} dni` : '—'}
              </div>
            </div>
          )}

          {/* VAT/JPK */}
          <div className="flex flex-col justify-center px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs text-muted-foreground">
                {isVatExempt ? 'VAT' : 'JPK'}
              </span>
            </div>
            <div className="space-y-0.5">
              <div className={cn("text-xs font-medium", vatJpkStatus.vatColor)}>
                {vatJpkStatus.vatLabel}
              </div>
              <div className={cn("text-xs font-medium", vatJpkStatus.jpkColor)}>
                {vatJpkStatus.jpkLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialControlStrip;
