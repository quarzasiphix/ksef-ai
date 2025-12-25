import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { formatCurrency } from "@/shared/lib/invoice-utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Invoice } from "@/shared/types";
import InvoiceCard from "@/modules/invoices/components/InvoiceCard";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { useAuth } from "@/shared/hooks/useAuth";
import { calculateIncomeTax } from "@/shared/lib/tax-utils";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { 
  FileText, 
  Plus, 
  Users, 
  Package, 
  Settings, 
  CreditCard, 
  BarChart3, 
  TrendingUp, 
  Calculator,
  Crown,
  Shield,
  Receipt,
  Building,
  Star,
  ArrowRight,
  Calendar,
  UserCheck,
  Boxes,
  Banknote
} from "lucide-react";
import AccountOnboardingWidget from '@/modules/onboarding/components/welcome/AccountOnboardingWidget';
import TaxReportsCard, { TaxReport } from '@/modules/accounting/components/TaxReportsCard';
import { getInvoiceValueInPLN } from "@/shared/lib/invoice-utils";
import { toast } from "sonner";
import NextActionPanel from "@/modules/accounting/components/NextActionPanel";

const Dashboard = () => {
  const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);
  const { selectedProfileId, profiles, isLoadingProfiles } = useBusinessProfile();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const { invoices: { data: invoices, isLoading: isLoadingInvoices }, expenses: { data: expenses, isLoading: isLoadingExpenses } } = useGlobalData();
  const { isPremium, openPremiumDialog } = useAuth();
  
  const isLoading = isLoadingInvoices || isLoadingExpenses || isLoadingProfiles;

  // Redirect to onboarding if no profiles exist (first-time user)
  useEffect(() => {
    if (!isLoadingProfiles && profiles && profiles.length === 0) {
      console.log('[Dashboard] No profiles found, redirecting to onboarding');
      navigate('/welcome', { replace: true });
    }
  }, [isLoadingProfiles, profiles, navigate]);

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

  const missingSpoolkaBasics =
    isSpoolka &&
    (!selectedProfile?.krs_number || !selectedProfile?.share_capital);
  
  // Prevent flicker: mark when all data finished first load
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setDataReady(true);
    }
  }, [isLoading]);

  useEffect(() => {
    if (invoices?.length > 0) {
      generateMonthlySummaries(invoices);
    }
  }, [invoices]);
  
  const generateMonthlySummaries = (invoicesData: any[]) => {
    const monthlyData: Record<string, { totalNetValue: number, totalGrossValue: number, totalVatValue: number }> = {};
    
    invoicesData.forEach(invoice => {
      const date = new Date(invoice.issueDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          totalNetValue: 0,
          totalGrossValue: 0,
          totalVatValue: 0
        };
      }
      
      monthlyData[monthKey].totalNetValue += invoice.totalNetValue || 0;
      monthlyData[monthKey].totalGrossValue += invoice.totalGrossValue || 0;
      monthlyData[monthKey].totalVatValue += invoice.totalVatValue || 0;
    });
    
    const formattedSummaries = Object.entries(monthlyData).map(([month, values]) => ({
      month,
      monthLabel: new Date(`${month}-01`).toLocaleString("pl-PL", { month: "short" }),
      ...values
    }));
    
    formattedSummaries.sort((a, b) => a.month.localeCompare(b.month));
    setMonthlySummaries(formattedSummaries);
  };

  // Tax obligations list for current month (re-use logic from Accounting)
  const currentMonth = new Date().getMonth();
  const getMonthlyReports = (monthIdx: number): TaxReport[] => {
    const reports: TaxReport[] = [
      { id: `jpk-${monthIdx}`, name: "JPK_V7M", dueDay: 25 },
      { id: `zus-${monthIdx}`, name: "Deklaracja ZUS (DRA)", dueDay: 20 },
    ];
    if ([2, 5, 8, 11].includes(monthIdx)) {
      reports.push({ id: `pit-${monthIdx}`, name: "PIT zaliczka", dueDay: 20 });
    }
    return reports;
  };

  // Premium accounting data calculations
  const totalRevenue = invoices.reduce((sum, inv) => sum + getInvoiceValueInPLN(inv), 0);
  const totalExpensesCost = (invoices as any[])
    .filter(inv => inv.transactionType === 'expense')
    .reduce((sum, inv) => sum + getInvoiceValueInPLN(inv), 0);
  const netProfit = totalRevenue - totalExpensesCost;
  const taxEstimate = calculateIncomeTax(netProfit, 'linear');

  // Accounting pie chart data for premium users
  const accountingData = [
    { name: 'Przychody', value: totalRevenue, color: '#10b981' },
    { name: 'Wydatki', value: totalExpensesCost, color: '#ef4444' },
    { name: 'Podatek', value: taxEstimate, color: '#f59e0b' }
  ];

  const totalInvoices = invoices.length;
  const unpaidInvoices = invoices.filter(inv => !inv.isPaid).length;
  
  const totalGross = invoices.reduce((invoiceSum, invoice) => {
    return invoiceSum + getInvoiceValueInPLN(invoice);
  }, 0);

  const totalTax = invoices.reduce((invoiceSum, invoice) => {
    const invoiceVat = (invoice.items || []).reduce((itemSum, item) => {
      const itemVat = item.vatRate !== -1 ? (item.totalVatValue || 0) : 0;
      return itemSum + Math.max(0, itemVat);
    }, 0);
    return invoiceSum + invoiceVat;
  }, 0);

  const totalExpenses = (invoices as any[])
    .filter(inv => inv.transactionType === 'expense')
    .reduce((sum, inv) => sum + getInvoiceValueInPLN(inv), 0);

  // Quick action buttons for invoicing
  const quickActions = [
    {
      title: "Nowa Faktura",
      description: "Wystaw nową fakturę",
      icon: Plus,
      path: "/income/new",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "Nowy Wydatek",
      description: "Dodaj nowy wydatek",
      icon: Receipt,
      path: "/expense/new",
      color: "bg-green-500 hover:bg-green-600",
    },
  ];

  // Management links - updated for premium users
  const managementLinks = [
    {
      title: "Klienci",
      description: "Zarządzaj klientami",
      icon: Users,
      path: "/customers",
    },
    {
      title: "Produkty",
      description: "Katalog produktów",
      icon: Package,
      path: "/products",
    },
    ...(isPremium ? [{
      title: "Pracownicy",
      description: "Zarządzanie zespołem",
      icon: UserCheck,
      path: "/employees",
    }] : []),
    {
      title: "Ustawienia",
      description: "Konfiguracja systemu",
      icon: Settings,
      path: "/settings",
    },
  ];

  // Premium features
  const premiumFeatures = [
    {
      title: "Księgowość",
      description: "Profesjonalne księgowanie",
      icon: Calculator,
      path: "/accounting",
      premium: true,
    },
    {
      title: "KSeF",
      description: "Integracja z KSeF",
      icon: Building,
      path: "/ksef",
      premium: true,
    },
    {
      title: "Bankowość",
      description: "Importuj i analizuj transakcje bankowe",
      icon: Banknote,
      path: "/bank",
      premium: true,
    },
    ...(isPremium ? [{
      title: "Magazyn",
      description: "Zarządzanie zapasami",
      icon: Boxes,
      path: "/inventory",
      premium: true,
    }] : []),
  ];

  const showOnboardingWidget = dataReady && invoices.length === 0;
  
  const { user } = useAuth();

  return (
    <div className="space-y-6 pb-20 px-4 md:px-6">
      {showOnboardingWidget && (
        <AccountOnboardingWidget mode="inline" />
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {isSpoolka ? 'Przegląd' : 'Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSpoolka
              ? 'Czy firma jest OK? Najważniejsze wskaźniki i następne kroki'
              : 'Przegląd Twojej działalności'}
          </p>
        </div>
        {!isPremium && (
          <Button 
            onClick={openPremiumDialog}
            size="sm"
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white w-full sm:w-auto"
          >
            <Crown className="mr-2 h-4 w-4" />
            Kup Premium
          </Button>
        )}
      </div>

      {isSpoolka && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Status spółki</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Szybki przegląd: formalności, podatki i pieniądze
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                <div className={`h-2 w-2 rounded-full ${missingSpoolkaBasics || unpaidInvoices > 0 ? 'bg-amber-500' : 'bg-green-500'}`} />
                <span>{missingSpoolkaBasics || unpaidInvoices > 0 ? 'do sprawdzenia' : 'stabilna'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border p-4 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Formalności</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {missingSpoolkaBasics
                    ? 'Uzupełnij podstawowe dane spółki'
                    : 'Dokumenty i decyzje pod kontrolą'}
                </p>
                <div className="mt-3">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/accounting/company-registry">Rejestr spółki</Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Podatki</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Terminy i deklaracje w bieżącym miesiącu
                </p>
                <div className="mt-3">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/accounting">Przejdź do księgowości</Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Pieniądze</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {unpaidInvoices > 0
                    ? `${unpaidInvoices} niezapłaconych faktur`
                    : 'Brak zaległych płatności'}
                </p>
                <div className="mt-3">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/income">Faktury</Link>
                  </Button>
                </div>
              </div>
            </div>

            <NextActionPanel
              actions={[
                ...(missingSpoolkaBasics
                  ? [
                      {
                        id: 'complete-company',
                        title: 'Uzupełnij dane spółki',
                        description: 'KRS i kapitał zakładowy są potrzebne do formalności i dokumentów.',
                        href: '/accounting/company-registry',
                        variant: 'warning' as const,
                        dismissible: true,
                      },
                    ]
                  : []),
                ...(unpaidInvoices > 0
                  ? [
                      {
                        id: 'unpaid-invoices',
                        title: 'Sprawdź niezapłacone faktury',
                        description: 'Zadbaj o płynność: przypomnij kontrahentom lub oznacz płatności.',
                        href: '/income',
                        variant: 'info' as const,
                        dismissible: true,
                      },
                    ]
                  : []),
                {
                  id: 'documents-hub',
                  title: 'Uporządkuj dokumenty spółki',
                  description: 'Umowy, uchwały i pliki w jednym miejscu — łatwiej znaleźć w razie kontroli.',
                  href: '/contracts',
                  variant: 'info' as const,
                  dismissible: true,
                },
              ]}
            />
          </CardContent>
        </Card>
      )}


      {/* Quick Actions - only for non-spółka */}
      {!isSpoolka && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link key={action.path} to={action.path}>
              <Card className="hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center shrink-0`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base">{action.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}


      

      {/* Chart - Different for Premium vs Free */}
      {isSpoolka ? (
        <Link to="/analytics" className="block">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <span>Mini-analizy</span>
                </CardTitle>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Zysk netto (szacunek)</span>
                <span className="font-medium">{formatCurrency(netProfit)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Szacowany podatek</span>
                <span className="font-medium">{formatCurrency(Number(taxEstimate))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Przychody (łącznie)</span>
                <span className="font-medium">{formatCurrency(totalGross)}</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ) : (
        (isPremium ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Premium Accounting Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5 text-amber-600" />
                  <span>Przegląd Księgowy</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={accountingData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {accountingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Zysk netto:</span>
                    <span className="font-bold text-green-600">{formatCurrency(netProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Szacowany podatek:</span>
                    <span className="font-bold text-amber-600">{formatCurrency(Number(taxEstimate))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Premium Monthly Revenue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-amber-600" />
                  <span>Miesięczne Przychody</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlySummaries}>
                      <XAxis dataKey="monthLabel" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="totalGrossValue" name="Brutto" fill="#d97706" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Standard Chart for Free Users
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Miesięczna Sprzedaż</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={isMobile ? "h-48" : "h-64 md:h-80"}>
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart 
                    data={monthlySummaries}
                    margin={isMobile ? { top: 5, right: 0, left: -30, bottom: 0 } : { top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <XAxis 
                      dataKey="monthLabel" 
                      fontSize={isMobile ? 9 : 12}
                      tickMargin={5}
                    />
                    <YAxis 
                      fontSize={isMobile ? 9 : 12} 
                      width={isMobile ? 30 : 60}
                      tickFormatter={(value) => isMobile ? value.toLocaleString('pl-PL', {notation: 'compact'}) : value.toLocaleString('pl-PL')}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(label) => `Miesiąc: ${label}`}
                      contentStyle={{ fontSize: isMobile ? '10px' : '12px' }}
                    />
                    {isMobile ? (
                      <Bar dataKey="totalGrossValue" name="Brutto" fill="#1d4ed8" />
                    ) : (
                      <>
                        <Bar dataKey="totalNetValue" name="Netto" fill="#93c5fd" />
                        <Bar dataKey="totalVatValue" name="VAT" fill="#3b82f6" />
                        <Bar dataKey="totalGrossValue" name="Brutto" fill="#1d4ed8" />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      
      {/* Tax Obligations - for spółka */}
      {isSpoolka && isPremium && (
        <TaxReportsCard
          monthIndex={currentMonth}
          reports={getMonthlyReports(currentMonth)}
        />
      )}


      {/* Recent Activity - only show for non-spółka or if they have data */}
      {!isSpoolka && invoices.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <FileText className="h-4 w-4 md:h-5 md:w-5" />
                  <span>Ostatnie Faktury</span>
                </CardTitle>
                <Button variant="outline" asChild size="sm">
                  <Link to="/income">Wszystkie</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {invoices.slice(0, 4).map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice as any} />
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
