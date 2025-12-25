import React from 'react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

interface ActionBarProps {
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'success' | 'warning' | 'danger';
    shortcut?: string;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }>;
  className?: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  primaryAction,
  secondaryActions = [],
  className,
}) => {
  if (!primaryAction && secondaryActions.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 py-3",
      className
    )}>
      {/* Primary action - small, contextual */}
      {primaryAction && (
        <Button
          size="sm"
          variant={primaryAction.variant === 'success' ? 'default' : 'outline'}
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
          className={cn(
            "relative",
            primaryAction.variant === 'success' && "bg-green-600 hover:bg-green-700",
            primaryAction.variant === 'warning' && "bg-amber-600 hover:bg-amber-700",
            primaryAction.variant === 'danger' && "bg-red-600 hover:bg-red-700"
          )}
        >
          {primaryAction.label}
          {primaryAction.shortcut && (
            <span className="ml-2 text-xs opacity-60">
              {primaryAction.shortcut}
            </span>
          )}
        </Button>
      )}

      {/* Secondary actions - small buttons */}
      {secondaryActions.map((action, index) => (
        <Button
          key={index}
          size="sm"
          variant="ghost"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
};

export default ActionBar;
