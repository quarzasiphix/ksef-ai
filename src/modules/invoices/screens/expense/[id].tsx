import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/shared/context/AuthContext";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import { TransactionType, InvoiceType } from "@/shared/types";
import { InvoiceItem } from "@/shared/types";
import { saveExpense } from "@/integrations/supabase/repositories/expenseRepository";
import { InvoiceItemsForm } from "@/modules/invoices/components/forms/InvoiceItemsForm";
import { CustomerSelector } from "@/modules/invoices/components/selectors/CustomerSelector";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import CustomerForm from "@/modules/customers/components/CustomerForm";
import { BusinessProfileSelector } from "@/modules/invoices/components/selectors/BusinessProfileSelector";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";

const NewExpense = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedProfileId } = useBusinessProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [businessProfileId, setBusinessProfileId] = useState<string>("");
  const [isZus, setIsZus] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");
  const { customers, businessProfiles } = useGlobalData();
  const supplierCustomers = customers.data.filter(c => c.customerType === 'sprzedawca');
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("zus") === "1") {
      setIsZus(true);
      const zusDesc = searchParams.get("desc") || "";
      const zusDate = searchParams.get("date") || new Date().toISOString().slice(0, 10);
      setDescription(zusDesc);
      setDate(zusDate);
      setItems([
        {
          id: crypto.randomUUID(),
          name: zusDesc,
          description: zusDesc,
          quantity: 1,
          unitPrice: 0,
          vatRate: 0,
          unit: "szt.",
          totalNetValue: 0,
          totalVatValue: 0,
          totalGrossValue: 0,
        },
      ]);
    } else {
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!customerId && supplierCustomers.length > 0) {
      setCustomerId(supplierCustomers[0].id);
    }
  }, [customerId, supplierCustomers]);

  useEffect(() => {
    if (selectedProfileId) {
      setBusinessProfileId(selectedProfileId);
    }
  }, [selectedProfileId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("=== EXPENSE SUBMISSION DEBUG ===");
    console.log("User:", user?.id);
    console.log("Context selectedProfileId:", selectedProfileId);
    console.log("State businessProfileId:", businessProfileId);
    console.log("State customerId:", customerId);
    
    if (!user) {
      toast.error("Musisz być zalogowany");
      return;
    }
    
    if (!businessProfileId) {
      toast.error("Wybierz profil biznesowy (nabywcę)");
      console.error("Missing business profile ID. Current value:", businessProfileId);
      return;
    }
    
    if (!customerId) {
      toast.error("Wybierz kontrahenta (dostawcę)");
      console.error("Missing customer ID. Current value:", customerId);
      return;
    }
    
    if (!date || items.length === 0) {
      toast.error("Wypełnij wszystkie pola i dodaj co najmniej jedną pozycję");
      return;
    }
    
    // Extra safeguard – verify that the selected business profile ID exists in cached data
    const profileExists = businessProfiles.data.some(p => p.id === businessProfileId);
    if (!profileExists) {
      toast.error("Wybrany profil biznesowy nie istnieje. Odśwież dane i spróbuj ponownie.");
      console.error("Business profile not found in cache. ID:", businessProfileId);
      return;
    }
    
    setIsLoading(true);
    try {
      const expenseData = {
        userId: user.id,
        businessProfileId,
        issueDate: date,
        date: date,
        amount: items.reduce((sum, item) => sum + (item.totalGrossValue || 0), 0),
        currency: "PLN",
        description: description || (isZus ? items[0]?.description : ""),
        transactionType: TransactionType.EXPENSE,
        items,
        customerId,
      };
      
      console.log("Submitting expense data:", expenseData);
      
      await saveExpense(expenseData);
      toast.success("Wydatek zapisany");
      navigate("/expense");
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Błąd podczas zapisywania wydatku");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSupplier = () => setIsAddSupplierOpen(true);
  const handleSupplierFormSuccess = (customer: any) => {
    setIsAddSupplierOpen(false);
    setCustomerId(customer.id);
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" type="button" onClick={() => navigate(-1)} size="icon">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">{isZus ? "Dodaj wydatek ZUS" : "Dodaj wydatek"}</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Dane wydatku</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium">Data</label>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Opis</label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium">Kontrahent (dostawca)</label>
                {supplierCustomers.length > 0 ? (
                  <CustomerSelector
                    value={customerId}
                    onChange={setCustomerId}
                    showBusinessProfiles={false}
                  />
                ) : (
                  <Button type="button" variant="outline" onClick={handleAddSupplier}>
                    Dodaj nowego kontrahenta
                  </Button>
                )}
                <CustomerForm
                  isOpen={isAddSupplierOpen}
                  onClose={() => setIsAddSupplierOpen(false)}
                  onSuccess={handleSupplierFormSuccess}
                  defaultCustomerType="sprzedawca"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Nabywca (Twój profil)</label>
                <BusinessProfileSelector
                  value={businessProfileId}
                  onChange={(id) => {
                    console.log('Business profile changed to:', id);
                    setBusinessProfileId(id);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <InvoiceItemsForm
          items={items}
          documentType={InvoiceType.SALES}
          transactionType={TransactionType.EXPENSE}
          onItemsChange={setItems}
          userId={user?.id || ""}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? "Zapisywanie..." : "Zapisz wydatek"}
          </Button>
        </div>
      </form>
    </div>
  );
};

const ExpensePage = () => {
  const { id } = useParams<{ id: string }>();
  if (id === "new") {
    return <NewExpense />;
  }
  // TODO: Implement edit expense page
  return <div>Edytuj wydatek (wkrótce)</div>;
};

export default ExpensePage;
