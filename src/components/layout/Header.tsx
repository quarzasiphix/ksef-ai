import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <header className="border-b px-4 md:px-6 py-3 flex items-center justify-between bg-background">
      <div className="flex items-center">
        <SidebarTrigger className="mr-4 hidden md:flex" />
        <h1 className={`font-bold text-invoice ${isMobile ? "text-base" : "text-lg"}`}>
          {isMobile ? "KSeF" : "System Fakturowy"}
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
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/invoices/new?type=sales">
                  Faktura VAT
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/invoices/new?type=receipt">
                  Rachunek
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/invoices/new?type=proforma">
                  Faktura proforma
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/invoices/new?type=correction">
                  Faktura korygująca
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
