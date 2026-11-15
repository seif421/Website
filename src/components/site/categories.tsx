import { FolderTree } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { topCategories, useSiteData } from "@/hooks/use-site-data";
import type { MenuCategory } from "@/lib/store/content";
import { useI18n } from "@/lib/i18n";
import { formatMoney } from "@/lib/store/format";
import { fetchShop, type StoreProduct } from "@/lib/store/queries";

const cache = new Map<string, StoreProduct[]>();

export function CategoryThumb({ c, className }: { c: MenuCategory; className: string }) {
  return c.image ? (
    <img src={c.image} alt="" loading="lazy" className={`${className} object-cover`} />
  ) : (
    <span className={`${className} grid place-items-center bg-surface text-brand`}>
      <FolderTree className="size-1/2" aria-hidden />
    </span>
  );
}

export function Categories() {
  const { t } = useI18n();
  const data = useSiteData();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = data.categories.find((c) => c.id === activeId) ?? null;

  // Products of the category being hovered (kept in memory so it opens instantly the second time).
  useEffect(() => {
    if (!active) return;
    const hit = cache.get(active.slug);
    if (hit) {
      setProducts(hit);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setProducts([]);
    fetchShop({ category: active.slug, sort: "featured" })
      .then((r) => {
        const list = r.products.slice(0, 6);
        cache.set(active.slug, list);
        if (!cancelled) setProducts(list);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [active?.slug]);

  const enter = (id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveId(id);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setActiveId(null), 150);
  };

  const { show, title } = data.home.sections.categories;
  const cats = topCategories(data);
  if (!show || cats.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <h2 className="flex items-center gap-3 font-display text-xl font-bold tracking-tight">
        <span className="h-6 w-1.5 rounded-full bg-brand" aria-hidden />
        {title}
      </h2>
      <div className="relative mt-4 rounded-2xl border border-border bg-card p-4 sm:p-6" onMouseLeave={leave} onMouseEnter={() => closeTimer.current && clearTimeout(closeTimer.current)}>
        <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-6 lg:grid-cols-8">
          {cats.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              onMouseEnter={() => enter(c.id)}
              onFocus={() => enter(c.id)}
              className="group flex flex-col items-center gap-2 text-center"
            >
              <CategoryThumb
                c={c}
                className="size-16 rounded-full border border-border shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-brand group-hover:shadow-elevated sm:size-20 lg:size-[88px]"
              />
              <span className="line-clamp-2 text-xs font-medium leading-tight transition-colors group-hover:text-brand sm:text-sm">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
        {active && (
          <div className="absolute inset-x-0 top-full z-30 mt-2 hidden rounded-2xl border border-border bg-card p-4 shadow-elevated md:block">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold">{active.name}</h3>
              <Link
                to="/shop"
                search={{ category: active.slug }}
                className="text-sm font-semibold text-brand hover:underline"
              >
                {t("View all")}
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 lg:grid-cols-6">
              {products.map((p) => (
                <Link
                  key={p.id}
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  className="group block overflow-hidden rounded-lg border border-border hover:border-brand/50"
                >
                  <div className="aspect-square bg-white">
                    {p.image && <img src={p.image} alt="" loading="lazy" className="size-full object-contain" />}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-xs font-semibold">{p.name}</p>
                    <p className="mt-1 text-xs font-bold text-brand">{formatMoney(p.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
            {loading && <p className="mt-3 text-sm text-muted-foreground">{t("Loading…")}</p>}
            {!loading && products.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">{t("No products in this category yet.")}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
