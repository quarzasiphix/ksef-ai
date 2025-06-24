import { supabase } from "../client";
import type { BusinessProfile } from "../../../types";
import { queryClient } from "../../../lib/queryClient";

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
      user_id: item.user_id
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
  user_id: string | null;
  created_at: string;
  updated_at: string;
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
    user_id: data.user_id
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
    user_id: data.user_id
  };
}

export async function checkTaxIdExists(taxId: string, currentUserId: string): Promise<{ exists: boolean, ownerName?: string }> {
  try {
    const { data, error } = await supabase.rpc('find_user_by_tax_id', {
      tax_id_param: taxId
    });

    if (error) {
      console.error("Error checking tax ID:", error);
      throw error;
    }

    if (data && data.length > 0) {
      const existingProfile = data[0];
      // If the existing profile belongs to the current user, it's OK
      if (existingProfile.user_id === currentUserId) {
        return { exists: false };
      }
      return { 
        exists: true, 
        ownerName: existingProfile.business_name 
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Error in checkTaxIdExists:', error);
    throw error;
  }
}

export async function saveBusinessProfile(profile: BusinessProfile): Promise<BusinessProfile> {
  try {
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
      await supabase
        .from("business_profiles")
        .update({ is_default: false })
        .neq("id", profile.id || "")
        .eq("user_id", profile.user_id);
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
      user_id: profile.user_id
    };

    let result;
    
    if (profile.id) {
      // Update existing profile
      const { data, error } = await supabase
        .from("business_profiles")
        .update(payload)
        .eq("id", profile.id)
        .select()
        .single();

      if (error) throw error;
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
      user_id: result.user_id
    };
  } catch (error) {
    console.error('Error in saveBusinessProfile:', error);
    throw error;
  }
}
