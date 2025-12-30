import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/shared/context/AuthContext";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import { TransactionType, InvoiceType } from "@/shared/types";
import { InvoiceItem } from "@/shared/types";
import { saveExpense } from "@/modules/invoices/data/expenseRepository";
import { InvoiceItemsForm } from "@/modules/invoices/components/forms/InvoiceItemsForm";
import { CustomerSelector } from "@/modules/invoices/components/selectors/CustomerSelector";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import CustomerForm from "@/modules/customers/components/CustomerForm";
import { BusinessProfileSelector } from "@/modules/invoices/components/selectors/BusinessProfileSelector";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { formatCurrency } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  FileText,
  Calendar,
  DollarSign,
  Building2,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowRight,
  Download,
  History,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DiscussionPanel } from "@/modules/invoices/components/discussion/DiscussionPanel";
import { AgreementStatusBadge } from "@/modules/invoices/components/AgreementStatusBadge";
import { AgreementActionButtons } from "@/modules/invoices/components/AgreementActionButtons";
import { updateInvoiceAgreementStatus } from "@/modules/contracts/data/agreementRepository";
import { RequestCorrectionModal } from "@/modules/invoices/components/RequestCorrectionModal";
import { RejectInvoiceModal } from "@/modules/invoices/components/RejectInvoiceModal";

type InvoiceTab = "details" | "discussion" | "history";

interface ReceivedInvoiceData {
  invoice_id: string;
  invoice_number: string;
  invoice_type: string;
  issue_date: string;
  due_date: string;
  sell_date: string;
  total_net_value: number;
  total_gross_value: number;
  total_vat_value: number;
  is_paid: boolean;
  payment_method: string;
  currency: string;
  transaction_type: string;
  comments: string | null;
  sender_id: string;
  sender_name: string;
  sender_tax_id: string;
  sender_address: string;
  sender_city: string;
  sender_postal_code: string;
  buyer_id: string;
  buyer_name: string;
  buyer_tax_id: string;
  buyer_address: string;
  buyer_city: string;
  buyer_postal_code: string;
  agreement_status?: string;
}

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
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<InvoiceTab>("details");
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  console.log('ExpensePage - ID:', id);
  console.log('ExpensePage - user:', user?.id);

  // Direct RPC call to get received invoice data
  const { data: invoiceData, isLoading, error } = useQuery({
    queryKey: ["received-invoice-detail", id],
    queryFn: async () => {
      console.log('Direct RPC call for ID:', id);
      if (!id) {
        console.log('No ID provided');
        return null;
      }
      
      try {
        const { data, error } = await supabase.rpc('get_received_invoice_with_sender', { 
          p_invoice_id: id 
        });
        
        console.log('RPC Response:', { data, error });
        
        if (error) {
          console.error('RPC Error:', error);
          throw error;
        }
        
        // RPC returns an array, take first element
        const result = data && data.length > 0 ? data[0] : null;
        console.log('Final result:', result);
        return result;
      } catch (error) {
        console.error('Error in RPC call:', error);
        throw error;
      }
    },
    enabled: !!id && !!user,
  });

  console.log('ExpensePage - invoiceData:', invoiceData);
  console.log('ExpensePage - isLoading:', isLoading);
  console.log('ExpensePage - error:', error);

  // Sync tab with router query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (isLoading) return;

    const section = params.get('section') as InvoiceTab | null;
    if (section && ['details', 'discussion', 'history'].includes(section)) {
      setActiveTab(section);
    } else {
      setActiveTab('details');
    }
  }, [location.search, isLoading]);

  if (id === "new") {
    return <NewExpense />;
  }

  // If we have invoice data, show received invoice detail
  if (invoiceData) {
    console.log('Showing received invoice detail');
    return <ReceivedExpenseDetail invoiceData={invoiceData} activeTab={activeTab} setActiveTab={setActiveTab} />;
  }

  // If we have an error, show error state
  if (error) {
    console.log('Showing error state:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Błąd ładowania</h2>
          <p className="text-muted-foreground mb-6">Wystąpił błąd podczas ładowania wydatku</p>
          <Button onClick={() => navigate('/expense')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do wydatków
          </Button>
        </div>
      </div>
    );
  }

  // If still loading, show loading state
  if (isLoading) {
    console.log('Showing loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie wydatku...</p>
        </div>
      </div>
    );
  }

  // If no invoice data and not loading, try regular expense or show not found
  console.log('No invoice data, showing fallback');
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Wydatek nie został znaleziony</h2>
        <p className="text-muted-foreground mb-6">Ten wydatek nie istnieje lub nie masz do niego dostępu</p>
        <Button onClick={() => navigate('/expense')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Powrót do wydatków
        </Button>
      </div>
    </div>
  );
};

