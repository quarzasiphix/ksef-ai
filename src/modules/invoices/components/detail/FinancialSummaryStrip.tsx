import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  variant?: 'neutral' | 'success' | 'warning' | 'danger';
  tooltip?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  icon, 
  label, 
  value, 
  variant = 'neutral',
  tooltip 
}) => {
  const variants = {
    neutral: 'bg-white/[0.02] border-white/5',
    success: 'bg-green-500/5 border-green-500/20',
    warning: 'bg-amber-500/5 border-amber-500/20',
    danger: 'bg-red-500/5 border-red-500/20',
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors",
        variants[variant]
      )}
      title={tooltip}
    >
      <div className="flex-shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-0.5">
          {label}
        </div>
        <div className="text-sm font-medium truncate">
          {value}
        </div>
      </div>
    </div>
  );
};

interface FinancialSummaryStripProps {
  cashflowStatus: 'expected' | 'received' | 'overdue';
  vatStatus: 'applicable' | 'exempt' | 'reverse_charge';
  accountingPeriod: string;
  paymentMethod?: string;
  isBooked?: boolean;
  transactionType: 'income' | 'expense';
}

export const FinancialSummaryStrip: React.FC<FinancialSummaryStripProps> = ({
  cashflowStatus,
  vatStatus,
  accountingPeriod,
  paymentMethod,
  isBooked,
  transactionType,
}) => {
  // Cashflow card
  const getCashflowConfig = () => {
    switch (cashflowStatus) {
      case 'received':
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: 'Cashflow',
          value: 'Otrzymany',
          variant: 'success' as const,
        };
      case 'overdue':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          label: 'Cashflow',
          value: 'Zaległość',
          variant: 'danger' as const,
        };
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          label: 'Cashflow',
          value: 'Oczekiwany',
          variant: 'warning' as const,
        };
    }
  };

  // VAT card
  const getVatConfig = () => {
    switch (vatStatus) {
      case 'exempt':
        return {
          icon: <Receipt className="h-4 w-4" />,
          label: 'VAT',
          value: 'Nie dotyczy',
          variant: 'neutral' as const,
        };
      case 'reverse_charge':
        return {
          icon: <Receipt className="h-4 w-4" />,
          label: 'VAT',
          value: 'Odwrotne obciążenie',
          variant: 'neutral' as const,
        };
      default:
        return {
          icon: <Receipt className="h-4 w-4" />,
          label: 'VAT',
          value: 'Standardowy',
          variant: 'neutral' as const,
        };
    }
  };

  // Impact card
  const getImpactConfig = () => {
    const isIncome = transactionType === 'income';
    return {
      icon: isIncome ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
      label: 'Wynik',
      value: isIncome ? 'Przychód' : 'Koszt',
      variant: 'neutral' as const,
    };
  };

  const cashflowConfig = getCashflowConfig();
  const vatConfig = getVatConfig();
  const impactConfig = getImpactConfig();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Cashflow status */}
      <MetricCard {...cashflowConfig} />

      {/* VAT status */}
      <MetricCard {...vatConfig} />

      {/* Impact */}
      <MetricCard {...impactConfig} />

      {/* Accounting period */}
      <MetricCard
        icon={<Calendar className="h-4 w-4" />}
        label="Okres"
        value={accountingPeriod}
        variant={isBooked ? 'success' : 'neutral'}
        tooltip={isBooked ? 'Zaksięgowano' : 'Okres księgowy'}
      />
    </div>
  );
};

export default FinancialSummaryStrip;
