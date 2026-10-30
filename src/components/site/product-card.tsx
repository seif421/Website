import { ShieldCheck, Star } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";
import { formatMoney } from "@/lib/store/format";
import type { StoreProduct } from "@/lib/store/queries";

export function ProductCard({ product }: { product: StoreProduct }) {
  const cart = useCart();
  const badge = product.isBestSeller ? "Best Seller" : product.isNew ? "New" : null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-brand/30 hover:shadow-elevated">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="block" aria-label={product.name}>
        <div className="relative aspect-square overflow-hidden bg-surface">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              width={800}
              height={800}
              loading="lazy"
              className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <ShieldCheck className="size-12 opacity-30" aria-hidden />
            </div>
          )}
          {badge && (
            <span className="absolute left-4 top-4 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
              {badge}
            </span>
          )}
          {product.discountPct > 0 && (
            <span className="absolute right-4 top-4 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-destructive-foreground">
              −{product.discountPct}%
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {product.categoryName && <p className="text-xs font-medium text-muted-foreground">{product.categoryName}</p>}
        <h3 className="font-display text-base font-semibold text-foreground">
          <Link to="/product/$slug" params={{ slug: product.slug }}>
            {product.name}
          </Link>
        </h3>
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="size-3.5 fill-warning text-warning" aria-hidden />
            <span className="font-medium text-foreground">{product.rating.toFixed(1)}</span>
            <span>
              · {product.reviewCount.toLocaleString()} review{product.reviewCount === 1 ? "" : "s"}
            </span>
          </div>
        )}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-lg font-bold text-foreground">{formatMoney(product.price)}</span>
          {product.compareAt && (
            <span className="text-sm text-muted-foreground line-through">{formatMoney(product.compareAt)}</span>
          )}
        </div>
        <button
          type="button"
          disabled={!product.inStock}
          onClick={() => {
            cart.add({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              image: product.image,
            });
            toast.success("Added to cart");
          }}
          className="mt-3 h-10 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {product.inStock ? "Add to cart" : "Out of stock"}
        </button>
      </div>
    </article>
  );
}
