import { supabase } from "../client";
import type { Customer } from "@/types";

export async function getCustomers(): Promise<Customer[]> {
  const reverseTypeMap = {
    buyer: 'odbiorca',
    supplier: 'sprzedawca',
    both: 'both',
  };
  
  const { data, error } = await supabase
    .from("customers")
    .select(`
      *,
      linked_business_profile:business_profiles!inner(
        id,
        name,
        email,
        phone,
        user_id
      )
    `)
    .order("name");

  if (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }

  return data.map(item => {
    // Type assertion to handle missing user_id and client_type in the database
    const itemWithAny = item as any;
    return {
      id: item.id,
      name: item.name,
      taxId: item.tax_id || undefined,
      address: item.address,
      postalCode: item.postal_code,
      city: item.city,
      email: item.email || undefined,
      phone: item.phone || undefined,
      user_id: itemWithAny.user_id,
      customerType: reverseTypeMap[itemWithAny.client_type] || 'odbiorca',
      linkedBusinessProfile: itemWithAny.linked_business_profile?.[0] || null,
    };
  });
}

export async function getCustomerWithLinkedProfile(customerId: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select(`
      *,
      linked_business_profile:business_profiles(
        id,
        name,
        email,
        phone,
        user_id
      )
    `)
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
    customerType: reverseTypeMap[(data as any).client_type] || 'odbiorca',
    linkedBusinessProfile: (data as any).linked_business_profile?.[0] || null,
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
