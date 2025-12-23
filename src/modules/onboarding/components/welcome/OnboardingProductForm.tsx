
import React, { useEffect, useMemo, useState, useImperativeHandle, forwardRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Product } from "@/shared/types";
import { saveProduct } from "@/integrations/supabase/repositories/productRepository";
import { toast } from "sonner";
import { useAuth } from "@/shared/context/AuthContext";

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

interface OnboardingProductFormProps {
  onSuccess: (product: Product) => void;
  initialData?: Product;
}

export interface OnboardingProductFormHandle {
  submit: () => void;
}

const OnboardingProductForm = forwardRef<OnboardingProductFormHandle, OnboardingProductFormProps>(({
  initialData,
  onSuccess,
}, ref) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const draftKey = useMemo(() => {
    if (initialData?.id) return null;
    if (!user?.id) return null;
    return `onboarding:product:${user.id}`;
  }, [initialData?.id, user?.id]);

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
    if (!draftKey) return;
    if (typeof window === 'undefined') return;

    const rawDraft = localStorage.getItem(draftKey);
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft) as Partial<ProductFormData>;
        form.reset({
          ...form.getValues(),
          ...draft,
        });
      } catch {
      }
    }

    const subscription = form.watch((values) => {
      localStorage.setItem(draftKey, JSON.stringify(values));
    });

    return () => subscription.unsubscribe();
  }, [draftKey, form]);

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
        track_stock: initialData?.track_stock || false,
        stock: initialData?.stock || 0,
      };
      const savedProduct = await saveProduct(productData);
      toast.success(initialData ? "Produkt został zaktualizowany" : "Produkt został utworzony");
      if (draftKey && typeof window !== 'undefined') {
        localStorage.removeItem(draftKey);
      }
      onSuccess(savedProduct);
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Wystąpił błąd podczas zapisywania produktu");
    } finally {
      setIsLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    submit: form.handleSubmit(onSubmit),
  }));

  const vatOptions = [
    { value: 23, label: "23%" },
    { value: 8, label: "8%" },
    { value: 5, label: "5%" },
    { value: 0, label: "0%" },
    { value: -1, label: "Zwolniony (zw)" },
  ];

  const unitOptions = [
    "szt.", "godz.", "kg", "l", "m", "m²", "m³", "usługa", "komplet", "opakowanie",
  ];

  return (
    <div className="w-full max-w-lg mx-auto bg-transparent">
      <Form {...form}>
        <form className="space-y-4">
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
                    className="grid grid-cols-2 gap-4"
                  >
                    <Label htmlFor="income" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer transition-all">
                      <RadioGroupItem value="income" id="income" className="sr-only" />
                      Sprzedaż (przychody)
                    </Label>
                    <Label htmlFor="expense" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer transition-all">
                      <RadioGroupItem value="expense" id="expense" className="sr-only" />
                      Wydatki (koszty)
                    </Label>
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
                  <Input placeholder="np. Konsultacja marketingowa" {...field} />
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
        </form>
      </Form>
    </div>
  );
});

export default OnboardingProductForm;
