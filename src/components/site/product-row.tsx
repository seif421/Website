import { Link } from "@tanstack/react-router";
import { ProductCard } from "./product-card";
import type { StoreProduct } from "@/lib/store/queries";

type Props = {
  title: string;
  products: StoreProduct[];
  seeAll: { sort?: "newest" | "price-asc" | "rating" };
};

/** A horizontally scrolling shelf of products. Renders nothing when there are none. */
export function ProductRow({ title, products, seeAll }: Props) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8" aria-label={title}>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
          <Link to="/shop" search={seeAll} className="text-sm font-medium text-brand hover:underline">
            See all
          </Link>
        </div>
        <ul className="-mx-1 mt-4 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
          {products.map((p) => (
            <li key={p.id} className="w-44 shrink-0 snap-start sm:w-52">
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
