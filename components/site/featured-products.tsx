import { PRODUCTS } from "./products";
import { ProductCard } from "./product-card";
import { Link } from "@tanstack/react-router";

export function FeaturedProducts() {
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
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}