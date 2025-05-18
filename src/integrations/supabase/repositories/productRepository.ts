
import { supabase } from "../client";
import type { Product } from "@/types";

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching products:", error);
    throw error;
  }

  return data.map(item => ({
    id: item.id,
    name: item.name,
    unitPrice: Number(item.unit_price),
    vatRate: item.vat_rate,
    unit: item.unit
  }));
}

export async function saveProduct(product: Product): Promise<Product> {
  const payload = {
    name: product.name,
    unit_price: product.unitPrice,
    vat_rate: product.vatRate,
    unit: product.unit,
    user_id: product.user_id // Always include user_id for RLS
  };

  if (product.id) {
    // Update existing product
    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", product.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating product:", error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      unitPrice: Number(data.unit_price),
      vatRate: data.vat_rate,
      unit: data.unit
    };
  } else {
    // Insert new product
    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error creating product:", error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      unitPrice: Number(data.unit_price),
      vatRate: data.vat_rate,
      unit: data.unit
    };
  }
}
