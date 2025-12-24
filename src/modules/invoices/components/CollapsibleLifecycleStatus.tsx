import React, { useState } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { ChevronDown, ChevronUp, CheckCircle, Circle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface CollapsibleLifecycleStatusProps {
  currentStatus: string;
  paymentReceivedAt?: string;
  bookedToLedger?: boolean;
  bookedAt?: string;
}

const CollapsibleLifecycleStatus: React.FC<CollapsibleLifecycleStatusProps> = ({
  currentStatus,
  paymentReceivedAt,
  bookedToLedger,
  bookedAt,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const LIFECYCLE_STAGES = [
    { key: 'issued', label: 'Wystawiona' },
    { key: 'sent', label: 'Wysłana' },
    { key: 'payment_received', label: 'Otrzymana płatność' },
    { key: 'booked', label: 'Zaksięgowana' },
    { key: 'closed', label: 'Zamknięta' },
  ];

  const getCurrentStageIndex = () => {
    if (bookedToLedger) return 3;
    if (paymentReceivedAt) return 2;
    return LIFECYCLE_STAGES.findIndex(s => s.key === currentStatus);
  };

  const currentStageIndex = getCurrentStageIndex();
  const currentStage = LIFECYCLE_STAGES[currentStageIndex];

  return (
    <div className="space-y-2">
      {/* Compact Status - Always Visible */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">Status przetwarzania:</div>
          <Badge variant="outline" className="font-medium">
            {currentStage?.label || 'Wystawiona'}
          </Badge>
          {paymentReceivedAt && (
            <Badge variant="default" className="bg-green-600">
              💰 Płatność otrzymana
            </Badge>
          )}
          {bookedToLedger && (
            <Badge variant="default" className="bg-blue-600">
              📘 Zaksięgowana
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 px-2"
        >
          <span className="text-xs mr-1">Szczegóły</span>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Expanded Timeline */}
      {isExpanded && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {LIFECYCLE_STAGES.map((stage, index) => {
                const isCompleted = index <= currentStageIndex;
                const isCurrent = index === currentStageIndex;

                return (
                  <div key={stage.key} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <CheckCircle className={`h-5 w-5 ${isCurrent ? 'text-primary' : 'text-green-600'}`} />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {stage.label}
                      </div>
                      {stage.key === 'payment_received' && paymentReceivedAt && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(paymentReceivedAt), "dd.MM.yyyy HH:mm", { locale: pl })}
                        </div>
                      )}
                      {stage.key === 'booked' && bookedAt && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(bookedAt), "dd.MM.yyyy HH:mm", { locale: pl })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CollapsibleLifecycleStatus;
