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
import { useAuth } from "@/App";
import type { BusinessProfile } from "@/types";
import { getBusinessProfiles } from "@/integrations/supabase/repositories/businessProfileRepository";
import { calculateIncomeTax } from "@/lib/tax-utils";
import { useBusinessProfile } from "@/context/BusinessProfileContext";

const Dashboard = () => {
  const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);
  const [selectedProfileIncomeTax, setSelectedProfileIncomeTax] = useState<number | string | null>(null);
  const [selectedProfileTotalExpenses, setSelectedProfileTotalExpenses] = useState<number>(0);
  
  const { selectedProfileId, profiles, isLoadingProfiles } = useBusinessProfile();
  const isMobile = useIsMobile();
  
  // Get data from our global data cache
  const { invoices: { data: invoices, isLoading: isLoadingInvoices }, expenses: { data: expenses, isLoading: isLoadingExpenses } } = useGlobalData();
  const { isPremium } = useAuth();
  
  const isLoading = isLoadingInvoices || isLoadingExpenses || isLoadingProfiles; // Combined loading state
  
  useEffect(() => {
    if (invoices?.length > 0) {
      generateMonthlySummaries(invoices);
    }
    
    // Fetch and set the default business profile
    const processProfilesAndInvoices = async () => {
      try {
        if (selectedProfileId && invoices && expenses && profiles) {
          // Filter invoices and expenses by selected profile
          const filteredInvoices = invoices.filter(inv => inv.businessProfileId === selectedProfileId);
          const filteredExpenses = expenses.filter(exp => exp.businessProfileId === selectedProfileId);

          // Calculate total net income for the selected profile
          const totalNetIncomeSelected = filteredInvoices.reduce((sum, inv) => sum + (inv.totalNetValue || 0), 0);

          // Find the selected profile object to get its tax type
          const currentProfile = profiles.find(p => p.id === selectedProfileId);

          console.log('Dashboard: Selected Profile ID:', selectedProfileId);
          console.log('Dashboard: Found Profile Object:', currentProfile);
          console.log('Dashboard: Selected Profile Tax Type:', currentProfile?.tax_type);

          // Calculate estimated income tax for the selected profile
          const estimatedTax = calculateIncomeTax(totalNetIncomeSelected, currentProfile?.tax_type);
          setSelectedProfileIncomeTax(estimatedTax);

          // Calculate total expenses for the selected profile
          const totalExpensesSelected = filteredExpenses.reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);
          setSelectedProfileTotalExpenses(totalExpensesSelected);
        }

      } catch (error) {
        console.error("Error processing profiles and invoices:", error);
        setSelectedProfileIncomeTax(null);
        setSelectedProfileTotalExpenses(0);
      }
    };

    processProfilesAndInvoices();

  }, [invoices, expenses, selectedProfileId, profiles]);
  
  const generateMonthlySummaries = (invoicesData: Invoice[]) => {
    // Group invoices by month
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
    
    // Convert to array for chart
    const formattedSummaries = Object.entries(monthlyData).map(([month, values]) => ({
      month,
      monthLabel: new Date(`${month}-01`).toLocaleString("pl-PL", { month: "short" }),
      ...values
    }));
    
    // Sort by month
    formattedSummaries.sort((a, b) => a.month.localeCompare(b.month));
    
    setMonthlySummaries(formattedSummaries);
  };

  const totalInvoices = invoices.length;
  const unpaidInvoices = invoices.filter(inv => !inv.isPaid).length;
  
  // Recalculate totalGross and totalTax by summing up item values,
  // explicitly handling VAT-exempt items (vatRate === -1)
  const totalGross = invoices.reduce((invoiceSum, invoice) => {
    const invoiceGross = (invoice.items || []).reduce((itemSum, item) => {
      // For VAT-exempt items, the contribution to gross is just the net value
      // For other items, use the calculated item's gross value
      const itemGross = item.vatRate === -1 ? (item.totalNetValue || 0) : (item.totalGrossValue || 0);
      return itemSum + Math.max(0, itemGross);
    }, 0);
    return invoiceSum + invoiceGross;
  }, 0);

  const totalTax = invoices.reduce((invoiceSum, invoice) => {
    const invoiceVat = (invoice.items || []).reduce((itemSum, item) => {
      // Only sum VAT for items that are NOT VAT-exempt (vatRate !== -1)
      const itemVat = item.vatRate !== -1 ? (item.totalVatValue || 0) : 0;
      return itemSum + Math.max(0, itemVat);
    }, 0);
    return invoiceSum + invoiceVat;
  }, 0);

  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  return (
    <div className="space-y-6 max-w-full pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      
      {isMobile ? (
        // Mobile view - combined card for the first two metrics with vertical layout
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Wszystkie faktury</span>
                  <span className="text-2xl font-bold">{totalInvoices}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Niezapłacone faktury</span>
                  <span className="text-2xl font-bold text-amber-500">{unpaidInvoices}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Suma brutto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{formatCurrency(totalGross)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Suma VAT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{formatCurrency(totalTax)}</div>
            </CardContent>
          </Card>
          
          {/* Estimated Income Tax Card (Mobile) */}
          {selectedProfile && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Szacowany Podatek Dochodowy ({selectedProfile.name}) - {selectedProfile.tax_type === 'skala' ? 'Skala' : selectedProfile.tax_type === 'liniowy' ? 'Liniowy' : selectedProfile.tax_type === 'ryczalt' ? 'Ryczałt' : 'Nieokreślona'})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate">
                  {typeof selectedProfileIncomeTax === 'number' ? formatCurrency(selectedProfileIncomeTax) : selectedProfileIncomeTax}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Total Expenses Card (Mobile) */}
          {selectedProfile && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Suma Wydatków ({selectedProfile.name})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate">
                  {formatCurrency(selectedProfileTotalExpenses)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Desktop/Tablet view - original 2x2 grid
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Wszystkie faktury
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInvoices}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Niezapłacone faktury
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{unpaidInvoices}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Suma brutto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{formatCurrency(totalGross)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Suma VAT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{formatCurrency(totalTax)}</div>
            </CardContent>
          </Card>
          
          {/* Estimated Income Tax Card (Desktop) */}
          {selectedProfile && (
            <Card className="col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Szacowany Podatek Dochodowy ({selectedProfile.name}) - {selectedProfile.tax_type === 'skala' ? 'Skala' : selectedProfile.tax_type === 'liniowy' ? 'Liniowy' : selectedProfile.tax_type === 'ryczalt' ? 'Ryczałt' : 'Nieokreślona'})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate">
                   {typeof selectedProfileIncomeTax === 'number' ? formatCurrency(selectedProfileIncomeTax) : selectedProfileIncomeTax}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Total Expenses Card (Desktop) */}
          {selectedProfile && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Suma Wydatków ({selectedProfile.name})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate">
                  {formatCurrency(selectedProfileTotalExpenses)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Miesięczna sprzedaż</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
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
                {/* Reduce number of bars on mobile */}
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
      
      <Card>
        <CardHeader>
          <CardTitle>Nawigacja</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link to="/products">
              <Button variant="outline">Produkty</Button>
            </Link>
            <Link to="/settings">
              <Button variant="outline">Ustawienia</Button>
            </Link>
            <Link to="/customers">
              <Button variant="outline">Klienci</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Ostatnie faktury</h2>
          <Button variant="outline" asChild size="sm">
            <Link to="/income">Zobacz wszystkie</Link>
          </Button>
        </div>
        
        {isLoadingInvoices ? (
          <div className="text-center py-8">
            <p>Ładowanie...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8">
            <p>Brak faktur</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {invoices.slice(0, 4).map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        )}
      </div>
      
      {/* Conditionally render KSeF Status card for premium users */}
      {/* Conditionally show KSeF Status card for premium users, or a blurred version with message for non-premium */}
      <Card>
        <CardHeader>
          <CardTitle>KSeF Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0 relative">
          {!isPremium && (
             <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-md">
               <p className="text-lg font-semibold text-foreground">Kup Premium na dostęp</p>
             </div>
          )}
          <div className={isPremium ? "" : "pointer-events-none opacity-50"}> {/* Apply styles if not premium */}
            <div className="overflow-x-auto">
              <table className="w-full invoice-table">
                <thead>
                  <tr>
                    <th className="w-1/3">{isMobile ? "Nr" : "Nr faktury"}</th>
                    <th className="w-1/4">{isMobile ? "Data" : "Data wystawienia"}</th>
                    <th className="w-1/3">Status</th>
                    {!isMobile && <th>Nr referencyjny</th>}
                  </tr>
                </thead>
                <tbody>
                  {isLoadingInvoices ? (
                    <tr>
                      <td colSpan={isMobile ? 3 : 4} className="text-center py-4">Ładowanie...</td>
                    </tr>
                  ) : invoices?.filter(inv => inv.businessProfileId === selectedProfileId).length === 0 ? (
                    <tr>
                      <td colSpan={isMobile ? 3 : 4} className="text-center py-4">Brak faktur</td>
                    </tr>
                  ) : (
                    invoices?.filter(inv => inv.businessProfileId === selectedProfileId).slice(0, 5).map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="truncate max-w-[80px]">{invoice.number}</td>
                        <td>{new Date(invoice.issueDate).toLocaleDateString("pl-PL")}</td>
                        <td>
                          <span className={`px-1 py-0.5 rounded-full text-xs ${
                            invoice.ksef?.status === "sent" 
                              ? "bg-green-100 text-green-800" 
                              : invoice.ksef?.status === "pending" 
                                ? "bg-amber-100 text-amber-800" 
                                : "bg-gray-100 text-gray-800"
                          }`}>
                            {invoice.ksef?.status === "sent" 
                              ? "Wysłano" 
                              : invoice.ksef?.status === "pending" 
                                ? "Oczekuje" 
                                : "Brak"}
                          </span>
                        </td>
                        {!isMobile && <td className="truncate">{invoice.ksef?.referenceNumber || "—"}</td>}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section to display tax for all profiles if more than one */}
      {profiles?.length > 1 && !isLoadingInvoices && !isLoadingExpenses && !isLoadingProfiles ? (
        <Card className="col-span-full">
           <CardHeader>
             <CardTitle>Szacowany Podatek Dochodowy wg Profili</CardTitle>
           </CardHeader>
           <CardContent className="pt-2">
               <div className="space-y-4">
               {profiles.map(profile => {
                   // Calculate income and tax for THIS profile again for the list view
                   const profileInvoices = invoices?.filter(inv => inv.businessProfileId === profile.id) || [];
                   const totalNetIncome = profileInvoices.reduce((sum, inv) => sum + (inv.totalNetValue || 0), 0);
                   const estimatedIncomeTax = calculateIncomeTax(totalNetIncome, profile.tax_type);

                   return (
                       <div key={profile.id} className="border rounded-md p-3">
                           <div className="font-medium">{profile.name} ({profile.tax_type === 'skala' ? 'Skala' : profile.tax_type === 'liniowy' ? 'Liniowy' : profile.tax_type === 'ryczalt' ? 'Ryczałt' : 'Nieokreślona'})</div>
                           <div className="text-sm text-muted-foreground">Przychód netto z faktur: {formatCurrency(totalNetIncome)}</div>
                           <div className="text-lg font-bold mt-1">
                               Szacowany podatek: {typeof estimatedIncomeTax === 'number' ? formatCurrency(estimatedIncomeTax) : estimatedIncomeTax}
                           </div>
                            {profile.tax_type === 'skala' && (
                                <div className="text-xs text-amber-600 mt-1">
                                    (Wymaga pełnego obliczenia z uwzględnieniem kosztów, progów podatkowych itp.)
                                </div>
                            )}
                             {profile.tax_type === 'ryczalt' && (
                                <div className="text-xs text-amber-600 mt-1">
                                    (Stawka ryczałtu zależy od rodzaju działalności - użyto przykładowej stawki 17% dla przychodu netto)
                                </div>
                            )}
                              {profile.tax_type === 'liniowy' && (
                                <div className="text-xs text-amber-600 mt-1">
                                    (Obliczone od przychodu netto - nie uwzględnia kosztów)
                                </div>
                            )}
                       </div>
                   );
               })}
               </div>
           </CardContent>
        </Card>
      ) : profiles?.length > 1 && ( // Show loading state for this section
          <Card className="col-span-full">
             <CardHeader>
              <CardTitle>Szacowany Podatek Dochodowy wg Profili</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-center py-4">Ładowanie danych profili...</div>
            </CardContent>
           </Card>
      )}
    </div>
  );
};

export default Dashboard;
