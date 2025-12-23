import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
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
  Lock,
  AlertCircle,
  XCircle,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useAuth } from "@/shared/hooks/useAuth";
import { formatCurrency } from "@/shared/lib/utils";
import { getReceivedInvoiceWithSender } from "@/modules/invoices/data/receivedInvoicesRepository";
import { DiscussionPanel } from "@/modules/invoices/components/discussion/DiscussionPanel";
import { AgreementStatusBadge } from "@/modules/invoices/components/AgreementStatusBadge";
import { AgreementActionButtons } from "@/modules/invoices/components/AgreementActionButtons";
import { AgreementHistory } from "@/modules/invoices/components/AgreementHistory";
import { updateInvoiceAgreementStatus } from "@/modules/contracts/data/agreementRepository";
import { InvoiceStateBanner } from "@/modules/invoices/components/InvoiceStateBanner";
import { RequestCorrectionModal, type CorrectionReason } from "@/modules/invoices/components/RequestCorrectionModal";
import { RejectInvoiceModal, type RejectReason } from "@/modules/invoices/components/RejectInvoiceModal";
import { DeliveryIdentityBlock } from "@/modules/invoices/components/DeliveryIdentityBlock";
import { InvoiceQualityIndicators } from "@/modules/invoices/components/InvoiceQualityIndicators";
import { ERPSyncWidget, type ERPSyncStatus } from "@/modules/invoices/components/ERPSyncWidget";
import { toast } from "sonner";

type InvoiceTab = "details" | "discussion" | "history";

