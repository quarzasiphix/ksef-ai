import React, { useEffect, useState } from 'react';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, TrendingUp, Building2, DollarSign } from 'lucide-react';
import { calculateBalanceSheet, getBalanceSheets, saveBalanceSheet } from '@/integrations/supabase/repositories/accountingRepository';
import type { BalanceSheetData, BalanceSheet as BalanceSheetType } from '@/types/accounting';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const BalanceSheet = () => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null);
  const [savedBalanceSheets, setSavedBalanceSheets] = useState<BalanceSheetType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  useEffect(() => {
    if (selectedProfileId) {
      loadBalanceSheets();
      calculateBalanceSheetAuto();
    }
  }, [selectedProfileId, selectedDate]);

  const loadBalanceSheets = async () => {
    if (!selectedProfileId) return;
    try {
      const sheets = await getBalanceSheets(selectedProfileId);
      setSavedBalanceSheets(sheets);
    } catch (error) {
      console.error('Error loading balance sheets:', error);
    }
  };

  const calculateBalanceSheetAuto = async () => {
    if (!selectedProfileId) return;

    setLoading(true);
    try {
      const data = await calculateBalanceSheet(selectedProfileId, selectedDate);
      setBalanceSheetData(data);
    } catch (error) {
      console.error('Error calculating balance sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateBalanceSheet = async () => {
    await calculateBalanceSheetAuto();
    toast.success('Bilans odświeżony');
  };

  const handleSaveBalanceSheet = async () => {
    if (!selectedProfileId || !balanceSheetData) return;

    try {
      const periodStart = format(new Date(selectedDate).setDate(1), 'yyyy-MM-dd');
      await saveBalanceSheet({
        business_profile_id: selectedProfileId,
        period_start: periodStart,
        period_end: selectedDate,
        total_assets: balanceSheetData.assets.total,
        total_liabilities: balanceSheetData.liabilities.total,
        total_equity: balanceSheetData.equity.total,
        is_finalized: false
      });
      toast.success('Bilans zapisany');
      loadBalanceSheets();
    } catch (error) {
      console.error('Error saving balance sheet:', error);
      toast.error('Błąd podczas zapisywania bilansu');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(amount);
  };

  if (selectedProfile?.entityType !== 'sp_zoo' && selectedProfile?.entityType !== 'sa') {
    return (
      <div className="space-y-6 pb-20 px-4 md:px-6">
        <div className="text-center py-12">
          <Building2 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Bilans dostępny tylko dla Spółek</h2>
          <p className="text-muted-foreground">
            Ta funkcja jest dostępna tylko dla Spółek z o.o. i S.A.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 px-4 md:px-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-blue-700">
          Bilans
        </h1>
        <p className="text-muted-foreground">
          Zestawienie aktywów, pasywów i kapitału własnego
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Bilans na dzień</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Wybierz datę</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Bilans jest automatycznie obliczany dla wybranej daty
              </p>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleCalculateBalanceSheet} disabled={loading} variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Odśwież
              </Button>
              {balanceSheetData && (
                <Button onClick={handleSaveBalanceSheet}>
                  Zapisz bilans
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Sheet Display */}
      {balanceSheetData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <Card>
            <CardHeader className="bg-blue-50 dark:bg-blue-950">
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                Aktywa
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Current Assets */}
              <div>
                <h3 className="font-semibold mb-2">Aktywa obrotowe</h3>
                <div className="space-y-1 text-sm pl-4">
                  <div className="flex justify-between">
                    <span>Środki pieniężne</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.assets.current.cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Należności</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.assets.current.accounts_receivable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zapasy</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.assets.current.inventory)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inne</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.assets.current.other)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Razem aktywa obrotowe</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.assets.current.total)}</span>
                  </div>
                </div>
              </div>

              {/* Fixed Assets */}
              <div>
                <h3 className="font-semibold mb-2">Aktywa trwałe</h3>
                <div className="space-y-1 text-sm pl-4">
                  <div className="flex justify-between">
                    <span>Nieruchomości</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.assets.fixed.property)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Urządzenia</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.assets.fixed.equipment)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Umorzenie</span>
                    <span className="font-mono">-{formatCurrency(balanceSheetData.assets.fixed.accumulated_depreciation)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Razem aktywa trwałe</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.assets.fixed.total)}</span>
                  </div>
                </div>
              </div>

              {/* Total Assets */}
              <div className="border-t-2 pt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>SUMA AKTYWÓW</span>
                  <span className="font-mono text-blue-600">{formatCurrency(balanceSheetData.assets.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liabilities & Equity */}
          <Card>
            <CardHeader className="bg-green-50 dark:bg-green-950">
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-green-600" />
                Pasywa
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Current Liabilities */}
              <div>
                <h3 className="font-semibold mb-2">Zobowiązania krótkoterminowe</h3>
                <div className="space-y-1 text-sm pl-4">
                  <div className="flex justify-between">
                    <span>Zobowiązania handlowe</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.liabilities.current.accounts_payable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kredyty krótkoterminowe</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.liabilities.current.short_term_debt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inne</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.liabilities.current.other)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Razem zobowiązania krótkoterminowe</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.liabilities.current.total)}</span>
                  </div>
                </div>
              </div>

              {/* Long-term Liabilities */}
              <div>
                <h3 className="font-semibold mb-2">Zobowiązania długoterminowe</h3>
                <div className="space-y-1 text-sm pl-4">
                  <div className="flex justify-between">
                    <span>Kredyty długoterminowe</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.liabilities.long_term.long_term_debt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inne</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.liabilities.long_term.other)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Razem zobowiązania długoterminowe</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.liabilities.long_term.total)}</span>
                  </div>
                </div>
              </div>

              {/* Equity */}
              <div>
                <h3 className="font-semibold mb-2">Kapitał własny</h3>
                <div className="space-y-1 text-sm pl-4">
                  <div className="flex justify-between">
                    <span>Kapitał zakładowy</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.equity.share_capital)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zyski zatrzymane</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.equity.retained_earnings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zysk roku bieżącego</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.equity.current_year_profit)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Razem kapitał własny</span>
                    <span className="font-mono">{formatCurrency(balanceSheetData.equity.total)}</span>
                  </div>
                </div>
              </div>

              {/* Total Liabilities & Equity */}
              <div className="border-t-2 pt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>SUMA PASYWÓW</span>
                  <span className="font-mono text-green-600">
                    {formatCurrency(balanceSheetData.liabilities.total + balanceSheetData.equity.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Saved Balance Sheets */}
      {savedBalanceSheets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Zapisane bilanse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedBalanceSheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">
                      Bilans na dzień {format(new Date(sheet.period_end), 'dd MMMM yyyy', { locale: pl })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Aktywa: {formatCurrency(sheet.total_assets)} | 
                      Pasywa: {formatCurrency(sheet.total_liabilities + sheet.total_equity)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BalanceSheet;
