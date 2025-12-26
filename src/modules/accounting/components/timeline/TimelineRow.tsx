import React from 'react';
import { format } from 'date-fns';
import TimelineRail from './TimelineRail';
import LedgerEventCard from './LedgerEventCard';
import type { TimelineRowProps } from '../../types/timeline';

export const TimelineRow: React.FC<TimelineRowProps> = ({
  event,
  isFirstInGroup,
  isLastInGroup,
  onClick,
  onShowAudit,
  auditHint,
}) => {
  const timeLabel = format(new Date(event.occurredAt), 'HH:mm');
  
  // Determine node color based on direction and status
  const getNodeColor = () => {
    if (event.status === 'pending' && event.direction === 'in') {
      return 'bg-amber-500 dark:bg-amber-400';
    }
    if (event.direction === 'in') {
      return 'bg-green-500 dark:bg-green-400';
    }
    if (event.direction === 'out') {
      return 'bg-red-500 dark:bg-red-400';
    }
    return 'bg-slate-400 dark:bg-slate-500';
  };

  return (
    <div className="grid grid-cols-[64px_1fr] gap-3 py-2">
      {/* Column A: Timeline Rail */}
      <TimelineRail
        isFirstInGroup={isFirstInGroup}
        isLastInGroup={isLastInGroup}
        timeLabel={isFirstInGroup ? timeLabel : undefined}
        nodeColor={getNodeColor()}
      />
      
      {/* Column B: Event Card */}
      <LedgerEventCard
        event={event}
        onClick={() => onClick?.(event)}
        onShowAudit={onShowAudit}
        auditHint={auditHint}
      />
    </div>
  );
};

export default TimelineRow;
