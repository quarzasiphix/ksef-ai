import React from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import TimelineRow from './TimelineRow';
import type { TimelineDateGroup, TimelineLedgerEvent } from '../../types/timeline';

interface LedgerDateGroupProps {
  group: TimelineDateGroup;
  onEventClick?: (event: TimelineLedgerEvent) => void;
  onShowAudit?: (eventId: string) => void;
  getAuditHint?: (eventId: string) => {
    recordedAt: string;
    actorName: string;
    isDelayed?: boolean;
    isBackdated?: boolean;
  } | undefined;
  hasEventSystem?: (eventId: string) => boolean;
}

export const LedgerDateGroup: React.FC<LedgerDateGroupProps> = ({ group, onEventClick, onShowAudit, getAuditHint, hasEventSystem }) => {
  return (
    <div className="mb-8">
      {/* Date Header */}
      <div className="grid grid-cols-[64px_1fr] gap-3 mb-4">
        {/* Left: Rail continues but no node */}
        <div className="relative flex items-center justify-center">
          <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-slate-200 dark:bg-slate-800" />
        </div>
        
        {/* Right: Date Label */}
        <div className="flex items-center">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {group.dateLabel}
            </h3>
            <div className="mt-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="space-y-0">
        {group.items.map((event, index) => {
          // Only show audit button if event has actual event system entry
          const showAudit = hasEventSystem && hasEventSystem(event.id) && onShowAudit;
          
          return (
            <TimelineRow
              key={event.id}
              event={event}
              isFirstInGroup={index === 0}
              isLastInGroup={index === group.items.length - 1}
              onClick={onEventClick}
              onShowAudit={showAudit ? () => onShowAudit(event.id) : undefined}
              auditHint={getAuditHint ? getAuditHint(event.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};

export default LedgerDateGroup;
