import React, { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BusinessProfileSelector } from "@/components/invoices/selectors/BusinessProfileSelector";
import { CustomerSelector } from "@/components/invoices/selectors/CustomerSelector";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveContract, getContract } from "@/integrations/supabase/repositories/contractRepository";
import { getFolderTree } from "@/integrations/supabase/repositories/documentsRepository";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { Contract } from "@/types";
import InvoicesForContract from "@/components/contracts/InvoicesForContract";
import InvoicesPicker from "@/components/contracts/InvoicesPicker";
import { addLink as addContractLink } from "@/integrations/supabase/repositories/contractInvoiceLinkRepository";
import type { FolderTreeNode } from "@/types/documents";
import { CONTRACT_TYPE_LABELS } from "@/types/documents";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import DecisionPicker from "@/components/decisions/DecisionPicker";

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

  documentCategory: z.enum(["transactional_payout", "transactional_payin", "informational"]).default("informational"),
  contractType: z.enum([
    "general",
    "employment",
    "service",
    "lease",
    "purchase",
    "board_member",
    "management_board",
    "supervisory_board",
    "nda",
    "partnership",
    "other",
  ]).default("general"),
  folderId: z.string().optional(),
  decisionId: z.string().min(1, "Decyzja autoryzująca jest wymagana"),
});

type FormValues = z.infer<typeof formSchema>;

const ContractNew: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: contractId } = useParams<{ id?: string }>();
  const { selectedProfileId } = useBusinessProfile();
  const [folderTree, setFolderTree] = React.useState<FolderTreeNode[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: "",
      issueDate: new Date().toISOString().substring(0, 10),
      validFrom: "",
      validTo: "",
      subject: "",
      content: "",
      businessProfileId: selectedProfileId || "",
      customerId: "",
      isActive: true,

      documentCategory: "informational",
      contractType: "general",
      folderId: "",
      decisionId: "",
    },
  });

  const businessProfileId = useWatch({ control: form.control, name: "businessProfileId" });
  const documentCategory = useWatch({ control: form.control, name: "documentCategory" });
  const contractType = useWatch({ control: form.control, name: "contractType" });
  const folderId = useWatch({ control: form.control, name: "folderId" });
  const decisionId = useWatch({ control: form.control, name: "decisionId" });

  const NO_FOLDER_VALUE = "__no_folder__";

  const flatFolders = useMemo(() => {
    const out: FolderTreeNode[] = [];
    const walk = (nodes: FolderTreeNode[]) => {
      nodes.forEach((n) => {
        out.push(n);
        if (n.children && n.children.length) {
          walk(n.children as any);
        }
      });
    };
    walk(folderTree);
    return out;
  }, [folderTree]);

  // Load folder tree for chosen profile (folder structure)
  useEffect(() => {
    if (!businessProfileId) {
      setFolderTree([]);
      return;
    }

    let mounted = true;
    getFolderTree(businessProfileId)
      .then((tree) => {
        if (mounted) setFolderTree(tree as any);
      })
      .catch(() => {
        if (mounted) setFolderTree([]);
      });

    return () => {
      mounted = false;
    };
  }, [businessProfileId]);

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

            documentCategory: (existing.document_category as any) || "informational",
            contractType: (existing.contract_type as any) || "general",
            folderId: existing.folder_id || "",
          });
        }
      } catch (err) {
        toast.error("Nie udało się załadować umowy");
      }
    };
    load();
  }, [contractId]);

  // Keep transactional flag aligned with chosen category
  useEffect(() => {
    if (documentCategory === "transactional_payout" || documentCategory === "transactional_payin") {
      // Hint: transactional contracts usually map to service/lease etc.
      if (contractType === "general") {
        form.setValue("contractType", "service");
      }
    }
  }, [contractType, documentCategory, form]);

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

        document_category: data.documentCategory,
        is_transactional: data.documentCategory === 'transactional_payout' || data.documentCategory === 'transactional_payin',
        contract_type: data.contractType,
        folder_id: data.folderId ? data.folderId : undefined,
        decision_id: data.decisionId,
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
    <div className="flex justify-center p-4 md:p-8">
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{contractId ? "Edytuj umowę" : "Nowa umowa"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-1">Kategoria</label>
                <Select
                  value={form.watch("documentCategory")}
                  onValueChange={(v) => form.setValue("documentCategory", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz kategorię" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transactional_payout">Wydatek (transakcyjna)</SelectItem>
                    <SelectItem value="transactional_payin">Przychód (transakcyjna)</SelectItem>
                    <SelectItem value="informational">Informacyjny</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  To decyduje gdzie dokument pokaże się w Dokumentach i Księgowości.
                </p>
              </div>
              <div>
                <label className="block text-sm mb-1">Typ dokumentu</label>
                <Select
                  value={form.watch("contractType")}
                  onValueChange={(v) => form.setValue("contractType", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz typ" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTRACT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm mb-1">Folder (opcjonalnie)</label>
                <Select
                  value={folderId ? folderId : NO_FOLDER_VALUE}
                  onValueChange={(v) => form.setValue("folderId", v === NO_FOLDER_VALUE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Brak folderu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_FOLDER_VALUE}>Brak folderu</SelectItem>
                    {flatFolders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.path || f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Foldery są zgodne z układem „Dokumenty spółki”.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
                         <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/contracts/resolutions')}
              >
                Uchwały
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // best-effort: try to pick a financial folder if present
                  const fin = flatFolders.find((f) => f.folder_type === 'financial_reports');
                  if (fin) {
                    form.setValue('folderId', fin.id);
                    form.setValue('documentCategory', 'informational');
                    toast.info('Wybrano folder sprawozdań finansowych');
                  } else {
                    toast.info('Nie znaleziono folderu sprawozdań – utwórz go w Dokumentach');
                  }
                }}
              >
                Rozdział finansowy
              </Button>
            </div>

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

            {/* Decision Picker - Required for all contracts */}
            {businessProfileId && (
              <DecisionPicker
                businessProfileId={businessProfileId}
                value={decisionId}
                onValueChange={(id) => form.setValue("decisionId", id)}
                categoryFilter="b2b_contracts"
                required
              />
            )}
            {form.formState.errors.decisionId && (
              <p className="text-red-500 text-sm">{form.formState.errors.decisionId.message}</p>
            )}

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
