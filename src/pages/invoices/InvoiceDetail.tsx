
import React from "react";
import { useParams, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getInvoiceById, getBusinessProfileById, getCustomerById } from "@/data/mockData";
import { formatCurrency, formatPolishDate } from "@/lib/invoice-utils";
import { InvoiceType } from "@/types";
import { ArrowLeft, Printer, FileText, SendHorizontal, FilePlus } from "lucide-react";

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
  const invoice = getInvoiceById(id || "");
  
  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Faktura nie znaleziona</h2>
        <Button asChild>
          <Link to="/invoices">Wróć do listy faktur</Link>
        </Button>
      </div>
    );
  }
  
  const business = getBusinessProfileById(invoice.businessProfileId);
  const customer = getCustomerById(invoice.customerId);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{invoice.number}</h1>
            <p className="text-muted-foreground">
              {getInvoiceTypeTitle(invoice.type)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex items-center gap-1">
            <Printer className="h-4 w-4" />
            <span>Drukuj</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-1">
            <FilePlus className="h-4 w-4" />
            <span>Duplikat</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>PDF</span>
          </Button>
          <Button className="flex items-center gap-1">
            <SendHorizontal className="h-4 w-4" />
            <span>Wyślij do KSeF</span>
          </Button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Szczegóły faktury</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Numer faktury</p>
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
            {invoice.ksef?.referenceNumber && (
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
            <CardTitle>Dane kontrahentów</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Sprzedawca</p>
              {business ? (
                <div>
                  <p className="font-bold">{business.name}</p>
                  <p>{business.address}</p>
                  <p>{business.postalCode} {business.city}</p>
                  <p className="mt-2">NIP: {business.taxId}</p>
                  {business.regon && <p>REGON: {business.regon}</p>}
                  {business.email && <p>Email: {business.email}</p>}
                  {business.phone && <p>Tel: {business.phone}</p>}
                </div>
              ) : (
                <p>Brak danych sprzedawcy</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Nabywca</p>
              {customer ? (
                <div>
                  <p className="font-bold">{customer.name}</p>
                  <p>{customer.address}</p>
                  <p>{customer.postalCode} {customer.city}</p>
                  {customer.taxId && <p className="mt-2">NIP: {customer.taxId}</p>}
                  {customer.email && <p>Email: {customer.email}</p>}
                  {customer.phone && <p>Tel: {customer.phone}</p>}
                </div>
              ) : (
                <p>Brak danych nabywcy</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Pozycje na fakturze</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Płatność</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Metoda płatności</p>
            <p className="font-medium">
              {invoice.paymentMethod === "transfer" ? "Przelew" : invoice.paymentMethod}
            </p>
            {business?.bankAccount && invoice.paymentMethod === "transfer" && (
              <div className="mt-2">
                <p className="text-sm font-medium text-muted-foreground">Numer konta</p>
                <p className="font-medium">{business.bankAccount}</p>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Wartość netto:</p>
              <p className="font-medium">{formatCurrency(invoice.totalNetValue || 0)}</p>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm font-medium text-muted-foreground">Kwota VAT:</p>
              <p className="font-medium">{formatCurrency(invoice.totalVatValue || 0)}</p>
            </div>
            <div className="flex items-center justify-between mt-2 text-lg font-bold">
              <p>Do zapłaty:</p>
              <p>{formatCurrency(invoice.totalGrossValue || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceDetail;
