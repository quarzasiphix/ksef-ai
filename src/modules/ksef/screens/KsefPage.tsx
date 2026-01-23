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
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { KsefStatusBadge } from '@/modules/invoices/components/KsefStatusBadge';
import { KsefSettingsDialog } from '@/modules/invoices/components/KsefSettingsDialog';

interface KsefStats {
  totalInvoices: number;
  submittedInvoices: number;
  pendingInvoices: number;
  errorInvoices: number;
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
}

export default function KsefPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<KsefStats>({
    totalInvoices: 0,
    submittedInvoices: 0,
    pendingInvoices: 0,
    errorInvoices: 0,
  });
  const [invoices, setInvoices] = useState<KsefInvoice[]>([]);
  const [selectedBusinessProfile, setSelectedBusinessProfile] = useState<string>('');
  const [businessProfiles, setBusinessProfiles] = useState<any[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, [selectedBusinessProfile]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load business profiles
      const { data: profiles } = await supabase
        .from('business_profiles')
        .select('*')
        .order('name');

      if (profiles && profiles.length > 0) {
        setBusinessProfiles(profiles);
        if (!selectedBusinessProfile) {
          setSelectedBusinessProfile(profiles[0].id);
        }
      }

      // Load invoices and stats
      if (selectedBusinessProfile) {
        await loadInvoices(selectedBusinessProfile);
      }
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się załadować danych KSeF',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async (businessProfileId: string) => {
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select(`
        id,
        number,
        customerName,
        totalGrossValue,
        ksef_status,
        ksef_reference_number,
        ksef_submitted_at,
        ksef_error,
        issueDate
      `)
      .eq('businessProfileId', businessProfileId)
      .order('issueDate', { ascending: false })
      .limit(50);

    if (invoicesData) {
      const mappedInvoices = invoicesData.map((invoice: any) => ({
        id: invoice.id,
        number: invoice.number,
        customerName: invoice.customerName,
        totalGrossValue: invoice.totalGrossValue,
        ksefStatus: invoice.ksef_status || 'none',
        ksefReferenceNumber: invoice.ksef_reference_number,
        ksefSubmittedAt: invoice.ksef_submitted_at,
        ksefError: invoice.ksef_error,
        issueDate: invoice.issueDate,
      }));
      
      setInvoices(mappedInvoices);
      
      // Calculate stats
      const newStats = mappedInvoices.reduce((acc: KsefStats, invoice: KsefInvoice) => {
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
      
      setStats(newStats);
    }
  };

  const currentProfile = businessProfiles.find(p => p.id === selectedBusinessProfile);
  const isKsefEnabled = currentProfile?.ksef_enabled;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">KSeF</h1>
          <p className="text-muted-foreground">
            Krajowy System e-Faktur - Zarządzanie wysyłką i odbiorem faktur
          </p>
        </div>
        <div className="flex gap-2">
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
              <span>Potrzebujesz tokenu KSeF?</span>
              <a
                href="https://ksef-test.mf.gov.pl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              >
                Otwórz testowy portal KSeF
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Przegląd</TabsTrigger>
          <TabsTrigger value="invoices">Faktury</TabsTrigger>
          <TabsTrigger value="queue">Kolejka</TabsTrigger>
          <TabsTrigger value="logs">Logi</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wszystkie faktury</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalInvoices}</div>
                <p className="text-xs text-muted-foreground">
                  W systemie
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wysłane</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.submittedInvoices}</div>
                <p className="text-xs text-muted-foreground">
                  Do KSeF
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Błędy</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.errorInvoices}</div>
                <p className="text-xs text-muted-foreground">
                  Wymagają uwagi
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
                  Zarządzaj integracją KSeF
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full" 
                  disabled={!isKsefEnabled}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Wyślij wszystkie oczekujące
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={!isKsefEnabled}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Pobierz UPO dla wysłanych
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status integracji</CardTitle>
                <CardDescription>
                  Aktualny stan konfiguracji KSeF
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Środowisko</span>
                  <Badge variant={currentProfile?.ksef_environment === 'production' ? 'default' : 'secondary'}>
                    {currentProfile?.ksef_environment === 'production' ? 'Produkcyjne' : 'Testowe'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Status</span>
                  <Badge variant={isKsefEnabled ? 'default' : 'destructive'}>
                    {isKsefEnabled ? 'Aktywna' : 'Nieaktywna'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Token</span>
                  <Badge variant={currentProfile?.ksef_token_encrypted ? 'default' : 'secondary'}>
                    {currentProfile?.ksef_token_encrypted ? 'Skonfigurowany' : 'Brak'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faktury</CardTitle>
              <CardDescription>
                Status wysyłki faktur do KSeF
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Ładowanie...</div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
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
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {invoice.customerName} • {new Date(invoice.issueDate).toLocaleDateString('pl-PL')} • 
                          {invoice.totalGrossValue.toFixed(2)} PLN
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {invoice.ksefReferenceNumber && (
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            UPO
                          </Button>
                        )}
                        {invoice.ksefStatus === 'none' && (
                          <Button size="sm" disabled={!isKsefEnabled}>
                            <Upload className="w-4 h-4 mr-1" />
                            Wyślij
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

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kolejka wysyłania</CardTitle>
              <CardDescription>
                Faktury oczekujące na wysyłkę (Offline24)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Brak faktur w kolejce</p>
                <p className="text-sm">Faktury zostaną dodane do kolejki automatycznie</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logi operacji</CardTitle>
              <CardDescription>
                Historia operacji KSeF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Brak logów</p>
                <p className="text-sm">Logi pojawią się po pierwszych operacjach KSeF</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <KsefSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        businessProfileId={selectedBusinessProfile}
      />
    </div>
  );
}
