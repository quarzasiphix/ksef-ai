
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

const Dashboard = () => {
  const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);
  const isMobile = useIsMobile();
  
  // Get data from our global data cache
  const { invoices: { data: invoices, isLoading } } = useGlobalData();
  
  useEffect(() => {
    if (invoices?.length > 0) {
      generateMonthlySummaries(invoices);
    }
  }, [invoices]);
  
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
  const totalGross = invoices.reduce((sum, inv) => sum + (inv.totalGrossValue || 0), 0);
  const totalTax = invoices.reduce((sum, inv) => sum + (inv.totalVatValue || 0), 0);

  return (
    <div className="space-y-6 max-w-full">
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
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Ostatnie faktury</h2>
          <Button variant="outline" asChild size="sm">
            <Link to="/invoices">Zobacz wszystkie</Link>
          </Button>
        </div>
        
        {isLoading ? (
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
      
      <Card>
        <CardHeader>
          <CardTitle>KSeF Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                {isLoading ? (
                  <tr>
                    <td colSpan={isMobile ? 3 : 4} className="text-center py-4">Ładowanie...</td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={isMobile ? 3 : 4} className="text-center py-4">Brak faktur</td>
                  </tr>
                ) : (
                  invoices.slice(0, 5).map((invoice) => (
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
