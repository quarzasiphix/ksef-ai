import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Project } from "@/shared/types";
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

const projectFormSchema = z.object({
  name: z.string().min(1, "Nazwa projektu jest wymagana"),
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
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  businessProfileId: string;
  onSave: (data: ProjectFormValues) => Promise<void>;
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

export const ProjectDialog: React.FC<ProjectDialogProps> = ({
  open,
  onOpenChange,
  project,
  businessProfileId,
  onSave,
}) => {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      code: "",
      color: "#3b82f6",
      budget_limit: undefined,
      is_default: false,
    },
  });

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || "",
        code: project.code || "",
        color: project.color || "#3b82f6",
        budget_limit: project.budget_limit,
        is_default: project.is_default || false,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        code: "",
        color: "#3b82f6",
        budget_limit: undefined,
        is_default: false,
      });
    }
  }, [project, form]);

  const onSubmit = async (data: ProjectFormValues) => {
    await onSave(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {project ? "Edytuj projekt" : "Nowy projekt"}
          </DialogTitle>
          <DialogDescription>
            {project
              ? "Zaktualizuj informacje o projekcie"
              : "Utwórz nowy projekt do organizacji działalności biznesowej"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa projektu *</FormLabel>
                  <FormControl>
                    <Input placeholder="np. SaaS, Transport, Budowa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod projektu</FormLabel>
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
                    Wybierz kolor do wizualnego odróżnienia projektu
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
                    <FormLabel className="text-base">Projekt domyślny</FormLabel>
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
                {project ? "Zapisz zmiany" : "Utwórz projekt"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
