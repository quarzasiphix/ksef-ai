import React, { useState, useEffect } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Calculator, FileText, TrendingUp, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';

export default function VatPage() {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const [isLoading, setIsLoading] = useState(false);

  // VAT status based on profile
  const isVatExempt = selectedProfile?.is_vat_exempt ?? false;
  const vatStatus = isVatExempt ? 'Zwolniony' : 'Czynny podatnik';

  // Mock data for now - will be replaced with real data later
  const vatData = {
    currentQuarter: {
      period: 'Q1 2024',
      vatDue: 12500,
      vatCollected: 28000,
      vatDeductible: 15500,
      netVat: 12500,
      transactions: 45
    },
    lastQuarter: {
      period: 'Q4 2023',
      vatDue: 8900,
      vatCollected: 22000,
      vatDeductible: 13100,
      netVat: 8900,
      transactions: 38
    },
    yearToDate: {
      vatDue: 21400,
      vatCollected: 50000,
      vatDeductible: 28600,
      transactions: 83
    }
  };

  if (!selectedProfile) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Wybierz profil firmy</h3>
          <p className="text-muted-foreground">Nie wybrano profilu działalności gospodarczej</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">VAT</h1>
          <p className="text-muted-foreground">
            Zarządzanie podatkiem od towarów i usług dla {selectedProfile.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Deklaracja VAT-7
          </Button>
          <Button>
            <Calculator className="h-4 w-4 mr-2" />
            Nowa transakcja
          </Button>
        </div>
      </div>

      {/* VAT Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Status VAT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isVatExempt ? (
                <>
                  <Badge variant="secondary">Zwolniony (art. 113)</Badge>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </>
              ) : (
                <Badge variant="default">Czynny podatnik VAT</Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {isVatExempt 
                ? "Zwolnienie z VAT do 200 000 zł przychodów rocznie"
                : "Obowiązek rozliczenia VAT - okresy miesięczne"
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              VAT ze sprzedaży
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(vatData.currentQuarter.vatCollected)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {vatData.currentQuarter.period}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              VAT naliczony
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(vatData.currentQuarter.vatDeductible)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {vatData.currentQuarter.period}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              VAT do zapłaty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(vatData.currentQuarter.vatDue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {vatData.currentQuarter.period}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              Transakcje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {vatData.currentQuarter.transactions}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {vatData.currentQuarter.period}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quarterly Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bieżący kwartał ({vatData.currentQuarter.period})</CardTitle>
            <CardDescription>
              Podsumowanie VAT za bieżący okres rozliczeniowy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">VAT ze sprzedaży:</span>
                <span className="font-medium text-green-600">
                  +{formatCurrency(vatData.currentQuarter.vatCollected)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">VAT naliczony:</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(vatData.currentQuarter.vatDeductible)}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-medium">
                  <span>VAT do zapłaty:</span>
                  <span className="text-blue-600">
                    {formatCurrency(vatData.currentQuarter.vatDue)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Poprzedni kwartał ({vatData.lastQuarter.period})</CardTitle>
            <CardDescription>
              Porównanie z poprzednim okresem rozliczeniowym
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">VAT ze sprzedaży:</span>
                <span className="font-medium text-green-600">
                  +{formatCurrency(vatData.lastQuarter.vatCollected)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">VAT naliczony:</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(vatData.lastQuarter.vatDeductible)}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-medium">
                  <span>VAT do zapłaty:</span>
                  <span className="text-blue-600">
                    {formatCurrency(vatData.lastQuarter.vatDue)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Year to Date Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Podsumowanie roku
          </CardTitle>
          <CardDescription>
            Dane VAT od początku roku ({format(new Date(), 'yyyy', { locale: pl })})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(vatData.yearToDate.vatCollected)}
              </div>
              <p className="text-sm text-muted-foreground">VAT ze sprzedaży</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(vatData.yearToDate.vatDeductible)}
              </div>
              <p className="text-sm text-muted-foreground">VAT naliczony</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(vatData.yearToDate.vatDue)}
              </div>
              <p className="text-sm text-muted-foreground">VAT do zapłaty</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for future features */}
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Funkcje w rozwoju</h3>
          <p className="text-muted-foreground mb-4">
            Zaawansowane funkcje VAT będą dodane w przyszłości
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Automatyczne generowanie deklaracji VAT-7</p>
            <p>• Integracja z systemem KSeF</p>
            <p>• Analiza i optymalizacja VAT</p>
            <p>• Przypomnienia o terminach płatności</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
