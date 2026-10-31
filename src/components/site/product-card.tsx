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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:border-brand/40 hover:shadow-elevated">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="block" aria-label={product.name}>
        <div className="relative aspect-square overflow-hidden bg-white">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              width={800}
              height={800}
              loading="lazy"
              className="size-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <ShieldCheck className="size-12 opacity-30" aria-hidden />
            </div>
          )}
          {badge && (
            <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
              {badge}
            </span>
          )}
          {product.discountPct > 0 && (
            <span className="absolute right-2 top-2 rounded bg-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground">
              −{product.discountPct}%
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {product.categoryName && <p className="text-xs font-medium text-muted-foreground">{product.categoryName}</p>}
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-foreground hover:text-brand">
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
        <div className="mt-auto flex items-baseline gap-2 pt-1">
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
          className="mt-2 h-9 w-full rounded-md bg-brand text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {product.inStock ? "Add to cart" : "Out of stock"}
        </button>
      </div>
    </article>
  );
}
