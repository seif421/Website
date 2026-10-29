import { supabase } from "@/integrations/supabase/client";

export type ProductStatus = "draft" | "published" | "hidden" | "archived" | "scheduled";

export const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
  { value: "archived", label: "Archived" },
  { value: "scheduled", label: "Scheduled" },
];

export const STATUS_VARIANTS: Record<ProductStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  hidden: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  archived: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
  scheduled: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function profitMargin(price: number | null | undefined, cost: number | null | undefined) {
  const p = Number(price ?? 0);
  const c = Number(cost ?? 0);
  if (!p) return 0;
  return ((p - c) / p) * 100;
}

export function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const PRODUCT_CSV_COLUMNS = [
  "id", "name", "slug", "sku", "barcode", "status", "price", "sale_price",
  "compare_at_price", "cost", "stock", "category", "brand", "tags",
  "is_featured", "is_best_seller", "is_new_arrival", "is_trending",
  "short_description", "description",
] as const;

export function productsToCsv(rows: Array<Record<string, unknown>>): string {
  const head = PRODUCT_CSV_COLUMNS.join(",");
  const body = rows.map((r) => PRODUCT_CSV_COLUMNS.map((c) => csvEscape(r[c])).join(",")).join("\n");
  return `${head}\n${body}`;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else { inQ = false; }
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (ch === "\r") { /* skip */ }
      else cur += ch;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.length > 0));
}

export function downloadFile(name: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// Uploads store the object PATH inside the product-images bucket (not a URL).
// The bucket is private, so images are rendered through short-lived signed URLs
// — see src/hooks/use-object-src.tsx.
export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

export async function uploadAsset(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

export async function logAdminActivity(
  action: string,
  entity_type: string,
  entity_id: string,
  metadata?: Record<string, unknown>,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action,
    entity_type,
    entity_id,
    metadata: (metadata ?? {}) as never,
  });
}

export async function logActivity(action: string, entity_id: string, metadata?: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action,
    entity_type: "product",
    entity_id,
    metadata: (metadata ?? {}) as never,
  });
}