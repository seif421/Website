import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "./product-card";
import { useI18n } from "@/lib/i18n";
import type { StoreProduct } from "@/lib/store/queries";

type Props = {
  title: string;
  products: StoreProduct[];
  seeAll: { sort?: "newest" | "price-asc" | "rating" };
  /** "flash" gives the section a coloured header band, used for deals. */
  tone?: "plain" | "flash";
};

/** A horizontally scrolling shelf of products. Renders nothing when there are none. */
export function ProductRow({ title, products, seeAll, tone = "plain" }: Props) {
  const { t } = useI18n();
  if (products.length === 0) return null;
  const flash = tone === "flash";
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8" aria-label={title}>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div
          className={`flex items-center justify-between gap-4 px-4 py-3 sm:px-5 ${
            flash ? "gradient-hero text-primary-foreground" : "border-b border-border"
          }`}
        >
          <h2 className="flex items-center gap-3 font-display text-lg font-bold tracking-tight sm:text-xl">
            {!flash && <span className="h-6 w-1.5 rounded-full bg-brand" aria-hidden />}
            {title}
          </h2>
          <Link
            to="/shop"
            search={seeAll}
            className={`inline-flex items-center gap-0.5 rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              flash
                ? "bg-white/15 text-primary-foreground hover:bg-white/25"
                : "text-brand hover:bg-brand/10"
            }`}
          >
            {t("See all")} <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        </div>
        <ul className="flex snap-x gap-3 overflow-x-auto p-4 sm:p-5">
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
