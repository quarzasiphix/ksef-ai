
import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

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
      <div>
        <Button 
          className="flex items-center" 
          size={isMobile ? "sm" : "default"}
          onClick={() => navigate("/invoices/new")}
        >
          <Plus className={`${isMobile ? "mr-1 h-3 w-3" : "mr-2 h-4 w-4"}`} />
          {isMobile ? "Nowa" : "Nowa faktura"}
        </Button>
      </div>
    </header>
  );
};

export default Header;
