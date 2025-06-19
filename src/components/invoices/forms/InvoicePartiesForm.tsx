import React from "react";
import { FormLabel } from "@/components/ui/form";
import { CardHeader, CardTitle, CardContent, Card } from "@/components/ui/card";
import { CustomerSelector } from "@/components/invoices/selectors/CustomerSelector";
import { BusinessProfileSelector } from "@/components/invoices/selectors/BusinessProfileSelector";
import { TransactionType } from "@/types/common";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomerForm from "@/components/customers/CustomerForm";
import { useQueryClient } from "@tanstack/react-query";

interface InvoicePartiesFormProps {
  businessProfileId: string;
  customerId: string;
  transactionType: TransactionType;
  onBusinessProfileChange: (id: string, name?: string) => void;
  onCustomerChange: (id: string, name?: string) => void;
}

export const InvoicePartiesForm: React.FC<InvoicePartiesFormProps> = ({
  businessProfileId,
  customerId,
  transactionType,
  onBusinessProfileChange,
  onCustomerChange
}) => {
  const [showCustomerModal, setShowCustomerModal] = React.useState(false);
  const queryClient = useQueryClient();

  const handleNewCustomerSuccess = async (customer: any) => {
    // Refresh global data if available
    if (window.triggerCustomersRefresh) {
      try {
        await window.triggerCustomersRefresh();
      } catch {
        // ignore
      }
    }
    // Set newly created customer as selected
    onCustomerChange(customer.id, customer.name);
    // Optimistically update customers cache
    queryClient.setQueryData(['customers'], (old: any) => {
      if (!old) return [customer];
      // Avoid duplicates
      if (old.find((c: any) => c.id === customer.id)) return old;
      return [...old, customer];
    });
    setShowCustomerModal(false);
  };

  return (
    <Card className="md:col-span-1">
      <CardHeader className="py-4">
        <CardTitle className="text-lg">Kontrahenci</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {transactionType === TransactionType.INCOME ? (
          <>
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
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => setShowCustomerModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nowy klient
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Buyer (our business profile) */}
            <div>
              <FormLabel>Mój profil (nabywca)</FormLabel>
              <BusinessProfileSelector
                value={businessProfileId}
                onChange={onBusinessProfileChange}
              />
            </div>

            {/* Supplier (vendor) */}
            <div>
              <FormLabel>Dostawca (sprzedawca)</FormLabel>
              <CustomerSelector
                value={customerId}
                onChange={onCustomerChange}
                showBusinessProfiles={false}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => setShowCustomerModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nowy klient
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {/* Modal for creating new customer */}
      {showCustomerModal && (
        <CustomerForm
          isOpen={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          onSuccess={handleNewCustomerSuccess}
          defaultCustomerType={transactionType === TransactionType.INCOME ? 'odbiorca' : 'sprzedawca'}
        />
      )}
    </Card>
  );
};
