import { supabase } from "../../../integrations/supabase/client";
import type { BusinessProfile } from "../../../shared/types";
import { queryClient } from "../../../shared/lib/queryClient";

function normalizeEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return value as any;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeDateValue(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    return normalizeEmptyString(value);
  }
  return null;
}

function normalizeNumberValue(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function getBusinessProfiles(userId: string): Promise<BusinessProfile[]> {
  if (!userId) {
    console.error("No user ID provided to getBusinessProfiles");
    return [];
  }
  
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq('user_id', userId)
    .order("name");

  if (error) {
    console.error("Error fetching business profiles:", error);
    throw error;
  }

  return (data as BusinessProfileRow[]).map(item => {
    if (!item.user_id) {
      console.error('Business profile found without user_id:', item.id);
      throw new Error('Invalid business profile: missing user_id');
    }
    
    return {
      id: item.id,
      name: item.name,
      taxId: item.tax_id,
      address: item.address,
      postalCode: item.postal_code,
      city: item.city,
      regon: item.regon || undefined,
      bankAccount: item.bank_account || undefined,
      email: item.email || undefined,
      phone: item.phone || undefined,
      logo: item.logo || undefined,
      isDefault: item.is_default || false,
      entityType: (item as any).entity_type || 'dzialalnosc',
      taxType: (item as any).tax_type ?? null,
      tax_type: (item as any).tax_type ?? null,
      defaultRyczaltRate: (item as any).default_ryczalt_rate ?? undefined,
      user_id: item.user_id,
      is_vat_exempt: item.is_vat_exempt ?? false,
      vat_exemption_reason: item.vat_exemption_reason,
      vat_threshold_pln: (item as any).vat_threshold_pln ?? 200000,
      vat_threshold_year: (item as any).vat_threshold_year ?? new Date().getFullYear(),

      // Spółka fields
      share_capital: (item as any).share_capital ?? undefined,
      krs_number: (item as any).krs_number ?? undefined,
      court_registry: (item as any).court_registry ?? undefined,
      establishment_date: (item as any).establishment_date ?? undefined,
      headquarters_address: (item as any).headquarters_address ?? undefined,
      headquarters_postal_code: (item as any).headquarters_postal_code ?? undefined,
      headquarters_city: (item as any).headquarters_city ?? undefined,
      pkd_main: (item as any).pkd_main ?? undefined,
    };
  });
}

// Define the database row type with all fields
interface BusinessProfileRow {
  id: string;
  name: string;
  tax_id: string;
  address: string;
  postal_code: string;
  city: string;
  regon: string | null;
  bank_account: string | null;
  email: string | null;
  phone: string | null;
  logo: string | null;
  is_default: boolean;
  entity_type?: 'dzialalnosc' | 'sp_zoo' | 'sa';
  tax_type?: 'skala' | 'liniowy' | 'ryczalt' | 'karta' | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  is_vat_exempt?: boolean | null;
  vat_exemption_reason?: string | null;
  vat_threshold_pln?: number | null;
  vat_threshold_year?: number | null;

  // Spółka fields
  share_capital?: number | null;
  krs_number?: string | null;
  court_registry?: string | null;
  establishment_date?: string | null;
  headquarters_address?: string | null;
  headquarters_postal_code?: string | null;
  headquarters_city?: string | null;
  pkd_main?: string | null;
}

export async function getDefaultBusinessProfile(): Promise<BusinessProfile | null> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("is_default", true)
    .single<BusinessProfileRow>();

  if (error) {
    if (error.code === "PGRST116") { // No rows returned
      return null;
    }
    console.error("Error fetching default business profile:", error);
    throw error;
  }

  if (!data.user_id) {
    console.error('Business profile found without user_id:', data.id);
    throw new Error('Invalid business profile: missing user_id');
  }

  return {
    id: data.id,
    name: data.name,
    taxId: data.tax_id,
    address: data.address,
    postalCode: data.postal_code,
    city: data.city,
    regon: data.regon || undefined,
    bankAccount: data.bank_account || undefined,
    email: data.email || undefined,
    phone: data.phone || undefined,
    logo: data.logo || undefined,
    isDefault: data.is_default || false,
    entityType: (data as any).entity_type || 'dzialalnosc',
    tax_type: (data as any).tax_type ?? null,
    user_id: data.user_id,
    is_vat_exempt: data.is_vat_exempt ?? false,
    vat_exemption_reason: data.vat_exemption_reason,
    vat_threshold_pln: data.vat_threshold_pln ?? 200000,
    vat_threshold_year: data.vat_threshold_year ?? new Date().getFullYear(),

    // Spółka fields
    share_capital: (data as any).share_capital ?? undefined,
    krs_number: (data as any).krs_number ?? undefined,
    court_registry: (data as any).court_registry ?? undefined,
    establishment_date: (data as any).establishment_date ?? undefined,
    headquarters_address: (data as any).headquarters_address ?? undefined,
    headquarters_postal_code: (data as any).headquarters_postal_code ?? undefined,
    headquarters_city: (data as any).headquarters_city ?? undefined,
    pkd_main: (data as any).pkd_main ?? undefined,
  };
}

