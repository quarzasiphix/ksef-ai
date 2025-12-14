
import { supabase } from "../client";
import type { Product } from "@/types/index";

export async function getProducts(userId: string, productType?: 'income' | 'expense', businessProfileId?: string): Promise<Product[]> {
  let query = supabase
    .from("products")
    .select("id, name, unit_price, vat_rate, unit, user_id, product_type, track_stock, stock, business_profile_id, is_shared")
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

  // Filter by business profile if specified
  let products = (data || []).map(item => ({
    id: item.id,
    name: item.name,
    unitPrice: Number(item.unit_price),
    vatRate: item.vat_rate,
    unit: item.unit,
    user_id: item.user_id,
    product_type: item.product_type as 'income' | 'expense',
    track_stock: item.track_stock,
    stock: Number(item.stock),
    business_profile_id: item.business_profile_id,
    is_shared: item.is_shared,
    description: '',
  }));

  // If businessProfileId is specified, filter to show only products for that profile or shared products
  if (businessProfileId) {
    products = products.filter(p => 
      p.is_shared || 
      !p.business_profile_id || 
      p.business_profile_id === businessProfileId
    );
  }

  return products;
}

export async function saveProduct(product: Product): Promise<Product> {
  const payload = {
    name: product.name,
    unit_price: product.unitPrice,
    vat_rate: product.vatRate,
    unit: product.unit,
    user_id: product.user_id,
    product_type: product.product_type,
    track_stock: product.track_stock,
    stock: product.stock,
    business_profile_id: product.business_profile_id || null,
    is_shared: product.is_shared || false,
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
      product_type: data.product_type as 'income' | 'expense',
      track_stock: data.track_stock,
      stock: Number(data.stock),
      business_profile_id: data.business_profile_id,
      is_shared: data.is_shared,
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
      product_type: data.product_type as 'income' | 'expense',
      track_stock: data.track_stock,
      stock: Number(data.stock),
      business_profile_id: data.business_profile_id,
      is_shared: data.is_shared,
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
