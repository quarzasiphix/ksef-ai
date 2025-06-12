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
import { Customer } from "@/types";
import { saveCustomer } from "@/integrations/supabase/repositories/customerRepository";
import { useAuth } from "@/context/AuthContext";

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

const OnboardingCustomerForm = ({ onSuccess, initialData }: OnboardingCustomerFormProps) => {
  const { user } = useAuth();
  const isEditing = !!initialData?.id;

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
      onSuccess(savedCustomer);
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Wystąpił błąd podczas zapisywania klienta");
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 max-w-lg mx-auto mt-6 border border-blue-100 dark:border-blue-900">
      <h2 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-300">
        Dodaj swojego pierwszego klienta
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="taxId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIP</FormLabel>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <FormControl>
                    <Input placeholder="NIP" maxLength={10} {...field} />
                  </FormControl>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    style={{ minWidth: 60, padding: '0 10px' }}
                    onClick={async () => {
                      const nip = form.getValues("taxId");
                      if (!nip || nip.length !== 10) {
                        toast.error("Podaj poprawny NIP (10 cyfr)");
                        return;
                      }
                      try {
                        const today = new Date().toISOString().slice(0, 10);
                        const res = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`);
                        if (!res.ok) {
                          const errorData = await res.json();
                          const errorMessage = errorData.error ? errorData.error.message : `Błąd HTTP: ${res.status} ${res.statusText}`;
                          toast.error(`Błąd pobierania danych: ${errorMessage}`);
                          return;
                        }
                        const data = await res.json();
                        if (data.result && data.result.subject) {
                          const subject = data.result.subject;
                          form.setValue("name", subject.name || "");
                          form.setValue("address", subject.workingAddress || subject.residenceAddress || "");
                          // Try to extract postal code and city from address
                          if (subject.workingAddress || subject.residenceAddress) {
                            const addr = subject.workingAddress || subject.residenceAddress;
                            const match = addr.match(/(\d{2}-\d{3})\s+(.+)/);
                            if (match) {
                              form.setValue("postalCode", match[1]);
                              form.setValue("city", match[2]);
                            }
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
                  <Input placeholder="Adres" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod pocztowy</FormLabel>
                  <FormControl>
                    <Input placeholder="Kod pocztowy" {...field} />
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
                    <Input placeholder="Miasto" {...field} />
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
                  <Input placeholder="Email" {...field} />
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
                  <Input placeholder="Telefon" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end pt-4">
            <Button type="submit" className="w-full">
              {isEditing ? "Aktualizuj klienta" : "Dodaj klienta"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default OnboardingCustomerForm; 