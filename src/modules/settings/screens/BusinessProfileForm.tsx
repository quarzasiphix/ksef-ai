import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { BusinessProfile } from "@/shared/types";
import { saveBusinessProfile, getBusinessProfiles, checkTaxIdExists } from "@/modules/settings/data/businessProfileRepository";
import { initializeFoundationalDecisions } from '@/modules/spolka/data/decisionsRepository';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import PkdSelector from "@/components/inputs/PkdSelector";

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
  // Spółka z o.o. specific fields
  share_capital: z.number().optional(),
  krs_number: z.string().optional(),
  court_registry: z.string().optional(),
  establishment_date: z.string().optional(),
  headquarters_address: z.string().optional(),
  headquarters_postal_code: z.string().optional(),
  headquarters_city: z.string().optional(),
  pkd_main: z.string().optional(),
});

interface BusinessProfileFormProps {
  initialData?: BusinessProfile;
  onSuccess?: () => void;
  onCancel?: () => void;
  onComplete?: (profileId: string) => void;
  lockedEntityType?: "dzialalnosc" | "sp_zoo" | "sa";
}

const BusinessProfileForm = ({
  initialData,
  onSuccess,
  onCancel,
  onComplete,
  lockedEntityType,
}: BusinessProfileFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEditing = !!initialData?.id;
  const isMobile = useIsMobile();
  const isWizardJdg = lockedEntityType === "dzialalnosc" && !isEditing;

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
      entityType: lockedEntityType || initialData?.entityType || "dzialalnosc",
      taxType: (initialData as any)?.taxType || "skala",
      pkdCodes: (initialData as any)?.pkdCodes || [],
      is_vat_exempt: initialData?.is_vat_exempt || false,
      vat_exemption_reason: initialData?.vat_exemption_reason || "",
      share_capital: initialData?.share_capital || undefined,
      krs_number: initialData?.krs_number || "",
      court_registry: initialData?.court_registry || "",
      establishment_date: initialData?.establishment_date || "",
      headquarters_address: initialData?.headquarters_address || "",
      headquarters_postal_code: initialData?.headquarters_postal_code || "",
      headquarters_city: initialData?.headquarters_city || "",
      pkd_main: initialData?.pkd_main || "",
    },
  });

  useEffect(() => {
    if (lockedEntityType) {
      form.setValue("entityType", lockedEntityType);
    }
  }, [lockedEntityType, form]);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    navigate("/settings");
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('onSubmit called with values:', values);
    try {
      // Ensure all required fields are present
      if (!user?.id) {
        toast.error("Brak informacji o użytkowniku. Zaloguj się ponownie.");
        return;
      }

      // Check if profile with same NIP already exists (when creating)
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
        vat_threshold_pln: initialData?.vat_threshold_pln ?? 200000,
        vat_threshold_year: initialData?.vat_threshold_year ?? new Date().getFullYear(),
        // Spółka z o.o. specific fields
        share_capital: values.share_capital,
        krs_number: values.krs_number,
        court_registry: values.court_registry,
        establishment_date: values.establishment_date,
        headquarters_address: values.headquarters_address,
        headquarters_postal_code: values.headquarters_postal_code,
        headquarters_city: values.headquarters_city,
        pkd_main: values.pkd_main,
      };

      console.log('Saving business profile with VAT exemption:', {
        is_vat_exempt: profile.is_vat_exempt,
        vat_exemption_reason: profile.vat_exemption_reason,
        vat_threshold_pln: profile.vat_threshold_pln,
        vat_threshold_year: profile.vat_threshold_year
      });

      // Global duplicate NIP check (other users)
      const taxDup = await checkTaxIdExists(values.taxId, user.id, initialData?.id);
      if (taxDup.exists) {
        toast.error(`NIP jest już przypisany do firmy "${taxDup.ownerName}". Skontaktuj się z właścicielem lub napisz na support@twojadomena.pl.`);
        return;
      }

      const savedProfile = await saveBusinessProfile(profile);
      const savedId = (savedProfile as any)?.id || profile.id;

      if (!isEditing && savedProfile.entityType === 'sp_zoo' && savedId) {
        try {
          await initializeFoundationalDecisions(savedId);
        } catch (initError) {
          console.error('Error initializing foundational decisions:', initError);
          toast.error('Nie udało się zainicjować decyzji bazowych dla spółki. Spróbuj ponownie później.');
        }
      }
      console.log('Profile saved successfully:', savedProfile);
      toast.success(
        isEditing ? "Profil zaktualizowany" : "Profil utworzony"
      );

      if (onComplete && savedId) {
        onComplete(savedId);
        return;
      }

      if (onSuccess) {
        onSuccess();
        return;
      }

      navigate("/settings");
    } catch (error) {
      console.error("Error saving business profile:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));

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

  
  const onError = (errors: any) => {
    console.error('Form validation errors:', errors);
    toast.error('Formularz zawiera błędy. Sprawdź wszystkie pola.');
  };

  return (
    <div className={isWizardJdg ? "mx-auto w-full max-w-3xl px-4 py-10" : ""}>
      {isWizardJdg ? (
        <Card className="mb-6">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Utwórz JDG</CardTitle>
            <CardDescription>
              Uzupełnij dane firmy. Na podstawie tych informacji skonfigurujemy księgowość, dokumenty i domyślne ustawienia.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
            <div className="rounded-lg border bg-background p-3">
              <div className="font-medium text-foreground">Dane podstawowe</div>
              <div>Nazwa, NIP, adres</div>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <div className="font-medium text-foreground">Podatki</div>
              <div>Forma opodatkowania i VAT</div>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <div className="font-medium text-foreground">PKD</div>
              <div>Ułatwia kategoryzację i dokumenty</div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className={isWizardJdg ? "rounded-2xl border bg-card p-6 md:p-8" : ""}>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onError)}
            className={isWizardJdg ? "space-y-8 pb-10" : "space-y-6 pb-10 max-w-full mx-auto"}
          >
        <div className={isWizardJdg ? "space-y-6" : "space-y-4"}>
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

          {!lockedEntityType && (
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
          )}

          {/* Only show tax type for JDG (działalność gospodarcza) */}
          {form.watch("entityType") === "dzialalnosc" && (
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
          )}

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

          {/* Spółka z o.o. specific fields */}
          {(form.watch("entityType") === "sp_zoo" || form.watch("entityType") === "sa") && (
            <div className="space-y-4 mt-6 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
              <h3 className="font-semibold text-lg">Dane Spółki</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="share_capital"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kapitał zakładowy (PLN)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="5000.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="krs_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numer KRS</FormLabel>
                      <FormControl>
                        <Input placeholder="0000123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="court_registry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sąd rejestrowy</FormLabel>
                      <FormControl>
                        <Input placeholder="Sąd Rejonowy dla m.st. Warszawy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="establishment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data założenia</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <h4 className="font-semibold mt-4">Siedziba spółki</h4>
              <FormField
                control={form.control}
                name="headquarters_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres siedziby</FormLabel>
                    <FormControl>
                      <Input placeholder="ul. Przykładowa 1/2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="headquarters_postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kod pocztowy siedziby</FormLabel>
                      <FormControl>
                        <Input placeholder="00-000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="headquarters_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Miasto siedziby</FormLabel>
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
                name="pkd_main"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Główny kod PKD</FormLabel>
                    <FormControl>
                      <Input placeholder="62.01.Z" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
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
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                    defaultValue={field.value || undefined}
                  >
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
            onClick={handleCancel}
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
    </div>
    </div>
  );
};

export default BusinessProfileForm;
