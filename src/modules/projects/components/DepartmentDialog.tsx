import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Department, DepartmentTemplate } from "@/shared/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

const departmentFormSchema = z.object({
  name: z.string().min(1, "Nazwa działu jest wymagana"),
  description: z.string().optional(),
  code: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[A-Z0-9_-]+$/.test(val),
      "Kod może zawierać tylko wielkie litery, cyfry, myślniki i podkreślenia"
    ),
  color: z.string().optional(),
  budget_limit: z.number().optional(),
  is_default: z.boolean().default(false),
  template: z.enum([
    "general",
    "construction",
    "property_admin",
    "marketing",
    "saas",
    "sales",
    "operations",
  ]) as z.ZodType<DepartmentTemplate>,
});

type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

interface DepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department | null;
  businessProfileId: string;
  onSave: (data: DepartmentFormValues) => Promise<void>;
}

const colorOptions = [
  { value: "#3b82f6", label: "Niebieski" },
  { value: "#10b981", label: "Zielony" },
  { value: "#f59e0b", label: "Pomarańczowy" },
  { value: "#ef4444", label: "Czerwony" },
  { value: "#8b5cf6", label: "Fioletowy" },
  { value: "#ec4899", label: "Różowy" },
  { value: "#06b6d4", label: "Cyjan" },
  { value: "#84cc16", label: "Limonkowy" },
];

const templateOptions: { value: DepartmentTemplate; label: string; description: string }[] = [
  { value: "general", label: "Ogólny", description: "Uniwersalny dział bez dodatkowych modułów" },
  { value: "construction", label: "Budownictwo", description: "Zlecenia, kosztorysy, protokoły odbioru" },
  { value: "property_admin", label: "Administracja nieruchomości", description: "Zgłoszenia, inspekcje, zlecenia serwisowe" },
  { value: "marketing", label: "Marketing", description: "Kampanie, wydarzenia, budżety mediowe" },
  { value: "saas", label: "SaaS / Produkt", description: "Subskrypcje, roadmapy, feature work" },
  { value: "sales", label: "Sprzedaż", description: "Leady, umowy, wydarzenia handlowe" },
  { value: "operations", label: "Operacje", description: "Procesy, logistyka, transport" },
];

export const DepartmentDialog: React.FC<DepartmentDialogProps> = ({
  open,
  onOpenChange,
  department,
  businessProfileId,
  onSave,
}) => {
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      code: "",
      color: "#3b82f6",
      budget_limit: undefined,
      is_default: false,
      template: "general",
    },
  });

  useEffect(() => {
    if (department) {
      form.reset({
        name: department.name,
        description: department.description || "",
        code: department.code || "",
        color: department.color || "#3b82f6",
        budget_limit: department.budget_limit,
        is_default: department.is_default || false,
        template: department.template || "general",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        code: "",
        color: "#3b82f6",
        budget_limit: undefined,
        is_default: false,
        template: "general",
      });
    }
  }, [department, form]);

  const onSubmit = async (data: DepartmentFormValues) => {
    await onSave(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {department ? "Edytuj dział" : "Nowy dział"}
          </DialogTitle>
          <DialogDescription>
            {department
              ? "Zaktualizuj informacje o dziale"
              : "Utwórz nowy dział do organizacji działalności biznesowej"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa działu *</FormLabel>
                  <FormControl>
                    <Input placeholder="np. SaaS, Budownictwo, Administracja" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Szablon działu</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz typ działu" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templateOptions.map((template) => (
                        <SelectItem key={template.value} value={template.value}>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{template.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {template.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Określa domyślne moduły i funkcje dostępne w tym dziale
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod działu</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="np. SAAS, TRANSPORT"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Krótki kod do szybkiej identyfikacji (opcjonalny)
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
                      placeholder="Opisz cel i zakres projektu..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kolor</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 flex-wrap">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`w-10 h-10 rounded-md border-2 transition-all ${
                            field.value === color.value
                              ? "border-primary scale-110"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => field.onChange(color.value)}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Wybierz kolor do wizualnego odróżnienia działu
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budget_limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limit budżetu (opcjonalny)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseFloat(e.target.value) : undefined
                        )
                      }
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Maksymalny budżet dla tego projektu w PLN
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Dział domyślny</FormLabel>
                    <FormDescription>
                      Automatycznie wybierany przy tworzeniu nowych dokumentów
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Anuluj
              </Button>
              <Button type="submit">
                {department ? "Zapisz zmiany" : "Utwórz dział"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
