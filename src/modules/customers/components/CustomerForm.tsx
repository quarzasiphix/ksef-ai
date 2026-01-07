import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/shared/ui/form";
import { Customer } from "@/shared/types";
import { saveCustomer } from "@/modules/customers/data/customerRepository";
import { useAuth } from "@/shared/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { Badge } from "@/shared/ui/badge";
import { Switch } from "@/shared/ui/switch";
import { getClientGroups } from "@/modules/customers/data/clientGroupRepository";
import { ClientGroup } from "@/modules/customers/types/clientGroup";

const formSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  taxId: z.string().optional().or(z.literal("")), // NIP is now optional
  address: z.string().min(1, "Adres jest wymagany"),
  postalCode: z.string().min(1, "Kod pocztowy jest wymagany"),
  city: z.string().min(1, "Miasto jest wymagane"),
  email: z.string().email("Niepoprawny format email").optional().or(z.literal("")),
  phone: z.string().optional(),
  customerType: z.enum(['odbiorca', 'sprzedawca', 'both'], { required_error: "Typ klienta jest wymagany" }),
  business_profile_id: z.string().optional(),
  is_shared: z.boolean().default(false),
  client_group_id: z.string().optional().or(z.literal("")),
});

interface CustomerFormProps {
  initialData?: Customer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
  defaultCustomerType?: 'odbiorca' | 'sprzedawca';
  businessProfileId?: string;
}

