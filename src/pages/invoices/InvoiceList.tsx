
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/invoice-utils";
import { Invoice, InvoiceType, PaymentMethod } from "@/types";
import { Plus, FileText, Search } from "lucide-react";
import { getInvoices } from "@/integrations/supabase/repositories/invoiceRepository";
import InvoiceCard from "@/components/invoices/InvoiceCard";

const InvoiceList = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const invoicesData = await getInvoices();
        setInvoices(invoicesData);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoices();
  }, []);
  
  // Filter invoices based on search term
  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.customerName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Translate invoice type to Polish
  const getInvoiceTypeText = (type: InvoiceType) => {
    switch (type) {
      case InvoiceType.SALES:
        return "Faktura sprzedaży";
      case InvoiceType.RECEIPT:
        return "Rachunek";
      case InvoiceType.PROFORMA:
        return "Faktura proforma";
      case InvoiceType.CORRECTION:
        return "Faktura korygująca";
      default:
        return type;
    }
  };
  
  // Translate payment method to Polish
  const getPaymentMethodText = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.TRANSFER:
        return "Przelew";
      case PaymentMethod.CASH:
        return "Gotówka";
      case PaymentMethod.CARD:
        return "Karta";
      case PaymentMethod.OTHER:
        return "Inne";
      default:
        return method;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Faktury</h1>
          <p className="text-muted-foreground">
            Zarządzaj fakturami i rachunkami
          </p>
        </div>
        <Button asChild>
          <Link to="/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            Nowa faktura
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Wszystkie faktury</CardTitle>
              <CardDescription>
                Łączna liczba: {filteredInvoices.length}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj faktur..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile view - Card list for screens ≤600px */}
          <div className="block sm:hidden">
            {loading ? (
              <div className="text-center py-8">
                Ładowanie...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-8">
                {searchTerm.length > 0 ? "Brak wyników wyszukiwania" : "Brak faktur"}
              </div>
            ) : (
              <div className="p-4">
                {filteredInvoices.map(invoice => (
                  <InvoiceCard key={invoice.id} invoice={invoice} />
                ))}
              </div>
            )}
          </div>
          
          {/* Desktop view - Table for screens >600px */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full invoice-table">
              <thead>
                <tr>
                  <th>Nr faktury</th>
                  <th>Typ</th>
                  <th>Data wystawienia</th>
                  <th>Termin płatności</th>
                  <th>Klient</th>
                  <th>Wartość netto</th>
                  <th>Wartość brutto</th>
                  <th>Metoda płatności</th>
                  <th>Status</th>
                  <th>KSeF</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8">
                      Ładowanie...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8">
                      {searchTerm.length > 0 ? "Brak wyników wyszukiwania" : "Brak faktur"}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.number}</td>
                      <td>{getInvoiceTypeText(invoice.type)}</td>
                      <td>{new Date(invoice.issueDate).toLocaleDateString("pl-PL")}</td>
                      <td>{new Date(invoice.dueDate).toLocaleDateString("pl-PL")}</td>
                      <td>
                        {invoice.customerName || "Nieznany"}
                      </td>
                      <td>{formatCurrency(invoice.totalNetValue || 0)}</td>
                      <td>{formatCurrency(invoice.totalGrossValue || 0)}</td>
                      <td>{getPaymentMethodText(invoice.paymentMethod)}</td>
                      <td>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            invoice.isPaid
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {invoice.isPaid ? "Zapłacono" : "Oczekuje"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            invoice.ksef?.status === "sent"
                              ? "bg-green-100 text-green-800"
                              : invoice.ksef?.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {invoice.ksef?.status === "sent"
                            ? "Wysłano"
                            : invoice.ksef?.status === "pending"
                            ? "Oczekuje"
                            : "Brak"}
                        </span>
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link to={`/invoices/${invoice.id}`}>
                              <FileText className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
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

export default InvoiceList;
