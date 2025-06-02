
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Mail, Phone, Building2 } from "lucide-react";

interface ContractorCardProps {
  title: string;
  contractor: {
    id?: string;
    name: string;
    taxId?: string;
    regon?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    email?: string;
    phone?: string;
    bankAccount?: string;
  };
}

const ContractorCard: React.FC<ContractorCardProps> = ({ title, contractor }) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    if (contractor.id && title === "Nabywca") {
      navigate(`/customers/${contractor.id}`);
    }
  };

  const isClickable = contractor.id && title === "Nabywca";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-muted-foreground text-sm">{title}</h4>
        {isClickable && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleViewDetails}
            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Zobacz
          </Button>
        )}
      </div>
      
      <div 
        className={`space-y-2 p-3 rounded-lg border bg-muted/30 ${
          isClickable ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''
        }`}
        onClick={isClickable ? handleViewDetails : undefined}
      >
        <div>
          <p className="font-semibold text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {contractor.name || "Brak nazwy"}
          </p>
        </div>
        
        {contractor.taxId && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">NIP:</span> {contractor.taxId}
          </p>
        )}
        
        {contractor.regon && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">REGON:</span> {contractor.regon}
          </p>
        )}
        
        {(contractor.address || contractor.city) && (
          <div className="text-xs text-muted-foreground flex items-start gap-2">
            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
            <div>
              {contractor.address && <div>{contractor.address}</div>}
              {contractor.city && (
                <div>{contractor.postalCode} {contractor.city}</div>
              )}
              {contractor.country && <div>{contractor.country}</div>}
            </div>
          </div>
        )}
        
        {contractor.email && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Mail className="h-3 w-3" />
            {contractor.email}
          </p>
        )}
        
        {contractor.phone && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Phone className="h-3 w-3" />
            {contractor.phone}
          </p>
        )}
        
        {contractor.bankAccount && title === "Sprzedawca" && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Konto:</span> {contractor.bankAccount}
          </p>
        )}
      </div>
    </div>
  );
};

export default ContractorCard;
