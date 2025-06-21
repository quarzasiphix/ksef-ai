import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, ArrowDownCircle, ArrowUpCircle, PiggyBank, UserPlus, PackagePlus, DollarSign, FileText, CreditCard, Banknote, Calculator } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b px-4 md:px-6 py-3 flex items-center justify-between bg-background">
      <div className="flex items-center gap-2 md:gap-4">
        {/* Desktop/Tablet: Finance buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="default" className="font-bold px-5 py-2 text-base flex items-center gap-2">
            <Link to="/income">
              <FileText className="w-5 h-5 mr-1" /> Faktury
            </Link>
          </Button>
          <Button asChild variant="outline" className="px-4 py-2 text-base flex items-center gap-2">
            <Link to="/expense">
              <CreditCard className="w-5 h-5 mr-1" /> Wydatki
            </Link>
          </Button>
          {/* Show these only on large screens */}
          <div className="hidden lg:flex items-center gap-2">
            <Button asChild variant="outline" className="px-4 py-2 text-base flex items-center gap-2">
              <Link to="/bank">
                <Banknote className="w-5 h-5 mr-1" /> Bankowość
              </Link>
            </Button>
            <Button asChild variant="outline" className="px-4 py-2 text-base flex items-center gap-2">
              <Link to="/accounting">
                <Calculator className="w-5 h-5 mr-1" /> Księgowość
              </Link>
            </Button>
          </div>
        </div>
        <h1 className={`font-bold text-invoice ${isMobile ? "text-base" : "text-lg"}`}>KsiegaI</h1>
      </div>
      <div className="flex items-center gap-4">
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
        <ThemeToggle size={isMobile ? "sm" : "icon"} />
      </div>
    </header>
  );
};

export default Header;
