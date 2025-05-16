
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockInvoices, getMonthlyInvoiceSummaries } from "@/data/mockData";
import { formatCurrency } from "@/lib/invoice-utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const Dashboard = () => {
  const totalInvoices = mockInvoices.length;
  const unpaidInvoices = mockInvoices.filter(inv => !inv.isPaid).length;
  const totalGross = mockInvoices.reduce((sum, inv) => sum + (inv.totalGrossValue || 0), 0);
  const totalTax = mockInvoices.reduce((sum, inv) => sum + (inv.totalVatValue || 0), 0);
  
  const monthlySummaries = getMonthlyInvoiceSummaries();
  
  // Format month labels
  const formattedMonthlySummaries = monthlySummaries.map(summary => ({
    ...summary,
    monthLabel: new Date(summary.month + "-01").toLocaleString("pl-PL", { month: "short" }),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedMonthlySummaries}>
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
          <CardHeader>
            <CardTitle>Ostatnie faktury</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full invoice-table">
              <thead>
                <tr>
                  <th>Nr faktury</th>
                  <th>Data</th>
                  <th>Klient</th>
                  <th>Kwota</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mockInvoices.slice(0, 5).map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.number}</td>
                    <td>{new Date(invoice.issueDate).toLocaleDateString("pl-PL")}</td>
                    <td>{invoice.customerId}</td>
                    <td>{formatCurrency(invoice.totalGrossValue || 0)}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        invoice.isPaid 
                          ? "bg-green-100 text-green-800" 
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {invoice.isPaid ? "Zapłacono" : "Oczekuje"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>KSeF Status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                {mockInvoices.slice(0, 5).map((invoice) => (
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
                    <td>{invoice.ksef?.referenceNumber || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
