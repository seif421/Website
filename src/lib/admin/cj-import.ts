import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/['"]+/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Admin-only server functions for finding CJ Dropshipping products and importing them as drafts.

type Ctx = { supabase: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>; from: (t: string) => any }; userId: string };

async function requireManager(ctx: Ctx) {
  for (const role of ["admin", "manager"]) {
    const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: role });
    if (data === true) return;
  }
  throw new Error("You do not have permission to import products.");
}

export const cjStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireManager(context as unknown as Ctx);
    const { isCjConfigured } = await import("@/lib/integrations/cj-dropshipping");
    return { connected: isCjConfigured() };
  });

export type SearchRow = { pid: string; name: string; image: string | null; cost: number; sku: string };

export const searchCj = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { keyword: string; page: number; usOnly: boolean }) => d)
  .handler(async ({ data, context }): Promise<{ rows: SearchRow[]; total: number }> => {
    await requireManager(context as unknown as Ctx);
    const keyword = data.keyword.trim().slice(0, 80);
    if (!keyword) return { rows: [], total: 0 };
    const { cjSearch, firstPrice } = await import("@/lib/integrations/cj-dropshipping");
    const r = await cjSearch({ keyword, page: Math.max(1, Math.min(1000, data.page || 1)), usOnly: data.usOnly });
    return {
      total: r.total,
      rows: r.items.map((i) => ({
        pid: i.id,
        name: i.nameEn,
        image: i.bigImage || null,
        cost: firstPrice(i.sellPrice),
        sku: i.sku,
      })),
    };
  });

function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/div|\/li|\/h\d)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);
}

function parseImages(v: unknown, fallback?: string): string[] {
  let arr: unknown = v;
  if (typeof v === "string") {
    try {
      arr = JSON.parse(v);
    } catch {
      arr = v.split(",");
    }
  }
  const list = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string" && /^https:\/\//.test(x.trim())).map((x) => x.trim()) : [];
  if (list.length === 0 && fallback && /^https:\/\//.test(fallback)) list.push(fallback);
  return list.slice(0, 10);
}

export const importCjProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { pid: string; markupPct: number }) => d)
  .handler(async ({ data, context }): Promise<{ id: string; name: string; price: number; cost: number }> => {
    const ctx = context as unknown as Ctx;
    await requireManager(ctx);
    const markup = Number(data.markupPct);
    if (!Number.isFinite(markup) || markup < 0 || markup > 1000) throw new Error("Markup must be between 0 and 1000 percent.");

    const { data: existing } = await ctx.supabase.from("products").select("id").eq("supplier_product_id", data.pid).limit(1);
    if (existing && existing.length > 0) throw new Error("This product was already imported.");

    const { cjDetail, firstPrice } = await import("@/lib/integrations/cj-dropshipping");
    const d = await cjDetail(data.pid);
    const variants = d.variants ?? [];
    const prices = variants.map((v) => firstPrice(v.variantSellPrice)).filter((n) => n > 0);
    const cost = prices.length ? Math.min(...prices) : firstPrice(d.sellPrice);
    if (!(cost > 0)) throw new Error("CJ did not return a price for this product.");

    const price = Math.max(Math.ceil(cost * (1 + markup / 100)) - 0.01, cost + 0.5);
    const name = (d.productNameEn || (Array.isArray(d.productName) ? d.productName[0] : d.productName) || "Imported product").trim().slice(0, 150);
    const images = parseImages(d.productImageSet, d.bigImage);
    const slug = `${slugify(name).slice(0, 60) || "product"}-${Math.random().toString(36).slice(2, 6)}`;

    const row = {
      name,
      slug,
      sku: d.productSku || null,
      status: "draft",
      is_active: true,
      price,
      cost,
      description: d.description ? htmlToText(d.description) : null,
      short_description: null,
      images,
      supplier_product_id: data.pid,
      supplier_cost: cost,
      supplier_url: `https://cjdropshipping.com/product/-p-${data.pid}.html`,
      supplier_notes: `Imported from CJ Dropshipping. CJ category: ${d.categoryName ?? "unknown"}.`,
      custom_fields: {
        cj_variants: variants.map((v) => ({
          vid: v.vid,
          name: v.variantNameEn ?? v.variantKey ?? "",
          sku: v.variantSku ?? "",
          cost: firstPrice(v.variantSellPrice),
        })),
      },
    };
    const { data: inserted, error } = await ctx.supabase.from("products").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: inserted.id as string, name, price, cost };
  });
