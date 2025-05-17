
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Invoice, InvoiceType, InvoiceItem, PaymentMethod } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { CustomerSelector } from "@/components/invoices/selectors/CustomerSelector";
import { BusinessProfileSelector } from "@/components/invoices/selectors/BusinessProfileSelector";
import { ProductSelector } from "@/components/invoices/selectors/ProductSelector";
import { InvoiceItemsTable } from "@/components/invoices/InvoiceItemsTable";
import { calculateInvoiceTotals, generateInvoiceNumber } from "@/lib/invoice-utils";
import { saveInvoice } from "@/integrations/supabase/repositories/invoiceRepository";

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

  const handleAddProduct = (newItem: InvoiceItem) => {
    setItems(prevItems => [...prevItems, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<InvoiceItem>) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

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
  
  const isReceipt = documentType === InvoiceType.RECEIPT;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">
            {initialData ? "Edytuj dokument" : `Nowy ${getDocumentTitle().toLowerCase()}`}
          </h1>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Basic Invoice Info Card */}
            <Card className="md:col-span-1">
              <CardHeader className="py-4">
                <CardTitle className="text-lg">{getDocumentTitle()} - dane podstawowe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numer dokumentu</FormLabel>
                      <FormControl>
                        <Input placeholder="np. FV/2023/05/001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data wystawienia</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="sellDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data sprzedaży</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Termin płatności</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metoda płatności</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz metodę płatności" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="transfer">Przelew</SelectItem>
                          <SelectItem value="cash">Gotówka</SelectItem>
                          <SelectItem value="card">Karta</SelectItem>
                          <SelectItem value="other">Inna</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uwagi</FormLabel>
                      <FormControl>
                        <Input placeholder="Opcjonalne uwagi do dokumentu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            {/* Parties Card */}
            <Card className="md:col-span-1">
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Kontrahenci</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <FormLabel>Profil biznesowy (sprzedawca)</FormLabel>
                  <BusinessProfileSelector
                    value={businessProfileId}
                    onChange={(id, name) => {
                      setBusinessProfileId(id);
                      setBusinessName(name || "");
                    }}
                  />
                </div>
                
                <div>
                  <FormLabel>Klient (nabywca)</FormLabel>
                  <CustomerSelector
                    value={customerId}
                    onChange={(id, name) => {
                      setCustomerId(id);
                      setCustomerName(name || "");
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Products Section */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Pozycje dokumentu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProductSelector 
                onAddProduct={handleAddProduct} 
                documentType={documentType}
              />
              
              <div className="mt-4">
                <InvoiceItemsTable
                  items={items}
                  onRemoveItem={handleRemoveItem}
                  onUpdateItem={handleUpdateItem}
                  documentType={documentType}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              type="button"
              onClick={() => navigate("/income")}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Zapisywanie..." : initialData ? "Zapisz zmiany" : "Utwórz dokument"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewInvoice;
