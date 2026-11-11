import { supabase } from "@/integrations/supabase/client";

// A customer's saved delivery addresses, so they do not retype them on every order.
// Stored in the existing `addresses` table: state = governorate, line2 = landmark.

export type SavedAddress = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  governorate: string;
  city: string;
  line1: string;
  line2: string;
  isDefault: boolean;
};

export type AddressInput = Omit<SavedAddress, "id" | "isDefault"> & { isDefault?: boolean };

export const MAX_ADDRESSES = 5;

type Row = {
  id: string;
  label: string | null;
  full_name: string | null;
  phone: string | null;
  state: string | null;
  city: string;
  line1: string;
  line2: string | null;
  is_default: boolean;
};

const COLS = "id,label,full_name,phone,state,city,line1,line2,is_default";

const fromRow = (r: Row): SavedAddress => ({
  id: r.id,
  label: r.label ?? "",
  fullName: r.full_name ?? "",
  phone: r.phone ?? "",
  governorate: r.state ?? "",
  city: r.city,
  line1: r.line1,
  line2: r.line2 ?? "",
  isDefault: r.is_default,
});

export async function fetchAddresses(userId: string): Promise<SavedAddress[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select(COLS)
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(fromRow);
}

function toRow(userId: string, a: AddressInput) {
  return {
    user_id: userId,
    label: a.label.trim() || null,
    full_name: a.fullName.trim(),
    phone: a.phone.trim(),
    state: a.governorate,
    city: a.city.trim(),
    line1: a.line1.trim(),
    line2: a.line2.trim() || null,
    postal_code: "",
    country: "EG",
  };
}

async function clearDefault(userId: string) {
  await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
}

/** Saves a new address, or updates one when `id` is given. The first address becomes the default. */
export async function saveAddress(userId: string, a: AddressInput, id?: string, existingCount = 0) {
  const makeDefault = a.isDefault ?? existingCount === 0;
  if (makeDefault) await clearDefault(userId);
  const row = { ...toRow(userId, a), is_default: makeDefault };
  const q = id
    ? supabase.from("addresses").update(row).eq("id", id).eq("user_id", userId)
    : supabase.from("addresses").insert(row);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export async function deleteAddress(userId: string, id: string) {
  const { error } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function makeDefaultAddress(userId: string, id: string) {
  await clearDefault(userId);
  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export const sameAddress = (a: SavedAddress, b: AddressInput) =>
  a.governorate === b.governorate &&
  a.city.trim().toLowerCase() === b.city.trim().toLowerCase() &&
  a.line1.trim().toLowerCase() === b.line1.trim().toLowerCase();
