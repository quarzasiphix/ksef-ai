import { supabase } from "../client";
import type { Customer } from "@/shared/types";

// Helper to find a business profile by tax ID across all users via RPC (bypasses RLS)
async function findBusinessProfileByTaxId(taxId: string) {
  if (!taxId) return null;

  const { data, error } = await supabase.rpc("find_user_by_tax_id", {
    tax_id_param: taxId,
  });

  if (error) {
    console.error("Error checking tax ID via RPC:", error);
    return null;
  }

  if (data && data.length > 0) {
    const bp: any = data[0];
    return {
      id: bp.id || "",
      name: bp.business_name || bp.name || "",
      email: bp.email || undefined,
      phone: bp.phone || undefined,
      user_id: bp.user_id,
    };
  }

  return null;
}

export async function getCustomers(businessProfileId?: string): Promise<Customer[]> {
  const reverseTypeMap = {
    buyer: 'odbiorca',
    supplier: 'sprzedawca',
    both: 'both',
  } as const;
  
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }

  // Attempt to fetch current user's business profiles (may be limited by RLS)
  const { data: businessProfiles } = await supabase
    .from("business_profiles")
    .select("id, name, email, phone, user_id, tax_id");

  // Map customers and ensure linked profile detection even across accounts
  const customersWithLinks: Customer[] = await Promise.all(
    data.map(async (item) => {
      // First, try to find linked profile from the pre-fetched list (fast path)
      let linkedProfile: any = businessProfiles?.find(
        (bp: any) => bp.tax_id === item.tax_id && bp.tax_id,
      );

      // If not found (likely due to RLS), fall back to RPC lookup
      if (!linkedProfile && item.tax_id) {
        linkedProfile = await findBusinessProfileByTaxId(item.tax_id);
      }

      return {
        id: item.id,
        name: item.name,
        taxId: item.tax_id || undefined,
        address: item.address,
        postalCode: item.postal_code,
        city: item.city,
        email: item.email || undefined,
        phone: item.phone || undefined,
        user_id: item.user_id,
        business_profile_id: item.business_profile_id,
        is_shared: item.is_shared,
        customerType:
          reverseTypeMap[item.client_type as keyof typeof reverseTypeMap] ||
          "odbiorca",
        linkedBusinessProfile: linkedProfile
          ? {
              id: linkedProfile.id,
              name: linkedProfile.name,
              email: linkedProfile.email || undefined,
              phone: linkedProfile.phone || undefined,
              user_id: linkedProfile.user_id,
            }
          : null,
      } as Customer;
    }),
  );

  // Filter by business profile if specified
  let filteredCustomers = customersWithLinks;
  if (businessProfileId) {
    filteredCustomers = customersWithLinks.filter(c => 
      c.is_shared || 
      !c.business_profile_id || 
      c.business_profile_id === businessProfileId
    );
  }

  return filteredCustomers;
}

export async function getCustomerWithLinkedProfile(customerId: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching customer by ID:", error);
    throw error;
  }

  if (!data) return null;

  const reverseTypeMap = {
    buyer: 'odbiorca',
    supplier: 'sprzedawca',
    both: 'both',
  };

  // Get linked business profile by tax_id
  let linkedProfile = null;
  if (data.tax_id) {
    const { data: businessProfile } = await supabase
      .from("business_profiles")
      .select("id, name, email, phone, user_id, tax_id")
      .eq("tax_id", data.tax_id)
      .maybeSingle();

    if (businessProfile) {
      linkedProfile = {
        id: businessProfile.id,
        name: businessProfile.name,
        email: (businessProfile as any).email || undefined,
        phone: (businessProfile as any).phone || undefined,
        user_id: businessProfile.user_id,
      };
    }

    // If not found via direct select (due to RLS), use RPC fallback
    if (!linkedProfile) {
      linkedProfile = await findBusinessProfileByTaxId(data.tax_id);
    }
  }

  return {
    id: data.id,
    name: data.name,
    taxId: data.tax_id || undefined,
    address: data.address,
    postalCode: data.postal_code,
    city: data.city,
    email: data.email || undefined,
    phone: data.phone || undefined,
    user_id: data.user_id,
    customerType: reverseTypeMap[data.client_type as keyof typeof reverseTypeMap] || 'odbiorca',
    linkedBusinessProfile: linkedProfile,
  } as Customer;
}

export async function saveCustomer(customer: Customer): Promise<Customer> {
  const typeMap = {
    odbiorca: 'buyer',
    sprzedawca: 'supplier',
    both: 'both',
  };
  const payload = {
    name: customer.name,
    tax_id: customer.taxId || null,
    address: customer.address,
    postal_code: customer.postalCode,
    city: customer.city,
    email: customer.email || null,
    phone: customer.phone || null,
    user_id: customer.user_id, // Always include user_id for RLS
    business_profile_id: customer.business_profile_id || null,
    is_shared: customer.is_shared || false,
    client_type: typeMap[customer.customerType] || 'buyer',
  };

  if (customer.id) {
    // Update existing customer
    const { data, error } = await supabase
      .from("customers")
      .update(payload)
      .eq("id", customer.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating customer:", error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      taxId: data.tax_id || undefined,
      address: data.address,
      postalCode: data.postal_code,
      city: data.city,
      email: data.email || undefined,
      phone: data.phone || undefined,
      user_id: data.user_id,
      business_profile_id: data.business_profile_id,
      is_shared: data.is_shared,
      customerType: (data as any).client_type || 'odbiorca',
    };
  } else {
    // Insert new customer
    const { data, error } = await supabase
      .from("customers")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error creating customer:", error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      taxId: data.tax_id || undefined,
      address: data.address,
      postalCode: data.postal_code,
      city: data.city,
      email: data.email || undefined,
      phone: data.phone || undefined,
      user_id: data.user_id,
      business_profile_id: data.business_profile_id,
      is_shared: data.is_shared,
      customerType: (data as any).client_type || 'odbiorca',
    };
  }
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") { // No rows returned
      return null;
    }
    console.error("Error fetching customer by ID:", error);
    throw error;
  }

  if (!data) return null;

  // The Customer type now includes user_id, so direct mapping should work
  return {
    id: data.id,
    name: data.name,
    taxId: data.tax_id || undefined,
    address: data.address,
    postalCode: data.postal_code,
    city: data.city,
    email: data.email || undefined,
    phone: data.phone || undefined,
    user_id: data.user_id,
    customerType: (data as any).client_type || 'odbiorca',
  } as Customer; // Cast to Customer type
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
