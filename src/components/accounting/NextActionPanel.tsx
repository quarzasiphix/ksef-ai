import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NextAction {
  id: string;
  title: string;
  description: string;
  action?: () => void;
  href?: string;
  variant?: 'info' | 'warning' | 'success';
  dismissible?: boolean;
}

interface NextActionPanelProps {
  actions: (NextAction | null | undefined)[];
  onDismiss?: (actionId: string) => void;
  className?: string;
}

export const NextActionPanel: React.FC<NextActionPanelProps> = ({
  actions,
  onDismiss,
  className,
}) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const normalizedActions = React.useMemo(
    () => (actions ?? []).filter((action): action is NextAction => Boolean(action)),
    [actions]
  );

  const visibleActions = normalizedActions.filter(action => !dismissed.has(action.id));

  if (visibleActions.length === 0) return null;

  const handleDismiss = (actionId: string) => {
    setDismissed(prev => new Set([...prev, actionId]));
    onDismiss?.(actionId);
  };

  const handleActionClick = (action: NextAction) => {
    if (action.action) {
      action.action();
    } else if (action.href) {
      navigate(action.href);
    }
  };

  const getIcon = (variant?: string) => {
    switch (variant) {
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBorderColor = (variant?: string) => {
    switch (variant) {
      case 'warning':
        return 'border-l-amber-400';
      case 'success':
        return 'border-l-green-400';
      default:
        return 'border-l-blue-400';
    }
  };

  return (
    <Card className={cn('border-l-4 border-l-blue-400', className)}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-3 mb-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Następny krok</h3>
            <p className="text-xs text-muted-foreground">
              Sugerowane działania, aby wszystko było w porządku
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {visibleActions.map((action) => (
            <div
              key={action.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group',
                getBorderColor(action.variant),
                'border-l-4'
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(action.variant)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{action.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {action.description}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {(action.action || action.href) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs opacity-70 group-hover:opacity-100"
                    onClick={() => handleActionClick(action)}
                  >
                    Przejdź
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
                {action.dismissible && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-50 hover:opacity-100"
                    onClick={() => handleDismiss(action.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default NextActionPanel;
