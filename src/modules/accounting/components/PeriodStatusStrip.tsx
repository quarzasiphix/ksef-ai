import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { AlertTriangle, Lock, CheckCircle2, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';

interface PeriodStatusStripProps {
  status: 'pending' | 'ready' | 'closed' | 'locked' | 'overdue';
  deadline: Date;
  issueCount?: number;
  onClosePeriod?: () => void;
  onFixIssues?: () => void;
  onViewClosureProtocol?: () => void;
  closedBy?: string;
  closedAt?: Date;
}

export function PeriodStatusStrip({
  status,
  deadline,
  issueCount = 0,
  onClosePeriod,
  onFixIssues,
  onViewClosureProtocol,
  closedBy,
  closedAt
}: PeriodStatusStripProps) {
  const now = new Date();
  const daysRemaining = differenceInDays(deadline, now);
  const isOverdue = daysRemaining < 0;

  const getStatusBadge = () => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Do rozliczenia
          </Badge>
        );
      case 'ready':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Gotowe
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
            <Lock className="h-3 w-3" />
            Zamknięty
          </Badge>
        );
      case 'locked':
        return (
          <Badge variant="outline" className="gap-1 border-gray-500 text-gray-700">
            <Lock className="h-3 w-3" />
            Zablokowany
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Po terminie
          </Badge>
        );
    }
  };

  const getDeadlineText = () => {
    if (isOverdue) {
      return (
        <span className="text-destructive font-medium">
          Po terminie: {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'dzień' : 'dni'}
        </span>
      );
    }
    return (
      <span className="text-muted-foreground">
        Pozostało: <span className="font-medium text-foreground">{daysRemaining}</span> {daysRemaining === 1 ? 'dzień' : 'dni'}
      </span>
    );
  };

  const getPrimaryCTA = () => {
    if (status === 'closed' || status === 'locked') {
      return (
        <Button variant="outline" size="sm" onClick={onViewClosureProtocol}>
          Zobacz protokół zamknięcia
        </Button>
      );
    }

    if (issueCount > 0) {
      return (
        <Button variant="default" size="sm" onClick={onFixIssues} className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          Napraw ({issueCount})
        </Button>
      );
    }

    if (status === 'ready') {
      return (
        <Button variant="default" size="sm" onClick={onClosePeriod}>
          Zamknij okres
        </Button>
      );
    }

    return null;
  };

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              {getStatusBadge()}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Termin:</span>
              <span className="text-sm font-medium">{format(deadline, 'dd MMMM yyyy', { locale: pl })}</span>
              <span className="text-sm">•</span>
              {getDeadlineText()}
            </div>

            {(status === 'closed' || status === 'locked') && closedBy && closedAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Zamknięto przez:</span>
                <span className="font-medium text-foreground">{closedBy}</span>
                <span>•</span>
                <span>{format(closedAt, 'dd MMM yyyy, HH:mm', { locale: pl })}</span>
              </div>
            )}
          </div>

          <div>{getPrimaryCTA()}</div>
        </div>
      </CardContent>
    </Card>
  );
}
