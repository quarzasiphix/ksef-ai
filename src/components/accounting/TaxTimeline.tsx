import React from "react";
import { cn } from "@/lib/utils";

interface TaxTimelineProps {
  year?: number; // defaults to current year
  selectedMonth: number; // 0 - 11
  onMonthSelect: (monthIdx: number) => void;
}

const monthNames = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Paź",
  "Listopad",
  "Grudzień",
];

export const TaxTimeline: React.FC<TaxTimelineProps> = ({ year = new Date().getFullYear(), selectedMonth, onMonthSelect }) => {
  // Determine current month to style past/future differently
  const currentMonthIdx = new Date().getMonth();

  return (
    <div className="w-full select-none">
      {/* Year label */}
      <div className="text-center font-semibold mb-2">{year}</div>

      {/* Timeline */}
      <div className="flex items-end relative">
        {monthNames.map((name, idx) => {
          const isQuarterEnd = (idx + 1) % 3 === 0;
          const isSelected = idx === selectedMonth;
          const isPastOrCurrent = idx <= currentMonthIdx;

          return (
            <div
              key={name}
              className={cn(
                "flex-1 flex flex-col items-center cursor-pointer group",
                isSelected && "font-bold text-blue-600"
              )}
              onClick={() => onMonthSelect(idx)}
            >
              {/* Tick */}
              <div
                className={cn(
                  "w-0.5",
                  isQuarterEnd ? "h-8" : "h-4",
                  isSelected
                    ? "bg-blue-600 h-9"
                    : isPastOrCurrent
                    ? "bg-blue-500 group-hover:bg-blue-600"
                    : "bg-muted"
                )}
              />
              {/* Label */}
              <span
                className={cn(
                  "text-[10px] mt-1 whitespace-nowrap",
                  isSelected
                    ? "text-blue-600"
                    : isPastOrCurrent
                    ? "text-foreground group-hover:text-blue-600"
                    : "text-muted-foreground"
                )}
              >
                {name.substr(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaxTimeline; 