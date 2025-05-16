
import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPolishDate } from "@/lib/invoice-utils";
import { InvoiceType, Invoice } from "@/types";
import { ArrowLeft, Printer, FileText, SendHorizontal, FilePlus, Pencil, FileDown } from "lucide-react";
import { getInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { generateElementPdf, getInvoiceFileName } from "@/lib/pdf-utils";

const getInvoiceTypeTitle = (type: InvoiceType) => {
  switch (type) {
    case InvoiceType.SALES:
      return "Faktura VAT";
    case InvoiceType.RECEIPT:
      return "Rachunek";
    case InvoiceType.PROFORMA:
      return "Faktura proforma";
    case InvoiceType.CORRECTION:
      return "Faktura korygująca";
    default:
      return "Dokument";
  }
};

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const printRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) {
        setError("Brak identyfikatora faktury");
        setLoading(false);
        return;
      }

      try {
        const invoiceData = await getInvoice(id);
        setInvoice(invoiceData);
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError("Nie udało się pobrać danych faktury");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  // Handle PDF generation
  const handleGeneratePdf = async () => {
    if (!invoice || !printRef.current) return;
    
    setPdfLoading(true);
    try {
      // Get PDF filename based on invoice details
      const filename = getInvoiceFileName(invoice);
      
      // Generate PDF from the print ref element
      const success = await generateElementPdf(printRef.current, { filename });
      
      if (success) {
        toast.success('PDF został wygenerowany pomyślnie');
      } else {
        toast.error('Nie udało się wygenerować PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Błąd podczas generowania PDF');
    } finally {
      setPdfLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Ładowanie...</p>
      </div>
    );
  }
  
  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/income">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Błąd</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error || "Nie znaleziono faktury"}</p>
          <Button
            variant="outline"
            className="mt-4"
            asChild
          >
            <Link to="/income">Wróć do listy dokumentów</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  // Mobile view for invoice items
  const renderMobileItems = () => {
    return invoice.items.map((item, index) => (
      <Card key={item.id} className="mb-3">
        <CardContent className="p-4">
          <div className="font-medium text-base mb-2">{index + 1}. {item.name}</div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Ilość:</p>
              <p>{item.quantity} {item.unit}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cena netto:</p>
              <p>{formatCurrency(item.unitPrice)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">VAT:</p>
              <p>{item.vatRate}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Wartość netto:</p>
              <p>{formatCurrency(item.totalNetValue || 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Kwota VAT:</p>
              <p>{formatCurrency(item.totalVatValue || 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Wartość brutto:</p>
              <p className="font-medium">{formatCurrency(item.totalGrossValue || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  };

  // Desktop view for invoice items
  const renderDesktopItems = () => {
    return (
      <table className="w-full invoice-table">
        <thead>
          <tr>
            <th>Lp.</th>
            <th>Nazwa</th>
            <th>Ilość</th>
            <th>Jednostka</th>
            <th>Cena netto</th>
            <th>Wartość netto</th>
            <th>Stawka VAT</th>
            <th>Kwota VAT</th>
            <th>Wartość brutto</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={item.id}>
              <td>{index + 1}</td>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{item.unit}</td>
              <td>{formatCurrency(item.unitPrice)}</td>
              <td>{formatCurrency(item.totalNetValue || 0)}</td>
              <td>{item.vatRate}%</td>
              <td>{formatCurrency(item.totalVatValue || 0)}</td>
              <td>{formatCurrency(item.totalGrossValue || 0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td colSpan={5} className="text-right">Razem:</td>
            <td>{formatCurrency(invoice.totalNetValue || 0)}</td>
            <td></td>
            <td>{formatCurrency(invoice.totalVatValue || 0)}</td>
            <td>{formatCurrency(invoice.totalGrossValue || 0)}</td>
          </tr>
        </tfoot>
      </table>
    );
  };

  // Mobile summary for totals
  const renderMobileSummary = () => {
    return (
      <div className="bg-gray-50 p-3 rounded-md mt-4">
        <div className="flex justify-between mb-1">
          <span className="text-muted-foreground">Razem netto:</span>
          <span>{formatCurrency(invoice.totalNetValue || 0)}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-muted-foreground">Razem VAT:</span>
          <span>{formatCurrency(invoice.totalVatValue || 0)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Razem brutto:</span>
          <span>{formatCurrency(invoice.totalGrossValue || 0)}</span>
        </div>
      </div>
    );
  };
  
  // Check if document type is a receipt (rachunek) - hide VAT info
  const isReceipt = invoice.type === InvoiceType.RECEIPT;
  
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/income">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{invoice.number}</h1>
            <p className="text-muted-foreground">
              {getInvoiceTypeTitle(invoice.type)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex items-center gap-1" size={isMobile ? "sm" : "default"}>
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Drukuj</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-1" size={isMobile ? "sm" : "default"}>
            <FilePlus className="h-4 w-4" />
            <span className="hidden sm:inline">Duplikat</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-1" 
            size={isMobile ? "sm" : "default"}
            onClick={handleGeneratePdf}
            disabled={pdfLoading}
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-1" size={isMobile ? "sm" : "default"} asChild>
            <Link to={`/invoices/edit/${invoice.id}`}>
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Edytuj</span>
            </Link>
          </Button>
          {invoice.type !== InvoiceType.RECEIPT && (
            <Button className="flex items-center gap-1" size={isMobile ? "sm" : "default"}>
              <SendHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Wyślij do KSeF</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Printable content reference */}
      <div ref={printRef} className="space-y-4 md:space-y-6 print:p-8">
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Szczegóły dokumentu</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 md:gap-4 text-sm md:text-base">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Numer dokumentu</p>
                <p className="font-medium">{invoice.number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data wystawienia</p>
                <p className="font-medium">{formatPolishDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Termin płatności</p>
                <p className="font-medium">{formatPolishDate(invoice.dueDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data sprzedaży</p>
                <p className="font-medium">{formatPolishDate(invoice.sellDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status płatności</p>
                <span 
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    invoice.isPaid
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {invoice.isPaid ? "Zapłacono" : "Oczekuje"}
                </span>
              </div>
              {!isReceipt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status KSeF</p>
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
                </div>
              )}
              {!isReceipt && invoice.ksef?.referenceNumber && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Nr referencyjny KSeF</p>
                  <p className="font-medium">{invoice.ksef.referenceNumber}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Uwagi</p>
                <p>{invoice.comments || "Brak uwag"}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Dane kontrahentów</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Sprzedawca</p>
                <div>
                  <p className="font-bold">{invoice.businessName || "Brak nazwy"}</p>
                  <p>Brak dostępnych szczegółowych danych</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Nabywca</p>
                <div>
                  <p className="font-bold">{invoice.customerName || "Brak nazwy"}</p>
                  <p>Brak dostępnych szczegółowych danych</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Pozycje na dokumencie</CardTitle>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              <>
                {renderMobileItems()}
                {renderMobileSummary()}
              </>
            ) : (
              <div className="overflow-x-auto">
                {renderDesktopItems()}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Płatność</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Metoda płatności</p>
              <p className="font-medium">
                {invoice.paymentMethod === "transfer" ? "Przelew" : 
                 invoice.paymentMethod === "cash" ? "Gotówka" : 
                 invoice.paymentMethod === "card" ? "Karta" : "Inna"}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Wartość netto:</p>
                <p className="font-medium">{formatCurrency(invoice.totalNetValue || 0)}</p>
              </div>
              {!isReceipt && (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm font-medium text-muted-foreground">Kwota VAT:</p>
                  <p className="font-medium">{formatCurrency(invoice.totalVatValue || 0)}</p>
                </div>
              )}
              <div className="flex items-center justify-between mt-2 text-base md:text-lg font-bold">
                <p>Do zapłaty:</p>
                <p>{formatCurrency(invoice.totalGrossValue || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvoiceDetail;
