import React, { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Plus, ArrowDownCircle, ArrowUpCircle, PiggyBank, UserPlus, PackagePlus, DollarSign, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import WorkspaceMenu from "@/components/workspace/WorkspaceMenu";
import TabSwitcher from "@/components/workspace/TabSwitcher";
import HeaderTabsStrip from "@/components/workspace/HeaderTabsStrip";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { DepartmentSwitcher } from "@/components/workspace/DepartmentSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/shared/ui/dropdown-menu";

const Header = () => {
  const isMobile = useIsMobile();
  const [tabSwitcherOpen, setTabSwitcherOpen] = useState(false);

  // Cmd+K / Ctrl+K shortcut for tab switcher
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setTabSwitcherOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Top Header - Three-region layout: left (brand), center (tabs), right (actions) */}
      <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 md:px-6 py-2.5 flex items-center gap-4">
          {/* Left region - Brand/Logo (if needed in future) */}
          <div className="flex-shrink-0">
            {/* Reserved for logo/brand */}
          </div>

          {/* Center region - Workspace Tabs Strip */}
          <HeaderTabsStrip />

          {/* Right region - Project switcher + actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
        <DepartmentSwitcher />
        <SyncStatusIndicator />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nowy
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Income Section */}
            <DropdownMenuLabel className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <ArrowDownCircle className="h-4 w-4" /> Nowy przychód
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/income/new?type=sales">Faktura VAT</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/income/new?type=receipt">Rachunek</Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* Expense Section */}
            <DropdownMenuLabel className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <ArrowUpCircle className="h-4 w-4" /> Nowy wydatek
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/expense/new?type=sales">Faktura kosztowa</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/expense/new?type=receipt">Rachunek</Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* ZUS Option */}
            <DropdownMenuLabel className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <PiggyBank className="h-4 w-4" /> Inne
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to="/expense/new?type=sales&zus=1">Dodaj ZUS</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Add Client/Product Section */}
            <DropdownMenuLabel className="text-muted-foreground">Skróty</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/customers/new" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 mr-2 text-blue-600" /> Dodaj klienta
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/products/new" className="flex items-center gap-2">
                  <PackagePlus className="h-4 w-4 mr-2 text-green-600" /> Dodaj produkt
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/contracts/new" className="flex items-center gap-2">
                  <FileText className="h-4 w-4 mr-2 text-violet-600" /> Dodaj umowę
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/employees?create=1" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 mr-2 text-violet-600" /> Dodaj pracownika
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/labour-hours?create=1" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 mr-2 text-amber-600" /> Dodaj wypłatę
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
          <WorkspaceMenu onOpenTabSwitcher={() => setTabSwitcherOpen(true)} />
          <ThemeToggle size={isMobile ? "sm" : "icon"} />
          </div>
        </div>
      </header>
      
      <TabSwitcher open={tabSwitcherOpen} onOpenChange={setTabSwitcherOpen} />
    </>
  );
};

export default Header;
