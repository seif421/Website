import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/layout";
import { ProductCard } from "@/components/site/product-card";
import { useAuth } from "@/hooks/use-auth";
import { useWishlist } from "@/hooks/use-wishlist";
import { useI18n } from "@/lib/i18n";
import { fetchProductsByIds, type StoreProduct } from "@/lib/store/queries";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — Rivvo" },
      { name: "description", content: "Products you saved on Rivvo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const { ids } = useWishlist();
  const [products, setProducts] = useState<StoreProduct[] | null>(null);
  const key = [...ids].sort().join(",");

  useEffect(() => {
    if (!user) return;
    let live = true;
    fetchProductsByIds(key ? key.split(",") : [])
      .then((p) => live && setProducts(p))
      .catch(() => live && setProducts([]));
    return () => {
      live = false;
    };
  }, [user, key]);

  // Show only products that are still saved (a product removed with the heart disappears at once).
  const shown = (products ?? []).filter((p) => ids.has(p.id));

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("Wishlist")}</h1>
        {loading ? null : !user ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-display text-lg font-semibold">{t("Sign in to see your wishlist.")}</p>
            <Link
              to="/auth"
              search={{ redirect: "/wishlist" } as never}
              className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
            >
              {t("Sign in")}
            </Link>
          </div>
        ) : products === null ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("Loading…")}</p>
        ) : shown.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-display text-lg font-semibold">{t("Your wishlist is empty.")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("Tap the heart on a product to save it here.")}</p>
            <Link
              to="/shop"
              className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
            >
              {t("Browse products")}
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
