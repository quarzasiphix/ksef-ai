
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

  return data.map(item => ({
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
    isDefault: item.is_default || false
  }));
}

export async function getDefaultBusinessProfile(): Promise<BusinessProfile | null> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("is_default", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") { // No rows returned
      return null;
    }
    console.error("Error fetching default business profile:", error);
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
    is_default: profile.isDefault || false
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
