import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Download,
  MessageSquare,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  Info,
  MessagesSquare,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { getReceivedInvoiceWithSender } from "@/integrations/supabase/repositories/receivedInvoicesRepository";
import { DiscussionPanel } from "@/components/invoices/discussion/DiscussionPanel";

export const ReceivedInvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("details");

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ["received-invoice-detail", id],
    queryFn: async () => {
      if (!id) return null;
      return await getReceivedInvoiceWithSender(id);
    },
    enabled: !!id && !!user,
  });

  // Auto-switch to discussion tab if requested
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('section') === 'discussion' && !isLoading) {
      setActiveTab('discussion');
    }
  }, [location.search, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie faktury...</p>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Faktura nie została znaleziona</h2>
          <p className="text-muted-foreground mb-6">Ta faktura nie istnieje lub nie masz do niej dostępu</p>
          <Button onClick={() => navigate('/inbox')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do skrzynki
          </Button>
        </div>
      </div>
    );
  }

  const handleDownloadPdf = () => {
    // TODO: Implement PDF download for received invoices
    console.log('Download PDF for received invoice:', invoiceData.invoice_id);
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/inbox')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Powrót do skrzynki
        </Button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{invoiceData.invoice_number}</h1>
              <Badge variant="secondary" className="text-base px-3 py-1">Otrzymana</Badge>
            </div>
            <p className="text-lg text-muted-foreground mb-3">
              Otrzymano: {format(new Date(invoiceData.issue_date), "dd MMMM yyyy", { locale: pl })}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant={invoiceData.is_paid ? "default" : "outline"} className="text-base px-3 py-1">
                {invoiceData.is_paid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Opłacona
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-1" />
                    Do zapłaty
                  </>
                )}
              </Badge>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(invoiceData.total_gross_value, invoiceData.currency)}
              </span>
            </div>
          </div>

          <Button size="lg" variant="outline" onClick={handleDownloadPdf}>
            <Download className="h-5 w-5 mr-2" />
            Pobierz PDF
          </Button>
        </div>

        {/* Prominent Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 mb-6">
            <TabsTrigger value="details" className="text-lg gap-2">
              <Info className="h-5 w-5" />
              Szczegóły faktury
            </TabsTrigger>
            <TabsTrigger value="discussion" className="text-lg gap-2 relative">
              <MessagesSquare className="h-5 w-5" />
              Dyskusja i negocjacje
              <Badge variant="secondary" className="ml-2">Nowe!</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sender Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Wystawca faktury
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nazwa</p>
                <p className="text-lg font-semibold">{invoiceData.sender_name}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">NIP</p>
                  <p className="font-medium">{invoiceData.sender_tax_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Miasto</p>
                  <p className="font-medium">{invoiceData.sender_city}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Adres</p>
                <p className="font-medium">
                  {invoiceData.sender_address}, {invoiceData.sender_postal_code} {invoiceData.sender_city}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Buyer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Nabywca (Ty)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nazwa</p>
                <p className="text-lg font-semibold">{invoiceData.buyer_name}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">NIP</p>
                  <p className="font-medium">{invoiceData.buyer_tax_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Miasto</p>
                  <p className="font-medium">{invoiceData.buyer_city}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Adres</p>
                <p className="font-medium">
                  {invoiceData.buyer_address}, {invoiceData.buyer_postal_code} {invoiceData.buyer_city}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          {invoiceData.comments && (
            <Card>
              <CardHeader>
                <CardTitle>Uwagi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{invoiceData.comments}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Podsumowanie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Wartość netto:</span>
                  <span className="font-medium">
                    {formatCurrency(invoiceData.total_net_value, invoiceData.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT:</span>
                  <span className="font-medium">
                    {formatCurrency(invoiceData.total_vat_value, invoiceData.currency)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Do zapłaty:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(invoiceData.total_gross_value, invoiceData.currency)}
                  </span>
                </div>
              </div>

              {!invoiceData.is_paid && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Termin płatności:</span>
                    <span className="font-medium">
                      {format(new Date(invoiceData.due_date), "dd.MM.yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <Clock className="h-4 w-4" />
                    <span>
                      {Math.ceil(
                        (new Date(invoiceData.due_date).getTime() - new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      dni do terminu
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Szczegóły
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data wystawienia:</span>
                <span className="font-medium">
                  {format(new Date(invoiceData.issue_date), "dd.MM.yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data sprzedaży:</span>
                <span className="font-medium">
                  {format(new Date(invoiceData.sell_date), "dd.MM.yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Termin płatności:</span>
                <span className="font-medium">
                  {format(new Date(invoiceData.due_date), "dd.MM.yyyy")}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sposób płatności:</span>
                <span className="font-medium">
                  {invoiceData.payment_method === 'transfer'
                    ? 'Przelew'
                    : invoiceData.payment_method === 'cash'
                    ? 'Gotówka'
                    : invoiceData.payment_method === 'card'
                    ? 'Karta'
                    : 'Inne'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waluta:</span>
                <span className="font-medium">{invoiceData.currency}</span>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>
          </TabsContent>

          {/* Discussion Tab */}
          <TabsContent value="discussion" className="mt-0">
            <Card className="border-2 border-primary/20">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MessagesSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Dyskusja z wystawcą</CardTitle>
                    <p className="text-muted-foreground text-base mt-1">
                      Negocjuj warunki przed zatwierdzeniem faktury
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <DiscussionPanel
                  invoiceId={invoiceData.invoice_id}
                  invoiceNumber={invoiceData.invoice_number}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReceivedInvoiceDetail;
