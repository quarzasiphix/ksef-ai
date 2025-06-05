import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/invoice-utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Invoice } from "@/types";
import InvoiceCard from "@/components/invoices/InvoiceCard";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGlobalData } from "@/hooks/use-global-data";
import { useAuth } from "@/hooks/useAuth";
import { calculateIncomeTax } from "@/lib/tax-utils";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
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
  ArrowRight
} from "lucide-react";

const Dashboard = () => {
  const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);
  const { selectedProfileId, profiles, isLoadingProfiles } = useBusinessProfile();
  const isMobile = useIsMobile();
  
  const { invoices: { data: invoices, isLoading: isLoadingInvoices }, expenses: { data: expenses, isLoading: isLoadingExpenses } } = useGlobalData();
  const { isPremium, openPremiumDialog } = useAuth();
  
  const isLoading = isLoadingInvoices || isLoadingExpenses || isLoadingProfiles;
  
  useEffect(() => {
    if (invoices?.length > 0) {
      generateMonthlySummaries(invoices);
    }
  }, [invoices]);
  
  const generateMonthlySummaries = (invoicesData: Invoice[]) => {
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

  const totalInvoices = invoices.length;
  const unpaidInvoices = invoices.filter(inv => !inv.isPaid).length;
  
  const totalGross = invoices.reduce((invoiceSum, invoice) => {
    const invoiceGross = (invoice.items || []).reduce((itemSum, item) => {
      const itemGross = item.vatRate === -1 ? (item.totalNetValue || 0) : (item.totalGrossValue || 0);
      return itemSum + Math.max(0, itemGross);
    }, 0);
    return invoiceSum + invoiceGross;
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
    .reduce((sum, inv) => sum + (inv.totalGrossValue || 0), 0);

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

  // Management links
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
  ];

  return (
    <div className="space-y-8 max-w-full pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Przegląd Twojej działalności</p>
        </div>
        {!isPremium && (
          <Button 
            onClick={openPremiumDialog}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          >
            <Crown className="mr-2 h-4 w-4" />
            Kup Premium
          </Button>
        )}
      </div>

      {/* Premium Banner */}
      {!isPremium && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-900">Odblokuj Pełną Funkcjonalność</h3>
                  <p className="text-amber-700">Księgowość • JPK-V7M • KSeF • Zarządzanie ZUS</p>
                </div>
              </div>
              <Button 
                onClick={openPremiumDialog}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              >
                Rozpocznij <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickActions.map((action) => (
          <Link key={action.path} to={action.path}>
            <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`h-12 w-12 rounded-lg ${action.color} flex items-center justify-center`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{action.title}</h3>
                    <p className="text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faktury</p>
                <p className="text-2xl font-bold">{totalInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Niezapłacone</p>
                <p className="text-2xl font-bold text-amber-600">{unpaidInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Przychody</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalGross)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Receipt className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Wydatki</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Navigation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Management Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Zarządzanie</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {managementLinks.map((link) => (
              <Link key={link.path} to={link.path}>
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                  <link.icon className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">{link.title}</p>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Premium Features */}
        <Card className={!isPremium ? "border-amber-200" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {isPremium ? <Shield className="h-5 w-5 text-amber-500" /> : <Crown className="h-5 w-5 text-amber-500" />}
              <span>Funkcje {isPremium ? 'Premium' : 'Premium'}</span>
              {!isPremium && <Star className="h-4 w-4 text-amber-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {premiumFeatures.map((feature) => (
              <div key={feature.path} className="relative">
                {isPremium ? (
                  <Link to={feature.path}>
                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <feature.icon className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="font-medium">{feature.title}</p>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div 
                    className="flex items-center space-x-3 p-3 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer"
                    onClick={openPremiumDialog}
                  >
                    <feature.icon className="h-5 w-5 text-amber-600" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-900">{feature.title}</p>
                      <p className="text-sm text-amber-700">{feature.description}</p>
                    </div>
                    <Crown className="h-4 w-4 text-amber-600" />
                  </div>
                )}
              </div>
            ))}
            {!isPremium && (
              <Button 
                onClick={openPremiumDialog}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              >
                <Crown className="mr-2 h-4 w-4" />
                Kup Premium - Pełen Dostęp
              </Button>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Chart */}
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
                  formatter={(value: number) => formatCurrency(value)}
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

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Ostatnie Faktury</span>
            </CardTitle>
            <Button variant="outline" asChild size="sm">
              <Link to="/income">Zobacz wszystkie</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingInvoices ? (
            <div className="text-center py-8">
              <p>Ładowanie...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Brak faktur</p>
              <Button asChild className="mt-4">
                <Link to="/income/new">Wystaw pierwszą fakturę</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {invoices.slice(0, 4).map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice as any} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5 text-red-500" />
              <span>Ostatnie Wydatki</span>
            </CardTitle>
            <Button variant="outline" asChild size="sm">
              <Link to="/expense">Zobacz wszystkie</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingInvoices ? (
            <div className="text-center py-8">
              <p>Ładowanie...</p>
            </div>
          ) : (
            (() => {
              const recentExpenses = (invoices as any[]).filter(inv => inv.transactionType === 'expense');
              if (recentExpenses.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Brak wydatków</p>
                    <Button asChild className="mt-4">
                      <Link to="/expense/new">Dodaj pierwszy wydatek</Link>
                    </Button>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recentExpenses.slice(0, 4).map((invoice) => (
                    <InvoiceCard key={invoice.id} invoice={invoice as any} />
                  ))}
                </div>
              );
            })()
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
