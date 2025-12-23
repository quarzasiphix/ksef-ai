
import React, { useEffect, useImperativeHandle, forwardRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Customer } from "@/shared/types";
import { saveCustomer } from "@/modules/customers/data/customerRepository";
import { useAuth } from "@/shared/context/AuthContext";
import { Search } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  taxId: z.string().min(10, "NIP jest wymagany i musi mieć 10 cyfr").max(10, "NIP musi mieć 10 cyfr"),
  address: z.string().min(1, "Adres jest wymagany"),
  postalCode: z.string().min(1, "Kod pocztowy jest wymagany"),
  city: z.string().min(1, "Miasto jest wymagane"),
  email: z.string().email("Niepoprawny format email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

interface OnboardingCustomerFormProps {
  onSuccess: (customer: Customer) => void;
  initialData?: Customer;
}

export interface OnboardingCustomerFormHandle {
  submit: () => void;
}

const OnboardingCustomerForm = forwardRef<OnboardingCustomerFormHandle, OnboardingCustomerFormProps>(({ onSuccess, initialData }, ref) => {
  const { user } = useAuth();
  const isEditing = !!initialData?.id;

  const draftKey = useMemo(() => {
    if (isEditing) return null;
    if (!user?.id) return null;
    return `onboarding:customer:${user.id}`;
  }, [isEditing, user?.id]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      taxId: initialData?.taxId || "",
      address: initialData?.address || "",
      postalCode: initialData?.postalCode || "",
      city: initialData?.city || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
    },
  });

  useEffect(() => {
    if (!draftKey) return;
    if (typeof window === 'undefined') return;

    const rawDraft = localStorage.getItem(draftKey);
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft) as Partial<z.infer<typeof formSchema>>;
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!user?.id) {
        toast.error("Brak informacji o użytkowniku. Zaloguj się ponownie.");
        return;
      }
      const customer: Customer = {
        id: initialData?.id || "",
        name: values.name,
        taxId: values.taxId || "",
        address: values.address,
        postalCode: values.postalCode,
        city: values.city,
        email: values.email || "",
        phone: values.phone || "",
        user_id: user.id,
        customerType: 'odbiorca',
      };
      const savedCustomer = await saveCustomer(customer);
      toast.success(isEditing ? "Klient zaktualizowany" : "Klient utworzony");
      if (draftKey && typeof window !== 'undefined') {
        localStorage.removeItem(draftKey);
      }
      onSuccess(savedCustomer);
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Wystąpił błąd podczas zapisywania klienta");
    }
  };

  useImperativeHandle(ref, () => ({
    submit: form.handleSubmit(onSubmit),
  }));

  return (
    <div className="w-full max-w-lg mx-auto bg-transparent">
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="taxId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIP</FormLabel>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Input placeholder="1234567890" maxLength={10} {...field} />
                  </FormControl>
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-3"
                    onClick={async () => {
                      const nip = form.getValues("taxId");
                      if (!nip || nip.length !== 10) {
                        toast.error("Podaj poprawny NIP (10 cyfr)");
                        return;
                      }
                      try {
                        toast.info("Pobieranie danych z GUS...");
                        const today = new Date().toISOString().slice(0, 10);
                        const res = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`);
                        if (!res.ok) {
                          const errorData = await res.json();
                          const errorMessage = errorData.message || `Błąd HTTP: ${res.status}`;
                          toast.error(`Błąd pobierania danych: ${errorMessage}`);
                          return;
                        }
                        const data = await res.json();
                        if (data.result && data.result.subject) {
                          const subject = data.result.subject;
                          form.setValue("name", subject.name || "");
                          const fullAddress = subject.workingAddress || subject.residenceAddress || "";
                          form.setValue("address", fullAddress);
                          const match = fullAddress.match(/(.*),\s*(\d{2}-\d{3})\s+(.+)/);
                          if (match) {
                              form.setValue("address", match[1]);
                              form.setValue("postalCode", match[2]);
                              form.setValue("city", match[3]);
                          }
                          toast.success("Dane firmy pobrane z GUS");
                        } else {
                          toast.error("Nie znaleziono firmy dla podanego NIP");
                        }
                      } catch (err: any) {
                        toast.error(`Błąd podczas pobierania danych z API: ${err.message || err}`);
                      }
                    }}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Szukaj
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nazwa</FormLabel>
                <FormControl>
                  <Input placeholder="Nazwa firmy lub imię i nazwisko" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adres</FormLabel>
                <FormControl>
                  <Textarea placeholder="ul. Przykładowa 1&#x0a;00-001 Warszawa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod pocztowy</FormLabel>
                  <FormControl>
                    <Input placeholder="00-000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Miasto</FormLabel>
                  <FormControl>
                    <Input placeholder="Warszawa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (opcjonalnie)</FormLabel>
                <FormControl>
                  <Input placeholder="kontakt@firma.pl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon (opcjonalnie)</FormLabel>
                <FormControl>
                  <Input placeholder="+48 123 456 789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
});

export default OnboardingCustomerForm;