export async function getBusinessProfileById(id: string, userId: string): Promise<BusinessProfile | null> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("id", id)
    .single<BusinessProfileRow>();

  if (error) {
    if (error.code === "PGRST116") { // No rows returned
      return null;
    }
    console.error("Error fetching business profile by ID:", error);
    throw error;
  }

  if (!data) return null; 
  
  // We can assume data.user_id exists because of RLS policies in a real app
  // But adding a check here for type safety / robustness
  if (!data.user_id) {
      console.error('Business profile found without user_id:', data.id);
      // Depending on requirements, you might throw an error or return null
      throw new Error('Invalid business profile: missing user_id');
  }

  return {
    id: data.id,
    name: data.name,
    taxId: data.tax_id,
    address: data.address,
    postalCode: data.postal_code,
    city: data.city,
    regon: data.regon || undefined,
    bankAccount: data.bank_account || undefined,
    email: data.email || undefined,
    phone: data.phone || undefined,
    logo: data.logo || undefined,
    isDefault: data.is_default || false,
    entityType: (data as any).entity_type || 'dzialalnosc',
    tax_type: (data as any).tax_type ?? null,
    user_id: data.user_id,
    is_vat_exempt: data.is_vat_exempt ?? false,
    vat_exemption_reason: data.vat_exemption_reason,
    vat_threshold_pln: data.vat_threshold_pln ?? 200000,
    vat_threshold_year: data.vat_threshold_year ?? new Date().getFullYear(),

    // Spółka fields
    share_capital: (data as any).share_capital ?? undefined,
    krs_number: (data as any).krs_number ?? undefined,
    court_registry: (data as any).court_registry ?? undefined,
    establishment_date: (data as any).establishment_date ?? undefined,
    headquarters_address: (data as any).headquarters_address ?? undefined,
    headquarters_postal_code: (data as any).headquarters_postal_code ?? undefined,
    headquarters_city: (data as any).headquarters_city ?? undefined,
    pkd_main: (data as any).pkd_main ?? undefined,
  };
}

export async function checkTaxIdExists(taxId: string, currentUserId: string): Promise<{ exists: boolean, ownerName?: string }> {
  try {
    console.log('checkTaxIdExists called with:', { taxId, currentUserId });
    const { data, error } = await supabase.rpc('find_user_by_tax_id', {
      tax_id_param: taxId
    });
    console.log('find_user_by_tax_id response:', { data, error });

    if (error) {
      console.error("Error checking tax ID:", error);
      throw error;
    }

    if (data && data.length > 0) {
      // Check if ANY profile with this NIP belongs to a DIFFERENT user
      const otherUserProfiles = data.filter(p => p.user_id !== currentUserId);
      if (otherUserProfiles.length > 0) {
        // There's at least one profile with this NIP belonging to someone else
        const otherProfile = otherUserProfiles[0];
        return { 
          exists: true, 
          ownerName: otherProfile.business_name 
        };
      }
      // All profiles with this NIP belong to the current user, which is OK
      return { exists: false };
    }

    return { exists: false };
  } catch (error) {
    console.error('Error in checkTaxIdExists:', error);
    throw error;
  }
}

