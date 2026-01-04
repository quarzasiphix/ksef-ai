import React from 'react';
import LedgerDateGroup from './LedgerDateGroup';
import type { TimelineDateGroup, TimelineLedgerEvent } from '../../types/timeline';

interface LedgerTimelineListProps {
  groups: TimelineDateGroup[];
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

export const LedgerTimelineList: React.FC<LedgerTimelineListProps> = ({ groups, onEventClick, onShowAudit, getAuditHint, hasEventSystem }) => {
  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Brak zdarzeń finansowych
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {groups.map((group) => (
        <LedgerDateGroup
          key={group.dateKey}
          group={group}
          onEventClick={onEventClick}
          onShowAudit={onShowAudit}
          getAuditHint={getAuditHint}
          hasEventSystem={hasEventSystem}
        />
      ))}
    </div>
  );
};

export default LedgerTimelineList;
