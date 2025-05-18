
import { supabase } from "../client";
import type { BusinessProfile } from "@/types";

export async function getBusinessProfiles(): Promise<BusinessProfile[]> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
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
    user_id: data.user_id
  };
}

export async function saveBusinessProfile(profile: BusinessProfile): Promise<BusinessProfile> {
  // If setting as default, first reset any existing default
  if (profile.isDefault) {
    await supabase
      .from("business_profiles")
      .update({ is_default: false })
      .neq("id", profile.id || "");
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
    user_id: profile.user_id // Always include user_id for RLS
  };

  if (profile.id) {
    // Update existing profile
    const { data, error } = await supabase
      .from("business_profiles")
      .update(payload)
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating business profile:", error);
      throw error;
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
      isDefault: data.is_default || false
    };
  } else {
    // Insert new profile
    const { data, error } = await supabase
      .from("business_profiles")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error creating business profile:", error);
      throw error;
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
      isDefault: data.is_default || false
    };
  }
}
