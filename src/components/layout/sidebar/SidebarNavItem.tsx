import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/shared/lib/utils";
import type { NavItem } from "./navConfig";

const tintIconClasses: Record<string, string> = {
  finance: "text-emerald-300",
  structure: "text-indigo-300",
  operations: "text-amber-300",
  accounting: "text-sky-300",
  system: "text-white/60",
};

interface SidebarNavItemProps {
  item: NavItem;
  isActive: boolean;
  highlightLedger?: boolean;
  collapsed?: boolean;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  item,
  isActive,
  highlightLedger = false,
  collapsed = false,
}) => {
  const Icon = item.icon;
  const tintClass = item.tint ? tintIconClasses[item.tint] : "text-white/70";

  return (
    <li>
      <NavLink
        to={item.path}
        className={cn(
          "group relative flex items-center gap-3 px-3 h-11 rounded-md text-sm",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30",
          "transition-colors duration-150",
          isActive
            ? "bg-white/8 text-white"
            : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white",
          highlightLedger && !isActive && "ring-1 ring-emerald-400/40 bg-emerald-400/5"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-0 top-2 bottom-2 w-1 rounded-full transition-opacity",
            (isActive || highlightLedger) ? "opacity-100" : "opacity-0",
            item.tint === "finance" && "bg-emerald-400",
            item.tint === "structure" && "bg-indigo-400/70",
            item.tint === "operations" && "bg-amber-400/70",
            item.tint === "accounting" && "bg-sky-400/80",
            item.tint === "system" && "bg-white/40"
          )}
        />
        <Icon
          className={cn(
            "h-5 w-5 flex-shrink-0 transition-colors",
            tintClass,
            isActive && "text-white"
          )}
        />
        {!collapsed && (
          <span
            className={cn(
              "truncate",
              item.emphasis ? "font-semibold" : "font-medium"
            )}
          >
            {item.label}
          </span>
        )}
      </NavLink>
    </li>
  );
};

export default SidebarNavItem;
