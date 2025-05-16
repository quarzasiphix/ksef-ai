
import React from "react";
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
import { Product } from "@/types";
import { saveProduct } from "@/integrations/supabase/repositories/productRepository";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const VAT_RATES = [
  { label: "23%", value: 23 },
  { label: "8%", value: 8 },
  { label: "5%", value: 5 },
  { label: "0%", value: 0 },
  { label: "Zwolniony", value: -1 },
];

const UNITS = ["szt.", "godz.", "usł.", "kg", "m", "m²", "m³", "l", "komplet"];

const formSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  unitPrice: z.coerce.number().min(0, "Cena musi być większa lub równa 0"),
  vatRate: z.coerce.number(),
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
  const isEditing = !!initialData?.id;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      unitPrice: initialData?.unitPrice || 0,
      vatRate: initialData?.vatRate ?? 23,
      unit: initialData?.unit || "szt.",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const product: Product = {
        ...values,
        id: initialData?.id,
      };

      const savedProduct = await saveProduct(product);
      toast.success(
        isEditing ? "Produkt zaktualizowany" : "Produkt utworzony"
      );
      onSuccess(savedProduct);
      onClose();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Wystąpił błąd podczas zapisywania produktu");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edytuj produkt" : "Dodaj nowy produkt"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-2"
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
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz stawkę VAT" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VAT_RATES.map((rate) => (
                          <SelectItem
                            key={rate.value}
                            value={rate.value.toString()}
                          >
                            {rate.label}
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
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit">
                {isEditing ? "Aktualizuj" : "Dodaj produkt"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductForm;