const CustomerForm = ({
  initialData,
  isOpen,
  onClose,
  onSuccess,
  defaultCustomerType,
  businessProfileId,
}: CustomerFormProps) => {
  const { user } = useAuth();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const isEditing = !!initialData?.id;
  const [isConnectedUser, setIsConnectedUser] = React.useState(false);
  const [connectedUserInfo, setConnectedUserInfo] = React.useState<{
    entityType?: string;
    legalForm?: string;
    ownerEmail?: string;
  } | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [clientGroups, setClientGroups] = React.useState<ClientGroup[]>([]);
  const effectiveProfileId = businessProfileId || initialData?.business_profile_id || selectedProfileId || profiles?.[0]?.id;
  const effectiveProfile = profiles?.find(p => p.id === effectiveProfileId);

  const storageKey = useMemo(() => {
    const userId = user?.id ?? 'anonymous';
    return `customer_form_draft:${userId}:${isEditing ? (initialData?.id ?? 'edit') : 'new'}`;
  }, [user?.id, isEditing, initialData?.id]);

  const defaultValues = useMemo(
    () => ({
      name: initialData?.name || "",
      taxId: initialData?.taxId || "",
      address: initialData?.address || "",
      postalCode: initialData?.postalCode || "",
      city: initialData?.city || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      customerType: initialData?.customerType || defaultCustomerType || 'odbiorca',
      // Always set business_profile_id to current profile unless editing or explicitly shared
      business_profile_id: initialData?.is_shared 
        ? "" 
        : (initialData?.business_profile_id || effectiveProfileId || ""),
      is_shared: initialData?.is_shared ?? false,
      client_group_id: initialData?.client_group_id || "",
    }),
    [
      initialData?.name,
      initialData?.taxId,
      initialData?.address,
      initialData?.postalCode,
      initialData?.city,
      initialData?.email,
      initialData?.phone,
      initialData?.customerType,
      defaultCustomerType,
      initialData?.business_profile_id,
      effectiveProfileId,
      initialData?.is_shared,
      initialData?.client_group_id,
    ]
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Load client groups
  useEffect(() => {
    if (!isOpen || !effectiveProfileId) return;
    
    const loadGroups = async () => {
      try {
        const groups = await getClientGroups(effectiveProfileId);
        setClientGroups(groups);
      } catch (error) {
        console.error("Error loading client groups:", error);
      }
    };
    
    loadGroups();
  }, [isOpen, effectiveProfileId]);

  useEffect(() => {
    if (!isOpen) return;
    if (isEditing) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      form.reset({ ...defaultValues, ...parsed });
    } catch {
      // ignore
    }
  }, [isOpen, isEditing, storageKey, form, defaultValues]);

  useEffect(() => {
    if (!isOpen) return;
    if (isEditing) return;
    const sub = form.watch((values) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(values));
      } catch {
        // ignore
      }
    });
    return () => sub.unsubscribe();
  }, [form, isOpen, isEditing, storageKey]);

  const handleCancel = () => {
    if (!isEditing) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
    onClose();
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Ensure all required fields are present by providing defaults if needed
      if (!user?.id) {
        toast.error("Brak informacji o użytkowniku. Zaloguj się ponownie.");
        return;
      }
      
      // Determine business_profile_id assignment
      // Rule: If is_shared is true, leave business_profile_id as NULL (shared across all profiles)
      // Otherwise, assign to the selected profile (or current profile if none selected)
      const resolvedBusinessProfileId = values.is_shared
        ? null  // Shared customers have no specific business_profile_id
        : (values.business_profile_id || effectiveProfileId || null);

      // Validate that we have a business_profile_id if not shared
      if (!values.is_shared && !resolvedBusinessProfileId) {
        toast.error("Musisz wybrać firmę właścicielską lub zaznaczyć 'Udostępnij we wszystkich firmach'");
        return;
      }

      const customer: Customer = {
        id: initialData?.id || "",  // Will be generated by DB if empty
        name: values.name,          // Required field from form
        taxId: values.taxId || "",  // Optional field
        address: values.address,    // Required field from form
        postalCode: values.postalCode, // Required field from form
        city: values.city,          // Required field from form
        email: values.email || "",  // Optional field
        phone: values.phone || "",  // Optional field
        customerType: values.customerType,
        user_id: user.id, // Enforce RLS: always include user_id
        business_profile_id: resolvedBusinessProfileId || undefined,
        is_shared: values.is_shared ?? false,
      };

      const savedCustomer = await saveCustomer(customer);
      toast.success(
        isEditing ? "Klient zaktualizowany" : "Klient utworzony"
      );

      if (!isEditing) {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
      }

      onSuccess(savedCustomer);
      onClose();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Wystąpił błąd podczas zapisywania klienta");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edytuj klienta" : "Dodaj nowego klienta"}
          </DialogTitle>
          <DialogDescription>
            Uzupełnij szczegóły klienta, aby móc przypisywać go do faktur i dokumentów.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-2"
          >
            <div className="rounded-md border px-4 py-3 bg-muted/40 space-y-2">
              <p className="text-sm text-muted-foreground">
                Ten kontrahent będzie przypisany do firmy:
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {effectiveProfile?.name || "Brak profilu"}
                </Badge>
                {effectiveProfile?.entityType && (
                  <span className="text-xs text-muted-foreground capitalize">
                    {effectiveProfile.entityType.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="business_profile_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Firma właścicielska</FormLabel>
                  <Select
                    value={field.value || effectiveProfileId || ""}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz firmę" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles?.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Wybierz, do której firmy zostanie przypisany ten kontrahent.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_shared"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border px-4 py-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Udostępnij we wszystkich firmach</FormLabel>
                    <FormDescription>
                      Jeśli włączysz, kontrahent będzie dostępny we wszystkich Twoich firmach.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    NIP (opcjonalnie)
                    {isConnectedUser && connectedUserInfo && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                          ✓ Połączony
                        </span>
                        {connectedUserInfo.entityType && (
                          <span className="text-xs text-muted-foreground">
                            ({connectedUserInfo.entityType === 'dzialalnosc' ? 'JDG' : connectedUserInfo.legalForm || 'Spółka'})
                          </span>
                        )}
                      </div>
                    )}
                  </FormLabel>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <FormControl>
                      <Input 
                        placeholder="NIP" 
                        maxLength={10} 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setIsConnectedUser(false);
                          setConnectedUserInfo(null);
                        }}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      style={{ minWidth: 60, padding: '0 10px' }}
                      disabled={isSearching}
                      onClick={async () => {
                        // Prevent multiple simultaneous searches
                        if (isSearching) {
                          console.log('Search already in progress, ignoring click');
                          return;
                        }
                        
                        const nip = form.getValues("taxId");
                        
                        // Validate NIP format
                        if (!nip) {
                          toast.error("Podaj NIP");
                          return;
                        }
                        
                        const cleanNip = nip.replace(/[^0-9]/g, '');
                        if (cleanNip.length !== 10) {
                          toast.error("NIP musi mieć dokładnie 10 cyfr");
                          return;
                        }
                        
                        setIsSearching(true);
                        
                        try {
                          let found = false;

                          // PRIORITY 1: Check internal database FIRST to see if user is connected
                          const { data: bpData, error: bpError } = await supabase.rpc("find_user_by_tax_id", {
                            tax_id_param: cleanNip,
                          });

                          if (!bpError && bpData && bpData.length > 0) {
                            const bp: any = bpData[0];
                            
                            // Fill form with complete data
                            if (bp.business_name) form.setValue("name", bp.business_name);
                            if (bp.full_address) {
                              form.setValue("address", bp.full_address);
                            } else {
                              if (bp.address) form.setValue("address", bp.address);
                            }
                            if (bp.postal_code) form.setValue("postalCode", bp.postal_code);
                            if (bp.city) form.setValue("city", bp.city);
                            if (bp.owner_email) form.setValue("email", bp.owner_email);
                            if (bp.owner_phone) form.setValue("phone", bp.owner_phone);
                            
                            // Set connected user state with entity info
                            setIsConnectedUser(true);
                            setConnectedUserInfo({
                              entityType: bp.entity_type,
                              legalForm: bp.legal_form,
                              ownerEmail: bp.owner_email
                            });
                            
                            toast.success("✅ Użytkownik połączony w systemie - dokumenty trafią do Skrzynki");
                            found = true;
                          }

                          // PRIORITY 2: If not in internal DB, try CEIDG API first (for JDG)
                          if (!found) {
                            try {
                              const ceidgRes = await fetch(
                                `https://dane.biznes.gov.pl/api/ceidg/v2/firmy?nip=${cleanNip}`,
                                {
                                  headers: {
                                    'Accept': 'application/json'
                                  }
                                }
                              );

                              if (ceidgRes.ok) {
                                const ceidgData = await ceidgRes.json();
                                if (ceidgData && ceidgData.firma && ceidgData.firma.length > 0) {
                                  const firma = ceidgData.firma[0];
                                  
                                  // Extract name
                                  const name = firma.nazwa || 
                                    (firma.wlasciciel ? `${firma.wlasciciel.imie || ''} ${firma.wlasciciel.nazwisko || ''}`.trim() : '');
                                  
                                  if (name) form.setValue("name", name);
                                  
                                  // Extract address
                                  if (firma.adres) {
                                    const addr = firma.adres;
                                    const ulica = addr.ulica || '';
                                    const nrDomu = addr.nrDomu || '';
                                    const nrLokalu = addr.nrLokalu ? `/${addr.nrLokalu}` : '';
                                    const fullAddress = `${ulica} ${nrDomu}${nrLokalu}`.trim();
                                    
                                    if (fullAddress) form.setValue("address", fullAddress);
                                    if (addr.kodPocztowy) form.setValue("postalCode", addr.kodPocztowy);
                                    if (addr.miejscowosc) form.setValue("city", addr.miejscowosc);
                                  }
                                  
                                  // Extract contact info
                                  if (firma.email) form.setValue("email", firma.email);
                                  if (firma.telefon) form.setValue("phone", firma.telefon);
                                  
                                  toast.success("Dane firmy pobrane z CEIDG (JDG)");
                                  found = true;
                                }
                              }
                            } catch (ceidgErr) {
                              console.warn("CEIDG API failed:", ceidgErr);
                            }
                          }

                          // PRIORITY 3: If not in CEIDG, try GUS API (Biała Lista VAT)
                          if (!found) {
                            try {
                              const today = new Date().toISOString().slice(0, 10);
                              const gusRes = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${cleanNip}?date=${today}`);

                              if (gusRes.ok) {
                                const gusData = await gusRes.json();
                                if (gusData.result && gusData.result.subject) {
                                  const subject = gusData.result.subject;
                                  
                                  if (subject.name) form.setValue("name", subject.name);
                                  
                                  // Extract address with better parsing
                                  const workAddr = subject.workingAddress || subject.residenceAddress || '';
                                  if (workAddr) {
                                    // Try to parse: "ul. Przykładowa 1, 00-001 Warszawa"
                                    const addressMatch = workAddr.match(/^(.+?),?\s*(\d{2}-\d{3})\s+(.+)$/);
                                    if (addressMatch) {
                                      form.setValue("address", addressMatch[1].trim());
                                      form.setValue("postalCode", addressMatch[2]);
                                      form.setValue("city", addressMatch[3].trim());
                                    } else {
                                      form.setValue("address", workAddr);
                                    }
                                  }
                                  
                                  toast.success("Dane firmy pobrane z GUS (Biała Lista VAT)");
                                  found = true;
                                }
                              }
                            } catch (gusErr) {
                              console.warn("GUS API failed:", gusErr);
                            }
                          }

                          // PRIORITY 4: MojePaństwo KRS API (last resort for spółki)
                          if (!found) {
                            try {
                              const mpRes = await fetch(
                                `https://api-v3.mojepanstwo.pl/dane/krs_podmioty.json?conditions%5Bpubliczny_nip%5D=${cleanNip}&limit=1`
                              );

                              if (mpRes.ok) {
                                const mpJson: any = await mpRes.json();
                                const mpItem =
                                  mpJson?.data?.[0]?.data ||
                                  mpJson?.Dataobject?.[0]?.data ||
                                  mpJson?.items?.[0]?.data;

                                if (mpItem) {
                                  const nazwa = mpItem.nazwa || mpItem.name || '';
                                  if (nazwa) form.setValue("name", nazwa);

                                  // Better address parsing for KRS
                                  const addressField =
                                    mpItem.adres ||
                                    mpItem.siedziba ||
                                    mpItem.working_address ||
                                    mpItem.residence_address ||
                                    '';

                                  if (addressField) {
                                    // Try to parse structured address
                                    const addressMatch = addressField.match(/^(.+?),?\s*(\d{2}-\d{3})\s+(.+)$/);
                                    if (addressMatch) {
                                      form.setValue("address", addressMatch[1].trim());
                                      form.setValue("postalCode", addressMatch[2]);
                                      form.setValue("city", addressMatch[3].trim());
                                    } else {
                                      form.setValue("address", addressField);
                                    }
                                  }

                                  toast.success("Dane firmy pobrane z KRS (Spółka)");
                                  found = true;
                                }
                              }
                            } catch (mpErr) {
                              console.warn("MojePaństwo KRS API failed:", mpErr);
                            }
                          }

                          if (!found) {
                            toast.error("Nie znaleziono firmy dla podanego NIP. Sprawdź poprawność numeru.");
                          }
                        } catch (err: any) {
                          console.error("Error during NIP search:", err);
                          toast.error(`Błąd podczas wyszukiwania: ${err.message || 'Nieznany błąd'}`);
                        } finally {
                          setIsSearching(false);
                        }
                      }}
                    >
                      {isSearching ? 'Szukam...' : 'Szukaj'}
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
            <FormField
              control={form.control}
              name="customerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Typ klienta</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz typ klienta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="odbiorca">Odbiorca</SelectItem>
                      <SelectItem value="sprzedawca">Sprzedawca</SelectItem>
                      <SelectItem value="both">Oba</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_group_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grupa klientów (opcjonalnie)</FormLabel>
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz grupę (np. Domikom, TOP-BUD)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Brak grupy</SelectItem>
                      {clientGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} {group.invoice_prefix && `(${group.invoice_prefix})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Przypisz klienta do grupy (administracji, portfolio, kraju)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Anuluj
              </Button>
              <Button type="submit">
                {isEditing ? "Aktualizuj" : "Dodaj klienta"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerForm;
