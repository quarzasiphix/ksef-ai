import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ComplianceHealthBadgeProps {
  ksefStatus: string | null;
  accountingStatus: string | null;
  className?: string;
}

interface ComplianceState {
  icon: React.ReactNode;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}

export function ComplianceHealthBadge({
  ksefStatus,
  accountingStatus,
  className,
}: ComplianceHealthBadgeProps) {
  const getComplianceState = (): ComplianceState => {
    // Fully compliant: KSeF submitted + Accounting posted
    if (ksefStatus === 'submitted' && accountingStatus === 'posted') {
      return {
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Fully Compliant',
        variant: 'default',
        className: 'bg-green-500 text-white hover:bg-green-600',
      };
    }

    // KSeF OK, posting pending
    if (ksefStatus === 'submitted' && accountingStatus === 'needs_review') {
      return {
        icon: <AlertTriangle className="h-3 w-3" />,
        label: 'KSeF OK, Posting Pending',
        variant: 'outline',
        className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500',
      };
    }

    // KSeF OK, not posted yet
    if (ksefStatus === 'submitted' && accountingStatus === 'unposted') {
      return {
        icon: <AlertTriangle className="h-3 w-3" />,
        label: 'KSeF OK, Not Posted',
        variant: 'outline',
        className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500',
      };
    }

    // Posted internally, KSeF failed
    if (ksefStatus === 'error' && accountingStatus === 'posted') {
      return {
        icon: <AlertTriangle className="h-3 w-3" />,
        label: 'Posted, KSeF Failed',
        variant: 'outline',
        className: 'bg-orange-500/10 text-orange-700 border-orange-500',
      };
    }

    // Both failed
    if (ksefStatus === 'error' && accountingStatus === 'unposted') {
      return {
        icon: <XCircle className="h-3 w-3" />,
        label: 'Both Failed',
        variant: 'destructive',
        className: 'bg-red-500 text-white hover:bg-red-600',
      };
    }

    // Posted without KSeF (no KSeF required)
    if ((ksefStatus === 'none' || !ksefStatus) && accountingStatus === 'posted') {
      return {
        icon: <Info className="h-3 w-3" />,
        label: 'Posted (No KSeF)',
        variant: 'outline',
        className: 'bg-blue-500/10 text-blue-700 border-blue-500',
      };
    }

    // KSeF pending
    if (ksefStatus === 'pending') {
      return {
        icon: <Info className="h-3 w-3" />,
        label: 'KSeF Pending',
        variant: 'secondary',
        className: 'bg-slate-500/10 text-slate-700',
      };
    }

    // Default: Pending
    return {
      icon: <Info className="h-3 w-3" />,
      label: 'Pending',
      variant: 'secondary',
      className: 'bg-slate-500/10 text-slate-700',
    };
  };

  const state = getComplianceState();

  return (
    <Badge
      variant={state.variant}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1',
        state.className,
        className
      )}
    >
      {state.icon}
      <span className="text-xs font-medium">{state.label}</span>
    </Badge>
  );
}

export default ComplianceHealthBadge;
