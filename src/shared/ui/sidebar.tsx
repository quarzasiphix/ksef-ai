import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip"
import { Button, buttonVariants } from "@/shared/ui/button"
import { Separator } from "@/shared/ui/separator"
import { Input } from "@/shared/ui/input"
import { Sheet, SheetContent } from "@/shared/ui/sheet"
import { Skeleton } from "@/shared/ui/skeleton"
import { useMediaQuery } from "@/shared/hooks/use-mobile";

type SidebarState = "expanded" | "collapsed"

interface SidebarContextValue {
  state: SidebarState
  setState: (state: SidebarState) => void
  toggle: () => void
  open: boolean
  setOpen: (open: boolean) => void
  isUserCollapsed: boolean
  setIsUserCollapsed: (collapsed: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

interface SidebarProviderProps {
  children: React.ReactNode
  defaultState?: SidebarState
  onStateChange?: (state: SidebarState) => void
}

function SidebarProvider({
  children,
  defaultState = "expanded",
  onStateChange
}: SidebarProviderProps) {
  const [state, setState] = React.useState<SidebarState>(defaultState)
  const [open, setOpen] = React.useState(false)
  const [isUserCollapsed, setIsUserCollapsed] = React.useState(false)

  const toggle = React.useCallback(() => {
    setIsUserCollapsed(prev => !prev)
    setState(prev => {
      const newState = prev === "expanded" ? "collapsed" : "expanded"
      onStateChange?.(newState)
      return newState
    })
  }, [onStateChange])

  const value = React.useMemo(
    () => ({
      state,
      setState,
      toggle,
      open,
      setOpen,
      isUserCollapsed,
      setIsUserCollapsed,
    }),
    [state, toggle, open, isUserCollapsed]
  )

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  )
}

SidebarProvider.displayName = "SidebarProvider"

const sidebarVariants = cva(
  "group/sidebar h-full bg-background border-r border-border flex flex-col overflow-hidden transition-all duration-200 ease-in-out",
  {
    variants: {
      variant: {
        default: "",
        floating: "rounded-lg shadow-lg m-2",
        inset: "bg-accent/50 m-2 rounded-lg"
      },
      size: {
        default: "w-64",
        sm: "w-48",
        lg: "w-80",
        icon: "w-16"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

const Sidebar = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & VariantProps<typeof sidebarVariants>>(
  ({
    className,
    variant,
    size,
    ...props
  }, ref) => {
    const { state, setState, isUserCollapsed } = useSidebar();
    const [isHovering, setIsHovering] = React.useState(false);
    const isDesktop = useMediaQuery('(min-width: 768px)');
    const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
      if (!isDesktop) return;

      if (isUserCollapsed) {
        if (isHovering) {
          // Clear any pending collapse timeout
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          setState('expanded');
        } else {
          // Delay collapse to prevent flickering
          hoverTimeoutRef.current = setTimeout(() => {
            setState('collapsed');
          }, 150);
        }
      }

      return () => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
      };
    }, [isHovering, isDesktop, isUserCollapsed, setState]);

    const handleMouseEnter = () => {
      if (isDesktop) {
        setIsHovering(true);
      }
    };

    const handleMouseLeave = () => {
      if (isDesktop) {
        setIsHovering(false);
      }
    };

    return (
      <div
        ref={ref}
        data-state={state}
        className={cn(sidebarVariants({ variant, size }), "z-51 scrollbar-thin", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      />
    );
  }
)

Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex h-16 items-center px-4", className)}
    {...props}
  />
))
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 dark:hover:scrollbar-thumb-slate-600", className)}
    {...props}
  />
))
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-4 border-t border-border", className)}
    {...props}
  />
))
SidebarFooter.displayName = "SidebarFooter"

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { toggle } = useSidebar()

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 p-0 rounded-md", className)}
      onClick={toggle}
      {...props}
    >
      <span className="sr-only">Toggle sidebar</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <path d="M9 3v18" />
      </svg>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("space-y-1 px-2 py-2", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

interface SidebarMenuItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  active?: boolean
}

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  SidebarMenuItemProps
>(({ className, active, ...props }, ref) => (
  <li
    ref={ref}
    className={cn(
      "relative rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
      active
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      className
    )}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string
  }
>(({
    className,
    isActive,
    tooltip,
    children,
    ...props
  }, ref) => {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const content = (
    <Button
      ref={ref}
      variant="ghost"
      className={cn(
        "flex w-full items-center rounded-md text-sm font-medium transition-colors sidebar-menu-button",
        className
      )}
      data-state={isActive ? "active" : undefined}
      style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
      {...props}
    >
      {children}
    </Button>
  )

  if (isCollapsed && tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
})
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-1 py-2", className)}
    {...props}
  />
))
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-4 py-1 text-xs font-semibold text-muted-foreground", className)}
    {...props}
  />
))
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-1 px-2", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean
    showOnHover?: boolean
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground select-none pointer-events-none",
      "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
      className
    )}
    {...props}
  />
))
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean
  }
>(({ className, showIcon = false, ...props }, ref) => {
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("rounded-md h-8 flex gap-2 px-2 items-center", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 flex-1 max-w-[--skeleton-width]"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
      className
    )}
    {...props}
  />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean
    size?: "sm" | "md"
    isActive?: boolean
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
}
