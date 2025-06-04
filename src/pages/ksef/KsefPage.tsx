import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building, 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Info
} from "lucide-react";
import { Invoice } from "@/types";
import { mockInvoices } from "@/data/mockData";
import { generateKsefXml, generateKsefData } from "@/integrations/ksef/ksefGenerator";
import { useAuth } from "@/context/AuthContext";
import { RequirePremium } from "@/components/auth/RequirePremium";

const KsefPage = () => {
  const { isPremium } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load invoices (in real app, this would be from API)
    setInvoices(mockInvoices);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Wysłane';
      case 'pending':
        return 'Oczekuje';
      case 'error':
        return 'Błąd';
      default:
        return 'Nie wysłane';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'sent':
        return 'default' as const;
      case 'pending':
        return 'secondary' as const;
      case 'error':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  const handleGenerateXml = async (invoice: Invoice) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // This would normally generate real XML with proper business profile and customer data
      const ksefData = generateKsefData(
        invoice, 
        { 
          id: '1', 
          name: 'Test Business', 
          taxId: '1234567890', 
          address: 'Test Address',
          postalCode: '00-000',
          city: 'Warszawa'
        }, 
        { 
          id: '1', 
          user_id: '1',
          name: 'Test Customer', 
          address: 'Customer Address',
          postalCode: '00-000',
          city: 'Kraków'
        }
      );
      
      if (ksefData) {
        const xmlContent = generateKsefXml(ksefData);
        if (xmlContent) {
          // Download XML file
          const blob = new Blob([xmlContent], { type: 'application/xml' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `KSeF_${invoice.number}.xml`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }
    } catch (error) {
      console.error('Error generating XML:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium) {
    return <RequirePremium feature="KSeF" />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Building className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Krajowy System e-Faktur (KSeF)</h1>
          <p className="text-muted-foreground">Zarządzaj fakturami w systemie KSeF</p>
        </div>
      </div>

      {/* Status Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-blue-800">
          <strong>Uwaga:</strong> System KSeF nie jest w pełni funkcjonalny. Pełne połączenie z systemem KSeF będzie dostępne wkrótce.
          Obecnie możesz generować pliki XML zgodne ze schematem KSeF.
        </AlertDescription>
      </Alert>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faktury w KSeF</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter(inv => inv.ksef?.status === 'sent').length}
            </div>
            <p className="text-xs text-muted-foreground">
              z {invoices.length} faktur
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oczekujące</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter(inv => inv.ksef?.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              do wysłania
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Błędy</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter(inv => inv.ksef?.status === 'error').length}
            </div>
            <p className="text-xs text-muted-foreground">
              do sprawdzenia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nie wysłane</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter(inv => !inv.ksef?.status || inv.ksef?.status === 'none').length}
            </div>
            <p className="text-xs text-muted-foreground">
              do przygotowania
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Faktury</CardTitle>
          <CardDescription>
            Lista faktur z możliwością generowania XML dla KSeF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(invoice.ksef?.status || 'none')}
                    <Badge variant={getStatusVariant(invoice.ksef?.status || 'none')}>
                      {getStatusText(invoice.ksef?.status || 'none')}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium">{invoice.number}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.customerName} • {invoice.totalGrossValue?.toFixed(2)} zł
                    </p>
                    <p className="text-xs text-muted-foreground">{invoice.issueDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 sm:mt-0">
                  {invoice.ksef?.referenceNumber && (
                    <Badge variant="outline" className="text-xs">
                      {invoice.ksef.referenceNumber}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateXml(invoice)}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {loading ? 'Generowanie...' : 'Generuj XML'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KsefPage;
