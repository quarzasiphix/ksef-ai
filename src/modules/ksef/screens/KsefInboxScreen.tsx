import React, { useState, useEffect } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { RefreshCw, Download, Eye, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ReceivedInvoice {
  id: string;
  ksef_number: string;
  invoice_metadata: any;
  subject_type: string;
  permanent_storage_date: string;
  issue_date: string;
  seller_nip: string;
  buyer_nip?: string;
  total_gross_amount: number;
  currency: string;
  received_at: string;
  processed: boolean;
  linked_invoice_id?: string;
}

export const KsefInboxScreen: React.FC = () => {
  const { selectedProfileId } = useBusinessProfile();
  const [invoices, setInvoices] = useState<ReceivedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ReceivedInvoice | null>(null);
  const [filters, setFilters] = useState({
    subjectType: 'all',
    processed: 'all',
    search: '',
  });

  useEffect(() => {
    if (selectedProfileId) {
      loadInvoices();
    }
  }, [selectedProfileId, filters]);

  const loadInvoices = async () => {
    if (!selectedProfileId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('ksef_invoices_received')
        .select('*')
        .eq('business_profile_id', selectedProfileId)
        .order('received_at', { ascending: false });

      // Apply filters
      if (filters.subjectType !== 'all') {
        query = query.eq('subject_type', filters.subjectType);
      }

      if (filters.processed !== 'all') {
        query = query.eq('processed', filters.processed === 'true');
      }

      if (filters.search) {
        query = query.or(`ksef_number.ilike.%${filters.search}%,seller_nip.ilike.%${filters.search}%,buyer_nip.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!selectedProfileId) return;

    setSyncing(true);
    try {
      // Call sync job manually
      // This would trigger the background sync job for this profile
      // For now, just reload invoices
      await loadInvoices();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleViewInvoice = (invoice: ReceivedInvoice) => {
    setSelectedInvoice(invoice);
  };

  const handleDownloadXml = async (invoice: ReceivedInvoice) => {
    try {
      const { data, error } = await supabase
        .from('ksef_invoices_received')
        .select('invoice_xml')
        .eq('id', invoice.id)
        .single();

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data.invoice_xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.ksef_number}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading XML:', error);
    }
  };

  const getSubjectTypeLabel = (type: string) => {
    switch (type) {
      case 'subject1': return 'Sprzedawca';
      case 'subject2': return 'Nabywca';
      case 'subject3': return 'Inna strona';
      case 'subjectAuthorized': return 'Upoważniony';
      default: return type;
    }
  };

  const getSubjectTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'subject1': return 'bg-green-100 text-green-800';
      case 'subject2': return 'bg-blue-100 text-blue-800';
      case 'subject3': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Odebrane faktury KSeF</h1>
          <p className="text-muted-foreground mt-1">
            Faktury pobrane automatycznie z systemu KSeF
          </p>
        </div>
        <Button
          onClick={handleManualSync}
          disabled={syncing || !selectedProfileId}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Synchronizacja...' : 'Synchronizuj teraz'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Wyszukaj</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Numer KSeF, NIP..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Typ podmiotu</label>
              <Select
                value={filters.subjectType}
                onValueChange={(value) => setFilters({ ...filters, subjectType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="subject1">Sprzedawca</SelectItem>
                  <SelectItem value="subject2">Nabywca</SelectItem>
                  <SelectItem value="subject3">Inna strona</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status przetworzenia</label>
              <Select
                value={filters.processed}
                onValueChange={(value) => setFilters({ ...filters, processed: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="false">Nieprzetworzony</SelectItem>
                  <SelectItem value="true">Przetworzony</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({ subjectType: 'all', processed: 'all', search: '' })}
                className="w-full"
              >
                Wyczyść filtry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Wszystkie faktury</CardDescription>
            <CardTitle className="text-3xl">{invoices.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Nieprzetworzonych</CardDescription>
            <CardTitle className="text-3xl">
              {invoices.filter(i => !i.processed).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Jako sprzedawca</CardDescription>
            <CardTitle className="text-3xl">
              {invoices.filter(i => i.subject_type === 'subject1').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Jako nabywca</CardDescription>
            <CardTitle className="text-3xl">
              {invoices.filter(i => i.subject_type === 'subject2').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista faktur</CardTitle>
          <CardDescription>
            Ostatnia synchronizacja: {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: pl })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Ładowanie faktur...
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak faktur do wyświetlenia
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {invoice.ksef_number}
                      </span>
                      <Badge className={getSubjectTypeBadgeColor(invoice.subject_type)}>
                        {getSubjectTypeLabel(invoice.subject_type)}
                      </Badge>
                      {!invoice.processed && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                          Nieprzetworzony
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>Sprzedawca: {invoice.seller_nip}</span>
                      {invoice.buyer_nip && <span> • Nabywca: {invoice.buyer_nip}</span>}
                      <span> • Data wystawienia: {format(new Date(invoice.issue_date), 'dd.MM.yyyy', { locale: pl })}</span>
                    </div>
                    <div className="text-sm font-medium">
                      Kwota: {invoice.total_gross_amount.toFixed(2)} {invoice.currency}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewInvoice(invoice)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Podgląd
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadXml(invoice)}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      XML
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Viewer Modal - would be implemented separately */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>Szczegóły faktury</CardTitle>
              <CardDescription>{selectedInvoice.ksef_number}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Invoice details would be displayed here */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Numer KSeF</label>
                    <p className="text-sm text-muted-foreground">{selectedInvoice.ksef_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Typ podmiotu</label>
                    <p className="text-sm text-muted-foreground">
                      {getSubjectTypeLabel(selectedInvoice.subject_type)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Sprzedawca NIP</label>
                    <p className="text-sm text-muted-foreground">{selectedInvoice.seller_nip}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nabywca NIP</label>
                    <p className="text-sm text-muted-foreground">{selectedInvoice.buyer_nip || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data wystawienia</label>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedInvoice.issue_date), 'dd.MM.yyyy', { locale: pl })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Kwota brutto</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedInvoice.total_gross_amount.toFixed(2)} {selectedInvoice.currency}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                    Zamknij
                  </Button>
                  <Button onClick={() => handleDownloadXml(selectedInvoice)}>
                    Pobierz XML
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