export const ReceivedInvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<InvoiceTab>("details");
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ["received-invoice-detail", id],
    queryFn: async () => {
      if (!id) return null;
      return await getReceivedInvoiceWithSender(id);
    },
    enabled: !!id && !!user,
  });

  // Sync tab with router query params, defaulting to details
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

  const handleRequestCorrection = async (reasons: CorrectionReason[], comment: string) => {
    if (!user) throw new Error('User not authenticated');
    const reasonsText = reasons.join(', ');
    const fullComment = `Wymagane poprawki: ${reasonsText}\n\n${comment}`;
    await updateInvoiceAgreementStatus(
      invoiceData.invoice_id,
      'correction_needed',
      user.id,
      'corrected',
      fullComment
    );
    queryClient.invalidateQueries({ queryKey: ['received-invoice-detail', id] });
    toast.success('Wysłano prośbę o korektę');
  };

  const handleReject = async (reason: RejectReason, comment: string, notifyCounterparty: boolean) => {
    if (!user) throw new Error('User not authenticated');
    const fullComment = `Powód: ${reason}\n\n${comment}${notifyCounterparty ? '\n\n[Kontrahent powiadomiony]' : ''}`;
    await updateInvoiceAgreementStatus(
      invoiceData.invoice_id,
      'rejected',
      user.id,
      'rejected',
      fullComment
    );
    queryClient.invalidateQueries({ queryKey: ['received-invoice-detail', id] });
    toast.success('Dokument odrzucony');
  };

  const handleApprove = async (comment?: string) => {
    if (!user) throw new Error('User not authenticated');
    await updateInvoiceAgreementStatus(
      invoiceData.invoice_id,
      'approved',
      user.id,
      'approved',
      comment
    );
    queryClient.invalidateQueries({ queryKey: ['received-invoice-detail', id] });
    toast.success('Dokument zatwierdzony i zablokowany');
  };

  // Mock data quality checks - in production, these would come from backend
  const dataQualityCheck = {
    status: invoiceData?.sender_address && invoiceData?.sender_tax_id ? 'ok' as const : 'warning' as const,
    label: 'Zgodność danych',
    message: invoiceData?.sender_address && invoiceData?.sender_tax_id 
      ? 'Wszystkie wymagane dane kontrahenta są kompletne'
      : 'Brakuje niektórych danych kontrahenta (adres, NIP)'
  };

  const duplicateCheck = {
    status: 'ok' as const,
    label: 'Sprawdzenie duplikatów',
    message: 'Nie znaleziono duplikatów w systemie'
  };

  // Mock ERP sync status
  const erpSyncStatus: ERPSyncStatus = 
    invoiceData?.agreement_status === 'approved' || invoiceData?.agreement_status === 'ready_for_ksef'
      ? 'not_configured'
      : 'pending';

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
              <Badge variant="secondary" className="text-base px-3 py-1 font-bold">
                Do zapłaty: {formatCurrency(invoiceData.total_gross_value, { currency: invoiceData.currency })}
              </Badge>
            </div>
          </div>

          <Button size="lg" variant="outline" onClick={handleDownloadPdf}>
            <Download className="h-5 w-5 mr-2" />
            Pobierz PDF
          </Button>
        </div>

        {/* State Banner */}
        <div className="mb-6">
          <InvoiceStateBanner
            status={invoiceData.agreement_status || 'received'}
            senderName={invoiceData.sender_name}
            receivedDate={invoiceData.issue_date}
            discussionCount={0}
          />
        </div>

        {/* Prominent Tab Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as InvoiceTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 h-14 mb-6">
            <TabsTrigger value="discussion" className="text-lg gap-2 relative">
              <MessagesSquare className="h-5 w-5" />
              Dyskusja
              {/* TODO: Add unread dot when messages exist */}
            </TabsTrigger>
            <TabsTrigger value="details" className="text-lg gap-2">
              <Info className="h-5 w-5" />
              Szczegóły
            </TabsTrigger>
            <TabsTrigger value="history" className="text-lg gap-2">
              <History className="h-5 w-5" />
              Historia uzgodnień
            </TabsTrigger>
          </TabsList>

          {/* Discussion Tab - Now Primary */}
          <TabsContent value="discussion" className="mt-0">
            {/* Action Buttons at Top of Discussion */}
            {['received', 'under_discussion', 'correction_needed'].includes(invoiceData.agreement_status || 'received') && (
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => {
                      // Open approve dialog from AgreementActionButtons
                      const event = new CustomEvent('open-approve-dialog');
                      window.dispatchEvent(event);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                    size="lg"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Zatwierdź i zablokuj dokument
                  </Button>
                  <Button
                    onClick={() => setShowCorrectionModal(true)}
                    variant="outline"
                    className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                    size="lg"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Wymagana korekta
                  </Button>
                  <Button
                    onClick={() => setShowRejectModal(true)}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    size="lg"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Odrzuć
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Po zatwierdzeniu dokument staje się nieedytowalny i trafia do ERP / kolejki księgowania
                </p>
              </div>
            )}

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
              <CardContent className="pt-6" data-discussion-panel>
                <DiscussionPanel
                  invoiceId={invoiceData.invoice_id}
                  invoiceNumber={invoiceData.invoice_number}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-0">
            {/* Action Buttons - Prominent at Top of Details */}
            {['received', 'under_discussion', 'correction_needed'].includes(invoiceData.agreement_status || 'received') && (
              <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold mb-2">Co chcesz zrobić z tą fakturą?</h3>
                    <p className="text-muted-foreground">
                      Wybierz jedną z poniższych opcji, aby zatwierdzić, poprawić lub zgłosić problem
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Accept Button - Green, Most Prominent */}
                    <Button
                      onClick={async () => {
                        await handleApprove();
                      }}
                      className="h-auto py-6 px-6 bg-green-600 hover:bg-green-700 text-white font-bold text-lg flex-col gap-3"
                      size="lg"
                    >
                      <Lock className="h-8 w-8" />
                      <div className="text-center">
                        <div>Zatwierdź i zablokuj</div>
                        <div className="text-xs font-normal mt-1 opacity-90">
                          Wszystko jest OK, akceptuję fakturę
                        </div>
                      </div>
                    </Button>

                    {/* Request Correction - Orange */}
                    <Button
                      onClick={() => {
                        setActiveTab('discussion');
                        setTimeout(() => {
                          const discussionPanel = document.querySelector('[data-discussion-panel]');
                          discussionPanel?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      variant="outline"
                      className="h-auto py-6 px-6 border-2 border-orange-400 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20 font-bold text-lg flex-col gap-3"
                      size="lg"
                    >
                      <MessageSquare className="h-8 w-8" />
                      <div className="text-center">
                        <div>Zgłoś problem</div>
                        <div className="text-xs font-normal mt-1">
                          Coś jest nie tak, chcę porozmawiać
                        </div>
                      </div>
                    </Button>

                    {/* Reject - Red */}
                    <Button
                      onClick={() => setShowRejectModal(true)}
                      variant="outline"
                      className="h-auto py-6 px-6 border-2 border-red-400 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold text-lg flex-col gap-3"
                      size="lg"
                    >
                      <XCircle className="h-8 w-8" />
                      <div className="text-center">
                        <div>Odrzuć całkowicie</div>
                        <div className="text-xs font-normal mt-1">
                          To nie moja faktura lub jest błędna
                        </div>
                      </div>
                    </Button>
                  </div>

                  <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                    <p className="text-sm text-center text-blue-900 dark:text-blue-100">
                      <strong>Wskazówka:</strong> Jeśli masz pytania lub wątpliwości, kliknij "Zgłoś problem" aby porozmawiać z wystawcą przed zatwierdzeniem
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

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

        {/* Sidebar - Right Side - Enhanced with Quality Indicators */}
        <div className="space-y-6">
          {/* Delivery & Identity Verification */}
          <DeliveryIdentityBlock
            isVerified={true}
            isNativeDelivery={true}
            counterpartyName={invoiceData.sender_name}
            counterpartyTaxId={invoiceData.sender_tax_id}
            onInviteToNetwork={() => {
              toast.info('Funkcja zaproszenia będzie dostępna wkrótce');
            }}
          />

          {/* Quality Indicators */}
          <InvoiceQualityIndicators
            dataCompleteness={dataQualityCheck}
            duplicateCheck={duplicateCheck}
            relatedDocuments={[]}
          />
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
                    {formatCurrency(invoiceData.total_net_value, { currency: invoiceData.currency })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT:</span>
                  <span className="font-medium">
                    {formatCurrency(invoiceData.total_vat_value, { currency: invoiceData.currency })}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Do zapłaty:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(invoiceData.total_gross_value, { currency: invoiceData.currency })}
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

          {/* ERP Sync Widget - Only show when approved/locked */}
          {(invoiceData.agreement_status === 'approved' || invoiceData.agreement_status === 'ready_for_ksef') && (
            <ERPSyncWidget
              status={erpSyncStatus}
              provider="Comarch Optima"
              onExport={() => {
                toast.info('Funkcja eksportu będzie dostępna wkrótce');
              }}
            />
          )}
            </div>
          </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historia uzgodnień
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Pełna ścieżka audytowa wszystkich zmian statusu i akcji
                </p>
              </CardHeader>
              <CardContent>
                <AgreementHistory invoiceId={invoiceData.invoice_id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <RequestCorrectionModal
        open={showCorrectionModal}
        onOpenChange={setShowCorrectionModal}
        onSubmit={handleRequestCorrection}
      />
      <RejectInvoiceModal
        open={showRejectModal}
        onOpenChange={setShowRejectModal}
        onSubmit={handleReject}
      />

      {/* Hidden AgreementActionButtons for approve dialog */}
      <div className="hidden">
        <AgreementActionButtons
          invoiceId={invoiceData.invoice_id}
          currentStatus={invoiceData.agreement_status || 'received'}
          onStatusChange={async (newStatus, action, comment) => {
            if (!user) throw new Error('User not authenticated');
            await updateInvoiceAgreementStatus(
              invoiceData.invoice_id,
              newStatus as any,
              user.id,
              action,
              comment
            );
            queryClient.invalidateQueries({ queryKey: ['received-invoice-detail', id] });
          }}
        />
      </div>
    </div>
  );
};

export default ReceivedInvoiceDetail;
