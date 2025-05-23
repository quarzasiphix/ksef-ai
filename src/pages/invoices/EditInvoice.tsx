import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Invoice } from "@/types";
import { getInvoice, deleteInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import NewInvoice from "./NewInvoice";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const EditInvoice = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) {
        setError("Brak identyfikatora faktury");
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching invoice with ID:', id);
        const invoiceData = await getInvoice(id);
        console.log('Fetched invoice data:', invoiceData);
        console.log('Invoice items:', invoiceData.items);
        setInvoice(invoiceData);
      } catch (error) {
        console.error("Error fetching invoice:", error);
        setError("Nie udało się pobrać danych faktury");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteInvoice(id);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success("Dokument został usunięty");
      navigate(invoice?.transactionType === 'income' ? '/income' : '/expense');
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Wystąpił błąd podczas usuwania dokumentu");
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
    console.error('Error loading invoice:', error);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(invoice?.transactionType === 'income' ? '/income' : '/expense')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Błąd</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error || "Nie znaleziono faktury"}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(invoice?.transactionType === 'income' ? '/income' : '/expense')}
          >
            Wróć do listy dokumentów
          </Button>
        </div>
      </div>
    );
  }

  const isExpense = invoice.transactionType === 'expense';

  // Transform the invoice data to ensure it matches the expected structure
  const transformInvoiceData = (invoice: Invoice) => {
    console.log('Transforming invoice data:', invoice);
    const transformed = {
      ...invoice,
      // Ensure items have all required fields with proper defaults
      items: (invoice.items || []).map((item, idx) => {
        console.log('Processing item:', item);
        const transformedItem = {
          ...item,
          id: item.id || `${invoice.id}-item-${idx}`,
          description: item.description || item.name || '',
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          vatRate: item.vatRate !== undefined ? Number(item.vatRate) : 23,
          unit: item.unit || 'szt.',
          totalNetValue: item.totalNetValue !== undefined ? Number(item.totalNetValue) : 0,
          totalVatValue: item.totalVatValue !== undefined ? Number(item.totalVatValue) : 0,
          totalGrossValue: item.totalGrossValue !== undefined ? Number(item.totalGrossValue) : 0,
          name: item.name || item.description || '',
          productId: item.productId || undefined,
        };
        console.log('Transformed item:', transformedItem);
        return transformedItem;
      }),
      buyer: isExpense ? invoice.seller : invoice.buyer,
      seller: isExpense ? invoice.buyer : invoice.seller,
      fakturaBezVAT: !invoice.vat, // Convert vat boolean to fakturaBezVAT
      vatExemptionReason: invoice.vatExemptionReason, // Pass through the VAT exemption reason
    };
    console.log('Final transformed data:', transformed);
    return transformed;
  };

  // Use the NewInvoice component in edit mode with transformed data
  const transformedData = transformInvoiceData(invoice);
  console.log('Passing to NewInvoice:', transformedData);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(invoice.transactionType === 'income' ? '/income' : '/expense')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Edycja dokumentu</h1>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń dokument
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Czy na pewno chcesz usunąć ten dokument?</AlertDialogTitle>
              <AlertDialogDescription>
                Ta operacja jest nieodwracalna. Po usunięciu dokumentu nie będzie możliwości jego odzyskania.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Usuń
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <NewInvoice 
        initialData={transformedData} 
        type={invoice.transactionType as any}
      />
    </div>
  );
};

export default EditInvoice;
