
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { BusinessProfile } from "@/types";
import { saveBusinessProfile } from "@/integrations/supabase/repositories/businessProfileRepository";

const formSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  taxId: z.string().min(10, "NIP musi mieć 10 znaków").max(10),
  address: z.string().min(1, "Adres jest wymagany"),
  postalCode: z.string().min(1, "Kod pocztowy jest wymagany"),
  city: z.string().min(1, "Miasto jest wymagane"),
  regon: z.string().optional(),
  bankAccount: z.string().optional(),
  email: z.string().email("Niepoprawny format email").optional().or(z.literal("")),
  phone: z.string().optional(),
  isDefault: z.boolean().default(false),
});

interface BusinessProfileFormProps {
  initialData?: BusinessProfile;
  onSuccess?: () => void;
}

const BusinessProfileForm = ({
  initialData,
  onSuccess,
}: BusinessProfileFormProps) => {
  const navigate = useNavigate();
  const isEditing = !!initialData?.id;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      taxId: initialData?.taxId || "",
      address: initialData?.address || "",
      postalCode: initialData?.postalCode || "",
      city: initialData?.city || "",
      regon: initialData?.regon || "",
      bankAccount: initialData?.bankAccount || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      isDefault: initialData?.isDefault || false,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const profile: BusinessProfile = {
        ...values,
        id: initialData?.id,
      };

      await saveBusinessProfile(profile);
      toast.success(
        isEditing ? "Profil zaktualizowany" : "Profil utworzony"
      );
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/settings");
      }
    } catch (error) {
      console.error("Error saving business profile:", error);
      toast.error("Wystąpił błąd podczas zapisywania profilu");
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 pb-10 max-w-2xl mx-auto"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa firmy</FormLabel>
                  <FormControl>
                    <Input placeholder="Nazwa firmy" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIP</FormLabel>
                  <FormControl>
                    <Input placeholder="NIP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            name="regon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>REGON (opcjonalnie)</FormLabel>
                <FormControl>
                  <Input placeholder="REGON" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bankAccount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numer konta bankowego (opcjonalnie)</FormLabel>
                <FormControl>
                  <Input placeholder="Numer konta bankowego" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Ustaw jako domyślny profil firmy</FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/settings")}
          >
            Anuluj
          </Button>
          <Button type="submit">
            {isEditing ? "Aktualizuj" : "Utwórz"} profil
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BusinessProfileForm;
