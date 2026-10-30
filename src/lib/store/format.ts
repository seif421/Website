// Small helpers shared by the storefront pages.

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatMoney(value: number): string {
  return usd.format(Number.isFinite(value) ? value : 0);
}

const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "").replace(/\/$/, "");
const IMAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/product-images/`;

/**
 * Admin uploads store a file path inside the public "product-images" bucket.
 * Full URLs (https:, data:, blob:) and site paths ("/x.jpg") are used as they are.
 */
export function imageUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const v = value.trim();
  if (/^(https?:|data:|blob:|\/)/i.test(v)) return v;
  return IMAGE_BASE + v.split("/").map(encodeURIComponent).join("/");
}

export function toImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(imageUrl).filter((u): u is string => Boolean(u));
}

export type Pricing = { price: number; compareAt: number | null; discountPct: number };

/** Works out the price to charge and the crossed-out price (if any). */
export function pricing(p: {
  price: number | string | null;
  sale_price: number | string | null;
  compare_at_price: number | string | null;
}): Pricing {
  const list = Number(p.price ?? 0);
  const sale = p.sale_price != null ? Number(p.sale_price) : null;
  if (sale != null && sale > 0 && sale < list) {
    return { price: sale, compareAt: list, discountPct: Math.round((1 - sale / list) * 100) };
  }
  const compare = p.compare_at_price != null ? Number(p.compare_at_price) : null;
  if (compare != null && compare > list && list > 0) {
    return { price: list, compareAt: compare, discountPct: Math.round((1 - list / compare) * 100) };
  }
  return { price: list, compareAt: null, discountPct: 0 };
}

function text(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  return null;
}

/** "features" is stored as JSON; accept a list of strings or a list of small objects. */
export function toStringList(value: unknown): string[] {
  const items = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
  const out: string[] = [];
  for (const item of items) {
    if (typeof item === "string") {
      if (item.trim()) out.push(item.trim());
    } else if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const t = text(o.text) ?? text(o.title) ?? text(o.name) ?? text(o.label);
      if (t) out.push(t);
    }
  }
  return out;
}

export type Spec = { label: string; value: string };

/** "specs" is stored as JSON; accept an object (label -> value) or a list of {label, value}. */
export function toSpecs(value: unknown): Spec[] {
  const out: Spec[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const label = text(o.label) ?? text(o.name) ?? text(o.key);
      const val = text(o.value);
      if (label && val) out.push({ label, value: val });
    }
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const val = text(v);
      if (val) out.push({ label: k, value: val });
    }
  }
  return out;
}
