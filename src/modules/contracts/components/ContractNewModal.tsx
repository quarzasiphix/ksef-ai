/**
 * Contract New Modal - Blueprint-aware contract creation
 * 
 * Converts ContractNew page into a modal dialog that:
 * - Opens from DocumentsHub based on section context
 * - Shows only blueprints valid for current section
 * - Uses blueprint system for placement and validation
 */

import React, { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { BusinessProfileSelector } from "@/modules/invoices/components/selectors/BusinessProfileSelector";
import { CustomerSelector } from "@/modules/invoices/components/selectors/CustomerSelector";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveContract } from "@/modules/contracts/data/contractRepository";
import { useAuth } from "@/shared/hooks/useAuth";
import { toast } from "sonner";
import { Contract } from "@/shared/types";
import { CONTRACT_TYPE_LABELS } from "@/modules/contracts/documents";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import DecisionPicker from "@/modules/decisions/components/DecisionPicker";
import { logCreationEvent, shouldLogEvents } from "@/shared/utils/eventLogging";
import { getBlueprintsForSection } from "@/modules/documents/types/blueprints";
import type { DocumentSection } from "@/modules/documents/types/blueprints";

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
  decisionId: z.string().optional().default(""),
  blueprintId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ContractNewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: DocumentSection;
  businessProfileId?: string;
  onSuccess?: (contract: Contract) => void;
}

export const ContractNewModal: React.FC<ContractNewModalProps> = ({
  open,
  onOpenChange,
  section,
  businessProfileId: propBusinessProfileId,
  onSuccess,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { selectedProfileId, profiles } = useBusinessProfile();

  // Get blueprints for current section
  const availableBlueprints = useMemo(() => {
    return getBlueprintsForSection(section);
  }, [section]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: "",
      issueDate: new Date().toISOString().substring(0, 10),
      validFrom: "",
      validTo: "",
      subject: "",
      content: "",
      businessProfileId: propBusinessProfileId || selectedProfileId || "",
      customerId: "",
      isActive: true,
      documentCategory: "informational",
      contractType: "general",
      decisionId: "",
      blueprintId: "",
    },
  });

  const businessProfileId = useWatch({ control: form.control, name: "businessProfileId" });
  const documentCategory = useWatch({ control: form.control, name: "documentCategory" });
  const contractType = useWatch({ control: form.control, name: "contractType" });
  const decisionId = useWatch({ control: form.control, name: "decisionId" });
  const blueprintId = useWatch({ control: form.control, name: "blueprintId" });

  const selectedProfile = profiles?.find((p) => p.id === businessProfileId);
  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

  const selectedBlueprint = useMemo(() => {
    return availableBlueprints.find(bp => bp.id === blueprintId);
  }, [availableBlueprints, blueprintId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open]);

  // Auto-select first blueprint if available
  useEffect(() => {
    if (open && availableBlueprints.length > 0 && !blueprintId) {
      form.setValue('blueprintId', availableBlueprints[0].id);
    }
  }, [open, availableBlueprints, blueprintId]);

  // Keep transactional flag aligned with chosen category
  useEffect(() => {
    if (documentCategory === "transactional_payout" || documentCategory === "transactional_payin") {
      if (contractType === "general") {
        form.setValue("contractType", "service");
      }
    }
  }, [contractType, documentCategory, form]);

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
        decision_id: isSpoolka && data.decisionId ? data.decisionId : undefined,
      };
      return await saveContract(payload);
    },
    onSuccess: async (saved) => {
      // Log event for Spółki
      if (shouldLogEvents(selectedProfile?.entityType)) {
        await logCreationEvent({
          businessProfileId: saved.businessProfileId,
          eventType: 'contract_created',
          entityType: 'contract',
          entityId: saved.id,
          entityReference: saved.number,
          actionSummary: `Utworzono umowę ${saved.number}`,
          decisionId: saved.decision_id,
          changes: {
            subject: saved.subject,
            contract_type: saved.contract_type,
          },
        });
      }
      
      toast.success("Umowa została zapisana");
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      
      onSuccess?.(saved);
      onOpenChange(false);
    },
    onError: () => toast.error("Nie udało się zapisać umowy"),
  });

  const onSubmit = (values: FormValues) => {
    if (isSpoolka && !values.decisionId) {
      form.setError('decisionId', {
        type: 'manual',
        message: 'Decyzja autoryzująca jest wymagana',
      });
      return;
    }
    form.clearErrors('decisionId');
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <DialogHeader>
            <DialogTitle>Nowa umowa</DialogTitle>
            <DialogDescription>
              Tworzysz w sekcji: <strong>{section === 'contracts' ? 'Umowy' : section}</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Blueprint Picker */}
          {availableBlueprints.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Rodzaj dokumentu</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {availableBlueprints.map((blueprint) => (
                  <button
                    key={blueprint.id}
                    type="button"
                    onClick={() => form.setValue('blueprintId', blueprint.id)}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      blueprintId === blueprint.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <h4 className="font-medium">{blueprint.name_pl}</h4>
                    <p className="text-xs text-muted-foreground">{blueprint.description_pl}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Placement Info */}
          {selectedBlueprint && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Zostanie zapisane w:</strong> {section === 'contracts' ? 'Umowy' : section} → {selectedBlueprint.default_view_id}
              </p>
            </div>
          )}

          <div className="space-y-4">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Numer umowy</label>
                <Input {...form.register("number")}/>
                {form.formState.errors.number && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.number.message}</p>
                )}
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

            {/* Decision Picker - only for spółka */}
            {isSpoolka && businessProfileId && (
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractNewModal;
