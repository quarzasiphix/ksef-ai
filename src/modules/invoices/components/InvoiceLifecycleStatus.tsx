import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { CheckCircle, Circle, Clock } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type LifecycleStatus = 'draft' | 'issued' | 'sent' | 'payment_received' | 'booked' | 'closed';

interface InvoiceLifecycleStatusProps {
  currentStatus: LifecycleStatus;
  paymentReceivedAt?: string | null;
  bookedToLedger?: boolean;
  bookedAt?: string | null;
  className?: string;
}

const LIFECYCLE_STAGES = [
  { 
    key: 'issued', 
    label: 'Wystawiona', 
    description: 'Faktura wystawiona',
    consequence: 'Dokument istnieje w systemie, ale nie został jeszcze przekazany kontrahentowi ani ujęty w rozliczeniach.'
  },
  { 
    key: 'sent', 
    label: 'Wysłana', 
    description: 'Wysłana do kontrahenta',
    consequence: 'Dokument dostarczony do kontrahenta. Oczekiwanie na płatność.'
  },
  { 
    key: 'payment_received', 
    label: 'Otrzymana płatność', 
    description: 'Płatność otrzymana',
    consequence: 'Środki przypisane do kasy/banku. Wpływa na saldo i wynik finansowy.'
  },
  { 
    key: 'booked', 
    label: 'Rozliczona', 
    description: 'Zaksięgowana w księgach',
    consequence: 'Ujęta w księgach rachunkowych. Wpływa na rozliczenia podatkowe i sprawozdania.'
  },
  { 
    key: 'closed', 
    label: 'Zamknięta', 
    description: 'Finalna, niemodyfikowalna',
    consequence: 'Dokument zamknięty i niemodyfikowalny. Gotowy do archiwizacji i KSeF.'
  },
] as const;

const getStageIndex = (status: LifecycleStatus): number => {
  const index = LIFECYCLE_STAGES.findIndex(s => s.key === status);
  return index === -1 ? 0 : index;
};

const InvoiceLifecycleStatus: React.FC<InvoiceLifecycleStatusProps> = ({
  currentStatus,
  paymentReceivedAt,
  bookedToLedger,
  bookedAt,
  className,
}) => {
  const currentIndex = getStageIndex(currentStatus);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Horizontal Progress Bar */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {LIFECYCLE_STAGES.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;

            return (
              <div key={stage.key} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  {/* Circle */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                      isCompleted && 'bg-green-500 border-green-500',
                      isCurrent && 'bg-blue-500 border-blue-500 ring-4 ring-blue-100',
                      isPending && 'bg-gray-100 border-gray-300'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : isCurrent ? (
                      <Clock className="h-5 w-5 text-white" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="mt-2 text-center">
                    <div
                      className={cn(
                        'text-xs font-medium',
                        isCompleted && 'text-green-700',
                        isCurrent && 'text-blue-700 font-semibold',
                        isPending && 'text-gray-500'
                      )}
                    >
                      {stage.label}
                    </div>
                  </div>
                </div>

                {/* Connecting Line */}
                {index < LIFECYCLE_STAGES.length - 1 && (
                  <div
                    className={cn(
                      'absolute top-5 left-1/2 w-full h-0.5 -z-10',
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    )}
                    style={{ transform: 'translateY(-50%)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Stage Consequence */}
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
          </div>
          <div>
            <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Status: {LIFECYCLE_STAGES[currentIndex]?.label}
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {LIFECYCLE_STAGES[currentIndex]?.consequence}
            </p>
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-3 flex-wrap">
        {paymentReceivedAt && (
          <Badge variant="outline" className="text-green-600 border-green-600">
            💰 Płatność otrzymana
          </Badge>
        )}
        {bookedToLedger && (
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            📘 Zaksięgowana
          </Badge>
        )}
        {!paymentReceivedAt && (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            ⏳ Oczekuje na płatność
          </Badge>
        )}
        {paymentReceivedAt && !bookedToLedger && (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            ⚠️ Opłacona, ale niezaksięgowana
          </Badge>
        )}
      </div>

      {/* Timestamps */}
      {(paymentReceivedAt || bookedAt) && (
        <div className="text-xs text-muted-foreground space-y-1">
          {paymentReceivedAt && (
            <div>
              Płatność otrzymana: {new Date(paymentReceivedAt).toLocaleString('pl-PL')}
            </div>
          )}
          {bookedAt && (
            <div>
              Zaksięgowana: {new Date(bookedAt).toLocaleString('pl-PL')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceLifecycleStatus;
