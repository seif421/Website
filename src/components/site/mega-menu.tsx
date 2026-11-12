import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CategoryThumb } from "./categories";
import { topCategories, useSiteData } from "@/hooks/use-site-data";
import { formatMoney } from "@/lib/store/format";
import { fetchShop, type StoreProduct } from "@/lib/store/queries";

const cache = new Map<string, StoreProduct[]>();

/** "All categories" menu: hover a category to see its subcategories and products. */
export function MegaMenu() {
  const data = useSiteData();
  const cats = topCategories(data);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const active = cats.find((c) => c.id === activeId) ?? cats[0];
  const subs = active ? data.categories.filter((c) => c.parentId === active.id) : [];

  useEffect(() => {
    if (!open || !active) return;
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
        const list = r.products.slice(0, 8);
        cache.set(active.slug, list);
        if (!cancelled) setProducts(list);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, active?.slug]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const enter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-9 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand/90"
      >
        <Menu className="size-4" aria-hidden /> All categories{" "}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 flex w-[min(60rem,90vw)] overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-elevated">
          <ul className="max-h-[70vh] w-64 shrink-0 overflow-y-auto border-r border-border p-2">
            {cats.map((c) => (
              <li key={c.id}>
                <Link
                  to="/shop"
                  search={{ category: c.slug }}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setActiveId(c.id)}
                  onFocus={() => setActiveId(c.id)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-foreground ${
                    active?.id === c.id ? "bg-surface text-brand" : "hover:bg-surface"
                  }`}
                >
                  <CategoryThumb c={c} className="size-7 shrink-0 rounded" />
                  <span className="flex-1 truncate">{c.name}</span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
            {cats.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No categories yet.</li>
            )}
          </ul>
          {active && (
            <div className="max-h-[70vh] min-w-0 flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-lg font-bold">{active.name}</h3>
                <Link
                  to="/shop"
                  search={{ category: active.slug }}
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  View all
                </Link>
              </div>
              {subs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {subs.map((s) => (
                    <Link
                      key={s.id}
                      to="/shop"
                      search={{ category: s.slug }}
                      onClick={() => setOpen(false)}
                      className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-brand hover:text-brand"
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {products.map((p) => (
                  <Link
                    key={p.id}
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    onClick={() => setOpen(false)}
                    className="group block overflow-hidden rounded-lg border border-border hover:border-brand/50"
                  >
                    <div className="aspect-square bg-white">
                      {p.image && (
                        <img src={p.image} alt="" loading="lazy" className="size-full object-contain" />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 text-xs font-semibold">{p.name}</p>
                      <p className="mt-1 text-xs font-bold text-brand">{formatMoney(p.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {loading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
              {!loading && products.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">No products in this category yet.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
