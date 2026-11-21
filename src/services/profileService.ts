import type { User } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

export type CustomerProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  updated_at: string;
};

export function getGoogleProfileDefaults(user: User) {
  const metadata = user.user_metadata;
  const fullName = typeof metadata.full_name === "string"
    ? metadata.full_name
    : typeof metadata.name === "string"
      ? metadata.name
      : user.email?.split("@")[0] ?? "";
  const avatarUrl = typeof metadata.avatar_url === "string"
    ? metadata.avatar_url
    : typeof metadata.picture === "string"
      ? metadata.picture
      : null;

  return { fullName, avatarUrl };
}

export async function getCustomerProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("user_id, name, email, phone_number, delivery_address, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    id: data.user_id,
    full_name: data.name,
    email: data.email,
    phone: data.phone_number,
    address: data.delivery_address,
    updated_at: data.updated_at,
  } as CustomerProfile;
}

export async function saveCustomerProfile(input: {
  fullName: string;
  phone: string;
  address: string;
}) {
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userResult.user;
  if (!user) throw new Error("You must be signed in to save your profile.");

  const { data, error } = await supabase
    .from("users")
    .update({
      name: input.fullName.trim(),
      phone_number: input.phone.trim() || null,
      delivery_address: input.address.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select("user_id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Your user profile row was not found. Check that Supabase creates it when a user signs in.");

  const { error: metadataError } = await supabase.auth.updateUser({
    data: { full_name: input.fullName.trim() },
  });
  if (metadataError) throw metadataError;

  return user;
}
