import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { ProductCard } from "@/components/site/product-card";
import { fetchShop, SORTS, type SortKey } from "@/lib/store/queries";

type ShopSearch = {
  q?: string;
  category?: string;
  sort?: SortKey;
  min?: number;
  max?: number;
  page?: number;
};

const SORT_LABELS: Record<SortKey, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Highest rated",
};

function positiveNumber(v: unknown): number | undefined {
  const n = typeof v === "string" || typeof v === "number" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 && n < 1_000_000 ? n : undefined;
}

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): ShopSearch => {
    const page = positiveNumber(s.page);
    return {
      q: typeof s.q === "string" && s.q.trim() ? s.q.trim().slice(0, 60) : undefined,
      category: typeof s.category === "string" && /^[a-z0-9-]{1,60}$/.test(s.category) ? s.category : undefined,
      sort: SORTS.includes(s.sort as SortKey) ? (s.sort as SortKey) : undefined,
      min: positiveNumber(s.min),
      max: positiveNumber(s.max),
      page: page && page >= 1 ? Math.floor(page) : undefined,
    };
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => fetchShop(deps),
  head: ({ loaderData }) => {
    const cat = loaderData?.activeCategory;
    const title = cat ? `${cat.name} — SentryHaus` : "Shop smart home security — SentryHaus";
    const description = cat
      ? `Shop ${cat.name.toLowerCase()} at SentryHaus.`
      : "Browse smart cameras, doorbells, locks, sensors and more at SentryHaus.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ShopPage,
});

function ShopPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });

  const [term, setTerm] = useState(search.q ?? "");
  const [min, setMin] = useState(search.min != null ? String(search.min) : "");
  const [max, setMax] = useState(search.max != null ? String(search.max) : "");
  const [showFilters, setShowFilters] = useState(false);

  // Keep the boxes in sync when the address changes (back button, links).
  useEffect(() => {
    setTerm(search.q ?? "");
    setMin(search.min != null ? String(search.min) : "");
    setMax(search.max != null ? String(search.max) : "");
  }, [search.q, search.min, search.max]);

  const topCategories = data.categories.filter((c) => !c.parent_id);
  const sort: SortKey = search.sort ?? "featured";
  const hasFilters = Boolean(search.q || search.category || search.min != null || search.max != null);

  function applyForm(e: React.FormEvent) {
    e.preventDefault();
    navigate({
      search: (prev: ShopSearch) => ({
        ...prev,
        q: term.trim() || undefined,
        min: positiveNumber(min),
        max: positiveNumber(max),
        page: undefined,
      }),
    });
  }

  function goToPage(page: number) {
    navigate({ search: (prev: ShopSearch) => ({ ...prev, page: page > 1 ? page : undefined }) });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const title = data.activeCategory?.name ?? (search.q ? `Results for “${search.q}”` : "Shop all");

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Shop</span>
        </nav>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
              {data.total === 0 ? "No products found" : `${data.total} product${data.total === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-input px-4 text-sm font-medium lg:hidden"
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="size-4" aria-hidden /> Filters
            </button>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sort</span>
              <select
                value={sort}
                onChange={(e) =>
                  navigate({
                    search: (prev: ShopSearch) => ({
                      ...prev,
                      sort: e.target.value === "featured" ? undefined : (e.target.value as SortKey),
                      page: undefined,
                    }),
                  })
                }
                className="h-10 rounded-full border border-input bg-background px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {SORTS.map((s) => (
                  <option key={s} value={s}>{SORT_LABELS[s]}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className={`${showFilters ? "block" : "hidden"} space-y-8 lg:block`} aria-label="Filters">
            <form onSubmit={applyForm} role="search" className="space-y-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  type="search"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="h-10 w-full rounded-full border border-input bg-surface pl-9 pr-4 text-sm outline-none focus:border-brand focus:bg-background focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Price (USD)</legend>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    placeholder="Min"
                    aria-label="Minimum price"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                  <span className="text-muted-foreground">–</span>
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                    placeholder="Max"
                    aria-label="Maximum price"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </fieldset>
              <button
                type="submit"
                className="h-10 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Apply
              </button>
            </form>

            <div>
              <h2 className="mb-2 text-sm font-semibold">Categories</h2>
              <ul className="space-y-1">
                <li>
                  <Link
                    to="/shop"
                    search={(prev: ShopSearch) => ({ ...prev, category: undefined, page: undefined })}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface ${
                      !search.category ? "bg-surface font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    All products
                  </Link>
                </li>
                {topCategories.map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/shop"
                      search={(prev: ShopSearch) => ({ ...prev, category: c.slug, page: undefined })}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface ${
                        search.category === c.slug ? "bg-surface font-semibold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {hasFilters && (
              <Link to="/shop" search={{}} className="inline-block text-sm font-medium text-brand hover:underline">
                Clear all filters
              </Link>
            )}
          </aside>

          <div>
            {data.products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <p className="font-display text-lg font-semibold">
                  {hasFilters ? "No products match your filters." : "New products are on the way."}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasFilters ? "Try removing a filter or searching for something else." : "We are stocking the shop. Please check back soon."}
                </p>
                {hasFilters && (
                  <Link to="/shop" search={{}} className="mt-5 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
                    Clear filters
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {data.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                {data.pageCount > 1 && (
                  <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      disabled={data.page <= 1}
                      onClick={() => goToPage(data.page - 1)}
                      className="h-10 rounded-full border border-input px-5 text-sm font-medium disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Page {data.page} of {data.pageCount}
                    </span>
                    <button
                      type="button"
                      disabled={data.page >= data.pageCount}
                      onClick={() => goToPage(data.page + 1)}
                      className="h-10 rounded-full border border-input px-5 text-sm font-medium disabled:opacity-40"
                    >
                      Next
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
