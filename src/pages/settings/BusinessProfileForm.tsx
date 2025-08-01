import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { BusinessProfile } from "@/types";
import { saveBusinessProfile, getBusinessProfiles, checkTaxIdExists } from "@/integrations/supabase/repositories/businessProfileRepository";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PkdSelector from "@/components/inputs/PkdSelector";
import { getBankAccountsForProfile, addBankAccount, deleteBankAccount } from '@/integrations/supabase/repositories/bankAccountRepository';
import BankAccountCard from '@/components/bank/BankAccountCard';
import { BankAccount } from '@/types/bank';
import { BankAccountEditDialog } from '@/components/bank/BankAccountEditDialog';

const formSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  taxId: z.string().min(10, "NIP musi mieć 10 znaków").max(10),
  address: z.string().min(1, "Adres jest wymagany"),
  postalCode: z.string().min(1, "Kod pocztowy jest wymagany"),
  city: z.string().min(1, "Miasto jest wymagane"),
  regon: z.string().optional(),
  email: z.string().email("Niepoprawny format email").optional().or(z.literal("")),
  phone: z.string().optional(),
  isDefault: z.boolean().default(false),
  entityType: z.enum(["dzialalnosc", "sp_zoo", "sa"]).default("dzialalnosc"),
  taxType: z.enum(["skala", "liniowy", "ryczalt", "karta"]).default("skala"),
  pkdCodes: z.array(z.string()).optional(),
  is_vat_exempt: z.boolean().optional().default(false),
  vat_exemption_reason: z.string().optional().or(z.literal("")),
});

interface BusinessProfileFormProps {
  initialData?: BusinessProfile;
  onSuccess?: () => void;
}

