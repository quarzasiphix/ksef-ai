
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Invoice, InvoiceType } from "@/types";
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
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

// Create a basic invoice form schema
const invoiceFormSchema = z.object({
  number: z.string().min(1, "Numer dokumentu jest wymagany"),
  customerName: z.string().min(1, "Nazwa klienta jest wymagana"),
  issueDate: z.string(),
  dueDate: z.string(),
  totalAmount: z.coerce.number().positive("Kwota musi być większa od zera")
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

// We're updating the NewInvoice component to handle document type with a basic form
const NewInvoice: React.FC<{
  initialData?: Invoice;
}> = ({ initialData }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [documentType, setDocumentType] = useState<InvoiceType>(InvoiceType.SALES);
  const [documentSettings, setDocumentSettings] = useState<any[]>([]);

  // Setup form with default values
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      number: initialData?.number || "",
      customerName: initialData?.customerName || "",
      issueDate: initialData?.issueDate || new Date().toISOString().split('T')[0],
      dueDate: initialData?.dueDate || new Date().toISOString().split('T')[0],
      totalAmount: initialData?.totalGrossValue || 0
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
  function onSubmit(data: InvoiceFormValues) {
    toast.success("Dokument zapisany pomyślnie!");
    navigate("/income");
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <ArrowLeft className="h-4 w-4" onClick={() => navigate(-1)} />
          </Button>
          <h1 className="text-2xl font-bold">
            {initialData ? "Edytuj dokument" : `Nowy ${getDocumentTitle().toLowerCase()}`}
          </h1>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{getDocumentTitle()} - dane podstawowe</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
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
                
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nabywca</FormLabel>
                      <FormControl>
                        <Input placeholder="Nazwa nabywcy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
                
                {documentType !== InvoiceType.RECEIPT && (
                  <FormField
                    control={form.control}
                    name="totalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kwota brutto</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => navigate("/income")}
                >
                  Anuluj
                </Button>
                <Button type="submit">
                  {initialData ? "Zapisz zmiany" : "Utwórz dokument"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewInvoice;
