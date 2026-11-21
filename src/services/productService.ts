
import { supabase } from '../lib/supabase';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  unit: string;
  stock_quantity: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch all available products
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_available', true)
    .order('name');

  if (error) {
    throw error;
  }

  return data ?? [];
}

// Fetch one product by ID
export async function getProductById(
  id: string
): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