export async function saveBusinessProfile(profile: BusinessProfile): Promise<BusinessProfile> {
  try {
    console.log('saveBusinessProfile called with:', profile);
    // Check duplicate NIP only when creating new profile
    if (!profile.id) {
      const taxIdCheck = await checkTaxIdExists(profile.taxId, profile.user_id);
      if (taxIdCheck.exists) {
        throw new Error(
          `NIP ${profile.taxId} jest już używany przez firmę: ${taxIdCheck.ownerName}`
        );
      }
    }

    // Invalidate the cache before making changes
    await queryClient.invalidateQueries({ queryKey: ['businessProfiles'] });
    
    // If setting as default, first reset any existing default
    if (profile.isDefault) {
      let resetQuery = supabase
        .from("business_profiles")
        .update({ is_default: false })
        .eq("user_id", profile.user_id)
        .eq("is_default", true);

      if (profile.id) {
        resetQuery = resetQuery.neq("id", profile.id);
      }

      const { error: resetError } = await resetQuery;
      if (resetError) throw resetError;
    }
    
    const payload = {
      name: profile.name,
      tax_id: profile.taxId,
      address: profile.address,
      postal_code: profile.postalCode,
      city: profile.city,
      regon: profile.regon || null,
      bank_account: profile.bankAccount || null,
      email: profile.email || null,
      phone: profile.phone || null,
      logo: profile.logo || null,
      is_default: profile.isDefault || false,
      entity_type: profile.entityType || 'dzialalnosc',
      tax_type: (profile as any).taxType || (profile as any).tax_type || null,
      default_ryczalt_rate: normalizeNumberValue((profile as any).defaultRyczaltRate),
      user_id: profile.user_id,
      is_vat_exempt: profile.is_vat_exempt ?? false,
      vat_exemption_reason: profile.is_vat_exempt ? profile.vat_exemption_reason || null : null,
      vat_threshold_pln: normalizeNumberValue(profile.vat_threshold_pln) ?? 200000,
      vat_threshold_year: normalizeNumberValue(profile.vat_threshold_year) ?? new Date().getFullYear(),
      business_start_date: (profile as any).business_start_date || null,
      accounting_start_date: (profile as any).accounting_start_date || null,
      updated_at: new Date().toISOString(),

      // Spółka fields
      share_capital: normalizeNumberValue((profile as any).share_capital),
      krs_number: normalizeEmptyString((profile as any).krs_number) ?? null,
      court_registry: normalizeEmptyString((profile as any).court_registry) ?? null,
      establishment_date: normalizeDateValue((profile as any).establishment_date),
      headquarters_address: normalizeEmptyString((profile as any).headquarters_address) ?? null,
      headquarters_postal_code: normalizeEmptyString((profile as any).headquarters_postal_code) ?? null,
      headquarters_city: normalizeEmptyString((profile as any).headquarters_city) ?? null,
      pkd_main: normalizeEmptyString((profile as any).pkd_main) ?? null,
    };

    console.log('Supabase payload being sent:', payload);

    let result;
    
    if (profile.id) {
      // Update existing profile
      console.log('Supabase update payload:', payload);
      console.log('Updating profile ID:', profile.id);
      
      const { data, error } = await supabase
        .from("business_profiles")
        .update(payload)
        .eq("id", profile.id)
        .select()
        .single();
      
      console.log('Supabase update result:', { data, error });

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      result = data;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from("business_profiles")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }
    
    // Invalidate relevant queries after successful save
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['businessProfiles'] }),
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    ]);

    return {
      id: result.id,
      name: result.name,
      taxId: result.tax_id,
      address: result.address,
      postalCode: result.postal_code,
      city: result.city,
      regon: result.regon || undefined,
      bankAccount: result.bank_account || undefined,
      email: result.email || undefined,
      phone: result.phone || undefined,
      logo: result.logo || undefined,
      isDefault: result.is_default || false,
      entityType: (result as any).entity_type || 'dzialalnosc',
      taxType: (result as any).tax_type ?? null,
      tax_type: (result as any).tax_type ?? null,
      defaultRyczaltRate: (result as any).default_ryczalt_rate ?? undefined,
      user_id: result.user_id,
      is_vat_exempt: result.is_vat_exempt ?? false,
      vat_exemption_reason: result.vat_exemption_reason,
      vat_threshold_pln: (result as any).vat_threshold_pln ?? 200000,
      vat_threshold_year: (result as any).vat_threshold_year ?? new Date().getFullYear(),

      // Spółka fields
      share_capital: (result as any).share_capital ?? undefined,
      krs_number: (result as any).krs_number ?? undefined,
      court_registry: (result as any).court_registry ?? undefined,
      establishment_date: (result as any).establishment_date ?? undefined,
      headquarters_address: (result as any).headquarters_address ?? undefined,
      headquarters_postal_code: (result as any).headquarters_postal_code ?? undefined,
      headquarters_city: (result as any).headquarters_city ?? undefined,
      pkd_main: (result as any).pkd_main ?? undefined,
    };
  } catch (error) {
    console.error('Error in saveBusinessProfile:', error);
    throw error;
  }
}
