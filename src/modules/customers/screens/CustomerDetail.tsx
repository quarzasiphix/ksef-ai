
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Badge } from "@/shared/ui/badge";
import { formatCurrency, calculateInvoicesSum } from "@/shared/lib/invoice-utils";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Edit, ArrowLeft, FileText, Plus, MessageCircle, Mail, Phone } from "lucide-react";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { getCustomerWithLinkedProfile } from "@/modules/customers/data/customerRepository";
import { getClientGroup } from "@/modules/customers/data/clientGroupRepository";
import InvoiceCard from "@/modules/invoices/components/InvoiceCard";
import ReceivedInvoicesTab from "@/modules/invoices/components/ReceivedInvoicesTab";
import { Customer } from "@/shared/types";
import ProfessionalInvoiceRow from "@/modules/invoices/components/ProfessionalInvoiceRow";
import ProfessionalInvoiceRowMobile from "@/modules/invoices/components/ProfessionalInvoiceRowMobile";
import InvoicePDFViewer from "@/modules/invoices/components/InvoicePDFViewer";
import { generateInvoicePdf, getInvoiceFileName } from "@/shared/lib/pdf-utils";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { useQuery } from "@tanstack/react-query";
import { getBankAccountsForProfile } from '@/modules/banking/data/bankAccountRepository';
import { getBusinessProfileById } from '@/modules/settings/data/businessProfileRepository';
import { useNavigate } from 'react-router-dom';

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoices: { data: invoices, isLoading: invoicesLoading } } = useGlobalData();
  const { selectedProfileId } = useBusinessProfile();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const customerInvoices = invoices.filter(inv => inv.customerId === id);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', selectedProfileId],
    queryFn: () => selectedProfileId ? getBankAccountsForProfile(selectedProfileId) : Promise.resolve([]),
    enabled: !!selectedProfileId,
  });

  const { data: customerGroup } = useQuery({
    queryKey: ['customer-group', customer?.client_group_id],
    queryFn: () =>
      customer?.client_group_id ? getClientGroup(customer.client_group_id) : Promise.resolve(null),
    enabled: !!customer?.client_group_id,
  });

  const { data: businessProfile } = useQuery({
    queryKey: ['business-profile', selectedProfileId],
    queryFn: () => selectedProfileId ? getBusinessProfileById(selectedProfileId, selectedProfileId) : Promise.resolve(null),
    enabled: !!selectedProfileId,
  });

  const openPreview = (invoice: any) => {
    setPreviewInvoice(invoice);
    setIsPreviewOpen(true);
  };

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const customerData = await getCustomerWithLinkedProfile(id);
        setCustomer(customerData);
      } catch (error) {
        console.error("Error fetching customer:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

  if (isLoading || invoicesLoading) {
    return <div className="text-center py-8">Ładowanie...</div>;
  }

  if (!customer) {
    return <div className="text-center py-8">Klient nie został znaleziony</div>;
  }

  const totalRevenue = calculateInvoicesSum(customerInvoices);
  const paidInvoices = customerInvoices.filter(inv => inv.isPaid);
  const unpaidInvoices = customerInvoices.filter(inv => !inv.isPaid);
  const isLinkedToUser = customer.linkedBusinessProfile?.user_id;

  // Calculate foreign currency breakdown
  const currencyBreakdown = customerInvoices.reduce((acc, inv) => {
    if (inv.currency && inv.currency !== 'PLN') {
      const isVatExempt = inv.fakturaBezVAT || inv.vat === false;
      const amount = isVatExempt ? (inv.totalNetValue || 0) : (inv.totalGrossValue || inv.totalAmount || 0);
      
      if (!acc[inv.currency]) {
        acc[inv.currency] = 0;
      }
      acc[inv.currency] += amount;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 max-w-full pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold">{customer.name}</h1>
              {customerGroup && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-100">
                  {customerGroup.invoice_prefix ? `${customerGroup.invoice_prefix} • ` : ""}
                  {customerGroup.name}
                </Badge>
              )}
              {isLinkedToUser && (
                <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                  Użytkownik aplikacji
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {customer.customerType === 'odbiorca' ? 'Odbiorca' : 
               customer.customerType === 'sprzedawca' ? 'Sprzedawca' : 'Odbiorca i Sprzedawca'}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button asChild>
            <Link to={`/customers/edit/${customer.id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edytuj
            </Link>
          </Button>
          <Button asChild>
            <Link to={`/income/new?customerId=${customer.id}`}>
              <Plus className="h-4 w-4 mr-2" />
              Nowa faktura
            </Link>
          </Button>
          {isLinkedToUser && (
            <Button variant="outline" asChild>
              <Link to={`/customers/${customer.id}/message`}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Wyślij wiadomość
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Customer Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Łączne przychody
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue, 'PLN')}
            </div>
            {Object.keys(currencyBreakdown).length > 0 && (
              <div className="mt-2 space-y-1">
                {Object.entries(currencyBreakdown).map(([currency, amount]) => (
                  <div key={currency} className="text-xs text-muted-foreground">
                    {formatCurrency(amount, currency)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zapłacone faktury
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {paidInvoices.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Niezapłacone faktury
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {unpaidInvoices.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Details */}
      <Card>
        <CardHeader>
          <CardTitle>Szczegóły klienta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Informacje podstawowe</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Nazwa:</span> {customer.name}
                </div>
                {customer.taxId && (
                  <div>
                    <span className="font-medium">NIP:</span> {customer.taxId}
                  </div>
                )}
                <div>
                  <span className="font-medium">Typ:</span>{" "}
                  {customer.customerType === 'odbiorca' ? 'Odbiorca' : 
                   customer.customerType === 'sprzedawca' ? 'Sprzedawca' : 'Odbiorca i Sprzedawca'}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Adres</h4>
              <div className="space-y-2 text-sm">
                <div>{customer.address}</div>
                <div>
                  {customer.postalCode} {customer.city}
                </div>
              </div>
            </div>
            
            {/* Enhanced contact section for linked users */}
            {isLinkedToUser && customer.linkedBusinessProfile && (
              <div>
                <h4 className="font-semibold mb-3">Kontakt (profil firmowy)</h4>
                <div className="space-y-2 text-sm">
                  {customer.linkedBusinessProfile.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Email:</span> 
                      <span>{customer.linkedBusinessProfile.email}</span>
                    </div>
                  )}
                  {customer.linkedBusinessProfile.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Telefon:</span> 
                      <span>{customer.linkedBusinessProfile.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Standard contact for non-linked customers */}
            {!isLinkedToUser && (customer.email || customer.phone) && (
              <div>
                <h4 className="font-semibold mb-3">Kontakt</h4>
                <div className="space-y-2 text-sm">
                  {customer.email && (
                    <div>
                      <span className="font-medium">Email:</span> {customer.email}
                    </div>
                  )}
                  {customer.phone && (
                    <div>
                      <span className="font-medium">Telefon:</span> {customer.phone}
                    </div>
                  )}
                </div>
              </div>
            )}

            {customerGroup && (
              <div>
                <h4 className="font-semibold mb-3">Grupa / administracja</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-100">
                      {customerGroup.invoice_prefix ? `${customerGroup.invoice_prefix} • ` : ""}
                      {customerGroup.name}
                    </Badge>
                  </div>
                  {customerGroup.description && (
                    <p className="text-muted-foreground">{customerGroup.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Faktury</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLinkedToUser ? (
            <Tabs defaultValue="issued" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="issued">Wystawione dla klienta</TabsTrigger>
                <TabsTrigger value="received">Otrzymane od klienta</TabsTrigger>
              </TabsList>
              
              <TabsContent value="issued" className="mt-6">
                {customerInvoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Brak faktur dla tego klienta</p>
                    <Button asChild className="mt-4">
                      <Link to={`/income/new?customerId=${customer.id}`}>
                        Wystaw pierwszą fakturę
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-0">
                    <div className="divide-y-0">
                      {customerInvoices.map((invoice) => (
                        <ProfessionalInvoiceRow
                          key={invoice.id}
                          invoice={invoice}
                          isIncome={true}
                          onView={(id) => navigate(`/income/${id}`)}
                          onPreview={openPreview}
                          onDownload={async (inv) => {
                            await generateInvoicePdf({
                              invoice: inv,
                              businessProfile,
                              customer,
                              filename: getInvoiceFileName(inv),
                              bankAccounts,
                            });
                          }}
                          onEdit={(id) => navigate(`/income/edit/${id}`)}
                          onDelete={() => {}}
                          onShare={() => {}}
                          onDuplicate={(id) => navigate(`/income/new?duplicateId=${id}`)}
                          onTogglePaid={() => {}}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="received" className="mt-6">
                <ReceivedInvoicesTab />
              </TabsContent>
            </Tabs>
          ) : (
            // Simplified view for non-linked customers
            <div>
              <h3 className="text-lg font-semibold mb-4">Wystawione faktury</h3>
              {customerInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Brak faktur dla tego klienta</p>
                  <Button asChild className="mt-4">
                    <Link to={`/income/new?customerId=${customer.id}`}>
                      Wystaw pierwszą fakturę
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-0">
                  <div className="divide-y-0">
                    {customerInvoices.map((invoice) => (
                      <ProfessionalInvoiceRow
                        key={invoice.id}
                        invoice={invoice}
                        isIncome={true}
                        onView={(id) => navigate(`/income/${id}`)}
                        onPreview={openPreview}
                        onDownload={async (inv) => {
                          await generateInvoicePdf({
                            invoice: inv,
                            businessProfile,
                            customer,
                            filename: getInvoiceFileName(inv),
                            bankAccounts,
                          });
                        }}
                        onEdit={(id) => navigate(`/income/edit/${id}`)}
                        onDelete={() => {}}
                        onShare={() => {}}
                        onDuplicate={(id) => navigate(`/income/new?duplicateId=${id}`)}
                        onTogglePaid={() => {}}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Ten klient nie jest połączony z żadnym kontem w aplikacji. 
                  Nie możesz otrzymywać od niego faktur ani wysyłać wiadomości.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Preview Modal */}
      {isPreviewOpen && previewInvoice && (
        <InvoicePDFViewer 
          invoice={previewInvoice} 
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          businessProfile={businessProfile}
          customer={customer}
          bankAccounts={bankAccounts}
        />
      )}
    </div>
  );
};

export default CustomerDetail;
