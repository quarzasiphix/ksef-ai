import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { Shield, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface AuthorizationStatusBadgeProps {
  status: 'active' | 'pending' | 'blocked';
  count?: number;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

export const AuthorizationStatusBadge: React.FC<AuthorizationStatusBadgeProps> = ({
  status,
  count,
  label,
  className,
  showIcon = true,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          icon: Shield,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          text: label || 'Aktywne',
        };
      case 'pending':
        return {
          icon: AlertTriangle,
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800',
          text: label || 'Wymaga uwagi',
        };
      case 'blocked':
        return {
          icon: XCircle,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          text: label || 'Zablokowane',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.borderColor,
        config.color,
        'text-xs',
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {count !== undefined ? `${count} ${config.text}` : config.text}
    </Badge>
  );
};
