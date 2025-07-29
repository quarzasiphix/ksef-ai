import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Invoice, Company, InvoiceItem } from "@/types";
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
} from "@/components/ui/alert-dialog";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { InvoiceFormActions } from "@/components/invoices/forms/InvoiceFormActions";
import { Switch } from '@/components/ui/switch';
import { calculateItemValues } from "@/lib/invoice-utils";
import { PaymentMethodDb } from "@/types/common";
import ContractsForInvoice from "@/components/invoices/ContractsForInvoice";
import { getBankAccountsForProfile } from "@/integrations/supabase/repositories/bankAccountRepository";
import { BankAccount } from "@/types/bank";

const EditInvoice = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const { state } = useSidebar();
  const { user } = useAuth();
  const formRef = useRef<{ handleSubmit: (onValid: (data: any) => Promise<void>) => (e?: React.BaseSyntheticEvent) => Promise<void> }>(null);

  // Handle items change
  const handleItemsChange = (newItems: InvoiceItem[]) => {
    setItems([...newItems]);
  };

  // If id is 'new', render the NewInvoice form directly
  if (id === 'new') {
    return <NewInvoice />;
  }

  useEffect(() => {
    if (!id || id === 'new') {
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
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

  // Pobieranie kont bankowych
  // Update items state when invoice data is loaded
  useEffect(() => {
    if (invoice?.items) {
      setItems([...invoice.items]);
    }
  }, [invoice]);

  // Load bank accounts for the business profile
  useEffect(() => {
    if (invoice?.businessProfileId) {
      getBankAccountsForProfile(invoice.businessProfileId)
        .then(setBankAccounts)
        .catch(console.error);
    }
  }, [invoice?.businessProfileId]);

  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = async (formData: any): Promise<void> => {
    console.log('=== EditInvoice handleUpdate - started ===');
    console.log('Invoice ID:', id);
    console.log('Form data:', JSON.stringify(formData, null, 2));
    console.log('Current items state:', JSON.stringify(items, null, 2));
    
    if (!id || id === 'new' || !invoice) {
      const errorMsg = `Invalid parameters - id: ${id}, invoice: ${!!invoice}`;
      console.error('handleUpdate aborted:', errorMsg);
      toast.error('Nieprawidłowe parametry faktury');
      return;
    }

    if (!user) {
      console.error('User not authenticated');
      toast.error("Nie jesteś zalogowany");
      return;
    }
    
    console.log('User ID:', user.id);
    
    try {
      setIsSaving(true);
      
      // Create the update payload using the correct field names from your Invoice type
      const updateData = {
        ...formData,
        id,
        user_id: user.id,
        items: [...items], // Create a new array reference
        // Map fields according to your Invoice type
        businessProfileId: formData.businessProfileId || invoice.businessProfileId,
        customerId: formData.customerId || invoice.customerId,
        type: formData.type || invoice.type,
        transactionType: formData.transactionType || invoice.transactionType,
        number: formData.number || invoice.number,
        issueDate: formData.issueDate || invoice.issueDate,
        sellDate: formData.sellDate || invoice.sellDate || new Date().toISOString().split('T')[0],
        dueDate: formData.dueDate || invoice.dueDate,
        paymentMethod: formData.paymentMethod || invoice.paymentMethod || 'transfer',
        status: formData.status || invoice.status || 'draft',
        comments: formData.comments || invoice.comments || '',
        totalNetValue: formData.totalNetValue || invoice.totalNetValue || 0,
        totalVatValue: formData.totalVatValue || invoice.totalVatValue || 0,
        totalGrossValue: formData.totalGrossValue || invoice.totalGrossValue || 0,
        currency: formData.currency || invoice.currency || 'PLN',
        exchangeRate: formData.exchangeRate || invoice.exchangeRate || 1,
        vat: formData.vat !== undefined ? formData.vat : (invoice.vat ?? true),
        vatExemptionReason: formData.vatExemptionReason || invoice.vatExemptionReason || null,
      };
      
      console.log('=== Attempting to save invoice ===');
      console.log('Update data being sent:', JSON.stringify(updateData, null, 2));
      
      try {
        console.log('Calling saveInvoice...');
        const savedInvoice = await saveInvoice(updateData);
        console.log('=== Invoice saved successfully ===');
        console.log('Saved invoice response:', savedInvoice);
        
        toast.success('Faktura została zapisana');
        
        console.log('Invalidating queries...');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['invoices'] }),
          queryClient.invalidateQueries({ queryKey: ['invoice', id] })
        ]);
        console.log('Queries invalidated');
        
        const redirectPath = invoice.transactionType === 'income' 
          ? `/income/${id}`
          : `/expense/${id}`;
          
        console.log('Navigating to:', redirectPath);
        navigate(redirectPath);
      } catch (error) {
        console.error('Error in saveInvoice call:', error);
        throw error; // This will be caught by the outer catch
      }
      
    } catch (error) {
      console.error('=== Error in handleUpdate ===');
      console.error('Error details:', error);
      
      // Check for specific error types
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      toast.error(`Wystąpił błąd podczas zapisywania faktury: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    } finally {
      console.log('=== Cleanup ===');
      setIsSaving(false);
      console.log('isSaving set to false');
    }
  };

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

  // Add handler to mark as unpaid
  const handleMarkAsUnpaid = async () => {
    if (!invoice || !id) return;
    try {
      // Prepare the payload for saveInvoice, matching its expected type
      const updatedData = {
        ...invoice,
        isPaid: false,
        id: id,
        user_id: user?.id,
        // Remove fields that are not part of the saveInvoice input type if needed
        // Ensure all required fields are present
        businessProfileId: invoice.businessProfileId || '',
        customerId: invoice.customerId || '',
        items: invoice.items as InvoiceItem[],
        number: invoice.number,
        type: invoice.type,
        transactionType: invoice.transactionType,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        sellDate: invoice.sellDate,
        paymentMethod: invoice.paymentMethod || PaymentMethodDb.TRANSFER,
        status: invoice.status,
        comments: invoice.comments || '',
        totalNetValue: invoice.totalNetValue || 0,
        totalVatValue: invoice.totalVatValue || 0,
        totalGrossValue: invoice.totalGrossValue || 0,
        vat: invoice.vat,
        vatExemptionReason: invoice.vatExemptionReason,
      };
      await saveInvoice(updatedData as any);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      toast.success('Faktura oznaczona jako nieopłacona');
      setInvoice((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          isPaid: false,
          totalGrossValue: typeof prev.totalGrossValue === 'number' ? prev.totalGrossValue : 0,
          totalNetValue: typeof prev.totalNetValue === 'number' ? prev.totalNetValue : 0,
          totalVatValue: typeof prev.totalVatValue === 'number' ? prev.totalVatValue : 0,
        };
      });
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
        const base = {
          ...item,
          id: item.id || `${invoice.id}-item-${idx}`,
          description: item.description || item.name || '',
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          vatRate: item.vatRate !== undefined ? Number(item.vatRate) : 23,
          unit: item.unit || 'szt.',
          name: item.name || item.description || '',
          productId: item.productId || undefined,
        } as any;
        // Re-calculate monetary values so VAT -1 yields 0
        const withVals = calculateItemValues(base);
        return withVals;
      }),
      buyer: isExpense ? invoice.seller : invoice.buyer,
      seller: isExpense ? invoice.buyer : invoice.seller,
      fakturaBezVAT: !(invoice as any).vat, // Explicitly cast to any to access vat
      vatExemptionReason: invoice.vatExemptionReason, // Pass through the VAT exemption reason
      paymentMethod: invoice.paymentMethod || PaymentMethodDb.TRANSFER,
    };
    console.log('Final transformed data:', transformed);
    return transformed;
  };

  // Use the NewInvoice component in edit mode with transformed data
  const transformedData = transformInvoiceData(invoice);
  console.log('Passing to NewInvoice:', transformedData);
  
  // Define handleFormSubmit here, outside the return statement
  // const handleFormSubmit = (e: React.FormEvent) => {
  //   // Prevent the default form submission behavior
  //   e.preventDefault();
  //   console.log('EditInvoice handleFormSubmit - started');
  //   if (newInvoiceRef.current?.handleSubmit) {
  //     console.log('EditInvoice handleFormSubmit - calling NewInvoice handleSubmit');
  //     // Call the handleSubmit method from the NewInvoice component
  //     newInvoiceRef.current.handleSubmit(handleUpdate)(e);
  //   }
  // };

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
          {/* Show mark as unpaid if invoice is paid */}
          {invoice.isPaid && (
            <Button variant="secondary" size="sm" onClick={handleMarkAsUnpaid}>
              Oznacz jako nieopłacona
            </Button>
          )}
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
      </div>

      {/* Main Content Area - Flex column to contain form and static bar */}
      {/* Added pb-12 to make space for the static bottom bar on non-mobile */}
      <div className="flex flex-col flex-1 pb-12 md:pb-0"> {/* Adjust padding for non-mobile when actions are static */}
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            <NewInvoice 
              initialData={invoice} 
              ref={formRef} 
              onSave={handleUpdate}
              bankAccounts={bankAccounts}
              items={items}
              onItemsChange={handleItemsChange}
            />
          </div>

          {/* Contracts linked to this invoice */}
          {id && (
            <div className="mt-6">
              <ContractsForInvoice invoiceId={id} />
            </div>
          )}
        </div>

        {/* Sticky form actions - Rendered by EditInvoice */}
        {/* Use the isLoading state from EditInvoice */} 
        {/* Fixed on mobile, static at the bottom on non-mobile */}
        <div className={cn(
            "fixed bottom-0 left-0 right-0 w-full border-t bg-background z-[9999]", // Fixed at bottom on mobile with high z-index
            "md:static md:bottom-auto md:left-auto md:right-auto md:w-auto md:border-t-0 md:bg-transparent md:z-auto", // Static on medium+ screens
            "py-2 lg:py-2", // Padding
            "container" // Apply container padding
          )}>
          <InvoiceFormActions
            isLoading={loading} // Use loading state from EditInvoice
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
