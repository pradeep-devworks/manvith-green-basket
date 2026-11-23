import { supabase } from '../lib/supabase';

export interface ProductRecord {
  product_id: string;
  product_name: string;
  slug: string | null;
  sku: string | null;
  category_id: string | null;
  brand_name: string | null;
  description: string | null;
  price: number | string;
  selling_price: number | string;
  unit: string;
  quantity_step: number | string;
  minimum_order_quantity: number | string;
  maximum_order_quantity: number | string | null;
  is_quantity_editable: boolean;
  image_url: string | null;
  image_alt_text: string | null;
  created_at: string;
  updated_at: string;
  product_name_te: string | null;
}

export async function getProducts(): Promise<ProductRecord[]> {
  const { data, error } = await supabase
    .from('products')
    .select(
      'product_id, product_name, slug, sku, category_id, brand_name, description, price, selling_price, unit, quantity_step, minimum_order_quantity, maximum_order_quantity, is_quantity_editable, image_url, image_alt_text, created_at, updated_at, product_name_te',
    )
    .order('product_name');

  if (error) throw error;
  return (data ?? []) as ProductRecord[];
}
