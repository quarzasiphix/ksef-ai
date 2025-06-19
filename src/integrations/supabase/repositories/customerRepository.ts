
import { supabase } from "../client";
import type { Customer } from "@/types";

export async function getCustomers(): Promise<Customer[]> {
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

  // Get all business profiles to check for linked profiles
  const { data: businessProfiles } = await supabase
    .from("business_profiles")
    .select("id, name, email, phone, user_id, tax_id");

  return data.map(item => {
    // Find linked business profile by matching tax_id
    const linkedProfile = businessProfiles?.find(bp => 
      bp.tax_id === item.tax_id && bp.tax_id
    );

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
      customerType: reverseTypeMap[item.client_type as keyof typeof reverseTypeMap] || 'odbiorca',
      linkedBusinessProfile: linkedProfile ? {
        id: linkedProfile.id,
        name: linkedProfile.name,
        email: linkedProfile.email || undefined,
        phone: linkedProfile.phone || undefined,
        user_id: linkedProfile.user_id,
      } : null,
    };
  });
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
      .select("id, name, email, phone, user_id")
      .eq("tax_id", data.tax_id)
      .single();

    if (businessProfile) {
      linkedProfile = {
        id: businessProfile.id,
        name: businessProfile.name,
        email: businessProfile.email || undefined,
        phone: businessProfile.phone || undefined,
        user_id: businessProfile.user_id,
      };
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
