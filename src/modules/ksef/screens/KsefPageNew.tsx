import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { 
  FileText, 
  Settings, 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  ExternalLink,
  RefreshCw,
  Inbox,
  QrCode
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { KsefStatusBadge } from '@/modules/invoices/components/KsefStatusBadge';
import { KsefSettingsDialog } from '@/modules/invoices/components/KsefSettingsDialog';
import { KsefContextManager } from '@/shared/services/ksef/ksefContextManager';
import { getKsefConfig } from '@/shared/services/ksef/config';
import { getKsefSyncJob } from '@/services/ksefSyncJobInit';

interface KsefStats {
  totalInvoices: number;
  submittedInvoices: number;
  pendingInvoices: number;
  errorInvoices: number;
  receivedInvoices: number;
  unprocessedReceived: number;
}

interface KsefInvoice {
  id: string;
  number: string;
  customerName: string;
  totalGrossValue: number;
  ksefStatus: 'none' | 'pending' | 'submitted' | 'error';
  ksefReferenceNumber?: string | null;
  ksefSubmittedAt?: string | null;
  ksefError?: string | null;
  issueDate: string;
  ksef_qr_code?: string | null;
  ksef_qr_url?: string | null;
}

export default function KsefPageNew() {
  const { toast } = useToast();
  const { selectedProfileId } = useBusinessProfile();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<KsefStats>({
    totalInvoices: 0,
    submittedInvoices: 0,
    pendingInvoices: 0,
    errorInvoices: 0,
    receivedInvoices: 0,
    unprocessedReceived: 0,
  });
  const [invoices, setInvoices] = useState<KsefInvoice[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [ksefIntegration, setKsefIntegration] = useState<any>(null);

  useEffect(() => {
    if (selectedProfileId) {
      loadData();
    }
  }, [selectedProfileId]);

  const loadData = async () => {
    if (!selectedProfileId) return;

    try {
      setLoading(true);
      
      // Load KSeF integration status
      const { data: integration } = await supabase
        .from('ksef_integrations')
        .select('*')
        .eq('business_profile_id', selectedProfileId)
        .eq('status', 'active')
        .single();

      setKsefIntegration(integration);

      // Load sent invoices
      await loadSentInvoices(selectedProfileId);
      
      // Load received invoices stats
      await loadReceivedInvoicesStats(selectedProfileId);
    } catch (error) {
      console.error('Error loading KSeF data:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się załadować danych KSeF',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSentInvoices = async (businessProfileId: string) => {
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices_with_customer_name')
      .select(`
        id,
        number,
        customername,
        total_gross_value,
        ksef_status,
        ksef_reference_number,
        ksef_submitted_at,
        ksef_error,
        issue_date,
        ksef_qr_code,
        ksef_qr_url
      `)
      .eq('business_profile_id', selectedProfileId)
      .order('issue_date', { ascending: false })
      .limit(50);

    if (invoicesData) {
      const mappedInvoices = invoicesData.map((invoice: any) => ({
        id: invoice.id,
        number: invoice.number,
        customerName: invoice.customername,
        totalGrossValue: invoice.total_gross_value,
        ksefStatus: invoice.ksef_status || 'none',
        ksefReferenceNumber: invoice.ksef_reference_number,
        ksefSubmittedAt: invoice.ksef_submitted_at,
        ksefError: invoice.ksef_error,
        issueDate: invoice.issue_date,
        ksef_qr_code: invoice.ksef_qr_code,
        ksef_qr_url: invoice.ksef_qr_url,
      }));
      
      setInvoices(mappedInvoices);
      
      // Calculate stats for sent invoices
      const sentStats = mappedInvoices.reduce((acc: any, invoice: KsefInvoice) => {
        acc.totalInvoices++;
        switch (invoice.ksefStatus) {
          case 'submitted':
            acc.submittedInvoices++;
            break;
          case 'pending':
            acc.pendingInvoices++;
            break;
          case 'error':
            acc.errorInvoices++;
            break;
        }
        return acc;
      }, {
        totalInvoices: 0,
        submittedInvoices: 0,
        pendingInvoices: 0,
        errorInvoices: 0,
      });
      
      setStats(prev => ({ ...prev, ...sentStats }));
    }
  };

  const loadReceivedInvoicesStats = async (businessProfileId: string) => {
    // Count received invoices
    const { count: receivedCount } = await supabase
      .from('ksef_invoices_received')
      .select('id', { count: 'exact', head: true })
      .eq('business_profile_id', businessProfileId);

    // Count unprocessed received invoices
    const { count: unprocessedCount } = await supabase
      .from('ksef_invoices_received')
      .select('id', { count: 'exact', head: true })
      .eq('business_profile_id', businessProfileId)
      .eq('processed', false);

    setStats(prev => ({
      ...prev,
      receivedInvoices: receivedCount || 0,
      unprocessedReceived: unprocessedCount || 0,
    }));
  };

  const handleManualSync = async () => {
    if (!selectedProfileId) return;

    setSyncing(true);
    try {
      const syncJob = getKsefSyncJob();
      await syncJob.runManualSync(selectedProfileId);
      
      toast({
        title: 'Sukces',
        description: 'Synchronizacja faktur zakończona',
      });
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zsynchronizować faktur',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedProfileId) return;

    try {
      const config = getKsefConfig('test');
      const contextManager = new KsefContextManager(config, supabase);
      const ksefClient = await contextManager.forCompany(selectedProfileId);
      const result = await ksefClient.testConnection();

      if (result.success) {
        toast({
          title: 'Sukces',
          description: 'Połączenie z KSeF działa poprawnie',
        });
      } else {
        toast({
          title: 'Błąd',
          description: result.error || 'Nie udało się połączyć z KSeF',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się przetestować połączenia',
        variant: 'destructive',
      });
    }
  };

  const isKsefEnabled = ksefIntegration?.status === 'active';

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">KSeF 2.0</h1>
          <p className="text-muted-foreground">
            Krajowy System e-Faktur - Wysyłka, odbiór i zarządzanie fakturami
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleManualSync}
            disabled={!isKsefEnabled || syncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronizacja...' : 'Synchronizuj faktury'}
          </Button>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!isKsefEnabled}
          >
            Testuj połączenie
          </Button>
          <Button
            variant="outline"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Ustawienia KSeF
          </Button>
        </div>
      </div>

      {!isKsefEnabled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div>
              Integracja KSeF nie jest włączona dla tego profilu firmy. 
              Kliknij "Ustawienia KSeF" aby skonfigurować integrację.
            </div>
            <div className="flex items-center gap-2">
              <span>Dokumentacja API:</span>
              <a
                href="https://api-test.ksef.mf.gov.pl/docs/v2"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              >
                KSeF 2.0 API (Test)
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Przegląd</TabsTrigger>
          <TabsTrigger value="sent">Wysłane faktury</TabsTrigger>
          <TabsTrigger value="received">Odebrane faktury</TabsTrigger>
          <TabsTrigger value="queue">Kolejka</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wysłane do KSeF</CardTitle>
                <Upload className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.submittedInvoices}</div>
                <p className="text-xs text-muted-foreground">
                  Z {stats.totalInvoices} faktur
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Odebrane z KSeF</CardTitle>
                <Inbox className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.receivedInvoices}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.unprocessedReceived} nieprzetworzonych
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Oczekujące</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingInvoices}</div>
                <p className="text-xs text-muted-foreground">
                  W kolejce
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Szybkie akcje</CardTitle>
                <CardDescription>
                  Zarządzaj integracją KSeF 2.0
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full" 
                  disabled={!isKsefEnabled || syncing}
                  onClick={handleManualSync}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  Synchronizuj faktury teraz
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveTab('received')}
                >
                  <Inbox className="w-4 h-4 mr-2" />
                  Zobacz odebrane faktury ({stats.receivedInvoices})
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleTestConnection}
                  disabled={!isKsefEnabled}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Testuj połączenie z KSeF
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status integracji</CardTitle>
                <CardDescription>
                  KSeF 2.0 API - api-test.ksef.mf.gov.pl
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Środowisko</span>
                  <Badge variant={ksefIntegration?.environment === 'production' ? 'default' : 'secondary'}>
                    {ksefIntegration?.environment === 'production' ? 'Produkcyjne' : 'Testowe'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Status</span>
                  <Badge variant={isKsefEnabled ? 'default' : 'destructive'}>
                    {isKsefEnabled ? 'Aktywna' : 'Nieaktywna'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Automatyczna synchronizacja</span>
                  <Badge variant="default">
                    Co 15 minut
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Kody QR</span>
                  <Badge variant="default">
                    <QrCode className="w-3 h-3 mr-1" />
                    Włączone
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wysłane faktury</CardTitle>
              <CardDescription>
                Faktury wysłane do KSeF z kodami QR
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Ładowanie...</div>
              ) : (
                <div className="space-y-4">
                  {invoices.filter(inv => inv.ksefStatus === 'submitted').map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{invoice.number}</h4>
                          <KsefStatusBadge
                            status={invoice.ksefStatus}
                            referenceNumber={invoice.ksefReferenceNumber}
                            errorMessage={invoice.ksefError}
                            submittedAt={invoice.ksefSubmittedAt}
                          />
                          {invoice.ksef_qr_code && (
                            <Badge variant="outline" className="gap-1">
                              <QrCode className="w-3 h-3" />
                              Kod QR
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {invoice.customerName} • {new Date(invoice.issueDate).toLocaleDateString('pl-PL')} • 
                          {invoice.totalGrossValue.toFixed(2)} PLN
                        </div>
                        {invoice.ksefReferenceNumber && (
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            KSeF: {invoice.ksefReferenceNumber}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {invoice.ksef_qr_code && (
                          <Button variant="outline" size="sm">
                            <QrCode className="w-4 h-4 mr-1" />
                            QR
                          </Button>
                        )}
                        {invoice.ksefReferenceNumber && (
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            UPO
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Odebrane faktury</CardTitle>
                  <CardDescription>
                    Faktury automatycznie pobrane z KSeF
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/settings/ksef-inbox'}
                >
                  <Inbox className="w-4 h-4 mr-2" />
                  Otwórz skrzynkę KSeF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Inbox className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  {stats.receivedInvoices} faktur odebranych
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {stats.unprocessedReceived} oczekuje na przetworzenie
                </p>
                <Button
                  onClick={() => window.location.href = '/settings/ksef-inbox'}
                >
                  Zobacz wszystkie odebrane faktury
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kolejka wysyłania</CardTitle>
              <CardDescription>
                Faktury oczekujące na wysyłkę do KSeF
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Ładowanie...</div>
              ) : (
                <div className="space-y-4">
                  {invoices.filter(inv => inv.ksefStatus === 'pending' || inv.ksefStatus === 'none').length > 0 ? (
                    invoices.filter(inv => inv.ksefStatus === 'pending' || inv.ksefStatus === 'none').map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium">{invoice.number}</h4>
                            <Badge variant="secondary">
                              <Clock className="w-3 h-3 mr-1" />
                              Oczekuje
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {invoice.customerName} • {new Date(invoice.issueDate).toLocaleDateString('pl-PL')} • 
                            {invoice.totalGrossValue.toFixed(2)} PLN
                          </div>
                        </div>
                        <Button size="sm" disabled={!isKsefEnabled}>
                          <Upload className="w-4 h-4 mr-1" />
                          Wyślij teraz
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Brak faktur w kolejce</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <KsefSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        businessProfileId={selectedProfileId || ''}
      />
    </div>
  );
}
