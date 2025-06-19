
import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/invoice-utils";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  Eye, 
  Trash2, 
  CheckCircle,
  Share2,
  DollarSign
} from "lucide-react";
import { useGlobalData } from "@/hooks/use-global-data";
import { TransactionType } from "@/types/common";
import InvoicePDFViewer from "@/components/invoices/InvoicePDFViewer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ShareInvoiceDialog from "@/components/invoices/ShareInvoiceDialog";

interface InvoiceDetailProps {
  type: "income" | "expense";
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invoices: { data: invoices, isLoading }, refreshAllData } = useGlobalData();
  const [showPDF, setShowPDF] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isUpdatingPaid, setIsUpdatingPaid] = useState(false);

  const invoice = invoices.find(inv => inv.id === id);

  const handleTogglePaid = async () => {
    if (!invoice || !user?.id) return;
    
    setIsUpdatingPaid(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ is_paid: !invoice.isPaid })
        .eq('id', invoice.id)
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshAllData();
      toast.success(
        invoice.isPaid 
          ? "Faktura oznaczona jako nieopłacona" 
          : "Faktura oznaczona jako opłacona"
      );
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Nie udało się zaktualizować statusu płatności");
    } finally {
      setIsUpdatingPaid(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice || !user?.id) return;
    
    if (!confirm("Czy na pewno chcesz usunąć tę fakturę?")) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Faktura została usunięta");
      navigate(type === "income" ? "/income" : "/expense");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Nie udało się usunąć faktury");
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Ładowanie...</div>;
  }

  if (!invoice) {
    return <div className="text-center py-8">Faktura nie została znaleziona</div>;
  }

  const getInvoiceTypeLabel = (invoiceType: string) => {
    switch (invoiceType) {
      case 'sales':
        return 'Faktura VAT';
      case 'receipt':
        return 'Rachunek';
      default:
        return invoiceType;
    }
  };

  const isIncome = invoice.transactionType === TransactionType.INCOME;
  const editPath = isIncome ? `/income/edit/${invoice.id}` : `/expense/${invoice.id}/edit`;

  return (
    <div className="space-y-6 max-w-full pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={isIncome ? "/income" : "/expense"}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{invoice.number}</h1>
            <p className="text-muted-foreground">
              {getInvoiceTypeLabel(invoice.type)} • {format(new Date(invoice.issueDate), "dd.MM.yyyy", { locale: pl })}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setShowPDF(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Podgląd
          </Button>
          <Button asChild>
            <Link to={editPath}>
              <Edit className="h-4 w-4 mr-2" />
              Edytuj
            </Link>
          </Button>
        </div>
      </div>

      {/* Status and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Badge variant={invoice.isPaid ? "default" : "secondary"}>
            {invoice.isPaid ? "Opłacone" : "Nieopłacone"}
          </Badge>
          <Badge variant="outline">
            {isIncome ? "Przychód" : "Wydatek"}
          </Badge>
        </div>
        <div className="flex space-x-2">
          {isIncome && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareDialog(true)}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Udostępnij
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePaid}
            disabled={isUpdatingPaid}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            {invoice.isPaid ? "Oznacz jako nieopłacone" : "Oznacz jako opłacone"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Usuń
          </Button>
        </div>
      </div>

      {/* Invoice Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seller/Business Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>{isIncome ? "Sprzedawca" : "Nabywca"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-semibold">{invoice.businessName}</div>
              {/* Add more business profile details if available */}
            </div>
          </CardContent>
        </Card>

        {/* Buyer/Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle>{isIncome ? "Nabywca" : "Sprzedawca"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-semibold">{invoice.customerName}</div>
              {/* Add more customer details if available */}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Szczegóły faktury</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Typ:</span>
              <span>{getInvoiceTypeLabel(invoice.type)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data wystawienia:</span>
              <span>{format(new Date(invoice.issueDate), "dd.MM.yyyy", { locale: pl })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data sprzedaży:</span>
              <span>{format(new Date(invoice.sellDate), "dd.MM.yyyy", { locale: pl })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Termin płatności:</span>
              <span>{format(new Date(invoice.dueDate), "dd.MM.yyyy", { locale: pl })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sposób płatności:</span>
              <span>
                {invoice.paymentMethod === 'transfer' ? 'Przelew' :
                 invoice.paymentMethod === 'cash' ? 'Gotówka' :
                 invoice.paymentMethod === 'card' ? 'Karta' : 'Inne'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie finansowe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wartość netto:</span>
              <span>{formatCurrency(invoice.totalNetValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Podatek VAT:</span>
              <span>{formatCurrency(invoice.totalVatValue)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-3">
              <span>Wartość brutto:</span>
              <span className="text-green-600">{formatCurrency(invoice.totalGrossValue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
          <CardTitle>Pozycje faktury</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Nazwa</th>
                  <th className="text-right py-2">Ilość</th>
                  <th className="text-right py-2">Cena netto</th>
                  <th className="text-right py-2">VAT</th>
                  <th className="text-right py-2">Wartość brutto</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{item.name}</td>
                    <td className="text-right py-2">{item.quantity} {item.unit}</td>
                    <td className="text-right py-2">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right py-2">{item.vatRate}%</td>
                    <td className="text-right py-2">{formatCurrency(item.totalGrossValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      {invoice.comments && (
        <Card>
          <CardHeader>
            <CardTitle>Uwagi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{invoice.comments}</p>
          </CardContent>
        </Card>
      )}

      {/* PDF Viewer Dialog */}
      {showPDF && (
        <InvoicePDFViewer 
          invoice={invoice} 
          isOpen={showPDF} 
          onClose={() => setShowPDF(false)} 
        />
      )}

      {/* Share Invoice Dialog */}
      {showShareDialog && (
        <ShareInvoiceDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          invoiceId={invoice.id}
          invoiceNumber={invoice.number}
        />
      )}
    </div>
  );
};

export default InvoiceDetail;
