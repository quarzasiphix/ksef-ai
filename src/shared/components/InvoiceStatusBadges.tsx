/**
 * Dual Status Display - Payment Status + Accounting Status
 * 
 * CRITICAL: These are independent statuses that must ALWAYS be shown together
 * to prevent user confusion ("paid" ≠ "accounted")
 */

import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { CheckCircle, Clock, XCircle, Lock, AlertTriangle, DollarSign } from 'lucide-react';

export type PaymentStatus = 'paid' | 'unpaid' | 'partial' | 'overdue';
export type AccountingStatus = 'unposted' | 'posted' | 'corrected' | 'locked' | 'error';

interface InvoiceStatusBadgesProps {
  paymentStatus: PaymentStatus;
  accountingStatus: AccountingStatus;
  paymentDate?: string;
  postedDate?: string;
  compact?: boolean;
}

export function InvoiceStatusBadges({
  paymentStatus,
  accountingStatus,
  paymentDate,
  postedDate,
  compact = false,
}: InvoiceStatusBadgesProps) {
  return (
    <div className={`flex items-center gap-2 ${compact ? 'flex-wrap' : 'flex-col sm:flex-row'}`}>
      <PaymentStatusBadge 
        status={paymentStatus} 
        date={paymentDate}
        compact={compact}
      />
      <AccountingStatusBadge 
        status={accountingStatus} 
        date={postedDate}
        compact={compact}
      />
    </div>
  );
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  date?: string;
  compact?: boolean;
}

export function PaymentStatusBadge({ status, date, compact }: PaymentStatusBadgeProps) {
  const getConfig = () => {
    switch (status) {
      case 'paid':
        return {
          label: 'Opłacona',
          icon: <DollarSign className="h-3 w-3" />,
          className: 'bg-green-100 text-green-800 border-green-300',
        };
      case 'partial':
        return {
          label: 'Częściowo',
          icon: <Clock className="h-3 w-3" />,
          className: 'bg-amber-100 text-amber-800 border-amber-300',
        };
      case 'overdue':
        return {
          label: 'Po terminie',
          icon: <AlertTriangle className="h-3 w-3" />,
          className: 'bg-red-100 text-red-800 border-red-300',
        };
      case 'unpaid':
      default:
        return {
          label: 'Nieopłacona',
          icon: <XCircle className="h-3 w-3" />,
          className: 'bg-gray-100 text-gray-800 border-gray-300',
        };
    }
  };

  const config = getConfig();

  return (
    <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
      {config.icon}
      <span className="font-medium">{config.label}</span>
      {!compact && date && (
        <span className="text-xs opacity-75 ml-1">
          {new Date(date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
        </span>
      )}
    </Badge>
  );
}

interface AccountingStatusBadgeProps {
  status: AccountingStatus;
  date?: string;
  compact?: boolean;
}

export function AccountingStatusBadge({ status, date, compact }: AccountingStatusBadgeProps) {
  const getConfig = () => {
    switch (status) {
      case 'posted':
        return {
          label: 'Zaksięgowana',
          icon: <CheckCircle className="h-3 w-3" />,
          className: 'bg-blue-100 text-blue-800 border-blue-300',
        };
      case 'locked':
        return {
          label: 'Zablokowana',
          icon: <Lock className="h-3 w-3" />,
          className: 'bg-purple-100 text-purple-800 border-purple-300',
        };
      case 'corrected':
        return {
          label: 'Skorygowana',
          icon: <AlertTriangle className="h-3 w-3" />,
          className: 'bg-amber-100 text-amber-800 border-amber-300',
        };
      case 'error':
        return {
          label: 'Błąd księgowania',
          icon: <XCircle className="h-3 w-3" />,
          className: 'bg-red-100 text-red-800 border-red-300',
        };
      case 'unposted':
      default:
        return {
          label: 'Niezaksięgowana',
          icon: <Clock className="h-3 w-3" />,
          className: 'bg-gray-100 text-gray-800 border-gray-300',
        };
    }
  };

  const config = getConfig();

  return (
    <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
      {config.icon}
      <span className="font-medium">{config.label}</span>
      {!compact && date && (
        <span className="text-xs opacity-75 ml-1">
          {new Date(date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
        </span>
      )}
    </Badge>
  );
}

/**
 * Compact inline status for lists
 */
export function InvoiceStatusInline({
  paymentStatus,
  accountingStatus,
}: {
  paymentStatus: PaymentStatus;
  accountingStatus: AccountingStatus;
}) {
  const paymentIcon = paymentStatus === 'paid' ? '💰' : paymentStatus === 'overdue' ? '⚠️' : '⏳';
  const accountingIcon = accountingStatus === 'posted' ? '✓' : accountingStatus === 'locked' ? '🔒' : '○';

  return (
    <span className="text-xs text-muted-foreground">
      {paymentIcon} {accountingIcon}
    </span>
  );
}
