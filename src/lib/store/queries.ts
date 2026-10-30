// Read-only storefront queries. Visitors (not logged in) can only read products that are
// active, not deleted, and have status "published"; the database enforces the first two.

import { supabase } from "@/integrations/supabase/client";
import { pricing, toImages, toSpecs, toStringList, type Spec } from "./format";

export const PAGE_SIZE = 12;
export const SORTS = ["featured", "newest", "price-asc", "price-desc", "rating"] as const;
export type SortKey = (typeof SORTS)[number];

export type Category = { id: string; name: string; slug: string; parent_id: string | null };

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  image: string | null;
  price: number;
  compareAt: number | null;
  discountPct: number;
  rating: number;
  reviewCount: number;
  isBestSeller: boolean;
  isNew: boolean;
  categoryName: string | null;
  inStock: boolean;
};

type ListRow = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  images: unknown;
  price: number | null;
  sale_price: number | null;
  compare_at_price: number | null;
  rating: number | null;
  review_count: number | null;
  is_best_seller: boolean | null;
  is_new_arrival: boolean | null;
  category_id: string | null;
};

const LIST_COLS =
  "id, slug, name, short_description, images, price, sale_price, compare_at_price, rating, review_count, is_best_seller, is_new_arrival, category_id";

type StockInfo = { available: number; allowBackorder: boolean; lowThreshold: number };

async function fetchStock(ids: string[]): Promise<Map<string, StockInfo>> {
  const map = new Map<string, StockInfo>();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("inventory")
    .select("product_id, stock, reserved, allow_backorder, low_stock_threshold")
    .in("product_id", ids);
  for (const r of (data ?? []) as {
    product_id: string;
    stock: number | null;
    reserved: number | null;
    allow_backorder: boolean | null;
    low_stock_threshold: number | null;
  }[]) {
    const prev = map.get(r.product_id);
    map.set(r.product_id, {
      available: (prev?.available ?? 0) + Math.max(0, (r.stock ?? 0) - (r.reserved ?? 0)),
      allowBackorder: (prev?.allowBackorder ?? false) || r.allow_backorder === true,
      lowThreshold: r.low_stock_threshold ?? 5,
    });
  }
  return map;
}

function isInStock(stock: StockInfo | undefined): boolean {
  // Dropshipped items may have no inventory row yet; treat those as available.
  if (!stock) return true;
  return stock.available > 0 || stock.allowBackorder;
}

function toStoreProduct(row: ListRow, categories: Map<string, string>, stock: Map<string, StockInfo>): StoreProduct {
  const p = pricing(row);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    image: toImages(row.images)[0] ?? null,
    price: p.price,
    compareAt: p.compareAt,
    discountPct: p.discountPct,
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    isBestSeller: row.is_best_seller === true,
    isNew: row.is_new_arrival === true,
    categoryName: row.category_id ? (categories.get(row.category_id) ?? null) : null,
    inStock: isInStock(stock.get(row.id)),
  };
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

function published() {
  return supabase
    .from("products")
    .select(LIST_COLS, { count: "exact" })
    .eq("is_active", true)
    .eq("status", "published")
    .is("deleted_at", null);
}

async function hydrate(rows: ListRow[], categories: Category[]): Promise<StoreProduct[]> {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const stock = await fetchStock(rows.map((r) => r.id));
  return rows.map((r) => toStoreProduct(r, names, stock));
}

// Characters that have a meaning inside a PostgREST filter string.
function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*\\"'`:;]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export type ShopParams = {
  q?: string;
  category?: string;
  sort?: SortKey;
  min?: number;
  max?: number;
  page?: number;
};

export type ShopResult = {
  products: StoreProduct[];
  categories: Category[];
  activeCategory: Category | null;
  total: number;
  page: number;
  pageCount: number;
};