const BusinessProfileForm = ({
  initialData,
  onSuccess,
}: BusinessProfileFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEditing = !!initialData?.id;
  const isMobile = useIsMobile();

  // Stan i obsługa kont bankowych
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = React.useState(false);
  const [showAdd, setShowAdd] = React.useState(false);
  const [newAccount, setNewAccount] = React.useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    currency: 'PLN',
    type: 'main',
    balance: 0,
  });

  React.useEffect(() => {
    if (initialData?.id) {
      setLoadingAccounts(true);
      getBankAccountsForProfile(initialData.id)
        .then(setBankAccounts)
        .finally(() => setLoadingAccounts(false));
    }
  }, [initialData?.id]);

  const handleAddAccount = async (data: BankAccount) => {
    if (!initialData?.id) return;
    try {
      const acc = await addBankAccount({
        ...data,
        businessProfileId: initialData.id,
        connectedAt: new Date().toISOString(),
      });
      setBankAccounts((prev) => [...prev, acc]);
      toast.success('Dodano konto bankowe');
    } catch (e) {
      toast.error('Błąd dodawania konta');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await deleteBankAccount(id);
      setBankAccounts((prev) => prev.filter(acc => acc.id !== id));
      toast.success('Usunięto konto bankowe');
    } catch (e) {
      toast.error('Błąd usuwania konta');
    }
  };

  const handleSetDefaultAccount = async (id: string) => {
    try {
      await supabase.rpc("set_default_bank_account", {
        business_profile_id: initialData?.id,
        bank_account_id: id,
      });
      setBankAccounts((prev) => prev.map(acc => ({ ...acc, isDefault: acc.id === id })));
      toast.success('Ustawiono domyślne konto bankowe');
    } catch (e) {
      toast.error('Błąd ustawiania domyślnego konta');
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      taxId: initialData?.taxId || "",
      address: initialData?.address || "",
      postalCode: initialData?.postalCode || "",
      city: initialData?.city || "",
      regon: initialData?.regon || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      isDefault: initialData?.isDefault || false,
      entityType: initialData?.entityType || "dzialalnosc",
      taxType: (initialData as any)?.taxType || "skala",
      pkdCodes: (initialData as any)?.pkdCodes || [],
      is_vat_exempt: initialData?.is_vat_exempt || false,
      vat_exemption_reason: initialData?.vat_exemption_reason || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Ensure all required fields are present
      if (!user?.id) {
        toast.error("Brak informacji o użytkowniku. Zaloguj się ponownie.");
        return;
      }

      // Check if profile with same NIP already exists (when creating)
      if (!isEditing) {
        const existingProfiles = await getBusinessProfiles(user.id);
        if (existingProfiles.some(p => p.taxId === values.taxId)) {
          toast.error("Profil z podanym NIP już istnieje");
          return;
        }
      }

      const profile: BusinessProfile = {
        id: initialData?.id || "", // Will be generated by DB if empty
        name: values.name,         // Required field from form
        taxId: values.taxId,       // Required field from form
        address: values.address,   // Required field from form
        postalCode: values.postalCode, // Required field from form
        city: values.city,         // Required field from form
        regon: values.regon,       // Optional field
        email: values.email || "", // Optional field
        phone: values.phone || "", // Optional field
        isDefault: values.isDefault,
        entityType: values.entityType || "dzialalnosc",
        tax_type: (values as any).taxType,
        pkdCodes: values.pkdCodes || [],
        logo: initialData?.logo || "", // Preserve existing logo if any
        user_id: user.id, // Enforce RLS: always include user_id
        is_vat_exempt: values.is_vat_exempt || false,
        vat_exemption_reason: values.is_vat_exempt ? values.vat_exemption_reason || null : null,
      };

      // Global duplicate NIP check (other users)
      const taxDup = await checkTaxIdExists(values.taxId, user.id);
      if (taxDup.exists) {
        toast.error(`NIP jest już przypisany do firmy "${taxDup.ownerName}". Skontaktuj się z właścicielem lub napisz na support@twojadomena.pl.`);
        return;
      }

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

      // Duplicate NIP handling – only relevant when creating a new profile
      const errMsg = (error as any)?.message ? (error as any).message : String(error);
      if (!isEditing && errMsg.toLowerCase().includes("nip") && errMsg.toLowerCase().includes("już")) {
        const nip = form.getValues("taxId");

        // Spróbuj pobrać więcej danych o właścicielu tego NIP-u
        try {
          const { data: ownerData } = await supabase.rpc("find_user_by_tax_id", {
            tax_id_param: nip,
          });

          let ownerName = "inny użytkownik";
          let ownerEmail: string | null = null;

          if (ownerData && ownerData.length > 0) {
            const rec: any = ownerData[0];
            ownerName = rec.business_name || ownerName;

            // Spróbuj dociągnąć e-mail z tabeli profiles (jeśli istnieje)
            if (rec.user_id) {
              const { data: profileInfo } = await supabase
                .from("profiles")
                .select("email")
                .eq("user_id", rec.user_id)
                .maybeSingle();
              ownerEmail = (profileInfo as any)?.email || null;
            }
          }

          if (ownerEmail) {
            toast.error(
              `NIP jest już przypisany do firmy \"${ownerName}\". Możesz skontaktować się z właścicielem: ${ownerEmail}`
            );
          } else {
            toast.error(
              `NIP jest już przypisany do firmy \"${ownerName}\". Jeśli potrzebujesz dostępu, napisz na support@twojadomena.pl.`
            );
          }
        } catch (e) {
          // Jeśli coś pójdzie nie tak, pokaż ogólny komunikat
          toast.error(
            "NIP jest już przypisany innej firmie. Jeśli uważasz to za błąd, skontaktuj się z nami: support@twojadomena.pl"
          );
        }
      } else {
        toast.error("Wystąpił błąd podczas zapisywania profilu");
      }
    }
  };

  
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 pb-10 max-w-full mx-auto"
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
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input placeholder="1234567890" maxLength={10} {...field} />
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
                        toast.info("Pobieranie danych...");

                        let found = false;

                        const today = new Date().toISOString().slice(0, 10);
                        const res = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`);

                        if (res.ok) {
                          const data = await res.json();
                          if (data.result && data.result.subject) {
                            const subject = data.result.subject;
                            const name = subject.name || "";
                            const address = subject.workingAddress || subject.residenceAddress || "";

                            if (name && address) {
                              form.setValue("name", name);
                              form.setValue("address", address);
                              const match = address.match(/(\d{2}-\d{3})\s+(.+)/);
                              if (match) {
                                form.setValue("postalCode", match[1]);
                                form.setValue("city", match[2]);
                              }
                              toast.success("Dane firmy pobrane z GUS");
                              found = true;
                            }
                          }
                        }

                        // Fallback 2: MojePaństwo KRS
                        if (!found) {
                          try {
                            const mpRes = await fetch(`https://api-v3.mojepanstwo.pl/dane/krs_podmioty.json?conditions%5Bpubliczny_nip%5D=${nip}&limit=1`);
                            if (mpRes.ok) {
                              const mpJson: any = await mpRes.json();
                              const mpItem = mpJson?.data?.[0]?.data || mpJson?.Dataobject?.[0]?.data || mpJson?.items?.[0]?.data;
                              if (mpItem) {
                                const name = mpItem.nazwa || mpItem.name || "";
                                const address = mpItem.adres || mpItem.siedziba || mpItem.working_address || mpItem.residence_address || "";
                                if (name && address) {
                                  form.setValue("name", name);
                                  form.setValue("address", address);
                                  const match = address.match(/(\d{2}-\d{3})\s+(.+)/);
                                  if (match) {
                                    form.setValue("postalCode", match[1]);
                                    form.setValue("city", match[2]);
                                  }
                                  toast.success("Dane firmy pobrane z KRS (MojePaństwo)");
                                  found = true;
                                }
                              }
                            }
                          } catch (e) {
                            console.warn("MojePaństwo API error", e);
                          }
                        }

                        // Fallback 3: Internal DB
                        if (!found) {
                          const { data: bpData, error: bpError } = await supabase.rpc("find_user_by_tax_id", { tax_id_param: nip });
                          if (bpError) {
                            console.error("RPC error find_user_by_tax_id:", bpError);
                          }
                          if (bpData && bpData.length > 0) {
                            const bp: any = bpData[0];
                            const name = bp.business_name || bp.name || "";
                            const address = bp.address || "";

                            if (name) {
                              form.setValue("name", name);
                            }
                            if (address) {
                              form.setValue("address", address);
                            }
                            if (bp.postal_code) {
                              form.setValue("postalCode", bp.postal_code);
                            }
                            if (bp.city) {
                              form.setValue("city", bp.city);
                            }

                            if (name || address) {
                              toast.success("Dane firmy pobrane z bazy");
                              found = true;
                            }
                          }
                        }

                        if (!found) {
                          toast.error("Nie znaleziono firmy dla podanego NIP");
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

          <section className="mt-8">
            <h3 className="font-semibold mb-2">Konta bankowe</h3>
            <div className="flex flex-col gap-2">
              {bankAccounts.map((acc) => (
                <BankAccountCard
                  key={acc.id}
                  account={acc}
                  selected={false}
                  onSelect={() => handleSetDefaultAccount(acc.id)}
                  onDisconnect={() => handleDeleteAccount(acc.id)}
                />
              ))}
              <BankAccountEditDialog
                trigger={<Button variant="outline">Dodaj konto</Button>}
                onSave={async (data) => {
                  await handleAddAccount(data);
                  setShowAdd(false);
                }}
              />
            </div>
            {/* Backwards compatibility: stare pole bankAccount */}
            {initialData?.bankAccount && (
              <div className="mt-4 p-3 bg-muted rounded text-xs text-muted-foreground">
                <div className="font-semibold mb-1">Konto archiwalne (tylko do podglądu):</div>
                <div>{initialData.bankAccount}</div>
              </div>
            )}
          </section>

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

          <FormField
            control={form.control}
            name="entityType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Forma prawna</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz formę prawną" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="dzialalnosc">Działalność gospodarcza</SelectItem>
                    <SelectItem value="sp_zoo">Spółka z o.o.</SelectItem>
                    <SelectItem value="sa">Spółka akcyjna (S.A.)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="taxType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma opodatkowania</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz formę opodatkowania" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="skala">Skala podatkowa</SelectItem>
                      <SelectItem value="liniowy">Podatek liniowy 19%</SelectItem>
                      <SelectItem value="ryczalt">Ryczałt od przychodów ewidencjonowanych</SelectItem>
                      <SelectItem value="karta">Karta podatkowa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="pkdCodes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kody PKD działalności</FormLabel>
                <PkdSelector
                  selected={field.value || []}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* VAT zwolnienie */}
        <div className="mt-6">
          <FormField
            control={form.control}
            name="is_vat_exempt"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Firma jest zwolniona z VAT</FormLabel>
                </div>
              </FormItem>
            )}
          />
          {form.watch("is_vat_exempt") && (
            <FormField
              control={form.control}
              name="vat_exemption_reason"
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormLabel>Powód zwolnienia z VAT</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz powód zwolnienia" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="113_1">Zwolnienie podmiotowe (art. 113 ust. 1)</SelectItem>
                      <SelectItem value="43_1">Zwolnienie przedmiotowe (art. 43 ust. 1)</SelectItem>
                      <SelectItem value="41_4">Eksport towarów (art. 41 ust. 4)</SelectItem>
                      <SelectItem value="42">Wewnątrzwspólnotowa dostawa towarów (art. 42)</SelectItem>
                      <SelectItem value="28b">Usługi zagraniczne (art. 28b)</SelectItem>
                      <SelectItem value="17">Odwrotne obciążenie (art. 17)</SelectItem>
                      <SelectItem value="other">Inna podstawa prawna</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        
        <div
      className="fixed bottom-0 left-0 w-full z-[100] bg-background border-t p-3 py-4 mb-[13px] flex justify-end space-x-2 pointer-events-auto sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:pt-4 sm:mb-0"
      style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.04)', marginBottom: 0, paddingBottom: 12 }}
    >
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/settings")}
            className={isMobile ? 'w-full' : ''}
          >
            Anuluj
          </Button>
          <Button type="submit" className={isMobile ? 'w-full' : ''}>
            {isEditing ? "Aktualizuj" : "Utwórz"} profil
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BusinessProfileForm;
