import React, { useEffect, useState } from 'react';
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp, TrendingDown, Calendar, Download, AlertTriangle, CheckCircle, Clock, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Invoice, Expense } from "@/types";
import { format, parseISO, isPast, addMonths, isBefore } from "date-fns";
import { generateJpckV7Data, generateJpckV7Xml } from "@/integrations/jpk/jpkV7Generator";
import { useGlobalData } from "@/hooks/use-global-data";
import { pl } from 'date-fns/locale';
import { calculateIncomeTax } from "@/utils/taxCalculations";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const Accounting = () => {
  const { isPremium, openPremiumDialog, user } = useAuth();
  const { profiles, selectedProfileId, selectProfile, isLoadingProfiles } = useBusinessProfile();

  const [selectedPeriod, setSelectedPeriod] = useState<string>('this_month');
  const [reportingPeriods, setReportingPeriods] = useState<{
    period: string;
    deadline: string;
    status: 'not-due' | 'due-soon' | 'overdue';
    estimatedTax?: number;
  }[]>([]);

  const { invoices: { data: invoices, isLoading: isLoadingInvoices }, expenses: { data: expenses, isLoading: isLoadingExpenses } } = useGlobalData(selectedPeriod);
  const { invoices: { data: allInvoices, isLoading: isLoadingAllInvoices } } = useGlobalData(undefined, true);

  const loadingData = isLoadingInvoices || isLoadingExpenses;

  const [generatedXml, setGeneratedXml] = useState<string | null>(null);

  // Calculate totals
  const totalIncome = invoices.reduce((sum, invoice) => sum + (invoice.totalGrossValue || 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;

  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  const estimatedTax = selectedProfile && selectedProfile.tax_type
    ? calculateIncomeTax(selectedProfile.tax_type, totalIncome, totalExpenses, 0, 0)
    : 0;

  // Chart data preparation
  const monthlyData = React.useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = format(date, 'yyyy-MM');
      
      const monthlyIncome = allInvoices
        .filter(inv => inv.issueDate.startsWith(monthKey))
        .reduce((sum, inv) => sum + (inv.totalGrossValue || 0), 0);
      
      const monthlyExpenses = expenses
        .filter(exp => exp.date.startsWith(monthKey))
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);

      months.push({
        month: format(date, 'MMM', { locale: pl }),
        przychody: monthlyIncome,
        wydatki: monthlyExpenses,
        zysk: monthlyIncome - monthlyExpenses
      });
    }
    return months;
  }, [allInvoices, expenses]);

  const expenseCategories = React.useMemo(() => {
    const categories = expenses.reduce((acc, expense) => {
      const category = expense.category || 'Inne';
      acc[category] = (acc[category] || 0) + (expense.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Function to trigger JPK generation
  const handleGenerateJpck = (periodType: string) => {
    if (!selectedProfileId || !profiles) {
      console.error("Cannot generate JPK: Business profile not selected or profiles not loaded.");
      return;
    }

    const selectedProfile = profiles.find(p => p.id === selectedProfileId);
    if (!selectedProfile) {
      console.error("Cannot generate JPK: Selected business profile not found.");
      return;
    }

    // Get the current date
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    // Determine the date range based on the period type
    switch (periodType) {
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        startDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        endDate = new Date(now.getFullYear(), currentQuarter * 3, 0);
        break;
      case 'last_quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) === 0 ? 4 : Math.floor(now.getMonth() / 3);
        const year = lastQuarter === 4 ? now.getFullYear() - 1 : now.getFullYear();
        startDate = new Date(year, (lastQuarter - 1) * 3, 1);
        endDate = new Date(year, lastQuarter * 3, 0);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        // Default to current month if period is not recognized
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const periodDates = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      periodName: format(startDate, 'yyyy-MM')
    };

    console.log(`Generating JPK for period: ${periodDates.startDate} to ${periodDates.endDate}`);

    const invoicesForPeriod = allInvoices.filter(invoice => {
      const issueDate = parseISO(invoice.issueDate);
      return isBefore(issueDate, parseISO(periodDates.endDate + 'T23:59:59')) && !isBefore(issueDate, parseISO(periodDates.startDate + 'T00:00:00'));
    });

    const expensesForPeriod = expenses.filter(expense => {
      const expenseDate = parseISO(expense.date);
      return isBefore(expenseDate, parseISO(periodDates.endDate + 'T23:59:59')) && !isBefore(expenseDate, parseISO(periodDates.startDate + 'T00:00:00'));
    });

    const jpkData = generateJpckV7Data(invoicesForPeriod, expensesForPeriod, selectedProfile, periodDates);

    if (jpkData) {
      const xml = generateJpckV7Xml(jpkData);
      setGeneratedXml(xml);
      console.log("JPK XML Generated for period", periodDates.periodName, ":", xml);
      
      if(xml) {
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `JPK_V7_${selectedProfile.taxId || 'firma'}_${periodDates.periodName}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } else {
      setGeneratedXml(null);
      console.error("JPK data generation failed for period", periodType);
    }
  };

  useEffect(() => {
    if (!isPremium) {
      openPremiumDialog();
    }
  }, [isPremium, openPremiumDialog]);

  useEffect(() => {
    if (!allInvoices || allInvoices.length === 0 || !selectedProfileId) {
      setReportingPeriods([]); // Clear periods if no invoices or profile selected
      return;
    }

    // Find the earliest invoice date for the selected profile
    const profileInvoices = allInvoices.filter(inv => inv.businessProfileId === selectedProfileId);
    if (profileInvoices.length === 0) {
      setReportingPeriods([]);
      return;
    }

    const earliestInvoiceDate = profileInvoices.reduce((earliest, invoice) => {
      const issueDate = parseISO(invoice.issueDate); // Parse the ISO string date
      return earliest === null || isBefore(issueDate, earliest) ? issueDate : earliest;
    }, null as Date | null);

    if (!earliestInvoiceDate) {
      setReportingPeriods([]);
      return;
    }

    // Generate monthly reporting periods from the earliest invoice month to the current month
    const periods: { period: string; deadline: string; status: 'not-due' | 'due-soon' | 'overdue'; estimatedTax?: number }[] = [];
    let currentPeriodDate = new Date(earliestInvoiceDate.getFullYear(), earliestInvoiceDate.getMonth(), 1);
    const today = new Date();
    const filingDay = 20; // JPK filing deadline is usually 20th of the next month

    while (isBefore(currentPeriodDate, addMonths(today, 1))) { // Include current month's period
      const period = format(currentPeriodDate, 'yyyy-MM');
      const nextMonth = addMonths(currentPeriodDate, 1);
      const deadlineDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), filingDay);
      const deadline = format(deadlineDate, 'yyyy-MM-dd');

      // Define start and end dates for the current reporting period
      const periodStartDate = new Date(currentPeriodDate.getFullYear(), currentPeriodDate.getMonth(), 1);
      const periodEndDate = new Date(currentPeriodDate.getFullYear(), currentPeriodDate.getMonth() + 1, 0);

      // Filter invoices for the current period
      const invoicesForPeriod = profileInvoices.filter(invoice => {
        const issueDate = parseISO(invoice.issueDate);
        return isBefore(issueDate, periodEndDate) && !isBefore(issueDate, periodStartDate);
      });

      // Filter expenses for the current period (using expenses fetched with fetchAllInvoices=true)
      const expensesForPeriod = expenses.filter(expense => {
        const expenseDate = parseISO(expense.date);
        return isBefore(expenseDate, periodEndDate) && !isBefore(expenseDate, periodStartDate);
      });

      // Calculate total income and expenses for this specific period
      const totalIncomeForPeriod = invoicesForPeriod.reduce((sum, invoice) => sum + (invoice.totalGrossValue || 0), 0);
      const totalExpensesForPeriod = expensesForPeriod.reduce((sum, expense) => sum + (expense.amount || 0), 0);

      // Calculate estimated tax for this period (using placeholder ZUS for now)
      const estimatedTaxForPeriod = selectedProfile && selectedProfile.tax_type
        ? calculateIncomeTax(selectedProfile.tax_type as "skala" | "liniowy" | "ryczalt", totalIncomeForPeriod, totalExpensesForPeriod, 0, 0)
        : 0;

      let status: 'not-due' | 'due-soon' | 'overdue';
      const daysUntilDeadline = (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

      if (isPast(deadlineDate) && format(today, 'yyyy-MM-dd') > deadline) { // Check if today is past the deadline
        status = 'overdue';
      } else if (daysUntilDeadline <= 7 && daysUntilDeadline >= 0) {
        status = 'due-soon';
      } else {
        status = 'not-due';
      }

      periods.push({ period, deadline, status, estimatedTax: estimatedTaxForPeriod });

      currentPeriodDate = addMonths(currentPeriodDate, 1);
    }

    setReportingPeriods(periods);

  }, [allInvoices, selectedProfileId, profiles, expenses]); // Add expenses and profiles to dependencies

  const [sendToAccountantOpen, setSendToAccountantOpen] = useState(false);
  const [accountantEmail, setAccountantEmail] = useState(selectedProfile?.accountant_email || '');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  useEffect(() => {
    setAccountantEmail(selectedProfile?.accountant_email || '');
  }, [selectedProfile]);

  useEffect(() => {
    // By default, select all invoices for the current period
    setSelectedInvoiceIds(invoices.map(inv => inv.id));
  }, [invoices]);

  const handleSendToAccountant = async () => {
    // Mock: show a toast with the intended action
    toast.info(`Wysłano ${selectedInvoiceIds.length} faktur do księgowej: ${accountantEmail}`);
    setSendToAccountantOpen(false);
  };

  if (!isPremium) {
    return null;
  }

  return (
    <div className="space-y-6 pb-20 px-4 md:px-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-amber-700">
          Panel Księgowości
        </h1>
        <p className="text-muted-foreground">Zarządzaj finansami i rozliczeniami swojej firmy</p>
      </div>

      {/* Business Profile Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Profil firmowy</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingProfiles ? (
            <div className="animate-pulse h-10 bg-muted rounded-md"></div>
          ) : profiles && profiles.length > 0 ? (
            <Select value={selectedProfileId || ''} onValueChange={selectProfile}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wybierz profil" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">Brak dostępnych profili firmowych. Dodaj nowy profil w Ustawieniach.</p>
          )}
        </CardContent>
      </Card>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Przychody</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loadingData ? '...' : `${totalIncome.toLocaleString('pl-PL')} PLN`}
            </div>
            <p className="text-xs text-muted-foreground">w wybranym okresie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wydatki</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loadingData ? '...' : `${totalExpenses.toLocaleString('pl-PL')} PLN`}
            </div>
            <p className="text-xs text-muted-foreground">w wybranym okresie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zysk netto</CardTitle>
            <Star className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {loadingData ? '...' : `${netProfit.toLocaleString('pl-PL')} PLN`}
            </div>
            <p className="text-xs text-muted-foreground">w wybranym okresie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Szacowany podatek</CardTitle>
            <Calendar className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {loadingData ? '...' : `${estimatedTax.toLocaleString('pl-PL')} PLN`}
            </div>
            <p className="text-xs text-muted-foreground">{selectedProfile?.tax_type || 'Nie wybrano'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trendy miesięczne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${Number(value).toLocaleString('pl-PL')} PLN`]} />
                  <Line type="monotone" dataKey="przychody" stroke="#10b981" strokeWidth={2} name="Przychody" />
                  <Line type="monotone" dataKey="wydatki" stroke="#ef4444" strokeWidth={2} name="Wydatki" />
                  <Line type="monotone" dataKey="zysk" stroke="#3b82f6" strokeWidth={2} name="Zysk" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kategorie wydatków</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {expenseCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${Number(value).toLocaleString('pl-PL')} PLN`]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Brak danych o wydatkach
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector and JPK Generation */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Generowanie JPK V7M</CardTitle>
          <p className="text-sm text-muted-foreground">Wybierz okres i pobierz plik JPK XML</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-end md:space-x-4 md:space-y-0">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-foreground/80">Okres rozliczeniowy</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Wybierz okres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">Bieżący miesiąc</SelectItem>
                  <SelectItem value="last_month">Poprzedni miesiąc</SelectItem>
                  <SelectItem value="this_quarter">Bieżący kwartał</SelectItem>
                  <SelectItem value="last_quarter">Poprzedni kwartał</SelectItem>
                  <SelectItem value="this_year">Bieżący rok</SelectItem>
                  <SelectItem value="last_year">Poprzedni rok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2">
              <Button 
                onClick={() => handleGenerateJpck(selectedPeriod)} 
                disabled={!selectedProfileId || loadingData}
                className="w-full md:w-auto"
                size="lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Pobierz JPK XML
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Required Reports Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status raportów JPK</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingAllInvoices ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse h-12 bg-muted rounded-md"></div>
              ))}
            </div>
          ) : reportingPeriods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Brak danych do wygenerowania raportów</p>
              <p className="text-sm">Dodaj pierwszą fakturę, aby rozpocząć</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportingPeriods.slice(0, 6).map(({ period, deadline, status }) => {
                const periodFormatted = format(parseISO(`${period}-01`), 'MMMM yyyy', { locale: pl });
                const deadlineFormatted = format(parseISO(deadline), 'dd.MM.yyyy');
                
                let statusIcon, statusColor, statusText;
                switch (status) {
                  case 'overdue':
                    statusIcon = <AlertTriangle className="h-4 w-4" />;
                    statusColor = 'text-red-600 bg-red-50 border-red-200';
                    statusText = 'Zaległy';
                    break;
                  case 'due-soon':
                    statusIcon = <Clock className="h-4 w-4" />;
                    statusColor = 'text-amber-600 bg-amber-50 border-amber-200';
                    statusText = 'Termin wkrótce';
                    break;
                  default:
                    statusIcon = <CheckCircle className="h-4 w-4" />;
                    statusColor = 'text-green-600 bg-green-50 border-green-200';
                    statusText = 'Do złożenia';
                }

                return (
                  <div key={period} className={`flex items-center justify-between p-4 rounded-lg border ${statusColor}`}>
                    <div className="flex items-center gap-3">
                      {statusIcon}
                      <div>
                        <p className="font-medium">{periodFormatted}</p>
                        <p className="text-sm opacity-75">Termin: {deadlineFormatted}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{statusText}</span>
                      <Button 
                        size="sm" 
                        onClick={() => handleGenerateJpck(period)}
                        disabled={!selectedProfileId || loadingData}
                      >
                        Generuj
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KSeF Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integracja KSeF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">Krajowy System e-Faktur</h3>
            </div>
            <p className="text-sm text-blue-700 mb-4">
              Automatyczne generowanie i wysyłka faktur do systemu KSeF będzie dostępna wkrótce.
            </p>
            <Button variant="secondary" disabled>
              Konfiguruj integrację (Wkrótce)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Send to Accountant Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wyślij faktury do księgowej/księgowego</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Input
                type="email"
                value={accountantEmail}
                onChange={e => setAccountantEmail(e.target.value)}
                placeholder="Email księgowej/księgowego"
                className="max-w-xs"
              />
              <Button onClick={() => setSendToAccountantOpen(true)} disabled={!accountantEmail}>
                Wyślij faktury
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Wybierz faktury do wysłania (domyślnie wszystkie z bieżącego okresu).
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal for sending invoices to accountant */}
      <Dialog open={sendToAccountantOpen} onOpenChange={setSendToAccountantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wyślij faktury do księgowej/księgowego</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email księgowej/księgowego</label>
              <Input
                type="email"
                value={accountantEmail}
                onChange={e => setAccountantEmail(e.target.value)}
                placeholder="Email księgowej/księgowego"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Faktury do wysłania</label>
              <div className="max-h-40 overflow-y-auto border rounded p-2 bg-muted">
                {invoices.length === 0 ? (
                  <div className="text-muted-foreground text-sm">Brak faktur w bieżącym okresie.</div>
                ) : (
                  invoices.map(inv => (
                    <div key={inv.id} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedInvoiceIds.includes(inv.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedInvoiceIds(ids => [...ids, inv.id]);
                          } else {
                            setSelectedInvoiceIds(ids => ids.filter(id => id !== inv.id));
                          }
                        }}
                      />
                      <span>{inv.number} - {inv.customerName || inv.buyer?.name || 'Nabywca'} - {inv.totalGrossValue?.toLocaleString('pl-PL')} PLN</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSendToAccountant} disabled={!accountantEmail || selectedInvoiceIds.length === 0}>
              Wyślij {selectedInvoiceIds.length} faktur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounting;
