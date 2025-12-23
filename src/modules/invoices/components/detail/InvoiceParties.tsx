import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { BusinessProfile, Customer } from "@/shared/types";

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
      <CardHeader className="py-2.5 px-3 sm:py-3 sm:px-4">
        <CardTitle className="text-base md:text-lg">Dane kontrahentów</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-2 gap-y-1 px-3 py-2 text-xs sm:gap-x-2.5 sm:gap-y-1.5 md:text-sm">
        {/* Sprzedawca Section */}
        <div className="space-y-0.5">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground mb-0.5">Sprzedawca</p>
          <div>
            <p className="font-semibold" style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>{businessName || "Brak nazwy"}</p>
            {businessProfile ? (
              <div className="text-[10px] sm:text-[11px] space-y-0.5 mt-0.5">
                {businessProfile.taxId && (
                  <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>NIP: {businessProfile.taxId}</p>
                )}
                {businessProfile.regon && (
                  <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>REGON: {businessProfile.regon}</p>
                )}
                <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>{businessProfile.address}</p>
                <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>{businessProfile.postalCode} {businessProfile.city}</p>
                {businessProfile.email && (
                  <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>Email: {businessProfile.email}</p>
                )}
                {businessProfile.phone && (
                  <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>Tel: {businessProfile.phone}</p>
                )}
                {businessProfile.bankAccount && (
                  <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>Konto: {businessProfile.bankAccount}</p>
                )}
              </div>
            ) : (
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">Brak szczegółów</p>
            )}
          </div>
        </div>
        {/* Nabywca Section */}
        <div className="space-y-0.5">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground mb-0.5">Nabywca</p>
          <div>
            <p className="font-semibold" style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>{customerName || "Brak nazwy"}</p>
            {customer ? (
              <div className="text-[10px] sm:text-[11px] space-y-0.5 mt-0.5">
                {customer.taxId && (
                  <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>NIP: {customer.taxId}</p>
                )}
                <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>{customer.address}</p>
                <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>{customer.postalCode} {customer.city}</p>
                {customer.email && (
                  <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>Email: {customer.email}</p>
                )}
                {customer.phone && (
                  <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>Tel: {customer.phone}</p>
                )}
              </div>
            ) : (
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">Brak szczegółów</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