export async function fetchShop(params: ShopParams): Promise<ShopResult> {
  const categories = await fetchCategories();
  const page = Math.max(1, params.page ?? 1);
  const activeCategory = params.category ? (categories.find((c) => c.slug === params.category) ?? null) : null;

  if (params.category && !activeCategory) {
    return { products: [], categories, activeCategory: null, total: 0, page: 1, pageCount: 1 };
  }

  let query = published();

  if (activeCategory) {
    const ids = [activeCategory.id, ...categories.filter((c) => c.parent_id === activeCategory.id).map((c) => c.id)];
    const list = ids.join(",");
    query = query.or(`category_id.in.(${list}),subcategory_id.in.(${list})`);
  }

  const term = params.q ? sanitizeSearch(params.q) : "";
  if (term) {
    query = query.or(`name.ilike.%${term}%,short_description.ilike.%${term}%,search_keywords.ilike.%${term}%`);
  }
  if (params.min != null) query = query.gte("price", params.min);
  if (params.max != null) query = query.lte("price", params.max);

  switch (params.sort) {
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "rating":
      query = query.order("rating", { ascending: false, nullsFirst: false }).order("review_count", { ascending: false });
      break;
    default:
      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    products: await hydrate((data ?? []) as unknown as ListRow[], categories),
    categories,
    activeCategory,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Products for the homepage: featured first, then best sellers, then newest. */
export async function fetchFeatured(limit = 4): Promise<StoreProduct[]> {
  const categories = await fetchCategories();
  const { data, error } = await published()
    .order("is_featured", { ascending: false })
    .order("is_best_seller", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return hydrate((data ?? []) as unknown as ListRow[], categories);
}

export type Review = { id: string; rating: number; title: string | null; body: string | null; createdAt: string };

export type ProductDetail = StoreProduct & {
  description: string | null;
  features: string[];
  specs: Spec[];
  images: string[];
  sku: string | null;
  warranty: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  availableUnits: number | null;
  lowStockThreshold: number;
  categorySlug: string | null;
  brandName: string | null;
};

export type ProductPageData = {
  product: ProductDetail;
  related: StoreProduct[];
  reviews: Review[];
};

const DETAIL_COLS = `${LIST_COLS}, description, features, specs, sku, warranty, meta_title, meta_description, brand_id`;

type DetailRow = ListRow & {
  description: string | null;
  features: unknown;
  specs: unknown;
  sku: string | null;
  warranty: string | null;
  meta_title: string | null;
  meta_description: string | null;
  brand_id: string | null;
};

export async function fetchProductPage(slug: string): Promise<ProductPageData | null> {
  const { data, error } = await supabase
    .from("products")
    .select(DETAIL_COLS)
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as DetailRow;

  const [categories, brandRes, stock, reviewsRes] = await Promise.all([
    fetchCategories(),
    row.brand_id
      ? supabase.from("brands").select("name").eq("id", row.brand_id).maybeSingle()
      : Promise.resolve({ data: null }),
    fetchStock([row.id]),
    supabase
      .from("reviews")
      .select("id, rating, title, body, created_at")
      .eq("product_id", row.id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const category = categories.find((c) => c.id === row.category_id) ?? null;
  const base = toStoreProduct(row, new Map(categories.map((c) => [c.id, c.name])), stock);
  const info = stock.get(row.id);

  let related: StoreProduct[] = [];
  if (row.category_id) {
    const rel = await published()
      .eq("category_id", row.category_id)
      .neq("id", row.id)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(4);
    related = await hydrate((rel.data ?? []) as unknown as ListRow[], categories);
  }

  const product: ProductDetail = {
    ...base,
    description: row.description,
    features: toStringList(row.features),
    specs: toSpecs(row.specs),
    images: toImages(row.images),
    sku: row.sku,
    warranty: row.warranty,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    availableUnits: info ? info.available : null,
    lowStockThreshold: info?.lowThreshold ?? 5,
    categorySlug: category?.slug ?? null,
    brandName: (brandRes.data as { name: string } | null)?.name ?? null,
  };

  const reviews = ((reviewsRes.data ?? []) as { id: string; rating: number; title: string | null; body: string | null; created_at: string }[]).map(
    (r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, createdAt: r.created_at }),
  );

  return { product, related, reviews };
}
