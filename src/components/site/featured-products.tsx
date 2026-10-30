import { Link } from "@tanstack/react-router";
import { ProductCard } from "./product-card";
import type { StoreProduct } from "@/lib/store/queries";

export function FeaturedProducts({ products }: { products: StoreProduct[] }) {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-brand">Featured</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Best-selling smart security.
            </h2>
          </div>
          <Link to="/shop" className="hidden text-sm font-medium text-foreground hover:text-brand sm:inline-flex">
            Shop all →
          </Link>
        </div>
        {products.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-display text-lg font-semibold">New products are on the way.</p>
            <p className="mt-2 text-sm text-muted-foreground">We are stocking the shop. Please check back soon.</p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
