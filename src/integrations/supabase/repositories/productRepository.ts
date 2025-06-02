
import { supabase } from "../client";
import type { Product, VatType } from "@/types";

export async function getProducts(userId: string, productType?: 'income' | 'expense'): Promise<Product[]> {
  let query = supabase
    .from("products")
    .select("id, name, unit_price, vat_rate, unit, user_id, product_type")
    .eq("user_id", userId)
    .order("name");

  if (productType) {
    query = query.eq("product_type", productType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return (data || []).map(item => ({
    id: item.id,
    name: item.name,
    unitPrice: Number(item.unit_price),
    vatRate: item.vat_rate,
    unit: item.unit,
    user_id: item.user_id,
    product_type: item.product_type
  }));
}

export async function saveProduct(product: Product): Promise<Product> {
  const payload = {
    name: product.name,
    unit_price: product.unitPrice,
    vat_rate: product.vatRate,
    unit: product.unit,
    user_id: product.user_id,
    product_type: product.product_type
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
      unit: data.unit,
      user_id: data.user_id,
      product_type: data.product_type
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
      unit: data.unit,
      user_id: data.user_id,
      product_type: data.product_type
    };
  }
}

export async function deleteProduct(id: string): Promise<void> {
  // First check if the product is used in any invoice items
  const { data: invoiceItems, error: checkError } = await supabase
    .from("invoice_items")
    .select("id")
    .eq("product_id", id);

  if (checkError) {
    console.error("Error checking product usage:", checkError);
    throw checkError;
  }

  if (invoiceItems && invoiceItems.length > 0) {
    throw new Error("Product is used in invoices and cannot be deleted");
  }

  // If no invoice items found, proceed with deletion
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
}
