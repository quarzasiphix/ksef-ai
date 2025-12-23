import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { Invoice, Company, InvoiceItem, PaymentMethod } from "@/shared/types";
import { getInvoice, deleteInvoice, saveInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
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
} from "@/shared/ui/alert-dialog";
import { useSidebar } from "@/shared/ui/sidebar";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/shared/context/AuthContext";
import { InvoiceFormActions } from "@/modules/invoices/components/forms/InvoiceFormActions";
import { Switch } from '@/shared/ui/switch';
import { calculateItemValues, toPaymentMethodDb } from "@/shared/lib/invoice-utils";
import { PaymentMethodDb } from "@/shared/types/common";
import ContractsForInvoice from "@/modules/invoices/components/ContractsForInvoice";
import { getBankAccountsForProfile } from "@/integrations/supabase/repositories/bankAccountRepository";
import { BankAccount } from "@/modules/banking/bank";
import { transformInvoiceForForm } from "@/shared/lib/invoice-transform";

const EditInvoice = () => {
  const { id } = useParams<{ id: string }>();

  // Early return for 'new' invoice
  if (id === 'new') return <NewInvoice />;

  // All hooks must be called unconditionally after the early return above
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const { user } = useAuth();
  const formRef = useRef<{ handleSubmit: (onValid: (data: any) => Promise<void>) => (e?: React.BaseSyntheticEvent) => Promise<void> }>(null);
  const [isSaving, setIsSaving] = useState(false);

  const transformInvoiceData = useCallback((invoiceData: Invoice | null) => {
    if (!invoiceData) return null;
    const isExpense = invoiceData.transactionType === 'expense';

    // Handle the VAT toggle logic correctly
    const vat = invoiceData.vat ?? (invoiceData.fakturaBezVAT !== undefined ? !invoiceData.fakturaBezVAT : true);
    const fakturaBezVAT = invoiceData.fakturaBezVAT ?? (invoiceData.vat !== undefined ? !invoiceData.vat : false);

    const transformedItems = (invoiceData.items || []).map(item => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      vatRate: Number(item.vatRate) || 0,
      totalNetValue: Number(item.totalNetValue) || 0,
      totalVatValue: Number(item.totalVatValue) || 0,
      totalGrossValue: Number(item.totalGrossValue) || 0,
      unit: item.unit || 'szt.'
    }));
    
    const paymentMethod: PaymentMethodDb = toPaymentMethodDb(invoiceData.paymentMethod);
    const transformed: Invoice = {
      ...invoiceData,
      items: transformedItems,
      buyer: isExpense ? invoiceData.seller : invoiceData.buyer,
      seller: isExpense ? invoiceData.buyer : invoiceData.seller,
      vat: vat,
      fakturaBezVAT: fakturaBezVAT,
      vatExemptionReason: invoiceData.vatExemptionReason,
      paymentMethod: paymentMethod as PaymentMethodDb,
      number: invoiceData.number || '',
      issueDate: invoiceData.issueDate || new Date().toISOString(),
      sellDate: invoiceData.sellDate || new Date().toISOString(),
      dueDate: invoiceData.dueDate || new Date().toISOString(),
      customerId: invoiceData.customerId || '',
      businessProfileId: invoiceData.businessProfileId || '',
      transactionType: invoiceData.transactionType,
      type: invoiceData.type,
      currency: invoiceData.currency || 'PLN',
      exchangeRate: Number(invoiceData.exchangeRate) || 1,
      exchangeRateDate: invoiceData.exchangeRateDate || new Date().toISOString(),
      exchangeRateSource: invoiceData.exchangeRateSource || 'NBP',
      totalNetValue: Number(invoiceData.totalNetValue) || 0,
      totalVatValue: Number(invoiceData.totalVatValue) || 0,
      totalGrossValue: Number(invoiceData.totalGrossValue) || 0,
      totalAmount: Number(invoiceData.totalGrossValue) || 0,
      isPaid: invoiceData.isPaid || false,
      paid: invoiceData.paid || false,
      status: invoiceData.status || 'draft',
      comments: invoiceData.comments || '',
      created_at: invoiceData.created_at || new Date().toISOString(),
      updated_at: invoiceData.updated_at || new Date().toISOString(),
      user_id: invoiceData.user_id,
      id: invoiceData.id,
      date: invoiceData.date || new Date().toISOString(),
      ksef: invoiceData.ksef,
      businessName: invoiceData.businessName,
      customerName: invoiceData.customerName,
      bankAccountId: invoiceData.bankAccountId,
      bankAccountNumber: invoiceData.bankAccountNumber,
    };
    return transformed;
  }, []);

  const transformedInvoice = useMemo(() => transformInvoiceForForm(invoice), [invoice]);
  const transformedData = useMemo(() => transformInvoiceData(invoice), [invoice, transformInvoiceData]);
  const displayData = transformedData || transformedInvoice;

  const handleItemsChange = (newItems: InvoiceItem[]) => {
    setItems([...newItems]);
  };

  useEffect(() => {
    if (!id || id === 'new') {
      setLoading(false);
      return;
    }
    const fetchInvoice = async () => {
      try {
        const invoiceData = await getInvoice(id);
        setInvoice(invoiceData);
      } catch (err) {
        setError("Nie udało się pobrać danych faktury");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  useEffect(() => {
    if (invoice?.items) {
      setItems([...invoice.items]);
    }
  }, [invoice]);

  useEffect(() => {
    if (invoice?.businessProfileId) {
      getBankAccountsForProfile(invoice.businessProfileId)
        .then(setBankAccounts)
        .catch(console.error);
    }
  }, [invoice?.businessProfileId]);

  const handleUpdate = async (formData: any): Promise<void> => {
    if (!id || id === 'new' || !invoice || !user) {
      toast.error('Błąd: Brak danych do aktualizacji.');
      return;
    }
    try {
      setIsSaving(true);
      
      // Ensure vat and fakturaBezVAT are properly synchronized
      const vat = formData.vat ?? !formData.fakturaBezVAT;
      const fakturaBezVAT = formData.fakturaBezVAT ?? !formData.vat;
      
      // Convert payment method to database format if it's in UI format
      const paymentMethod = typeof formData.paymentMethod === 'string' && 
        ['przelew', 'gotówka', 'karta', 'inny'].includes(formData.paymentMethod)
          ? toPaymentMethodDb(formData.paymentMethod as PaymentMethod)
          : formData.paymentMethod;
      
      const updateData = {
        ...formData,
        id,
        user_id: user.id,
        items: [...items],
        vat: vat,
        fakturaBezVAT: fakturaBezVAT,
        paymentMethod,
        // Ensure we have the correct date format
        issueDate: formData.issueDate ? new Date(formData.issueDate).toISOString() : new Date().toISOString(),
        sellDate: formData.sellDate ? new Date(formData.sellDate).toISOString() : new Date().toISOString(),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : new Date().toISOString(),
      };
      
      // Update items to ensure they have the correct VAT rates if this is a VAT-less invoice
      if (fakturaBezVAT) {
        updateData.items = updateData.items.map(item => ({
          ...item,
          vatRate: -1,
          vatExempt: true
        }));
      }
      
      console.log('Saving invoice with data:', updateData);
      
      await saveInvoice(updateData as any);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      
      toast.success("Faktura została zaktualizowana");
      navigate(invoice.transactionType === 'income' ? '/income' : '/expense');
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      toast.error(error.message || "Wystąpił błąd podczas aktualizacji faktury");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteInvoice(id);
      toast.success("Faktura została usunięta");
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate(invoice?.transactionType === 'income' ? '/income' : '/expense');
    } catch (error) {
      toast.error("Wystąpił błąd podczas usuwania faktury");
    }
  };

  const handleMarkAsUnpaid = async () => {
    if (!invoice || !id || !user) return;
    try {
      const updatedData = {
        id: id,
        user_id: user.id,
        isPaid: false,
      };
      await saveInvoice(updatedData as any);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      toast.success('Faktura oznaczona jako nieopłacona');
      setInvoice((prev) => prev ? { ...prev, isPaid: false } : null);
    } catch (error) {
      toast.error('Wystąpił błąd podczas oznaczania jako nieopłacona');
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
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Błąd</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error || "Nie znaleziono faktury"}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(-1)}
          >
            Wróć do poprzedniej strony
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(invoice.transactionType === 'income' ? '/income' : '/expense')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Edycja dokumentu</h1>
        </div>
        <div className="flex items-center gap-2">
          {invoice.isPaid && (
            <Button variant="secondary" size="sm" onClick={handleMarkAsUnpaid}>
              Oznacz jako nieopłacona
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Czy na pewno chcesz usunąć ten dokument?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tej operacji nie można cofnąć. Spowoduje to trwałe usunięcie dokumentu z naszych serwerów.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Usuń</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex flex-col flex-1 pb-12 md:pb-0">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            {displayData && (
              <NewInvoice
                initialData={displayData}
                ref={formRef}
                onSave={handleUpdate}
                hideHeader={true}
                showFormActions={false}
                bankAccounts={bankAccounts}
                items={items}
                onItemsChange={handleItemsChange}
              />
            )}
          </div>
          {id && (
            <div className="mt-6">
              <ContractsForInvoice invoiceId={id} />
            </div>
          )}
        </div>

        <div className="hidden md:block sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <InvoiceFormActions
            onSubmit={() => formRef.current?.handleSubmit(handleUpdate)()}
            isLoading={isSaving}
            isEditing={true} // Always editing in this component
            // NIE przekazuj onSubmit, bo obsługuje to NewInvoice
            transactionType={invoice.transactionType as any}
          />
        </div>

      </div>

    </div>
  );
};

export default EditInvoice;
