import { supabase } from '../lib/supabase';

export interface Category {
  category_id: string;
  category_name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('category_id, category_name, description, image_url, created_at')
    .order('category_name');

  if (error) throw error;
  return data ?? [];
}
