
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Invoice, InvoiceType, PaymentMethod } from "@/types";
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

// Create a basic invoice form schema
const invoiceFormSchema = z.object({
  number: z.string().min(1, "Numer dokumentu jest wymagany"),
  customerName: z.string().min(1, "Nazwa klienta jest wymagana"),
  issueDate: z.string(),
  dueDate: z.string(),
  sellDate: z.string(),
  paymentMethod: z.string().min(1, "Metoda płatności jest wymagana"),
  totalNetValue: z.coerce.number().nonnegative("Kwota musi być dodatnia lub zero"),
  totalVatValue: z.coerce.number().nonnegative("Kwota VAT musi być dodatnia lub zero").optional().default(0),
  totalGrossValue: z.coerce.number().positive("Kwota brutto musi być większa od zera"),
  comments: z.string().optional()
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
  const today = new Date().toISOString().split('T')[0];

  // Setup form with default values
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      number: initialData?.number || "",
      customerName: initialData?.customerName || "",
      issueDate: initialData?.issueDate || today,
      sellDate: initialData?.sellDate || today,
      dueDate: initialData?.dueDate || today,
      paymentMethod: initialData?.paymentMethod || "transfer",
      totalNetValue: initialData?.totalNetValue || 0,
      totalVatValue: initialData?.totalVatValue || 0,
      totalGrossValue: initialData?.totalGrossValue || 0,
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
  function onSubmit(data: InvoiceFormValues) {
    console.log("Form data", data);
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
      
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-lg">{getDocumentTitle()} - dane podstawowe</CardTitle>
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
                  name="totalNetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kwota netto</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {!isReceipt && (
                  <FormField
                    control={form.control}
                    name="totalVatValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kwota VAT</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="totalGrossValue"
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
                
                <div className={isReceipt ? "col-span-2" : ""}>
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
                </div>
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
