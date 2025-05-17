
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGlobalData } from "@/hooks/use-global-data";
import { BusinessProfile, Customer } from "@/types";

interface InvoicePartiesProps {
  businessName?: string;
  customerName?: string;
  businessProfileId?: string;
  customerId?: string;
}

export const InvoiceParties: React.FC<InvoicePartiesProps> = ({
  businessName,
  customerName,
  businessProfileId,
  customerId,
}) => {
  const { businessProfiles: { data: profiles }, customers: { data: customers } } = useGlobalData();
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  
  useEffect(() => {
    // Find the business profile
    if (businessProfileId && profiles.length > 0) {
      const profile = profiles.find(p => p.id === businessProfileId);
      if (profile) {
        setBusinessProfile(profile);
      }
    }
    
    // Find the customer
    if (customerId && customers.length > 0) {
      const cust = customers.find(c => c.id === customerId);
      if (cust) {
        setCustomer(cust);
      }
    }
  }, [businessProfileId, customerId, profiles, customers]);
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base md:text-lg">Dane kontrahentów</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-3 px-4 py-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Sprzedawca</p>
          <div>
            <p className="font-medium">{businessName || "Brak nazwy"}</p>
            {businessProfile ? (
              <div className="text-xs space-y-1 mt-1">
                {businessProfile.taxId && (
                  <p>NIP: {businessProfile.taxId}</p>
                )}
                {businessProfile.regon && (
                  <p>REGON: {businessProfile.regon}</p>
                )}
                <p>{businessProfile.address}</p>
                <p>{businessProfile.postalCode} {businessProfile.city}</p>
                {businessProfile.email && (
                  <p>Email: {businessProfile.email}</p>
                )}
                {businessProfile.phone && (
                  <p>Tel: {businessProfile.phone}</p>
                )}
                {businessProfile.bankAccount && (
                  <p>Konto: {businessProfile.bankAccount}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Brak dostępnych szczegółowych danych</p>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Nabywca</p>
          <div>
            <p className="font-medium">{customerName || "Brak nazwy"}</p>
            {customer ? (
              <div className="text-xs space-y-1 mt-1">
                {customer.taxId && (
                  <p>NIP: {customer.taxId}</p>
                )}
                <p>{customer.address}</p>
                <p>{customer.postalCode} {customer.city}</p>
                {customer.email && (
                  <p>Email: {customer.email}</p>
                )}
                {customer.phone && (
                  <p>Tel: {customer.phone}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Brak dostępnych szczegółowych danych</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
