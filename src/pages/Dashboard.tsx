
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/invoice-utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Invoice, InvoiceType, PaymentMethod } from "@/types";
import { getInvoices } from "@/integrations/supabase/repositories/invoiceRepository";
import InvoiceCard from "@/components/invoices/InvoiceCard";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const invoicesData = await getInvoices();
        setInvoices(invoicesData);
        generateMonthlySummaries(invoicesData);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoices();
  }, []);
  
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
            <div className="text-2xl font-bold">{formatCurrency(totalGross)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Suma VAT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalTax)}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Miesięczna sprzedaż</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySummaries}>
                <XAxis dataKey="monthLabel" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Miesiąc: ${label}`}
                />
                <Bar dataKey="totalNetValue" name="Netto" fill="#93c5fd" />
                <Bar dataKey="totalVatValue" name="VAT" fill="#3b82f6" />
                <Bar dataKey="totalGrossValue" name="Brutto" fill="#1d4ed8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex justify-between items-center">
            <div>
              <CardTitle>Ostatnie faktury</CardTitle>
            </div>
            <Button variant="outline" asChild size="sm">
              <Link to="/invoices">Zobacz wszystkie</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8">
                <p>Ładowanie...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8">
                <p>Brak faktur</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 p-4">
                {invoices.slice(0, 3).map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>KSeF Status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full invoice-table">
                <thead>
                  <tr>
                    <th>Nr faktury</th>
                    <th>Data</th>
                    <th>Status KSeF</th>
                    <th>Nr referencyjny</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4">Ładowanie...</td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4">Brak faktur</td>
                    </tr>
                  ) : (
                    invoices.slice(0, 5).map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.number}</td>
                        <td>{new Date(invoice.issueDate).toLocaleDateString("pl-PL")}</td>
                        <td>
                          <span className={`px-2 py-1 rounded-full text-xs ${
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
                        <td>{invoice.ksef?.referenceNumber || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
