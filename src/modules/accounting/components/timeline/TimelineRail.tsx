import React from 'react';
import { cn } from '@/shared/lib/utils';

interface TimelineRailProps {
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  timeLabel?: string;
  nodeColor?: string;
}

export const TimelineRail: React.FC<TimelineRailProps> = ({
  isFirstInGroup,
  isLastInGroup,
  timeLabel,
  nodeColor = 'bg-slate-400 dark:bg-slate-600',
}) => {
  return (
    <div className="relative flex items-center justify-center w-16">
      {/* Vertical line */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 w-0.5 bg-slate-200 dark:bg-slate-800",
          isFirstInGroup && isLastInGroup ? "hidden" : "",
          isFirstInGroup && !isLastInGroup ? "top-1/2 bottom-0" : "",
          !isFirstInGroup && isLastInGroup ? "top-0 bottom-1/2" : "",
          !isFirstInGroup && !isLastInGroup ? "top-0 bottom-0" : ""
        )}
      />
      
      {/* Node */}
      <div className={cn(
        "relative z-10 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950",
        nodeColor
      )} />
      
      {/* Time label */}
      {timeLabel && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-3">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
            {timeLabel}
          </span>
        </div>
      )}
    </div>
  );
};

export default TimelineRail;
