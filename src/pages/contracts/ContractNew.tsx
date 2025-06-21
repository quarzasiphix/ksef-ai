import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BusinessProfileSelector } from "@/components/invoices/selectors/BusinessProfileSelector";
import { CustomerSelector } from "@/components/invoices/selectors/CustomerSelector";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveContract, getContract } from "@/integrations/supabase/repositories/contractRepository";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { Contract } from "@/types";
import InvoicesForContract from "@/components/contracts/InvoicesForContract";
import InvoicesPicker from "@/components/contracts/InvoicesPicker";
import { addLink as addContractLink } from "@/integrations/supabase/repositories/contractInvoiceLinkRepository";

const formSchema = z.object({
  number: z.string().min(1, "Numer jest wymagany"),
  issueDate: z.string().min(1, "Data wystawienia jest wymagana"),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  subject: z.string().optional(),
  content: z.string().optional(),
  businessProfileId: z.string().min(1, "Wybierz profil"),
  customerId: z.string().min(1, "Wybierz kontrahenta"),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

const ContractNew: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: contractId } = useParams<{ id?: string }>();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: "",
      issueDate: new Date().toISOString().substring(0, 10),
      validFrom: "",
      validTo: "",
      subject: "",
      content: "",
      businessProfileId: "",
      customerId: "",
      isActive: true,
    },
  });

  // Load existing contract if editing
  useEffect(() => {
    if (!contractId) return;
    const load = async () => {
      try {
        const existing = await getContract(contractId);
        if (existing) {
          form.reset({
            number: existing.number || "",
            issueDate: existing.issueDate || new Date().toISOString().substring(0, 10),
            validFrom: existing.validFrom || "",
            validTo: existing.validTo || "",
            subject: existing.subject || "",
            content: existing.content || "",
            businessProfileId: existing.businessProfileId || "",
            customerId: existing.customerId || "",
            isActive: existing.isActive ?? true,
          });
        }
      } catch (err) {
        toast.error("Nie udało się załadować umowy");
      }
    };
    load();
  }, [contractId]);

  // linking invoices before save
  const [invoicesToLink, setInvoicesToLink] = React.useState<string[]>([]);
  const addInvoice = (id: string) => setInvoicesToLink((prev) => [...prev, id]);
  const removeInvoice = (id: string) => setInvoicesToLink((prev) => prev.filter((i) => i !== id));

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!user?.id) throw new Error("Brak użytkownika");
      const payload: Partial<Contract> & { user_id: string } = {
        user_id: user.id,
        businessProfileId: data.businessProfileId,
        customerId: data.customerId,
        number: data.number,
        issueDate: data.issueDate,
        validFrom: data.validFrom || undefined,
        validTo: data.validTo || undefined,
        subject: data.subject,
        content: data.content,
        isActive: data.isActive,
      };
      if (contractId) {
        // update
        (payload as any).id = contractId;
      }
      const saved = await saveContract(payload);
      // create links if any
      if (!contractId && invoicesToLink.length) {
        await Promise.all(invoicesToLink.map((invId) => addContractLink(user.id, saved.id, invId)));
      }
      return saved;
    },
    onSuccess: (saved) => {
      toast.success("Umowa została zapisana");
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
      }
      navigate(`/contracts/${saved.id}`);
    },
    onError: () => toast.error("Nie udało się zapisać umowy"),
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <div className="flex justify-center p-4">
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{contractId ? "Edytuj umowę" : "Nowa umowa"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Numer umowy</label>
                <Input {...form.register("number")}/>
                {form.formState.errors.number && <p className="text-red-500 text-xs mt-1">{form.formState.errors.number.message}</p>}
              </div>
              <div>
                <label className="block text-sm mb-1">Data wystawienia</label>
                <Input type="date" {...form.register("issueDate")}/>
              </div>
              <div>
                <label className="block text-sm mb-1">Obowiązuje od</label>
                <Input type="date" {...form.register("validFrom")}/>
              </div>
              <div>
                <label className="block text-sm mb-1">Obowiązuje do</label>
                <Input type="date" {...form.register("validTo")}/>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Temat</label>
              <Input {...form.register("subject")}/>
            </div>
            <div>
              <label className="block text-sm mb-1">Treść / opis</label>
              <Textarea rows={4} {...form.register("content")}/>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Profil biznesowy</label>
                <BusinessProfileSelector
                  value={form.watch("businessProfileId")}
                  onChange={(id) => form.setValue("businessProfileId", id)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Kontrahent</label>
                <CustomerSelector
                  value={form.watch("customerId")}
                  onChange={(id) => form.setValue("customerId", id)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch("isActive")}
                onCheckedChange={(val) => form.setValue("isActive", !!val)}
              />
              <span>Aktywna</span>
            </div>

            {/* Invoices linking (create mode) */}
            {!contractId && (
              <div className="space-y-2">
                <h3 className="font-semibold">Powiąż faktury</h3>
                {invoicesToLink.map((inv) => (
                  <div key={inv} className="flex items-center gap-2 text-sm">
                    <span>{inv}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeInvoice(inv)}>×</Button>
                  </div>
                ))}
                <InvoicesPicker selected={invoicesToLink} onAdd={addInvoice} />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Zapisywanie..." : "Zapisz"}
              </Button>
            </div>
          </CardContent>
        </Card>
        {contractId && (
          <InvoicesForContract contractId={contractId} />
        )}
      </form>
    </div>
  );
};

export default ContractNew;
