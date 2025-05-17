
import React from "react";
import { FormLabel } from "@/components/ui/form";
import { CardHeader, CardTitle, CardContent, Card } from "@/components/ui/card";
import { CustomerSelector } from "@/components/invoices/selectors/CustomerSelector";
import { BusinessProfileSelector } from "@/components/invoices/selectors/BusinessProfileSelector";

interface InvoicePartiesFormProps {
  businessProfileId: string;
  customerId: string;
  onBusinessProfileChange: (id: string, name?: string) => void;
  onCustomerChange: (id: string, name?: string) => void;
}

export const InvoicePartiesForm: React.FC<InvoicePartiesFormProps> = ({
  businessProfileId,
  customerId,
  onBusinessProfileChange,
  onCustomerChange
}) => {
  return (
    <Card className="md:col-span-1">
      <CardHeader className="py-4">
        <CardTitle className="text-lg">Kontrahenci</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <FormLabel>Profil biznesowy (sprzedawca)</FormLabel>
          <BusinessProfileSelector
            value={businessProfileId}
            onChange={onBusinessProfileChange}
          />
        </div>
        
        <div>
          <FormLabel>Klient (nabywca)</FormLabel>
          <CustomerSelector
            value={customerId}
            onChange={onCustomerChange}
          />
        </div>
      </CardContent>
    </Card>
  );
};
