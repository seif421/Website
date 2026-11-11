import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "./product-card";
import { topCategories, useSiteData } from "@/hooks/use-site-data";
import { fetchShop, type StoreProduct } from "@/lib/store/queries";

/** Products with a row of category tabs, like a marketplace "picks for you" block. */
export function CuratedPicks() {
  const data = useSiteData();
  const { show, title } = data.home.sections.picks;
  const tabs = topCategories(data).slice(0, 7);
  const [active, setActive] = useState("");
  const [cache, setCache] = useState<Record<string, StoreProduct[]>>({});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!show || cache[active]) return;
    let live = true;
    fetchShop({ category: active || undefined, sort: "featured" })
      .then((r) => live && setCache((c) => ({ ...c, [active]: r.products.slice(0, 8) })))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [active, show, cache]);

  if (!show || failed) return null;
  const products = cache[active];
  if (products && products.length === 0 && active === "") return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8" aria-label={title}>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="flex items-center gap-3 font-display text-lg font-bold tracking-tight sm:text-xl">
            <span className="h-6 w-1.5 rounded-full bg-brand" aria-hidden />
            {title}
          </h2>
          <Link
            to="/shop"
            search={active ? { category: active } : {}}
            className="inline-flex items-center gap-0.5 rounded-full px-3 py-1 text-sm font-semibold text-brand hover:bg-brand/10"
          >
            See all <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div role="tablist" aria-label={title} className="flex gap-2 overflow-x-auto px-4 pt-4 sm:px-5">
          {[{ id: "", name: "All", slug: "" }, ...tabs].map((t) => (
            <button
              key={t.id || "all"}
              role="tab"
              type="button"
              aria-selected={active === t.slug}
              onClick={() => setActive(t.slug)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                active === t.slug
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border text-muted-foreground hover:border-brand/50 hover:text-foreground"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="p-4 sm:p-5">
          {!products ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : products.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No products in this category yet.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