// Component to display received invoice as expense detail (similar to ReceivedInvoiceDetail)
const ReceivedExpenseDetail = ({ invoiceData, activeTab, setActiveTab }: { invoiceData: ReceivedInvoiceData, activeTab: InvoiceTab, setActiveTab: (tab: InvoiceTab) => void }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  console.log('ReceivedExpenseDetail - invoiceData:', invoiceData);

  const handleApprove = async () => {
    try {
      await updateInvoiceAgreementStatus(invoiceData.invoice_id, 'approved', user?.id);
      toast.success('Faktura zatwierdzona');
      queryClient.invalidateQueries({ queryKey: ['received-invoice-detail', invoiceData.invoice_id] });
    } catch (error) {
      toast.error('Błąd podczas zatwierdzania faktury');
    }
  };

  const handleReject = async (reason: any) => {
    try {
      await updateInvoiceAgreementStatus(invoiceData.invoice_id, 'rejected', user?.id, reason.reason);
      toast.success('Faktura odrzucona');
      setShowRejectModal(false);
      queryClient.invalidateQueries({ queryKey: ['received-invoice-detail', invoiceData.invoice_id] });
    } catch (error) {
      toast.error('Błąd podczas odrzucania faktury');
    }
  };

  const handleRequestCorrection = async (reason: any) => {
    try {
      await updateInvoiceAgreementStatus(invoiceData.invoice_id, 'correction_requested', user?.id, reason.reason);
      toast.success('Poprawka zażądana');
      setShowCorrectionModal(false);
      queryClient.invalidateQueries({ queryKey: ['received-invoice-detail', invoiceData.invoice_id] });
    } catch (error) {
      toast.error('Błąd podczas żądania poprawki');
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/expense')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Powrót do wydatków
        </Button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{invoiceData.invoice_number}</h1>
              <AgreementStatusBadge 
                status={invoiceData.agreement_status || 'received'} 
                size="lg" 
              />
            </div>
            <p className="text-lg text-muted-foreground mb-3">
              Otrzymano: {format(new Date(invoiceData.issue_date), "dd MMMM yyyy", { locale: pl })}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <FileText className="h-3 w-3 mr-1" />
                Faktura otrzymana
              </Badge>
              <Badge variant="outline">
                <DollarSign className="h-3 w-3 mr-1" />
                {formatCurrency(invoiceData.total_gross_value)} PLN
              </Badge>
              <Badge variant="outline">
                <Calendar className="h-3 w-3 mr-1" />
                Termin: {format(new Date(invoiceData.due_date), "dd MMM yyyy", { locale: pl })}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Szczegóły faktury
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Numer faktury</label>
                  <p className="font-semibold">{invoiceData.invoice_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data wystawienia</label>
                  <p className="font-semibold">
                    {format(new Date(invoiceData.issue_date), 'dd MMM yyyy', { locale: pl })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Termin płatności</label>
                  <p className="font-semibold">
                    {format(new Date(invoiceData.due_date), 'dd MMM yyyy', { locale: pl })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Kwota brutto</label>
                  <p className="font-semibold text-lg">
                    {formatCurrency(invoiceData.total_gross_value)} PLN
                  </p>
                </div>
              </div>

              <Separator />

              {/* Sender and Receiver Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Nadawca
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{invoiceData.sender_name}</p>
                    <p className="text-muted-foreground">NIP: {invoiceData.sender_tax_id}</p>
                    {invoiceData.sender_address && (
                      <p className="text-muted-foreground">
                        {invoiceData.sender_address}, {invoiceData.sender_postal_code} {invoiceData.sender_city}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Odbiorca
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{invoiceData.buyer_name}</p>
                    <p className="text-muted-foreground">NIP: {invoiceData.buyer_tax_id}</p>
                    {invoiceData.buyer_address && (
                      <p className="text-muted-foreground">
                        {invoiceData.buyer_address}, {invoiceData.buyer_postal_code} {invoiceData.buyer_city}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Comments */}
              {invoiceData.comments && (
                <div>
                  <h4 className="font-medium mb-2">Uwagi</h4>
                  <p className="text-sm text-muted-foreground">{invoiceData.comments}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InvoiceTab)}>
            <TabsList>
              <TabsTrigger value="details">Szczegóły</TabsTrigger>
              <TabsTrigger value="discussion">Dyskusja</TabsTrigger>
              <TabsTrigger value="history">Historia</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informacje dodatkowe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Metoda płatności:</span> {invoiceData.payment_method}
                    </div>
                    <div>
                      <span className="font-medium">Waluta:</span> {invoiceData.currency}
                    </div>
                    <div>
                      <span className="font-medium">Typ transakcji:</span> {invoiceData.transaction_type}
                    </div>
                    <div>
                      <span className="font-medium">Status płatności:</span> {invoiceData.is_paid ? 'Zapłacona' : 'Niezapłacona'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="discussion">
              <Card>
                <CardHeader>
                  <CardTitle>Dyskusja</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Funkcja dyskusji będzie dostępna wkrótce.</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Historia zmian</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Historia zmian będzie dostępna wkrótce.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Agreement Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status zatwierdzenia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AgreementStatusBadge status={invoiceData.agreement_status || 'received'} />
              
              <AgreementActionButtons
                status={invoiceData.agreement_status || 'received'}
                onApprove={handleApprove}
                onReject={() => setShowRejectModal(true)}
                onRequestCorrection={() => setShowCorrectionModal(true)}
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Szybkie akcje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full" onClick={() => window.print()}>
                <Download className="h-4 w-4 mr-2" />
                Drukuj fakturę
              </Button>
              <Button variant="outline" className="w-full">
                <History className="h-4 w-4 mr-2" />
                Eksportuj PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <RequestCorrectionModal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        onSubmit={handleRequestCorrection}
      />
      
      <RejectInvoiceModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onSubmit={handleReject}
      />
    </div>
  );
};

export default ExpensePage;
