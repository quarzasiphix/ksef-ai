import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface SidebarGroupHeaderProps {
  label: string;
  subtitle?: string;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

const SidebarGroupHeader: React.FC<SidebarGroupHeaderProps> = ({
  label,
  subtitle,
  collapsible = false,
  expanded = false,
  onToggle,
}) => {
  return (
    <div className="mt-5 first:mt-4 px-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-sidebar-foreground/60">
            {label}
          </p>
          {subtitle && (
            <p className="text-[10px] text-sidebar-foreground/40 mt-1 leading-tight">
              {subtitle}
            </p>
          )}
        </div>
        {collapsible && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? `Zwiń sekcję ${label}` : `Rozwiń sekcję ${label}`}
            className={cn(
              "shrink-0 text-sidebar-foreground/50 transition-transform duration-200",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-foreground/30 rounded-sm",
              expanded ? "rotate-0" : "-rotate-90"
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-2 h-px bg-white/5" aria-hidden="true" />
    </div>
  );
};

export default SidebarGroupHeader;
