import { supabase } from "../../../integrations/supabase/client";
import { InventoryMovement, InventoryMovementType } from "@/shared/types/common";

export async function getInventoryMovements(userId: string): Promise<InventoryMovement[]> {
  const sb: any = supabase as any;
  const { data, error } = await sb
    .from("inventory_movements")
    .select("id, user_id, product_id, quantity_change, type, note, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching inventory movements:", error);
    return [];
  }

  return (data || []) as InventoryMovement[];
}

interface CreateMovementParams {
  userId: string;
  productId: string;
  quantity: number;
  type: InventoryMovementType;
  note?: string;
}

export async function createInventoryMovement(params: CreateMovementParams): Promise<void> {
  const signedQty = params.type === "sale" ? -Math.abs(params.quantity) : Math.abs(params.quantity);

  // 1. Insert movement record
  const sb: any = supabase as any;
  const { error: insertError } = await sb.from("inventory_movements").insert({
    user_id: params.userId,
    product_id: params.productId,
    quantity_change: signedQty,
    type: params.type,
    note: params.note || null,
  });

  if (insertError) {
    console.error("Error creating inventory movement:", insertError);
    throw insertError;
  }

  // 2. Update product stock atomically
  // Fetch current stock
  const { data: prod, error: prodErr } = await supabase
    .from("products")
    .select("stock")
    .eq("id", params.productId)
    .single();

  if (prodErr) {
    console.error("Error fetching product for stock update:", prodErr);
    throw prodErr;
  }

  const newStock = (Number(prod?.stock) || 0) + signedQty;

  const { error: updateErr } = await supabase
    .from("products")
    .update({ stock: newStock })
    .eq("id", params.productId);

  if (updateErr) {
    console.error("Error updating product stock:", updateErr);
    throw updateErr;
  }
} 