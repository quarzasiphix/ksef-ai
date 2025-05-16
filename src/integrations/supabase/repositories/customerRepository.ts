
import { supabase } from "../client";
import type { Customer } from "@/types";

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }

  return data.map(item => ({
    id: item.id,
    name: item.name,
    taxId: item.tax_id || undefined,
    address: item.address,
    postalCode: item.postal_code,
    city: item.city,
    email: item.email || undefined,
    phone: item.phone || undefined
  }));
}

export async function saveCustomer(customer: Customer): Promise<Customer> {
  const payload = {
    name: customer.name,
    tax_id: customer.taxId || null,
    address: customer.address,
    postal_code: customer.postalCode,
    city: customer.city,
    email: customer.email || null,
    phone: customer.phone || null
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
      phone: data.phone || undefined
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
      phone: data.phone || undefined
    };
  }
}
