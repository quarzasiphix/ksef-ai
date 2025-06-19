import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, ArrowDownCircle, ArrowUpCircle, PiggyBank, UserPlus, PackagePlus, DollarSign } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-40 border-b px-4 md:px-6 py-3 flex items-center justify-between bg-background md:static">
      <div className="flex items-center">
        <SidebarTrigger className="mr-4 hidden md:flex" />
        <h1 className={`font-bold text-invoice ${isMobile ? "text-base" : "text-lg"}`}>
          {isMobile ? "KsiegaI" : "KsiegaI"}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nowy dokument
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
        <ThemeToggle size={isMobile ? "sm" : "icon"} />
      </div>
    </header>
  );
};

export default Header;
