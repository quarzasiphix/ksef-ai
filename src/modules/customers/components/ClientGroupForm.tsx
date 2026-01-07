import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { ClientGroup, ClientGroupType, CLIENT_GROUP_TYPE_LABELS } from "../types/clientGroup";

const formSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  description: z.string().optional(),
  type: z.enum(["administration", "direct_client", "country", "portfolio", "other"]),
  invoice_prefix: z.string().min(2, "Prefiks musi mieć min. 2 znaki").max(10, "Prefiks może mieć max. 10 znaków").optional().or(z.literal("")),
  default_payment_terms: z.number().min(0).max(365),
  default_notes: z.string().optional(),
});

interface ClientGroupFormProps {
  initialData?: ClientGroup;
  onSubmit: (data: z.infer<typeof formSchema>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ClientGroupForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ClientGroupFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      type: initialData?.type || "administration",
      invoice_prefix: initialData?.invoice_prefix || "",
      default_payment_terms: initialData?.default_payment_terms || 14,
      default_notes: initialData?.default_notes || "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa grupy *</FormLabel>
              <FormControl>
                <Input placeholder="np. Domikom, TOP-BUD, Niemcy" {...field} />
              </FormControl>
              <FormDescription>
                Nazwa administracji, klienta lub regionu
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typ grupy *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz typ" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(CLIENT_GROUP_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Typ określa sposób organizacji klientów
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="invoice_prefix"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prefiks faktur</FormLabel>
              <FormControl>
                <Input 
                  placeholder="np. DOM, TOP, DE, NL" 
                  {...field}
                  className="uppercase"
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormDescription>
                Prefiks dla numeracji faktur (np. DOM/2026/01/0001)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opis</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Dodatkowe informacje o grupie..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="default_payment_terms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domyślny termin płatności (dni)</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                Domyślny termin płatności dla faktur w tej grupie
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="default_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domyślne uwagi do faktur</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Uwagi, które będą automatycznie dodawane do faktur..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Anuluj
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Zapisywanie..." : initialData ? "Zapisz zmiany" : "Utwórz grupę"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
