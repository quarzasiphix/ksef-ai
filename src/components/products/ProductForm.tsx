import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product, VatType } from "@/types";
import { saveProduct } from "@/integrations/supabase/repositories/productRepository";
import { useAuth } from "@/App";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ArrowLeft } from "lucide-react";

const VAT_RATES = [
  { label: "23%", value: VatType.RATE_23 },
  { label: "8%", value: VatType.RATE_8 },
  { label: "5%", value: VatType.RATE_5 },
  { label: "0%", value: VatType.RATE_0 },
  { label: "Zwolniony", value: VatType.ZW },
];

const UNITS = ["szt.", "godz.", "usł.", "kg", "m", "m²", "m³", "l", "komplet"];

const formSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  unitPrice: z.coerce.number().min(0, "Cena musi być większa lub równa 0"),
  vatRate: z.coerce.number().refine(val => val === Number(VatType.ZW) || (val >= 0 && val <= 100), {
    message: "Stawka VAT musi być liczbą od 0 do 100 lub -1 dla zwolnionych",
  }),
  unit: z.string().min(1, "Jednostka jest wymagana"),
});

interface ProductFormProps {
  initialData?: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
}

const ProductForm = ({
  initialData,
  isOpen,
  onClose,
  onSuccess,
}: ProductFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!initialData?.id;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      unitPrice: initialData?.unitPrice || 0,
      vatRate: initialData?.vatRate ?? VatType.RATE_23,
      unit: initialData?.unit || "szt.",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Ensure all required fields are present
      if (!user?.id) {
        toast.error("Brak informacji o użytkowniku. Zaloguj się ponownie.");
        return;
      }
      const product: Product = {
        id: initialData?.id || "",
        name: values.name,
        unitPrice: values.unitPrice,
        vatRate: values.vatRate,
        unit: values.unit,
        user_id: user.id, // Enforce RLS: always include user_id
      };

      const savedProduct = await saveProduct(product);
      toast.success(
        isEditing ? "Produkt zaktualizowany" : "Produkt utworzony"
      );
      // Update the products cache instantly
      queryClient.setQueryData(["products"], (old: Product[] = []) => {
        if (isEditing) {
          // Replace the edited product
          return old.map(p => p.id === savedProduct.id ? savedProduct : p);
        } else {
          // Add the new product
          return [...old, savedProduct];
        }
      });
      onSuccess(savedProduct);
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Wystąpił błąd podczas zapisywania produktu");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl p-0 gap-0">
        <div className="flex flex-col h-full">
          <div className="border-b p-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={onClose}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <SheetHeader className="flex-1">
                <SheetTitle className="text-left">
                  {isEditing ? "Edytuj produkt" : "Dodaj nowy produkt"}
                </SheetTitle>
              </SheetHeader>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa</FormLabel>
                      <FormControl>
                        <Input placeholder="Nazwa produktu lub usługi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cena netto</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vatRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stawka VAT</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === 'zw' ? Number(VatType.ZW) : Number(value))}
                          value={field.value === Number(VatType.ZW) ? 'zw' : field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz stawkę VAT" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="23">23%</SelectItem>
                            <SelectItem value="8">8%</SelectItem>
                            <SelectItem value="5">5%</SelectItem>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="zw">Zwolniony</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jednostka</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz jednostkę" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="sticky bottom-0  border-t p-4 mt-auto">
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                      Anuluj
                    </Button>
                    <Button type="submit">
                      {isEditing ? "Aktualizuj" : "Dodaj produkt"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductForm;
