import { supabase } from "../lib/supabase";

export type PersistedCartItem = {
  product_id: string;
  quantity: number;
};

type CartRow = {
  cart_id: string;
  user_id: string;
};

async function getOrCreateCart(userId: string): Promise<CartRow> {
  const { data: existing, error: selectError } = await supabase
    .from("cart")
    .select("cart_id, user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing;

  const { data: inserted, error: insertError } = await supabase
    .from("cart")
    .insert({ user_id: userId })
    .select("cart_id, user_id")
    .single();

  if (insertError) {
    // Another request may have created the cart row first.
    if ((insertError as { code?: string }).code === "23505") {
      const { data: afterConflict, error: conflictSelectError } = await supabase
        .from("cart")
        .select("cart_id, user_id")
        .eq("user_id", userId)
        .single();

      if (conflictSelectError) throw conflictSelectError;
      return afterConflict;
    }

    throw insertError;
  }
  return inserted;
}

export async function getUserCartItems(userId: string): Promise<PersistedCartItem[]> {
  const { data: cartRow, error: cartError } = await supabase
    .from("cart")
    .select("cart_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (cartError) throw cartError;
  if (!cartRow) return [];

  const { data, error } = await supabase
    .from("cart_items")
    .select("product_id, quantity")
    .eq("cart_id", cartRow.cart_id)
    .order("added_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    product_id: row.product_id,
    quantity: Number(row.quantity),
  }));
}

export async function saveUserCartItems(userId: string, items: PersistedCartItem[]) {
  const cart = await getOrCreateCart(userId);
  const aggregated = new Map<string, number>();

  items.forEach((item) => {
    const safeQuantity = Number(item.quantity);
    if (!Number.isFinite(safeQuantity) || safeQuantity <= 0) return;
    aggregated.set(item.product_id, Number(((aggregated.get(item.product_id) ?? 0) + safeQuantity).toFixed(4)));
  });

  const { data: existingRows, error: existingError } = await supabase
    .from("cart_items")
    .select("cart_item_id, product_id")
    .eq("cart_id", cart.cart_id);

  if (existingError) throw existingError;

  const desiredProductIds = new Set(aggregated.keys());

  const rowsToDelete = (existingRows ?? []).filter((row) => !desiredProductIds.has(row.product_id)).map((row) => row.cart_item_id);
  if (rowsToDelete.length > 0) {
    const { error } = await supabase.from("cart_items").delete().in("cart_item_id", rowsToDelete);
    if (error) throw error;
  }

  const rowsToUpsert = Array.from(aggregated.entries()).map(([product_id, quantity]) => ({
    cart_id: cart.cart_id,
    product_id,
    quantity,
    updated_at: new Date().toISOString(),
  }));

  if (rowsToUpsert.length > 0) {
    const { error } = await supabase
      .from("cart_items")
      .upsert(rowsToUpsert, { onConflict: "cart_id,product_id" });
    if (error) throw error;
  }
}
