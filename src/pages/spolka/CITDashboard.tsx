import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Calculator, TrendingUp, TrendingDown, AlertCircle, 
  CheckCircle, Clock, RefreshCw, CreditCard, FileText, Calendar
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  getCITAdvances,
  getCITDeclarations,
  generateCITAdvances,
  markCITAdvancePaid,
  calculateCITAdvance,
  getCurrentPeriod,
  type CITAdvance,
  type CITAnnualDeclaration,
  type CITAdvanceStatus,
} from '@/integrations/supabase/repositories/citRepository';

const CITDashboard = () => {
  const navigate = useNavigate();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  const [advances, setAdvances] = useState<CITAdvance[]>([]);
  const [declarations, setDeclarations] = useState<CITAnnualDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<CITAdvance | null>(null);
  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    reference: '',
  });

  const citRate = selectedProfile?.cit_rate ?? 9;
  const periodType = (selectedProfile as any)?.cit_advance_type || 'quarterly';

  const loadData = useCallback(async () => {
    if (!selectedProfileId) return;
    
    setLoading(true);
    try {
      const [advancesData, declarationsData] = await Promise.all([
        getCITAdvances(selectedProfileId, selectedYear),
        getCITDeclarations(selectedProfileId),
      ]);
      setAdvances(advancesData);
      setDeclarations(declarationsData);
    } catch (error) {
      console.error('Error loading CIT data:', error);
      toast.error('Błąd wczytywania danych CIT');
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedProfile && selectedProfile.entityType !== 'sp_zoo' && selectedProfile.entityType !== 'sa') {
      navigate('/accounting');
    }
  }, [selectedProfile, navigate]);

  const handleGenerateAdvances = async () => {
    if (!selectedProfileId) return;
    
    setGenerating(true);
    try {
      await generateCITAdvances(selectedProfileId, selectedYear, periodType, citRate);
      await loadData();
      toast.success('Zaliczki CIT przeliczone');
    } catch (error) {
      console.error('Error generating advances:', error);
      toast.error('Błąd generowania zaliczek');
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenPaymentDialog = (advance: CITAdvance) => {
    setSelectedAdvance(advance);
    setPaymentData({
      date: new Date().toISOString().split('T')[0],
      amount: advance.advance_due.toString(),
      reference: `Zaliczka na CIT za ${periodType === 'monthly' ? 'miesiąc' : 'kwartał'} ${advance.period_number}/${advance.fiscal_year}`,
    });
    setPaymentDialogOpen(true);
  };

  const handleMarkPaid = async () => {
    if (!selectedAdvance) return;
    
    try {
      await markCITAdvancePaid(
        selectedAdvance.id,
        paymentData.date,
        parseFloat(paymentData.amount),
        paymentData.reference
      );
      toast.success('Zaliczka oznaczona jako opłacona');
      setPaymentDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error marking advance as paid:', error);
      toast.error('Błąd aktualizacji');
    }
  };

  const getStatusBadge = (status: CITAdvanceStatus, advanceDue: number) => {
    if (advanceDue <= 0 || status === 'zero') {
      return <Badge variant="secondary">Brak do zapłaty</Badge>;
    }
    
    const config: Record<CITAdvanceStatus, { variant: any; label: string; icon: React.ReactNode }> = {
      calculated: { variant: 'outline', label: 'Obliczona', icon: <Calculator className="h-3 w-3" /> },
      due: { variant: 'destructive', label: 'Do zapłaty', icon: <AlertCircle className="h-3 w-3" /> },
      paid: { variant: 'default', label: 'Opłacona', icon: <CheckCircle className="h-3 w-3" /> },
      zero: { variant: 'secondary', label: 'Brak', icon: null },
      overdue: { variant: 'destructive', label: 'Zaległa!', icon: <AlertCircle className="h-3 w-3" /> },
    };
    
    const c = config[status];
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        {c.icon}
        {c.label}
      </Badge>
    );
  };

  // Summary calculations
  const totalAdvancesDue = advances.reduce((sum, a) => 
    a.status !== 'paid' && a.status !== 'zero' ? sum + a.advance_due : sum, 0
  );
  const totalAdvancesPaid = advances.reduce((sum, a) => 
    a.status === 'paid' ? sum + (a.payment_amount || 0) : sum, 0
  );
  const latestAdvance = advances[advances.length - 1];
  const currentProfit = latestAdvance?.profit_ytd || 0;

  if (!selectedProfile) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6 pb-20 px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              Zaliczki CIT
            </h1>
            <p className="text-muted-foreground text-sm">
              Obliczanie i śledzenie zaliczek na podatek dochodowy
            </p>
          </div>
          <div className="flex items-center gap-2">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerateAdvances} disabled={generating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            Przelicz
          </Button>
        </div>
      </div>

      {/* CIT Rate & Period Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="p-2 bg-blue-100 rounded-full">
                <Calculator className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stawka CIT</p>
                <p className="text-xl font-bold">{citRate}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="p-2 bg-purple-100 rounded-full">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zaliczki</p>
                <p className="text-xl font-bold capitalize">{periodType === 'monthly' ? 'Miesięczne' : 'Kwartalne'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="p-2 bg-green-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zysk YTD</p>
                <p className={`text-xl font-bold ${currentProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currentProfit.toLocaleString('pl-PL')} PLN
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="p-2 bg-amber-100 rounded-full">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zapłacone zaliczki</p>
                <p className="text-xl font-bold">{totalAdvancesPaid.toLocaleString('pl-PL')} PLN</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How CIT Advances Work - Educational */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-blue-900 text-lg">Jak działają zaliczki CIT?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-2">
          <p><strong>Formuła:</strong> (Przychody YTD – Koszty YTD) × stawka CIT = należny podatek YTD</p>
          <p><strong>Zaliczka:</strong> należny podatek YTD – już wpłacone zaliczki = zaliczka do wpłaty</p>
          <p><strong>Termin:</strong> 20. dzień miesiąca następującego po {periodType === 'monthly' ? 'miesiącu' : 'kwartale'}</p>
          <p className="text-blue-700">Jeśli zysk ≤ 0, nie płacisz zaliczki. Wszystko rozliczasz w rocznym CIT-8.</p>
        </CardContent>
      </Card>

      {/* Advances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Zaliczki na CIT - {selectedYear}</CardTitle>
          <CardDescription>
            {periodType === 'monthly' ? 'Miesięczne' : 'Kwartalne'} rozliczenie podatku dochodowego
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>
          ) : advances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Brak zaliczek dla wybranego roku</p>
              <p className="text-sm mt-2">Kliknij "Przelicz" aby wygenerować zaliczki na podstawie przychodów i kosztów</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Okres</th>
                    <th className="text-right py-3 px-2 font-medium">Przychody YTD</th>
                    <th className="text-right py-3 px-2 font-medium">Koszty YTD</th>
                    <th className="text-right py-3 px-2 font-medium">Zysk YTD</th>
                    <th className="text-right py-3 px-2 font-medium">Podatek YTD</th>
                    <th className="text-right py-3 px-2 font-medium">Wpłacone</th>
                    <th className="text-right py-3 px-2 font-medium">Do zapłaty</th>
                    <th className="text-center py-3 px-2 font-medium">Termin</th>
                    <th className="text-center py-3 px-2 font-medium">Status</th>
                    <th className="text-center py-3 px-2 font-medium">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map((advance) => (
                    <tr key={advance.id} className="border-b hover:bg-accent/50">
                      <td className="py-3 px-2">
                        <div className="font-medium">
                          {periodType === 'monthly' 
                            ? format(new Date(advance.period_start), 'LLLL yyyy', { locale: pl })
                            : `Q${advance.period_number} ${advance.fiscal_year}`
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(advance.period_start), 'dd.MM')} - {format(new Date(advance.period_end), 'dd.MM')}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-mono">
                        {advance.revenue_ytd.toLocaleString('pl-PL')}
                      </td>
                      <td className="py-3 px-2 text-right font-mono">
                        {advance.costs_ytd.toLocaleString('pl-PL')}
                      </td>
                      <td className={`py-3 px-2 text-right font-mono font-medium ${
                        advance.profit_ytd >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {advance.profit_ytd.toLocaleString('pl-PL')}
                      </td>
                      <td className="py-3 px-2 text-right font-mono">
                        {advance.tax_due_ytd.toLocaleString('pl-PL')}
                      </td>
                      <td className="py-3 px-2 text-right font-mono">
                        {advance.advances_paid_ytd.toLocaleString('pl-PL')}
                      </td>
                      <td className={`py-3 px-2 text-right font-mono font-bold ${
                        advance.advance_due > 0 ? 'text-amber-600' : ''
                      }`}>
                        {advance.advance_due.toLocaleString('pl-PL')}
                      </td>
                      <td className="py-3 px-2 text-center text-sm">
                        {format(new Date(advance.payment_deadline), 'dd.MM.yyyy')}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {getStatusBadge(advance.status, advance.advance_due)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {advance.status !== 'paid' && advance.status !== 'zero' && advance.advance_due > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleOpenPaymentDialog(advance)}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Opłać
                          </Button>
                        )}
                        {advance.status === 'paid' && advance.payment_date && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(advance.payment_date), 'dd.MM.yyyy')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary for Year */}
      {advances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie roku {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Łączny należny podatek YTD</p>
                <p className="text-2xl font-bold">
                  {(latestAdvance?.tax_due_ytd || 0).toLocaleString('pl-PL')} PLN
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Wpłacone zaliczki</p>
                <p className="text-2xl font-bold text-green-600">
                  {totalAdvancesPaid.toLocaleString('pl-PL')} PLN
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Pozostało do wpłaty</p>
                <p className={`text-2xl font-bold ${totalAdvancesDue > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {totalAdvancesDue.toLocaleString('pl-PL')} PLN
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejestracja wpłaty zaliczki CIT</DialogTitle>
            <DialogDescription>
              Zarejestruj wpłatę zaliczki do Urzędu Skarbowego
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="paymentDate">Data wpłaty</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentData.date}
                onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="paymentAmount">Kwota (PLN)</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="paymentReference">Tytuł przelewu</Label>
              <Input
                id="paymentReference"
                value={paymentData.reference}
                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                placeholder="Zaliczka na CIT za..."
              />
            </div>
            
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Wpłata na mikrorachunek podatkowy:</p>
              <p className="text-muted-foreground">
                Przelew na indywidualny rachunek podatkowy (IRP) do właściwego Urzędu Skarbowego
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleMarkPaid}>
              Zarejestruj wpłatę
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CITDashboard;
