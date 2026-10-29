import { Heart, Star } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Product } from "./products";

export function ProductCard({ product }: { product: Product }) {
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-brand/30 hover:shadow-elevated">
      <Link to="/shop" className="block" aria-label={product.name}>
        <div className="relative aspect-square overflow-hidden bg-surface">
          <img
            src={product.image}
            alt={product.name}
            width={800}
            height={800}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {product.badge && (
            <span className="absolute left-4 top-4 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
              {product.badge}
            </span>
          )}
          {discount > 0 && (
            <span className="absolute right-4 top-4 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-destructive-foreground">
              −{discount}%
            </span>
          )}
          <button
            type="button"
            aria-label="Add to wishlist"
            className="absolute right-4 bottom-4 grid size-9 place-items-center rounded-full bg-background/95 text-foreground opacity-0 shadow-soft transition-opacity group-hover:opacity-100 hover:text-brand"
          >
            <Heart className="size-4" />
          </button>
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs font-medium text-muted-foreground">{product.category}</p>
        <h3 className="font-display text-base font-semibold text-foreground">
          <Link to="/shop">{product.name}</Link>
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="size-3.5 fill-warning text-warning" aria-hidden />
          <span className="font-medium text-foreground">{product.rating}</span>
          <span>· {product.reviews.toLocaleString()} reviews</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-lg font-bold text-foreground">${product.price}</span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">${product.originalPrice}</span>
          )}
        </div>
        <button
          type="button"
          className="mt-3 h-10 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
        >
          Add to cart
        </button>
      </div>
    </article>
  );
}