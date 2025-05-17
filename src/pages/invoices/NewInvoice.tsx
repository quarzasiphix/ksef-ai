
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Invoice, InvoiceType, InvoiceItem, PaymentMethod } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { calculateInvoiceTotals, generateInvoiceNumber } from "@/lib/invoice-utils";
import { saveInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { InvoiceFormHeader } from "@/components/invoices/forms/InvoiceFormHeader";
import { InvoiceBasicInfoForm } from "@/components/invoices/forms/InvoiceBasicInfoForm";
import { InvoicePartiesForm } from "@/components/invoices/forms/InvoicePartiesForm";
import { InvoiceItemsForm } from "@/components/invoices/forms/InvoiceItemsForm";
import { InvoiceFormActions } from "@/components/invoices/forms/InvoiceFormActions";

// Create a basic invoice form schema
const invoiceFormSchema = z.object({
  number: z.string().min(1, "Numer dokumentu jest wymagany"),
  issueDate: z.string(),
  dueDate: z.string(),
  sellDate: z.string(),
  paymentMethod: z.string().min(1, "Metoda płatności jest wymagana"),
  comments: z.string().optional().default("")
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

const NewInvoice: React.FC<{
  initialData?: Invoice;
}> = ({ initialData }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [documentType, setDocumentType] = useState<InvoiceType>(InvoiceType.SALES);
  const [documentSettings, setDocumentSettings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>(initialData?.items || []);
  const [businessProfileId, setBusinessProfileId] = useState<string>(initialData?.businessProfileId || "");
  const [businessName, setBusinessName] = useState<string>(initialData?.businessName || "");
  const [customerId, setCustomerId] = useState<string>(initialData?.customerId || "");
  const [customerName, setCustomerName] = useState<string>(initialData?.customerName || "");
  
  const today = new Date().toISOString().split('T')[0];
  
  // Setup form with default values
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      number: initialData?.number || generateInvoiceNumber(new Date(), 1),
      issueDate: initialData?.issueDate || today,
      sellDate: initialData?.sellDate || today,
      dueDate: initialData?.dueDate || today,
      paymentMethod: initialData?.paymentMethod || PaymentMethod.TRANSFER,
      comments: initialData?.comments || ""
    }
  });

  // Load document type settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("documentTypeSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setDocumentSettings(parsed);
      } catch (e) {
        console.error("Error parsing saved document settings:", e);
      }
    }
  }, []);

  // Set document type from URL parameter or initialData
  useEffect(() => {
    if (initialData) {
      // If we're editing an existing invoice, use its type
      setDocumentType(initialData.type);
    } else {
      // If creating a new invoice, check URL parameter
      const typeFromUrl = searchParams.get("type");
      if (typeFromUrl && Object.values(InvoiceType).includes(typeFromUrl as InvoiceType)) {
        setDocumentType(typeFromUrl as InvoiceType);
      }
    }
  }, [initialData, searchParams]);

  // Check if the selected document type is enabled in settings
  useEffect(() => {
    if (documentSettings.length > 0) {
      const selectedTypeSetting = documentSettings.find(type => type.id === documentType);
      if (selectedTypeSetting && !selectedTypeSetting.enabled) {
        // Redirect to income page if the document type is disabled
        navigate("/income");
      }
    }
  }, [documentType, documentSettings, navigate]);

  // Form submission handler
  const onSubmit = async (data: InvoiceFormValues) => {
    if (!businessProfileId) {
      toast.error("Wybierz profil biznesowy");
      return;
    }
    
    if (!customerId) {
      toast.error("Wybierz klienta");
      return;
    }
    
    if (items.length === 0) {
      toast.error("Dodaj przynajmniej jedną pozycję do dokumentu");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Calculate totals
      const { totalNetValue, totalVatValue, totalGrossValue } = calculateInvoiceTotals(items);
      
      const invoice: Invoice = {
        id: initialData?.id || "",
        number: data.number,
        type: documentType,
        issueDate: data.issueDate,
        sellDate: data.sellDate,
        dueDate: data.dueDate,
        businessProfileId: businessProfileId,
        customerId: customerId,
        items: items,
        paymentMethod: data.paymentMethod as PaymentMethod,
        isPaid: initialData?.isPaid || false,
        comments: data.comments,
        totalNetValue,
        totalVatValue,
        totalGrossValue,
        businessName,
        customerName
      };
      
      const savedInvoice = await saveInvoice(invoice);
      
      toast.success(initialData 
        ? "Dokument został zaktualizowany" 
        : "Dokument został utworzony"
      );
      
      navigate(`/invoices/${savedInvoice.id}`);
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("Wystąpił błąd podczas zapisywania dokumentu");
    } finally {
      setIsLoading(false);
    }
  };

  // Get the document type title
  const getDocumentTitle = () => {
    switch(documentType) {
      case InvoiceType.SALES: return "Faktura VAT";
      case InvoiceType.RECEIPT: return "Rachunek";
      case InvoiceType.PROFORMA: return "Faktura proforma";
      case InvoiceType.CORRECTION: return "Faktura korygująca";
      default: return "Dokument";
    }
  };
  
  const isEditing = !!initialData;
  const documentTitle = getDocumentTitle();

  return (
    <div className="space-y-4">
      <InvoiceFormHeader 
        title={documentTitle} 
        documentType={documentType}
        isEditing={isEditing}
      />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Basic Invoice Info Card */}
            <InvoiceBasicInfoForm 
              form={form} 
              documentTitle={documentTitle} 
            />
            
            {/* Parties Card */}
            <InvoicePartiesForm 
              businessProfileId={businessProfileId}
              customerId={customerId}
              onBusinessProfileChange={(id, name) => {
                setBusinessProfileId(id);
                setBusinessName(name || "");
              }}
              onCustomerChange={(id, name) => {
                setCustomerId(id);
                setCustomerName(name || "");
              }}
            />
          </div>
          
          {/* Products Section */}
          <InvoiceItemsForm 
            items={items}
            documentType={documentType}
            onItemsChange={setItems}
          />
          
          {/* Action Buttons */}
          <InvoiceFormActions 
            isLoading={isLoading}
            isEditing={isEditing}
            onSubmit={form.handleSubmit(onSubmit)}
          />
        </form>
      </Form>
    </div>
  );
};

export default NewInvoice;
