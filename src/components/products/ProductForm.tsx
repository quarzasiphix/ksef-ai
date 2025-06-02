
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Product } from "@/types";
import { saveProduct } from "@/integrations/supabase/repositories/productRepository";
import { toast } from "sonner";
import { useAuth } from "@/App";

const productSchema = z.object({
  name: z.string().min(1, "Nazwa produktu jest wymagana"),
  unitPrice: z.number().min(0, "Cena musi być większa lub równa 0"),
  vatRate: z.number().min(-1, "Stawka VAT musi być poprawna"),
  unit: z.string().min(1, "Jednostka jest wymagana"),
  product_type: z.enum(['income', 'expense'], {
    required_error: "Typ produktu jest wymagany",
  }),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
}

const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      unitPrice: initialData?.unitPrice || 0,
      vatRate: initialData?.vatRate || 23,
      unit: initialData?.unit || "szt.",
      product_type: initialData?.product_type || "income",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        unitPrice: initialData.unitPrice,
        vatRate: initialData.vatRate,
        unit: initialData.unit,
        product_type: initialData.product_type,
      });
    }
  }, [initialData, form]);

  const onSubmit = async (data: ProductFormData) => {
    if (!user?.id) {
      toast.error("Musisz być zalogowany");
      return;
    }

    setIsLoading(true);
    try {
      const productData: Product = {
        id: initialData?.id || "",
        name: data.name,
        unitPrice: data.unitPrice,
        vatRate: data.vatRate,
        unit: data.unit,
        user_id: user.id,
        product_type: data.product_type,
      };

      const savedProduct = await saveProduct(productData);
      toast.success(
        initialData ? "Produkt został zaktualizowany" : "Produkt został utworzony"
      );
      onSuccess(savedProduct);
      onClose();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Wystąpił błąd podczas zapisywania produktu");
    } finally {
      setIsLoading(false);
    }
  };

  const vatOptions = [
    { value: 23, label: "23%" },
    { value: 8, label: "8%" },
    { value: 5, label: "5%" },
    { value: 0, label: "0%" },
    { value: -1, label: "Zwolniony (zw)" },
  ];

  const unitOptions = [
    "szt.",
    "godz.",
    "kg",
    "l",
    "m",
    "m²",
    "m³",
    "usługa",
    "komplet",
    "opakowanie",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edytuj produkt" : "Nowy produkt"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Edytuj szczegóły produktu"
              : "Dodaj nowy produkt do swojego katalogu"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="product_type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Typ produktu</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="income" id="income" />
                        <Label htmlFor="income" className="cursor-pointer">
                          Sprzedaż (przychody)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="expense" id="expense" />
                        <Label htmlFor="expense" className="cursor-pointer">
                          Wydatki (koszty)
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa produktu</FormLabel>
                  <FormControl>
                    <Input placeholder="Nazwa produktu/usługi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena netto</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz VAT" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vatOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz jednostkę" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {unitOptions.map((unit) => (
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Zapisywanie..." : initialData ? "Zaktualizuj" : "Dodaj"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductForm;
