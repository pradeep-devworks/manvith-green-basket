import { supabase } from "../lib/supabase";

export type PersistedOrderItemInput = {
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type PersistedOrder = {
  order_id: string;
  order_number: string;
  delivery_name: string;
  delivery_phone: string;
  delivery_address: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
};

export type PersistedOrderItem = {
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image_url: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
};

type AllowedOrderStatus = "pending" | "confirmed" | "processing" | "delivered" | "canceled";
type AllowedPaymentStatus = "pending" | "paid" | "failed";
type AllowedPaymentMethod = "upi" | "cash";

const NEW_ORDER_STATUS: AllowedOrderStatus = "pending";
const NEW_PAYMENT_STATUS: AllowedPaymentStatus = "pending";

function normalizedPaymentMethod(paymentMethod?: string | null): AllowedPaymentMethod {
  return paymentMethod === "upi" ? "upi" : "cash";
}

function normalizedAmount(value: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
}

function toErrorWithContext(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) return error;

  if (error && typeof error === "object") {
    const maybeError = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    const parts = [
      typeof maybeError.message === "string" ? maybeError.message : null,
      typeof maybeError.details === "string" && maybeError.details.length > 0 ? `Details: ${maybeError.details}` : null,
      typeof maybeError.hint === "string" && maybeError.hint.length > 0 ? `Hint: ${maybeError.hint}` : null,
      typeof maybeError.code === "string" && maybeError.code.length > 0 ? `Code: ${maybeError.code}` : null,
    ].filter(Boolean);

    if (parts.length) {
      return new Error(`${fallbackMessage} ${parts.join(" | ")}`.trim());
    }
  }

  return new Error(fallbackMessage);
}

export async function getOrdersWithItems(userId: string) {
  const { data: orderRows, error: ordersError } = await supabase
    .from("orders")
    .select("order_id, order_number, delivery_name, delivery_phone, delivery_address, subtotal, delivery_fee, total_amount, order_status, payment_status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (ordersError) throw ordersError;
  const orders = (orderRows ?? []) as PersistedOrder[];
  if (!orders.length) return { orders, itemsByOrderId: new Map<string, PersistedOrderItem[]>() };

  const orderIds = orders.map((order) => order.order_id);
  const { data: itemRows, error: itemsError } = await supabase
    .from("order_items")
    .select("order_id, product_id, product_name, product_image_url, unit, quantity, unit_price, line_total, created_at")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;

  const itemsByOrderId = new Map<string, PersistedOrderItem[]>();
  (itemRows ?? []).forEach((row) => {
    const currentItems = itemsByOrderId.get(row.order_id) ?? [];
    currentItems.push({
      order_id: row.order_id,
      product_id: row.product_id,
      product_name: row.product_name,
      product_image_url: row.product_image_url,
      unit: row.unit,
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      line_total: Number(row.line_total),
      created_at: row.created_at,
    });
    itemsByOrderId.set(row.order_id, currentItems);
  });

  return { orders, itemsByOrderId };
}

export async function createOrderWithItems(input: {
  userId: string;
  deliveryName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  items: PersistedOrderItemInput[];
  paymentMethod?: AllowedPaymentMethod | null;
}) {
  const sanitizedItems = input.items
    .map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unit_price: normalizedAmount(item.unit_price),
      line_total: normalizedAmount(item.line_total),
    }))
    .filter((item) => item.quantity > 0 && item.line_total >= 0);

  if (!sanitizedItems.length) throw new Error("Order is empty. Add items before placing the order.");

  const subtotal = normalizedAmount(sanitizedItems.reduce((sum, item) => sum + item.line_total, 0));
  const deliveryFee = 0;
  const totalAmount = normalizedAmount(subtotal + deliveryFee);
  const orderNumber = `GB-${Date.now().toString().slice(-8)}`;

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: input.userId,
      delivery_name: input.deliveryName.trim(),
      delivery_phone: input.deliveryPhone.trim(),
      delivery_address: input.deliveryAddress.trim(),
      subtotal,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      order_status: NEW_ORDER_STATUS,
      payment_method: normalizedPaymentMethod(input.paymentMethod),
      payment_status: NEW_PAYMENT_STATUS,
    })
    .select("order_id, order_number, delivery_name, delivery_phone, delivery_address, subtotal, delivery_fee, total_amount, order_status, payment_status, created_at")
    .single();

  if (orderError) {
    throw toErrorWithContext(orderError, "Could not create order.");
  }

  const orderItemsRows = sanitizedItems.map((item) => ({
    order_id: orderRow.order_id,
    product_id: item.product_id,
    product_name: item.product_name,
    product_image_url: item.product_image_url,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.line_total,
  }));

  const { error: orderItemsError } = await supabase.from("order_items").insert(orderItemsRows);
  if (orderItemsError) {
    throw toErrorWithContext(orderItemsError, "Order was created but order items could not be saved.");
  }

  return orderRow as PersistedOrder;
}
