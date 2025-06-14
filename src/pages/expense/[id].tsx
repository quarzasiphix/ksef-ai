import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TransactionType, InvoiceType } from "@/types";
import { InvoiceItem } from "@/types";
import { saveExpense } from "@/integrations/supabase/repositories/expenseRepository";
import { InvoiceItemsForm } from "@/components/invoices/forms/InvoiceItemsForm";
import { CustomerSelector } from "@/components/invoices/selectors/CustomerSelector";
import { useGlobalData } from "@/hooks/use-global-data";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import CustomerForm from "@/components/customers/CustomerForm";
import { BusinessProfileSelector } from "@/components/invoices/selectors/BusinessProfileSelector";
import { useBusinessProfile } from "@/context/BusinessProfileContext";

const ZUS_NIP = "5220005994";
const ZUS_NAME = "ZAKŁAD UBEZPIECZEŃ SPOŁECZNYCH";

const NewExpense = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedProfileId } = useBusinessProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [businessProfileId, setBusinessProfileId] = useState<string>(selectedProfileId || "");
  const [isZus, setIsZus] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");
  const { customers } = useGlobalData();
  // Only show suppliers (sprzedawca)
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
    if (!customerId && supplierCustomers.length > 0) {
      setCustomerId(supplierCustomers[0].id);
    }
    if (!businessProfileId && selectedProfileId) {
        setBusinessProfileId(selectedProfileId);
    }
  }, [searchParams, supplierCustomers, customerId, businessProfileId, selectedProfileId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting expense with businessProfileId:", businessProfileId, "and customerId:", customerId);
    if (!user) {
      toast.error("Musisz być zalogowany");
      return;
    }
    if (!businessProfileId) {
      toast.error("Wybierz profil biznesowy (nabywcę)");
      return;
    }
    if (!date || items.length === 0) {
      toast.error("Wypełnij wszystkie pola i dodaj co najmniej jedną pozycję");
      return;
    }
    setIsLoading(true);
    try {
      await saveExpense({
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
      });
      toast.success("Wydatek zapisany");
      navigate("/expense");
    } catch (error) {
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
                  onChange={(id) => setBusinessProfileId(id)}
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
