
import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="border-b px-6 py-3 flex items-center justify-between bg-background">
      <div className="flex items-center">
        <SidebarTrigger className="mr-4" />
        <h1 className="text-lg font-bold text-invoice">System Fakturowy</h1>
      </div>
      <div>
        <Button 
          className="flex items-center" 
          onClick={() => navigate("/invoices/new")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nowa faktura
        </Button>
      </div>
    </header>
  );
};

export default Header;
