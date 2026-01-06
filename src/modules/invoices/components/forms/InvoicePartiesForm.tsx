import React from "react";
import { FormLabel } from "@/shared/ui/form";
import { CardHeader, CardTitle, CardContent, Card } from "@/shared/ui/card";
import { CustomerSelector } from "@/modules/invoices/components/selectors/CustomerSelector";
import { BusinessProfileSelector } from "@/modules/invoices/components/selectors/BusinessProfileSelector";
import { TransactionType } from "@/shared/types/common";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/shared/ui/button";
import CustomerForm from "@/modules/customers/components/CustomerForm";
import { useQueryClient } from "@tanstack/react-query";
import { useGlobalData } from "@/shared/hooks/use-global-data";

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
  const [editingCustomer, setEditingCustomer] = React.useState<any>(null);
  const queryClient = useQueryClient();
  const { customers: { data: customers } } = useGlobalData();

  const handleCustomerSuccess = async (customer: any) => {
    // Refresh global data if available
    if (window.triggerCustomersRefresh) {
      try {
        await window.triggerCustomersRefresh();
      } catch {
        // ignore
      }
    }
    // Set customer as selected (for new or edited)
    onCustomerChange(customer.id, customer.name);
    // Optimistically update customers cache
    queryClient.setQueryData(['customers'], (old: any) => {
      if (!old) return [customer];
      // Update existing or add new
      const existingIndex = old.findIndex((c: any) => c.id === customer.id);
      if (existingIndex >= 0) {
        const updated = [...old];
        updated[existingIndex] = customer;
        return updated;
      }
      return [...old, customer];
    });
    setShowCustomerModal(false);
    setEditingCustomer(null);
  };

  const handleEditCustomer = () => {
    if (!customerId) return;
    const customer = customers?.find((c: any) => c.id === customerId);
    if (customer) {
      setEditingCustomer(customer);
      setShowCustomerModal(true);
    }
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
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingCustomer(null);
                    setShowCustomerModal(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nowy klient
                </Button>
                {customerId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEditCustomer}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edytuj
                  </Button>
                )}
              </div>
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
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingCustomer(null);
                    setShowCustomerModal(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nowy klient
                </Button>
                {customerId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEditCustomer}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edytuj
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Modal for creating/editing customer */}
      {showCustomerModal && (
        <CustomerForm
          initialData={editingCustomer}
          isOpen={showCustomerModal}
          onClose={() => {
            setShowCustomerModal(false);
            setEditingCustomer(null);
          }}
          onSuccess={handleCustomerSuccess}
          defaultCustomerType={transactionType === TransactionType.INCOME ? 'odbiorca' : 'sprzedawca'}
        />
      )}
    </Card>
  );
};
